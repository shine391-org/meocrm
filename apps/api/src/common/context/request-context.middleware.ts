/* istanbul ignore file */
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { RequestContextService } from './request-context.service';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly requestContext: RequestContextService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const incomingTrace = (req.headers['x-trace-id'] || req.headers['x-request-id']) as
      | string
      | undefined;
    await this.requestContext.run(
      () => {
        this.requestContext.setContext({
          requestId: incomingTrace ?? randomUUID(),
          traceId: incomingTrace,
        });
        return next();
      },
      { requestId: incomingTrace ?? randomUUID(), traceId: incomingTrace },
    );
  }
}
