import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import crypto from 'crypto';
import { setupTestApp, cleanupTestOrganizations } from '../src/test-utils';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Webhooks E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const webhookSecret = 'test-secret'; // Should match env for test

  beforeAll(async () => {
    // Mock the secret for testing
    process.env.WEBHOOK_SECRET = webhookSecret;
    ({ app, prisma } = await setupTestApp());
    await app.init();
  });

  afterAll(async () => {
    await cleanupTestOrganizations(prisma);
    await app.close();
    delete process.env.WEBHOOK_SECRET;
  });

  describe('/webhooks/handler (POST)', () => {
    const payload = {
      event: 'test.event',
      organizationId: 'org_123',
      data: { message: 'hello' },
    };
    const payloadString = JSON.stringify(payload);

    it('rejects requests without a signature', async () => {
      await request(app.getHttpServer())
        .post('/webhooks/handler')
        .send(payload)
        .expect(401);
    });

    it('rejects requests with an invalid signature', async () => {
      await request(app.getHttpServer())
        .post('/webhooks/handler')
        .set('X-MeoCRM-Signature', 'invalid-signature')
        .send(payload)
        .expect(401);
    });

    it('accepts requests with a valid signature', async () => {
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payloadString)
        .digest('hex');

      await request(app.getHttpServer())
        .post('/webhooks/handler')
        .set('X-MeoCRM-Signature', signature)
        .set('Content-Type', 'application/json')
        .send(payloadString) // Send as raw string for signature to match
        .expect(204);
    });
  });
});
