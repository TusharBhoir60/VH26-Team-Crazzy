import { Incident, BatchedGroup } from '../types/alert.types';

/**
 * Type guard to check if the payload is a BatchedGroup
 */
function isBatchedGroup(incidentOrBatch: Incident | BatchedGroup): incidentOrBatch is BatchedGroup {
  return 'incidents' in incidentOrBatch;
}

/**
 * Format notification payload as plain text
 */
export function formatNotification(incidentOrBatch: Incident | BatchedGroup): string {
  if (isBatchedGroup(incidentOrBatch)) {
    const { id, severity, incidents, cooldown_suppressed_count, aiEnrichment } = incidentOrBatch;
    
    let text = `[${severity.toUpperCase()}] Batched Alert Group: ${id || 'no-id'}\n`;
    
    text += `Incidents in group: ${incidents.length}\n`;
    
    if (cooldown_suppressed_count && cooldown_suppressed_count > 0) {
      text += `Cooldown suppressed: ${cooldown_suppressed_count}\n`;
    }
    
    if (aiEnrichment?.narrative) {
      text += `\nAI Analysis:\n${aiEnrichment.narrative}\n`;
    }
    
    return text;
  } else {
    // Individual Incident
    const incident = incidentOrBatch as Incident;
    
    let text = `[${(incident.severity || 'UNKNOWN').toUpperCase()}] ${incident.summary}\n`;
    text += `Service: ${incident.root_cause.service}\n`;
    text += `Incident ID: ${incident.incident_id}\n`;
    
    if (incident.ai_narrative) {
      text += `\nAI Analysis:\n${incident.ai_narrative}\n`;
    }
    
    return text;
  }
}
