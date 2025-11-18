import { ApiProperty } from '@nestjs/swagger';
import { ShippingOrder, ShippingStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export class ShippingOrderEntity implements Partial<ShippingOrder> {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  orderId!: string;

  @ApiProperty()
  partnerId!: string;

  @ApiProperty()
  trackingCode!: string;

  @ApiProperty()
  status!: ShippingStatus;

  @ApiProperty()
  recipientName!: string;

  @ApiProperty()
  recipientPhone!: string;

  @ApiProperty()
  recipientAddress!: string;

  @ApiProperty({ required: false })
  recipientWard?: string | null;

  @ApiProperty({ required: false })
  recipientDistrict?: string | null;

  @ApiProperty({ required: false })
  recipientProvince?: string | null;

  @ApiProperty()
  shippingFee!: Decimal;

  @ApiProperty({ required: false })
  codAmount?: Decimal;

  @ApiProperty({ required: false })
  weight?: number | null;

  @ApiProperty({ required: false })
  notes?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
