import { Alert } from '../types/alert.types';
import { logger } from '../shared/logger';

export type AlertHandler = (alert: Alert) => Promise<Alert | void>;

// Configurable downstream handler (defaults to in-process logger stub until Dedup stage connects)
let downstreamHandler: AlertHandler = async (alert: Alert): Promise<Alert> => {
  logger.info(
    {
      fingerprint: alert.fingerprint,
      alertname: alert.alertname,
      service: alert.service,
      source: alert.source,
      status: alert.status,
      severity: alert.severity_score,
    },
    'Handing off normalized alert to downstream pipeline (Dedup)'
  );
  return alert;
};

/**
 * Registers a downstream handler (e.g. Dedup stage entrypoint).
 */
export function setDownstreamHandler(handler: AlertHandler): void {
  downstreamHandler = handler;
}

/**
 * Dispatches a normalized alert to the downstream pipeline.
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
