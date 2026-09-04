// Re-export canonical types from shared source
export { Incident, SafetyViolationDetail } from '../types/alert.types';
import { Incident } from '../types/alert.types';

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
