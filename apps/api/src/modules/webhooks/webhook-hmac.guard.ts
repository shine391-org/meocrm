import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import * as crypto from 'crypto';

@Injectable()
export class WebhookHMACGuard implements CanActivate {
  private readonly logger = new Logger(WebhookHMACGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const signature = request.headers['x-meocrm-signature'];

    if (!signature) {
      this.logger.warn('Missing X-MeoCRM-Signature header');
      return false;
    }

    const secret = this.configService.get<string>('WEBHOOK_SECRET');
    if (!secret) {
      this.logger.error('WEBHOOK_SECRET is not configured');
      return false;
    }

    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(request.rawBody).digest('hex'), 'utf8');
    const checksum = Buffer.from(signature, 'utf8');

    if (digest.length !== checksum.length || !crypto.timingSafeEqual(digest, checksum)) {
      this.logger.warn('Invalid signature');
      return false;
    }

    return true;
  }
}
