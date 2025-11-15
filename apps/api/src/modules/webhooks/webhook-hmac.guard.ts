import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
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
      throw new UnauthorizedException('Missing webhook signature');
    }

    const secret = this.configService.get<string>('WEBHOOK_SECRET');
    if (!secret) {
      this.logger.error('WEBHOOK_SECRET is not configured');
      throw new UnauthorizedException('Webhook secret is not configured');
    }

    if (!/^[0-9a-f]+$/i.test(signature)) {
      this.logger.warn('Signature is not a valid hex digest');
      throw new UnauthorizedException('Invalid webhook signature format');
    }

    const rawBodyInput = request.rawBody;
    if (rawBodyInput === undefined || rawBodyInput === null) {
      this.logger.warn('Raw request body missing, cannot validate webhook signature');
      throw new UnauthorizedException('Missing webhook payload');
    }

    let payloadBuffer: Buffer | null = null;
    if (typeof rawBodyInput === 'string') {
      payloadBuffer = Buffer.from(rawBodyInput, 'utf8');
    } else if (Buffer.isBuffer(rawBodyInput)) {
      payloadBuffer = rawBodyInput;
    }

    if (!payloadBuffer) {
      this.logger.warn('Unsupported raw body type for webhook signature validation');
      throw new UnauthorizedException('Invalid webhook payload');
    }

    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(payloadBuffer).digest();
    const checksum = Buffer.from(signature, 'hex');

    if (digest.length !== checksum.length || !crypto.timingSafeEqual(digest, checksum)) {
      this.logger.warn('Invalid signature');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }
}
