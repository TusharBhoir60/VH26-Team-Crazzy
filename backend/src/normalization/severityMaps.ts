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

  high: 'high',
  error: 'high',
  err: 'high',
  major: 'high',
  p2: 'high',
  sev2: 'high',
  'sev-2': 'high',

  medium: 'medium',
  med: 'medium',
  warn: 'medium',
  warning: 'medium',
  minor: 'medium',
  p3: 'medium',
  sev3: 'medium',
  'sev-3': 'medium',

  low: 'low',
  info: 'low',
  information: 'low',
  informational: 'low',
  notice: 'low',
  debug: 'low',
  p4: 'low',
  p5: 'low',
  sev4: 'low',
  'sev-4': 'low',
  sev5: 'low',
  'sev-5': 'low',
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

  p2: 'high',
  high: 'high',
  major: 'high',
  error: 'high',
  sev2: 'high',

  p3: 'medium',
  medium: 'medium',
  warn: 'medium',
  warning: 'medium',
  minor: 'medium',
  sev3: 'medium',

  p4: 'low',
  p5: 'low',
  low: 'low',
  info: 'low',
  informational: 'low',
  success: 'low',
  sev4: 'low',
  sev5: 'low',
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
