import { SeverityRule } from '../types';

export const serviceCriticalityRule: SeverityRule = (currentSeverity, context) => {
  // If tier-1 and source severity is warning, upgrade to critical.
  if (context.serviceTier === 'tier-1' && currentSeverity === 'warning') {
    return {
      severity: 'critical',
      ruleApplied: 'tier-1-warning-upgrade'
    };
  }

  // We could add more tier-based rules here in the future
  return null;
};
