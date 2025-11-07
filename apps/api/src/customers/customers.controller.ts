import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiResponse({ status: 201, description: 'The customer has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 409, description: 'Customer with this phone number already exists.' })
  create(
    @CurrentUser() user,
    @Body() createCustomerDto: CreateCustomerDto
  ) {
    return this.customersService.create(user.organizationId, createCustomerDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all customers' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term for name, phone, or code' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  @ApiQuery({ name: 'segment', required: false, type: String, description: 'Filter by customer segment' })
  @ApiResponse({ status: 200, description: 'A list of customers.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAll(
    @CurrentUser() user,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('segment') segment?: string
  ) {
    return this.customersService.findAll(
      user.organizationId,
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      segment
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single customer by ID' })
  @ApiResponse({ status: 200, description: 'The customer.' })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findOne(@CurrentUser() user, @Param('id') id: string) {
    return this.customersService.findOne(user.organizationId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a customer' })
  @ApiResponse({ status: 200, description: 'The updated customer.' })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  update(
    @CurrentUser() user,
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto
  ) {
    return this.customersService.update(
      user.organizationId,
      id,
      updateCustomerDto
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a customer' })
  @ApiResponse({ status: 200, description: 'The customer has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 400, description: 'Cannot delete a customer with existing orders.' })
  remove(@CurrentUser() user, @Param('id') id: string) {
    return this.customersService.remove(user.organizationId, id);
  }
}
