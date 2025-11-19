/* istanbul ignore file */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { InventoryService } from '../../../inventory/inventory.service';
import { RequestContextService } from '../../../common/context/request-context.service';

@Injectable()
export class ReservationMonitorJob {
  private readonly logger = new Logger(ReservationMonitorJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly requestContext: RequestContextService,
  ) {}

  @Cron('*/15 * * * *', {
    name: 'reservation-leak-monitor',
    timeZone: 'UTC',
  })
  async handleCron() {
    const organizations = await this.prisma.organization.findMany({
      select: { id: true },
    });

    for (const org of organizations) {
      await this.requestContext.withOrganizationContext(org.id, async () => {
        const result = await this.inventoryService.scanReservationLeaks(org.id, {
          minAgeMinutes: 30,
          limit: 100,
          minQuantity: 1,
        });

        if (result.meta.detected > 0) {
          this.logger.warn(
            `Detected ${result.meta.detected} stuck reservations for organization ${org.id}`,
          );
        }
      });
    }
  }
}
