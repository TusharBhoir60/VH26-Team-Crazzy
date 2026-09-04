import { getRedisClient } from './shared/redis.client';
import { setDownstreamHandler } from './ingest/handoff';
import { dedupe } from './dedup';
import { setLifecycleHandler } from './dedup';
import { trackLifecycle } from './lifecycle/lifecycle.service';
import { scoreSeverity } from './severity/severity.service';
import { correlate } from './correlation';
import { applySafetyGate, setBatchingHandler } from './safety-gate';
import { submitToBatch, setForwardCriticalCallback } from './batching';
import { startBatchScheduler } from './batching/scheduler';
import { applyCooldown } from './cooldown';
import { route } from './router';
import { logger } from './shared/logger';
import { Alert, Incident } from './types/alert.types';

export function bootstrapPipeline() {
  const redis = getRedisClient();

  logger.info('Bootstrapping Alert Fatigue Buster pipeline stages...');

  // 1. Ingest -> Dedup
  setDownstreamHandler(async (alert: Alert) => {
    return await dedupe(alert);
  });

  // 2. Dedup -> Lifecycle -> Severity -> Correlation -> Safety Gate
  setLifecycleHandler(async (alert: Alert) => {
    try {
      // 2a. Lifecycle
      const lcResult = await trackLifecycle(alert, redis);
      
      // 2b. Severity
      const sevResult = await scoreSeverity(lcResult, redis);
      
      // Ensure the canonical severity_score is set
      const updatedAlert: Alert = {
        ...sevResult,
        severity_score: sevResult.final_severity || sevResult.severity_score || 'unknown',
      };

      // 2c. Correlation
      const incident = await correlate(updatedAlert);

      // 2d. Safety Gate
      await applySafetyGate(incident);

    } catch (err) {
      logger.error({ err, fingerprint: alert.fingerprint }, 'Pipeline error after Dedup');
    }
  });

  // 3. Safety Gate -> Batching
  setBatchingHandler(async (incident: Incident) => {
    await submitToBatch(incident);
  });

  // 4a. Batching (Critical Bypass) -> Cooldown -> Router
  setForwardCriticalCallback(async (incident: Incident) => {
    try {
      const cooldownResult = await applyCooldown(incident);
      if (cooldownResult.allowed) {
        await route(incident, redis);
      } else {
        logger.info({ incident_id: incident.incident_id }, 'Critical incident bypassed batching but was suppressed by cooldown');
      }
    } catch (err) {
      logger.error({ err, incident_id: incident.incident_id }, 'Critical bypass pipeline error');
    }
  });

  // 4b. Batching (Scheduler flush) -> Cooldown -> Router
  startBatchScheduler(async (groups) => {
    for (const group of groups) {
      try {
        const cooldownResult = await applyCooldown(group);
        if (cooldownResult.allowed) {
          // Pass the suppressed count down if relevant
          if (cooldownResult.suppressedCount && cooldownResult.suppressedCount > 0) {
            group.cooldown_suppressed_count = cooldownResult.suppressedCount;
          }
          await route(group, redis);
        } else {
          logger.info({ destination: group.destinationChannel, severity: group.severity }, 'Batched group suppressed by cooldown');
        }
      } catch (err) {
        logger.error({ err, severity: group.severity }, 'Batched flush pipeline error');
      }
    }
  });

  logger.info('Pipeline successfully wired.');
}
