import { z } from 'zod';
import { logger } from '../shared/logger';
import { AiEnrichmentResult } from './types';
import { Incident } from '../types/alert.types';
import { buildIncidentPrompt } from './prompt';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

/**
 * Zod schema for validating the AI's JSON response before trusting any field.
 * A response that doesn't match this shape is treated as malformed → null.
 */
const AiEnrichmentResultSchema = z.object({
  rootCauseSuggestion: z.string().min(1),
  suggestedSeverity: z.enum(['critical', 'warning', 'info', 'unknown']),
  narrative: z.string().min(1),
});

/**
 * Calls the Groq API to get AI enrichment for an incident.
 *
 * Rules (from SAFETY_GATE_README.md):
 * - Hard 2s timeout enforced via AbortController on the fetch itself
 * - GROQ_API_KEY read from env only — never logged
 * - Any error (network, timeout, parse failure, API error, malformed JSON) → return null
 * - null means "AI unavailable" — Safety Gate will proceed without AI (rule 3)
 *
 * @param incident - The correlated incident to enrich
 * @param timeoutMs - Hard timeout in milliseconds (default: 2000)
 * @returns AiEnrichmentResult if successful, null on any failure
 */
export async function getAiEnrichment(
  incident: Incident,
  timeoutMs: number = 2000
): Promise<AiEnrichmentResult | null> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    logger.warn(
      { incident_id: incident.incident_id },
      'ai-layer: GROQ_API_KEY not set — skipping AI enrichment'
    );
    return null;
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const prompt = buildIncidentPrompt(incident);

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,        // Low temperature for deterministic structured output
        max_tokens: 512,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutHandle);

    if (!response.ok) {
      logger.warn(
        { incident_id: incident.incident_id, status: response.status },
        'ai-layer: Groq API returned non-OK response — treating as unavailable'
      );
      return null;
    }

    const rawBody = await response.json() as Record<string, unknown>;
    const rawContent = (rawBody?.choices as Array<Record<string, unknown>>)?.[0]
      ?.message as Record<string, unknown>;
    const contentStr = rawContent?.content as string | undefined;

    if (!contentStr) {
      logger.warn(
        { incident_id: incident.incident_id },
        'ai-layer: Groq response missing content field — treating as unavailable'
      );
      return null;
    }

    // Parse JSON from content string
    let parsed: unknown;
    try {
      parsed = JSON.parse(contentStr);
    } catch {
      logger.warn(
        { incident_id: incident.incident_id },
        'ai-layer: Failed to parse Groq response as JSON — treating as unavailable'
      );
      return null;
    }

    // Validate shape with Zod — malformed response is not a violation, just unavailable
    const result = AiEnrichmentResultSchema.safeParse(parsed);
    if (!result.success) {
      logger.warn(
        { incident_id: incident.incident_id, issues: result.error.issues },
        'ai-layer: Groq response failed schema validation — treating as unavailable'
      );
      return null;
    }

    logger.info(
      {
        incident_id: incident.incident_id,
        suggestedSeverity: result.data.suggestedSeverity,
      },
      'ai-layer: Successfully received and validated AI enrichment'
    );

    return result.data;
  } catch (err) {
    clearTimeout(timeoutHandle);

    const isTimeout = err instanceof Error && err.name === 'AbortError';

    logger.warn(
      {
        incident_id: incident.incident_id,
        event: isTimeout ? 'ai-layer.timeout' : 'ai-layer.error',
        timeoutMs,
        err: isTimeout ? undefined : err,
      },
      isTimeout
        ? `ai-layer: Groq call timed out after ${timeoutMs}ms — proceeding without AI`
        : 'ai-layer: Unexpected error during Groq call — proceeding without AI'
    );

    return null;
  }
}

export * from './types';
export * from './prompt';
