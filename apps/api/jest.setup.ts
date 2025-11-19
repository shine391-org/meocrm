/* istanbul ignore file */
import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

// Setup test database
if (!global.prisma) {
  global.prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL,
      },
    },
  });
}

// Clean up after each test
afterEach(async () => {
  if (global.prisma) {
    await global.prisma.$disconnect();
  }
});
