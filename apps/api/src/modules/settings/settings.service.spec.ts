import { UnauthorizedException } from '@nestjs/common';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  const buildService = (options: { organizationId?: string; settingValue?: any } = {}) => {
    const findUnique = jest.fn().mockResolvedValue(options.settingValue ?? null);
    const prisma = {
      setting: {
        findUnique,
      },
    };
    const requestContext = {
      organizationId: options.organizationId,
    };

    return {
      service: new SettingsService(prisma as any, requestContext as any),
      findUnique,
    };
  };

  it('returns stored setting values for current organization', async () => {
    const { service, findUnique } = buildService({
      organizationId: 'org_1',
      settingValue: { value: 42 },
    });

    const result = await service.get<number>('refund.windowDays');

    expect(findUnique).toHaveBeenCalledWith({
      where: {
        organizationId_key: {
          organizationId: 'org_1',
          key: 'refund.windowDays',
        },
      },
    });
    expect(result).toBe(42);
  });

  it('falls back to provided default when setting not found', async () => {
    const { service } = buildService({ organizationId: 'org_1' });

    const result = await service.get('notifications.disabled', false);

    expect(result).toBe(false);
  });

  it('throws when organization context is missing', async () => {
    const { service } = buildService();

    await expect(service.get('refund.windowDays')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('falls back to default when validator fails', async () => {
    const { service } = buildService({
      organizationId: 'org_1',
      settingValue: { value: 'unexpected' },
    });

    const validator = (value: unknown): value is number => typeof value === 'number';
    const result = await service.get<number>('refund.windowDays', 3, validator);

    expect(result).toBe(3);
  });

  it('throws descriptive error when validator fails and no default provided', async () => {
    const { service } = buildService({
      organizationId: 'org_1',
      settingValue: { value: 'unexpected' },
    });
    const validator = (value: unknown): value is number => typeof value === 'number';

    await expect(service.get<number>('refund.windowDays', undefined as any, validator)).rejects.toThrow(
      /Invalid value for setting "refund\.windowDays"/,
    );
  });
});
