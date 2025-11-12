/* istanbul ignore file */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { Product } from '@prisma/client';
import { RequestContextService } from '../../../common/context/request-context.service';

@Injectable()
export class LowStockDigestJob {
  private readonly logger = new Logger(LowStockDigestJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly requestContext: RequestContextService,
  ) {}

  // 09:00 Asia/Bangkok is 02:00 UTC
  @Cron('0 2 * * *', {
    name: 'low-stock-digest',
    timeZone: 'UTC',
  })
  async handleCron() {
    this.logger.log('Running low-stock digest job');

    const organizations = await this.prisma.organization.findMany({
      select: { id: true, name: true },
    });

    for (const org of organizations) {
      await this.requestContext.withOrganizationContext(org.id, async () => {
        const lowStockProducts = await this.prisma.$queryRaw<Product[]>`
          SELECT *
          FROM "products"
          WHERE "organizationId" = ${org.id}
            AND "deletedAt" IS NULL
            AND "stock" < "minStock"
        `;

        if (!lowStockProducts.length) {
          this.logger.log(`No low-stock products for organization ${org.id}. Skipping digest.`);
          return;
        }

        const digestMessage = this.formatDigestMessage(lowStockProducts, org.name ?? org.id);

        try {
          await this.notificationsService.sendToStaff(digestMessage);
        } catch (error) {
          this.logger.error(
            `Failed to send low-stock digest for organization ${org.id}`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      });
    }
  }

  private formatDigestMessage(products: Product[], orgIdentifier: string): string {
    const date = new Date().toLocaleDateString('en-CA');
    let message = `📉 Low-stock Digest — ${date} — Org: ${orgIdentifier}\n`;
    products.forEach((p) => {
      message += `- ${p.sku} — ${p.name} | Stock: ${p.stock} (< min ${p.minStock})\n`;
    });
    return message;
  }
}
