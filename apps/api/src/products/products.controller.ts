import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() dto: CreateProductDto, @Req() req: any) {
    return this.productsService.create(dto, req.user.organizationId);
  }

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('categoryId') categoryId: string | undefined = undefined,
    @Req() req: any,
  ) {
    return this.productsService.findAll(parseInt(page), parseInt(limit), req.user.organizationId, categoryId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.productsService.findOne(id, req.user.organizationId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto, @Req() req: any) {
    return this.productsService.update(id, dto, req.user.organizationId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.productsService.remove(id, req.user.organizationId);
  }

  @Post(':id/variants')
  createVariant(@Param('id') id: string, @Body() dto: CreateVariantDto, @Req() req: any) {
    return this.productsService.createVariant(id, dto, req.user.organizationId);
  }

  @Get(':id/variants')
  findVariants(@Param('id') id: string, @Req() req: any) {
    return this.productsService.findVariants(id, req.user.organizationId);
  }

  @Patch('variants/:id')
  updateVariant(@Param('id') id: string, @Body() dto: UpdateVariantDto, @Req() req: any) {
    return this.productsService.updateVariant(id, dto, req.user.organizationId);
  }

  @Delete('variants/:id')
  removeVariant(@Param('id') id: string, @Req() req: any) {
    return this.productsService.removeVariant(id, req.user.organizationId);
  }
}
