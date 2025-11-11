
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LowStockService } from '../services/low-stock.service';

@Injectable()
export class LowStockScheduler {
  private readonly logger = new Logger(LowStockScheduler.name);

  constructor(private readonly lowStockService: LowStockService) {}

  @Cron('0 9 * * *', { timeZone: 'Asia/Bangkok' }) // 09:00 ICT
  async handleCron() {
    this.logger.log('Starting daily low stock digest job...');
    try {
      await this.lowStockService.sendDigestsToAllOrganizations();
      this.logger.log('Finished daily low stock digest job.');
    } catch (error) {
      this.logger.error('Daily low stock digest job failed.', error);
    }
  }
}
