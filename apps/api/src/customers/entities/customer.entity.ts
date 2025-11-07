import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/library';

export class Customer {
  @ApiProperty({ description: 'Customer ID' })
  id: string;

  @ApiProperty({ description: 'Organization ID' })
  organizationId: string;

  @ApiProperty({ description: 'Customer code (KH000001)' })
  code: string;

  @ApiProperty({ description: 'Customer name' })
  name: string;

  @ApiProperty({ description: 'Phone number' })
  phone: string;

  @ApiPropertyOptional({ description: 'Email address' })
  email?: string;

  @ApiPropertyOptional({ description: 'Street address' })
  address?: string;

  @ApiPropertyOptional({ description: 'Province/City' })
  province?: string;

  @ApiPropertyOptional({ description: 'District' })
  district?: string;

  @ApiPropertyOptional({ description: 'Ward' })
  ward?: string;

  @ApiPropertyOptional({ description: 'Customer segment' })
  segment?: string;

  @ApiProperty({ description: 'Total amount spent' })
  totalSpent: Decimal;

  @ApiProperty({ description: 'Total number of orders' })
  totalOrders: number;

  @ApiProperty({ description: 'Outstanding debt' })
  debt: Decimal;

  @ApiPropertyOptional({ description: 'Last order date' })
  lastOrderAt?: Date;

  @ApiProperty({ description: 'Created date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last updated date' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Deleted date (soft delete)' })
  deletedAt?: Date;
}
