import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { VariantsService } from './variants.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products/:productId/variants')
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  @Post()
  create(
    @Param('productId') productId: string,
    @Body() createVariantDto: CreateVariantDto,
    @CurrentUser() user: User
  ) {
    return this.variantsService.create(
      productId,
      createVariantDto,
      user.organizationId
    );
  }

  @Get()
  findAll(@Param('productId') productId: string, @CurrentUser() user: User) {
    return this.variantsService.findAll(productId, user.organizationId);
  }

  @Get(':id')
  findOne(
    @Param('productId') productId: string,
    @Param('id') id: string,
    @CurrentUser() user: User
  ) {
    return this.variantsService.findOne(productId, id, user.organizationId);
  }

  @Patch(':id')
  update(
    @Param('productId') productId: string,
    @Param('id') id: string,
    @Body() updateVariantDto: UpdateVariantDto,
    @CurrentUser() user: User
  ) {
    return this.variantsService.update(
      productId,
      id,
      updateVariantDto,
      user.organizationId
    );
  }

  @Delete(':id')
  remove(
    @Param('productId') productId: string,
    @Param('id') id: string,
    @CurrentUser() user: User
  ) {
    return this.variantsService.remove(productId, id, user.organizationId);
  }
}
