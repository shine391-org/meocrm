import { IsString, IsInt, IsEnum, IsOptional, NotEquals, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum StockAdjustmentReason {
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT',
  DAMAGED = 'DAMAGED',
  LOST = 'LOST',
  FOUND = 'FOUND',
  RECOUNT = 'RECOUNT',
  RETURN = 'RETURN',
  ORDER_RESERVATION = 'ORDER_RESERVATION',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  OTHER = 'OTHER',
}

export class AdjustStockDto {
  @ApiProperty({ description: 'Product ID', example: 'prod_01' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Branch ID', example: 'br_01' })
  @IsString()
  branchId: string;

  @ApiProperty({
    description: 'Quantity to adjust (positive to add, negative to remove). Must be a non-zero integer between -1,000,000 and 1,000,000.',
    example: 10,
    minimum: -1000000,
    maximum: 1000000,
  })
  @IsInt()
  @NotEquals(0)
  @Min(-1000000)
  @Max(1000000)
  quantity: number;

  @ApiProperty({
    description: 'Reason for adjustment',
    enum: StockAdjustmentReason,
    example: StockAdjustmentReason.MANUAL_ADJUSTMENT
  })
  @IsEnum(StockAdjustmentReason)
  reason: StockAdjustmentReason;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
