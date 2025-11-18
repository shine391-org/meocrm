import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { mkdtempSync, writeFileSync, chmodSync } from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';

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

  const nodeEnv = (process.env.NODE_ENV ?? 'development').toLowerCase();
  const isProduction = nodeEnv === 'production';
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const allowOwnerRole = process.env.SEED_ALLOW_OWNER_ROLE === 'true';

  if (isProduction) {
    console.log('⚠️  Skipping admin user creation in production environment.');
  } else {
    if (!adminEmail) {
      throw new Error('SEED_ADMIN_EMAIL must be provided to create the seed admin user.');
    }

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail);
    if (!isValidEmail) {
      throw new Error('SEED_ADMIN_EMAIL must be a valid email address.');
    }

    let resolvedPassword = adminPassword;
    let generatedPassword: string | null = null;

    if (!resolvedPassword) {
      generatedPassword = randomBytes(16).toString('hex');
      resolvedPassword = generatedPassword;
    }

    const hashedPassword = await bcrypt.hash(resolvedPassword, 10);

    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'System Admin',
        role: allowOwnerRole ? 'OWNER' : 'ADMIN',
        organizationId: org.id,
      },
    });

    console.log(`   Admin user created for ${adminEmail} (${allowOwnerRole ? 'OWNER' : 'ADMIN'})`);
    if (generatedPassword) {
      const credentialsFile = persistGeneratedPassword(adminEmail, generatedPassword);
      const masked = generatedPassword.slice(-4).padStart(generatedPassword.length, '*');
      console.log('   ⚠️  Generated password stored securely.');
      console.log(`      File: ${credentialsFile}`);
      console.log(`      Masked preview: ${masked}`);
      console.log('      Please rotate or remove the file after storing the credentials elsewhere.');
    }
  }

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
}

function persistGeneratedPassword(email: string, password: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'meocrm-seed-'));
  const filePath = path.join(dir, `admin-${Date.now()}.txt`);
  writeFileSync(
    filePath,
    `MeoCRM seed admin credentials\nEmail: ${email}\nPassword: ${password}\nGenerated: ${new Date().toISOString()}\n`,
    { mode: 0o600 },
  );
  chmodSync(filePath, 0o600);
  return filePath;
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
