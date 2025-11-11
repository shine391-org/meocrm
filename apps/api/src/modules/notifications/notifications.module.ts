
import { Module } from '@nestjs/common';
import { TelegramProvider } from './providers/telegram.provider';
import { LowStockScheduler } from './schedulers/low-stock.scheduler';
import { LowStockService } from './services/low-stock.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  providers: [TelegramProvider, LowStockScheduler, LowStockService],
})
export class NotificationsModule {}
