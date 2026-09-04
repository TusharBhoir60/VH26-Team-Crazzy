import { scoreSeverity } from '../severity.service';
import { Alert } from '../../types/alert.types';
import Redis from 'ioredis';

// Mock Redis
jest.mock('ioredis');

describe('Severity Service', () => {
  let redis: jest.Mocked<Redis>;

  beforeEach(() => {
    redis = new Redis() as jest.Mocked<Redis>;
    
    // Mock the multi chain
    const multiMock = {
      incr: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([[null, 1]]) // Returns frequency 1
    };
    redis.multi = jest.fn().mockReturnValue(multiMock) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should process a standard warning alert on tier-3 without upgrading', async () => {
    const alert: Alert = {
      fingerprint: 'test-1',
      alertname: 'HighCPU',
      service: 'frontend', // tier-3
      labels: {},
      status: 'firing',
      source: 'prometheus',
      raw_payload: {},
      received_at: '2023-01-01',
      severity_score: 'warning',
      cluster_id: null,
      is_root_cause: false
    };

    const result = await scoreSeverity(alert, redis);
    expect(result.final_severity).toBe('warning');
    expect(result.applied_rules).toHaveLength(0);
  });

  it('should upgrade warning to critical for tier-1 service', async () => {
    const alert: Alert = {
      fingerprint: 'test-1',
      alertname: 'HighCPU',
      service: 'auth-service', // tier-1
      labels: {},
      status: 'firing',
      source: 'prometheus',
      raw_payload: {},
      received_at: '2023-01-01',
      severity_score: 'warning',
      cluster_id: null,
      is_root_cause: false
    };

    const result = await scoreSeverity(alert, redis);
    expect(result.final_severity).toBe('critical');
    expect(result.applied_rules).toContain('tier-1-warning-upgrade');
  });

  it('should fallback cleanly if Redis fails', async () => {
    // Break Redis mock
    const multiMock = {
      incr: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockRejectedValue(new Error('Redis connection lost'))
    };
    redis.multi = jest.fn().mockReturnValue(multiMock) as any;

    const alert: Alert = {
      fingerprint: 'test-2',
      alertname: 'Test',
      service: 'payments-service', // tier-1
      labels: {},
      status: 'firing',
      source: 'prometheus',
      raw_payload: {},
      received_at: '2023-01-01',
      severity_score: 'warning',
      cluster_id: null,
      is_root_cause: false
    };

    // Should still evaluate the tier-1 rule correctly even with Redis down (history count defaults to 1)
    const result = await scoreSeverity(alert, redis);
    expect(result.final_severity).toBe('critical');
  });
});
