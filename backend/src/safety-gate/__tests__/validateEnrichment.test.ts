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
      expect(validateEnrichment('warning', makeAiResult('warning'))).toEqual({ passed: true });
      expect(validateEnrichment('info', makeAiResult('info'))).toEqual({ passed: true });
    });

    it('should pass when AI escalates info → warning', () => {
      expect(validateEnrichment('info', makeAiResult('warning'))).toEqual({ passed: true });
    });

    it('should pass when AI escalates info → critical', () => {
      expect(validateEnrichment('info', makeAiResult('critical'))).toEqual({ passed: true });
    });

    it('should pass when AI escalates warning → critical', () => {
      expect(validateEnrichment('warning', makeAiResult('critical'))).toEqual({ passed: true });
    });
  });

  describe('failing cases (downgrade — rule violation)', () => {
    it('should fail when AI downgrades critical → warning (rule 1: critical never downgraded)', () => {
      const result = validateEnrichment('critical', makeAiResult('warning'));
      expect(result.passed).toBe(false);
      if (!result.passed) {
        expect(result.reason).toContain('critical');
        expect(result.reason).toContain('warning');
      }
    });

    it('should fail when AI downgrades critical → info', () => {
      const result = validateEnrichment('critical', makeAiResult('info'));
      expect(result.passed).toBe(false);
    });

    it('should fail when AI downgrades warning → info (rule 2: never de-escalate)', () => {
      const result = validateEnrichment('warning', makeAiResult('info'));
      expect(result.passed).toBe(false);
    });
  });

  describe('SEVERITY_RANK ordering', () => {
    it('should have correct rank ordering: unknown < info < warning < critical', () => {
      expect(SEVERITY_RANK.unknown).toBeLessThan(SEVERITY_RANK.info);
      expect(SEVERITY_RANK.info).toBeLessThan(SEVERITY_RANK.warning);
      expect(SEVERITY_RANK.warning).toBeLessThan(SEVERITY_RANK.critical);
    });
  });
});
