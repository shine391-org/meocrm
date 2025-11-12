/* istanbul ignore file */
import { Module } from '@nestjs/common';
import { RequestContextService } from './context/request-context.service';

@Module({
  providers: [RequestContextService],
  exports: [RequestContextService],
})
export class CommonModule {}
