import { Severity } from '../types/alert.types';

/**
 * Canonical severity-to-TTL mapping in seconds for Deduplication.
 * - Critical: 60s (1 min) — fast re-surfacing for critical emergencies
 * - High: 300s (5 min) — standard high-urgency window
 * - Medium: 900s (15 min) — standard suppression for moderate alerts
 * - Low: 1800s (30 min) — maximum suppression for low-priority/info noise
 */
export const SEVERITY_TTL_MAP: Readonly<Record<Severity, number>> = Object.freeze({
  critical: 60,
  high: 300,
  medium: 900,
  low: 1800,
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
