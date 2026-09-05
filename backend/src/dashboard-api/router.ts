import { Router, Request, Response } from 'express';
import { getRedisClient } from '../shared/redis.client';
import { logger } from '../shared/logger';
import { Incident } from '../types/alert.types';
import { SafetyGateResult } from '../safety-gate/types';
import { DeadLetterEntry } from '../ingest/deadletter';

export const dashboardRouter = Router();

// GET /incidents -> Active incidents from correlation store
dashboardRouter.get('/incidents', async (req: Request, res: Response) => {
  try {
    const redis = getRedisClient();
    
    // Scan for all incident keys
    const keys = await redis.keys('incident:*');
    
    if (keys.length === 0) {
      return res.status(200).json([]);
    }

    const incidentsData = await redis.mget(...keys);
    const incidents: Incident[] = incidentsData
      .filter((data) => data !== null)
      .map((data) => JSON.parse(data as string));

    return res.status(200).json(incidents);
  } catch (err) {
    logger.error({ err }, 'Dashboard API: Failed to fetch incidents');
    return res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

// GET /quarantine -> Quarantined incidents from safety gate
dashboardRouter.get('/quarantine', async (req: Request, res: Response) => {
  try {
    const redis = getRedisClient();
    
    const keys = await redis.keys('quarantine:*');
    
    if (keys.length === 0) {
      return res.status(200).json([]);
    }

    const quarantineData = await redis.mget(...keys);
    const quarantinedItems = quarantineData
      .filter((data) => data !== null)
      .map((data) => JSON.parse(data as string));

    return res.status(200).json(quarantinedItems);
  } catch (err) {
    logger.error({ err }, 'Dashboard API: Failed to fetch quarantined items');
    return res.status(500).json({ error: 'Failed to fetch quarantined items' });
  }
});

// GET /deadletter -> DLQ from ingest stage
dashboardRouter.get('/deadletter', async (req: Request, res: Response) => {
  try {
    const redis = getRedisClient();
    
    const keys = await redis.keys('dlq:*');
    
    if (keys.length === 0) {
      return res.status(200).json([]);
    }

    const dlqData = await redis.mget(...keys);
    const dlqItems: DeadLetterEntry[] = dlqData
      .filter((data) => data !== null)
      .map((data) => JSON.parse(data as string));

    return res.status(200).json(dlqItems);
  } catch (err) {
    logger.error({ err }, 'Dashboard API: Failed to fetch dead letters');
    return res.status(500).json({ error: 'Failed to fetch dead letters' });
  }
});

// GET /stats -> Telemetry and KPIs
dashboardRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const redis = getRedisClient();
    
    const [rawTotal, notifSent, critRaw, critNotif] = await Promise.all([
      redis.get('stats:raw_alerts_total'),
      redis.get('stats:notifications_sent'),
      redis.get('stats:critical_raw_total'),
      redis.get('stats:critical_notified'),
    ]);

    const raw_alert_count = parseInt(rawTotal || '0', 10);
    const notifications_sent = parseInt(notifSent || '0', 10);
    const critical_alerts_total = parseInt(critRaw || '0', 10);
    const critical_alerts_notified = parseInt(critNotif || '0', 10);

    const reduction_percent = raw_alert_count > 0 
      ? ((1 - notifications_sent / raw_alert_count) * 100).toFixed(2) 
      : 0;

    return res.status(200).json({
      raw_alert_count,
      notifications_sent,
      reduction_percent: Number(reduction_percent),
      critical_alerts_total,
      critical_alerts_notified,
    });
  } catch (err) {
    logger.error({ err }, 'Dashboard API: Failed to fetch stats');
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});
