/* istanbul ignore file */
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContextService } from './request-context.service';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly requestContext: RequestContextService) {}

  async use(_req: Request, _res: Response, next: NextFunction) {
    await this.requestContext.run(() => next());
  }
}
