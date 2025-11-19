import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DebtSnapshotService } from './debt-snapshot.service';
import { AuditLogArchiveService } from './audit-log-archive.service';

const scheduleImports =
  process.env.DISABLE_SCHEDULER === 'true' ? [] : [ScheduleModule.forRoot()];

@Module({
  imports: [...scheduleImports, PrismaModule],
  providers: [DebtSnapshotService, AuditLogArchiveService],
})
export class CronModule {}
