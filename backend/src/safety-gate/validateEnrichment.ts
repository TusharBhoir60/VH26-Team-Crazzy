import { Severity } from '../types/alert.types';
import { AiEnrichmentResult } from '../ai-layer/types';

/**
 * Canonical severity ordering (higher index = higher severity).
 * Used to compare deterministic vs AI-suggested severity levels.
 */
const SEVERITY_RANK: Record<Severity, number> = {
  unknown: 0,
  info: 1,
  warning: 2,
  critical: 3,
} as const;

export type ValidationResult =
  | { passed: true }
  | { passed: false; reason: string };

/**
 * Validates the AI enrichment result against Safety Gate rules 1 & 2:
 *
 * Rule 1: Critical severity is never downgraded.
 * Rule 2: AI may only escalate, never de-escalate.
 *
 * A result is valid if suggestedSeverity >= deterministicSeverity in rank.
 * A downgrade attempt (suggestedSeverity < deterministicSeverity) is a violation.
 *
 * @param deterministicSeverity - Severity from the Correlation Engine
 * @param aiResult - Validated AI enrichment result
 * @returns ValidationResult — passed: true for equal/escalation, false for downgrade
 */
export function validateEnrichment(
  deterministicSeverity: Severity,
  aiResult: AiEnrichmentResult
): ValidationResult {
  const deterministicRank = SEVERITY_RANK[deterministicSeverity];
  const aiRank = SEVERITY_RANK[aiResult.suggestedSeverity];

  if (aiRank >= deterministicRank) {
    // Equal severity or escalation — both allowed
    return { passed: true };
  }

  // Downgrade attempt — violation of rules 1 & 2
  return {
    passed: false,
    reason: `AI suggested severity '${aiResult.suggestedSeverity}' is lower than ` +
      `deterministic severity '${deterministicSeverity}' ` +
      `(rank ${aiRank} < ${deterministicRank}) — Safety Gate rule violation`,
  };
}

export { SEVERITY_RANK };
