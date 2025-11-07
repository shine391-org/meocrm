import { ApiProperty } from '@nestjs/swagger';

export class ProductEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  sku: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ nullable: true })
  categoryId: string | null;

  @ApiProperty()
  costPrice: number;

  @ApiProperty()
  sellPrice: number;

  @ApiProperty()
  stock: number;

  @ApiProperty()
  minStock: number;

  @ApiProperty()
  maxStock: number;

  @ApiProperty({ type: [String] })
  images: string[];

  @ApiProperty({ nullable: true })
  weight: number | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ nullable: true })
  deletedAt: Date | null;
}
