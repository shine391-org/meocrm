import { ApiProperty } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/library';

export class ProductEntity {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  sku!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ nullable: true })
  categoryId!: string | null;

  @ApiProperty({ type: 'number' })
  costPrice!: Decimal;

  @ApiProperty({ type: 'number' })
  sellPrice!: Decimal;

  @ApiProperty()
  stock!: number;

  @ApiProperty()
  minStock!: number;

  @ApiProperty()
  maxStock!: number;

  @ApiProperty({ type: [String] })
  images!: string[];

  @ApiProperty({ nullable: true })
  weight!: number | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ nullable: true })
  deletedAt!: Date | null;
}
