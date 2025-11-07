import { Injectable, OnModuleInit, OnModuleDestroy, Scope, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { REQUEST } from '@nestjs/core';
import { RequestWithTenant } from '../common/middleware/tenant.middleware';

// Models that require tenant isolation
const TENANT_MODELS = [
  'Branch',
  'User',
  'Category',
  'Product',
  'ProductVariant',
  'Customer',
  'Supplier',
  'Order',
  'ShippingOrder',
];

@Injectable({ scope: Scope.REQUEST })
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(REQUEST) private readonly request: RequestWithTenant) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    console.log('🗄️  Prisma connected to database');

    // Middleware to auto-inject tenant filter
    this.$use(async (params, next) => {
      const tenantId = this.request.tenantId;

      // Only apply to tenant-scoped models
      if (TENANT_MODELS.includes(params.model || '')) {
        // For find operations, add organizationId filter
        if (params.action === 'findUnique' || params.action === 'findFirst') {
          params.args.where = params.args.where || {};
          if (tenantId) {
            params.args.where.organizationId = tenantId;
          }
        }

        if (params.action === 'findMany') {
          params.args.where = params.args.where || {};
          if (tenantId) {
            params.args.where.organizationId = tenantId;
          }
        }

        // For create/update, inject organizationId
        if (params.action === 'create') {
          params.args.data = params.args.data || {};
          if (tenantId && !params.args.data.organizationId) {
            params.args.data.organizationId = tenantId;
          }
        }

        if (params.action === 'update' || params.action === 'updateMany') {
          params.args.where = params.args.where || {};
          if (tenantId) {
            params.args.where.organizationId = tenantId;
          }
        }

        // For delete operations
        if (params.action === 'delete' || params.action === 'deleteMany') {
          params.args.where = params.args.where || {};
          if (tenantId) {
            params.args.where.organizationId = tenantId;
          }
        }
      }

      return next(params);
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('🗄️  Prisma disconnected from database');
  }
}
