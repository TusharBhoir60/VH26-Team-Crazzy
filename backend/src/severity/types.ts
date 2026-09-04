import { Alert, Severity } from '../types/alert.types';

export interface SeverityRuleContext {
  alert: Alert;
  serviceTier: 'tier-1' | 'tier-2' | 'tier-3' | 'unknown';
  historicalFrequencyCount: number;
}

export interface RuleResult {
  severity: Severity;
  ruleApplied: string;
}

export interface SeverityResult extends Alert {
  final_severity: Severity;
  applied_rules: string[]; // Audit trail of rules that affected the severity
}

export type SeverityRule = (
  currentSeverity: Severity,
  context: SeverityRuleContext
) => RuleResult | null; // Returns null if rule didn't apply/change anything
