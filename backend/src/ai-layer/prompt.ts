import { Incident } from '../safety-gate/types';

/**
 * Builds the structured prompt sent to Groq.
 *
 * The prompt explicitly instructs the model to return JSON matching
 * AiEnrichmentResult so the response can be parsed without fragile text parsing.
 * This file is standalone so it can be iterated/tuned independently of the
 * calling logic in index.ts.
 */
export function buildIncidentPrompt(incident: Incident): string {
  const rootAlert = incident.alerts.find((a) => a.is_root_cause) ?? incident.alerts[0];
  const contributingAlerts = incident.alerts
    .filter((a) => !a.is_root_cause)
    .map((a) => `  - ${a.alertname} (service: ${a.service}, severity: ${a.severity_score ?? 'unknown'})`)
    .join('\n');

  return `You are an expert SRE analyzing a correlated incident in a production monitoring system.

INCIDENT SUMMARY:
- Cluster ID: ${incident.cluster_id}
- Deterministic Severity: ${incident.severity}
- Affected Services: ${incident.affected_services.join(', ')}
- Downstream Alert Count: ${incident.downstream_count}
- Suppressed Duplicate Count: ${incident.raw_alert_count_suppressed}

ROOT CAUSE ALERT (deterministic):
- Alert Name: ${rootAlert?.alertname ?? 'unknown'}
- Service: ${rootAlert?.service ?? 'unknown'}
- Severity: ${rootAlert?.severity_score ?? 'unknown'}
- Confidence: ${incident.root_cause?.confidence ?? 'unknown'}

CONTRIBUTING ALERTS:
${contributingAlerts || '  (none)'}

TASK:
Analyze this incident and respond with a JSON object in exactly this format:
{
  "rootCauseSuggestion": "<string: which service/alert is most likely the root cause and why>",
  "suggestedSeverity": "<one of: critical, high, medium, low>",
  "narrative": "<string: 2-4 sentence human-readable summary of the incident for on-call engineers>"
}

CONSTRAINTS:
- suggestedSeverity must be one of: critical, high, medium, low
- You may escalate severity if evidence warrants it, but never suggest a lower severity than ${incident.severity}
- narrative should be actionable and concise — what happened, what's affected, what to check first
- Respond ONLY with the JSON object, no additional text, no markdown code fences

JSON response:`;
}
