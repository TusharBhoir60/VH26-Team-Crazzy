import { Request, Response } from 'express';
import { normalize, NormalizationError } from '../normalization';
import { handleNormalizedAlert } from './handoff';
import { recordDeadLetter } from './deadletter';
import { logger } from '../shared/logger';

import { getRedisClient } from '../shared/redis.client';

const MAX_RECENT_ALERTS = 50;

export async function handleAlertmanagerWebhook(req: Request, res: Response): Promise<void> {
  try {
    const results = await normalize('prometheus', req.body);
    const alerts = results.map((r) => r.alert);

    const redis = getRedisClient();

    // Fast-ack response within 200ms
    res.status(200).json({
      received: Array.isArray((req.body as Record<string, unknown>)?.['alerts'])
        ? ((req.body as Record<string, unknown>)['alerts'] as unknown[]).length
        : 1,
      processed: alerts.length,
    });

    // Asynchronously dispatch normalized alerts to downstream pipeline
    for (const alert of alerts) {
      // Telemetry — aggregate counters
      redis.incr('stats:raw_alerts_total').catch(() => {});
      if (alert.severity_score === 'critical') {
        redis.incr('stats:critical_raw_total').catch(() => {});
      }

      // Telemetry — per-severity counters
      const sev = (alert.severity_score || 'low').toLowerCase();
      redis.incr(`stats:severity:${sev}`).catch(() => {});

      // Recent alerts — push compact summary into sorted set
      const summary = JSON.stringify({
        fingerprint: alert.fingerprint,
        alertname: alert.alertname,
        service: alert.service,
        severity: alert.severity_score || 'unknown',
        status: alert.status,
        source: alert.source,
        received_at: alert.received_at || new Date().toISOString(),
      });
      const score = Date.now();
      redis.zadd('recent_alerts', score.toString(), summary).catch(() => {});
      // Trim to keep only the most recent entries
      redis.zremrangebyrank('recent_alerts', 0, -(MAX_RECENT_ALERTS + 1)).catch(() => {});

      handleNormalizedAlert(alert).catch((err) => {
        logger.error({ err, fingerprint: alert.fingerprint }, 'Failed during downstream handoff');
      });
    }
  } catch (err) {
    if (err instanceof NormalizationError) {
      recordDeadLetter({
        source: 'prometheus',
        rawPayload: req.body,
        reason: err.message,
        error: err.details,
      });

      res.status(400).json({
        error: 'Invalid Alertmanager payload',
        details: err.message,
      });
      return;
    }

    recordDeadLetter({
      source: 'prometheus',
      rawPayload: req.body,
      reason: 'Alertmanager normalization unexpected error',
      error: err,
    });

    logger.error({ err }, 'Error normalizing Alertmanager payload');
    res.status(500).json({ error: 'Internal normalization error' });
  }
}

export async function handleDatadogWebhook(req: Request, res: Response): Promise<void> {
  try {
    const results = await normalize('datadog', req.body);
    const alerts = results.map((r) => r.alert);

    const redis = getRedisClient();

    // Fast-ack response within 200ms
    res.status(200).json({
      received: 1,
      processed: alerts.length,
    });

    // Dispatch to downstream pipeline
    for (const alert of alerts) {
      // Telemetry — aggregate counters
      redis.incr('stats:raw_alerts_total').catch(() => {});
      if (alert.severity_score === 'critical') {
        redis.incr('stats:critical_raw_total').catch(() => {});
      }

      // Telemetry — per-severity counters
      const sev = (alert.severity_score || 'low').toLowerCase();
      redis.incr(`stats:severity:${sev}`).catch(() => {});

      // Recent alerts — push compact summary into sorted set
      const summary = JSON.stringify({
        fingerprint: alert.fingerprint,
        alertname: alert.alertname,
        service: alert.service,
        severity: alert.severity_score || 'unknown',
        status: alert.status,
        source: alert.source,
        received_at: alert.received_at || new Date().toISOString(),
      });
      const score = Date.now();
      redis.zadd('recent_alerts', score.toString(), summary).catch(() => {});
      redis.zremrangebyrank('recent_alerts', 0, -(MAX_RECENT_ALERTS + 1)).catch(() => {});

      handleNormalizedAlert(alert).catch((err) => {
        logger.error({ err, fingerprint: alert.fingerprint }, 'Failed during downstream handoff');
      });
    }
  } catch (err) {
    if (err instanceof NormalizationError) {
      recordDeadLetter({
        source: 'datadog',
        rawPayload: req.body,
        reason: err.message,
        error: err.details,
      });

      res.status(400).json({
        error: 'Invalid Datadog payload',
        details: err.message,
      });
      return;
    }

    recordDeadLetter({
      source: 'datadog',
      rawPayload: req.body,
      reason: 'Datadog normalization unexpected error',
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
