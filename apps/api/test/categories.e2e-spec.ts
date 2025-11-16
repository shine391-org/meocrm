import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupTestApp } from '../src/test-utils';

describe('Categories E2E', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const { app: testApp, accessToken: token } = await setupTestApp();
    app = testApp;
    authToken = token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
  });

  describe('Authentication', () => {
    it('should register and login a new user', async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          password: 'Password123',
          name: 'Test User',
          organizationCode: 'meocrm'
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: uniqueEmail,
          password: 'Password123',
        })
        .expect(200);

      const newToken = res.body.accessToken;
      expect(newToken).toBeDefined();
    });
  });

  describe('Categories CRUD', () => {
    let level1Id: string;
    let level2Id: string;
    let level3Id: string;

    it('should create a 3-level hierarchy', async () => {
      // Level 1
      const res1 = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'VÍ DA' })
        .expect(201);
      level1Id = res1.body.id;
      expect(res1.body.name).toBe('VÍ DA');

      // Level 2
      const res2 = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Ví thiết kế', parentId: level1Id })
        .expect(201);
      level2Id = res2.body.id;
      expect(res2.body.parentId).toBe(level1Id);

      // Level 3
      const res3 = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Ví ngắn', parentId: level2Id })
        .expect(201);
      level3Id = res3.body.id;
      expect(res3.body.parentId).toBe(level2Id);
    });

    it('should reject creating a 4th level category', async () => {
      await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Ví mini', parentId: level3Id })
        .expect(400);
    });

    it('should prevent circular references', async () => {
      await request(app.getHttpServer())
        .patch(`/categories/${level1Id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ parentId: level3Id })
        .expect(400);
    });

    it('should return a nested tree', async () => {
      const res = await request(app.getHttpServer())
        .get('/categories/tree')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body[0].id).toBe(level1Id);
      expect(res.body[0].children[0].id).toBe(level2Id);
      expect(res.body[0].children[0].children[0].id).toBe(level3Id);
      expect(res.body[0]._count.products).toBeDefined();
    });
  });
});
