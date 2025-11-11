import { Test, TestingModule } from '@nestjs/testing';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';
import { SettingsService } from '../modules/settings/settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { User } from '@prisma/client';

describe('RefundsController (Integration)', () => {
  let app: INestApplication;
  let refundsService: Partial<RefundsService>;

  const mockUser: User = {
    id: 'user-1',
    email: 'staff@example.com',
    role: 'staff',
    organizationId: 'org-1',
    password: 'hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockManager: User = { ...mockUser, id: 'manager-1', role: 'manager' };

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
              if (key === 'refund.approvals') return Promise.resolve(['manager']);
              return Promise.resolve(null);
            }),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
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
        .expect(403);
    });

    it('should return 201 for manager', () => {
      return request(app.getHttpServer())
        .post('/orders/order-1/refund-approve')
        .set('x-user-role', 'manager')
        .expect(201);
    });
  });
});
