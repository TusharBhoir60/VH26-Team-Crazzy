import { normalizeAlertmanagerPayload, mapAlertmanagerSeverity } from '../parsers/alertmanager';
import { AlertmanagerPayloadSchema } from '../schemas/alertmanager.schema';
import prometheusFiringFixture from '../__fixtures__/prometheus-firing.json';
import prometheusResolvedFixture from '../__fixtures__/prometheus-resolved.json';

describe('Alertmanager Parser & Normalizer', () => {
  it('should validate and parse valid Prometheus firing fixture', () => {
    const parseResult = AlertmanagerPayloadSchema.safeParse(prometheusFiringFixture);
    expect(parseResult.success).toBe(true);

    if (parseResult.success) {
      const alerts = normalizeAlertmanagerPayload(parseResult.data);
      expect(alerts).toHaveLength(2);

      // Verify Alert 1: PostgresHighConnectionCount
      const alert1 = alerts[0];
      expect(alert1?.alertname).toBe('PostgresHighConnectionCount');
      expect(alert1?.service).toBe('database');
      expect(alert1?.status).toBe('firing');
      expect(alert1?.source).toBe('prometheus');
      expect(alert1?.severity_score).toBe('critical');
      expect(alert1?.fingerprint).toBeDefined();
      expect(alert1?.fingerprint.length).toBe(64);
      expect(alert1?.cluster_id).toBeNull();
      expect(alert1?.is_root_cause).toBe(false);

      // Verify Alert 2: AuthServiceLatencyHigh
      const alert2 = alerts[1];
      expect(alert2?.alertname).toBe('AuthServiceLatencyHigh');
      expect(alert2?.service).toBe('auth-service');
      expect(alert2?.status).toBe('firing');
      expect(alert2?.severity_score).toBe('high');
    }
  });

  it('should normalize resolved alerts correctly', () => {
    const parseResult = AlertmanagerPayloadSchema.safeParse(prometheusResolvedFixture);
    expect(parseResult.success).toBe(true);

    if (parseResult.success) {
      const alerts = normalizeAlertmanagerPayload(parseResult.data);
      expect(alerts).toHaveLength(1);
      expect(alerts[0]?.status).toBe('resolved');
      expect(alerts[0]?.severity_score).toBe('critical');
    }
  });

  it('should map various severity aliases correctly', () => {
    expect(mapAlertmanagerSeverity('critical')).toBe('critical');
    expect(mapAlertmanagerSeverity('CRIT')).toBe('critical');
    expect(mapAlertmanagerSeverity('p0')).toBe('critical');
    expect(mapAlertmanagerSeverity('error')).toBe('high');
    expect(mapAlertmanagerSeverity('warning')).toBe('medium');
    expect(mapAlertmanagerSeverity('warn')).toBe('medium');
    expect(mapAlertmanagerSeverity('info')).toBe('low');
    expect(mapAlertmanagerSeverity('unknown-custom')).toBeNull();
    expect(mapAlertmanagerSeverity(undefined)).toBeNull();
  });

  it('should reject invalid payload without alerts array', () => {
    const invalid = { receiver: 'test', status: 'firing' };
    const parseResult = AlertmanagerPayloadSchema.safeParse(invalid);
    expect(parseResult.success).toBe(false);
  });
});
