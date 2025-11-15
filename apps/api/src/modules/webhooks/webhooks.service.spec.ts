import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksService } from './webhooks.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../../orders/orders.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { NotFoundException } from '@nestjs/common';
import * as cryptoUtil from '../../common/crypto/crypto.util';

const mockAxiosFactory = () => {
  const instance = Object.assign(jest.fn(), {
    interceptors: {
      response: {
        use: jest.fn(),
      },
    },
    post: jest.fn(),
  });
  return instance;
};

jest.mock('axios', () => ({
  create: jest.fn(() => mockAxiosFactory()),
}));

describe('WebhooksService', () => {
  let service: WebhooksService;
  let prisma: DeepMockProxy<PrismaService>;
  let configService: DeepMockProxy<ConfigService>;
  let ordersService: DeepMockProxy<OrdersService>;
  let axiosInstanceMock: ReturnType<typeof mockAxiosFactory>;
  let responseErrorHandler: (error: any) => Promise<any>;

  beforeEach(async () => {
    const configServiceMock = mockDeep<ConfigService>();
    configServiceMock.get.mockImplementation((key: string) => {
      if (key === 'WEBHOOK_SECRET_KEY') {
        return '6'.repeat(64);
      }
      if (key === 'NODE_ENV') {
        return 'test';
      }
      return null;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
        {
          provide: PrismaService,
          useValue: mockDeep<PrismaService>(),
        },
        {
          provide: OrdersService,
          useValue: mockDeep<OrdersService>(),
        },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
    prisma = module.get(PrismaService);
    configService = module.get(ConfigService);
    ordersService = module.get(OrdersService);

    const axiosLib = require('axios');
    axiosInstanceMock = axiosLib.create.mock.results[axiosLib.create.mock.results.length - 1].value;
    responseErrorHandler = axiosInstanceMock.interceptors.response.use.mock.calls[0][1];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('axios retry interceptor', () => {
    it('propagates non-retriable errors immediately', async () => {
      const error = {
        config: { url: 'https://example.com/hook' },
        response: { status: 400 },
      };

      await expect(responseErrorHandler(error)).rejects.toBe(error);
    });

    it('retries network failures with exponential backoff', async () => {
      jest.useFakeTimers();
      const error: any = {
        config: { url: 'https://example.com/hook', retryCount: 0 },
      };

      const promise = responseErrorHandler(error);
      jest.advanceTimersByTime(2000);
      await promise;

      expect(error.config.retryCount).toBe(1);
      expect(axiosInstanceMock).toHaveBeenCalledWith(expect.objectContaining({ retryCount: 1 }));
      jest.useRealTimers();
    });

    it('initializes missing config objects before retrying', async () => {
      jest.useFakeTimers();
      const error: any = {
        response: { status: 500 },
      };

      const promise = responseErrorHandler(error);
      jest.advanceTimersByTime(2000);
      await promise;

      expect(axiosInstanceMock).toHaveBeenCalledWith(expect.objectContaining({ retryCount: 1 }));
      jest.useRealTimers();
    });
  });

  describe('createWebhook', () => {
    it('should create a webhook', async () => {
      const dto = {
        url: 'https://example.com/webhook',
        events: ['order.created'],
        secret: 'secret',
        isActive: true,
      };
      const organizationId = 'org1';
      const webhook = {
        id: 'wh1',
        ...dto,
        organizationId,
        secretEncrypted: {} as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma as any).webhook.create.mockResolvedValue(webhook);

      const result = await service.createWebhook(dto, organizationId);

      expect(result.url).toBe(dto.url);
      expect(result.hasSecret).toBe(true);
    });
  });

  describe('updateWebhook', () => {
    it('should update a webhook', async () => {
      const dto = {
        url: 'https://example.com/webhook',
        events: ['order.created'],
        secret: 'secret',
        isActive: true,
      };
      const organizationId = 'org1';
      const webhook = {
        id: 'wh1',
        ...dto,
        organizationId,
        secretEncrypted: {} as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma as any).webhook.findFirst.mockResolvedValue(webhook);
      (prisma as any).webhook.update.mockResolvedValue(webhook);

      const result = await service.updateWebhook('wh1', dto, organizationId);

      expect(result.url).toBe(dto.url);
    });

    it('should throw not found exception', async () => {
      (prisma as any).webhook.findFirst.mockResolvedValue(null);

      await expect(
        service.updateWebhook('missing', { url: 'https://example.com', events: [] }, 'org1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('testWebhook', () => {
    it('should return success false if no secret', async () => {
      const webhook = {
        id: 'wh1',
        url: 'https://example.com/webhook',
        events: ['order.created'],
        secret: 'secret',
        isActive: true,
        organizationId: 'org1',
        secretEncrypted: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma as any).webhook.findFirst.mockResolvedValue(webhook);

      const result = await service.testWebhook('wh1', 'org1');
      expect(result.success).toBe(false);
    });

    it('should throw not found exception', async () => {
      (prisma as any).webhook.findFirst.mockResolvedValue(null);
      await expect(service.testWebhook('wh1', 'org1')).rejects.toThrow(NotFoundException);
    });

    it('should return success false on axios error', async () => {
      const webhook = {
        id: 'wh1',
        url: 'https://example.com/webhook',
        events: ['order.created'],
        secret: 'secret',
        isActive: true,
        organizationId: 'org1',
        secretEncrypted: {} as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma as any).webhook.findFirst.mockResolvedValue(webhook);
      const resolveSpy = jest
        .spyOn<any, any>(service as any, 'resolveWebhookSecret')
        .mockResolvedValue('whsec_test');
      axiosInstanceMock.post.mockRejectedValue(new Error('error'));

      const result = await service.testWebhook('wh1', 'org1');
      expect(result.success).toBe(false);
      resolveSpy.mockRestore();
    });

    it('should treat malformed encrypted payload as missing secret', async () => {
      const webhook = {
        id: 'wh1',
        url: 'https://example.com/webhook',
        events: ['order.created'],
        isActive: true,
        organizationId: 'org1',
        secretEncrypted: { invalid: true } as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma as any).webhook.findFirst.mockResolvedValue(webhook);

      const result = await service.testWebhook('wh1', 'org1');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Webhook secret is not configured');
    });

    it('should report decrypt failures gracefully', async () => {
      const webhook = {
        id: 'wh1',
        url: 'https://example.com/webhook',
        events: ['order.created'],
        isActive: true,
        organizationId: 'org1',
        secretEncrypted: {
          version: 'aes-256-gcm',
          iv: 'a',
          authTag: 'b',
          ciphertext: 'c',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma as any).webhook.findFirst.mockResolvedValue(webhook);
      const decryptSpy = jest.spyOn(cryptoUtil, 'decryptSecret').mockImplementation(() => {
        throw new Error('decrypt failed');
      });

      const result = await service.testWebhook('wh1', 'org1');

      expect(decryptSpy).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(false);

      decryptSpy.mockRestore();
    });

    it('should handle decrypt failures that throw non-error values', async () => {
      const webhook = {
        id: 'wh1',
        url: 'https://example.com/webhook',
        events: ['order.created'],
        isActive: true,
        organizationId: 'org1',
        secretEncrypted: {
          version: 'aes-256-gcm',
          iv: 'a',
          authTag: 'b',
          ciphertext: 'c',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma as any).webhook.findFirst.mockResolvedValue(webhook);
      const decryptSpy = jest.spyOn(cryptoUtil, 'decryptSecret').mockImplementation(() => {
        throw 'decrypt failed';
      });

      const result = await service.testWebhook('wh1', 'org1');

      expect(result.success).toBe(false);
      decryptSpy.mockRestore();
    });

    it('should surface generic message when axios rejects with non-error value', async () => {
      const webhook = {
        id: 'wh1',
        url: 'https://example.com/webhook',
        events: ['order.created'],
        secret: 'secret',
        isActive: true,
        organizationId: 'org1',
        secretEncrypted: {
          version: 'aes-256-gcm',
          iv: 'a',
          authTag: 'b',
          ciphertext: 'c',
        } as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma as any).webhook.findFirst.mockResolvedValue(webhook);
      const resolveSpy = jest
        .spyOn<any, any>(service as any, 'resolveWebhookSecret')
        .mockResolvedValue('whsec_test');
      axiosInstanceMock.post.mockRejectedValue('fatal');

      const result = await service.testWebhook('wh1', 'org1');
      expect(result.success).toBe(false);
      expect(result.message).toContain('An unknown error occurred');
      resolveSpy.mockRestore();
    });
  });

  describe('handleShippingDelivered', () => {
    it('should not update if order not in processing', async () => {
      (prisma as any).order.updateMany.mockResolvedValue({ count: 0 });
      await service.handleShippingDelivered({ data: { orderId: 'o1', organizationId: 'org1' } });
      expect((prisma as any).order.updateMany).toHaveBeenCalled();
    });

    it('should not update if missing identifiers', async () => {
      await service.handleShippingDelivered({ data: { organizationId: 'org1' } });
      expect((prisma as any).order.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('listWebhooks', () => {
    it('should list webhooks', async () => {
      const webhooks = [
        {
          id: 'wh1',
          url: 'https://example.com/webhook',
          events: ['order.created'],
          secret: 'secret',
          isActive: true,
          organizationId: 'org1',
          secretEncrypted: {} as any,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      (prisma as any).webhook.findMany.mockResolvedValue(webhooks);

      const result = await service.listWebhooks('org1');
      expect(result.length).toBe(1);
    });
  });

  describe('resolveWebhookSecret', () => {
    it('returns legacy payloads without mutating database records', async () => {
      const webhook = {
        id: 'wh-legacy',
        organizationId: 'org1',
        secretEncrypted: { legacySecret: 'whsec_legacy' },
      } as any;

      const secret = await (service as any).resolveWebhookSecret(webhook);

      expect(secret).toBe('whsec_legacy');
      expect((prisma as any).webhook.update).not.toHaveBeenCalled();
    });

    it('returns null when decrypting AES payload fails', async () => {
      const webhook = {
        id: 'wh-fail',
        organizationId: 'org1',
        secretEncrypted: {
          version: 'aes-256-gcm',
          iv: 'a',
          authTag: 'b',
          ciphertext: 'c',
        },
      } as any;
      const decryptSpy = jest.spyOn(cryptoUtil, 'decryptSecret').mockImplementation(() => {
        throw new Error('decrypt failed');
      });

      const secret = await (service as any).resolveWebhookSecret(webhook);

      expect(secret).toBeNull();
      decryptSpy.mockRestore();
    });
  });

  describe('backfillEncryptedSecrets', () => {
    it('returns early when there are no legacy secrets', async () => {
      (prisma as any).webhook.findMany.mockResolvedValue([
        { id: 'wh1', secretEncrypted: { version: 'aes-256-gcm', iv: 'a', authTag: 'b', ciphertext: 'c' } },
      ]);

      await (service as any).backfillEncryptedSecrets();

      expect((prisma as any).webhook.update).not.toHaveBeenCalled();
    });

    it('re-encrypts legacy secrets in place', async () => {
      (prisma as any).webhook.findMany.mockResolvedValue([
        { id: 'legacy', secretEncrypted: { legacySecret: 'whsec_legacy' } },
      ]);

      await (service as any).backfillEncryptedSecrets();

      expect((prisma as any).webhook.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'legacy' },
        }),
      );
    });
  });
});
