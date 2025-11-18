import { IsString, IsNotEmpty, IsUUID, IsNumber, Min, IsOptional, MaxLength, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShippingOrderDto {
  @ApiProperty({ description: 'Order Id', example: 'order-uuid' })
  @IsUUID()
  orderId!: string;

  @ApiProperty({ description: 'Shipping partner Id', example: 'partner-uuid' })
  @IsUUID()
  partnerId!: string;

  @ApiProperty({ description: 'Tracking code provided by partner', example: 'GHN1234567' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  trackingCode!: string;

  @ApiProperty({ description: 'Recipient full name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  recipientName!: string;

  @ApiProperty({ description: 'Recipient phone number' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(15)
  recipientPhone!: string;

  @ApiProperty({ description: 'Recipient address' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  recipientAddress!: string;

  @ApiPropertyOptional({ description: 'Ward' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  recipientWard?: string;

  @ApiPropertyOptional({ description: 'District' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  recipientDistrict?: string;

  @ApiPropertyOptional({ description: 'Province' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  recipientProvince?: string;

  @ApiProperty({ description: 'Shipping fee in VND', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingFee?: number;

  @ApiPropertyOptional({ description: 'Sales channel (e.g., GHN, GHTK)' })
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiPropertyOptional({ description: 'COD amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  codAmount?: number;

  @ApiPropertyOptional({ description: 'Weight in grams' })
  @IsOptional()
  @IsInt()
  @Min(1)
  weight?: number;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
