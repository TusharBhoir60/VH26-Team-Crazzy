import { SourceAdapter, NormalizationResult, NormalizationError } from './types';
import { AlertmanagerAdapter } from './adapters/alertmanager';
import { DatadogAdapter } from './adapters/datadog';
import { logger } from '../shared/logger';

export class NormalizationRegistry {
  private adapters = new Map<string, SourceAdapter>();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    const alertmanager = new AlertmanagerAdapter();
    this.registerAdapter(alertmanager, ['alertmanager', 'prometheus']);

    const datadog = new DatadogAdapter();
    this.registerAdapter(datadog, ['datadog']);
  }

  /**
   * Registers a source adapter under its primary sourceName and optional aliases.
   */
  public registerAdapter(adapter: SourceAdapter, aliases: string[] = []): void {
    const key = adapter.sourceName.toLowerCase().trim();
    this.adapters.set(key, adapter);

    for (const alias of aliases) {
      this.adapters.set(alias.toLowerCase().trim(), adapter);
    }

    logger.debug({ source: adapter.sourceName, aliases }, 'Registered normalization adapter');
  }

  /**
   * Retrieves a source adapter by name or alias.
   */
  public getAdapter(sourceName: string): SourceAdapter | undefined {
    return this.adapters.get(sourceName.toLowerCase().trim());
  }

  /**
   * Normalizes a raw payload from the specified monitoring source into canonical Alert objects.
   */
  public async normalize(sourceName: string, rawPayload: unknown): Promise<NormalizationResult[]> {
    const adapter = this.getAdapter(sourceName);

    if (!adapter) {
      throw new NormalizationError(
        `No normalization adapter registered for source: '${sourceName}'`,
        sourceName,
        rawPayload
      );
    }

    const results = await adapter.normalize(rawPayload);

    for (const result of results) {
      if (result.warnings.length > 0) {
        logger.warn(
          {
            source: sourceName,
            fingerprint: result.alert.fingerprint,
            alertname: result.alert.alertname,
            warnings: result.warnings,
          },
          'Normalization completed with warnings'
        );
      }
    }

    return results;
  }
}

// Export singleton instance
export const normalizationRegistry = new NormalizationRegistry();

/**
 * Public convenience entrypoint for normalization.
 */
export async function normalize(
  sourceName: string,
  rawPayload: unknown
): Promise<NormalizationResult[]> {
  return normalizationRegistry.normalize(sourceName, rawPayload);
}
