import { PrismaService } from './prisma.service';

const resetPrismaSingleton = async () => {
  const cached = Reflect.get(PrismaService as any, 'instance') as PrismaService | null;
  if (cached) {
    await cached.$disconnect();
  }
  Reflect.set(PrismaService as any, 'instance', null);
};

describe('PrismaService singleton', () => {
  beforeEach(async () => {
    await resetPrismaSingleton();
  });

  afterAll(async () => {
    await resetPrismaSingleton();
  });

  it('returns the same extended client on consecutive calls', () => {
    const first = PrismaService.getInstance();
    const second = PrismaService.getInstance();
    expect(first).toBe(second);
    expect(typeof (first as any).cleanDatabase).toBe('function');
  });

  it('only applies the soft delete extension once', () => {
    const extendSpy = jest.spyOn(PrismaService as any, 'extendWithSoftDelete');

    PrismaService.getInstance();
    PrismaService.getInstance();

    expect(extendSpy).toHaveBeenCalledTimes(1);
    extendSpy.mockRestore();
  });
});
