import { normalizeDatadogPayload, parseDatadogTags, mapDatadogSeverity } from '../parsers/datadog';
import { DatadogPayloadSchema } from '../schemas/datadog.schema';
import datadogErrorFixture from '../__fixtures__/datadog-error.json';
import datadogWarningFixture from '../__fixtures__/datadog-warning.json';

describe('Datadog Parser & Normalizer', () => {
  it('should parse tag arrays and comma-separated tags into key-value records', () => {
    const arrayTags = ['service:payment-service', 'env:prod', 'tier:critical'];
    const parsedArray = parseDatadogTags(arrayTags);
    expect(parsedArray['service']).toBe('payment-service');
    expect(parsedArray['env']).toBe('prod');
    expect(parsedArray['tier']).toBe('critical');

    const stringTags = 'service:inventory-service,env:staging,region:us-east-1';
    const parsedString = parseDatadogTags(stringTags);
    expect(parsedString['service']).toBe('inventory-service');
    expect(parsedString['env']).toBe('staging');
    expect(parsedString['region']).toBe('us-east-1');
  });

  it('should validate and normalize Datadog error fixture', () => {
    const parseResult = DatadogPayloadSchema.safeParse(datadogErrorFixture);
    expect(parseResult.success).toBe(true);

    if (parseResult.success) {
      const alerts = normalizeDatadogPayload(parseResult.data);
      expect(alerts).toHaveLength(1);

      const alert = alerts[0];
      expect(alert?.alertname).toBe('Payment processing error rate > 5%');
      expect(alert?.service).toBe('payment-service');
      expect(alert?.status).toBe('firing');
      expect(alert?.source).toBe('datadog');
      expect(alert?.severity_score).toBe('critical');
      expect(alert?.labels['env']).toBe('production');
      expect(alert?.fingerprint).toBeDefined();
      expect(alert?.fingerprint.length).toBe(64);
    }
  });

  it('should validate and normalize Datadog warning fixture', () => {
    const parseResult = DatadogPayloadSchema.safeParse(datadogWarningFixture);
    expect(parseResult.success).toBe(true);

    if (parseResult.success) {
      const alerts = normalizeDatadogPayload(parseResult.data);
      expect(alerts).toHaveLength(1);

      const alert = alerts[0];
      expect(alert?.alertname).toBe('Inventory sync lag elevated');
      expect(alert?.service).toBe('inventory-service');
      expect(alert?.status).toBe('firing');
      expect(alert?.severity_score).toBe('warning');
    }
  });

  it('should detect recovered/resolved status in Datadog alerts', () => {
    const recoveredPayload = {
      title: '[Recovered] High CPU load',
      alert_type: 'success',
      alert_transition: 'Recovered',
      tags: ['service:auth-service'],
    };

    const parsed = DatadogPayloadSchema.parse(recoveredPayload);
    const alerts = normalizeDatadogPayload(parsed);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.status).toBe('resolved');
    expect(alerts[0]?.alertname).toBe('High CPU load');
    expect(alerts[0]?.service).toBe('auth-service');
  });

  it('should map Datadog priorities and alert types correctly', () => {
    expect(mapDatadogSeverity({ title: 't', priority: 'P1' }, {})).toBe('critical');
    expect(mapDatadogSeverity({ title: 't', priority: 'P2' }, {})).toBe('warning');
    expect(mapDatadogSeverity({ title: 't', priority: 'P3' }, {})).toBe('warning');
    expect(mapDatadogSeverity({ title: 't', priority: 'P4' }, {})).toBe('info');
    expect(mapDatadogSeverity({ title: 't', alert_type: 'error' }, {})).toBe('critical');
    expect(mapDatadogSeverity({ title: 't', alert_type: 'warning' }, {})).toBe('warning');
    expect(mapDatadogSeverity({ title: 't', alert_type: 'info' }, {})).toBe('info');
  });
});
