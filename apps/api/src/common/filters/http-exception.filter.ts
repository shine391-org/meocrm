import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const traceId = uuidv4();

    let errorResponse = {
      code: `HTTP_${status}`,
      message: 'Internal server error',
      details: undefined,
      traceId: traceId,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    if (typeof exceptionResponse === 'string') {
      errorResponse.message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object') {
      errorResponse = { ...errorResponse, ...exceptionResponse };
    }

    response.status(status).json(errorResponse);
  }
}
