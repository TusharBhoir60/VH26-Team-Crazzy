import { Alert, BatchedGroup } from '../types/alert.types';

/**
 * Type guard to check if the payload is a BatchedGroup
 */
function isBatchedGroup(incidentOrBatch: Alert | BatchedGroup): incidentOrBatch is BatchedGroup {
  return 'incidents' in incidentOrBatch;
}

/**
 * Format notification payload as plain text
 */
export function formatNotification(incidentOrBatch: Alert | BatchedGroup): string {
  if (isBatchedGroup(incidentOrBatch)) {
    const { id, severity, service, incidents, cooldown_suppressed_count, aiEnrichment } = incidentOrBatch;
    
    let text = `[${severity.toUpperCase()}] Batched Alert Group: ${id}\n`;
    if (service) {
      text += `Service: ${service}\n`;
    }
    
    text += `Incidents in group: ${incidents.length}\n`;
    
    if (cooldown_suppressed_count && cooldown_suppressed_count > 0) {
      text += `Cooldown suppressed: ${cooldown_suppressed_count}\n`;
    }
    
    if (aiEnrichment?.narrative) {
      text += `\nAI Analysis:\n${aiEnrichment.narrative}\n`;
    }
    
    return text;
  } else {
    // Individual alert
    const alert = incidentOrBatch as Alert;
    
    let text = `[${(alert.final_severity || alert.severity_score || 'UNKNOWN').toUpperCase()}] ${alert.alertname}\n`;
    text += `Service: ${alert.service}\n`;
    text += `Fingerprint: ${alert.fingerprint}\n`;
    
    if (alert.aiEnrichment?.narrative) {
      text += `\nAI Analysis:\n${alert.aiEnrichment.narrative}\n`;
    }
    
    return text;
  }
}
