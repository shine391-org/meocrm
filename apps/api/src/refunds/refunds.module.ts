import { Module } from '@nestjs/common';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';
import { RefundsRolesGuard } from './guards/refunds-roles.guard';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { SettingsModule } from '../modules/settings/settings.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [AuditLogModule, NotificationsModule, SettingsModule, CustomersModule],
  controllers: [RefundsController],
  providers: [RefundsService, RefundsRolesGuard],
  exports: [RefundsService],
})
export class RefundsApiModule {}
