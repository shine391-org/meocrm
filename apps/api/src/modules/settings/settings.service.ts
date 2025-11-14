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

    return this.getForOrganization(organizationId, key, defaultValue);
  }

  async getForOrganization<T>(
    organizationId: string,
    key: string,
    defaultValue?: T,
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

    return (setting.value as T) ?? defaultValue;
  }
}
