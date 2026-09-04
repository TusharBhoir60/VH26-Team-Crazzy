# Data Model Document — Alert Fatigue Buster

## 1. Shared TypeScript Interface (locked contract)

`src/types/alert.types.ts`

```typescript
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type AlertStatus = 'firing' | 'flapping' | 'resolved';
export type Source = 'prometheus' | 'datadog';
export type Confidence = 'high' | 'medium' | 'low';

export interface Alert {
  fingerprint: string;              // sha256(alertname+labels)
  alertname: string;
  service: string;
  labels: Record<string, string>;
  status: AlertStatus;
  source: Source;
  raw_payload: Record<string, unknown>;
  received_at: string;              // ISO8601
  severity_score: Severity | null;
  cluster_id: string | null;        // uuid, null if uncorrelated
  is_root_cause: boolean;
}

export interface Cluster {
  cluster_id: string;                // uuid
  severity: Severity;
  root_cause: {
    service: string;
    alert: string;
    confidence: Confidence;
  } | null;
  affected_services: string[];
  downstream_count: number;
  raw_alert_count_suppressed: number;
  ai_narrative: string | null;
  created_at: string;                // ISO8601
}

export type PipelineStage = (alert: Alert) => Promise<Alert>;
```

## 2. Redis Key Specifications

| Key pattern | Data type | Value | TTL | Set by | Purpose |
|---|---|---|---|---|---|
| `dedup:{fingerprint}` | String (counter) | integer count | 5 min (rolling, reset on hit) | Dedup stage | Detect + count duplicate firings |
| `lifecycle:{fingerprint}` | Hash | `{state: string, last_transition_at: ISO8601}` | 1 hour | Lifecycle stage | Track firing/flapping/resolved state |
| `cooldown:{fingerprint_or_cluster_id}` | String | `last_notified_at` (ISO8601) | Severity-scaled: critical=60s, high=300s, medium=900s, low=1800s | Cooldown stage | Suppress re-notify within window |
| `batch:{cluster_id}` | List (JSON-serialized Alert objects) | array of alert objects | 10s (batching window duration) | Batching stage | Buffer alerts for digest flush |
| `flap_count:{fingerprint}` | String (counter) | integer count | 10 min | Lifecycle stage | Count fire/resolve cycles to detect flapping (threshold: 3+ cycles in window = flapping) |

**TTL rationale:** cooldown TTLs directly implement the PRD's adaptive cooldown requirement (critical 1min, noisy 30min) — table above is the canonical source for these values, referenced by `cooldown.service.ts`.

## 3. PostgreSQL Schema (Supabase)

```sql
-- Alerts table: full history, one row per received alert event
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint TEXT NOT NULL,
  alertname TEXT NOT NULL,
  service TEXT NOT NULL,
  labels JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('firing', 'flapping', 'resolved')),
  source TEXT NOT NULL CHECK (source IN ('prometheus', 'datadog')),
  raw_payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  severity_score TEXT CHECK (severity_score IN ('critical', 'high', 'medium', 'low')),
  cluster_id UUID REFERENCES clusters(cluster_id) ON DELETE SET NULL,
  is_root_cause BOOLEAN NOT NULL DEFAULT false,
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  suppressed BOOLEAN NOT NULL DEFAULT false,
  suppression_reason TEXT
);

CREATE INDEX idx_alerts_fingerprint ON alerts (fingerprint);
CREATE INDEX idx_alerts_service ON alerts (service);
CREATE INDEX idx_alerts_cluster_id ON alerts (cluster_id);
CREATE INDEX idx_alerts_received_at ON alerts (received_at DESC);
CREATE INDEX idx_alerts_severity ON alerts (severity_score);

-- Clusters table: correlated alert groups
CREATE TABLE clusters (
  cluster_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  root_cause_service TEXT,
  root_cause_alertname TEXT,
  root_cause_confidence TEXT CHECK (root_cause_confidence IN ('high', 'medium', 'low')),
  affected_services TEXT[] NOT NULL DEFAULT '{}',
  downstream_count INTEGER NOT NULL DEFAULT 0,
  raw_alert_count_suppressed INTEGER NOT NULL DEFAULT 0,
  ai_narrative TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_clusters_created_at ON clusters (created_at DESC);
CREATE INDEX idx_clusters_severity ON clusters (severity);

-- Notifications table: audit log of what was actually sent
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES alerts(id) ON DELETE SET NULL,
  cluster_id UUID REFERENCES clusters(cluster_id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('pagerduty', 'slack', 'discord', 'email')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL,
  error_message TEXT
);

CREATE INDEX idx_notifications_sent_at ON notifications (sent_at DESC);
CREATE INDEX idx_notifications_channel ON notifications (channel);

-- Stats snapshot table: precomputed for dashboard performance (optional, populate via cron/trigger)
CREATE TABLE stats_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  raw_alert_count INTEGER NOT NULL,
  notifications_sent INTEGER NOT NULL,
  reduction_percent NUMERIC(5,2) NOT NULL,
  avg_mttr_seconds INTEGER,
  false_positive_rate NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Note:** `alerts.cluster_id` foreign key references `clusters.cluster_id`, so `clusters` table must be created first, or use `ALTER TABLE alerts ADD CONSTRAINT ... FOREIGN KEY` after both tables exist to avoid create-order issues.

## 4. service-dependency-graph.yaml — Full Example

`config/service-dependency-graph.yaml`

```yaml
services:
  database:
    depends_on: []
    tier: critical

  auth-service:
    depends_on: [database]
    tier: critical

  payment-service:
    depends_on: [database, auth-service]
    tier: critical

  checkout-api:
    depends_on: [payment-service]
    tier: high

  inventory-service:
    depends_on: [database]
    tier: high

  frontend:
    depends_on: [checkout-api, inventory-service]
    tier: medium

  notification-service:
    depends_on: [database]
    tier: low
```

**Correlation logic reference:** when alerts fire on `frontend`, `checkout-api`, and `payment-service` within the same time window, the correlation engine walks `depends_on` chains upward. `database` is the common ancestor. If `database` also has an active alert, it's tagged root cause with `confidence: high`. If `database` has no alert but is the deepest common dependency, it's tagged as likely root with `confidence: medium`. Services not present in this file skip correlation entirely and route as standalone alerts (see Architecture doc, Section 4, "Correlation engine — no dependency graph entry for a service").

## 5. Field-Level Notes

- `fingerprint` is computed as `sha256(alertname + sorted(labels))` — must be deterministic across Prometheus and Datadog normalizers so the same underlying alert produces the same fingerprint regardless of source
- `severity_score` is nullable in Postgres because the pipeline may store the alert before the severity stage completes (async processing) — dashboard queries should filter/handle null gracefully
- `cluster_id` is nullable — most alerts in a light-traffic demo scenario may be standalone (no correlation match)
- `suppression_reason` free-text values expected: `'duplicate'`, `'cooldown_active'`, `'batched'` — used for dashboard transparency on why an alert didn't generate a notification
