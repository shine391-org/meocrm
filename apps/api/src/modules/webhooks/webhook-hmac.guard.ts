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
    const signatureHeader = request.headers['x-meocrm-signature'];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

    if (!signature) {
      this.logger.warn('Missing X-MeoCRM-Signature header');
      return false;
    }

    const secret = this.configService.get<string>('WEBHOOK_SECRET');
    if (!secret) {
      this.logger.error('WEBHOOK_SECRET is not configured');
      return false;
    }

    if (!/^[0-9a-f]+$/i.test(signature)) {
      this.logger.warn('Signature is not a valid hex digest');
      return false;
    }

    const rawBody =
      typeof request.rawBody === 'string'
        ? request.rawBody
        : Buffer.isBuffer(request.rawBody)
          ? request.rawBody.toString('utf8')
          : '';
    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'hex');
    const checksum = Buffer.from(signature, 'hex');

    if (digest.length !== checksum.length || !crypto.timingSafeEqual(digest, checksum)) {
      this.logger.warn('Invalid signature');
      return false;
    }

    return true;
  }
}
