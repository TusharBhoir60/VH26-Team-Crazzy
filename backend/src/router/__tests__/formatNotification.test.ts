import { formatNotification } from '../formatNotification';
import { Alert, AlertStatus, BatchedGroup, Severity, Source, Incident } from '../../types/alert.types';

describe('formatNotification', () => {
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

  it('formats individual alerts correctly', () => {
    const text = formatNotification(baseIncident);
    expect(text).toContain('[WARNING] HighCPU');
    expect(text).toContain('Service: api-gateway');
    expect(text).toContain('Incident ID: fp1');
    expect(text).not.toContain('AI Analysis');
  });

  it('formats individual incidents with final severity overriding initial', () => {
    const text = formatNotification({ ...baseIncident, severity: 'critical' });
    expect(text).toContain('[CRITICAL] HighCPU');
  });

  it('includes AI narrative for individual incidents if present', () => {
    const text = formatNotification({
      ...baseIncident,
      ai_narrative: 'This is a test narrative.'
    });
    expect(text).toContain('AI Analysis:\nThis is a test narrative.');
  });

  it('formats batched groups correctly', () => {
    const batch: BatchedGroup = {
      id: 'batch-1',
      severity: 'critical',
      destinationChannel: 'pagerduty',
      incidents: [baseIncident, baseIncident],
      cooldown_suppressed_count: 5
    };

    const text = formatNotification(batch);
    expect(text).toContain('[CRITICAL] Batched Alert Group: batch-1');
    expect(text).toContain('Incidents in group: 2');
    expect(text).toContain('Cooldown suppressed: 5');
  });
});
