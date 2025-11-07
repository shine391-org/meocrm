#!/bin/bash
set -e

echo "╔═══════════════════════════════════════════╗"
echo "║  MeoCRM Database Setup - Local Machine    ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to project root
cd ~/projects/meocrm

echo "📍 Current directory: $(pwd)"
echo ""

#############################################################################
# STEP 1: Check PostgreSQL
#############################################################################
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 STEP 1: Checking PostgreSQL..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if postgres container is running
if docker ps | grep -q postgres; then
  echo -e "${GREEN}✅ PostgreSQL container is running${NC}"
  CONTAINER_NAME=$(docker ps --format '{{.Names}}' | grep postgres | head -1)
  echo "   Container: $CONTAINER_NAME"
else
  echo -e "${RED}❌ PostgreSQL container not running!${NC}"
  echo "   Starting PostgreSQL via Docker Compose..."
  
  # Try to start if docker-compose.yml exists
  if [ -f "docker-compose.yml" ]; then
    docker-compose up -d postgres
    sleep 5
  else
    echo -e "${RED}❌ No docker-compose.yml found!${NC}"
    echo "   Please start PostgreSQL manually"
    exit 1
  fi
fi

echo ""

#############################################################################
# STEP 2: Setup Database & User
#############################################################################
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗄️  STEP 2: Setting up Database & User..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get container name
CONTAINER=$(docker ps --format '{{.Names}}' | grep postgres | head -1)

# Create database and user
docker exec -i $CONTAINER psql -U postgres << 'SQL'
-- Create database if not exists
SELECT 'CREATE DATABASE meocrm_dev'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'meocrm_dev')\gexec

-- Create user if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'meocrm_user') THEN
    CREATE USER meocrm_user WITH PASSWORD 'meocrm_dev_password';
  END IF;
END
$$;

-- Grant privileges
ALTER ROLE meocrm_user WITH CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE meocrm_dev TO meocrm_user;

-- Connect to database
\c meocrm_dev

-- Transfer schema ownership
ALTER SCHEMA public OWNER TO meocrm_user;

-- Revoke from PUBLIC
REVOKE ALL ON SCHEMA public FROM PUBLIC;

-- Grant full permissions
GRANT ALL ON SCHEMA public TO meocrm_user;
GRANT CREATE ON SCHEMA public TO meocrm_user;
GRANT USAGE ON SCHEMA public TO meocrm_user;

-- Default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO meocrm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO meocrm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO meocrm_user;
SQL

echo -e "${GREEN}✅ Database and user created${NC}"
echo ""

#############################################################################
# STEP 3: Configure Environment
#############################################################################
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚙️  STEP 3: Configuring Environment..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get PostgreSQL port
PG_PORT=$(docker port $CONTAINER 5432 | cut -d: -f2)
echo "   PostgreSQL port: $PG_PORT"

# Create .env file
cat > apps/api/.env << EOF
DATABASE_URL="postgresql://meocrm_user:meocrm_dev_password@localhost:${PG_PORT}/meocrm_dev?schema=public"
PORT=2003
NODE_ENV=development
JWT_SECRET="dev-secret-local-$(date +%s)"
JWT_EXPIRES_IN=7d
EOF

echo -e "${GREEN}✅ .env file created${NC}"
echo ""

#############################################################################
# STEP 4: Install Dependencies
#############################################################################
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 STEP 4: Installing Dependencies..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd apps/api

# Install project dependencies
echo "   Installing main dependencies..."
pnpm install

# Install seed dependencies
echo "   Installing seed dependencies..."
pnpm add bcryptjs
pnpm add -D @types/bcryptjs ts-node

echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

#############################################################################
# STEP 5: Create Seed Script
#############################################################################
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌱 STEP 5: Creating Seed Script..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cat > prisma/seed.ts << 'SEEDEOF'
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting MeoCRM database seed...\n');

  // Clean existing data
  console.log('🗑️  Cleaning existing data...');
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.shippingOrder.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
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
  console.log('✅ Cleaned\n');

  // Create Organization
  console.log('🏢 Creating organization...');
  const org = await prisma.organization.create({
    data: {
      name: 'Lano Leather',
      code: 'LANO001',
      email: 'contact@lanoleather.vn',
      phone: '0901234567',
      address: '123 Lê Lợi, Quận 1, TP.HCM',
    },
  });
  console.log(`   ✅ ${org.name} (${org.code})\n`);

  // Create Branches
  console.log('🏪 Creating branches...');
  const branchHN = await prisma.branch.create({
    data: {
      name: 'Chi nhánh Hà Nội',
      code: 'HN',
      address: '456 Hoàng Diệu, Quận Ba Đình, Hà Nội',
      phone: '0241234567',
      organizationId: org.id,
    },
  });

  const branchHCM = await prisma.branch.create({
    data: {
      name: 'Chi nhánh TP.HCM',
      code: 'HCM',
      address: '789 Nguyễn Huệ, Quận 1, TP.HCM',
      phone: '0281234567',
      organizationId: org.id,
    },
  });
  console.log(`   ✅ ${branchHN.name}, ${branchHCM.name}\n`);

  // Create Admin User
  console.log('👤 Creating admin user...');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('Admin@123', salt);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@lanoleather.vn',
      password: hashedPassword,
      name: 'Admin User',
      role: 'OWNER',
      organizationId: org.id,
    },
  });
  console.log(`   ✅ ${admin.email}\n`);

  // Create Categories (3 levels)
  console.log('📁 Creating category tree...');
  const cat1 = await prisma.category.create({
    data: { name: 'VÍ DA', organizationId: org.id },
  });

  const cat2 = await prisma.category.create({
    data: { name: 'Ví thiết kế', parentId: cat1.id, organizationId: org.id },
  });

  const cat3 = await prisma.category.create({
    data: { name: 'Ví ngắn', parentId: cat2.id, organizationId: org.id },
  });
  console.log(`   ✅ ${cat1.name} > ${cat2.name} > ${cat3.name}\n`);

  // Create 10 Products with Variants
  console.log('📦 Creating products with variants...');
  for (let i = 1; i <= 10; i++) {
    const sku = `VDNT${i.toString().padStart(2, '0')}`;
    await prisma.product.create({
      data: {
        name: `Ví da nam cao cấp ${i}`,
        sku,
        description: 'Ví da thiên nhiên cao cấp, thiết kế tối giản',
        costPrice: 150000 + i * 10000,
        sellPrice: 350000 + i * 20000,
        stock: 50,
        minStock: 10,
        categoryId: cat3.id,
        organizationId: org.id,
        variants: {
          create: [
            {
              sku: `${sku}-D`,
              name: 'Đen',
              sellPrice: 350000 + i * 20000,
              stock: 20,
              organizationId: org.id,
            },
            {
              sku: `${sku}-N`,
              name: 'Nâu',
              sellPrice: 370000 + i * 20000,
              stock: 15,
              organizationId: org.id,
            },
            {
              sku: `${sku}-XL`,
              name: 'Xanh lá',
              sellPrice: 380000 + i * 20000,
              stock: 10,
              organizationId: org.id,
            },
          ],
        },
      },
    });
  }
  console.log('   ✅ 10 Products with 30 variants\n');

  // Create 5 Customers
  console.log('👥 Creating customers...');
  const customers = [
    { name: 'Nguyễn Văn A', phone: '0901000001', email: 'vana@example.com' },
    { name: 'Trần Thị B', phone: '0901000002', email: 'thib@example.com' },
    { name: 'Lê Văn C', phone: '0901000003', email: 'vanc@example.com' },
    { name: 'Phạm Thị D', phone: '0901000004', email: 'thid@example.com' },
    { name: 'Hoàng Văn E', phone: '0901000005', email: 'vane@example.com' },
  ];

  for (const c of customers) {
    await prisma.customer.create({
      data: {
        ...c,
        code: `KH${Math.random().toString().slice(2, 8)}`,
        organizationId: org.id,
      },
    });
  }
  console.log('   ✅ 5 Customers\n');

  // Create 2 Suppliers
  console.log('🏭 Creating suppliers...');
  await prisma.supplier.createMany({
    data: [
      {
        name: 'Nhà cung cấp Da Việt',
        code: 'DT000001',
        email: 'contact@daviet.vn',
        phone: '0909123456',
        address: 'KCN Tân Tạo, Bình Tân, TP.HCM',
        organizationId: org.id,
      },
      {
        name: 'Nhà cung cấp Phụ kiện Hồng Phát',
        code: 'DT000002',
        email: 'sales@hongphat.vn',
        phone: '0909654321',
        address: 'Quận 12, TP.HCM',
        organizationId: org.id,
      },
    ],
  });
  console.log('   ✅ 2 Suppliers\n');

  // Summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎉 Database seeding completed successfully!\n');
  console.log('📊 Summary:');
  console.log('  ✅ 1 Organization: Lano Leather (LANO001)');
  console.log('  ✅ 2 Branches: HN, HCM');
  console.log('  ✅ 1 Admin User: admin@lanoleather.vn');
  console.log('  ✅ 3 Categories: 3-level tree');
  console.log('  ✅ 10 Products with 30 variants');
  console.log('  ✅ 5 Customers');
  console.log('  ✅ 2 Suppliers\n');
  console.log('🔐 Admin Login:');
  console.log('  📧 Email: admin@lanoleather.vn');
  console.log('  🔑 Password: Admin@123\n');
  console.log('═══════════════════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
SEEDEOF

echo -e "${GREEN}✅ Seed script created${NC}"
echo ""

# Update package.json
echo "   Updating package.json..."
node -e "
const fs = require('fs');
const path = 'package.json';
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
pkg.prisma = { seed: 'ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts' };
fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
"

echo -e "${GREEN}✅ package.json updated${NC}"
echo ""

#############################################################################
# STEP 6: Generate Prisma Client
#############################################################################
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 STEP 6: Generating Prisma Client..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

pnpm prisma generate

echo -e "${GREEN}✅ Prisma Client generated${NC}"
echo ""

#############################################################################
# STEP 7: Run Migration
#############################################################################
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 STEP 7: Running Database Migration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

pnpm prisma migrate dev --name init

echo -e "${GREEN}✅ Migration completed${NC}"
echo ""

#############################################################################
# STEP 8: Run Seed
#############################################################################
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌱 STEP 8: Seeding Database..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

pnpm prisma db seed

echo ""

#############################################################################
# STEP 9: Verification
#############################################################################
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 STEP 9: Verifying Database..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📊 Table Counts:"
docker exec -i $CONTAINER psql -U meocrm_user -d meocrm_dev << 'SQL'
SELECT 'organizations' as table_name, COUNT(*) FROM organizations
UNION ALL SELECT 'branches', COUNT(*) FROM branches
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'categories', COUNT(*) FROM categories
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'product_variants', COUNT(*) FROM product_variants
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'suppliers', COUNT(*) FROM suppliers;
SQL

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ ALL DONE! Database ready!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 Next Steps:"
echo "   1. cd ~/projects/meocrm"
echo "   2. git add apps/api/"
echo "   3. git commit -m 'feat(db): complete database setup'"
echo "   4. git push origin HEAD:dev"
echo ""
echo "🚀 Start developing!"
echo ""
