import { validateEnrichment, SEVERITY_RANK } from '../validateEnrichment';
import { AiEnrichmentResult } from '../../ai-layer/types';
import { Severity } from '../../types/alert.types';

const makeAiResult = (suggestedSeverity: Severity): AiEnrichmentResult => ({
  rootCauseSuggestion: 'Database connection pool exhausted',
  suggestedSeverity,
  narrative: 'High connection count detected on postgres service.',
});

describe('validateEnrichment — Safety Gate Rules 1 & 2', () => {
  describe('passing cases (equal or escalation)', () => {
    it('should pass when AI severity equals deterministic severity', () => {
      expect(validateEnrichment('critical', makeAiResult('critical'))).toEqual({ passed: true });
      expect(validateEnrichment('high', makeAiResult('high'))).toEqual({ passed: true });
      expect(validateEnrichment('medium', makeAiResult('medium'))).toEqual({ passed: true });
      expect(validateEnrichment('low', makeAiResult('low'))).toEqual({ passed: true });
    });

    it('should pass when AI escalates low → medium', () => {
      expect(validateEnrichment('low', makeAiResult('medium'))).toEqual({ passed: true });
    });

    it('should pass when AI escalates low → high', () => {
      expect(validateEnrichment('low', makeAiResult('high'))).toEqual({ passed: true });
    });

    it('should pass when AI escalates low → critical', () => {
      expect(validateEnrichment('low', makeAiResult('critical'))).toEqual({ passed: true });
    });

    it('should pass when AI escalates medium → high', () => {
      expect(validateEnrichment('medium', makeAiResult('high'))).toEqual({ passed: true });
    });

    it('should pass when AI escalates medium → critical', () => {
      expect(validateEnrichment('medium', makeAiResult('critical'))).toEqual({ passed: true });
    });

    it('should pass when AI escalates high → critical', () => {
      expect(validateEnrichment('high', makeAiResult('critical'))).toEqual({ passed: true });
    });
  });

  describe('failing cases (downgrade — rule violation)', () => {
    it('should fail when AI downgrades critical → high (rule 1: critical never downgraded)', () => {
      const result = validateEnrichment('critical', makeAiResult('high'));
      expect(result.passed).toBe(false);
      if (!result.passed) {
        expect(result.reason).toContain('critical');
        expect(result.reason).toContain('high');
      }
    });

    it('should fail when AI downgrades critical → medium', () => {
      const result = validateEnrichment('critical', makeAiResult('medium'));
      expect(result.passed).toBe(false);
    });

    it('should fail when AI downgrades critical → low', () => {
      const result = validateEnrichment('critical', makeAiResult('low'));
      expect(result.passed).toBe(false);
    });

    it('should fail when AI downgrades high → medium (rule 2: never de-escalate)', () => {
      const result = validateEnrichment('high', makeAiResult('medium'));
      expect(result.passed).toBe(false);
    });

    it('should fail when AI downgrades high → low', () => {
      const result = validateEnrichment('high', makeAiResult('low'));
      expect(result.passed).toBe(false);
    });

    it('should fail when AI downgrades medium → low', () => {
      const result = validateEnrichment('medium', makeAiResult('low'));
      expect(result.passed).toBe(false);
    });
  });

  describe('SEVERITY_RANK ordering', () => {
    it('should have correct rank ordering: low < medium < high < critical', () => {
      expect(SEVERITY_RANK.low).toBeLessThan(SEVERITY_RANK.medium);
      expect(SEVERITY_RANK.medium).toBeLessThan(SEVERITY_RANK.high);
      expect(SEVERITY_RANK.high).toBeLessThan(SEVERITY_RANK.critical);
    });
  });
});
