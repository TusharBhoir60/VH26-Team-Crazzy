import Redis from 'ioredis';
import { Incident } from './types';
import { Alert } from '../types/alert.types';

// Use a shared Redis instance or create a new one based on env
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const INCIDENT_TTL_SECONDS = 5 * 60; // 5 minutes correlation window
const INCIDENT_PREFIX = 'incident:';

export async function getActiveIncidentByServices(services: string[]): Promise<Incident | null> {
  if (services.length === 0) return null;
  
  // Since multiple services might map to the same incident, 
  // we check if any of these services have an active incident ID mapped.
  const pipeline = redis.pipeline();
  for (const service of services) {
    pipeline.get(`service_incident:${service}`);
  }
  
  const results = await pipeline.exec();
  if (!results) return null;

  let incidentId: string | null = null;
  for (const [err, result] of results) {
    if (!err && result) {
      incidentId = result as string;
      break;
    }
  }

  if (!incidentId) return null;

  const incidentData = await redis.get(`${INCIDENT_PREFIX}${incidentId}`);
  if (incidentData) {
    return JSON.parse(incidentData) as Incident;
  }
  return null;
}

export async function saveIncident(incident: Incident, affectedServices: string[]): Promise<void> {
  const pipeline = redis.pipeline();
  
  // Save the incident object
  pipeline.setex(
    `${INCIDENT_PREFIX}${incident.incident_id}`,
    INCIDENT_TTL_SECONDS,
    JSON.stringify(incident)
  );

  // Map each affected service to this incident ID so they can be correlated
  for (const service of affectedServices) {
    pipeline.setex(
      `service_incident:${service}`,
      INCIDENT_TTL_SECONDS,
      incident.incident_id
    );
  }

  await pipeline.exec();
}

// Ensure the client can be closed during shutdown/tests
export function closeRedisConnection() {
  return redis.quit();
}
