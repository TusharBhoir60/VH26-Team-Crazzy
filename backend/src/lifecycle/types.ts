import { Alert } from '../types/alert.types';

export type LifecycleState = 'firing' | 'flapping' | 'stale' | 'resolved';

export interface Transition {
  state: LifecycleState;
  at: string; // ISO8601 timestamp
}

export interface LifecycleHistory {
  state: LifecycleState;
  transitions: Transition[];
  lastTransitionAt: string; // ISO8601 timestamp
}

export interface LifecycleResult extends Alert {
  lifecycle_state?: LifecycleState; // The current computed state of the alert
  is_flapping?: boolean;            // Convenience flag
}
