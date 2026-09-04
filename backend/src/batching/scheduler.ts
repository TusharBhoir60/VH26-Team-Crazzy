import { BATCH_WINDOW_MS } from './config';
import { flushBatch } from './store';
import { BatchedGroup } from './types';
import { logger } from '../shared/logger';

export type FlushCallback = (groups: BatchedGroup[]) => Promise<void>;

let intervalId: NodeJS.Timeout | null = null;

export const startBatchScheduler = (onFlush: FlushCallback): void => {
  if (intervalId) {
    clearInterval(intervalId);
  }

  intervalId = setInterval(async () => {
    try {
      const groups = flushBatch();
      if (groups.length > 0) {
        logger.info(`[Batching] Flushed ${groups.length} batched groups.`);
        await onFlush(groups);
      }
    } catch (error) {
      logger.error('[Batching] Error during batch flush:', error);
    }
  }, BATCH_WINDOW_MS);
  
  logger.info(`[Batching] Scheduler started with window ${BATCH_WINDOW_MS}ms.`);
};

export const stopBatchScheduler = (): void => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('[Batching] Scheduler stopped.');
  }
};
