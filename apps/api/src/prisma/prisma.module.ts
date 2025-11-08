import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RequestContextModule } from '../common/context/request-context.module';

@Global()
@Module({
  imports: [RequestContextModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
