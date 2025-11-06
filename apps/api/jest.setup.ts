import { PrismaClient } from '@prisma/client';

// Setup test database
global.prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL,
    },
  },
});

// Clean up after each test
afterEach(async () => {
  await global.prisma.$disconnect();
});
