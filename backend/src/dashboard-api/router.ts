import { Router, Request, Response } from 'express';
import { getRedisClient } from '../shared/redis.client';
import { logger } from '../shared/logger';
import { Incident } from '../types/alert.types';
import { SafetyGateResult } from '../safety-gate/types';
import { DeadLetterEntry } from '../ingest/deadletter';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

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

// GET /stats -> Telemetry and KPIs (expanded with MTTR, MTTA, severity breakdown)
dashboardRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const redis = getRedisClient();
    
    const [rawTotal, notifSent, critRaw, critNotif, mttrVal, mttaVal, sevCritical, sevHigh, sevMedium, sevLow] = await Promise.all([
      redis.get('stats:raw_alerts_total'),
      redis.get('stats:notifications_sent'),
      redis.get('stats:critical_raw_total'),
      redis.get('stats:critical_notified'),
      redis.get('stats:mttr_seconds'),
      redis.get('stats:mtta_seconds'),
      redis.get('stats:severity:critical'),
      redis.get('stats:severity:high'),
      redis.get('stats:severity:medium'),
      redis.get('stats:severity:low'),
    ]);

    const raw_alert_count = parseInt(rawTotal || '0', 10);
    const notifications_sent = parseInt(notifSent || '0', 10);
    const critical_alerts_total = parseInt(critRaw || '0', 10);
    const critical_alerts_notified = parseInt(critNotif || '0', 10);
    const mttr_seconds = parseInt(mttrVal || '0', 10);
    const mtta_seconds = parseInt(mttaVal || '0', 10);

    const reduction_percent = raw_alert_count > 0 
      ? ((1 - notifications_sent / raw_alert_count) * 100).toFixed(2) 
      : 0;

    const severity_breakdown = {
      critical: parseInt(sevCritical || '0', 10),
      high: parseInt(sevHigh || '0', 10),
      medium: parseInt(sevMedium || '0', 10),
      low: parseInt(sevLow || '0', 10),
    };

    return res.status(200).json({
      raw_alert_count,
      notifications_sent,
      reduction_percent: Number(reduction_percent),
      critical_alerts_total,
      critical_alerts_notified,
      mttr_seconds,
      mtta_seconds,
      severity_breakdown,
    });
  } catch (err) {
    logger.error({ err }, 'Dashboard API: Failed to fetch stats');
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /topology -> Service dependency graph from YAML config
dashboardRouter.get('/topology', async (req: Request, res: Response) => {
  try {
    const yamlPath = path.resolve(__dirname, '../../../config/service-dependency-graph.yaml');
    
    if (!fs.existsSync(yamlPath)) {
      return res.status(200).json({ services: {} });
    }

    const fileContent = fs.readFileSync(yamlPath, 'utf8');
    const parsed = yaml.load(fileContent) as { services: Record<string, { depends_on: string[]; tier: string }> };

    return res.status(200).json(parsed);
  } catch (err) {
    logger.error({ err }, 'Dashboard API: Failed to load topology');
    return res.status(500).json({ error: 'Failed to load service topology' });
  }
});

// GET /recent-alerts -> Last N alerts from the pipeline (stored in Redis sorted set)
dashboardRouter.get('/recent-alerts', async (req: Request, res: Response) => {
  try {
    const redis = getRedisClient();
    
    // Get the most recent 30 alerts (sorted set, highest score = most recent)
    const rawEntries = await redis.zrevrange('recent_alerts', 0, 29);
    
    if (!rawEntries || rawEntries.length === 0) {
      return res.status(200).json([]);
    }

    const alerts = rawEntries.map((entry) => {
      try {
        return JSON.parse(entry);
      } catch {
        return null;
      }
    }).filter(Boolean);

    return res.status(200).json(alerts);
  } catch (err) {
    logger.error({ err }, 'Dashboard API: Failed to fetch recent alerts');
    return res.status(500).json({ error: 'Failed to fetch recent alerts' });
  }
});
