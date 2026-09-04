import { Alert, Severity, AlertStatus } from '../../types/alert.types';
import { AlertmanagerPayload, AlertmanagerAlertItem } from '../schemas/alertmanager.schema';
import { computeFingerprint } from '../../shared/crypto';

/**
 * Maps Prometheus Alertmanager severity labels to the canonical Severity enum.
 */
export function mapAlertmanagerSeverity(severityRaw?: string): Severity | null {
  if (!severityRaw) return null;
  const s = severityRaw.toLowerCase().trim();

  switch (s) {
    case 'critical':
    case 'crit':
    case 'fatal':
    case 'emergency':
    case 'page':
    case 'p0':
    case 'p1':
    case 'sev0':
    case 'sev1':
    case 'sev-0':
    case 'sev-1':
      return 'critical';

    case 'high':
    case 'error':
    case 'err':
    case 'major':
    case 'p2':
    case 'sev2':
    case 'sev-2':
      return 'high';

    case 'medium':
    case 'med':
    case 'warn':
    case 'warning':
    case 'minor':
    case 'p3':
    case 'sev3':
    case 'sev-3':
      return 'medium';

    case 'low':
    case 'info':
    case 'information':
    case 'informational':
    case 'notice':
    case 'debug':
    case 'p4':
    case 'p5':
    case 'sev4':
    case 'sev-4':
      return 'low';

    default:
      return null;
  }
}

/**
 * Normalizes a single Prometheus Alertmanager alert item into the internal Alert format.
 */
export function normalizeAlertmanagerAlert(
  item: AlertmanagerAlertItem,
  parentPayload?: AlertmanagerPayload
): Alert {
  const labels: Record<string, string> = { ...item.labels };
  const alertname: string = labels['alertname'] || 'UnknownAlert';
  const service: string =
    labels['service'] ||
    labels['job'] ||
    labels['app'] ||
    labels['application'] ||
    'unknown-service';

  const status: AlertStatus = item.status === 'resolved' ? 'resolved' : 'firing';
  const received_at = new Date().toISOString();

  // Explicit severity lookup from labels.severity or annotations.severity
  const annotations: Record<string, string> = { ...(item.annotations || {}) };
  const rawSeverity: string | undefined =
    labels['severity'] ||
    labels['priority'] ||
    labels['level'] ||
    annotations['severity'];

  const severity_score = mapAlertmanagerSeverity(rawSeverity);
  const fingerprint = computeFingerprint(alertname, labels);

  return {
    fingerprint,
    alertname,
    service,
    labels,
    status,
    source: 'prometheus',
    raw_payload: (parentPayload as unknown as Record<string, unknown>) ?? (item as unknown as Record<string, unknown>),
    received_at,
    severity_score,
    cluster_id: null,
    is_root_cause: false,
  };
}

/**
 * Normalizes a full Alertmanager webhook payload into an array of internal Alert objects.
 */
export function normalizeAlertmanagerPayload(payload: AlertmanagerPayload): Alert[] {
  return payload.alerts.map((item) => normalizeAlertmanagerAlert(item, payload));
}
