import { AlertStatus } from '../types/alert.types';
import { LifecycleHistory, LifecycleState, Transition } from './types';
import { FLAP_TRANSITION_THRESHOLD, FLAP_WINDOW_MS, STALE_TIMEOUT_MS } from './config';

/**
 * Pure function to evaluate the next lifecycle state based on incoming alert status and previous history.
 * @param incomingStatus The status reported by the source (e.g., 'firing' or 'resolved')
 * @param history The previous lifecycle history, if any.
 * @param nowMs Current timestamp in milliseconds (for pure testing)
 * @returns The new LifecycleHistory
 */
export function evaluateState(
  incomingStatus: AlertStatus,
  history: LifecycleHistory | null,
  nowMs: number = Date.now()
): LifecycleHistory {
  const nowStr = new Date(nowMs).toISOString();

  // 1. Initial State (No history)
  if (!history) {
    const initialState: LifecycleState = incomingStatus === 'resolved' ? 'resolved' : 'firing';
    return {
      state: initialState,
      transitions: [{ state: initialState, at: nowStr }],
      lastTransitionAt: nowStr,
    };
  }

  const { state: currentState, transitions } = history;
  let nextState: LifecycleState = currentState;

  // We only care about actual state changes from the source to count as a transition
  // e.g., firing -> resolved, or resolved -> firing
  // If the proxy's current state is 'flapping' or 'stale', we still map the source's intent 
  // (firing/resolved) to determine if it's a real transition.
  const lastSourceIntent = transitions.length > 0 
    ? (transitions[transitions.length - 1]!.state === 'resolved' ? 'resolved' : 'firing')
    : 'firing';

  const isNewSourceTransition = (incomingStatus === 'resolved' && lastSourceIntent === 'firing') || 
                                (incomingStatus === 'firing' && lastSourceIntent === 'resolved');

  // Update transitions if there is a new source transition
  let updatedTransitions = [...transitions];
  if (isNewSourceTransition) {
    updatedTransitions.push({
      state: incomingStatus === 'resolved' ? 'resolved' : 'firing',
      at: nowStr
    });
  }

  // Prune transitions older than the FLAP_WINDOW_MS to keep history small and relevant
  updatedTransitions = updatedTransitions.filter(
    (t) => nowMs - new Date(t.at).getTime() <= FLAP_WINDOW_MS
  );

  // Check for Stale state (only applies if we are not explicitly resolved)
  if (incomingStatus !== 'resolved') {
    const timeSinceLastTransition = nowMs - new Date(history.lastTransitionAt).getTime();
    if (timeSinceLastTransition > STALE_TIMEOUT_MS) {
      nextState = 'stale';
    }
  }

  // 2. Evaluate Flapping
  // If we have >= FLAP_TRANSITION_THRESHOLD transitions in the window
  if (updatedTransitions.length >= FLAP_TRANSITION_THRESHOLD) {
    nextState = 'flapping';
  } else {
    // If we were flapping, but transitions have quieted down (fewer than threshold in window)
    if (currentState === 'flapping' && updatedTransitions.length < FLAP_TRANSITION_THRESHOLD) {
      // Fall back to the incoming status intent
      nextState = incomingStatus === 'resolved' ? 'resolved' : 'firing';
    }
  }

  // 3. Evaluate Direct Resolution
  if (incomingStatus === 'resolved' && nextState !== 'flapping') {
    nextState = 'resolved';
  } else if (incomingStatus === 'firing' && nextState !== 'flapping' && nextState !== 'stale') {
     nextState = 'firing';
  }

  // Check if our computed nextState is different from the history state to record a proxy state transition
  if (nextState !== currentState) {
     // We do NOT add proxy states ('flapping', 'stale') to the source transitions array,
     // because the transitions array is strictly for tracking source oscillation (firing <-> resolved).
     // The proxy state is just the top-level computed result.
     return {
       state: nextState,
       transitions: updatedTransitions,
       lastTransitionAt: nowStr
     };
  }

  return {
    state: currentState,
    transitions: updatedTransitions,
    // Keep original lastTransitionAt if the proxy state didn't change, 
    // unless there was a new source transition, in which case we update it so we know it's not stale
    lastTransitionAt: isNewSourceTransition ? nowStr : history.lastTransitionAt
  };
}
