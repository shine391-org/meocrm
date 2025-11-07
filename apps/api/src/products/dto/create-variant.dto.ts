import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsOptional, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVariantDto {
  @ApiProperty({ example: 'VDNT09-D' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 'Màu đen' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 450000 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  sellPrice: number;

  @ApiPropertyOptional({ example: 50 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  stock?: number;

  @ApiPropertyOptional({ example: ['https://example.com/black.jpg'] })
  @IsArray()
  @IsOptional()
  images?: string[];
}
