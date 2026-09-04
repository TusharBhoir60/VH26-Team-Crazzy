import { SourceAdapter, NormalizationResult, NormalizationError } from '../types';
import { Alert, AlertStatus } from '../../types/alert.types';
import { mapAlertmanagerSeverity } from '../severityMaps';
import { computeFingerprint } from '../../shared/crypto';

export class AlertmanagerAdapter implements SourceAdapter {
  public readonly sourceName = 'prometheus';

  public normalize(rawPayload: unknown): NormalizationResult[] {
    if (!rawPayload || typeof rawPayload !== 'object') {
      throw new NormalizationError(
        'Alertmanager payload must be a non-null JSON object',
        this.sourceName,
        rawPayload
      );
    }

    const payload = rawPayload as Record<string, unknown>;

    if (!Array.isArray(payload['alerts']) || payload['alerts'].length === 0) {
      throw new NormalizationError(
        "Alertmanager payload must contain a non-empty 'alerts' array",
        this.sourceName,
        rawPayload
      );
    }

    const results: NormalizationResult[] = [];

    for (let i = 0; i < payload['alerts'].length; i++) {
      const item = payload['alerts'][i];
      if (!item || typeof item !== 'object') {
        throw new NormalizationError(
          `Alert item at index ${i} is not a valid object`,
          this.sourceName,
          item
        );
      }

      const itemObj = item as Record<string, unknown>;
      const warnings: string[] = [];

      // Extract labels
      const rawLabels = (itemObj['labels'] && typeof itemObj['labels'] === 'object' ? itemObj['labels'] : {}) as Record<string, unknown>;
      const labels: Record<string, string> = {};
      for (const [k, v] of Object.entries(rawLabels)) {
        if (typeof v === 'string') {
          labels[k] = v;
        } else if (v !== null && v !== undefined) {
          labels[k] = String(v);
          warnings.push(`Label '${k}' had non-string value converted to string`);
        }
      }

      // Extract alertname
      let alertname = labels['alertname']?.trim();
      if (!alertname) {
        alertname = 'UnknownAlert';
        warnings.push("Alert item missing 'alertname' label; defaulted to 'UnknownAlert'");
      }

      // Extract service
      const service =
        labels['service'] ||
        labels['job'] ||
        labels['app'] ||
        labels['application'] ||
        'unknown-service';

      if (!labels['service'] && !labels['job'] && !labels['app'] && !labels['application']) {
        warnings.push("Alert item missing explicit service label; defaulted to 'unknown-service'");
      }

      // Extract status
      const itemStatus = typeof itemObj['status'] === 'string' ? itemObj['status'].toLowerCase().trim() : '';
      const status: AlertStatus = itemStatus === 'resolved' ? 'resolved' : 'firing';
      if (itemStatus !== 'firing' && itemStatus !== 'resolved') {
        warnings.push(`Alert item had unrecognized status '${itemObj['status']}'; defaulted to 'firing'`);
      }

      // Extract severity
      const rawAnnotations = (itemObj['annotations'] && typeof itemObj['annotations'] === 'object' ? itemObj['annotations'] : {}) as Record<string, unknown>;
      const rawSeverity = (labels['severity'] || labels['priority'] || labels['level'] || rawAnnotations['severity']) as string | undefined;

      const severityMapping = mapAlertmanagerSeverity(rawSeverity);
      if (severityMapping.warning) {
        warnings.push(severityMapping.warning);
      }

      // Extract / compute fingerprint
      let fingerprint = typeof itemObj['fingerprint'] === 'string' && itemObj['fingerprint'].trim().length > 0
        ? itemObj['fingerprint'].trim()
        : '';

      if (!fingerprint) {
        fingerprint = computeFingerprint(alertname, labels);
        warnings.push('Alert item missing native fingerprint; generated deterministic SHA-256 fingerprint from alertname and labels');
      }

      const received_at = new Date().toISOString();

      const alert: Alert = {
        fingerprint,
        alertname,
        service,
        labels,
        status,
        source: 'prometheus',
        raw_payload: payload,
        received_at,
        severity_score: severityMapping.severity,
        cluster_id: null,
        is_root_cause: false,
      };

      results.push({ alert, warnings });
    }

    return results;
  }
}
