import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LowStockDigestJob } from './jobs/low-stock-digest.job';
import { ReservationMonitorJob } from './jobs/reservation-monitor.job';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RequestContextModule } from '../../common/context/request-context.module';
import { InventoryModule } from '../../inventory/inventory.module';

const scheduleImports =
  process.env.DISABLE_SCHEDULER === 'true' ? [] : [ScheduleModule.forRoot()];

@Module({
  imports: [
    ...scheduleImports,
    PrismaModule,
    NotificationsModule,
    RequestContextModule,
    InventoryModule,
  ],
  providers: [LowStockDigestJob, ReservationMonitorJob],
  exports: [],
})
export class SchedulerModule {}
