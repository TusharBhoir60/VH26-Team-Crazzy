export type Severity = 'critical' | 'warning' | 'info' | 'unknown';
export type AlertStatus = 'firing' | 'flapping' | 'resolved';
export type Source = 'prometheus' | 'datadog';
export type Confidence = 'high' | 'medium' | 'low';

export interface Alert {
  fingerprint: string;              // sha256(alertname+labels)
  alertname: string;
  service: string;
  labels: Record<string, string>;
  status: AlertStatus;
  source: Source;
  raw_payload: Record<string, unknown>;
  received_at: string;              // ISO8601
  severity_score: Severity | null;
  cluster_id: string | null;        // uuid, null if uncorrelated
  is_root_cause: boolean;
}

export interface Cluster {
  cluster_id: string;                // uuid
  severity: Severity;
  root_cause: {
    service: string;
    alert: string;
    confidence: Confidence;
  } | null;
  affected_services: string[];
  downstream_count: number;
  raw_alert_count_suppressed: number;
  ai_narrative: string | null;
  created_at: string;                // ISO8601
}

export type PipelineStage = (alert: Alert) => Promise<Alert>;
