/**
 * Seed script v2 — EDGE CASE PROFILE
 * Standalone alternate to seed-demo-data.ts. Run this instead, not alongside.
 *
 * Uses realistic Prometheus/Datadog alert names from a mixed K8s + traditional
 * web stack, and deliberately covers edge cases the pipeline must handle correctly:
 *   - alerts with no severity label (forces severity fallback path)
 *   - alerts for services NOT in service-dependency-graph.yaml (correlation skip path)
 *   - malformed/partial labels (missing service field)
 *   - flapping sequences (rapid fire/resolve cycles)
 *   - null/empty annotations
 *   - duplicate fingerprints across different sources (Prometheus + Datadog reporting same issue differently)
 *   - alerts with severity label conflicting with service tier (label says low, service tier says critical)
 *   - extremely high-cardinality label sets (many labels, stress normalizer)
 *
 * Run: ts-node scripts/seed-demo-data-edgecases.ts
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function randomPast(hoursAgo: number): Date {
  return new Date(Date.now() - Math.random() * hoursAgo * 60 * 60 * 1000);
}

// ── Realistic K8s-native alert catalog ──
const K8S_ALERTS = [
  { alertname: 'KubePodCrashLooping', service: 'checkout-api', severity: 'critical', labels: { namespace: 'prod', container: 'checkout-api', reason: 'CrashLoopBackOff' } },
  { alertname: 'KubeNodeNotReady', service: 'infra-cluster', severity: 'critical', labels: { node: 'ip-10-0-3-45', condition: 'NotReady' } },
  { alertname: 'KubeDeploymentReplicasMismatch', service: 'payment-service', severity: 'high', labels: { deployment: 'payment-service-deploy', desired: '5', current: '2' } },
  { alertname: 'KubeHpaMaxedOut', service: 'frontend', severity: 'medium', labels: { hpa: 'frontend-hpa', current_replicas: '10', max_replicas: '10' } },
  { alertname: 'KubeJobFailed', service: 'batch-processor', severity: 'high', labels: { job_name: 'nightly-reconciliation' } },
  { alertname: 'KubePersistentVolumeFillingUp', service: 'database', severity: 'high', labels: { persistentvolumeclaim: 'db-pvc-01', percent_available: '8' } },
  { alertname: 'KubeContainerOOMKilled', service: 'auth-service', severity: 'critical', labels: { container: 'auth-service', reason: 'OOMKilled' } },
];

// ── Traditional web-stack alert catalog ──
const WEBSTACK_ALERTS = [
  { alertname: 'HighRequestLatencyP99', service: 'checkout-api', severity: 'high', labels: { endpoint: '/api/checkout', p99_ms: '4200' } },
  { alertname: 'DatabaseConnectionPoolExhausted', service: 'database', severity: 'critical', labels: { pool: 'primary', max_connections: '100', active: '100' } },
  { alertname: 'RedisMemoryUsageHigh', service: 'cache-layer', severity: 'medium', labels: { instance: 'redis-primary', used_percent: '87' } },
  { alertname: 'QueueBacklogGrowing', service: 'message-queue', severity: 'high', labels: { queue: 'order-processing', depth: '15000' } },
  { alertname: 'SSLCertificateExpiringSoon', service: 'edge-gateway', severity: 'medium', labels: { domain: 'api.example.com', days_remaining: '9' } },
  { alertname: 'DiskSpaceLow', service: 'log-aggregator', severity: 'low', labels: { mount: '/var/log', percent_used: '91' } },
  { alertname: 'APIErrorRateSpike', service: 'auth-service', severity: 'critical', labels: { error_rate_percent: '23', window: '5m' } },
  { alertname: 'SlowDatabaseQuery', service: 'reporting-service', severity: 'low', labels: { query_time_ms: '8500' } },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function insertAlert(opts: {
  fingerprint: string;
  alertname: string;
  service: string | null;
  labels: Record<string, string>;
  severity: string | null;
  source: 'prometheus' | 'datadog';
  receivedAt: Date;
  clusterId?: string | null;
  suppressed?: boolean;
  suppressionReason?: string | null;
}): Promise<void> {
  await pool.query(
    `INSERT INTO alerts (fingerprint, alertname, service, labels, status, source, raw_payload, received_at, severity_score, cluster_id, is_root_cause, notification_sent, suppressed, suppression_reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      opts.fingerprint,
      opts.alertname,
      opts.service, // deliberately nullable for edge case coverage
      JSON.stringify(opts.labels),
      'firing',
      opts.source,
      JSON.stringify({ seeded: true, edge_case: true }),
      opts.receivedAt,
      opts.severity, // deliberately nullable for edge case coverage
      opts.clusterId || null,
      false,
      !opts.suppressed,
      opts.suppressed || false,
      opts.suppressionReason || null,
    ]
  );
}

// EDGE CASE 1: Alerts with no severity label at all — forces the severity scorer's
// fallback path (service-tier lookup or AI fallback)
async function seedNoSeverityLabel(): Promise<void> {
  for (let i = 0; i < 8; i++) {
    const alert = pick([...K8S_ALERTS, ...WEBSTACK_ALERTS]);
    await insertAlert({
      fingerprint: `edge-noseverity-${i}-${Date.now()}`,
      alertname: alert.alertname,
      service: alert.service,
      labels: { ...alert.labels }, // no severity key present
      severity: null,
      source: pick(['prometheus', 'datadog']),
      receivedAt: randomPast(24),
    });
  }
}

// EDGE CASE 2: Alerts for services NOT in service-dependency-graph.yaml —
// correlation engine must skip cleanly, not error
async function seedUnknownServices(): Promise<void> {
  const unknownServices = ['legacy-billing-worker', 'third-party-webhook-relay', 'internal-admin-tool', 'data-export-cron'];
  for (const svc of unknownServices) {
    await insertAlert({
      fingerprint: `edge-unknownsvc-${svc}-${Date.now()}`,
      alertname: 'ServiceUnresponsive',
      service: svc,
      labels: { severity: 'high', service: svc },
      severity: 'high',
      source: 'prometheus',
      receivedAt: randomPast(12),
    });
  }
}

// EDGE CASE 3: Malformed/partial labels — missing service field entirely
async function seedMalformedLabels(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await insertAlert({
      fingerprint: `edge-malformed-${i}-${Date.now()}`,
      alertname: 'UnknownAlertSource',
      service: null, // missing entirely — tests normalizer's null-handling
      labels: { severity: 'medium' }, // no service, no other context
      severity: 'medium',
      source: pick(['prometheus', 'datadog']),
      receivedAt: randomPast(6),
    });
  }
}

// EDGE CASE 4: Flapping sequences — rapid fire/resolve cycles on same fingerprint
async function seedFlappingSequences(): Promise<void> {
  const flapAlert = { alertname: 'IntermittentNetworkTimeout', service: 'payment-service', severity: 'medium' };
  const fingerprint = `edge-flap-${Date.now()}`;
  const baseTime = randomPast(3);
  for (let cycle = 0; cycle < 6; cycle++) {
    const cycleTime = new Date(baseTime.getTime() + cycle * 90 * 1000); // 90s apart
    await insertAlert({
      fingerprint,
      alertname: flapAlert.alertname,
      service: flapAlert.service,
      labels: { severity: flapAlert.severity, cycle: String(cycle) },
      severity: flapAlert.severity,
      source: 'prometheus',
      receivedAt: cycleTime,
      suppressed: cycle > 2, // first 3 notify, rest suppressed once flapping detected
      suppressionReason: cycle > 2 ? 'cooldown_active' : null,
    });
  }
}

// EDGE CASE 5: Cross-source duplicate — same underlying issue, reported by both
// Prometheus AND Datadog with different label shapes/fingerprint inputs
async function seedCrossSourceDuplicate(): Promise<void> {
  const receivedAt = randomPast(4);
  await insertAlert({
    fingerprint: `edge-crosssource-prom-${Date.now()}`,
    alertname: 'DatabaseConnectionPoolExhausted',
    service: 'database',
    labels: { severity: 'critical', pool: 'primary' },
    severity: 'critical',
    source: 'prometheus',
    receivedAt,
  });
  await insertAlert({
    fingerprint: `edge-crosssource-dd-${Date.now()}`, // different fingerprint — known dedup gap
    alertname: 'Database Connection Pool Exhausted', // slightly different name format
    service: 'database',
    labels: { severity: 'critical', 'db.pool': 'primary' }, // different label key style
    severity: 'critical',
    source: 'datadog',
    receivedAt: new Date(receivedAt.getTime() + 15000), // 15s later, same real incident
  });
}

// EDGE CASE 6: Severity label conflicts with service tier
// (label says 'low' but service is tier=critical in dependency graph, e.g. 'database')
async function seedSeverityTierConflict(): Promise<void> {
  await insertAlert({
    fingerprint: `edge-conflict-${Date.now()}`,
    alertname: 'MinorConfigDrift',
    service: 'database', // critical-tier service
    labels: { severity: 'low' }, // but label claims low severity
    severity: 'low', // as-labeled; severity scorer's tier-escalation logic should be tested against this
    source: 'prometheus',
    receivedAt: randomPast(2),
  });
}

// EDGE CASE 7: High-cardinality label set — stress test normalizer/storage
async function seedHighCardinalityLabels(): Promise<void> {
  const bigLabels: Record<string, string> = { severity: 'medium', service: 'checkout-api' };
  for (let i = 0; i < 25; i++) {
    bigLabels[`custom_tag_${i}`] = `value_${i}_${Math.random().toString(36).slice(2, 8)}`;
  }
  await insertAlert({
    fingerprint: `edge-highcard-${Date.now()}`,
    alertname: 'HighRequestLatencyP99',
    service: 'checkout-api',
    labels: bigLabels,
    severity: 'medium',
    source: 'datadog',
    receivedAt: randomPast(1),
  });
}

// EDGE CASE 8: Empty/null annotations, minimal payload
async function seedMinimalPayload(): Promise<void> {
  await insertAlert({
    fingerprint: `edge-minimal-${Date.now()}`,
    alertname: 'GenericAlert',
    service: 'unknown-service',
    labels: {},
    severity: null,
    source: 'prometheus',
    receivedAt: randomPast(1),
  });
}

// Realistic bulk background traffic — normal-looking alerts across the mixed stack,
// not edge cases, just volume for dashboard realism
async function seedRealisticBackgroundTraffic(count: number): Promise<void> {
  const clusterId = uuidv4();
  await pool.query(
    `INSERT INTO clusters (cluster_id, severity, root_cause_service, root_cause_alertname, root_cause_confidence, affected_services, downstream_count, raw_alert_count_suppressed, ai_narrative, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [clusterId, 'critical', 'database', 'DatabaseConnectionPoolExhausted', 'high', ['database', 'auth-service', 'checkout-api'], 3, 47, 'Database connection pool exhaustion cascaded to auth and checkout services. Resolved after pool size increase.', randomPast(20)]
  );

  for (let i = 0; i < count; i++) {
    const alert = pick([...K8S_ALERTS, ...WEBSTACK_ALERTS]);
    await insertAlert({
      fingerprint: `bg-${i}-${Date.now()}`,
      alertname: alert.alertname,
      service: alert.service,
      labels: { severity: alert.severity, ...alert.labels },
      severity: alert.severity,
      source: pick(['prometheus', 'datadog']),
      receivedAt: randomPast(24),
      clusterId: Math.random() > 0.7 ? clusterId : null,
      suppressed: Math.random() > 0.35,
      suppressionReason: Math.random() > 0.35 ? pick(['duplicate', 'cooldown_active', 'batched']) : null,
    });
  }
}

async function main(): Promise<void> {
  console.log('Seeding edge case profile (standalone — do not run alongside seed-demo-data.ts)...');

  console.log('1/9 No-severity-label alerts...');
  await seedNoSeverityLabel();

  console.log('2/9 Unknown-service (no dependency graph entry) alerts...');
  await seedUnknownServices();

  console.log('3/9 Malformed/partial labels...');
  await seedMalformedLabels();

  console.log('4/9 Flapping sequences...');
  await seedFlappingSequences();

  console.log('5/9 Cross-source duplicate (known dedup gap)...');
  await seedCrossSourceDuplicate();

  console.log('6/9 Severity/tier conflict...');
  await seedSeverityTierConflict();

  console.log('7/9 High-cardinality labels...');
  await seedHighCardinalityLabels();

  console.log('8/9 Minimal/empty payload...');
  await seedMinimalPayload();

  console.log('9/9 Realistic background traffic (150 alerts, mixed K8s + web stack)...');
  await seedRealisticBackgroundTraffic(150);

  console.log('Edge case seed complete.');
  await pool.end();
}

main().catch((err) => {
  console.error('Edge case seed failed:', err);
  process.exit(1);
});
