import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

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
  query: {
    product: createSoftDeleteHandlers(),
    productVariant: createSoftDeleteHandlers(),
    customer: createSoftDeleteHandlers(),
    order: createSoftDeleteHandlers(),
    supplier: createSoftDeleteHandlers(),
  },
});

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

    this.applySoftDeleteExtension();
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

  private applySoftDeleteExtension() {
    const extendedClient = this.$extends(softDeleteExtension);
    Object.assign(this, extendedClient as PrismaClient);
  }
}
