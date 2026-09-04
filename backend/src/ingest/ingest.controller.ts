import { Request, Response } from 'express';
import { AlertmanagerPayloadSchema } from './schemas/alertmanager.schema';
import { DatadogPayloadSchema } from './schemas/datadog.schema';
import { normalizeAlertmanagerPayload } from './parsers/alertmanager';
import { normalizeDatadogPayload } from './parsers/datadog';
import { handleNormalizedAlert } from './handoff';
import { recordDeadLetter } from './deadletter';
import { logger } from '../shared/logger';

export async function handleAlertmanagerWebhook(req: Request, res: Response): Promise<void> {
  const parseResult = AlertmanagerPayloadSchema.safeParse(req.body);

  if (!parseResult.success) {
    const formattedError = parseResult.error.format();
    recordDeadLetter({
      source: 'prometheus',
      rawPayload: req.body,
      reason: 'Alertmanager schema validation failed',
      error: parseResult.error,
    });

    res.status(400).json({
      error: 'Invalid Alertmanager payload schema',
      details: formattedError,
    });
    return;
  }

  try {
    const alerts = normalizeAlertmanagerPayload(parseResult.data);

    // Fast-ack response within 200ms
    res.status(200).json({
      received: parseResult.data.alerts.length,
      processed: alerts.length,
    });

    // Asynchronously / concurrently dispatch to downstream pipeline
    for (const alert of alerts) {
      handleNormalizedAlert(alert).catch((err) => {
        logger.error({ err, fingerprint: alert.fingerprint }, 'Failed during downstream handoff');
      });
    }
  } catch (err) {
    recordDeadLetter({
      source: 'prometheus',
      rawPayload: req.body,
      reason: 'Alertmanager normalization threw error',
      error: err,
    });

    logger.error({ err }, 'Error normalizing Alertmanager payload');
    res.status(500).json({ error: 'Internal normalization error' });
  }
}

export async function handleDatadogWebhook(req: Request, res: Response): Promise<void> {
  const parseResult = DatadogPayloadSchema.safeParse(req.body);

  if (!parseResult.success) {
    const formattedError = parseResult.error.format();
    recordDeadLetter({
      source: 'datadog',
      rawPayload: req.body,
      reason: 'Datadog schema validation failed',
      error: parseResult.error,
    });

    res.status(400).json({
      error: 'Invalid Datadog payload schema',
      details: formattedError,
    });
    return;
  }

  try {
    const alerts = normalizeDatadogPayload(parseResult.data);

    // Fast-ack response within 200ms
    res.status(200).json({
      received: 1,
      processed: alerts.length,
    });

    // Dispatch to downstream pipeline
    for (const alert of alerts) {
      handleNormalizedAlert(alert).catch((err) => {
        logger.error({ err, fingerprint: alert.fingerprint }, 'Failed during downstream handoff');
      });
    }
  } catch (err) {
    recordDeadLetter({
      source: 'datadog',
      rawPayload: req.body,
      reason: 'Datadog normalization threw error',
      error: err,
    });

    logger.error({ err }, 'Error normalizing Datadog payload');
    res.status(500).json({ error: 'Internal normalization error' });
  }
}

export function handleHealthz(req: Request, res: Response): void {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}

export function handleHealth(req: Request, res: Response): void {
  res.status(200).json({
    status: 'ok',
    service: 'alert-fatigue-buster-backend',
    timestamp: new Date().toISOString(),
  });
}
