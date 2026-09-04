import { Router, Request, Response } from 'express';
import { getRedisClient } from '../shared/redis.client';
import { logger } from '../shared/logger';
import { Incident } from '../types/alert.types';
import { SafetyGateResult } from '../safety-gate/types';
import { DeadLetterRecord } from '../ingest/deadletter';

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
    const dlqItems: DeadLetterRecord[] = dlqData
      .filter((data) => data !== null)
      .map((data) => JSON.parse(data as string));

    return res.status(200).json(dlqItems);
  } catch (err) {
    logger.error({ err }, 'Dashboard API: Failed to fetch dead letters');
    return res.status(500).json({ error: 'Failed to fetch dead letters' });
  }
});
