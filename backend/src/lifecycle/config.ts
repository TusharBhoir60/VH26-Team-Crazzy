export const FLAP_TRANSITION_THRESHOLD = 4; // 4 transitions within the window triggers flapping
export const FLAP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes in milliseconds
export const STALE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour without updates is considered stale

// Maximum duration an alert can flap before we force a consolidated summary
export const MAX_FLAP_DURATION_MS: Record<string, number> = {
  critical: 2 * 60 * 1000,   // 2 minutes for critical
  warning: 5 * 60 * 1000,    // 5 minutes for warning
  info: 15 * 60 * 1000,      // 15 minutes for info
  unknown: 15 * 60 * 1000,   // 15 minutes for unknown
  default: 15 * 60 * 1000,   // fallback
};

// Default TTL: 1 hour for active or flapping alerts
export const LIFECYCLE_TTL_SECONDS = 60 * 60;
// Grace period TTL: 5 minutes after resolution to allow downstream processing to finish
export const RESOLVED_TTL_SECONDS = 5 * 60;
