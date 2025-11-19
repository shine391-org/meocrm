import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { GetInventoryDto } from './dto/get-inventory.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { GetReservationAlertsDto } from './dto/get-reservation-alerts.dto';
import { ScanReservationAlertsDto } from './dto/scan-reservation-alerts.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../common/guards/organization.guard';
import { OrganizationId } from '../common/decorators/organization-id.decorator';
import { AdminGuard } from './guards/admin.guard';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganizationGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get inventory by branch with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Inventory retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  async getInventoryByBranch(
    @Query() query: GetInventoryDto,
    @OrganizationId() organizationId: string,
  ) {
    return this.inventoryService.getInventoryByBranch(query, organizationId);
  }

  @Post('adjust')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Manual stock adjustment (admin only)' })
  @ApiResponse({ status: 200, description: 'Stock adjusted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - insufficient stock' })
  @ApiResponse({ status: 404, description: 'Product or branch not found' })
  async adjustStock(
    @Body() dto: AdjustStockDto,
    @OrganizationId() organizationId: string,
    @Req() req: any,
  ) {
    return this.inventoryService.adjustStock(dto, organizationId, req.user.id);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get low stock alerts for a branch' })
  @ApiResponse({ status: 200, description: 'Low stock alerts retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  async getLowStockAlerts(
    @Query('branchId') branchId: string,
    @OrganizationId() organizationId: string,
  ) {
    return this.inventoryService.getLowStockAlerts(branchId, organizationId);
  }

  @Get('reservation-alerts')
  @ApiOperation({ summary: 'List stuck reservation alerts' })
  @ApiResponse({ status: 200, description: 'Reservation alerts retrieved successfully' })
  async getReservationAlerts(
    @Query() query: GetReservationAlertsDto,
    @OrganizationId() organizationId: string,
  ) {
    return this.inventoryService.getReservationAlerts(query, organizationId);
  }

  @Post('reservation-alerts/scan')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Trigger a reservation leak scan (admin)' })
  @ApiResponse({ status: 200, description: 'Scan executed successfully' })
  async scanReservationAlerts(
    @Body() dto: ScanReservationAlertsDto,
    @OrganizationId() organizationId: string,
  ) {
    return this.inventoryService.scanReservationLeaks(organizationId, dto);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Create inter-branch transfer' })
  @ApiResponse({ status: 201, description: 'Transfer created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - insufficient stock or invalid branches' })
  @ApiResponse({ status: 404, description: 'Product or branch not found' })
  async createTransfer(
    @Body() dto: CreateTransferDto,
    @OrganizationId() organizationId: string,
    @Req() req: any,
  ) {
    return this.inventoryService.createTransfer(dto, organizationId, req.user.id);
  }
}
