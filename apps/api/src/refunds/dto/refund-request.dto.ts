import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefundRequestDto {
  @ApiProperty({
    example: 'Customer changed their mind.',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
