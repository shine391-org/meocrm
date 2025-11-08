#!/bin/bash
set -e

cd ~/projects/meocrm

echo "🌿 Switch to feature branch..."
git checkout feature/products-module

echo ""
echo "📦 Step 1: Generate Products module..."
cd apps/api
npx nest g module products --no-spec
npx nest g controller products --no-spec
npx nest g service products --no-spec

echo ""
echo "📝 Step 2: Create DTOs..."
mkdir -p src/products/dto

cat > src/products/dto/create-product.dto.ts << 'EOF'
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  basePrice: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  costPrice?: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  minStock?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
EOF

cat > src/products/dto/update-product.dto.ts << 'EOF'
import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {}
EOF

cat > src/products/dto/create-variant.dto.ts << 'EOF'
import { IsString, IsNotEmpty, IsNumber, IsBoolean, IsOptional, IsObject, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVariantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsObject()
  @IsOptional()
  attributes?: Record<string, any>;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  price: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  inStock?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
EOF

cat > src/products/dto/update-variant.dto.ts << 'EOF'
import { PartialType } from '@nestjs/mapped-types';
import { CreateVariantDto } from './create-variant.dto';

export class UpdateVariantDto extends PartialType(CreateVariantDto) {}
EOF

echo ""
echo "🔧 Step 3: Implement Products Service..."
cat > src/products/products.service.ts << 'EOF'
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async generateSKU(organizationId: string, prefix: string = 'PRD'): Promise<string> {
    const lastProduct = await this.prisma.product.findFirst({
      where: { 
        organizationId,
        sku: { startsWith: prefix }
      },
      orderBy: { sku: 'desc' },
      select: { sku: true },
    });

    if (!lastProduct) return `${prefix}001`;

    const codeNumber = lastProduct.sku.substring(prefix.length);
    const lastNumber = parseInt(codeNumber, 10);
    
    if (isNaN(lastNumber)) return `${prefix}001`;

    return `${prefix}${(lastNumber + 1).toString().padStart(3, '0')}`;
  }

  async generateVariantSKU(productSKU: string, organizationId: string): Promise<string> {
    const prefix = `${productSKU}-V`;
    
    const lastVariant = await this.prisma.productVariant.findFirst({
      where: { 
        product: { organizationId },
        sku: { startsWith: prefix }
      },
      orderBy: { sku: 'desc' },
      select: { sku: true },
    });

    if (!lastVariant) return `${prefix}01`;

    const codeNumber = lastVariant.sku.substring(prefix.length);
    const lastNumber = parseInt(codeNumber, 10);
    
    if (isNaN(lastNumber)) return `${prefix}01`;

    return `${prefix}${(lastNumber + 1).toString().padStart(2, '0')}`;
  }

  async create(dto: CreateProductDto, organizationId: string) {
    const sku = await this.generateSKU(organizationId);

    return this.prisma.product.create({
      data: {
        sku,
        name: dto.name,
        categoryId: dto.categoryId,
        description: dto.description,
        basePrice: dto.basePrice,
        costPrice: dto.costPrice,
        minStock: dto.minStock ?? 0,
        isActive: dto.isActive ?? true,
        organizationId,
      },
      include: {
        category: true,
      },
    });
  }

  async findAll(page: number, limit: number, organizationId: string, categoryId?: string) {
    const skip = (page - 1) * limit;

    const where: any = { organizationId };
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: true,
          variants: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, organizationId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId },
      include: {
        category: true,
        variants: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto, organizationId: string) {
    await this.findOne(id, organizationId);

    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: {
        category: true,
        variants: true,
      },
    });
  }

  async remove(id: string, organizationId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId },
      include: { variants: true },
    });

    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    if (product.variants.length > 0) {
      throw new ConflictException('Cannot delete product with existing variants');
    }

    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted successfully' };
  }

  async createVariant(productId: string, dto: CreateVariantDto, organizationId: string) {
    const product = await this.findOne(productId, organizationId);
    const sku = await this.generateVariantSKU(product.sku, organizationId);

    return this.prisma.productVariant.create({
      data: {
        sku,
        productId,
        name: dto.name,
        attributes: dto.attributes ?? {},
        price: dto.price,
        inStock: dto.inStock ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findVariants(productId: string, organizationId: string) {
    await this.findOne(productId, organizationId);

    return this.prisma.productVariant.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateVariant(id: string, dto: UpdateVariantDto, organizationId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { 
        id,
        product: { organizationId }
      },
    });

    if (!variant) {
      throw new NotFoundException(`Variant ${id} not found`);
    }

    return this.prisma.productVariant.update({
      where: { id },
      data: dto,
    });
  }

  async removeVariant(id: string, organizationId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { 
        id,
        product: { organizationId }
      },
    });

    if (!variant) {
      throw new NotFoundException(`Variant ${id} not found`);
    }

    await this.prisma.productVariant.delete({ where: { id } });
    return { message: 'Variant deleted successfully' };
  }
}
EOF

echo ""
echo "🎮 Step 4: Implement Products Controller..."
cat > src/products/products.controller.ts << 'EOF'
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
  Req,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() createProductDto: CreateProductDto, @Req() req: any) {
    return this.productsService.create(createProductDto, req.user.organizationId);
  }

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('categoryId') categoryId: string,
    @Req() req: any,
  ) {
    return this.productsService.findAll(
      parseInt(page),
      parseInt(limit),
      req.user.organizationId,
      categoryId,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.productsService.findOne(id, req.user.organizationId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Req() req: any,
  ) {
    return this.productsService.update(id, updateProductDto, req.user.organizationId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.productsService.remove(id, req.user.organizationId);
  }

  @Post(':id/variants')
  createVariant(
    @Param('id') id: string,
    @Body() createVariantDto: CreateVariantDto,
    @Req() req: any,
  ) {
    return this.productsService.createVariant(id, createVariantDto, req.user.organizationId);
  }

  @Get(':id/variants')
  findVariants(@Param('id') id: string, @Req() req: any) {
    return this.productsService.findVariants(id, req.user.organizationId);
  }

  @Patch('variants/:id')
  updateVariant(
    @Param('id') id: string,
    @Body() updateVariantDto: UpdateVariantDto,
    @Req() req: any,
  ) {
    return this.productsService.updateVariant(id, updateVariantDto, req.user.organizationId);
  }

  @Delete('variants/:id')
  removeVariant(@Param('id') id: string, @Req() req: any) {
    return this.productsService.removeVariant(id, req.user.organizationId);
  }
}
EOF

echo ""
echo "🔌 Step 5: Update Products Module..."
cat > src/products/products.module.ts << 'EOF'
import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
EOF

echo ""
echo "📲 Step 6: Register in App Module..."
if ! grep -q "ProductsModule" src/app.module.ts; then
  sed -i "/import { SuppliersModule } from '.\/suppliers\/suppliers.module';/a import { ProductsModule } from './products/products.module';" src/app.module.ts
  sed -i "/SuppliersModule,/a \    ProductsModule," src/app.module.ts
  echo "✅ Added ProductsModule to app.module.ts"
else
  echo "✅ ProductsModule already in app.module.ts"
fi

echo ""
echo "🔄 Step 7: Restart server..."
pkill -9 -f "nest start" || true
lsof -ti :2003 | xargs kill -9 2>/dev/null || true
sleep 3
cd ~/projects/meocrm/apps/api
pnpm run dev > /tmp/meocrm-server.log 2>&1 &

echo "⏳ Waiting for server (15s)..."
sleep 15

echo ""
echo "🧪 Step 8: Test endpoints..."
TOKEN=$(curl -s -X POST http://localhost:2003/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lanoleather.vn","password":"Admin@123"}' | jq -r '.accessToken')

echo "✅ Test 1: Create Product"
PRODUCT=$(curl -s -X POST http://localhost:2003/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test Product Auto",
    "description":"Created by script",
    "basePrice":100000,
    "costPrice":60000,
    "minStock":5
  }')
echo "$PRODUCT" | jq '{sku, name, basePrice}'
PRODUCT_ID=$(echo "$PRODUCT" | jq -r '.id')

echo ""
echo "✅ Test 2: List Products"
curl -s "http://localhost:2003/products?limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq '{total: .meta.total, products: [.data[] | {sku, name}]}'

echo ""
echo "✅ Test 3: Create Variant"
curl -s -X POST "http://localhost:2003/products/$PRODUCT_ID/variants" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Size L - Red",
    "attributes":{"size":"L","color":"Red"},
    "price":120000,
    "inStock":10
  }' | jq '{sku, name, price, attributes}'

echo ""
echo "✅ Test 4: Get Product with Variants"
curl -s "http://localhost:2003/products/$PRODUCT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '{
    sku, 
    name, 
    variantCount: (.variants | length),
    variants: .variants | map({sku, name, price})
  }'

echo ""
echo "📊 Final Summary:"
curl -s "http://localhost:2003/products" \
  -H "Authorization: Bearer $TOKEN" | jq '{
    total: .meta.total,
    products: .data | map({
      sku, 
      name, 
      variants: (.variants | length)
    })
  }'

echo ""
echo "🎉 DONE! Check server logs:"
echo "   tail -f /tmp/meocrm-server.log"
echo ""
echo "Next: git add -A && git commit -m 'feat: ProductsModule with variants'"
