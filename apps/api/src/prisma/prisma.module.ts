import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RequestContextModule } from '../common/context/request-context.module';

@Global()
@Module({
  imports: [RequestContextModule],
  providers: [
    {
      provide: PrismaService,
      useFactory: () => PrismaService.getInstance(),
    },
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
