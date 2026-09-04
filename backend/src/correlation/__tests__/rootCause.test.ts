import { selectRootCause } from '../rootCause';
import { Alert } from '../../types/alert.types';

const mockGraph = {
  "database": { service: "database", depends_on: [] },
  "backend": { service: "backend", depends_on: ["database"] },
  "frontend": { service: "frontend", depends_on: ["backend"] }
};

const createMockAlert = (service: string, severity: any, timeOffset: number): Alert => ({
  fingerprint: `${service}-123`,
  alertname: 'HighCPU',
  service,
  labels: {},
  status: 'firing',
  source: 'prometheus',
  raw_payload: {},
  received_at: new Date(Date.now() + timeOffset).toISOString(),
  severity_score: severity,
  cluster_id: null,
  is_root_cause: false,
});

describe('Root Cause Selection', () => {
  it('selects the most upstream alert', () => {
    const alerts = [
      createMockAlert('frontend', 'critical', 100),
      createMockAlert('database', 'warning', 0),
      createMockAlert('backend', 'critical', 50)
    ];

    const rootCause = selectRootCause(alerts, mockGraph);
    expect(rootCause.service).toBe('database');
  });

  it('breaks ties using severity', () => {
    // Both alerts have no dependency between them
    const graph = {
      "db1": { service: "db1", depends_on: [] },
      "db2": { service: "db2", depends_on: [] }
    };
    
    const alerts = [
      createMockAlert('db1', 'medium', 0),
      createMockAlert('db2', 'critical', 50)
    ];

    const rootCause = selectRootCause(alerts, graph);
    expect(rootCause.service).toBe('db2');
  });

  it('breaks ties using timestamp if severity is equal', () => {
    const graph = {
      "db1": { service: "db1", depends_on: [] },
      "db2": { service: "db2", depends_on: [] }
    };
    
    const alerts = [
      createMockAlert('db1', 'critical', 100), // later
      createMockAlert('db2', 'critical', 50)  // earlier
    ];

    const rootCause = selectRootCause(alerts, graph);
    expect(rootCause.service).toBe('db2');
  });
});
