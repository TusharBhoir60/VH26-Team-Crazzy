import axios from 'axios';
import { PagerDutyAdapter } from '../adapters/pagerduty';
import { SlackAdapter } from '../adapters/slack';
import { DiscordAdapter } from '../adapters/discord';
import { Alert, AlertStatus, Severity, Source, Incident } from '../../types/alert.types';

jest.mock('axios');

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

describe('Channel Adapters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PagerDutyAdapter', () => {
    it('returns success when API returns 2xx', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ status: 202, data: { dedup_key: 'msg1' } });
      const adapter = new PagerDutyAdapter('dummy_key');
      
      const result = await adapter.send('test content', baseIncident);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg1');
      expect(axios.post).toHaveBeenCalledWith(
        'https://events.pagerduty.com/v2/enqueue',
        expect.objectContaining({
          routing_key: 'dummy_key',
          payload: expect.objectContaining({ summary: 'test content' })
        }),
        expect.any(Object)
      );
    });

    it('identifies 429 as retryable', async () => {
      const error: any = new Error();
      error.response = { status: 429, data: 'Rate limited' };
      (axios.post as jest.Mock).mockRejectedValue(error);
      
      const adapter = new PagerDutyAdapter('dummy_key');
      const result = await adapter.send('test content', baseIncident);
      
      expect(result.success).toBe(false);
      expect(result.retryable).toBe(true);
    });
  });

  describe('SlackAdapter', () => {
    it('returns success when API returns 2xx', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ status: 200, data: 'ok' });
      const adapter = new SlackAdapter('https://hooks.slack.com/services/dummy');
      
      const result = await adapter.send('test content', baseIncident);
      
      expect(result.success).toBe(true);
      expect(axios.post).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/dummy',
        { text: 'test content' },
        expect.any(Object)
      );
    });
  });

  describe('DiscordAdapter', () => {
    it('returns success when API returns 2xx', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ status: 204 });
      const adapter = new DiscordAdapter('https://discord.com/api/webhooks/dummy');
      
      const result = await adapter.send('test content', baseIncident);
      
      expect(result.success).toBe(true);
      expect(axios.post).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/dummy',
        { content: 'test content' },
        expect.any(Object)
      );
    });
  });
});
