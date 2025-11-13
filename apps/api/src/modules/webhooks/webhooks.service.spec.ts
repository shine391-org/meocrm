import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksService } from './webhooks.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../../orders/orders.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { StoredSecretPayload, encryptSecret, loadAesKeyFromHex } from '../../common/crypto/crypto.util';

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    interceptors: {
      response: {
        use: jest.fn(),
      },
    },
    post: jest.fn(),
  })),
}));

describe('WebhooksService', () => {
  let service: WebhooksService;
  let prisma: DeepMockProxy<PrismaService>;
  let configService: DeepMockProxy<ConfigService>;
  let ordersService: DeepMockProxy<OrdersService>;

  beforeEach(async () => {
    const configServiceMock = mockDeep<ConfigService>();
    configServiceMock.get.mockImplementation((key: string) => {
      if (key === 'WEBHOOK_SECRET_KEY') {
        return '6'.repeat(64);
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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
      const dto = {
        url: 'https://example.com/webhook',
        events: ['order.created'],
        secret: 'secret',
        isActive: true,
      };
      const organizationId = 'org1';
      (prisma as any).webhook.findFirst.mockResolvedValue(null);

      await expect(service.updateWebhook('wh1', dto, organizationId)).rejects.toThrow(NotFoundException);
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

      const axios = require('axios');
      axios.create().post.mockRejectedValue(new Error('error'));

      const result = await service.testWebhook('wh1', 'org1');
      expect(result.success).toBe(false);
    });
  });

  describe('handleShippingDelivered', () => {
    it('should not update if order not in processing', async () => {
      (prisma as any).order.updateMany.mockResolvedValue({ count: 0 });
      await service.handleShippingDelivered({ data: { orderId: 'o1', organizationId: 'org1' } });
      expect((prisma as any).order.updateMany).toHaveBeenCalled();
    });

    it('should not update if no order id', async () => {
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
});
