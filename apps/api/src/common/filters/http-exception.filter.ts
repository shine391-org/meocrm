import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

interface NormalizedError {
  code: string;
  message: string;
  details?: string;
  traceId: string;
}

const DETAIL_LENGTH_LIMIT = 500;
const DETAIL_SENSITIVE_KEYS = new Set([
  'password',
  'secret',
  'token',
  'key',
  'credential',
  'authorization',
  'cookie',
  'session',
]);

const SENSITIVE_VALUE_PATTERN = /(password|secret|token|key|credential|authorization|cookie)/gi;
const STACK_TRACE_PATTERN = /\n\s+at\s+/;
const HTML_ESCAPE_LOOKUP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const traceId = uuidv4();

    const normalized: NormalizedError = {
      code: `HTTP_${status}`,
      message: exception.message || 'Internal server error',
      traceId,
    };

    if (typeof exceptionResponse === 'string') {
      normalized.message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseObject = exceptionResponse as Record<string, unknown>;

      if (typeof responseObject.code === 'string' && responseObject.code.length > 0) {
        normalized.code = responseObject.code;
      }

      const responseMessage = responseObject.message;
      if (Array.isArray(responseMessage)) {
        normalized.message = responseMessage.join('; ');
      } else if (typeof responseMessage === 'string' && responseMessage.length > 0) {
        normalized.message = responseMessage;
      }

      if (responseObject.details !== undefined) {
        const sanitizedDetails = this.sanitizeDetails(responseObject.details, traceId);
        if (sanitizedDetails) {
          normalized.details = sanitizedDetails;
        }
      }
    }

    if (!normalized.message) {
      normalized.message = 'Internal server error';
    }

    response.status(status).json(normalized);
  }

  private sanitizeDetails(details: unknown, traceId: string): string | undefined {
    if (!this.shouldIncludeDetails() || details === undefined) {
      return undefined;
    }

    const normalized = this.normalizeDetailsPayload(details, traceId);
    if (!normalized) {
      return 'details omitted';
    }

    const redacted = normalized.replace(SENSITIVE_VALUE_PATTERN, '[REDACTED]');
    const escaped = this.escapeHtml(redacted);
    const trimmed =
      escaped.length > DETAIL_LENGTH_LIMIT ? `${escaped.slice(0, DETAIL_LENGTH_LIMIT)}…` : escaped;

    return trimmed.trim() ? trimmed : 'details omitted';
  }

  private normalizeDetailsPayload(details: unknown, traceId: string): string | null {
    if (details === null || details === undefined) {
      return null;
    }

    if (typeof details === 'string') {
      if (STACK_TRACE_PATTERN.test(details)) {
        return null;
      }
      return details;
    }

    if (typeof details === 'number' || typeof details === 'boolean') {
      return String(details);
    }

    if (typeof details === 'object') {
      try {
        this.assertNoCircularReferences(details);
        const scrubbed = this.redactSensitiveKeys(details, 0);
        return this.safeStringify(scrubbed);
      } catch (error) {
        this.logger.warn(
          `Failed to serialize error details for trace ${traceId}`,
          error instanceof Error ? error.message : String(error),
        );
        return '[unserializable details]';
      }
    }

    return null;
  }

  private shouldIncludeDetails(): boolean {
    const env = (process.env.NODE_ENV ?? 'development').toLowerCase();
    return env === 'development' || env === 'test';
  }

  private redactSensitiveKeys(payload: unknown, depth: number): unknown {
    if (depth > 4) {
      return '[REDACTED]';
    }

    if (Array.isArray(payload)) {
      return payload.map((value) => this.redactSensitiveKeys(value, depth + 1));
    }

    if (payload && typeof payload === 'object') {
      return Object.entries(payload as Record<string, unknown>).reduce<Record<string, unknown>>(
        (acc, [key, value]) => {
          if (DETAIL_SENSITIVE_KEYS.has(key.toLowerCase())) {
            acc[key] = '[REDACTED]';
          } else {
            acc[key] = this.redactSensitiveKeys(value, depth + 1);
          }
          return acc;
        },
        {},
      );
    }

    return payload;
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => HTML_ESCAPE_LOOKUP[char] ?? char);
  }

  private safeStringify(payload: unknown): string {
    const seen = new WeakSet();
    return JSON.stringify(payload, (_key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          throw new Error('Circular reference detected');
        }
        seen.add(value);
      }
      return value;
    });
  }

  private assertNoCircularReferences(value: unknown, seen = new WeakSet<object>()) {
    if (!value || typeof value !== 'object') {
      return;
    }

    const candidate = value as Record<string, unknown> | unknown[];
    if (seen.has(candidate as object)) {
      throw new Error('Circular reference detected');
    }

    seen.add(candidate as object);

    const children = Array.isArray(candidate)
      ? candidate
      : Object.values(candidate as Record<string, unknown>);

    for (const child of children) {
      this.assertNoCircularReferences(child, seen);
    }
  }
}
