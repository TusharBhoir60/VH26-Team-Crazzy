import { getRedisClient } from '../shared/redis.client';
import { logger } from '../shared/logger';
import { Incident, SafetyViolationDetail } from './types';

const QUARANTINE_KEY = 'safety-gate:quarantine';
const MAX_QUARANTINE_SIZE = 500;

/**
 * Pushes a quarantined incident to the Redis list.
 * Uses RPUSH so entries are ordered by arrival time (LRANGE reads oldest-first).
 *
 * The quarantine list is shared across all instances (horizontal scaling safe).
 * Fails gracefully — a Redis error during quarantine push is logged but does not
 * re-raise (the incident is already not being forwarded to Batching).
 */
export async function pushToQuarantine(
  incident: Incident,
  detail: SafetyViolationDetail
): Promise<void> {
  const client = getRedisClient();

  const entry = {
    incident_id: incident.incident_id,
    fingerprint: incident.root_cause?.fingerprint ?? 'unknown',
    deterministicSeverity: detail.deterministicSeverity,
    aiSuggestedSeverity: detail.aiSuggestedSeverity,
    detectedAt: detail.detectedAt,
    aiResponse: detail.aiResponse,
    incident: JSON.stringify(incident),
  };

  try {
    const multi = client.multi();
    multi.rpush(QUARANTINE_KEY, JSON.stringify(entry));
    // Trim list to prevent unbounded growth (keeps newest MAX_QUARANTINE_SIZE entries)
    multi.ltrim(QUARANTINE_KEY, -MAX_QUARANTINE_SIZE, -1);
    await multi.exec();

    logger.error(
      {
        event: 'safety-gate.violation_quarantined',
        incident_id: incident.incident_id,
        deterministicSeverity: detail.deterministicSeverity,
        aiSuggestedSeverity: detail.aiSuggestedSeverity,
        narrative: detail.aiResponse.narrative,
      },
      'Safety Gate: AI severity downgrade detected — incident quarantined, NOT forwarded to Batching'
    );
  } catch (err) {
    // Redis failure during quarantine push — log loudly but do not re-raise
    // The incident is still being withheld from Batching — this is a monitoring gap risk
    logger.error(
      {
        event: 'safety-gate.quarantine_push_failed',
        incident_id: incident.incident_id,
        err,
      },
      'Safety Gate: Failed to push quarantined incident to Redis — incident lost from quarantine queue!'
    );
  }
}

/**
 * Returns all entries currently in the quarantine queue, oldest-first.
 * Useful for ops/monitoring tooling to inspect the queue depth and contents.
 */
export async function getQuarantineQueue(): Promise<unknown[]> {
  const client = getRedisClient();

  try {
    const entries = await client.lrange(QUARANTINE_KEY, 0, -1);
    return entries.map((e) => {
      try {
        return JSON.parse(e) as unknown;
      } catch {
        return { raw: e, parseError: true };
      }
    });
  } catch (err) {
    logger.error({ err }, 'Safety Gate: Failed to read quarantine queue from Redis');
    return [];
  }
}

/**
 * Returns the current depth of the quarantine queue.
 * Should be monitored operationally — non-zero depth means incidents are stuck.
 */
export async function getQuarantineDepth(): Promise<number> {
  const client = getRedisClient();

  try {
    return await client.llen(QUARANTINE_KEY);
  } catch (err) {
    logger.error({ err }, 'Safety Gate: Failed to get quarantine queue depth from Redis');
    return -1; // -1 signals Redis was unreachable
  }
}

export { QUARANTINE_KEY };
