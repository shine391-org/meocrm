import { IsString, IsInt, IsOptional, Min, registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

function IsDifferentBranch(property: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDifferentBranch',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          return value !== relatedValue;
        },
      },
    });
  };
}

export class CreateTransferDto {
  @ApiProperty({ description: 'Product ID to transfer', example: 'prod_01' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Source branch ID', example: 'br_01' })
  @IsString()
  fromBranchId: string;

  @ApiProperty({ description: 'Destination branch ID', example: 'br_02' })
  @IsString()
  @IsDifferentBranch('fromBranchId', { message: 'Destination branch must be different from source branch' })
  toBranchId: string;

  @ApiProperty({ description: 'Quantity to transfer', example: 10, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Transfer notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
