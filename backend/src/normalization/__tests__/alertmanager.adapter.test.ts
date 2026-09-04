import { AlertmanagerAdapter } from '../adapters/alertmanager';
import { NormalizationError } from '../types';
import prometheusFiringFixture from '../../ingest/__fixtures__/prometheus-firing.json';
import prometheusResolvedFixture from '../../ingest/__fixtures__/prometheus-resolved.json';

describe('AlertmanagerAdapter', () => {
  const adapter = new AlertmanagerAdapter();

  it('should have sourceName set to prometheus', () => {
    expect(adapter.sourceName).toBe('prometheus');
  });

  it('should cleanly normalize standard Prometheus firing payload', () => {
    const results = adapter.normalize(prometheusFiringFixture);
    expect(results).toHaveLength(2);

    const res1 = results[0];
    expect(res1?.alert.alertname).toBe('PostgresHighConnectionCount');
    expect(res1?.alert.service).toBe('database');
    expect(res1?.alert.status).toBe('firing');
    expect(res1?.alert.severity_score).toBe('critical');
    expect(res1?.alert.source).toBe('prometheus');
    expect(res1?.alert.fingerprint).toBe('a1b2c3d4e5f6');
    expect(res1?.warnings).toHaveLength(0);

    const res2 = results[1];
    expect(res2?.alert.alertname).toBe('AuthServiceLatencyHigh');
    expect(res2?.alert.service).toBe('auth-service');
    expect(res2?.alert.severity_score).toBe('high');
    expect(res2?.warnings).toHaveLength(0);
  });

  it('should normalize resolved alert payload', () => {
    const results = adapter.normalize(prometheusResolvedFixture);
    expect(results).toHaveLength(1);
    expect(results[0]?.alert.status).toBe('resolved');
    expect(results[0]?.alert.severity_score).toBe('critical');
  });

  it('should handle unmapped severity gracefully with warning and null severity (never dropping alert)', () => {
    const payload = {
      alerts: [
        {
          status: 'firing',
          labels: {
            alertname: 'DiskSpaceLow',
            service: 'storage',
            severity: 'super-urgent-custom-label',
          },
        },
      ],
    };

    const results = adapter.normalize(payload);
    expect(results).toHaveLength(1);
    expect(results[0]?.alert.alertname).toBe('DiskSpaceLow');
    expect(results[0]?.alert.severity_score).toBeNull();
    expect(results[0]?.warnings.length).toBeGreaterThan(0);
    expect(results[0]?.warnings.some((w) => w.includes('Unrecognized Alertmanager severity'))).toBe(true);
  });

  it('should derive deterministic fingerprint if native fingerprint is missing', () => {
    const payload = {
      alerts: [
        {
          status: 'firing',
          labels: {
            alertname: 'PodCrashLoop',
            service: 'frontend',
          },
        },
      ],
    };

    const results = adapter.normalize(payload);
    expect(results).toHaveLength(1);
    expect(results[0]?.alert.fingerprint).toBeDefined();
    expect(results[0]?.alert.fingerprint.length).toBe(64);
    expect(results[0]?.warnings.some((w) => w.includes('generated deterministic SHA-256 fingerprint'))).toBe(true);
  });

  it('should hard-reject non-object or empty payload with NormalizationError', () => {
    expect(() => adapter.normalize(null)).toThrow(NormalizationError);
    expect(() => adapter.normalize({})).toThrow(NormalizationError);
    expect(() => adapter.normalize({ alerts: [] })).toThrow(NormalizationError);
  });
});
