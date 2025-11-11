
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { RequestContextService } from '../context/request-context.service';
import { Prisma } from '@prisma/client';

@Catch()
export class GlobalErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalErrorFilter.name);

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly requestContextService: RequestContextService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const traceId = this.requestContextService.getContext()?.requestId || 'unknown';

    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected internal server error occurred.';
    let details: any | undefined = undefined;

    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && response !== null) {
        const res = response as Record<string, any>;
        message = res.message || exception.message;
        if (res.error) {
            code = res.error.toUpperCase().replace(/ /g, '_');
        }
        if (httpStatus === HttpStatus.BAD_REQUEST && (exception.getResponse() as any).message) {
            const validationMessages = (exception.getResponse() as any).message;
            if (Array.isArray(validationMessages)) {
                 code = 'VALIDATION_ERROR';
                 // A bit of a hack to reconstruct the structured errors from strings
                 details = validationMessages.reduce((acc, msg) => {
                    const [field] = msg.split(' ');
                    if (!acc[field]) acc[field] = [];
                    acc[field].push(msg);
                    return acc;
                }, {});
            }
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
        switch (exception.code) {
            case 'P2002': // Unique constraint failed
              httpStatus = HttpStatus.CONFLICT;
              code = 'CONFLICT';
              message = `A record with this ${exception.meta?.target?.toString()} already exists.`;
              details = { field: exception.meta?.target };
              break;
            case 'P2025': // Record to update not found
              httpStatus = HttpStatus.NOT_FOUND;
              code = 'NOT_FOUND';
              message = 'The requested resource to update or delete was not found.';
              break;
            default:
              message = 'A database error occurred.';
              break;
          }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Error: ${exception.message}`, exception.stack);
      message = 'An internal server error occurred.';
    }

    const responseBody = {
      code,
      message,
      details,
      traceId,
    };

    this.logger.error(`[${traceId}] ${httpStatus} ${code} - ${message}`, exception instanceof Error ? exception.stack : JSON.stringify(exception));

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }

  private formatValidationErrors(validationErrors: any[]): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    validationErrors.forEach(err => {
        if (err.constraints) {
            errors[err.property] = Object.values(err.constraints);
        }
    });
    return errors;
  }
}
