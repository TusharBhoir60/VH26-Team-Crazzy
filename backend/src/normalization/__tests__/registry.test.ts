import {
  normalizationRegistry,
  normalize,
  SourceAdapter,
  NormalizationResult,
  NormalizationError,
} from '../index';

describe('NormalizationRegistry', () => {
  it('should have built-in adapters registered for prometheus and datadog', () => {
    expect(normalizationRegistry.getAdapter('prometheus')).toBeDefined();
    expect(normalizationRegistry.getAdapter('alertmanager')).toBeDefined();
    expect(normalizationRegistry.getAdapter('datadog')).toBeDefined();
  });

  it('should support registering a new custom adapter (e.g. Grafana) without modifying core', async () => {
    const mockGrafanaAdapter: SourceAdapter = {
      sourceName: 'grafana',
      normalize: (rawPayload: unknown): NormalizationResult[] => {
        const payload = rawPayload as { title: string; state: string; ruleName?: string };
        return [
          {
            alert: {
              fingerprint: 'grafana-custom-fp-12345',
              alertname: payload.title || payload.ruleName || 'GrafanaAlert',
              service: 'grafana-monitored-service',
              labels: { source: 'grafana' },
              status: payload.state === 'ok' ? 'resolved' : 'firing',
              source: 'prometheus', // maps to internal source
              raw_payload: payload as unknown as Record<string, unknown>,
              received_at: new Date().toISOString(),
              severity_score: 'warning',
              cluster_id: null,
              is_root_cause: false,
            },
            warnings: [],
          },
        ];
      },
    };

    normalizationRegistry.registerAdapter(mockGrafanaAdapter, ['grafana-webhook']);

    const res = await normalize('grafana', { title: 'High Memory', state: 'alerting' });
    expect(res).toHaveLength(1);
    expect(res[0]?.alert.alertname).toBe('High Memory');
    expect(res[0]?.alert.severity_score).toBe('warning');

    const resAlias = await normalize('grafana-webhook', { title: 'High CPU', state: 'ok' });
    expect(resAlias).toHaveLength(1);
    expect(resAlias[0]?.alert.status).toBe('resolved');
  });

  it('should throw NormalizationError when calling unregistered source', async () => {
    await expect(normalize('non-existent-source', {})).rejects.toThrow(NormalizationError);
  });
});
