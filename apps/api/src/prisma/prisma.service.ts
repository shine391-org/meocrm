import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  constructor(
    private readonly configService: ConfigService,
    private readonly requestContext: RequestContextService,
  ) {
    const databaseUrl = configService.get<string>('DATABASE_URL');

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined. Please check your environment configuration.');
    }

    super({
      datasources: {
        db: { url: databaseUrl },
      },
    });

    this.$use(async (params, next) => {
      const organizationId = this.requestContext.organizationId;
      const modelName = params.model;

      if (!organizationId || !modelName) {
        return next(params);
      }

      const tenantField = MULTI_TENANT_MODELS.get(modelName);
      const softDeleteField = SOFT_DELETE_FIELDS.get(modelName);

      if (!params.args) {
        params.args = {};
      }

      if (tenantField && ACTIONS_ENFORCING_TENANT.has(params.action)) {
        params.args.where = this.combineWhere(params.args.where, { [tenantField]: organizationId });

        if (params.action === 'create' || params.action === 'createMany') {
          params.args.data = this.applyOrganizationToData(params.args.data, tenantField, organizationId);
        }

        if (params.action === 'upsert') {
          params.args.create = this.applyOrganizationToData(params.args.create, tenantField, organizationId);
          params.args.update = this.applyOrganizationToData(params.args.update, tenantField, organizationId);
        }
      }

      if (softDeleteField && ACTIONS_ENFORCING_SOFT_DELETE.has(params.action)) {
        params.args.where = this.combineWhere(params.args.where, { [softDeleteField]: null });
      }

      return next(params);
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('🗄️  Prisma connected to database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('🗄️  Prisma disconnected from database');
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
