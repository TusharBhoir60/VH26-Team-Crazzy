import { formatNotification } from '../formatNotification';
import { Alert, AlertStatus, BatchedGroup, Severity, Source } from '../../types/alert.types';

describe('formatNotification', () => {
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

  it('formats individual alerts correctly', () => {
    const text = formatNotification(baseAlert);
    expect(text).toContain('[WARNING] HighCPU');
    expect(text).toContain('Service: api-gateway');
    expect(text).toContain('Fingerprint: fp1');
    expect(text).not.toContain('AI Analysis');
  });

  it('formats individual alerts with final severity overriding initial', () => {
    const text = formatNotification({ ...baseAlert, final_severity: 'critical' });
    expect(text).toContain('[CRITICAL] HighCPU');
  });

  it('includes AI narrative for individual alerts if present', () => {
    const text = formatNotification({
      ...baseAlert,
      aiEnrichment: { narrative: 'This is a test narrative.' }
    });
    expect(text).toContain('AI Analysis:\nThis is a test narrative.');
  });

  it('formats batched groups correctly', () => {
    const batch: BatchedGroup = {
      id: 'batch-1',
      severity: 'critical',
      service: 'payment-service',
      incidents: [baseAlert, baseAlert],
      cooldown_suppressed_count: 5
    };

    const text = formatNotification(batch);
    expect(text).toContain('[CRITICAL] Batched Alert Group: batch-1');
    expect(text).toContain('Service: payment-service');
    expect(text).toContain('Incidents in group: 2');
    expect(text).toContain('Cooldown suppressed: 5');
  });
});
