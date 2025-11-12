/* istanbul ignore file */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { Product } from '@prisma/client';

@Injectable()
export class LowStockDigestJob {
  private readonly logger = new Logger(LowStockDigestJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // 09:00 Asia/Bangkok is 02:00 UTC
  @Cron('0 2 * * *', {
    name: 'low-stock-digest',
    timeZone: 'UTC',
  })
  async handleCron() {
    this.logger.log('Running low-stock digest job');

    const lowStockProducts = await this.prisma.$queryRaw<Product[]>`
      SELECT *
      FROM "products"
      WHERE "stock" < "minStock" AND "deletedAt" IS NULL
    `;

    if (lowStockProducts.length === 0) {
      this.logger.log('No low-stock products found. Skipping digest.');
      return;
    }

    // In a real multi-tenant app, we would group by organizationId and send to different channels
    const digestMessage = this.formatDigestMessage(lowStockProducts);
    await this.notificationsService.sendTelegramDigest(digestMessage);
  }

  private formatDigestMessage(products: Product[]): string {
    const date = new Date().toLocaleDateString('en-CA');
    let message = `📉 Low-stock Digest — ${date}\n`;
    products.forEach(p => {
      message += `- ${p.sku} — ${p.name} | Stock: ${p.stock} (< min ${p.minStock})\n`;
    });
    return message;
  }
}
