import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

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

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private static instance: PrismaService | null = null;

  private constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  static getInstance(): PrismaService {
    if (!PrismaService.instance) {
      const baseClient = new PrismaService();
      PrismaService.instance = PrismaService.extendWithSoftDelete(baseClient);
    }

    return PrismaService.instance;
  }

  private static extendWithSoftDelete(baseClient: PrismaService): PrismaService {
    const extendedClient = baseClient.$extends(softDeleteExtension) as PrismaService;
    extendedClient.onModuleInit = PrismaService.prototype.onModuleInit;
    extendedClient.onModuleDestroy = PrismaService.prototype.onModuleDestroy;
    extendedClient.cleanDatabase = PrismaService.prototype.cleanDatabase;
    return extendedClient;
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

}
