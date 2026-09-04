import Redis from 'ioredis';
import { logger } from '../shared/logger';
import { HISTORY_TTL_SECONDS } from './config/thresholds';

export async function incrementAndGetFrequency(
  fingerprint: string,
  redis: Redis
): Promise<number> {
  const key = `history:${fingerprint}`;
  
  try {
    // INCR atomically increments the count and creates it if it doesn't exist
    const multi = redis.multi();
    multi.incr(key);
    
    // We only want to set the expire time once, or we can just blindly refresh it.
    // Refreshing the TTL on every increment makes it a rolling window of inactivity.
    multi.expire(key, HISTORY_TTL_SECONDS);
    
    const results = await multi.exec();
    
    if (results && results[0] && results[0][0] === null) {
       return results[0][1] as number;
    }
    
    // Fallback if transaction fails unexpectedly
    return 1;
  } catch (err) {
    // Fail-open: if Redis is unavailable, treat as first occurrence (frequency = 1)
    logger.error({ err }, `Redis failed during history tracking for ${fingerprint}`);
    return 1;
  }
}
