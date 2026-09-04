import { correlate } from '../index';
import * as incidentStore from '../incidentStore';
import * as serviceGraph from '../topology/serviceGraph';
import { Alert } from '../../types/alert.types';

jest.mock('../incidentStore');
jest.mock('../topology/serviceGraph');

const createMockAlert = (service: string, fingerprint: string = '123'): Alert => ({
  fingerprint,
  alertname: 'TestAlert',
  service,
  labels: {},
  status: 'firing',
  source: 'prometheus',
  raw_payload: {},
  received_at: new Date().toISOString(),
  severity_score: 'high',
  cluster_id: null,
  is_root_cause: false,
});

describe('Correlation Module', () => {
  const mockGraph = {
    "db": { service: "db", depends_on: [] },
    "backend": { service: "backend", depends_on: ["db"] }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (serviceGraph.loadTopologyGraph as jest.Mock).mockResolvedValue(mockGraph);
  });

  it('creates a new incident for an isolated alert', async () => {
    (incidentStore.getActiveIncidentByServices as jest.Mock).mockResolvedValue(null);

    const alert = createMockAlert('isolated-service');
    const incident = await correlate(alert);

    expect(incident.alerts.length).toBe(1);
    expect(incident.root_cause.service).toBe('isolated-service');
    expect(incidentStore.saveIncident).toHaveBeenCalled();
  });

  it('merges topologically connected alerts into the same incident', async () => {
    const existingAlert = createMockAlert('db', 'fingerprint-db');
    const existingIncident = {
      incident_id: 'test-incident-1',
      root_cause: existingAlert,
      alerts: [existingAlert],
      severity: 'high',
      summary: 'test',
      created_at: new Date().toISOString()
    };

    (incidentStore.getActiveIncidentByServices as jest.Mock).mockResolvedValue(existingIncident);

    const newAlert = createMockAlert('backend', 'fingerprint-backend');
    const updatedIncident = await correlate(newAlert);

    expect(updatedIncident.alerts.length).toBe(2);
    expect(updatedIncident.root_cause.service).toBe('db'); // db is upstream
    expect(incidentStore.saveIncident).toHaveBeenCalledWith(updatedIncident, ['db', 'backend']);
  });

  it('does not merge if alert is already in incident', async () => {
    const existingAlert = createMockAlert('db', 'fingerprint-db');
    const existingIncident = {
      incident_id: 'test-incident-1',
      root_cause: existingAlert,
      alerts: [existingAlert],
      severity: 'high',
      summary: 'test',
      created_at: new Date().toISOString()
    };

    (incidentStore.getActiveIncidentByServices as jest.Mock).mockResolvedValue(existingIncident);

    const updatedIncident = await correlate(existingAlert); // sending same alert again
    expect(updatedIncident.alerts.length).toBe(1);
  });
});
