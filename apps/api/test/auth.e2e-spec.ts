import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { setupTestApp, cleanupTestOrganizations } from '../src/test-utils';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;

  beforeAll(async () => {
    ({ app, prisma, accessToken } = await setupTestApp());
    await app.init();
  });

  afterAll(async () => {
    await cleanupTestOrganizations(prisma);
    await app.close();
  });

  it('rejects unauthenticated /auth/me calls', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('returns current user when authenticated', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(body).toMatchObject({
      id: expect.any(String),
      email: expect.any(String),
      name: expect.any(String),
      role: expect.any(String),
      organization: expect.any(Object),
    });
  });
});
