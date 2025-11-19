import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { RequestContextService } from '../common/context/request-context.service';

const SOFT_DELETE_MODELS = [
  'product',
  'productVariant',
  'customer',
  'order',
  'supplier',
] as const;

type SoftDeleteQueryableModel = (typeof SOFT_DELETE_MODELS)[number];

const SOFT_DELETE_ACTIONS = [
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
] as const;

type SoftDeleteAction = (typeof SOFT_DELETE_ACTIONS)[number];

const createSoftDeleteHandlers = () => {
  const handlers: Record<SoftDeleteAction, ({ args, query }: any) => Promise<any>> = {} as any;

  SOFT_DELETE_ACTIONS.forEach((action) => {
    handlers[action] = ({ args, query }) => {
      const normalizedArgs: Record<string, any> = args ?? {};
      const includeDeleted = normalizedArgs.withDeleted;

      if (!includeDeleted) {
        normalizedArgs.where = normalizedArgs.where ?? {};
        if (normalizedArgs.where.deletedAt === undefined) {
          normalizedArgs.where.deletedAt = null;
        }
      }

      if (normalizedArgs.withDeleted !== undefined) {
        delete normalizedArgs.withDeleted;
      }

      return query(normalizedArgs);
    };
  });

  return handlers;
};

const softDeleteExtension = Prisma.defineExtension({
  name: 'softDelete',
  query: SOFT_DELETE_MODELS.reduce<Record<SoftDeleteQueryableModel, Record<SoftDeleteAction, any>>>(
    (acc, model) => {
      acc[model] = createSoftDeleteHandlers();
      return acc;
    },
    {} as any,
  ),
});

const ORGANIZATION_SCOPED_MODELS: Set<Prisma.ModelName> = new Set(
  Prisma.dmmf.datamodel.models
    .filter((model) => model.fields.some((field) => field.name === 'organizationId'))
    .map((model) => model.name as Prisma.ModelName),
);

const organizationScopeExtension = (
  contextProvider: () => RequestContextService | undefined,
) =>
  Prisma.defineExtension({
    name: 'organizationScope',
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          if (!model || !ORGANIZATION_SCOPED_MODELS.has(model as Prisma.ModelName)) {
            return query(args);
          }

          const ctx = contextProvider();
          if (!ctx || ctx.shouldBypassModel(model as Prisma.ModelName)) {
            return query(args);
          }

          const organizationId = ctx.organizationId;
          if (!organizationId) {
            return query(args);
          }

          if (ORGANIZATION_FILTER_OPERATIONS.has(operation)) {
            const nextArgs = PrismaService.appendOrganizationFilter(args ?? {}, organizationId);
            return query(nextArgs);
          }

          if (ORGANIZATION_CREATE_OPERATIONS.has(operation)) {
            const nextArgs = args ? { ...args } : {};
            PrismaService.ensureOrganizationOnCreate(
              nextArgs,
              organizationId,
              operation === 'createMany',
            );
            return query(nextArgs);
          }

          return query(args);
        },
      },
    },
  });

const ORGANIZATION_FILTER_OPERATIONS = new Set<string>([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'deleteMany',
]);

const ORGANIZATION_CREATE_OPERATIONS = new Set<string>(['create', 'createMany', 'upsert']);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private static instance: PrismaService | null = null;
  private static requestContext: RequestContextService | undefined;

  private constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  static getInstance(requestContext?: RequestContextService): PrismaService {
    if (requestContext) {
      PrismaService.requestContext = requestContext;
    }

    if (!PrismaService.instance) {
      const baseClient = new PrismaService();
      PrismaService.instance = PrismaService.extendClient(baseClient);
    }

    return PrismaService.instance;
  }

  private static extendClient(baseClient: PrismaService): PrismaService {
    const scopedClient = (baseClient.$extends(softDeleteExtension) as PrismaService).$extends(
      organizationScopeExtension(() => PrismaService.requestContext),
    ) as PrismaService;
    scopedClient.onModuleInit = PrismaService.prototype.onModuleInit;
    scopedClient.onModuleDestroy = PrismaService.prototype.onModuleDestroy;
    scopedClient.cleanDatabase = PrismaService.prototype.cleanDatabase;
    return scopedClient;
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

  static appendOrganizationFilter(args: Record<string, any>, organizationId: string) {
    const workingArgs = args ?? {};
    const where = workingArgs.where;

    if (!where) {
      return { ...workingArgs, where: { organizationId } };
    }

    return {
      ...workingArgs,
      where: {
        AND: [where, { organizationId }],
      },
    };
  }

  static ensureOrganizationOnCreate(args: Record<string, any>, organizationId: string, isMany = false) {
    if (!args) {
      return;
    }

    if (isMany && Array.isArray(args.data)) {
      args.data = args.data.map((entry: Record<string, any>) =>
        PrismaService.assignOrganizationId(entry, organizationId),
      );
      return;
    }

    args.data = PrismaService.assignOrganizationId(args.data ?? {}, organizationId);
  }

  private static assignOrganizationId<T extends Record<string, any>>(data: T, organizationId: string): T {
    if (data.organizationId && data.organizationId !== organizationId) {
      throw new Error('Cross-organization mutation detected');
    }

    return { ...data, organizationId } as T;
  }
}
