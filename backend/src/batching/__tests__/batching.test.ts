import { submitToBatch, setForwardCriticalCallback } from '../index';
import { flushBatch, resetBatchStoreForTesting } from '../store';
import { Incident } from '../../correlation/types';
import { Alert } from '../../types/alert.types';

describe('Batching Stage', () => {
  const createMockIncident = (id: string, severity: 'critical' | 'warning' | 'info' | 'unknown'): Incident => {
    return {
      incident_id: id,
      severity,
      summary: `Test incident ${id}`,
      created_at: new Date().toISOString(),
      root_cause: {} as Alert,
      alerts: [],
    };
  };

  beforeEach(() => {
    resetBatchStoreForTesting();
  });

  describe('Critical bypass', () => {
    it('should immediately forward critical incidents and not queue them', async () => {
      const mockForward = jest.fn();
      setForwardCriticalCallback(mockForward);

      const criticalIncident = createMockIncident('c1', 'critical');
      await submitToBatch(criticalIncident);

      expect(mockForward).toHaveBeenCalledTimes(1);
      expect(mockForward).toHaveBeenCalledWith(criticalIncident);

      // Verify it was NOT queued
      const batch = flushBatch();
      expect(batch).toHaveLength(0);
    });
  });

  describe('Queueing and Grouping', () => {
    it('should queue non-critical incidents', async () => {
      const mockForward = jest.fn();
      setForwardCriticalCallback(mockForward);

      const warningIncident = createMockIncident('w1', 'warning');
      await submitToBatch(warningIncident);

      // Should not be forwarded immediately
      expect(mockForward).not.toHaveBeenCalled();

      // Should be in the queue
      const batch = flushBatch();
      expect(batch).toHaveLength(1);
      expect(batch[0]?.severity).toBe('warning');
      expect(batch[0]?.incidents).toHaveLength(1);
      expect(batch[0]?.incidents[0]?.incident_id).toBe('w1');
    });

    it('should group incidents by severity and destination channel', async () => {
      await submitToBatch(createMockIncident('w1', 'warning'));
      await submitToBatch(createMockIncident('w2', 'warning'));
      await submitToBatch(createMockIncident('i1', 'info'));
      await submitToBatch(createMockIncident('u1', 'unknown'));

      const batch = flushBatch();
      
      // Warning goes to Slack
      // Info goes to Email-Discord
      // Unknown goes to Slack
      expect(batch).toHaveLength(3); // Warning(slack), Info(email-discord), Unknown(slack)

      const warningGroup = batch.find(b => b.severity === 'warning');
      expect(warningGroup?.incidents).toHaveLength(2);
      expect(warningGroup?.destinationChannel).toBe('slack');

      const infoGroup = batch.find(b => b.severity === 'info');
      expect(infoGroup?.incidents).toHaveLength(1);
      expect(infoGroup?.destinationChannel).toBe('email-discord');

      const unknownGroup = batch.find(b => b.severity === 'unknown');
      expect(unknownGroup?.incidents).toHaveLength(1);
      expect(unknownGroup?.destinationChannel).toBe('slack');
    });

    it('should return empty array when flushing an empty queue', () => {
      const batch = flushBatch();
      expect(batch).toHaveLength(0);
    });
  });
});
