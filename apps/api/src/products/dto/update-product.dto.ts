import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

// Omit SKU - không cho phép update SKU
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['sku'] as const)
) {}
