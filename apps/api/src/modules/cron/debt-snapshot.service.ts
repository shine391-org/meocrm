import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OrderStatus } from '@prisma/client';
import { RequestContextService } from 'src/common/context/request-context.service';
import { PrismaService } from 'src/prisma/prisma.service';

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

    const organizations = await this.prisma.organization.findMany({
      select: { id: true },
    });

    for (const org of organizations) {
      await this.requestContextService.withOrganizationContext(org.id, async () => {
        this.logger.log(`Processing organization: ${org.id}`);
        try {
          const customerDebts = await this.calculateDebtForOrganization(org.id);

          if (customerDebts.length > 0) {
            await this.prisma.customerDebtSnapshot.createMany({
              data: customerDebts,
              skipDuplicates: true,
            });
            this.logger.log(
              `Successfully created ${customerDebts.length} debt snapshots for organization: ${org.id}`
            );
          } else {
            this.logger.log(`No customer debt to snapshot for organization: ${org.id}`);
          }
        } catch (error) {
          this.logger.error(
            `Failed to process debt snapshot for organization: ${org.id}`,
            error.stack
          );
        }
      });
    }

    this.logger.log('Finished nightly debt snapshot calculation.');
  }

  private async calculateDebtForOrganization(organizationId: string) {
    const orders = await this.prisma.order.groupBy({
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
        const debt = (order._sum.total || 0) - (order._sum.paidAmount || 0);
        return {
          organizationId,
          customerId: order.customerId!,
          debtValue: debt,
          capturedAt,
        };
      })
      .filter((debtInfo) => debtInfo.debtValue > 0);

    return customerDebts;
  }
}
