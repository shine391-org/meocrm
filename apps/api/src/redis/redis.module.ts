import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService): Promise<Redis | null> => {
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
        const redis = new Redis({
          host,
          port,
          retryStrategy: (times: number) => {
            if (times > 3) {
              logger.error('Redis connection failed after 3 retries');
              return null;
            }
            const delay = Math.min(times * 1000, 3000);
            logger.warn(`Redis connection attempt ${times}, retrying in ${delay}ms`);
            return delay;
          },
          enableOfflineQueue: false,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        });

        redis.on('error', (err) => {
          logger.error(`Redis error: ${err.message}`);
        });

        redis.on('connect', () => {
          logger.log('Redis connected successfully');
        });

        redis.on('reconnecting', () => {
          logger.warn('Redis reconnecting...');
        });

        try {
          await redis.connect();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          logger.error(`Failed to connect to Redis: ${message}`);
          return null;
        }

        return redis;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
