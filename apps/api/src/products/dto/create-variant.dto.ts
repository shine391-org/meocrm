import { IsString, IsNotEmpty, IsNumber, IsBoolean, IsOptional, IsObject, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVariantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsObject()
  @IsOptional()
  attributes?: Record<string, any>;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  price: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  inStock?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
