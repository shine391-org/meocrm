/* istanbul ignore file */
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  basePrice!: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  costPrice?: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  minStock?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
