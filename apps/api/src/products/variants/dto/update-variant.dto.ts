import { IsString, IsNumber, IsOptional, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVariantDto {
  @ApiPropertyOptional({ example: 'D' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 10000, description: 'Có thể âm nếu variant rẻ hơn base product' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  additionalPrice?: number;

  @ApiPropertyOptional({ example: 50, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
