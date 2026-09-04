import { sendWithRetry } from '../retry';
import { ChannelAdapter, DeliveryResult } from '../types';
import * as deadletter from '../deadletter';
import { Alert, AlertStatus, Severity, Source } from '../../types/alert.types';

jest.mock('../deadletter', () => ({
  storeDeadLetter: jest.fn()
}));

const mockAdapter: ChannelAdapter = {
  send: jest.fn()
};

const mockRedis: any = {};

const baseAlert: Alert = {
  fingerprint: 'fp1',
  alertname: 'HighCPU',
  service: 'api-gateway',
  labels: {},
  status: 'firing',
  source: 'datadog',
  raw_payload: {},
  received_at: '2026-09-01T00:00:00Z',
  severity_score: 'warning',
  cluster_id: null,
  is_root_cause: true,
};

describe('sendWithRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delivers successfully on first attempt', async () => {
    (mockAdapter.send as jest.Mock).mockResolvedValue({ success: true });

    const result = await sendWithRetry(mockAdapter, 'test', baseAlert, 'slack', { maxRetries: 2, initialBackoffMs: 10 }, mockRedis);

    expect(result).toBe(true);
    expect(mockAdapter.send).toHaveBeenCalledTimes(1);
    expect(deadletter.storeDeadLetter).not.toHaveBeenCalled();
  });

  it('retries on transient failure and succeeds', async () => {
    (mockAdapter.send as jest.Mock)
      .mockResolvedValueOnce({ success: false, retryable: true, error: 'Network error' })
      .mockResolvedValueOnce({ success: true });

    const result = await sendWithRetry(mockAdapter, 'test', baseAlert, 'slack', { maxRetries: 2, initialBackoffMs: 10 }, mockRedis);

    expect(result).toBe(true);
    expect(mockAdapter.send).toHaveBeenCalledTimes(2);
    expect(deadletter.storeDeadLetter).not.toHaveBeenCalled();
  });

  it('dead-letters after exhausting retries', async () => {
    (mockAdapter.send as jest.Mock).mockResolvedValue({ success: false, retryable: true, error: 'Timeout' });

    const result = await sendWithRetry(mockAdapter, 'test', baseAlert, 'pagerduty', { maxRetries: 1, initialBackoffMs: 10 }, mockRedis);

    expect(result).toBe(false);
    expect(mockAdapter.send).toHaveBeenCalledTimes(2); // Initial + 1 retry
    expect(deadletter.storeDeadLetter).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'pagerduty',
        error: 'Timeout',
        retryCount: 1
      }),
      mockRedis
    );
  });

  it('skips retries and dead-letters for non-retryable errors', async () => {
    (mockAdapter.send as jest.Mock).mockResolvedValue({ success: false, retryable: false, error: 'Bad Request' });

    const result = await sendWithRetry(mockAdapter, 'test', baseAlert, 'pagerduty', { maxRetries: 2, initialBackoffMs: 10 }, mockRedis);

    expect(result).toBe(false);
    expect(mockAdapter.send).toHaveBeenCalledTimes(1);
    expect(deadletter.storeDeadLetter).toHaveBeenCalled();
  });
});
