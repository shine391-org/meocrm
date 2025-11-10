// TODO: E2E tests require full app context with auth
// Will be added in Phase 6 with proper test database setup
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupTestApp } from '../src/test-utils';
import { CreateSupplierDto } from '../src/suppliers/dto/create-supplier.dto';

describe('Suppliers E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let organizationId: string;

  const generateUniqueCode = () => `SUP${Date.now()}${Math.random().toString(36).substring(2, 5)}`;

  beforeAll(async () => {
    ({ app, prisma, accessToken, organizationId } = await setupTestApp());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.supplier.deleteMany({ where: { organizationId } });
  });

  describe('POST /suppliers', () => {
    it('should create a new supplier and return it', async () => {
      const dto: CreateSupplierDto = {
        name: 'E2E Test Supplier',
        phone: '0987654321',
        email: 'e2e@test.com',
        taxCode: '0987654321',
      };

      const { body } = await request(app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(dto)
        .expect(201);

      expect(body).toBeDefined();
      expect(body.name).toBe(dto.name);
      expect(body.code).toMatch(/^DT\d{6}$/); // This is correct as service generates 'DT' code
      expect(body.organizationId).toBe(organizationId);
    });

    it('should return 400 for validation error (missing name)', async () => {
        const dto = { phone: '123' };
        await request(app.getHttpServer())
            .post('/suppliers')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(dto)
            .expect(400);
    });
  });

  describe('GET /suppliers', () => {
      it('should return a paginated list of suppliers', async () => {
        // Create a test supplier first
        await prisma.supplier.create({
            data: {
                name: 'Test Supplier for GET',
                phone: '1122334455',
                code: generateUniqueCode(),
                organizationId
            }
        });

        const { body } = await request(app.getHttpServer())
            .get('/suppliers')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);

        expect(body.data).toBeInstanceOf(Array);
        expect(body.data.length).toBeGreaterThan(0);
        expect(body.pagination).toBeDefined();
      });
  });

  describe('GET /suppliers/:id', () => {
    it('should return a single supplier', async () => {
      const supplier = await prisma.supplier.create({
        data: { name: 'Test Supplier', phone: '111', code: generateUniqueCode(), organizationId }
      });

      const { body } = await request(app.getHttpServer())
        .get(`/suppliers/${supplier.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(body.id).toBe(supplier.id);
      expect(body.name).toBe(supplier.name);
    });

    it('should return 404 for a non-existent supplier', async () => {
      await request(app.getHttpServer())
        .get('/suppliers/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /suppliers/:id', () => {
    it('should update a supplier', async () => {
      const supplier = await prisma.supplier.create({
        data: { name: 'Original Name', phone: '222', code: generateUniqueCode(), organizationId }
      });
      const newName = 'Updated Name';

      const { body } = await request(app.getHttpServer())
        .patch(`/suppliers/${supplier.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: newName })
        .expect(200);

      expect(body.name).toBe(newName);
    });
  });

  describe('DELETE /suppliers/:id', () => {
    it('should soft delete a supplier', async () => {
      const supplier = await prisma.supplier.create({
        data: { name: 'To Be Deleted', phone: '333', code: generateUniqueCode(), organizationId }
      });

      await request(app.getHttpServer())
        .delete(`/suppliers/${supplier.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      const deletedSupplier = await prisma.supplier.findUnique({ where: { id: supplier.id } });
      expect(deletedSupplier).not.toBeNull();
      expect(deletedSupplier!.deletedAt).not.toBeNull();
    });
  });
});
