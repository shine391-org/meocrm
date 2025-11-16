import { IsString, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTransferDto {
  @ApiProperty({ description: 'Product ID to transfer', example: 'prod_01' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Source branch ID', example: 'br_01' })
  @IsString()
  fromBranchId: string;

  @ApiProperty({ description: 'Destination branch ID', example: 'br_02' })
  @IsString()
  toBranchId: string;

  @ApiProperty({ description: 'Quantity to transfer', example: 10, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Transfer notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
