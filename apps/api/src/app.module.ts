import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { CustomersModule } from './customers/customers.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrdersModule } from './orders/orders.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { RequestContextModule } from './common/context/request-context.module';
import { SettingsModule } from './modules/settings/settings.module';
import { RedisModule } from './redis/redis.module';
import { EventsModule } from './modules/events/events.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { RefundsApiModule } from './refunds/refunds.module';
import { CronModule } from './modules/cron/cron.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    RequestContextModule,
    PrismaModule,
    RedisModule,
    SettingsModule,
    EventsModule,
    WebhooksModule,
    SchedulerModule,
    CronModule,
    NotificationsModule,
    AuditLogModule,
    RefundsApiModule,
    ReportsModule,
    AuthModule,
    CategoriesModule,
    ProductsModule,
    CustomersModule,
    OrdersModule,
    SuppliersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
