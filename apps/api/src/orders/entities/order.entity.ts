/* istanbul ignore file */
import { ApiProperty } from '@nestjs/swagger';
import {
  Order,
  OrderStatus,
  PaymentMethod,
  Customer,
  OrderItem,
} from '@prisma/client';
import { Type } from 'class-transformer';
import { Decimal } from '@prisma/client/runtime/library';

class OrderCustomerEntity implements Partial<Customer> {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  phone!: string;
}

class OrderItemEntity implements Partial<OrderItem> {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty({ required: false, nullable: true })
  variantId!: string | null;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unitPrice!: Decimal;

  @ApiProperty()
  subtotal!: Decimal;
}

export class OrderEntity implements Partial<Order> {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty({ type: () => OrderCustomerEntity })
  @Type(() => OrderCustomerEntity)
  customer?: OrderCustomerEntity;

  @ApiProperty({ type: () => [OrderItemEntity] })
  @Type(() => OrderItemEntity)
  items?: OrderItemEntity[];

  @ApiProperty()
  subtotal!: Decimal;

  @ApiProperty()
  tax!: Decimal;

  @ApiProperty()
  shipping!: Decimal;

  @ApiProperty()
  discount!: Decimal;

  @ApiProperty()
  total!: Decimal;

  @ApiProperty({ description: 'Whether order is fully paid' })
  isPaid!: boolean;

  @ApiProperty({ description: 'Amount paid by customer' })
  paidAmount!: Decimal;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty({ enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @ApiProperty({ required: false, nullable: true })
  notes!: string | null;

  @ApiProperty()

  organizationId!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
