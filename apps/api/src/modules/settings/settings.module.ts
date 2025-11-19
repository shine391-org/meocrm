import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { RequestContextModule } from '../../common/context/request-context.module';
import { PosSettingsController } from './pos-settings.controller';

@Module({
  imports: [PrismaModule, RequestContextModule],
  providers: [SettingsService],
  controllers: [PosSettingsController],
  exports: [SettingsService],
})
export class SettingsModule {}
