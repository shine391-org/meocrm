import { Injectable, Logger } from '@nestjs/common';

type SettingsScope = {
  tenantId?: string;
  branchId?: string;
  role?: string;
  userId?: string;
  objectId?: string;
};

const DEFAULT_SETTINGS: Record<string, unknown> = {
  refund: {
    windowDays: 7,
    restockOnRefund: true,
    approvals: ['manager'],
  },
  notifications: {
    staff: {
      enabled: true,
      provider: 'telegram',
    },
  },
};

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  async get<T = unknown>(
    key: string,
    _scope: SettingsScope = {},
  ): Promise<T | null> {
    const value = this.resolveFromDefaults(key);

    if (value === undefined) {
      this.logger.warn(`Setting "${key}" not found, falling back to null.`);
      return null;
    }

    return value as T;
  }

  private resolveFromDefaults(key: string): unknown {
    return key.split('.').reduce<unknown>((current, segment) => {
      if (
        current &&
        typeof current === 'object' &&
        segment in (current as Record<string, unknown>)
      ) {
        return (current as Record<string, unknown>)[segment];
      }
      return undefined;
    }, DEFAULT_SETTINGS);
  }
}
