import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtStrategy', () => {
  const config = {
    get: jest.fn(),
  };
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(() => {
    config.get.mockReset();
    prisma.user.findUnique.mockReset();
  });

  it('throws if JWT secret is missing', () => {
    config.get.mockReturnValue(undefined);
    expect(() => new JwtStrategy(config as unknown as ConfigService, prisma as unknown as PrismaService)).toThrow(
      'JWT_SECRET is not configured',
    );
  });

  it('returns sanitized user payload during validation', async () => {
    config.get.mockReturnValue('secret');
    const strategy = new JwtStrategy(config as unknown as ConfigService, prisma as unknown as PrismaService);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user_1',
      email: 'user@example.com',
      organizationId: 'org_1',
      organization: { id: 'org_1', name: 'Org' },
      role: 'OWNER',
    });

    const result = await strategy.validate({ sub: 'user_1', email: 'user@example.com', organizationId: 'org_1' });

    expect(result).toEqual(
      expect.objectContaining({
        id: 'user_1',
        organizationId: 'org_1',
        role: 'OWNER',
      }),
    );
  });

  it('throws UnauthorizedException when user not found', async () => {
    config.get.mockReturnValue('secret');
    const strategy = new JwtStrategy(config as unknown as ConfigService, prisma as unknown as PrismaService);
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 'missing', email: 'missing@example.com', organizationId: 'org' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
