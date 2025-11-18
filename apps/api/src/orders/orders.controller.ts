/* istanbul ignore file */
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Put,
  Delete,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { User } from '@prisma/client';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderEntity } from './entities/order.entity';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrganizationGuard } from '../common/guards/organization.guard';
import { OrganizationId } from '../common/decorators/organization-id.decorator';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create new order' })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
    type: OrderEntity,
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({
    status: 404,
    description: 'Customer or product not found',
  })
  create(
    @Body() createOrderDto: CreateOrderDto,
    @OrganizationId() organizationId: string,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.create(createOrderDto, organizationId, user);
  }

  @Get()
  @ApiOperation({ summary: 'List orders with filters' })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved successfully',
  })
  findAll(
    @Query() query: QueryOrdersDto,
    @OrganizationId() organizationId: string,
  ) {
    return this.ordersService.findAll(organizationId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order detail' })
  @ApiResponse({ status: 200, description: 'Order found', type: OrderEntity })
  @ApiResponse({ status: 404, description: 'Order not found' })
  findOne(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
  ) {
    return this.ordersService.findOne(id, organizationId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update order details' })
  @ApiResponse({ status: 200, description: 'Order updated' })
  @ApiResponse({ status: 400, description: 'Cannot update order' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
    @OrganizationId() organizationId: string,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.update(id, dto, organizationId, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete order' })
  @ApiResponse({ status: 200, description: 'Order deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete order' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  remove(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.remove(id, organizationId, user);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status' })
  @ApiResponse({
    status: 200,
    description: 'Status updated',
    type: OrderEntity,
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @OrganizationId() organizationId: string,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.updateStatus(id, dto, organizationId, user);
  }
}
