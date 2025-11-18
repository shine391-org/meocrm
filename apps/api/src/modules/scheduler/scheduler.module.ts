import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LowStockDigestJob } from './jobs/low-stock-digest.job';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RequestContextModule } from '../../common/context/request-context.module';

const scheduleImports =
  process.env.DISABLE_SCHEDULER === 'true' ? [] : [ScheduleModule.forRoot()];

@Module({
  imports: [
    ...scheduleImports,
    PrismaModule,
    NotificationsModule,
    RequestContextModule,
  ],
  providers: [LowStockDigestJob],
  exports: [],
})
export class SchedulerModule {}
