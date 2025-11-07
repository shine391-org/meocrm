import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { AuthService } from './auth/auth.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

/**
 * Sets up and returns a fully initialized NestJS application instance for E2E testing.
 * This includes creating a mock organization and user, and generating a valid JWT access token.
 */
export async function setupTestApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
  accessToken: string;
  organizationId: string;
  userId: string;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const prisma = app.get<PrismaService>(PrismaService);
  const authService = app.get<AuthService>(AuthService);

  // Clean up previous test data
  await prisma.supplier.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.organization.deleteMany({});

  // 1. Create a mock Organization
  const organization = await prisma.organization.create({
    data: {
      name: 'Test Organization E2E',
      code: `E2E_${Date.now()}`
    },
  });
  const organizationId = organization.id;

  // 2. Create a mock User associated with the Organization
  const hashedPassword = await bcrypt.hash('password', 10);
  const user = await prisma.user.create({
    data: {
      email: `test-user-${Date.now()}@e2e.com`,
      name: 'E2E Test User',
      password: hashedPassword,
      organizationId: organizationId,
      role: UserRole.OWNER,
    },
  });
  const userId = user.id;

  // 3. Generate a JWT token for the user
  const { accessToken } = await authService.login({
    email: user.email,
    password: 'password', // Use the raw password for login
  } as any);

  return { app, prisma, accessToken, organizationId, userId };
}
