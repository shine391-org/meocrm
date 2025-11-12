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

  describe('Protected Routes', () => {
    it('rejects unauthenticated /auth/me calls', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('rejects unauthenticated /products calls', async () => {
      await request(app.getHttpServer()).get('/products').expect(401);
    });

    it('rejects unauthenticated /orders calls', async () => {
      await request(app.getHttpServer()).get('/orders').expect(401);
    });

    it('returns current user with organizationId when authenticated', async () => {
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
        organizationId: expect.any(String),
      });
      expect(body.organizationId).toEqual(body.organization.id);
    });
  });

  describe('Public Routes', () => {
    it('allows unauthenticated /health calls', async () => {
      await request(app.getHttpServer()).get('/health').expect(200);
    });

    it('allows unauthenticated /auth/login calls', async () => {
      // We only check for bad request (400) to confirm the route is public,
      // not the full login logic. A 401 would indicate the guard is active.
      await request(app.getHttpServer()).post('/auth/login').send({}).expect(400);
    });
  });
});
