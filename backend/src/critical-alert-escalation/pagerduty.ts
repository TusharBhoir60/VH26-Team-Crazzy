import axios from 'axios';
import { CriticalAlert } from './types';
import { logger } from '../shared/logger';

export async function triggerPagerDutyIncident(alert: CriticalAlert, integrationKey: string): Promise<string | null> {
  try {
    const payload = {
      routing_key: integrationKey,
      event_action: 'trigger',
      payload: {
        summary: `Critical Alert: ${alert.alertName} on ${alert.service}`,
        source: alert.service,
        severity: 'critical',
        timestamp: alert.timestamp,
        custom_details: {
          reasoning: alert.severityReasoning,
          message: alert.message
        }
      }
    };

    const response = await axios.post('https://events.pagerduty.com/v2/enqueue', payload);
    const dedupKey = response.data.dedup_key;
    logger.info({ dedupKey }, 'PagerDuty incident triggered successfully');
    return dedupKey;
  } catch (error) {
    logger.error({ error }, 'Failed to trigger PagerDuty incident');
    return null;
  }
}

export async function checkIncidentStatus(dedupKey: string, apiToken: string): Promise<string> {
  try {
    // The incidents endpoint allows filtering by incident_key (dedup_key)
    const response = await axios.get(`https://api.pagerduty.com/incidents`, {
      params: {
        incident_key: dedupKey
      },
      headers: {
        'Authorization': `Token token=${apiToken}`,
        'Accept': 'application/vnd.pagerduty+json;version=2'
      }
    });

    const incidents = response.data.incidents;
    if (incidents && incidents.length > 0) {
      return incidents[0].status; // typically 'triggered', 'acknowledged', or 'resolved'
    }
    
    // If we can't find it, we'll assume it's still an issue to fail safe
    logger.warn({ dedupKey }, 'Incident not found in PagerDuty API, defaulting to triggered');
    return 'triggered';
  } catch (error) {
    logger.error({ error }, 'Failed to check PagerDuty incident status, defaulting to triggered');
    // If the API call fails, default to 'triggered' to fail toward alerting the human
    return 'triggered';
  }
}
