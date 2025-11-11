import { MiddlewareConsumer, NestModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RawBodyMiddleware } from './common/middleware/raw-body.middleware';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { CustomersModule } from './customers/customers.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrdersModule } from './orders/orders.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { RequestContextModule } from './common/context/request-context.module';
import { BullModule } from '@nestjs/bull';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    RequestContextModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 2002, // Default to 2002 as per docs
      },
    }),
    PrismaModule,
    AuthModule,
    WebhooksModule,
    CategoriesModule,
    ProductsModule,
    CustomersModule,
    OrdersModule,
    SuppliersModule,
    ReportsModule,
    ShippingModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RawBodyMiddleware)
      .forRoutes('webhooks/(.*)');
  }
}
