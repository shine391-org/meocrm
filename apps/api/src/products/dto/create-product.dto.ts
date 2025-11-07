import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsOptional, IsBoolean, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'VDNT09' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 'Ví da nam Tribeca' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Ví da bò thật cao cấp' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'category-id' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ example: 150000 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  costPrice: number;

  @ApiProperty({ example: 450000 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  sellPrice: number;

  @ApiPropertyOptional({ example: 100 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  stock?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  minStock?: number;

  @ApiPropertyOptional({ example: 1000 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  maxStock?: number;

  @ApiPropertyOptional({ example: ['https://example.com/image1.jpg'] })
  @IsArray()
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({ example: 200, description: 'Weight in grams' })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  weight?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
