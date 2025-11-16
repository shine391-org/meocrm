import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LowStockDigestJob } from './jobs/low-stock-digest.job';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RequestContextModule } from '../../common/context/request-context.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    NotificationsModule,
    RequestContextModule,
  ],
  providers: [LowStockDigestJob],
  exports: [],
})
export class SchedulerModule {}
