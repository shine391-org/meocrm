import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CustomerSegmentationService } from './services/customer-segmentation.service';
import { CustomerStatsService } from './services/customer-stats.service';
import { SettingsModule } from '../modules/settings/settings.module';

@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [CustomersController],
  providers: [
    CustomersService,
    CustomerSegmentationService,
    CustomerStatsService,
  ],
  exports: [CustomersService, CustomerSegmentationService, CustomerStatsService],
})
export class CustomersModule {}
