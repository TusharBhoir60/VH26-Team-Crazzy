import { Alert, Cluster, Severity } from '../types/alert.types';
import { AiEnrichmentResult } from '../ai-layer/types';

/**
 * Incident: the output of the Correlation Engine.
 * Extends Cluster with the full contributing alert list and AI/safety fields
 * populated by the Safety Gate.
 */
export interface Incident extends Cluster {
  /** All alerts contributing to this correlated incident */
  alerts: Alert[];
  /**
   * AI enrichment result attached by Safety Gate.
   * null = AI was unavailable, timed out, or produced a malformed response.
   */
  aiEnrichment: AiEnrichmentResult | null;
  /**
   * True if Safety Gate detected a rule violation (AI attempted a downgrade).
   * Violating incidents are quarantined and not forwarded to Batching.
   */
  safetyViolation: boolean;
  /** Full context of the violation, set when safetyViolation is true */
  safetyViolationDetail?: SafetyViolationDetail;
}

/**
 * Records the full context of a safety rule violation for logging/ops.
 */
export interface SafetyViolationDetail {
  /** The severity from the deterministic Correlation Engine */
  deterministicSeverity: Severity;
  /** What the AI tried to suggest (the offending downgrade) */
  aiSuggestedSeverity: Severity;
  /** The full AI response that caused the violation */
  aiResponse: AiEnrichmentResult;
  /** ISO8601 timestamp when the violation was detected */
  detectedAt: string;
}

/**
 * The result returned by applySafetyGate().
 */
export interface SafetyGateResult {
  /** true = forwarded to Batching, false = quarantined */
  forwarded: boolean;
  /** The (potentially enriched) incident */
  incident: Incident;
  /** Human-readable action taken */
  action: 'forwarded' | 'quarantined' | 'ai_unavailable';
}
