import { bootstrapPipeline } from '../bootstrap';
import { handleNormalizedAlert } from '../ingest/handoff';
import { stopBatchScheduler } from '../batching/scheduler';
import { Alert } from '../types/alert.types';

// ─── Module-level store for the critical bypass callback ────────────────────
let criticalBypassCallback: ((incident: any) => Promise<void>) | null = null;

// ─── Mock all pipeline modules (no real I/O) ────────────────────────────────

jest.mock('../shared/redis.client', () => ({
  getRedisClient: jest.fn().mockReturnValue({
    quit: jest.fn().mockResolvedValue('OK'),
    flushall: jest.fn().mockResolvedValue('OK'),
    hgetall: jest.fn().mockResolvedValue(null),
    hset: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    del: jest.fn().mockResolvedValue(1),
    rpush: jest.fn().mockResolvedValue(1),
    ltrim: jest.fn().mockResolvedValue('OK'),
    lrange: jest.fn().mockResolvedValue([]),
    llen: jest.fn().mockResolvedValue(0),
  }),
  closeRedisClient: jest.fn(),
}));

jest.mock('../dedup', () => ({
  dedupe: jest.fn().mockImplementation(async (alert: Alert) => ({
    isDuplicate: false,
    alert,
    duplicateCount: 1,
    ttlSeconds: 300,
  })),
  setLifecycleHandler: jest.fn(),
}));

jest.mock('../lifecycle/lifecycle.service', () => ({
  trackLifecycle: jest.fn().mockImplementation(async (alert: Alert) => alert),
}));

jest.mock('../severity/severity.service', () => ({
  scoreSeverity: jest.fn().mockImplementation(async (alert: Alert) => ({
    ...alert,
    final_severity: alert.severity_score,
  })),
}));

jest.mock('../correlation', () => ({
  correlate: jest.fn().mockImplementation(async (alert: Alert) => ({
    incident_id: 'test-incident-001',
    severity: alert.severity_score,
    root_cause: alert,
    related_alerts: [],
    started_at: new Date().toISOString(),
    destinationChannel: 'slack',
  })),
}));

jest.mock('../safety-gate', () => ({
  applySafetyGate: jest.fn().mockResolvedValue({ forwarded: true }),
  setBatchingHandler: jest.fn(),
}));

jest.mock('../batching', () => ({
  submitToBatch: jest.fn().mockResolvedValue(undefined),
  // Capture the callback at the module level so clearAllMocks cannot destroy it
  setForwardCriticalCallback: jest.fn().mockImplementation((cb) => {
    criticalBypassCallback = cb;
  }),
}));

jest.mock('../batching/scheduler', () => ({
  startBatchScheduler: jest.fn(),
  stopBatchScheduler: jest.fn(),
}));

jest.mock('../cooldown', () => ({
  applyCooldown: jest.fn().mockResolvedValue({ allowed: true }),
}));

jest.mock('../router', () => ({
  route: jest.fn().mockResolvedValue(undefined),
}));
const router = require('../router');

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('End-to-End Pipeline Integration', () => {
  beforeAll(() => {
    bootstrapPipeline();
    // criticalBypassCallback is now captured from setForwardCriticalCallback mock
  });

  afterAll(() => {
    stopBatchScheduler();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should process a critical alert and bypass batching to router', async () => {
    const alert: Alert = {
      fingerprint: 'test-critical-e2e',
      alertname: 'HighCPU',
      service: 'api-gateway',
      labels: {},
      status: 'firing',
      source: 'prometheus',
      raw_payload: {},
      received_at: new Date().toISOString(),
      severity_score: 'critical',
      cluster_id: null,
      is_root_cause: true,
    };

    // Confirm the critical bypass callback was registered during bootstrapPipeline()
    expect(criticalBypassCallback).not.toBeNull();

    // Simulate a critical incident being forwarded from Batching → Cooldown → Router
    const incident = {
      incident_id: 'test-incident-001',
      severity: 'critical',
      root_cause: alert,
      related_alerts: [],
      started_at: new Date().toISOString(),
      destinationChannel: 'slack',
    };
    await criticalBypassCallback!(incident);

    // Cooldown allowed it through, so the router must have been called exactly once
    expect(router.route).toHaveBeenCalledTimes(1);
    const routedArg = router.route.mock.calls[0][0];
    expect(routedArg.severity).toBe('critical');
    expect(routedArg.root_cause.fingerprint).toBe('test-critical-e2e');
  }, 10000);
});
