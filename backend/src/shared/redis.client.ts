import Redis from 'ioredis';
import { logger } from './logger';

let redisInstance: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisInstance) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisInstance = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy(times) {
        if (process.env.NODE_ENV === 'test') {
          return null; // Stop retrying immediately in tests
        }
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
    });

    redisInstance.on('connect', () => {
      logger.info('Connected to Redis');
    });

    redisInstance.on('error', (err) => {
      if (process.env.NODE_ENV !== 'test') {
        logger.error({ err }, 'Redis connection error');
      }
    });
  }

  return redisInstance;
}

export async function closeRedisClient(): Promise<void> {
  if (redisInstance) {
    try {
      redisInstance.disconnect();
    } catch {
      // ignore
    }
    redisInstance = null;
  }
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const client = getRedisClient();
    const pong = await client.ping();
    return pong === 'PONG';
  } catch (err) {
    logger.error({ err }, 'Redis health check failed');
    return false;
  }
}
