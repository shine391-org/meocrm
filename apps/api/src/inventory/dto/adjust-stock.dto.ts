import { IsString, IsInt, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum StockAdjustmentReason {
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT',
  DAMAGED = 'DAMAGED',
  LOST = 'LOST',
  FOUND = 'FOUND',
  RECOUNT = 'RECOUNT',
  RETURN = 'RETURN',
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
    description: 'Quantity to adjust (positive to add, negative to remove)',
    example: 10
  })
  @IsInt()
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
