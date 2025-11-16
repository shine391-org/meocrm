import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OrderStatus, Prisma } from '@prisma/client';
import { RequestContextService } from 'src/common/context/request-context.service';
import { PrismaService } from 'src/prisma/prisma.service';

type PrismaClientLike = PrismaService | Prisma.TransactionClient;
const ORG_BATCH_SIZE = 10;

@Injectable()
export class DebtSnapshotService {
  private readonly logger = new Logger(DebtSnapshotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContextService: RequestContextService,
  ) {}

  @Cron('55 23 * * *', {
    name: 'debt-snapshot-nightly',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handleCron() {
    this.logger.log('Starting nightly debt snapshot calculation...');

    let lastOrganizationId: string | undefined;

    while (true) {
      const query: Prisma.OrganizationFindManyArgs = {
        select: { id: true },
        orderBy: { id: 'asc' },
        take: ORG_BATCH_SIZE,
      };

      if (lastOrganizationId) {
        query.skip = 1;
        query.cursor = { id: lastOrganizationId };
      }

      const batch = await this.prisma.organization.findMany(query);
      if (!batch.length) {
        break;
      }

      const results = await Promise.allSettled(batch.map((org) => this.processOrganization(org.id)));

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const orgId = batch[index]?.id;
          const errorDetail =
            result.reason instanceof Error
              ? result.reason.stack
              : typeof result.reason === 'string'
                ? result.reason
                : undefined;
          this.logger.error(
            `Debt snapshot failed for organization ${orgId}`,
            errorDetail,
          );
        }
      });

      lastOrganizationId = batch[batch.length - 1]?.id;
    }

    this.logger.log('Finished nightly debt snapshot calculation.');
  }

  private async processOrganization(organizationId: string) {
    await this.requestContextService.withOrganizationContext(organizationId, async () => {
      await this.prisma.$transaction(async (tx) => {
        const customerDebts = await this.calculateDebtForOrganization(tx, organizationId);

        if (!customerDebts.length) {
          this.logger.log(`No customer debt to snapshot for organization: ${organizationId}`);
          return;
        }

        await tx.customerDebtSnapshot.createMany({
          data: customerDebts,
          skipDuplicates: true,
        });
        this.logger.log(
          `Created ${customerDebts.length} snapshots for organization ${organizationId}`,
        );
      });
    });
  }

  private async calculateDebtForOrganization(prismaClient: PrismaClientLike, organizationId: string) {
    const orders = await prismaClient.order.groupBy({
      by: ['customerId'],
      where: {
        organizationId: organizationId,
        status: {
          not: OrderStatus.CANCELLED,
        },
        customerId: {
          not: null,
        },
      },
      _sum: {
        total: true,
        paidAmount: true,
      },
    });

    const capturedAt = new Date();
    const customerDebts = orders
      .map((order) => {
        const total = new Prisma.Decimal(order._sum.total ?? 0);
        const paid = new Prisma.Decimal(order._sum.paidAmount ?? 0);
        const debt = total.minus(paid);
        return {
          organizationId,
          customerId: order.customerId!,
          debtValue: debt,
          capturedAt,
        };
      })
      .filter((debtInfo) => debtInfo.debtValue.greaterThan(0));

    return customerDebts;
  }
}
