/* istanbul ignore file */
import { Controller, Get, Post, Body, Query, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ShippingService } from './shipping.service';
import { CreateShippingOrderDto } from './dto/create-shipping-order.dto';
import { UpdateShippingStatusDto } from './dto/update-shipping-status.dto';
import { QueryShippingOrdersDto } from './dto/query-shipping-orders.dto';
import { ShippingOrderEntity } from './entities/shipping-order.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../common/guards/organization.guard';
import { OrganizationId } from '../common/decorators/organization-id.decorator';

@ApiTags('shipping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganizationGuard)
@Controller('shipping/orders')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post()
  @ApiOperation({ summary: 'Create shipping order' })
  @ApiResponse({ status: 201, description: 'Shipping order created', type: ShippingOrderEntity })
  async create(
    @OrganizationId() organizationId: string,
    @Body() dto: CreateShippingOrderDto,
  ) {
    return this.shippingService.create(organizationId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List shipping orders' })
  @ApiResponse({ status: 200, description: 'Shipping orders retrieved' })
  async findAll(
    @OrganizationId() organizationId: string,
    @Query() query: QueryShippingOrdersDto,
  ) {
    return this.shippingService.findAll(organizationId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shipping order detail' })
  @ApiResponse({ status: 200, description: 'Shipping order found', type: ShippingOrderEntity })
  async findOne(@OrganizationId() organizationId: string, @Param('id') id: string) {
    return this.shippingService.findOne(organizationId, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update shipping order status' })
  @ApiResponse({ status: 200, description: 'Shipping status updated', type: ShippingOrderEntity })
  async updateStatus(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateShippingStatusDto,
  ) {
    return this.shippingService.updateStatus(organizationId, id, dto);
  }
}
