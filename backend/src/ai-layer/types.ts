import { Severity } from '../types/alert.types';

/**
 * Structured enrichment result returned by the AI Layer (Groq).
 * All three fields are required — a response missing any is treated as malformed.
 */
export interface AiEnrichmentResult {
  /** AI's suggestion of which service/alert is the root cause */
  rootCauseSuggestion: string;
  /**
   * AI's severity suggestion. Safety Gate enforces that this may only
   * equal or escalate the deterministic severity — never downgrade it.
   */
  suggestedSeverity: Severity;
  /** Human-readable narrative summarizing the incident */
  narrative: string;
}
