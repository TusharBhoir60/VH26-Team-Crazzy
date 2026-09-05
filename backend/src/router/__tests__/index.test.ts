import { route } from '../index';
import * as retry from '../retry';
import { logger } from '../../shared/logger';
import { Alert, AlertStatus, Severity, Source, Incident } from '../../types/alert.types';
import { NotificationChannel } from '../../shared/channelMapping';

jest.mock('../retry', () => ({
  sendWithRetry: jest.fn()
}));
jest.mock('../../shared/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    warn: jest.fn(),
  }
}));

const mockRedis: any = {
  incr: jest.fn().mockResolvedValue(1)
};

const sampleRootCauseAlert: Alert = {
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

const baseIncident: Incident = {
  incident_id: 'fp1',
  root_cause: sampleRootCauseAlert,
  alerts: [sampleRootCauseAlert],
  severity: 'warning',
  summary: 'HighCPU',
  created_at: '2026-09-01T00:00:00Z',
};

describe('Router Index', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes a critical alert to PagerDuty', async () => {
    (retry.sendWithRetry as jest.Mock).mockResolvedValue(true);
    
    await route({ ...baseIncident, severity: 'critical' }, mockRedis);
    
    expect(retry.sendWithRetry).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('[CRITICAL] HighCPU'),
      expect.anything(),
      NotificationChannel.PAGERDUTY,
      expect.anything(),
      mockRedis
    );
  });

  it('routes a warning alert to Slack', async () => {
    (retry.sendWithRetry as jest.Mock).mockResolvedValue(true);
    
    await route({ ...baseIncident, severity: 'warning' }, mockRedis);
    
    expect(retry.sendWithRetry).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('[WARNING] HighCPU'),
      expect.anything(),
      NotificationChannel.SLACK,
      expect.anything(),
      mockRedis
    );
  });

  it('routes an info alert to Discord', async () => {
    (retry.sendWithRetry as jest.Mock).mockResolvedValue(true);
    
    await route({ ...baseIncident, severity: 'info' }, mockRedis);
    
    expect(retry.sendWithRetry).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('[INFO] HighCPU'),
      expect.anything(),
      NotificationChannel.DISCORD,
      expect.anything(),
      mockRedis
    );
  });

  it('logs a fatal error if critical delivery fails', async () => {
    (retry.sendWithRetry as jest.Mock).mockResolvedValue(false);
    
    await route({ ...baseIncident, severity: 'critical' }, mockRedis);
    
    expect(logger.fatal).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'pagerduty', severity: 'critical', incidentId: 'fp1' }),
      expect.stringContaining('CRITICAL ALERT DELIVERY FAILED')
    );
  });

  it('does not log fatal error if non-critical delivery fails', async () => {
    (retry.sendWithRetry as jest.Mock).mockResolvedValue(false);
    
    await route({ ...baseIncident, severity: 'warning' }, mockRedis);
    
    expect(logger.fatal).not.toHaveBeenCalled();
  });
});
