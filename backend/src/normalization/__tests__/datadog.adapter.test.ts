import { DatadogAdapter } from '../adapters/datadog';
import { NormalizationError } from '../types';
import datadogErrorFixture from '../../__fixtures__/datadog/01-normal-critical.json';
import datadogWarningFixture from '../../__fixtures__/datadog/01-normal-warning.json';

describe('DatadogAdapter', () => {
  const adapter = new DatadogAdapter();

  it('should have sourceName set to datadog', () => {
    expect(adapter.sourceName).toBe('datadog');
  });

  it('should cleanly normalize standard Datadog error payload', () => {
    const results = adapter.normalize(datadogErrorFixture);
    expect(results).toHaveLength(1);

    const res = results[0];
    expect(res?.alert.alertname).toBe('Database Down');
    expect(res?.alert.service).toBe('primary-db');
    expect(res?.alert.status).toBe('firing');
    expect(res?.alert.severity_score).toBe('critical');
    expect(res?.alert.source).toBe('datadog');
    expect(res?.alert.labels['env']).toBe('production');
    expect(res?.alert.fingerprint.length).toBe(64);
  });

  it('should guarantee deterministic and stable fingerprint derivation across multiple calls', () => {
    const res1 = adapter.normalize(datadogErrorFixture)[0];
    const res2 = adapter.normalize(datadogErrorFixture)[0];

    expect(res1?.alert.fingerprint).toBe(res2?.alert.fingerprint);

    // Permute tag order in payload: fingerprint should remain identical due to sorted keys
    const reorderedPayload = {
      ...datadogErrorFixture,
      tags: [
        'severity:critical',
        'env:production',
        'service:primary-db',
      ],
    };

    const resReordered = adapter.normalize(reorderedPayload)[0];
    expect(resReordered?.alert.fingerprint).toBe(res1?.alert.fingerprint);
  });

  it('should normalize warning and comma-separated tags', () => {
    const results = adapter.normalize(datadogWarningFixture);
    expect(results).toHaveLength(1);

    const res = results[0];
    expect(res?.alert.alertname).toBe('High CPU');
    expect(res?.alert.service).toBe('cache-service');
    expect(res?.alert.status).toBe('firing');
    expect(res?.alert.severity_score).toBe('medium');
    expect(res?.alert.labels['env']).toBe('production');
  });

  it('should handle unmapped priority/alert_type gracefully with warning and null severity', () => {
    const payload = {
      title: 'Flaky Worker Ping',
      alert_type: 'custom_unknown_type',
      tags: ['service:worker'],
    };

    const results = adapter.normalize(payload);
    expect(results).toHaveLength(1);
    expect(results[0]?.alert.alertname).toBe('Flaky Worker Ping');
    expect(results[0]?.alert.severity_score).toBeNull();
    expect(results[0]?.warnings.length).toBeGreaterThan(0);
    expect(results[0]?.warnings.some((w) => w.includes('Unrecognized Datadog priority/alert_type'))).toBe(true);
  });

  it('should hard-reject payload missing required title with NormalizationError', () => {
    expect(() => adapter.normalize(null)).toThrow(NormalizationError);
    expect(() => adapter.normalize({})).toThrow(NormalizationError);
    expect(() => adapter.normalize({ body: 'some body without title' })).toThrow(NormalizationError);
    expect(() => adapter.normalize({ title: '   ' })).toThrow(NormalizationError);
  });
});
