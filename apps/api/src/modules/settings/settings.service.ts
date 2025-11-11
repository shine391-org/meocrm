import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Redis } from 'ioredis';
import { Inject } from '@nestjs/common';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async get(key: string, scope: any = {}): Promise<any> {
    const cacheKey = `settings:${key}:${JSON.stringify(scope)}`;
    const cachedSettings = await this.redis.get(cacheKey);

    if (cachedSettings) {
      return JSON.parse(cachedSettings);
    }

    // Precedence: Default → Plan → Tenant → Branch → Role → User → Object
    const precedence = [
      'object',
      'user',
      'role',
      'branch',
      'tenant',
      'plan',
      'default',
    ];

    let setting = null;

    for (const level of precedence) {
      const queryScope = {
        key,
        scope: level,
        scopeId: scope[`${level}Id`] || null,
      };

      if (level === 'default') {
        queryScope.scopeId = null;
      }

      if (queryScope.scopeId || level === 'default') {
        setting = await this.prisma.setting.findFirst({
          where: queryScope,
        });

        if (setting) {
          break;
        }
      }
    }

    if (setting) {
      await this.redis.set(
        cacheKey,
        JSON.stringify(setting.value),
        'EX',
        300,
      ); // Cache for 5 minutes
      return setting.value;
    }

    return null;
  }
}
