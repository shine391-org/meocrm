import { existsSync } from 'fs';
import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { CustomersModule } from './customers/customers.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

const nodeEnv = process.env.NODE_ENV ?? 'development';
const appRoot = join(__dirname, '..');
const workspaceRoot = join(appRoot, '..');
const envFileCandidates = [
  join(workspaceRoot, `.env.${nodeEnv}`),
  join(workspaceRoot, '.env'),
  join(appRoot, `.env.${nodeEnv}`),
  join(appRoot, '.env'),
];
const envFilesToLoad = envFileCandidates.filter((filePath) => existsSync(filePath));

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envFilesToLoad.length ? envFilesToLoad : undefined,
    }),
    PrismaModule,
    AuthModule,
    CategoriesModule,
    ProductsModule,
    CustomersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
