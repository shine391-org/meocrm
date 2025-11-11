import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { RequestContextModule } from '../../common/context/request-context.module';

@Module({
  imports: [PrismaModule, RequestContextModule],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
