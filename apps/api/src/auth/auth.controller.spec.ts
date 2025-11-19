import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Response } from 'express';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshAccessToken: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(undefined) },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user and set refresh token cookie', async () => {
      const registerDto: RegisterDto = { name: 'Test', email: 'test@test.com', password: 'password', organizationCode: 'test' };
      const tokens = { accessToken: 'access', refreshToken: 'refresh', refreshTokenMaxAgeMs: 604800000 };
      mockAuthService.register.mockResolvedValue(tokens);

      const res = { cookie: jest.fn() } as unknown as Response;

      const result = await controller.register(registerDto, res);

      expect(service.register).toHaveBeenCalledWith(registerDto);
      expect(res.cookie).toHaveBeenCalledWith(
        'meocrm_refresh_token',
        'refresh',
        expect.objectContaining({ maxAge: tokens.refreshTokenMaxAgeMs }),
      );
      expect(result).toEqual(tokens);
    });
  });

  describe('login', () => {
    it('should login a user and set refresh token cookie', async () => {
      const loginDto: LoginDto = { email: 'test@test.com', password: 'password' };
      const tokens = { accessToken: 'access', refreshToken: 'refresh', refreshTokenMaxAgeMs: 604800000 };
      mockAuthService.login.mockResolvedValue(tokens);

      const res = { cookie: jest.fn() } as unknown as Response;

      const result = await controller.login(loginDto, res);

      expect(service.login).toHaveBeenCalledWith(loginDto);
      expect(res.cookie).toHaveBeenCalledWith(
        'meocrm_refresh_token',
        'refresh',
        expect.objectContaining({ maxAge: tokens.refreshTokenMaxAgeMs }),
      );
      expect(result).toEqual(tokens);
    });
  });

  describe('refresh', () => {
    it('should refresh the access token', async () => {
      const tokens = { accessToken: 'new-access', refreshToken: 'new-refresh', refreshTokenMaxAgeMs: 604800000 };
      mockAuthService.refreshAccessToken.mockResolvedValue(tokens);

      const req = { signedCookies: { meocrm_refresh_token: 'refresh' } } as any;
      const res = { cookie: jest.fn() } as unknown as Response;

      const result = await controller.refresh(req, res);

      expect(service.refreshAccessToken).toHaveBeenCalledWith('refresh');
      expect(res.cookie).toHaveBeenCalledWith(
        'meocrm_refresh_token',
        'new-refresh',
        expect.objectContaining({ maxAge: tokens.refreshTokenMaxAgeMs }),
      );
      expect(result).toEqual(tokens);
    });

    it('should throw UnauthorizedException if refresh token is missing', async () => {
      const req = { signedCookies: {} } as any;
      const res = { cookie: jest.fn() } as unknown as Response;

      await expect(controller.refresh(req, res)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should logout a user and clear the refresh token cookie', async () => {
      mockAuthService.logout.mockResolvedValue({ message: 'Logged out' });

      const req = { signedCookies: { meocrm_refresh_token: 'refresh' } } as any;
      const res = { cookie: jest.fn() } as unknown as Response;
      const user = { id: '1' };

      const result = await controller.logout(user, req, undefined, res);

      expect(service.logout).toHaveBeenCalledWith('1', 'refresh');
      expect(res.cookie).toHaveBeenCalledWith('meocrm_refresh_token', '', expect.any(Object));
      expect(result).toEqual({ message: 'Logged out' });
    });
  });

  describe('getCurrentUser', () => {
    it('should return the current user', async () => {
      const user = { id: '1', name: 'Test' };
      mockAuthService.getCurrentUser.mockResolvedValue(user);

      const result = await controller.getCurrentUser({ id: '1' });

      expect(service.getCurrentUser).toHaveBeenCalledWith('1');
      expect(result).toEqual(user);
    });
  });
});
