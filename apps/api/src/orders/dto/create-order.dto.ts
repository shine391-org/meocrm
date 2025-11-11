import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class CreateOrderItemDto {
  @ApiProperty({ example: 'product-uuid' })
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({ required: false, example: 'variant-uuid' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'customer-uuid' })
  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @ApiProperty({ enum: PaymentMethod, example: 'CASH' })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiProperty({
    required: false,
    example: 'ONLINE',
    description: 'Sales channel (e.g., ONLINE, POS)',
  })
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiProperty({ required: false, example: 30000 })
  @IsOptional()
  @IsNumber()
  shipping?: number;

  @ApiProperty({ required: false, example: 0 })
  @IsOptional()
  @IsNumber()
  discount?: number;

  @ApiProperty({ required: false, example: 'Giao hàng buổi sáng' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    required: false,
    default: false,
    description: 'Whether order is fully paid',
  })
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @ApiProperty({
    required: false,
    example: 0,
    description: 'Amount already paid by customer (for partial payments)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;
}
