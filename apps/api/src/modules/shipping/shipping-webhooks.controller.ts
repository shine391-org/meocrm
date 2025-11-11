
import { Controller, Post, Body, RawBodyRequest, Headers, UnauthorizedException, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from '../../orders/orders.service';
import { OrderStatus } from '@prisma/client';
import * as crypto from 'crypto';

@ApiTags('Webhooks')
@Controller('webhooks/shipping')
export class ShippingWebhooksController {
  constructor(private readonly ordersService: OrdersService) {}

  // A simplified example. In a real app, the secret would come from a config/DB per-partner.
  private readonly partnerSecret = process.env.SHIPPING_WEBHOOK_SECRET || 'default-secret';

  @Post('delivered')
  @ApiOperation({ summary: 'Handle "shipping.delivered" webhook event' })
  async handleShippingDelivered(
    @Body() payload: { order_code: string; status: string }, // Example payload shape
    @Headers('X-Partner-Signature') signature: string,
    @Req() req: RawBodyRequest<any>,
  ) {
    if (!req.rawBody) {
        throw new Error('Raw body not available. Ensure RawBodyMiddleware is applied.');
    }

    // 1. Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', this.partnerSecret)
      .update(req.rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new UnauthorizedException('Invalid webhook signature.');
    }

    // 2. Process the event
    // This is a simplified lookup. A real implementation would need to find the orgId first.
    const order = await this.ordersService.findOne(payload.order_code, ''); // HACK: orgId is missing

    if (payload.status === 'delivered' && order) {
      await this.ordersService.updateStatus(order.id, { status: OrderStatus.COMPLETED }, order.organizationId);
      // TODO: Handle COD payment if order.paymentMethod === 'COD'
    }

    return { received: true };
  }
}
