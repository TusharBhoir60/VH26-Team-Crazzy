import request from 'supertest';
import { app } from '../../server';
import { computeHmacSignature } from '../../shared/crypto';
import { closeRedisClient } from '../../shared/redis.client';
import { clearDeadLetterQueue, getDeadLetterEntries } from '../deadletter';
import * as dedupModule from '../../dedup';
import prometheusFiringFixture from '../__fixtures__/prometheus-firing.json';
import datadogErrorFixture from '../__fixtures__/datadog-error.json';

describe('Ingest Router HTTP Endpoints', () => {
  beforeEach(() => {
    clearDeadLetterQueue();
    delete process.env.ALERTMANAGER_WEBHOOK_SECRET;
    delete process.env.DATADOG_WEBHOOK_SECRET;
    jest.spyOn(dedupModule, 'dedupe').mockImplementation(async (alert) => ({
      isDuplicate: false,
      count: 1,
      alert,
      suppressed: false,
    }));
  });

  afterAll(async () => {
    await closeRedisClient();
  });

  describe('Health Endpoints', () => {
    it('GET /healthz should return 200 ok with uptime and timestamp', async () => {
      const res = await request(app).get('/healthz');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.uptime).toBeDefined();
      expect(res.body.timestamp).toBeDefined();
    });

    it('GET /health should return 200 ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('alert-fatigue-buster-backend');
    });
  });

  describe('Prometheus Alertmanager Webhooks', () => {
    it('POST /webhooks/alertmanager should accept valid payload and return 200', async () => {
      const res = await request(app)
        .post('/webhooks/alertmanager')
        .send(prometheusFiringFixture)
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(2);
      expect(res.body.processed).toBe(2);
    });

    it('POST /webhook/prometheus (alias) should accept valid payload and return 200', async () => {
      const res = await request(app)
        .post('/webhook/prometheus')
        .send(prometheusFiringFixture)
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(2);
      expect(res.body.processed).toBe(2);
    });

    it('POST /webhooks/alertmanager should reject malformed payload with 400 and save to DLQ', async () => {
      const malformed = { invalid: true, severity: 'critical' };
      const res = await request(app)
        .post('/webhooks/alertmanager')
        .send(malformed)
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid Alertmanager payload');

      const dlq = getDeadLetterEntries();
      expect(dlq.length).toBeGreaterThan(0);
      expect(dlq[0]?.source).toBe('prometheus');
      expect(dlq[0]?.isPotentialCritical).toBe(true);
    });

    it('should enforce HMAC validation when ALERTMANAGER_WEBHOOK_SECRET is set', async () => {
      const secret = 'secret-am-1234';
      process.env.ALERTMANAGER_WEBHOOK_SECRET = secret;

      // 1. Missing header -> 401
      const resMissing = await request(app)
        .post('/webhooks/alertmanager')
        .send(prometheusFiringFixture);
      expect(resMissing.status).toBe(401);

      // 2. Invalid signature -> 401
      const resInvalid = await request(app)
        .post('/webhooks/alertmanager')
        .set('x-alertmanager-signature', 'bad-signature-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')
        .send(prometheusFiringFixture);
      expect(resInvalid.status).toBe(401);

      // 3. Valid signature -> 200
      const bodyStr = JSON.stringify(prometheusFiringFixture);
      const signature = computeHmacSignature(bodyStr, secret);
      const resValid = await request(app)
        .post('/webhooks/alertmanager')
        .set('x-alertmanager-signature', signature)
        .send(prometheusFiringFixture);
      expect(resValid.status).toBe(200);
    });
  });

  describe('Datadog Webhooks', () => {
    it('POST /webhooks/datadog should accept valid payload and return 200', async () => {
      const res = await request(app)
        .post('/webhooks/datadog')
        .send(datadogErrorFixture)
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(1);
      expect(res.body.processed).toBe(1);
    });

    it('POST /webhook/datadog (alias) should accept valid payload and return 200', async () => {
      const res = await request(app)
        .post('/webhook/datadog')
        .send(datadogErrorFixture)
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(1);
      expect(res.body.processed).toBe(1);
    });

    it('POST /webhooks/datadog should reject malformed payload missing title with 400 and DLQ', async () => {
      const malformed = { alert_type: 'error' }; // missing required 'title'
      const res = await request(app)
        .post('/webhooks/datadog')
        .send(malformed)
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid Datadog payload');

      const dlq = getDeadLetterEntries();
      expect(dlq.length).toBeGreaterThan(0);
      expect(dlq[0]?.source).toBe('datadog');
    });

    it('should enforce HMAC validation when DATADOG_WEBHOOK_SECRET is set', async () => {
      const secret = 'secret-dd-9876';
      process.env.DATADOG_WEBHOOK_SECRET = secret;

      // 1. Missing header -> 401
      const resMissing = await request(app)
        .post('/webhooks/datadog')
        .send(datadogErrorFixture);
      expect(resMissing.status).toBe(401);

      // 2. Valid signature -> 200
      const bodyStr = JSON.stringify(datadogErrorFixture);
      const signature = `sha256=${computeHmacSignature(bodyStr, secret)}`;
      const resValid = await request(app)
        .post('/webhooks/datadog')
        .set('x-datadog-webhook-signature-sha256', signature)
        .send(datadogErrorFixture);
      expect(resValid.status).toBe(200);
    });
  });

  describe('Internal DLQ diagnostics', () => {
    it('GET /internal/dlq should return recorded dead-letter entries', async () => {
      // Trigger a failure
      await request(app)
        .post('/webhooks/datadog')
        .send({ missing: 'everything' });

      const res = await request(app).get('/internal/dlq');
      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThan(0);
      expect(Array.isArray(res.body.entries)).toBe(true);
    });
  });
});
