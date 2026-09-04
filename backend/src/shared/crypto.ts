import crypto from 'crypto';

/**
 * Computes a deterministic SHA-256 fingerprint for an alert based on alertname and sorted labels.
 */
export function computeFingerprint(alertname: string, labels: Record<string, string>): string {
  const sortedKeys = Object.keys(labels).sort();
  const serializedLabels = sortedKeys.map((k) => `${k}=${labels[k]}`).join(',');
  const input = `${alertname}:${serializedLabels}`;
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Computes HMAC-SHA256 signature for a raw payload string/buffer given a secret key.
 */
export function computeHmacSignature(payload: Buffer | string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verifies an HMAC-SHA256 signature in constant time.
 * Handles hex-encoded signatures, with or without 'sha256=' prefix.
 */
export function verifyHmacSignature(
  rawBody: Buffer | string,
  providedSignature: string,
  secret: string
): boolean {
  if (!providedSignature || !secret) {
    return false;
  }

  // Normalize provided signature (strip optional 'sha256=' or 'sha256:' prefix)
  const cleanProvided = providedSignature.replace(/^sha256[=:]/i, '').trim();

  const expectedSignature = computeHmacSignature(rawBody, secret);

  const providedBuffer = Buffer.from(cleanProvided, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (providedBuffer.length !== expectedBuffer.length || providedBuffer.length === 0) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}
