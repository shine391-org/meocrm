import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContextService } from '../../common/context/request-context.service';

export type SettingValidator<T> = (value: unknown) => value is T;

export const isBooleanSetting: SettingValidator<boolean> = (value): value is boolean =>
  typeof value === 'boolean';

export const isNumberSetting: SettingValidator<number> = (value): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const isStringArraySetting: SettingValidator<string[]> = (value): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

export const isStringSetting: SettingValidator<string> = (value): value is string =>
  typeof value === 'string';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContextService: RequestContextService,
  ) {}

  private getOrganizationId(): string {
    const organizationId = this.requestContextService.organizationId;
    if (!organizationId) {
      throw new UnauthorizedException('Organization context is not set.');
    }
    return organizationId;
  }

  async get<T>(key: string, defaultValue: T, validator?: SettingValidator<T>): Promise<T>;
  async get<T>(key: string, defaultValue?: T, validator?: SettingValidator<T>): Promise<T | undefined>;
  async get<T>(key: string, defaultValue?: T, validator?: SettingValidator<T>): Promise<T | undefined> {
    const organizationId = this.getOrganizationId();

    return this.getForOrganization(organizationId, key, defaultValue, validator);
  }

  async getForOrganization<T>(
    organizationId: string,
    key: string,
    defaultValue: T,
    validator?: SettingValidator<T>,
  ): Promise<T>;
  async getForOrganization<T>(
    organizationId: string,
    key: string,
    defaultValue?: T,
    validator?: SettingValidator<T>,
  ): Promise<T | undefined>;
  async getForOrganization<T>(
    organizationId: string,
    key: string,
    defaultValue?: T,
    validator?: SettingValidator<T>,
  ): Promise<T | undefined> {
    const setting = await this.prisma.setting.findUnique({
      where: {
        organizationId_key: {
          organizationId,
          key,
        },
      },
    });

    if (!setting || setting.value === null || setting.value === undefined) {
      return defaultValue;
    }

    // Always validate before casting to ensure runtime type safety
    if (validator) {
      if (!validator(setting.value)) {
        const message = `Invalid value for setting "${key}" in organization ${organizationId}`;
        if (defaultValue !== undefined) {
          this.logger.warn(message);
          return defaultValue;
        }
        throw new Error(message);
      }
      return setting.value as T;
    } else {
      // When no validator provided, warn and return the raw value
      // Callers should always provide validators for type safety
      this.logger.warn(
        `Setting "${key}" accessed without validator. This may lead to runtime type errors.`,
      );
      return setting.value as T;
    }
  }
}
