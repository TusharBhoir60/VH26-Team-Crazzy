import { Incident } from '../types/alert.types';
import { addIncidentToBatch } from './store';
import { logger } from '../shared/logger';

export type ForwardCriticalCallback = (incident: Incident) => Promise<void>;

let forwardCriticalFn: ForwardCriticalCallback | null = null;

export const setForwardCriticalCallback = (fn: ForwardCriticalCallback): void => {
  forwardCriticalFn = fn;
};

export const submitToBatch = async (incident: Incident): Promise<void> => {
  // CRITICAL BYPASS: Any incident with `severity === 'critical'` skips batching entirely.
  // It is forwarded immediately to Adaptive Cooldown, not added to any batch queue.
  if (incident.severity === 'critical') {
    logger.info(`[Batching] Critical incident ${incident.incident_id} bypasses batching.`);
    
    try {
      if (forwardCriticalFn) {
        await forwardCriticalFn(incident);
      } else {
        logger.warn('[Batching] No critical forward callback registered! Falling back to router directly.');
        const { route } = require('../router');
        const { getRedisClient } = require('../shared/redis.client');
        await route(incident, getRedisClient());
      }
    } catch (err) {
      logger.error({ err, incident_id: incident.incident_id }, '[Batching] Critical forward failed! Falling back to router directly.');
      const { route } = require('../router');
      const { getRedisClient } = require('../shared/redis.client');
      await route(incident, getRedisClient());
    }
    return;
  }

  // Add non-critical incidents to the in-flight batch
  addIncidentToBatch(incident);
  logger.info(`[Batching] Incident ${incident.incident_id} (severity: ${incident.severity}) added to batch.`);
};
