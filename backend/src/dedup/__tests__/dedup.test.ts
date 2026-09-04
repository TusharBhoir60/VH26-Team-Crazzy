import { DedupEngine, setLifecycleHandler } from '../index';
import { DedupRedisService } from '../redisClient';
import { Alert } from '../../types/alert.types';

describe('DedupEngine & Deduplication Logic', () => {
  let mockStore: Map<string, Record<string, string>>;
  let mockRedisClient: any;
  let redisService: DedupRedisService;
  let dedupEngine: DedupEngine;
  let lifecycleForwarded: Alert[];

  const createSampleAlert = (overrides: Partial<Alert> = {}): Alert => ({
    fingerprint: 'test-fingerprint-abc-123',
    alertname: 'PostgresHighConnections',
    service: 'database',
    labels: { env: 'production', alertname: 'PostgresHighConnections' },
    status: 'firing',
    source: 'prometheus',
    raw_payload: {},
    received_at: new Date().toISOString(),
    severity_score: 'critical',
    cluster_id: null,
    is_root_cause: false,
    ...overrides,
  });

  beforeEach(() => {
    mockStore = new Map();
    lifecycleForwarded = [];

    mockRedisClient = {
      hgetall: jest.fn(async (key: string) => {
        return mockStore.get(key) || {};
      }),
      hget: jest.fn(async (key: string, field: string) => {
        const item = mockStore.get(key);
        return item ? item[field] : null;
      }),
      del: jest.fn(async (key: string) => {
        mockStore.delete(key);
        return 1;
      }),
      multi: jest.fn(() => {
        const multiOperations: Array<() => any> = [];
        const multiObj: any = {
          hset: jest.fn((key: string, data: Record<string, string>) => {
            multiOperations.push(() => {
              const existing = mockStore.get(key) || {};
              mockStore.set(key, { ...existing, ...data });
              return 'OK';
            });
            return multiObj;
          }),
          hincrby: jest.fn((key: string, field: string, increment: number) => {
            multiOperations.push(() => {
              const existing = mockStore.get(key) || {};
              const current = parseInt(existing[field] || '0', 10);
              const newVal = current + increment;
              mockStore.set(key, { ...existing, [field]: String(newVal) });
              return newVal;
            });
            return multiObj;
          }),
          expire: jest.fn((_key: string, _ttl: number) => {
            multiOperations.push(() => 1);
            return multiObj;
          }),
          exec: jest.fn(async () => {
            return multiOperations.map((op) => [null, op()]);
          }),
        };
        return multiObj;
      }),
    };

    redisService = new DedupRedisService(mockRedisClient);
    dedupEngine = new DedupEngine(redisService);

    setLifecycleHandler(async (alert: Alert) => {
      lifecycleForwarded.push(alert);
      return alert;
    });
  });

  it('should treat first-occurrence alert as non-duplicate and forward to Lifecycle', async () => {
    const alert = createSampleAlert();
    const result = await dedupEngine.dedupe(alert);

    expect(result.isDuplicate).toBe(false);
    expect(result.count).toBe(1);
    expect(result.suppressed).toBe(false);
    expect(result.ttlSeconds).toBe(60); // critical -> 60s
    expect(lifecycleForwarded).toHaveLength(1);
    expect(lifecycleForwarded[0]?.fingerprint).toBe(alert.fingerprint);
  });

  it('should suppress repeat occurrences, increment counter, and NOT forward to Lifecycle', async () => {
    const alert = createSampleAlert();

    // 1. First firing
    const res1 = await dedupEngine.dedupe(alert);
    expect(res1.isDuplicate).toBe(false);
    expect(res1.count).toBe(1);
    expect(lifecycleForwarded).toHaveLength(1);

    // 2. Second firing (duplicate)
    const res2 = await dedupEngine.dedupe(alert);
    expect(res2.isDuplicate).toBe(true);
    expect(res2.count).toBe(2);
    expect(res2.suppressed).toBe(true);
    expect(lifecycleForwarded).toHaveLength(1); // Lifecycle still only received first occurrence!

    // 3. Third firing (duplicate)
    const res3 = await dedupEngine.dedupe(alert);
    expect(res3.isDuplicate).toBe(true);
    expect(res3.count).toBe(3);
    expect(res3.suppressed).toBe(true);
    expect(lifecycleForwarded).toHaveLength(1);
  });

  it('should apply severity-scaled TTLs correctly', async () => {
    // Critical -> 60s
    const critAlert = createSampleAlert({ fingerprint: 'fp-crit', severity_score: 'critical' });
    const resCrit = await dedupEngine.dedupe(critAlert);
    expect(resCrit.ttlSeconds).toBe(60);

    // Warning -> 300s
    const warnAlert = createSampleAlert({ fingerprint: 'fp-warn', severity_score: 'warning' });
    const resWarn = await dedupEngine.dedupe(warnAlert);
    expect(resWarn.ttlSeconds).toBe(300);

    // Info -> 900s
    const infoAlert = createSampleAlert({ fingerprint: 'fp-info', severity_score: 'info' });
    const resInfo = await dedupEngine.dedupe(infoAlert);
    expect(resInfo.ttlSeconds).toBe(900);

    // Unknown -> 300s (default)
    const unkAlert = createSampleAlert({ fingerprint: 'fp-unk', severity_score: 'unknown' });
    const resUnk = await dedupEngine.dedupe(unkAlert);
    expect(resUnk.ttlSeconds).toBe(300);
  });

  it('should re-scale TTL when duplicate escalates severity mid-window', async () => {
    const alertInfo = createSampleAlert({ fingerprint: 'fp-escalate', severity_score: 'info' });
    const res1 = await dedupEngine.dedupe(alertInfo);
    expect(res1.ttlSeconds).toBe(900);

    // Duplicate arrives escalated to critical
    const alertCrit = createSampleAlert({ fingerprint: 'fp-escalate', severity_score: 'critical' });
    const res2 = await dedupEngine.dedupe(alertCrit);
    expect(res2.isDuplicate).toBe(true);
    expect(res2.count).toBe(2);
    expect(res2.ttlSeconds).toBe(60); // Rescaled to critical TTL (60s)
  });

  it('should pass resolved events directly through to Lifecycle and clear Redis entry', async () => {
    const firingAlert = createSampleAlert({ fingerprint: 'fp-resolve-test' });
    await dedupEngine.dedupe(firingAlert);
    expect(lifecycleForwarded).toHaveLength(1);

    const resolvedAlert = createSampleAlert({ fingerprint: 'fp-resolve-test', status: 'resolved' });
    const res = await dedupEngine.dedupe(resolvedAlert);

    expect(res.isDuplicate).toBe(false);
    expect(res.suppressed).toBe(false);
    expect(lifecycleForwarded).toHaveLength(2);
    expect(lifecycleForwarded[1]?.status).toBe('resolved');
    expect(mockRedisClient.del).toHaveBeenCalled();
  });

  it('should fail-open when Redis errors, forwarding the alert to ensure zero dropped emergencies', async () => {
    const brokenRedisClient = {
      hgetall: jest.fn(async () => {
        throw new Error('Connection to Redis refused: ECONNREFUSED');
      }),
    };

    const brokenService = new DedupRedisService(brokenRedisClient as any);
    const resilientEngine = new DedupEngine(brokenService);

    const alert = createSampleAlert({ fingerprint: 'fp-redis-down' });
    const result = await resilientEngine.dedupe(alert);

    expect(result.isDuplicate).toBe(false);
    expect(result.suppressed).toBe(false);
    expect(lifecycleForwarded).toHaveLength(1);
    expect(lifecycleForwarded[0]?.fingerprint).toBe(alert.fingerprint);
  });
});
