import { PrismaClient } from '@prisma/client';
import { seedBaseData } from './01-base-data';
import { seedSampleData } from './02-sample-data';
import { seedProductsData } from './03-products-data';
import { seedOrdersData } from './04-orders-data';

const prisma = new PrismaClient();

const SAFE_ENVS = new Set(['development', 'test']);

function ensureSafeEnvironment() {
  const env = process.env.NODE_ENV as string | undefined;
  if (!env) {
    throw new Error('NODE_ENV must be set to "development" hoặc "test" trước khi chạy seed.');
  }
  if (!SAFE_ENVS.has(env)) {
    throw new Error(
      `Refusing to run seed in NODE_ENV="${env}". Chỉ chạy seed trong môi trường development/test.`,
    );
  }
  return env;
}

async function clearDatabase() {
  const env = ensureSafeEnvironment();

  console.log('🗑️  Clearing existing data (transaction)...');
  await prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany();
    await tx.order.deleteMany();
    await tx.shippingOrder.deleteMany();
    await tx.customer.deleteMany();
    await tx.productVariant.deleteMany();
    await tx.product.deleteMany();
    await tx.category.deleteMany();
    await tx.user.deleteMany();
    await tx.branch.deleteMany();
    await tx.customerGroup.deleteMany();
    await tx.shippingPartner.deleteMany();
    await tx.organization.deleteMany();
  });
  console.log('✅ Database cleared');
}

async function main() {
  ensureSafeEnvironment();
  console.log('🌱 Starting database seed...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await clearDatabase();

  console.log('\n📦 Phase 1: Base Data');
  const baseData = await seedBaseData(prisma);

  console.log('\n📦 Phase 2: Sample Data');
  await seedSampleData(prisma, baseData);

  console.log('\n📦 Phase 3: Products Data');
  const productsData = await seedProductsData(prisma, baseData);

  console.log('\n📦 Phase 4: Orders Data');
  await seedOrdersData(prisma, baseData, productsData);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Seeding complete!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
