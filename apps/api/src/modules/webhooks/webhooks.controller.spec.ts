import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RequestContextService } from '../../common/context/request-context.service';
import { User } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

describe('WebhooksController', () => {
  let controller: WebhooksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        { provide: WebhooksService, useValue: {} },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: RequestContextService, useValue: { run: jest.fn((cb) => cb()) } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleWebhook', () => {
    it('should throw BadRequestException if event is missing', async () => {
      await expect(controller.handleWebhook({ organizationId: 'org1' })).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if organizationId is missing', async () => {
      await expect(controller.handleWebhook({ event: 'test.event' })).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('ensureOrganizationContext', () => {
    it('should throw BadRequestException if user has no organizationId', () => {
      const user = { id: '1' } as User;
      expect(() => (controller as any).ensureOrganizationContext(user)).toThrow(
        BadRequestException
      );
    });

    it('should return organizationId if user has one', () => {
      const user = { id: '1', organizationId: 'org1' } as User;
      expect((controller as any).ensureOrganizationContext(user)).toBe('org1');
    });
  });
});
