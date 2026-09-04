import { Incident } from '../correlation/types';
import { Severity } from '../types/alert.types';

export interface BatchedGroup {
  severity: Severity;
  destinationChannel: string;
  incidents: Incident[];
  windowStart: number;
  windowEnd: number;
}
