// Re-export canonical Incident from shared types
export { Incident } from '../types/alert.types';
import { Alert, Severity } from '../types/alert.types';

export interface ServiceNode {
  service: string;
  depends_on: string[]; // services that this service relies upon
}

export type TopologyGraph = Record<string, ServiceNode>;
