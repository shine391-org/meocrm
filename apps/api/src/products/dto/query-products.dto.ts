/* istanbul ignore file */
import { IsOptional, IsNumber, IsBoolean, IsIn, Min, Max, Validate, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface, IsUUID, IsString, IsInt } from 'class-validator';
import { Type, Transform } from 'class-transformer';

@ValidatorConstraint({ name: 'isLessThanOrEqual', async: false })
export class IsLessThanOrEqual implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];
    // only validate if both values are defined
    if (value === undefined || relatedValue === undefined) {
      return true;
    }
    return value <= relatedValue;
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    return `${args.property} must be less than or equal to ${relatedPropertyName}`;
  }
}

export class QueryProductsDto {
  // Pagination (Task 1)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  // Filters (Task 2)
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Validate(IsLessThanOrEqual, ['maxPrice'])
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  inStock?: boolean;

  // Search (Task 3)
  @IsOptional()
  @IsString()
  search?: string;

  // Sorting (Task 4)
  @IsOptional()
  @IsIn(['name', 'sellPrice', 'stock', 'createdAt'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
