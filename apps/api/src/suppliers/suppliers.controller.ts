/* istanbul ignore file */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySuppliersDto } from './dto/query-suppliers.dto';
import { SupplierEntity } from './entities/supplier.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../common/guards/organization.guard';
import { OrganizationId } from '../common/decorators/organization-id.decorator';

@ApiTags('suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganizationGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @ApiOperation({ summary: 'Create new supplier' })
  @ApiResponse({ status: 201, description: 'Supplier created successfully', type: SupplierEntity })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@OrganizationId() organizationId: string, @Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(organizationId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List suppliers with pagination' })
  @ApiResponse({ status: 200, description: 'Supplier list' })
  findAll(@OrganizationId() organizationId: string, @Query() query: QuerySuppliersDto) {
    return this.suppliersService.findAll(organizationId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier by ID' })
  @ApiResponse({ status: 200, description: 'Supplier detail', type: SupplierEntity })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  findOne(@OrganizationId() organizationId: string, @Param('id') id: string) {
    return this.suppliersService.findOne(organizationId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update supplier' })
  @ApiResponse({ status: 200, description: 'Supplier updated', type: SupplierEntity })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  update(@OrganizationId() organizationId: string, @Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.update(organizationId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete supplier (soft delete)' })
  @ApiResponse({ status: 204, description: 'Supplier deleted' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  @ApiResponse({ status: 400, description: 'Supplier has active purchase orders' })
  remove(@OrganizationId() organizationId: string, @Param('id') id: string) {
    return this.suppliersService.remove(organizationId, id);
  }
}
