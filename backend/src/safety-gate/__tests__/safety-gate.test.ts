import { applySafetyGate, setBatchingHandler } from '../index';
import { Incident } from '../types';
import { AiEnrichmentResult } from '../../ai-layer/types';
import * as aiLayer from '../../ai-layer/index';
import * as quarantine from '../quarantine';

// ──────────────────────────────────────────────────────────────────────────────
// Fixtures
// ──────────────────────────────────────────────────────────────────────────────

const createSampleIncident = (overrides: Partial<Incident> = {}): Incident => ({
  cluster_id: 'test-cluster-uuid-001',
  severity: 'critical',
  root_cause: {
    service: 'database',
    alert: 'PostgresHighConnections',
    confidence: 'high',
  },
  affected_services: ['database', 'api', 'auth'],
  downstream_count: 3,
  raw_alert_count_suppressed: 47,
  ai_narrative: null,
  created_at: new Date().toISOString(),
  alerts: [
    {
      fingerprint: 'fp-001',
      alertname: 'PostgresHighConnections',
      service: 'database',
      labels: { env: 'production' },
      status: 'firing',
      source: 'prometheus',
      raw_payload: {},
      received_at: new Date().toISOString(),
      severity_score: 'critical',
      cluster_id: 'test-cluster-uuid-001',
      is_root_cause: true,
    },
  ],
  aiEnrichment: null,
  safetyViolation: false,
  ...overrides,
});

const validAiResult = (severity: AiEnrichmentResult['suggestedSeverity'] = 'critical'): AiEnrichmentResult => ({
  rootCauseSuggestion: 'PostgresHighConnections on database service',
  suggestedSeverity: severity,
  narrative: 'Database connection pool is exhausted. Check pg_stat_activity and increase max_connections.',
});

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

describe('applySafetyGate — Pipeline Join Point', () => {
  let batchingReceived: Incident[];
  let mockGetAiEnrichment: jest.SpyInstance;
  let mockPushToQuarantine: jest.SpyInstance;

  beforeEach(() => {
    batchingReceived = [];

    // Capture what gets forwarded to Batching
    setBatchingHandler(async (incident: Incident) => {
      batchingReceived.push(incident);
    });

    // Default: spy on AI layer (override per test)
    mockGetAiEnrichment = jest.spyOn(aiLayer, 'getAiEnrichment').mockResolvedValue(null);

    // Spy on quarantine push (avoid real Redis)
    mockPushToQuarantine = jest
      .spyOn(quarantine, 'pushToQuarantine')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Rule 3: AI unavailable ────────────────────────────────────────────────

  it('should forward incident unchanged when AI returns null (rule 3: proceed without AI)', async () => {
    mockGetAiEnrichment.mockResolvedValue(null);
    const incident = createSampleIncident();

    const result = await applySafetyGate(incident);

    expect(result.forwarded).toBe(true);
    expect(result.action).toBe('ai_unavailable');
    expect(result.incident.aiEnrichment).toBeNull();
    expect(result.incident.safetyViolation).toBe(false);
    expect(batchingReceived).toHaveLength(1);
    expect(mockPushToQuarantine).not.toHaveBeenCalled();
  });

  it('should treat a malformed AI response the same as null — forward, not quarantine', async () => {
    // getAiEnrichment already returns null for malformed responses (Zod validation)
    // so from Safety Gate's perspective this is identical to rule 3
    mockGetAiEnrichment.mockResolvedValue(null);
    const incident = createSampleIncident();

    const result = await applySafetyGate(incident);

    expect(result.forwarded).toBe(true);
    expect(result.action).toBe('ai_unavailable');
    expect(result.incident.safetyViolation).toBe(false);
    expect(mockPushToQuarantine).not.toHaveBeenCalled();
  });

  // ── Rule 2: Escalation allowed ────────────────────────────────────────────

  it('should apply AI escalation and forward when AI upgrades severity (e.g. medium → critical)', async () => {
    const incident = createSampleIncident({ severity: 'medium' });
    mockGetAiEnrichment.mockResolvedValue(validAiResult('critical'));

    const result = await applySafetyGate(incident);

    expect(result.forwarded).toBe(true);
    expect(result.action).toBe('forwarded');
    expect(result.incident.severity).toBe('critical');       // Escalation applied
    expect(result.incident.aiEnrichment?.suggestedSeverity).toBe('critical');
    expect(result.incident.safetyViolation).toBe(false);
    expect(batchingReceived).toHaveLength(1);
    expect(batchingReceived[0]?.severity).toBe('critical');
    expect(mockPushToQuarantine).not.toHaveBeenCalled();
  });

  it('should forward normally when AI matches deterministic severity exactly', async () => {
    const incident = createSampleIncident({ severity: 'high' });
    mockGetAiEnrichment.mockResolvedValue(validAiResult('high'));

    const result = await applySafetyGate(incident);

    expect(result.forwarded).toBe(true);
    expect(result.action).toBe('forwarded');
    expect(result.incident.severity).toBe('high');
    expect(result.incident.safetyViolation).toBe(false);
    expect(batchingReceived).toHaveLength(1);
  });

  // ── Rule 1/2: Downgrade → quarantine ─────────────────────────────────────

  it('should quarantine incident when AI downgrades critical → high (rule 1 violation)', async () => {
    const incident = createSampleIncident({ severity: 'critical' });
    mockGetAiEnrichment.mockResolvedValue(validAiResult('high'));

    const result = await applySafetyGate(incident);

    expect(result.forwarded).toBe(false);
    expect(result.action).toBe('quarantined');
    expect(result.incident.safetyViolation).toBe(true);
    expect(result.incident.safetyViolationDetail?.deterministicSeverity).toBe('critical');
    expect(result.incident.safetyViolationDetail?.aiSuggestedSeverity).toBe('high');
    expect(batchingReceived).toHaveLength(0);   // Never reached Batching
    expect(mockPushToQuarantine).toHaveBeenCalledWith(
      expect.objectContaining({ safetyViolation: true }),
      expect.objectContaining({ deterministicSeverity: 'critical', aiSuggestedSeverity: 'high' })
    );
  });

  it('should quarantine incident when AI downgrades high → medium (rule 2 violation)', async () => {
    const incident = createSampleIncident({ severity: 'high' });
    mockGetAiEnrichment.mockResolvedValue(validAiResult('medium'));

    const result = await applySafetyGate(incident);

    expect(result.forwarded).toBe(false);
    expect(result.action).toBe('quarantined');
    expect(result.incident.safetyViolation).toBe(true);
    expect(batchingReceived).toHaveLength(0);
  });

  // ── Timeout handling ──────────────────────────────────────────────────────

  it('should treat a Groq timeout (null returned) as AI unavailable and forward cleanly', async () => {
    // Simulate a 2s timeout: getAiEnrichment returns null after AbortController fires
    mockGetAiEnrichment.mockImplementation(
      (_incident: Incident, _timeoutMs: number) => Promise.resolve(null)
    );
    const incident = createSampleIncident({ severity: 'critical' });

    const result = await applySafetyGate(incident);

    expect(result.forwarded).toBe(true);
    expect(result.action).toBe('ai_unavailable');
    expect(result.incident.aiEnrichment).toBeNull();
    expect(batchingReceived).toHaveLength(1);
    expect(mockPushToQuarantine).not.toHaveBeenCalled();
  });

  // ── AI narrative attached ─────────────────────────────────────────────────

  it('should attach AI narrative to the incident when enrichment is valid', async () => {
    const incident = createSampleIncident({ severity: 'high' });
    const aiResult = validAiResult('high');
    mockGetAiEnrichment.mockResolvedValue(aiResult);

    const result = await applySafetyGate(incident);

    expect(result.incident.ai_narrative).toBe(aiResult.narrative);
    expect(result.incident.aiEnrichment).toEqual(aiResult);
  });
});
