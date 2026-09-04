import { Alert } from '../types/alert.types';

export interface NormalizationResult {
  alert: Alert;
  warnings: string[];
}

export interface SourceAdapter {
  readonly sourceName: string;
  normalize(rawPayload: unknown): Promise<NormalizationResult[]> | NormalizationResult[];
}

export class NormalizationError extends Error {
  public readonly source: string;
  public readonly details?: unknown;

  constructor(message: string, source: string, details?: unknown) {
    super(message);
    this.name = 'NormalizationError';
    this.source = source;
    this.details = details;
    Object.setPrototypeOf(this, NormalizationError.prototype);
  }
}
