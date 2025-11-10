import { Category, PrismaClient, Product } from '@prisma/client';
import { BaseSeedData } from './01-base-data';
import { randomInt } from './utils/seed-helpers';

export interface ProductsSeedData {
  products: Product[];
  categories: {
    main: Category[];
    sub: Category[];
  };
}

export async function seedProductsData(
  prisma: PrismaClient,
  baseData: BaseSeedData,
): Promise<ProductsSeedData> {
  const normalizeSkuSegment = (value: string, length = 2) => {
    const sanitized = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase();
    const padded = sanitized.padEnd(length, 'X');
    return padded.substring(0, length);
  };

  const orgId = baseData.organizations.hn.id;

  console.log('  Creating categories...');

  const catWallets = await prisma.category.create({
    data: { organizationId: orgId, name: 'VÍ DA' },
  });

  const catBags = await prisma.category.create({
    data: { organizationId: orgId, name: 'TÚI XÁCH' },
  });

  const catAccessories = await prisma.category.create({
    data: { organizationId: orgId, name: 'PHỤ KIỆN' },
  });

  const subCategoriesConfig = [
    { parent: catWallets, name: 'Ví thiết kế' },
    { parent: catWallets, name: 'Ví thường' },
    { parent: catWallets, name: 'Ví đựng thẻ' },
    { parent: catBags, name: 'Túi xách tay' },
    { parent: catBags, name: 'Balo' },
    { parent: catBags, name: 'Túi đeo chéo' },
    { parent: catAccessories, name: 'Thắt lưng' },
    { parent: catAccessories, name: 'Móc khóa' },
    { parent: catAccessories, name: 'Ốp điện thoại' },
  ];

  const createdSubCategories: Category[] = [];
  for (const sub of subCategoriesConfig) {
    const created = await prisma.category.create({
      data: {
        organizationId: orgId,
        name: sub.name,
        parentId: sub.parent.id,
      },
    });
    createdSubCategories.push(created);
  }

  console.log('  ✓ Created 12 categories (3 main + 9 sub)');
  console.log('  Creating products...');

  const colors = ['Đen', 'Nâu', 'Xanh lá', 'Xanh dương', 'Đỏ'];
  const products: Product[] = [];

  for (let i = 1; i <= 50; i++) {
    const categoryId = createdSubCategories[i % createdSubCategories.length].id;
    const costPrice = randomInt(100_000, 500_000);
    const sellPrice = Math.round(costPrice * (randomInt(18, 25) / 10));

    const product = await prisma.product.create({
      data: {
        organizationId: orgId,
        sku: `PRD${String(i).padStart(4, '0')}`,
        name: `Sản phẩm ${i}`,
        categoryId,
        costPrice,
        sellPrice,
        stock: randomInt(10, 100),
        minStock: 5,
        maxStock: 999,
        images: [`https://via.placeholder.com/400x400?text=Product+${i}`],
        weight: randomInt(100, 500),
        isActive: true,
      },
    });

    const numVariants = randomInt(2, 3);
    for (let v = 0; v < numVariants; v++) {
      const variantCode = normalizeSkuSegment(colors[v]);
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: `${product.sku}-${variantCode}`,
          name: colors[v],
          additionalPrice: randomInt(0, 50_000),
          stock: randomInt(5, 30),
          images: [`https://via.placeholder.com/400x400?text=${colors[v]}`],
        },
      });
    }

    products.push(product);
  }

  console.log('  ✓ Created 50 products with variants');

  return {
    products,
    categories: {
      main: [catWallets, catBags, catAccessories],
      sub: createdSubCategories,
    },
  };
}
