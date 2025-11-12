/* istanbul ignore file */
import { IsOptional, IsNumber, IsString, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListSuppliersDto {
@ApiPropertyOptional({ default: 1 })
@IsOptional()
@Type(() => Number)
@IsNumber()
@Min(1)
page?: number = 1;

@ApiPropertyOptional({ default: 20 })
@IsOptional()
@Type(() => Number)
@IsNumber()
@Min(1)
@Max(100)
limit?: number = 20;

@ApiPropertyOptional()
@IsOptional()
@IsString()
search?: string;

@ApiPropertyOptional({ enum: ['name', 'code', 'totalPurchased', 'createdAt'] })
@IsOptional()
@IsIn(['name', 'code', 'totalPurchased', 'createdAt'])
sortBy?: string = 'createdAt';

@ApiPropertyOptional({ enum: ['asc', 'desc'] })
@IsOptional()
@IsIn(['asc', 'desc'])
sortOrder?: 'asc' | 'desc' = 'desc';
}
