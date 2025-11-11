import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

interface NormalizedError {
  code: string;
  message: string;
  details?: unknown;
  traceId: string;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
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
        normalized.details = responseObject.details;
      }
    }

    if (!normalized.message) {
      normalized.message = 'Internal server error';
    }

    response.status(status).json(normalized);
  }
}
