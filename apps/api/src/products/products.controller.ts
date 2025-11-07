import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductEntity } from './entities/product.entity';
import { VariantEntity } from './entities/variant.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Products')
@Controller('products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create new product' })
  @ApiResponse({ status: 201, type: ProductEntity })
  create(@Body() dto: CreateProductDto, @CurrentUser() user: any) {
    return this.productsService.create(dto, user.organizationId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products (paginated)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200 })
  findAll(@Query('page') page?: string, @Query('limit') limit?: string, @CurrentUser() user?: any) {
    return this.productsService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      user.organizationId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, type: ProductEntity })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productsService.findOne(id, user.organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update product' })
  @ApiResponse({ status: 200, type: ProductEntity })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto, @CurrentUser() user: any) {
    return this.productsService.update(id, dto, user.organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete product' })
  @ApiResponse({ status: 200 })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productsService.remove(id, user.organizationId);
  }

  @Post(':id/variants')
  @ApiOperation({ summary: 'Create variant' })
  @ApiResponse({ status: 201, type: VariantEntity })
  createVariant(@Param('id') productId: string, @Body() dto: CreateVariantDto, @CurrentUser() user: any) {
    return this.productsService.createVariant(productId, dto, user.organizationId);
  }

  @Get(':id/variants')
  @ApiOperation({ summary: 'Get variants' })
  @ApiResponse({ status: 200, type: [VariantEntity] })
  findVariants(@Param('id') productId: string, @CurrentUser() user: any) {
    return this.productsService.findVariants(productId, user.organizationId);
  }

  @Patch('variants/:id')
  @ApiOperation({ summary: 'Update variant' })
  @ApiResponse({ status: 200, type: VariantEntity })
  updateVariant(@Param('id') variantId: string, @Body() dto: UpdateVariantDto, @CurrentUser() user: any) {
    return this.productsService.updateVariant(variantId, dto, user.organizationId);
  }

  @Delete('variants/:id')
  @ApiOperation({ summary: 'Delete variant' })
  @ApiResponse({ status: 200 })
  removeVariant(@Param('id') variantId: string, @CurrentUser() user: any) {
    return this.productsService.removeVariant(variantId, user.organizationId);
  }
}
