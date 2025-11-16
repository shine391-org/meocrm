import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContextService } from '../../common/context/request-context.service';

@Injectable()
export class SettingsService {
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

  async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const organizationId = this.getOrganizationId();

    const setting = await this.prisma.setting.findUnique({
      where: {
        organizationId_key: {
          organizationId,
          key,
        },
      },
    });

    if (!setting) {
      return defaultValue;
    }

    return (setting.value as T) ?? defaultValue;
  }

  async getForOrganization<T>(
    organizationId: string,
    key: string,
    defaultValue?: T,
    validator?: (value: unknown) => value is T,
  ): Promise<T | undefined> {
    const setting = await this.prisma.setting.findUnique({
      where: {
        organizationId_key: {
          organizationId,
          key,
        },
      },
    });

    if (!setting) {
      return defaultValue;
    }

    const value = setting.value;

    if (validator && !validator(value)) {
      return defaultValue;
    }

    return value !== null && value !== undefined ? (value as T) : defaultValue;
  }
}
