import { logger } from '../shared/logger';
import { getAiEnrichment } from '../ai-layer';
import { validateEnrichment } from './validateEnrichment';
import { pushToQuarantine } from './quarantine';
import { Incident, SafetyGateResult } from './types';

// Downstream handler stub (Batching stage entrypoint)
export type BatchingHandler = (incident: Incident) => Promise<void>;

let downstreamBatchingHandler: BatchingHandler = async (incident: Incident): Promise<void> => {
  logger.info(
    {
      incident_id: incident.incident_id,
      severity: incident.severity,
      aiEnrichment: incident.aiEnrichment
        ? { suggestedSeverity: incident.aiEnrichment.suggestedSeverity }
        : null,
    },
    'Safety Gate: Forwarding incident to Batching stage'
  );
};

/**
 * Registers the Batching stage handler.
 * Called at startup when Batching is initialized.
 */
export function setBatchingHandler(handler: BatchingHandler): void {
  downstreamBatchingHandler = handler;
}

/**
 * applySafetyGate — the mandatory join point between Correlation + AI Layer and Batching.
 *
 * Five-step flow from SAFETY_GATE_README.md:
 *  1. Receive deterministic Incident from Correlation.
 *  2. Call getAiEnrichment(incident, 2000).
 *  3. null → attach aiEnrichment: null, forward to Batching unchanged (rule 3).
 *  4. Valid result, severity equal or escalated → apply, attach aiEnrichment, forward.
 *  5. Valid result, severity downgraded → quarantine, log violation, do NOT forward.
 *
 * Safety rules:
 *  1. Critical severity is never downgraded.
 *  2. AI may only escalate, never de-escalate.
 *  3. Timeout / error / null → proceed without AI.
 *  4. AI output is additive metadata only.
 */
export async function applySafetyGate(incident: Incident): Promise<SafetyGateResult> {
  // Step 2: Request AI enrichment with hard 2s timeout
  const aiResult = await getAiEnrichment(incident, 2000);

  // Step 3: AI unavailable (null) — proceed without AI (rule 3)
  if (aiResult === null) {
    const enrichedIncident: Incident = {
      ...incident,
      aiEnrichment: null,
      safetyViolation: false,
    };

    await forwardToBatching(enrichedIncident);

    return {
      forwarded: true,
      incident: enrichedIncident,
      action: 'ai_unavailable',
    };
  }

  // Step 4/5: Validate AI result against safety rules
  const validation = validateEnrichment(incident.severity, aiResult);

  if (!validation.passed) {
    // Step 5: Violation — quarantine, do NOT forward to Batching
    const detail = {
      deterministicSeverity: incident.severity,
      aiSuggestedSeverity: aiResult.suggestedSeverity,
      aiResponse: aiResult,
      detectedAt: new Date().toISOString(),
    };

    const quarantinedIncident: Incident = {
      ...incident,
      aiEnrichment: aiResult,
      safetyViolation: true,
      safetyViolationDetail: detail,
    };

    await pushToQuarantine(quarantinedIncident, detail);

    return {
      forwarded: false,
      incident: quarantinedIncident,
      action: 'quarantined',
    };
  }

  // Step 4: Valid — apply AI enrichment (may escalate severity), forward
  const isEscalation = aiResult.suggestedSeverity !== incident.severity;

  const enrichedIncident: Incident = {
    ...incident,
    // Rule 4: AI output is additive metadata — apply escalation to severity if warranted
    severity: aiResult.suggestedSeverity,
    ai_narrative: aiResult.narrative,
    aiEnrichment: aiResult,
    safetyViolation: false,
  };

  if (isEscalation) {
    logger.warn(
      {
        event: 'safety-gate.ai_escalation',
        incident_id: incident.incident_id,
        deterministicSeverity: incident.severity,
        escalatedSeverity: aiResult.suggestedSeverity,
      },
      'Safety Gate: AI escalated incident severity — applied and forwarding to Batching'
    );
  }

  await forwardToBatching(enrichedIncident);

  return {
    forwarded: true,
    incident: enrichedIncident,
    action: 'forwarded',
  };
}

async function forwardToBatching(incident: Incident): Promise<void> {
  try {
    await downstreamBatchingHandler(incident);
  } catch (err) {
    logger.error(
      { incident_id: incident.incident_id, err },
      'Safety Gate: Error in Batching handler — incident may not have been batched'
    );
  }
}

export * from './types';
export * from './validateEnrichment';
export * from './quarantine';
