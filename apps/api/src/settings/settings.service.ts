import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContextService } from '../common/context/request-context.service';
import { Prisma } from '@prisma/client';

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

  /**
   * TODO: Implement a full-fledged settings service with caching and fallback logic
   * as described in the documentation. This is a simplified version.
   */
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

    return setting.value as T;
  }
}
