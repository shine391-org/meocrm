
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { DebtSnapshotJob } from './jobs/debt-snapshot.job';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [ReportsController],
  providers: [ReportsService, DebtSnapshotJob],
})
export class ReportsModule {}
