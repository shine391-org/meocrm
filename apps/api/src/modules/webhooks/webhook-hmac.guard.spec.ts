import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { WebhookHMACGuard } from './webhook-hmac.guard';

const createContext = (request: any): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as ExecutionContext;

const createGuard = (secret?: string) => {
  const configService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'WEBHOOK_SECRET') {
        return secret;
      }
      return null;
    }),
  } as unknown as ConfigService;

  return new WebhookHMACGuard(configService);
};

describe('WebhookHMACGuard', () => {
  it('rejects requests without the signature header', () => {
    const guard = createGuard('secret');
    const context = createContext({ headers: {}, rawBody: '{}' });

    expect(guard.canActivate(context)).toBe(false);
  });

  it('rejects when WEBHOOK_SECRET is missing', () => {
    const guard = createGuard(undefined);
    const context = createContext({
      headers: { 'x-meocrm-signature': 'deadbeef' },
      rawBody: '{}',
    });

    expect(guard.canActivate(context)).toBe(false);
  });

  it('rejects non-hex signatures', () => {
    const guard = createGuard('secret');
    const context = createContext({
      headers: { 'x-meocrm-signature': 'not-hex' },
      rawBody: '{}',
    });

    expect(guard.canActivate(context)).toBe(false);
  });

  it('rejects invalid HMAC digests', () => {
    const guard = createGuard('secret');
    const context = createContext({
      headers: { 'x-meocrm-signature': 'aa'.repeat(32) },
      rawBody: JSON.stringify({ foo: 'bar' }),
    });

    expect(guard.canActivate(context)).toBe(false);
  });

  it('accepts valid signatures generated with the shared secret', () => {
    const secret = 'secret';
    const guard = createGuard(secret);
    const payload = JSON.stringify({ foo: 'bar' });
    const digest = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const context = createContext({
      headers: { 'x-meocrm-signature': digest },
      rawBody: payload,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('reads the first signature when header is provided as array', () => {
    const secret = 'secret';
    const guard = createGuard(secret);
    const payload = JSON.stringify({ foo: 'array' });
    const digest = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const context = createContext({
      headers: { 'x-meocrm-signature': [digest, 'unused'] },
      rawBody: payload,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects when rawBody is not a string or buffer', () => {
    const secret = 'secret';
    const guard = createGuard(secret);
    const context = createContext({
      headers: { 'x-meocrm-signature': 'aa'.repeat(32) },
      rawBody: { unexpected: true },
    });

    expect(guard.canActivate(context)).toBe(false);
  });

  it('coerces buffer raw bodies before signing', () => {
    const secret = 'secret';
    const guard = createGuard(secret);
    const payload = JSON.stringify({ foo: 'buffer' });
    const digest = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const context = createContext({
      headers: { 'x-meocrm-signature': digest },
      rawBody: Buffer.from(payload),
    });

    expect(guard.canActivate(context)).toBe(true);
  });
});
