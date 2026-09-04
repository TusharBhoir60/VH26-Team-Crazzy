import { getRedisClient } from '../shared/redis.client';

/**
 * Checks if the fingerprint is in a cooldown window.
 * If not, it applies the new cooldown TTL and returns the number of incidents
 * suppressed during the PREVIOUS cooldown window (if any).
 * If it is in cooldown, it increments the suppression counter and denies.
 */
export async function checkAndApplyCooldown(
  fingerprint: string,
  cooldownMs: number
): Promise<{ allowed: boolean; suppressedCount: number }> {
  const redis = getRedisClient();
  const cooldownKey = `cooldown:${fingerprint}`;
  const countKey = `cooldown:${fingerprint}:suppressed_count`;

  // Attempt to set the cooldown key. NX ensures it only sets if it doesn't exist.
  // PX sets the expiry in milliseconds.
  const setnxResult = await redis.set(cooldownKey, '1', 'PX', cooldownMs, 'NX');

  if (setnxResult === 'OK') {
    // It was not in cooldown, so we are allowed to notify.
    // We retrieve any suppressed count from the *previous* cooldown window.
    const oldCountStr = await redis.get(countKey);
    const suppressedCount = oldCountStr ? parseInt(oldCountStr, 10) : 0;
    
    // Reset the count for this new cooldown window.
    // We give it a TTL slightly longer (+60 seconds) than the cooldown key.
    // This ensures that when the cooldown key expires, the count key is still around
    // long enough for the NEXT notification to read the suppressed count.
    await redis.set(countKey, '0', 'PX', cooldownMs + 60000);
    
    return { allowed: true, suppressedCount };
  } else {
    // It is currently in a cooldown window.
    // Increment the suppression counter. INCR does not affect the existing TTL.
    await redis.incr(countKey);
    
    // We return 0 for suppressedCount here because the caller shouldn't report it yet.
    // It will be reported when the cooldown expires and the next notification is allowed.
    return { allowed: false, suppressedCount: 0 };
  }
}

// Exported for testing purposes
export function closeRedisConnection() {
  const redis = getRedisClient();
  return redis.quit();
}
