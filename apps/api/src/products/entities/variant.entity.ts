import { ApiProperty } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/library';

export class VariantEntity {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty()
  sku!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: 'number' })
  sellPrice!: Decimal;

  @ApiProperty()
  stock!: number;

  @ApiProperty({ type: [String] })
  images!: string[];

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
