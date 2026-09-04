import Redis from 'ioredis';
import { logger } from '../shared/logger';
import { Alert, BatchedGroup } from '../types/alert.types';
import { ChannelAdapter, RouterConfig } from './types';
import { storeDeadLetter } from './deadletter';

/**
 * Executes a send operation with exponential backoff and dead-lettering.
 */
export async function sendWithRetry(
  adapter: ChannelAdapter,
  content: string,
  incident: Alert | BatchedGroup,
  channelName: string,
  config: RouterConfig,
  redis: Redis
): Promise<boolean> {
  let attempt = 0;
  let lastError = '';

  while (attempt <= config.maxRetries) {
    try {
      const result = await adapter.send(content, incident);
      
      if (result.success) {
        logger.info({ channel: channelName }, 'Successfully delivered notification');
        return true;
      }
      
      lastError = result.error || 'Unknown error';
      
      if (result.retryable === false) {
        logger.warn({ channel: channelName, error: lastError }, 'Non-retryable error, skipping retries');
        break; // Drop out of retry loop for non-retryable errors
      }
      
    } catch (err: any) {
      lastError = err.message || 'Exception during send';
    }

    if (attempt < config.maxRetries) {
      // Calculate exponential backoff (e.g., initialBackoffMs * 2^attempt)
      // wait 2s, 4s, 8s etc.
      const delay = config.initialBackoffMs * Math.pow(2, attempt);
      logger.warn(
        { channel: channelName, attempt: attempt + 1, delay, error: lastError },
        'Delivery failed, retrying...'
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    
    attempt++;
  }

  // If we reach here, we exhausted retries or hit a non-retryable error
  logger.error(
    { channel: channelName, error: lastError },
    'Notification delivery failed after retries'
  );

  // Store in dead-letter queue
  await storeDeadLetter(
    {
      incident,
      channel: channelName,
      content,
      error: lastError,
      timestamp: new Date().toISOString(),
      retryCount: attempt - 1,
    },
    redis
  );
  
  return false;
}
