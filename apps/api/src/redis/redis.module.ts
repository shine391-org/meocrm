import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('RedisModule');
        const nodeEnv = configService.get<string>('NODE_ENV');

        if (nodeEnv === 'test') {
          const { default: RedisMock } = await import('ioredis-mock');
          return new RedisMock();
        }

        const host = configService.get<string>('REDIS_HOST');
        const port = configService.get<number>('REDIS_PORT');

        if (!host || !port) {
          logger.error(`REDIS_HOST or REDIS_PORT not set. NODE_ENV=${nodeEnv}. Bypassing Redis connection.`);
          return null;
        }

        logger.log(`Connecting to Redis at ${host}:${port}`);
        return new Redis({ host, port });
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
