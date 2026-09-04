import { Alert, Severity } from '../types/alert.types';

export interface DedupResult {
  isDuplicate: boolean;
  count: number;
  alert: Alert;
  suppressed: boolean;
  firstSeenAt?: string;
  lastSeenAt?: string;
  ttlSeconds?: number;
}

export interface DedupEntry {
  severity: Severity | 'unknown';
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
  normalizedAlert: string; // JSON serialized Alert
}
