import { SourceAdapter, NormalizationResult, NormalizationError } from '../types';
import { Alert, AlertStatus } from '../../types/alert.types';
import { mapDatadogSeverity } from '../severityMaps';
import { computeFingerprint } from '../../shared/crypto';

export class DatadogAdapter implements SourceAdapter {
  public readonly sourceName = 'datadog';

  public normalize(rawPayload: unknown): NormalizationResult[] {
    if (!rawPayload || typeof rawPayload !== 'object') {
      throw new NormalizationError(
        'Datadog payload must be a non-null JSON object',
        this.sourceName,
        rawPayload
      );
    }

    const payload = rawPayload as Record<string, unknown>;
    const warnings: string[] = [];

    // Title validation (hard-reject if missing or empty)
    const rawTitle = payload['title'];
    if (typeof rawTitle !== 'string' || rawTitle.trim().length === 0) {
      throw new NormalizationError(
        "Datadog payload missing required non-empty 'title' field",
        this.sourceName,
        rawPayload
      );
    }

    const title = rawTitle.trim();

    // Parse tags into structured key-value labels
    const labels: Record<string, string> = {};
    const rawTags = payload['tags'];

    if (Array.isArray(rawTags)) {
      for (const t of rawTags) {
        if (typeof t === 'string') {
          this.parseTag(t, labels);
        } else if (t !== null && t !== undefined) {
          this.parseTag(String(t), labels);
          warnings.push(`Non-string tag encountered and converted to string: ${String(t)}`);
        }
      }
    } else if (typeof rawTags === 'string' && rawTags.trim().length > 0) {
      for (const t of rawTags.split(',')) {
        this.parseTag(t, labels);
      }
    } else if (rawTags !== undefined && rawTags !== null) {
      warnings.push("Datadog 'tags' was neither an array nor a string; tags were skipped");
    }

    // Clean alertname (strip common status prefixes)
    let alertname = title.replace(/^\[(Triggered|Recovered|Warn|Alert|OK)\]\s*/i, '').trim();
    if (!alertname) {
      alertname = title;
    }

    // Determine service
    const hostname = typeof payload['hostname'] === 'string' ? payload['hostname'] : undefined;
    const service =
      labels['service'] ||
      labels['app'] ||
      labels['application'] ||
      hostname ||
      'unknown-service';

    if (!labels['service'] && !labels['app'] && !labels['application'] && !hostname) {
      warnings.push("Datadog alert missing explicit service tag or hostname; defaulted to 'unknown-service'");
    }

    // Determine status
    const alertType = typeof payload['alert_type'] === 'string' ? payload['alert_type'].toLowerCase().trim() : undefined;
    const transition = typeof payload['alert_transition'] === 'string' ? payload['alert_transition'].toLowerCase().trim() : undefined;
    const alertStatus = typeof payload['alert_status'] === 'string' ? payload['alert_status'].toLowerCase().trim() : undefined;

    let status: AlertStatus = 'firing';
    if (
      alertType === 'success' ||
      transition === 'recovered' ||
      alertStatus === 'ok' ||
      title.toLowerCase().includes('[recovered]')
    ) {
      status = 'resolved';
    }

    // Map severity
    const priority = typeof payload['priority'] === 'string' ? payload['priority'] : undefined;
    const severityMapping = mapDatadogSeverity({
      priority,
      alertType,
      labels,
    });

    if (severityMapping.warning) {
      warnings.push(severityMapping.warning);
    }

    // Derive deterministic fingerprint
    const fingerprint = computeFingerprint(alertname, labels);
    const received_at = new Date().toISOString();

    const alert: Alert = {
      fingerprint,
      alertname,
      service,
      labels,
      status,
      source: 'datadog',
      raw_payload: payload,
      received_at,
      severity_score: severityMapping.severity,
      cluster_id: null,
      is_root_cause: false,
    };

    return [{ alert, warnings }];
  }

  private parseTag(rawTag: string, target: Record<string, string>): void {
    const tag = rawTag.trim();
    if (!tag) return;

    const colonIdx = tag.indexOf(':');
    if (colonIdx > 0) {
      const key = tag.slice(0, colonIdx).trim().toLowerCase();
      const value = tag.slice(colonIdx + 1).trim();
      target[key] = value;
    } else {
      target[tag.toLowerCase()] = 'true';
    }
  }
}
