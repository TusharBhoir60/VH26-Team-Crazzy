import Redis from 'ioredis';
import { logger } from '../shared/logger';
import { Alert, BatchedGroup } from '../types/alert.types';

const DEADLETTER_KEY = 'router:deadletter';

export interface DeadLetterPayload {
  incident: Alert | BatchedGroup;
  channel: string;
  content: string;
  error: string;
  timestamp: string;
  retryCount: number;
}

export async function storeDeadLetter(
  payload: DeadLetterPayload,
  redis: Redis
): Promise<void> {
  try {
    const payloadStr = JSON.stringify(payload);
    await redis.rpush(DEADLETTER_KEY, payloadStr);
    logger.info({ channel: payload.channel }, 'Successfully dead-lettered notification');
  } catch (err) {
    // If dead-lettering fails, we log it heavily. We cannot do much more if Redis is down.
    logger.error({ err, payload }, 'FAILED TO WRITE TO DEAD-LETTER STORE');
  }
}
