import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { RequestContextService } from '../common/context/request-context.service';

const MULTI_TENANT_MODELS = new Map<string, string>([
  ['Branch', 'organizationId'],
  ['Category', 'organizationId'],
  ['Customer', 'organizationId'],
  ['CustomerGroup', 'organizationId'],
  ['Order', 'organizationId'],
  ['Product', 'organizationId'],
  ['ProductVariant', 'organizationId'],
  ['ShippingOrder', 'organizationId'],
  ['Supplier', 'organizationId'],
  ['User', 'organizationId'],
]);

const SOFT_DELETE_FIELDS = new Map<string, string>([
  ['Customer', 'deletedAt'],
  ['CustomerGroup', 'deletedAt'],
  ['Product', 'deletedAt'],
  ['Supplier', 'deletedAt'],
]);

const ACTIONS_ENFORCING_TENANT = new Set([
  'findMany',
  'findFirst',
  'findUnique',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'count',
  'aggregate',
  'upsert',
]);

const ACTIONS_ENFORCING_SOFT_DELETE = new Set(['findMany', 'findFirst', 'count', 'aggregate']);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

    // Prisma 6: Use client extensions (no auto-filter for now)
    // Individual services will handle soft delete filtering
    return this.$extends({}) as PrismaService;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Helper method for testing - clear database
  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('cleanDatabase can only be called in test environment');
    }

    const modelKeys = Object.keys(this).filter((key) => {
      const keyStr = String(key);
      return keyStr[0] !== '_' && keyStr[0] !== '$' && typeof this[key as keyof this] === 'object';
    });

    return Promise.all(
      modelKeys.map((modelKey) => {
        const model = this[modelKey as keyof this];
        if (model && typeof model === 'object' && 'deleteMany' in model) {
          return (model as any).deleteMany();
        }
      }),
    );
  }

  private combineWhere(where: Record<string, any> | undefined, constraint: Record<string, any>) {
    if (!where || Object.keys(where).length === 0) {
      return constraint;
    }

    if (where.AND) {
      const existing = Array.isArray(where.AND) ? where.AND : [where.AND];
      return {
        ...where,
        AND: [...existing, constraint],
      };
    }

    return {
      AND: [where, constraint],
    };
  }

  private applyOrganizationToData(data: any, field: string, organizationId: string): any {
    if (!data) {
      return { [field]: organizationId };
    }

    if (Array.isArray(data)) {
      return data.map((entry) => this.applyOrganizationToData(entry, field, organizationId));
    }

    if (data[field] && data[field] !== organizationId) {
      throw new Error('Cross-tenant mutation detected');
    }

    if (data.organization?.connect?.id && data.organization.connect.id !== organizationId) {
      throw new Error('Cross-tenant mutation detected');
    }

    if (data[field] || data.organization) {
      return data;
    }

    return { ...data, [field]: organizationId };
  }
}
