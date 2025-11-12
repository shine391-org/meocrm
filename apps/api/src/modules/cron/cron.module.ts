import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DebtSnapshotService } from './debt-snapshot.service';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  providers: [DebtSnapshotService],
})
export class CronModule {}
