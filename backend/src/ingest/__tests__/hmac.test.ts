import { computeHmacSignature, verifyHmacSignature } from '../../shared/crypto';

describe('HMAC Authentication & Crypto Utilities', () => {
  const secret = 'test-super-secret-key-12345';
  const payload = JSON.stringify({ message: 'database down', severity: 'critical' });

  it('should compute valid HMAC-SHA256 signature', () => {
    const signature = computeHmacSignature(payload, secret);
    expect(typeof signature).toBe('string');
    expect(signature.length).toBe(64); // sha256 hex string is 64 chars
  });

  it('should successfully verify a correct signature', () => {
    const signature = computeHmacSignature(payload, secret);
    const isValid = verifyHmacSignature(payload, signature, secret);
    expect(isValid).toBe(true);
  });

  it('should support signatures with sha256= prefix', () => {
    const signature = `sha256=${computeHmacSignature(payload, secret)}`;
    const isValid = verifyHmacSignature(payload, signature, secret);
    expect(isValid).toBe(true);
  });

  it('should reject incorrect signatures', () => {
    const badSignature = 'a'.repeat(64);
    const isValid = verifyHmacSignature(payload, badSignature, secret);
    expect(isValid).toBe(false);
  });

  it('should reject signatures signed with a different secret', () => {
    const signature = computeHmacSignature(payload, 'wrong-secret');
    const isValid = verifyHmacSignature(payload, signature, secret);
    expect(isValid).toBe(false);
  });

  it('should reject empty or malformed signatures', () => {
    expect(verifyHmacSignature(payload, '', secret)).toBe(false);
    expect(verifyHmacSignature(payload, 'short', secret)).toBe(false);
  });
});
