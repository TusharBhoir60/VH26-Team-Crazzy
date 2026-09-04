import { LifecycleHistory } from './types';
import { MAX_FLAP_DURATION_MS } from './config';

export interface FlapSummaryEvent {
  fingerprint: string;
  transitionsCount: number;
  timeRange: { start: string; end: string };
  reason: 'flap_settled' | 'max_duration_exceeded';
}

/**
 * Checks if a summary needs to be emitted for a flapping alert.
 */
export function checkFlappingSummary(
  fingerprint: string,
  history: LifecycleHistory,
  previousState: LifecycleHistory['state'],
  severity: string | null = 'default',
  nowMs: number = Date.now()
): FlapSummaryEvent | null {
  // If we were flapping and now we are not, it settled.
  if (previousState === 'flapping' && history.state !== 'flapping') {
    return createSummary(fingerprint, history, 'flap_settled');
  }

  // If we are still flapping, check if we've exceeded the max duration
  if (history.state === 'flapping') {
    const maxDuration = MAX_FLAP_DURATION_MS[severity || 'default'] || MAX_FLAP_DURATION_MS.default || 900000;
    
    // The duration is measured from the FIRST transition in our rolling window
    if (history.transitions.length > 0) {
      const firstTransitionMs = new Date(history.transitions[0]!.at).getTime();
      if (nowMs - firstTransitionMs > maxDuration) {
        return createSummary(fingerprint, history, 'max_duration_exceeded');
      }
    }
  }

  return null;
}

function createSummary(
  fingerprint: string, 
  history: LifecycleHistory, 
  reason: FlapSummaryEvent['reason']
): FlapSummaryEvent {
  const start = history.transitions.length > 0 ? history.transitions[0]!.at : new Date().toISOString();
  const end = history.transitions.length > 0 ? history.transitions[history.transitions.length - 1]!.at : new Date().toISOString();
  
  return {
    fingerprint,
    transitionsCount: history.transitions.length,
    timeRange: { start, end },
    reason
  };
}
