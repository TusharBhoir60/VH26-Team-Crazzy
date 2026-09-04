import { Severity } from '../types/alert.types';

/**
 * Named constant map for Prometheus Alertmanager severity labels -> canonical Severity.
 */
export const ALERTMANAGER_SEVERITY_MAP: Readonly<Record<string, Severity>> = Object.freeze({
  critical: 'critical',
  crit: 'critical',
  fatal: 'critical',
  emergency: 'critical',
  page: 'critical',
  p0: 'critical',
  p1: 'critical',
  sev0: 'critical',
  sev1: 'critical',
  'sev-0': 'critical',
  'sev-1': 'critical',

  high: 'warning',
  error: 'warning',
  err: 'warning',
  major: 'warning',
  p2: 'warning',
  sev2: 'warning',
  'sev-2': 'warning',

  medium: 'warning',
  med: 'warning',
  warn: 'warning',
  warning: 'warning',
  minor: 'warning',
  p3: 'warning',
  sev3: 'warning',
  'sev-3': 'warning',

  low: 'info',
  info: 'info',
  information: 'info',
  informational: 'info',
  notice: 'info',
  debug: 'info',
  p4: 'info',
  p5: 'info',
  sev4: 'info',
  'sev-4': 'info',
  sev5: 'info',
  'sev-5': 'info',
});

/**
 * Named constant map for Datadog priorities and alert types -> canonical Severity.
 */
export const DATADOG_SEVERITY_MAP: Readonly<Record<string, Severity>> = Object.freeze({
  p1: 'critical',
  p0: 'critical',
  critical: 'critical',
  crit: 'critical',
  fatal: 'critical',
  sev0: 'critical',
  sev1: 'critical',

  p2: 'warning',
  high: 'warning',
  major: 'warning',
  error: 'warning',
  sev2: 'warning',

  p3: 'warning',
  medium: 'warning',
  warn: 'warning',
  warning: 'warning',
  minor: 'warning',
  sev3: 'warning',

  p4: 'info',
  p5: 'info',
  low: 'info',
  info: 'info',
  informational: 'info',
  success: 'info',
  sev4: 'info',
  sev5: 'info',
});

/**
 * Maps raw Alertmanager severity label to canonical Severity, returning a warning if unmapped.
 */
export function mapAlertmanagerSeverity(rawSeverity?: string): {
  severity: Severity | null;
  warning?: string;
} {
  if (!rawSeverity || typeof rawSeverity !== 'string' || rawSeverity.trim() === '') {
    return {
      severity: null,
      warning: 'Alertmanager alert missing severity label; severity set to null for downstream scoring',
    };
  }

  const normalized = rawSeverity.toLowerCase().trim();
  const mapped = ALERTMANAGER_SEVERITY_MAP[normalized];

  if (mapped) {
    return { severity: mapped };
  }

  return {
    severity: null,
    warning: `Unrecognized Alertmanager severity '${rawSeverity}'; mapped to null with warning`,
  };
}

/**
 * Maps Datadog payload priority/alert_type to canonical Severity, returning a warning if unmapped.
 */
export function mapDatadogSeverity(params: {
  priority?: string;
  alertType?: string;
  labels?: Record<string, string>;
}): {
  severity: Severity | null;
  warning?: string;
} {
  const { priority, alertType, labels = {} } = params;

  // 1. Explicit priority field or priority tag (P1..P5)
  const rawPriority = (priority || labels['priority'] || labels['severity'])?.toLowerCase().trim();
  if (rawPriority) {
    const mapped = DATADOG_SEVERITY_MAP[rawPriority];
    if (mapped) {
      return { severity: mapped };
    }
  }

  // 2. Alert type fallback (error -> critical/high, warning -> medium, etc.)
  if (alertType) {
    const rawType = alertType.toLowerCase().trim();
    const mapped = DATADOG_SEVERITY_MAP[rawType];
    if (mapped) {
      return { severity: mapped };
    }
  }

  if (rawPriority || alertType) {
    return {
      severity: null,
      warning: `Unrecognized Datadog priority/alert_type '${rawPriority || alertType}'; mapped to null with warning`,
    };
  }

  return {
    severity: null,
    warning: 'Datadog alert missing priority and alert_type; severity set to null for downstream scoring',
  };
}
