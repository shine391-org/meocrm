import { ConfigService } from '@nestjs/config';
import {
  API_PORT_DEFAULT,
  resolveApiPort,
  resolveWebhookRawLimit,
} from './server.config';

const mockConfig = (values: Record<string, string | undefined>): ConfigService =>
  ({
    get: (key: string) => values[key],
  }) as ConfigService;

describe('server.config helpers', () => {
  describe('resolveApiPort', () => {
    it('returns PORT when valid', () => {
      const config = mockConfig({ PORT: '2200' });
      expect(resolveApiPort(config)).toBe(2200);
    });

    it('falls back to API_PORT when PORT missing', () => {
      const config = mockConfig({ API_PORT: '3000' });
      expect(resolveApiPort(config)).toBe(3000);
    });

    it('returns default when no env variables are set', () => {
      const config = mockConfig({});
      expect(resolveApiPort(config)).toBe(API_PORT_DEFAULT);
    });

    it('throws InternalServerErrorException for invalid values', () => {
      const config = mockConfig({ PORT: 'abc' });
      expect(() => resolveApiPort(config)).toThrow(/PORT must be an integer/);
    });
  });

  describe('resolveWebhookRawLimit', () => {
    it('returns env override when present', () => {
      const config = mockConfig({ WEBHOOK_MAX_BODY: '5mb' });
      expect(resolveWebhookRawLimit(config)).toBe('5mb');
    });

    it('falls back to default', () => {
      const config = mockConfig({});
      expect(resolveWebhookRawLimit(config, '2mb')).toBe('2mb');
    });
  });
});
