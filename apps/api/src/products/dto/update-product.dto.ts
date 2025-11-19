import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';
import { UpdateVariantDto } from './update-variant.dto';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';

class VariantDto extends UpdateVariantDto {
  @IsString()
  @IsOptional()
  id?: string;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants?: VariantDto[];
}
