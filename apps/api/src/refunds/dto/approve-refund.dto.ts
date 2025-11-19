import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class ApproveRefundItemDto {
  @ApiProperty({ description: 'Original order item ID', example: 'order-item-id' })
  @IsUUID()
  orderItemId!: string;

  @ApiProperty({ description: 'Quantity being refunded', example: 1 })
  @IsPositive()
  quantity!: number;

  @ApiPropertyOptional({ description: 'Refund price per unit (defaults to order item price)', example: 120000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  refundPrice?: number;
}

export class ApproveRefundDto {
  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  refundMethod!: PaymentMethod;

  @ApiPropertyOptional({ description: 'Manager notes recorded on refund approval' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [ApproveRefundItemDto], description: 'Optional override for refund items' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ApproveRefundItemDto)
  items?: ApproveRefundItemDto[];
}
