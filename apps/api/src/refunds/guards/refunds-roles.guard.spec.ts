import { Test, TestingModule } from '@nestjs/testing';
import { RefundsRolesGuard } from './refunds-roles.guard';
import { SettingsService } from '../../modules/settings/settings.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

describe('RefundsRolesGuard', () => {
  let guard: RefundsRolesGuard;
  let settingsService: DeepMockProxy<SettingsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundsRolesGuard,
        {
          provide: SettingsService,
          useValue: mockDeep<SettingsService>(),
        },
      ],
    }).compile();

    guard = module.get<RefundsRolesGuard>(RefundsRolesGuard);
    settingsService = module.get(SettingsService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access if user has required role', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: UserRole.OWNER },
        }),
      }),
    } as ExecutionContext;

    settingsService.get.mockResolvedValue(['OWNER']);

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should deny access if user does not have required role', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: UserRole.STAFF },
        }),
      }),
    } as ExecutionContext;

    settingsService.get.mockResolvedValue(['OWNER']);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should deny access if user has no role', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: {},
        }),
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should use default OWNER role when settings returns null', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: UserRole.OWNER },
        }),
      }),
    } as ExecutionContext;

    settingsService.get.mockImplementation((_key, defaultValue) => Promise.resolve(defaultValue));

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
