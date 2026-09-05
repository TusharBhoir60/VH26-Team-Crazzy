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

// GET handler — shows webhook status info when visited in a browser
const webhookInfo = (source: string) => (_req: import('express').Request, res: import('express').Response) => {
  res.status(200).json({
    status: 'active',
    source,
    message: `MAYDAY ${source} webhook endpoint is live and accepting alerts.`,
    method: 'POST',
    usage: `Send a POST request with a valid ${source} alert payload to this URL.`,
    timestamp: new Date().toISOString(),
  });
};

// Prometheus Alertmanager Ingest Routes (canonical + TRD alias)
ingestRouter.route('/webhooks/alertmanager')
  .get(webhookInfo('Alertmanager'))
  .post(alertmanagerAuth, handleAlertmanagerWebhook);

ingestRouter.route('/webhook/prometheus')
  .get(webhookInfo('Prometheus'))
  .post(alertmanagerAuth, handleAlertmanagerWebhook);

// Datadog Ingest Routes (canonical + TRD alias)
ingestRouter.route('/webhooks/datadog')
  .get(webhookInfo('Datadog'))
  .post(datadogAuth, handleDatadogWebhook);

ingestRouter.route('/webhook/datadog')
  .get(webhookInfo('Datadog'))
  .post(datadogAuth, handleDatadogWebhook);


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
