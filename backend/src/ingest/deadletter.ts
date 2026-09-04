import { logger } from '../shared/logger';

export interface DeadLetterEntry {
  id: string;
  source: 'prometheus' | 'datadog' | 'unknown';
  receivedAt: string;
  reason: string;
  errorMessage?: string;
  isPotentialCritical: boolean;
  rawPayload: unknown;
}

// In-memory buffer for DLQ entries (retained for diagnostics/testing)
const MAX_DLQ_BUFFER_SIZE = 1000;
const deadLetterBuffer: DeadLetterEntry[] = [];

/**
 * Heuristically inspects a raw payload to see if it might represent a critical/urgent event.
 */
export function isPotentialCriticalPayload(rawPayload: unknown): boolean {
  try {
    const text = typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload);
    const lower = text.toLowerCase();
    const urgentKeywords = [
      'critical',
      'fatal',
      'emergency',
      'sev-1',
      'sev1',
      'sev-0',
      'sev0',
      'p0',
      'p1',
      'outage',
      'service_down',
      'high',
      'error',
    ];
    return urgentKeywords.some((keyword) => lower.includes(keyword));
  } catch {
    return true; // If we can't even serialize it, treat as potentially critical for safety
  }
}

/**
 * Records a failed payload to the Dead-Letter Queue to guarantee zero silently lost critical alerts.
 */
export function recordDeadLetter(params: {
  source: 'prometheus' | 'datadog' | 'unknown';
  rawPayload: unknown;
  reason: string;
  error?: unknown;
}): DeadLetterEntry {
  const { source, rawPayload, reason, error } = params;
  const isPotentialCritical = isPotentialCriticalPayload(rawPayload);
  const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : undefined;

  const entry: DeadLetterEntry = {
    id: `dlq-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    source,
    receivedAt: new Date().toISOString(),
    reason,
    errorMessage,
    isPotentialCritical,
    rawPayload,
  };

  if (deadLetterBuffer.length >= MAX_DLQ_BUFFER_SIZE) {
    deadLetterBuffer.shift(); // Evict oldest
  }
  deadLetterBuffer.push(entry);

  if (isPotentialCritical) {
    logger.error(
      {
        dlqId: entry.id,
        source: entry.source,
        reason: entry.reason,
        errorMessage: entry.errorMessage,
        isPotentialCritical: true,
      },
      'CRITICAL: Malformed or unparseable webhook payload recorded in DLQ!'
    );
  } else {
    logger.warn(
      {
        dlqId: entry.id,
        source: entry.source,
        reason: entry.reason,
      },
      'Malformed webhook payload recorded in DLQ'
    );
  }

  return entry;
}

export function getDeadLetterEntries(): ReadonlyArray<DeadLetterEntry> {
  return deadLetterBuffer;
}

export function clearDeadLetterQueue(): void {
  deadLetterBuffer.length = 0;
}
