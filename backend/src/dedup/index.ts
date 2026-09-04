import { Alert } from '../types/alert.types';
import { DedupResult } from './types';
import { getDedupTtlForSeverity } from './config';
import { DedupRedisService } from './redisClient';
import { logger } from '../shared/logger';

// Downstream handler stub (Lifecycle stage entrypoint)
export type LifecycleHandler = (alert: Alert) => Promise<Alert | void>;

let downstreamLifecycleHandler: LifecycleHandler = async (alert: Alert): Promise<Alert> => {
  logger.info(
    {
      fingerprint: alert.fingerprint,
      alertname: alert.alertname,
      service: alert.service,
      status: alert.status,
      severity: alert.severity_score,
    },
    'Forwarding non-duplicate alert to Lifecycle stage'
  );
  return alert;
};

export function setLifecycleHandler(handler: LifecycleHandler): void {
  downstreamLifecycleHandler = handler;
}

export class DedupEngine {
  private redisService: DedupRedisService;

  constructor(redisService?: DedupRedisService) {
    this.redisService = redisService ?? new DedupRedisService();
  }

  /**
   * Evaluates an incoming Alert for duplicate firings.
   */
  public async dedupe(alert: Alert): Promise<DedupResult> {
    // 1. Resolution events represent state transitions — pass through directly to Lifecycle
    if (alert.status === 'resolved') {
      try {
        await this.redisService.deleteEntry(alert.fingerprint);
      } catch (err) {
        logger.warn(
          { fingerprint: alert.fingerprint, err },
          'Failed to clear dedup key on resolved event (non-fatal)'
        );
      }

      await this.forwardToLifecycle(alert);

      return {
        isDuplicate: false,
        count: 1,
        alert,
        suppressed: false,
      };
    }

    const ttlSeconds = getDedupTtlForSeverity(alert.severity_score);

    // 2. Check Redis for existing active entry
    try {
      const existingEntry = await this.redisService.getEntry(alert.fingerprint);

      if (!existingEntry) {
        // New alert (first occurrence)
        const created = await this.redisService.createEntry(alert, ttlSeconds);
        await this.forwardToLifecycle(alert);

        return {
          isDuplicate: false,
          count: 1,
          alert,
          suppressed: false,
          firstSeenAt: created.firstSeenAt,
          lastSeenAt: created.lastSeenAt,
          ttlSeconds,
        };
      }

      // Duplicate alert (repeat occurrence) -> Suppress & Increment
      const updated = await this.redisService.incrementEntry(alert.fingerprint, alert, ttlSeconds);

      logger.info(
        {
          fingerprint: alert.fingerprint,
          alertname: alert.alertname,
          service: alert.service,
          duplicateCount: updated.count,
          ttlSeconds,
        },
        `Suppressed duplicate alert (${updated.count}x firing)`
      );

      return {
        isDuplicate: true,
        count: updated.count,
        alert,
        suppressed: true,
        firstSeenAt: updated.firstSeenAt,
        lastSeenAt: updated.lastSeenAt,
        ttlSeconds,
      };
    } catch (err) {
      // 3. Fail-Open: If Redis errors or is unreachable, forward alert to guarantee zero dropped critical alerts
      logger.error(
        {
          event: 'dedup.redis_unavailable',
          fingerprint: alert.fingerprint,
          alertname: alert.alertname,
          err,
        },
        'Redis unavailable during deduplication check — failing open to protect critical alert recall'
      );

      await this.forwardToLifecycle(alert);

      return {
        isDuplicate: false,
        count: 1,
        alert,
        suppressed: false,
      };
    }
  }

  private async forwardToLifecycle(alert: Alert): Promise<void> {
    try {
      await downstreamLifecycleHandler(alert);
    } catch (err) {
      logger.error(
        { fingerprint: alert.fingerprint, err },
        'Error in Lifecycle handler processing alert'
      );
    }
  }
}

// Singleton DedupEngine instance
export const dedupEngine = new DedupEngine();

export async function dedupe(alert: Alert): Promise<DedupResult> {
  return dedupEngine.dedupe(alert);
}

export * from './types';
export * from './config';
export * from './redisClient';
