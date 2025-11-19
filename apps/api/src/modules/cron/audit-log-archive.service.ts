import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContextService } from '../../common/context/request-context.service';

@Injectable()
export class AuditLogArchiveService {
  private readonly logger = new Logger(AuditLogArchiveService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM, {
    disabled: process.env.DISABLE_SCHEDULER === 'true',
  })
  async archiveExpiredLogs() {
    const retentionDays = Number(process.env.AUDIT_LOG_RETENTION_DAYS ?? 90);
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    await this.requestContext.run(async () => {
      await this.requestContext.withOrganizationBypass(['AuditLog'], async () => {
        const result = await this.prisma.auditLog.deleteMany({
          where: { createdAt: { lt: cutoffDate } },
        });
        if (result.count > 0) {
          this.logger.log(`Archived ${result.count} audit log entries older than ${retentionDays} days.`);
        }
      });
    });
  }
}
