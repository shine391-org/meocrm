
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupTestApp } from '../src/test-utils';

describe('GlobalErrorFilter (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const { app: nestApp, accessToken } = await setupTestApp();
    app = nestApp;
    authToken = accessToken;
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return a standardized error shape for 404 Not Found', async () => {
    const response = await request(app.getHttpServer())
      .get('/non-existent-route')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);

    expect(response.body).toHaveProperty('code', 'NOT_FOUND');
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('traceId');
    expect(response.body.message).toContain('Cannot GET /non-existent-route');
  });

  it('should return a standardized error shape for 400 Validation Error', async () => {
    const response = await request(app.getHttpServer())
      .post('/orders') // Assuming POST /orders exists and has validation
      .set('Authorization', `Bearer ${authToken}`)
      .send({ invalid_field: 'some-value' }) // Send invalid payload
      .expect(400);

    expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR');
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('details');
    expect(response.body).toHaveProperty('traceId');
    expect(response.body.details).toHaveProperty('customerId');
  });
});
