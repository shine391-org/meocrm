import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RequestContextModule } from '../common/context/request-context.module';
import { RequestContextService } from '../common/context/request-context.service';

@Global()
@Module({
  imports: [RequestContextModule],
  providers: [
    {
      provide: PrismaService,
      inject: [RequestContextService],
      useFactory: (requestContext: RequestContextService) =>
        PrismaService.getInstance(requestContext),
    },
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
