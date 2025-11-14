/* istanbul ignore file */
import { IsOptional, IsNumber, IsString, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryCustomersDto {
  @ApiPropertyOptional({ default: 1, description: 'Page number (minimum 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, description: 'Items per page (1-100)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Search by name, phone, or code' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ 
    enum: ['name', 'code', 'totalSpent', 'createdAt'],
    default: 'createdAt',
    description: 'Sort by field'
  })
  @IsOptional()
  @IsIn(['name', 'code', 'totalSpent', 'createdAt'])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ 
    enum: ['asc', 'desc'],
    default: 'desc',
    description: 'Sort order'
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ description: 'Filter by customer segment' })
  @IsOptional()
  @IsString()
  segment?: string;
}
