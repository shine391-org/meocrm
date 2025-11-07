import { ApiProperty } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/library';

export class CustomerEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty({ example: 'CUS001' })
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  phone: string;

  @ApiProperty({ nullable: true })
  email: string | null;

  @ApiProperty({ nullable: true })
  address: string | null;

  @ApiProperty({ nullable: true })
  province: string | null;

  @ApiProperty({ nullable: true })
  district: string | null;

  @ApiProperty({ nullable: true })
  ward: string | null;

  @ApiProperty({ nullable: true })
  segment: string | null;

  @ApiProperty({ type: 'number' })
  totalSpent: Decimal;

  @ApiProperty()
  totalOrders: number;

  @ApiProperty({ type: 'number' })
  debt: Decimal;

  @ApiProperty({ nullable: true })
  lastOrderAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
