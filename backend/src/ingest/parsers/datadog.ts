import { Alert, Severity, AlertStatus } from '../../types/alert.types';
import { DatadogPayload } from '../schemas/datadog.schema';
import { computeFingerprint } from '../../shared/crypto';

/**
 * Parses Datadog tag list (or comma-separated string) into a structured Record<string, string>.
 */
export function parseDatadogTags(tags: string[] | string): Record<string, string> {
  const tagList = Array.isArray(tags) ? tags : tags.split(',');
  const record: Record<string, string> = {};

  for (const rawTag of tagList) {
    const tag = rawTag.trim();
    if (!tag) continue;

    const colonIdx = tag.indexOf(':');
    if (colonIdx > 0) {
      const key = tag.slice(0, colonIdx).trim().toLowerCase();
      const value = tag.slice(colonIdx + 1).trim();
      record[key] = value;
    } else {
      record[tag.toLowerCase()] = 'true';
    }
  }

  return record;
}

/**
 * Maps Datadog priority, alert_type, and tag indicators to the canonical Severity enum.
 */
export function mapDatadogSeverity(
  payload: Partial<DatadogPayload>,
  labels: Record<string, string>
): Severity | null {
  // 1. Check explicit priority tag or field (P1..P5)
  const priority = (payload.priority || labels['priority'] || labels['severity'])?.toLowerCase().trim();
  if (priority) {
    if (['p1', 'p0', 'critical', 'crit', 'fatal', 'sev0', 'sev1'].includes(priority)) return 'critical';
    if (['p2', 'high', 'major', 'sev2', 'error'].includes(priority)) return 'high';
    if (['p3', 'medium', 'warn', 'warning', 'minor', 'sev3'].includes(priority)) return 'medium';
    if (['p4', 'p5', 'low', 'info', 'informational', 'sev4', 'sev5'].includes(priority)) return 'low';
  }

  // 2. Check alert_type
  const alertType = payload.alert_type?.toLowerCase().trim();
  switch (alertType) {
    case 'error':
      return 'critical';
    case 'warning':
    case 'warn':
      return 'medium';
    case 'info':
    case 'success':
      return 'low';
    default:
      return null;
  }
}

/**
 * Normalizes a Datadog webhook payload into an array containing a single internal Alert object.
 */
export function normalizeDatadogPayload(payload: DatadogPayload): Alert[] {
  const labels = parseDatadogTags(payload.tags);

  // Clean alertname from title (strip common prefix like [Triggered], [Recovered], etc.)
  let alertname = payload.title.replace(/^\[(Triggered|Recovered|Warn|Alert|OK)\]\s*/i, '').trim();
  if (!alertname) {
    alertname = payload.title || 'DatadogAlert';
  }

  // Determine service
  const service =
    labels['service'] ||
    labels['app'] ||
    labels['application'] ||
    payload.hostname ||
    'unknown-service';

  // Determine status
  const alertType = payload.alert_type?.toLowerCase().trim();
  const transition = payload.alert_transition?.toLowerCase().trim();
  const alertStatus = payload.alert_status?.toLowerCase().trim();

  let status: AlertStatus = 'firing';
  if (
    alertType === 'success' ||
    transition === 'recovered' ||
    alertStatus === 'ok' ||
    payload.title.toLowerCase().includes('[recovered]')
  ) {
    status = 'resolved';
  }

  const severity_score = mapDatadogSeverity(payload, labels);
  const fingerprint = computeFingerprint(alertname, labels);
  const received_at = new Date().toISOString();

  const alert: Alert = {
    fingerprint,
    alertname,
    service,
    labels,
    status,
    source: 'datadog',
    raw_payload: payload as unknown as Record<string, unknown>,
    received_at,
    severity_score,
    cluster_id: null,
    is_root_cause: false,
  };

  return [alert];
}
