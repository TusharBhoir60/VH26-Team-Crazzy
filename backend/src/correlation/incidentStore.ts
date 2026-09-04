import { getRedisClient } from '../shared/redis.client';
import { Incident } from './types';
import { Alert } from '../types/alert.types';
import { INCIDENT_TTL_SECONDS } from './config';

const INCIDENT_PREFIX = 'incident:';

export async function getActiveIncidentByServices(services: string[]): Promise<Incident | null> {
  if (services.length === 0) return null;
  const redis = getRedisClient();
  
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
  const redis = getRedisClient();
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
  const redis = getRedisClient();
  return redis.quit();
}
