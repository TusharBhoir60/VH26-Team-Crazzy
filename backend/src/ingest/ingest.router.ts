import { Router } from 'express';
import {
  handleAlertmanagerWebhook,
  handleDatadogWebhook,
  handleHealthz,
  handleHealth,
} from './ingest.controller';
import { createHmacMiddleware } from './auth/hmac';
import { getDeadLetterEntries } from './deadletter';

export const ingestRouter = Router();

// HMAC Middleware for Prometheus Alertmanager
const alertmanagerAuth = createHmacMiddleware({
  sourceName: 'prometheus',
  secretEnvVar: 'ALERTMANAGER_WEBHOOK_SECRET',
  headerNames: ['x-alertmanager-signature', 'x-hub-signature-256', 'x-signature-sha256'],
});

// HMAC Middleware for Datadog
const datadogAuth = createHmacMiddleware({
  sourceName: 'datadog',
  secretEnvVar: 'DATADOG_WEBHOOK_SECRET',
  headerNames: ['x-datadog-webhook-signature-sha256', 'x-datadog-signature', 'x-hub-signature-256'],
});

// Prometheus Alertmanager Ingest Routes (canonical + TRD alias)
ingestRouter.post('/webhooks/alertmanager', alertmanagerAuth, handleAlertmanagerWebhook);
ingestRouter.post('/webhook/prometheus', alertmanagerAuth, handleAlertmanagerWebhook);

// Datadog Ingest Routes (canonical + TRD alias)
ingestRouter.post('/webhooks/datadog', datadogAuth, handleDatadogWebhook);
ingestRouter.post('/webhook/datadog', datadogAuth, handleDatadogWebhook);

// Health & Liveness Endpoints
ingestRouter.get('/healthz', handleHealthz);
ingestRouter.get('/health', handleHealth);

// Internal DLQ Diagnostics Endpoint
ingestRouter.get('/internal/dlq', (req, res) => {
  res.json({
    count: getDeadLetterEntries().length,
    entries: getDeadLetterEntries(),
  });
});
