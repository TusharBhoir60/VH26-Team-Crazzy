import { Severity } from '../types/alert.types';

/**
 * Canonical severity-to-TTL mapping in seconds for Deduplication.
 * - Critical: 60s (1 min) — fast re-surfacing for critical emergencies
 * - Warning: 300s (5 min) — standard suppression for warning-level alerts
 * - Info: 900s (15 min) — longer suppression for informational noise
 * - Unknown: 300s (5 min) — safe default for unclassified alerts
 */
export const SEVERITY_TTL_MAP: Readonly<Record<Severity, number>> = Object.freeze({
  critical: 60,
  warning: 300,
  info: 900,
  unknown: 300,
});

export const DEFAULT_DEDUP_TTL_SECONDS = 300;

/**
 * Returns the dedup TTL window (in seconds) for a given severity score.
 */
export function getDedupTtlForSeverity(severity: Severity | null): number {
  if (!severity) {
    return DEFAULT_DEDUP_TTL_SECONDS;
  }
  return SEVERITY_TTL_MAP[severity] ?? DEFAULT_DEDUP_TTL_SECONDS;
}
