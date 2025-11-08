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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { ListSuppliersDto } from './dto/list-suppliers.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { SupplierEntity } from './entities/supplier.entity';

@ApiTags('suppliers')
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
constructor(private readonly suppliersService: SuppliersService) {}

@Post()
@ApiOperation({ summary: 'Create new supplier' })
@ApiResponse({ status: 201, description: 'Supplier created successfully', type: SupplierEntity })
@ApiResponse({ status: 400, description: 'Validation error' })
create(@CurrentUser() user: User, @Body() dto: CreateSupplierDto) {
return this.suppliersService.create(user.organizationId, dto);
}

@Get()
@ApiOperation({ summary: 'List suppliers with pagination' })
@ApiResponse({ status: 200, description: 'Supplier list' })
findAll(@CurrentUser() user: User, @Query() query: ListSuppliersDto) {
return this.suppliersService.findAll(user.organizationId, query);
}

@Get(':id')
@ApiOperation({ summary: 'Get supplier by ID' })
@ApiResponse({ status: 200, description: 'Supplier detail', type: SupplierEntity })
@ApiResponse({ status: 404, description: 'Supplier not found' })
findOne(@CurrentUser() user: User, @Param('id') id: string) {
return this.suppliersService.findOne(user.organizationId, id);
}

@Patch(':id')
@ApiOperation({ summary: 'Update supplier' })
@ApiResponse({ status: 200, description: 'Supplier updated', type: SupplierEntity })
@ApiResponse({ status: 404, description: 'Supplier not found' })
@ApiResponse({ status: 400, description: 'Validation error' })
update(
@CurrentUser() user: User,
@Param('id') id: string,
@Body() dto: UpdateSupplierDto,
) {
return this.suppliersService.update(user.organizationId, id, dto);
}

@Delete(':id')
@HttpCode(HttpStatus.NO_CONTENT)
@ApiOperation({ summary: 'Delete supplier (soft delete)' })
@ApiResponse({ status: 204, description: 'Supplier deleted' })
@ApiResponse({ status: 404, description: 'Supplier not found' })
@ApiResponse({ status: 400, description: 'Supplier has active purchase orders' })
remove(@CurrentUser() user: User, @Param('id') id: string) {
return this.suppliersService.remove(user.organizationId, id);
}
}
