import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
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

  @ApiPropertyOptional({ description: 'Reason when marking shipment as failed' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  failedReason?: string;

  @ApiPropertyOptional({ description: 'Reason when marking shipment as returned' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  returnReason?: string;
}
