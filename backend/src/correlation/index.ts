import * as crypto from 'crypto';
import { Alert, Severity } from '../types/alert.types';
import { Incident } from './types';
import { loadTopologyGraph } from './topology/serviceGraph';
import { getRelatedServices } from './topology/traversal';
import { selectRootCause } from './rootCause';
import { getActiveIncidentByServices, saveIncident } from './incidentStore';

const severityLevels: Record<Severity, number> = {
  critical: 4,
  warning: 3,
  info: 2,
  unknown: 1,
};

function getHighestSeverity(alerts: Alert[]): Severity {
  let highest: Severity = 'unknown';
  let highestVal = 0;

  for (const alert of alerts) {
    if (!alert.severity_score) continue;
    const val = severityLevels[alert.severity_score];
    if (val > highestVal) {
      highestVal = val;
      highest = alert.severity_score;
    }
  }

  return highest;
}

import { MAX_GROUP_SIZE } from './config';

export async function correlate(alert: Alert): Promise<Incident> {
  const graph = await loadTopologyGraph();
  
  // Find related services based on topology (upstream and downstream)
  const relatedServicesSet = getRelatedServices(alert.service, graph);
  const relatedServices = Array.from(relatedServicesSet);
  
  // Include the alert's own service for finding an active incident
  const searchServices = [alert.service, ...relatedServices];

  let incident = await getActiveIncidentByServices(searchServices);

  if (incident) {
    if (incident.alerts.length >= MAX_GROUP_SIZE) {
      console.warn(`[Correlation] Incident ${incident.incident_id} reached max group size. Dropping alert from correlation.`);
      // We could either create a new incident or just return the existing one.
      // Let's create a fail-open single-alert incident for safety.
      incident = null;
    } else {
      // Check if alert is already in the incident
      const alreadyExists = incident.alerts.some(a => a.fingerprint === alert.fingerprint);
      if (!alreadyExists) {
        incident.alerts.push(alert);
        incident.root_cause = selectRootCause(incident.alerts, graph);
        incident.severity = getHighestSeverity(incident.alerts);
        incident.summary = `${incident.root_cause.service} is affecting ${incident.alerts.length - 1} other service(s)`;
        
        await saveIncident(incident, incident.alerts.map(a => a.service));
      }
      return incident;
    }
  }

  // If no incident found, or max group size reached, create a new one
  if (!incident) {
    incident = {
      incident_id: crypto.randomUUID(),
      root_cause: alert,
      alerts: [alert],
      severity: alert.severity_score || 'unknown',
      summary: `${alert.service} isolated alert`,
      created_at: new Date().toISOString()
    };
    await saveIncident(incident, [alert.service]);
  }

  return incident;
}
