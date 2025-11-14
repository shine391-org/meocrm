import { ConfigService } from '@nestjs/config';
import express from 'express';
import request from 'supertest';
import {
  API_PORT_DEFAULT,
  createWebhookRawMiddleware,
  resolveApiPort,
  resolveWebhookRawLimit,
} from './server.config';

const createMockConfig = (values: Record<string, string | undefined>): ConfigService => {
  return {
    get: (key: string) => values[key],
  } as ConfigService;
};

describe('server.config helpers', () => {
  describe('resolveApiPort', () => {
    it('returns the parsed PORT when valid', () => {
      const config = createMockConfig({ PORT: '2003' });
      expect(resolveApiPort(config)).toBe(2003);
    });

    it('falls back to API_PORT when PORT is not provided', () => {
      const config = createMockConfig({ API_PORT: '2010' });
      expect(resolveApiPort(config)).toBe(2010);
    });

    it('throws when PORT is invalid', () => {
      const config = createMockConfig({ PORT: 'abc' });
      expect(() => resolveApiPort(config)).toThrow(/PORT/);
    });

    it('throws when API_PORT is outside the allowed range', () => {
      const config = createMockConfig({ API_PORT: '70000' });
      expect(() => resolveApiPort(config)).toThrow(/API_PORT/);
    });

    it('returns the default port when no env variables are set', () => {
      const config = createMockConfig({});
      expect(resolveApiPort(config)).toBe(API_PORT_DEFAULT);
    });
  });

  describe('resolveWebhookRawLimit', () => {
    it('returns configured WEBHOOK_MAX_BODY when present', () => {
      const config = createMockConfig({ WEBHOOK_MAX_BODY: '2mb' });
      expect(resolveWebhookRawLimit(config)).toBe('2mb');
    });

    it('falls back to default when no env is provided', () => {
      const config = createMockConfig({});
      expect(resolveWebhookRawLimit(config, '1mb')).toBe('1mb');
    });
  });

  describe('createWebhookRawMiddleware', () => {
    it('honors the provided byte limit for webhook payloads', async () => {
      const app = express();
      app.use('/webhooks', createWebhookRawMiddleware('1kb'));
      app.post('/webhooks', (req, res) => {
        res.json({
          parsed: req.body,
          rawBody: (req as any).rawBody,
          isBuffer: Buffer.isBuffer(req.body),
        });
      });

      await request(app)
        .post('/webhooks')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ ping: true }))
        .expect(200, {
          parsed: { ping: true },
          rawBody: JSON.stringify({ ping: true }),
          isBuffer: false,
        });
    });

    it('rejects payloads that exceed the configured limit', async () => {
      const app = express();
      app.use('/webhooks', createWebhookRawMiddleware('5b'));
      app.post('/webhooks', (_req, res) => {
        res.sendStatus(204);
      });

      await request(app)
        .post('/webhooks')
        .set('Content-Type', 'application/json')
        .send(Buffer.alloc(8, '.'))
        .expect(413);
    });
  });
});
