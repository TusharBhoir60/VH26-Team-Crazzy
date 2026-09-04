import { SeverityRule } from '../types';
import { NOISY_FREQUENCY_THRESHOLD } from '../config/thresholds';

export const frequencyRule: SeverityRule = (currentSeverity, context) => {
  // If historical frequency exceeds "known noisy" threshold, flag it.
  // We do NOT downgrade the severity, just append a rule tag to inform downstream/reviewers.
  if (context.historicalFrequencyCount > NOISY_FREQUENCY_THRESHOLD) {
    return {
      severity: currentSeverity, // Unchanged severity, preventing silent downgrades
      ruleApplied: 'noisy-fingerprint-flagged'
    };
  }

  return null;
};
