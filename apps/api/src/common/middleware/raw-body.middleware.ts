
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { json } from 'body-parser';

@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.headers['x-meocrm-signature']) {
        json({
            verify: (req: any, res, buffer) => {
                if (Buffer.isBuffer(buffer)) {
                    req['rawBody'] = Buffer.from(buffer);
                }
                return true;
            },
        })(req, res as any, next);
    } else {
        json()(req, res as any, next);
    }
  }
}
