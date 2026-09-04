import { applyCooldown } from '../index';
import { Incident } from '../../correlation/types';
import { Alert } from '../../types/alert.types';

// Mock Redis for the test
const mockStorage = new Map<string, { value: string, expiresAt: number }>();

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    set: jest.fn().mockImplementation(async (key, value, mode, duration, flag) => {
      const now = Date.now();
      if (flag === 'NX') {
        const existing = mockStorage.get(key);
        if (existing && existing.expiresAt > now) {
          return null; // Key exists and hasn't expired, NX fails
        }
      }
      
      let expiresAt = Infinity;
      if (mode === 'PX') {
        expiresAt = now + duration;
      }
      
      mockStorage.set(key, { value: value.toString(), expiresAt });
      return 'OK';
    }),
    get: jest.fn().mockImplementation(async (key) => {
      const existing = mockStorage.get(key);
      if (existing && existing.expiresAt > Date.now()) {
        return existing.value;
      }
      return null;
    }),
    incr: jest.fn().mockImplementation(async (key) => {
      const existing = mockStorage.get(key);
      const now = Date.now();
      let val = 0;
      let expiresAt = Infinity;
      
      if (existing && existing.expiresAt > now) {
        val = parseInt(existing.value, 10);
        expiresAt = existing.expiresAt;
      }
      
      val += 1;
      mockStorage.set(key, { value: val.toString(), expiresAt });
      return val;
    }),
    quit: jest.fn().mockResolvedValue('OK')
  }));
});

const createMockIncident = (fingerprint: string, severity: any): Incident => ({
  incident_id: 'inc-123',
  root_cause: {
    fingerprint,
    alertname: 'TestAlert',
    service: 'db',
    labels: {},
    status: 'firing',
    source: 'prometheus',
    raw_payload: {},
    received_at: new Date().toISOString(),
    severity_score: severity,
    cluster_id: null,
    is_root_cause: true,
  } as Alert,
  alerts: [],
  severity,
  summary: 'Test',
  created_at: new Date().toISOString()
});

describe('Adaptive Cooldown', () => {
  beforeEach(() => {
    mockStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('allows the first notification through', async () => {
    const incident = createMockIncident('test-1', 'warning');
    const result = await applyCooldown(incident);
    expect(result.allowed).toBe(true);
    expect(result.suppressedCount).toBe(0);
  });

  it('suppresses subsequent notifications within the cooldown window', async () => {
    const incident = createMockIncident('test-2', 'warning');
    
    // First passes
    await applyCooldown(incident);
    
    // Second is suppressed
    const result2 = await applyCooldown(incident);
    expect(result2.allowed).toBe(false);
    expect(result2.suppressedCount).toBe(0); // reported as 0 during active cooldown
    
    // Third is suppressed
    const result3 = await applyCooldown(incident);
    expect(result3.allowed).toBe(false);
    expect(result3.suppressedCount).toBe(0);
  });

  it('allows critical incidents through much faster', async () => {
    const incident = createMockIncident('test-3', 'critical'); // 30s cooldown
    
    // First passes
    await applyCooldown(incident);
    
    // Suppressed within 30s
    jest.advanceTimersByTime(10 * 1000);
    expect((await applyCooldown(incident)).allowed).toBe(false);

    // Allowed after 30s
    jest.advanceTimersByTime(21 * 1000); // total 31s
    const result = await applyCooldown(incident);
    expect(result.allowed).toBe(true);
    expect(result.suppressedCount).toBe(1); // One was suppressed
  });

  it('reports suppressed count on expiry and resets', async () => {
    const incident = createMockIncident('test-4', 'info'); // 30 min cooldown
    
    await applyCooldown(incident);
    
    // Simulate 3 suppressed incidents
    await applyCooldown(incident);
    await applyCooldown(incident);
    await applyCooldown(incident);
    
    // Advance past 30 minutes but before 31 minute count TTL
    jest.advanceTimersByTime(30 * 60 * 1000 + 1000);
    
    const result = await applyCooldown(incident);
    expect(result.allowed).toBe(true);
    expect(result.suppressedCount).toBe(3);
    
    // If another arrives immediately, it should be suppressed with 0 reported
    const resultNext = await applyCooldown(incident);
    expect(resultNext.allowed).toBe(false);
    
    // Fast forward again to see 1 suppressed
    jest.advanceTimersByTime(30 * 60 * 1000 + 1000);
    const finalResult = await applyCooldown(incident);
    expect(finalResult.allowed).toBe(true);
    expect(finalResult.suppressedCount).toBe(1);
  });

  it('throws an error if root cause fingerprint is missing', async () => {
    const incident = createMockIncident('', 'low');
    incident.root_cause.fingerprint = ''; // Empty string
    
    await expect(applyCooldown(incident)).rejects.toThrow('missing a root_cause fingerprint');
  });
});
