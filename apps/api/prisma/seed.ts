import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding...');
  
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.shippingOrder.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.transfer.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.organization.deleteMany();

  const org = await prisma.organization.create({
    data: {
      name: 'Lano Leather',
      slug: 'lano-leather',
      code: 'LANO001',
    },
  });

  await prisma.branch.createMany({
    data: [
      { name: 'HN', address: '456 Hoàng Diệu, Ba Đình, HN', phone: '024123', organizationId: org.id },
      { name: 'HCM', address: '789 Nguyễn Huệ, Q1, HCM', phone: '028123', organizationId: org.id },
    ],
  });

  // Create admin users
  await prisma.user.create({
    data: {
      email: 'admin@lanoleather.vn',
      password: await bcrypt.hash('Admin@123', 10),
      name: 'Admin',
      role: 'OWNER',
      organizationId: org.id,
    },
  });

  await prisma.user.create({
    data: {
      email: 'admin',
      password: await bcrypt.hash('admin', 10),
      name: 'Admin User',
      role: 'OWNER',
      organizationId: org.id,
    },
  });

  const c1 = await prisma.category.create({ data: { name: 'VÍ DA', organizationId: org.id } });
  const c2 = await prisma.category.create({ data: { name: 'Ví thiết kế', parentId: c1.id, organizationId: org.id } });
  const c3 = await prisma.category.create({ data: { name: 'Ví ngắn', parentId: c2.id, organizationId: org.id } });

  for (let i = 1; i <= 10; i++) {
    const sku = `VDNT${String(i).padStart(2, '0')}`;
    await prisma.product.create({
      data: {
        name: `Ví da ${i}`,
        sku,
        costPrice: 150000 + i * 10000,
        sellPrice: 350000 + i * 20000,
        stock: 50,
        minStock: 10,
        categoryId: c3.id,
        organizationId: org.id,
        variants: {
          create: [
            { sku: `${sku}-D`, name: 'Đen', additionalPrice: 0, stock: 20, organizationId: org.id },
            { sku: `${sku}-N`, name: 'Nâu', additionalPrice: 20000, stock: 15, organizationId: org.id },
          ],
        },
      },
    });
  }

  for (let i = 1; i <= 5; i++) {
    await prisma.customer.create({
      data: { name: `Khách ${i}`, phone: `090100000${i}`, email: `kh${i}@example.com`, code: `KH${String(i).padStart(6, '0')}`, organizationId: org.id },
    });
  }

  await prisma.supplier.createMany({
    data: [
      { name: 'NCC Da Việt', code: 'DT000001', phone: '0901000001', organizationId: org.id },
      { name: 'NCC Phụ kiện', code: 'DT000002', phone: '0901000002', organizationId: org.id },
    ],
  });

  console.log('✅ Done!');
  console.log('   Admin 1: admin@lanoleather.vn / Admin@123');
  console.log('   Admin 2: admin / admin');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
