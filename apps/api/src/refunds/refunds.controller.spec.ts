import { Test, TestingModule } from '@nestjs/testing';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';
import { SettingsService } from '../modules/settings/settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { User, UserRole } from '@prisma/client';
import { OrganizationGuard } from '../common/guards/organization.guard';

describe('RefundsController (Integration)', () => {
  let app: INestApplication;
  let refundsService: Partial<RefundsService>;

  const mockUser: User = {
    id: 'user-1',
    email: 'staff@example.com',
    name: 'Staff',
    role: UserRole.STAFF,
    organizationId: 'org-1',
    password: 'hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockManager: User = { ...mockUser, id: 'manager-1', role: UserRole.MANAGER };

  beforeAll(async () => {
    refundsService = {
      requestRefund: jest.fn().mockResolvedValue({ success: true }),
      approveRefund: jest.fn().mockResolvedValue({ success: true }),
      rejectRefund: jest.fn().mockResolvedValue({ success: true }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [RefundsController],
      providers: [
        { provide: RefundsService, useValue: refundsService },
        {
          provide: SettingsService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              if (key === 'refund.approvals') return Promise.resolve(['MANAGER']);
              return Promise.resolve(null);
            }),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          // Simulate user based on a header for testing
          if (req.headers['x-user-role'] === 'manager') {
            req.user = mockManager;
          } else {
            req.user = mockUser;
          }
          return true;
        },
      })
      .overrideGuard(OrganizationGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.organizationId = mockUser.organizationId;
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /orders/:orderId/refund-request', () => {
    it('should be accessible by staff', () => {
      return request(app.getHttpServer())
        .post('/orders/order-1/refund-request')
        .send({ reason: 'test' })
        .expect(201);
    });
  });

  describe('POST /orders/:orderId/refund-approve', () => {
    it('should return 403 for staff', () => {
      return request(app.getHttpServer())
        .post('/orders/order-1/refund-approve')
        .set('x-user-role', 'staff')
        .send({ refundMethod: 'CASH' })
        .expect(403);
    });

    it('should return 201 for manager', () => {
      return request(app.getHttpServer())
        .post('/orders/order-1/refund-approve')
        .set('x-user-role', 'manager')
        .send({ refundMethod: 'CASH' })
        .expect(201);
    });
  });
});
