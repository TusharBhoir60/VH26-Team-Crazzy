import { Alert, Severity } from '../types/alert.types';

export interface Incident {
  incident_id: string; // uuid
  root_cause: Alert;
  alerts: Alert[]; // all contributing alerts, including root cause
  severity: Severity;
  summary: string;
  created_at: string; // ISO8601
}

export interface ServiceNode {
  service: string;
  depends_on: string[]; // services that this service relies upon (e.g. database-primary -> affects checkout-service. so checkout-service depends on database-primary)
}

export type TopologyGraph = Record<string, ServiceNode>;
