import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RefundRequestDto {
  @ApiProperty({
    example: 'Customer changed their mind.',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiPropertyOptional({ description: 'Additional notes from staff' })
  @IsOptional()
  @IsString()
  notes?: string;
}
