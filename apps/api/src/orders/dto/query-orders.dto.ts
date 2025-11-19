/* istanbul ignore file */
import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus, PaymentMethod } from '@prisma/client';

export class QueryOrdersDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit: number = 20;

  @ApiProperty({ required: false, enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiProperty({ required: false, example: 'customer-uuid' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ required: false, enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiProperty({ required: false, example: 'branch-uuid' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({ required: false, example: '2025-11-01' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiProperty({ required: false, example: '2025-11-30' })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
