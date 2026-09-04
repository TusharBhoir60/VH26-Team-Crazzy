import { Alert } from '../types/alert.types';
import { dedupe } from '../dedup';
import { logger } from '../shared/logger';

export type AlertHandler = (alert: Alert) => Promise<Alert | void>;

// Connects Ingest directly to Dedup by default
let downstreamHandler: AlertHandler = async (alert: Alert): Promise<Alert> => {
  await dedupe(alert);
  return alert;
};

/**
 * Registers a custom downstream handler.
 */
export function setDownstreamHandler(handler: AlertHandler): void {
  downstreamHandler = handler;
}

/**
 * Dispatches a normalized alert to the downstream pipeline (Dedup).
 */
export async function handleNormalizedAlert(alert: Alert): Promise<Alert | void> {
  try {
    return await downstreamHandler(alert);
  } catch (error) {
    logger.error(
      {
        fingerprint: alert.fingerprint,
        error: error instanceof Error ? error.message : error,
      },
      'Error in downstream handler processing normalized alert'
    );
    // In accordance with fail-open philosophy, do not crash ingest endpoint
    return alert;
  }
}
