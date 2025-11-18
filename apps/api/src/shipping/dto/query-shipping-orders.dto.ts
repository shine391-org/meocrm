import { IsOptional, IsEnum, IsString, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ShippingStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class QueryShippingOrdersDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: ShippingStatus })
  @IsOptional()
  @IsEnum(ShippingStatus)
  status?: ShippingStatus;

  @ApiPropertyOptional({ description: 'Search by tracking code or order code' })
  @IsOptional()
  @IsString()
  search?: string;
}
