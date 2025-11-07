import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/library';

// Note: Will implement Prisma.Supplier after schema migration
export class SupplierEntity {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  phone!: string;

  @ApiPropertyOptional({ nullable: true })
  email!: string | null;

  @ApiPropertyOptional({ nullable: true })
  address!: string | null;

  @ApiPropertyOptional({ nullable: true })
  taxCode!: string | null;

  @ApiProperty({ type: 'number', description: 'Total amount purchased from this supplier' })
  totalPurchased!: Decimal;

  @ApiProperty()
  totalOrders!: number;

  @ApiProperty({ type: 'number', description: 'Current debt owed to this supplier' })
  debt!: Decimal;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  deletedAt!: Date | null;

  constructor(partial: Partial<SupplierEntity>) {
    Object.assign(this, partial);
  }
}
