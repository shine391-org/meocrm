
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReportsService } from '../reports.service';

@Injectable()
export class DebtSnapshotJob {
  private readonly logger = new Logger(DebtSnapshotJob.name);

  constructor(private readonly reportsService: ReportsService) {}

  @Cron('55 23 * * *', {
    name: 'debt-snapshot-nightly',
    timeZone: 'Asia/Bangkok',
  })
  async handleCron() {
    this.logger.log('Starting nightly debt snapshot job...');
    try {
      await this.reportsService.createDebtSnapshotsForAllOrganizations();
      this.logger.log('Finished nightly debt snapshot job successfully.');
    } catch (error) {
      this.logger.error('Nightly debt snapshot job failed.', error.stack);
    }
  }
}
