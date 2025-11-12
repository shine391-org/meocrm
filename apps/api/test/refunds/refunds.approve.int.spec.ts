import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { cleanupDatabase, createCustomer, createOrganization } from '../../src/test-utils';
import { PrismaService } from '../../src/prisma/prisma.service';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { OrderStatus, User, UserRole } from '@prisma/client';
import { RefundsService } from '../../src/refunds/refunds.service';
import { RequestContextService } from '../../src/common/context/request-context.service';

describe('Refund approval integration', () => {
  let prisma: PrismaService;
  let refundsService: RefundsService;
  let notificationsMock: { sendToStaff: jest.Mock };
  let currentUser: User;
  let requestContext: RequestContextService;

  beforeAll(async () => {
    process.env.WEBHOOK_SECRET_KEY =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    notificationsMock = {
      sendToStaff: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NotificationsService)
      .useValue(notificationsMock)
      .compile();

    prisma = moduleRef.get(PrismaService);
    refundsService = moduleRef.get(RefundsService);
    requestContext = moduleRef.get(RequestContextService);
  });

  beforeEach(async () => {
    await cleanupDatabase(prisma);
    notificationsMock.sendToStaff.mockClear();
  });

  it('approves refund, emits audit log and notifies staff', async () => {
    const organization = await createOrganization(prisma);
    const organizationId = organization.id;
    currentUser = await prisma.user.create({
      data: {
        email: `manager-${Date.now()}@test.dev`,
        name: 'Manager',
        password: 'hashed',
        organizationId,
        role: UserRole.OWNER,
      },
    });
    const customer = await createCustomer(prisma, organizationId);

    const product = await prisma.product.create({
      data: {
        organizationId,
        name: 'Refund Product',
        sku: `SKU-${Date.now()}`,
        sellPrice: 100000,
        costPrice: 50000,
      },
    });

    const variant = await prisma.productVariant.create({
      data: {
        organizationId,
        productId: product.id,
        sku: `VAR-${Date.now()}`,
        name: 'Variant',
        sellPrice: 100000,
        stock: 5,
      },
    });

    const order = await prisma.order.create({
      data: {
        organizationId,
        customerId: customer.id,
        code: `ORD-${Date.now()}`,
        subtotal: 100000,
        total: 100000,
        tax: 0,
        shipping: 0,
        discount: 0,
        paymentMethod: 'CASH',
        status: OrderStatus.COMPLETED,
        completedAt: new Date(),
        items: {
          create: {
            organizationId,
            productId: product.id,
            variantId: variant.id,
            quantity: 1,
            unitPrice: 100000,
            subtotal: 100000,
          },
        },
      },
    });

    await prisma.setting.createMany({
      data: [
        {
          organizationId,
          key: 'refund.windowDays',
          value: 30,
        },
        {
          organizationId,
          key: 'refund.restockOnRefund',
          value: true,
        },
        {
          organizationId,
          key: 'refund.approvals',
          value: ['OWNER', 'MANAGER'],
        },
      ],
    });

    await requestContext.run(async () => {
      requestContext.setContext({ organizationId, userId: currentUser.id, roles: [currentUser.role] });
      const updatedOrder = await refundsService.approveRefund(order.id, currentUser);

      expect(updatedOrder.status).toBe(OrderStatus.CANCELLED);
      expect(notificationsMock.sendToStaff).toHaveBeenCalled();

      const auditLogs = await prisma.auditLog.findMany({
        where: { entityId: order.id },
      });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].newValues).toMatchObject({ event: 'refund.approved', restocked: true });
    });
  });
});
