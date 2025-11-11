import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefundRejectDto {
  @ApiProperty({
    example: 'Refund window has expired.',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
