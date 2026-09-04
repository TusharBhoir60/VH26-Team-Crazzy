import Redis from 'ioredis';
import { Alert } from '../types/alert.types';
import { SeverityResult, SeverityRuleContext } from './types';
import { getServiceCriticality } from './config/serviceCriticality';
import { incrementAndGetFrequency } from './historyStore';
import { runSeverityRules } from './rules';
import { logger } from '../shared/logger';

/**
 * Stage 4: Severity Assignment
 * Computes a final, authoritative severity for a first-occurrence alert.
 */
export async function scoreSeverity(
  alert: Alert,
  redis: Redis
): Promise<SeverityResult> {
  // If the alert is flapping or resolved, we usually don't re-score it as a new event, 
  // but we can just compute it anyway or pass it through.
  // The brief states: "Severity is computed once, at first occurrence".
  // Assuming the alert payload coming in is the first occurrence or we just compute it idempotently.

  // 1. Determine service criticality
  const serviceTier = getServiceCriticality(alert.service);
  if (serviceTier === 'unknown') {
    logger.warn(`Unrecognized service '${alert.service}' in severity stage. Defaulting to unknown but not deprioritizing.`);
  }

  // 2. Fetch historical frequency
  const historicalFrequencyCount = await incrementAndGetFrequency(alert.fingerprint, redis);

  const context: SeverityRuleContext = {
    alert,
    serviceTier,
    historicalFrequencyCount
  };

  // 3. Base severity is the source severity or 'unknown' if missing
  const baseSeverity = alert.severity_score || 'unknown';

  // 4. Run rules pipeline
  const { finalSeverity, appliedRules } = runSeverityRules(baseSeverity, context);

  // 5. Return enriched alert
  return {
    ...alert,
    final_severity: finalSeverity,
    applied_rules: appliedRules,
  };
}
