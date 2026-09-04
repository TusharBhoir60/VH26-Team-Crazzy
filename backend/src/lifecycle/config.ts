export const FLAP_TRANSITION_THRESHOLD = 4; // 4 transitions within the window triggers flapping
export const FLAP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes in milliseconds
export const STALE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour without updates is considered stale

// Maximum duration an alert can flap before we force a consolidated summary
export const MAX_FLAP_DURATION_MS: Record<string, number> = {
  critical: 2 * 60 * 1000,   // 2 minutes for critical
  high: 5 * 60 * 1000,       // 5 minutes for high
  medium: 15 * 60 * 1000,    // 15 minutes for medium
  low: 30 * 60 * 1000,       // 30 minutes for low
  default: 15 * 60 * 1000,   // fallback
};
