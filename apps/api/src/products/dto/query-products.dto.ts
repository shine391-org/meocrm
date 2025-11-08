import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsBoolean,
  IsEnum,
} from 'class-validator';

export enum ProductSortBy {
  name = 'name',
  sellPrice = 'sellPrice',
  createdAt = 'createdAt',
  stock = 'stock',
}

export enum SortOrder {
  asc = 'asc',
  desc = 'desc',
}

export class QueryProductsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  inStock?: boolean;

  @IsOptional()
  @IsEnum(ProductSortBy)
  sortBy?: ProductSortBy = ProductSortBy.createdAt;

  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.desc;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
