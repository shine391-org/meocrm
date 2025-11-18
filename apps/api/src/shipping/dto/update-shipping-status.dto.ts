import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { ShippingStatus } from '@prisma/client';

export class UpdateShippingStatusDto {
  @ApiProperty({ enum: ShippingStatus })
  @IsEnum(ShippingStatus)
  status!: ShippingStatus;

  @ApiPropertyOptional({ description: 'Actual COD amount collected' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  collectedCodAmount?: number;
}
