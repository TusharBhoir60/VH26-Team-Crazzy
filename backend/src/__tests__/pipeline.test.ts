import { bootstrapPipeline } from '../bootstrap';
import { handleNormalizedAlert } from '../ingest/handoff';
import { stopBatchScheduler } from '../batching/scheduler';
import { getRedisClient } from '../shared/redis.client';
import { Alert } from '../types/alert.types';
import { NotificationChannel } from '../shared/channelMapping';

// We mock the router so we don't send real alerts
jest.mock('../router', () => ({
  route: jest.fn(),
}));
const router = require('../router');

describe('End-to-End Pipeline Integration', () => {
  let redis: any;

  beforeAll(async () => {
    redis = getRedisClient();
    bootstrapPipeline();
  });

  afterAll(async () => {
    stopBatchScheduler();
    await redis.quit();
  });

  afterEach(async () => {
    await redis.flushall();
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

    // Push into the pipeline
    await handleNormalizedAlert(alert);

    // Wait a short tick for async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Assert that the router was called
    expect(router.route).toHaveBeenCalledTimes(1);
    
    // The incident passed to route should have the correct severity
    const routedArg = router.route.mock.calls[0][0];
    expect(routedArg.severity).toBe('critical');
    
    // Root cause should be preserved
    expect(routedArg.root_cause.fingerprint).toBe('test-critical-e2e');
  });
});
