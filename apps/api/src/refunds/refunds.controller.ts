import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RefundsService } from './refunds.service';
import { RefundRequestDto } from './dto/refund-request.dto';
import { RefundRejectDto } from './dto/refund-reject.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RefundsRolesGuard } from './guards/refunds-roles.guard';

@ApiTags('Refunds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders/:orderId')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post('refund-request')
  @ApiOperation({ summary: 'Request a refund for an order (staff)' })
  async requestRefund(
    @Param('orderId') orderId: string,
    @Body() refundRequestDto: RefundRequestDto,
    @CurrentUser() user: User,
  ) {
    return this.refundsService.requestRefund(
      orderId,
      refundRequestDto,
      user,
    );
  }

  @Post('refund-approve')
  @UseGuards(RefundsRolesGuard)
  @ApiOperation({ summary: 'Approve a refund request (manager)' })
  async approveRefund(
    @Param('orderId') orderId: string,
    @CurrentUser() user: User,
  ) {
    return this.refundsService.approveRefund(orderId, user);
  }

  @Post('refund-reject')
  @UseGuards(RefundsRolesGuard)
  @ApiOperation({ summary: 'Reject a refund request (manager)' })
  async rejectRefund(
    @Param('orderId') orderId: string,
    @Body() refundRejectDto: RefundRejectDto,
    @CurrentUser() user: User,
  ) {
    return this.refundsService.rejectRefund(
      orderId,
      refundRejectDto,
      user,
    );
  }
}
