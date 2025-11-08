import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  genSalt: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  const prismaMock = {
    refreshToken: {
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
  };
  const jwtServiceMock = {
    sign: jest.fn(),
    verify: jest.fn(),
  };
  const configServiceMock = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_REFRESH_SECRET') {
        return 'refresh-secret';
      }
      if (key === 'JWT_SECRET') {
        return 'access-secret';
      }
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  it('rotates refresh tokens and returns a new pair', async () => {
    const refreshToken = 'old-refresh';
    const storedToken = {
      id: 'token-id',
      token: refreshToken,
      expiresAt: new Date(Date.now() + 1000),
      user: {
        id: 'user-1',
        email: 'user@example.com',
        organizationId: 'org-1',
      },
    };

    jwtServiceMock.verify.mockReturnValue({ sub: 'user-1' });
    prismaMock.refreshToken.findUnique.mockResolvedValue(storedToken);
    jwtServiceMock.sign.mockReturnValueOnce('new-access').mockReturnValueOnce('new-refresh');
    prismaMock.refreshToken.create.mockResolvedValue({ id: 'new-token' });

    const result = await service.refreshAccessToken(refreshToken);

    expect(jwtServiceMock.verify).toHaveBeenCalledWith(refreshToken, {
      secret: 'refresh-secret',
    });
    expect(prismaMock.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'token-id' } });
    expect(prismaMock.refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        token: 'new-refresh',
      }),
    });
    expect(result).toEqual({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
  });

  it('throws UnauthorizedException when stored token is missing', async () => {
    jwtServiceMock.verify.mockReturnValue({ sub: 'user-1' });
    prismaMock.refreshToken.findUnique.mockResolvedValue(null);

    await expect(service.refreshAccessToken('missing')).rejects.toThrow(UnauthorizedException);
  });

  it('logs a user in with valid credentials', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      password: 'hashed',
      name: 'Jane',
      role: 'STAFF',
      organization: { id: 'org-1', name: 'Org' },
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwtServiceMock.sign.mockReturnValueOnce('access').mockReturnValueOnce('refresh');
    prismaMock.refreshToken.create.mockResolvedValue({ id: 'token' });

    const result = await service.login({ email: 'user@example.com', password: 'secret' });

    expect(result.accessToken).toBe('access');
    expect(prismaMock.refreshToken.create).toHaveBeenCalled();
  });

  it('throws when password mismatch on login', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      password: 'hashed',
      organization: { id: 'org-1' },
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(service.login({ email: 'user@example.com', password: 'bad' })).rejects.toThrow(UnauthorizedException);
  });

  it('registers a new user', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.organization.findUnique.mockResolvedValue({ id: 'org-1', code: 'ORG' });
    (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    prismaMock.user.create.mockResolvedValue({
      id: 'user-2',
      email: 'new@example.com',
      name: 'New User',
      role: 'STAFF',
      organizationId: 'org-1',
      organization: { id: 'org-1', name: 'Org' },
    });
    jwtServiceMock.sign.mockReturnValueOnce('access').mockReturnValueOnce('refresh');
    prismaMock.refreshToken.create.mockResolvedValue({ id: 'token' });

    const result = await service.register({
      email: 'new@example.com',
      password: 'Password@123',
      name: 'New User',
      organizationCode: 'ORG',
    });

    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ password: 'hashed' }),
      }),
    );
    expect(result.accessToken).toBe('access');
  });

  it('throws when registering with duplicate email', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'existing' });
    await expect(
      service.register({
        email: 'exists@example.com',
        password: 'Password@123',
        name: 'Dup',
        organizationCode: 'ORG',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('logs out and removes refresh token', async () => {
    prismaMock.refreshToken.deleteMany.mockResolvedValue({ count: 1 });
    await service.logout('user-1', 'token');
    expect(prismaMock.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', token: 'token' },
    });
  });

  it('returns current user info', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'Jane',
      role: 'OWNER',
      organization: {},
    });
    const result = await service.getCurrentUser('user-1');
    expect(result.email).toBe('user@example.com');
  });

  it('throws when current user missing', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(service.getCurrentUser('missing')).rejects.toThrow(UnauthorizedException);
  });
});
