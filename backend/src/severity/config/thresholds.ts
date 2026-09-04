// A fingerprint that fires more than this many times within the history TTL is flagged as noisy.
// "Fired >20 times in the last 7 days" -> threshold is 20.
export const NOISY_FREQUENCY_THRESHOLD = 20;

// Default TTL for historical frequency tracking in Redis.
// 7 days in seconds.
export const HISTORY_TTL_SECONDS = 7 * 24 * 60 * 60;
