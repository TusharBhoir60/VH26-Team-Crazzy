import Redis from 'ioredis';
import { Alert } from '../types/alert.types';
import { LifecycleHistory, LifecycleResult } from './types';
import { evaluateState } from './stateMachine';
import { logger } from '../shared/logger';

import { LIFECYCLE_TTL_SECONDS, RESOLVED_TTL_SECONDS } from './config';

/**
 * Stage 3: Lifecycle Tracking
 * Evaluates the alert's state over time to detect flapping or staleness.
 */
export async function trackLifecycle(
  alert: Alert,
  redis: Redis
): Promise<LifecycleResult> {
  const key = `lifecycle:${alert.fingerprint}`;
  let history: LifecycleHistory | null = null;

  try {
    // 1. Fetch current history
    const rawData = await redis.hgetall(key);
    
    if (rawData && rawData.state) {
      history = {
        state: rawData.state as LifecycleHistory['state'],
        transitions: JSON.parse(rawData.transitions || '[]'),
        lastTransitionAt: rawData.lastTransitionAt || new Date().toISOString(),
      };
    }
  } catch (err) {
    // Fail-open: If Redis is unavailable, log error and treat as new firing alert
    logger.error({ err }, `Redis read failed in lifecycle for ${alert.fingerprint}`);
    return {
      ...alert,
      lifecycle_state: alert.status === 'resolved' ? 'resolved' : 'firing',
      is_flapping: false,
    };
  }

  // 2. Evaluate next state
  const nextHistory = evaluateState(alert.status, history);

  // 3. Save updated history to Redis
  try {
    const multi = redis.multi();
    multi.hset(key, {
      state: nextHistory.state,
      transitions: JSON.stringify(nextHistory.transitions),
      lastTransitionAt: nextHistory.lastTransitionAt,
    });

    // Update the recent alerts feed with the enriched alert
    const summary = JSON.stringify({
      fingerprint: alert.fingerprint,
      alertname: alert.alertname,
      service: alert.service,
      severity: alert.severity_score || 'unknown',
      status: nextHistory.state, // The true lifecycle state
      source: alert.source,
      received_at: alert.received_at || new Date().toISOString(),
    });
    
    multi.hset('recent_alerts_data', alert.fingerprint, summary);
    multi.zadd('recent_alerts_index', Date.now().toString(), alert.fingerprint);
    // Keep only the most recent 50 alerts in the index
    multi.zremrangebyrank('recent_alerts_index', 0, -51);

    // Set TTL based on whether it is fully resolved or not
    if (nextHistory.state === 'resolved') {
      multi.expire(key, RESOLVED_TTL_SECONDS);
    } else {
      multi.expire(key, LIFECYCLE_TTL_SECONDS);
    }

    await multi.exec();
  } catch (err) {
    // Fail-open: If Redis write fails, log and continue. We don't drop the alert.
    logger.error({ err }, `Redis write failed in lifecycle for ${alert.fingerprint}`);
  }

  // 4. Return enriched alert
  return {
    ...alert,
    lifecycle_state: nextHistory.state,
    is_flapping: nextHistory.state === 'flapping',
  };
}
