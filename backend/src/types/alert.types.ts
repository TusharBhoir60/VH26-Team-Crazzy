import { AiEnrichmentResult } from '../ai-layer/types';

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
  // Fields that might be populated by downstream pipeline stages:
  final_severity?: Severity;
  applied_rules?: string[];
  aiEnrichment?: {
    narrative?: string;
  };
}

/**
 * Canonical Incident type — the output of the Correlation Engine,
 * enriched by Safety Gate with AI fields.
 */
export interface Incident {
  incident_id: string;                // uuid
  root_cause: Alert;                  // full Alert of the root cause
  alerts: Alert[];                    // all contributing alerts, including root cause
  severity: Severity;
  summary: string;
  created_at: string;                 // ISO8601
  // AI enrichment fields — populated by Safety Gate
  ai_narrative?: string | null;
  aiEnrichment?: AiEnrichmentResult | null;
  safetyViolation?: boolean;
  safetyViolationDetail?: SafetyViolationDetail;
}

/**
 * Records the full context of a safety rule violation for logging/ops.
 */
export interface SafetyViolationDetail {
  deterministicSeverity: Severity;
  aiSuggestedSeverity: Severity;
  aiResponse: AiEnrichmentResult;
  detectedAt: string;
}

/**
 * Canonical BatchedGroup — used by both Batching and Router.
 */
export interface BatchedGroup {
  id?: string;
  severity: Severity;
  destinationChannel: string;
  incidents: Incident[];
  windowStart?: number;
  windowEnd?: number;
  cooldown_suppressed_count?: number;
  aiEnrichment?: {
    narrative?: string;
  };
}

/**
 * Cluster — the raw topology cluster shape (used by dashboard-api).
 */
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
