import { SeverityRule, SeverityRuleContext } from '../types';
import { Severity } from '../../types/alert.types';
import { serviceCriticalityRule } from './serviceCriticalityRule';
import { frequencyRule } from './frequencyRule';

// The rules pipeline applied in order.
const RULES_PIPELINE: SeverityRule[] = [
  serviceCriticalityRule,
  frequencyRule,
];

// Helper to determine if a severity is being downgraded from critical
function isIllegalDowngrade(oldSev: Severity, newSev: Severity): boolean {
  return oldSev === 'critical' && newSev !== 'critical';
}

export function runSeverityRules(
  initialSeverity: Severity,
  context: SeverityRuleContext
): { finalSeverity: Severity; appliedRules: string[] } {
  let currentSeverity = initialSeverity;
  const appliedRules: string[] = [];

  for (const rule of RULES_PIPELINE) {
    const result = rule(currentSeverity, context);
    
    if (result) {
      // Rule 4 Guarantee: Zero missed critical alerts.
      // A rule cannot downgrade a critical alert.
      if (isIllegalDowngrade(currentSeverity, result.severity)) {
        // We still record that the rule fired (e.g. for noisy flagging), 
        // but we reject the severity downgrade.
        appliedRules.push(`${result.ruleApplied} (severity downgrade rejected)`);
      } else {
        currentSeverity = result.severity;
        appliedRules.push(result.ruleApplied);
      }
    }
  }

  return {
    finalSeverity: currentSeverity,
    appliedRules
  };
}
