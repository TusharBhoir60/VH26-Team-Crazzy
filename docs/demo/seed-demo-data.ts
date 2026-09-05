/**
 * Seed script — populates Postgres with backdated historical alert/cluster/notification
 * data so the dashboard looks "lived-in" before the live demo starts.
 *
 * Writes DIRECTLY to Postgres, bypassing the live pipeline — this is fake historical
 * data, not real pipeline output. Run once before demo: ts-node scripts/seed-demo-data.ts
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const SERVICES = ['database', 'auth-service', 'payment-service', 'checkout-api', 'frontend', 'inventory-service', 'notification-service'];
const SEVERITIES = ['critical', 'high', 'medium', 'low'];

function randomPast(hoursAgo: number): Date {
  const now = Date.now();
  const jitter = Math.random() * hoursAgo * 60 * 60 * 1000;
  return new Date(now - jitter);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seedHistoricalClusters(count: number): Promise<string[]> {
  const clusterIds: string[] = [];
  for (let i = 0; i < count; i++) {
    const clusterId = uuidv4();
    const severity = pick(SEVERITIES);
    const rootService = pick(SERVICES);
    const createdAt = randomPast(48); // spread over past 48 hours
    const affectedCount = Math.floor(Math.random() * 4) + 1;
    const affected = Array.from({ length: affectedCount }, () => pick(SERVICES));
    const suppressedCount = Math.floor(Math.random() * 40) + 5;

    await pool.query(
      `INSERT INTO clusters (cluster_id, severity, root_cause_service, root_cause_alertname, root_cause_confidence, affected_services, downstream_count, raw_alert_count_suppressed, ai_narrative, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        clusterId,
        severity,
        rootService,
        `${rootService}ConnectionIssue`,
        pick(['high', 'medium']),
        affected,
        affectedCount,
        suppressedCount,
        `${rootService} experienced a transient issue affecting ${affectedCount} downstream service(s). Resolved automatically.`,
        createdAt,
      ]
    );
    clusterIds.push(clusterId);
  }
  return clusterIds;
}

async function seedHistoricalAlerts(count: number, clusterIds: string[]): Promise<void> {
  for (let i = 0; i < count; i++) {
    const service = pick(SERVICES);
    const severity = pick(SEVERITIES);
    const receivedAt = randomPast(48);
    const useCluster = Math.random() > 0.4; // ~60% of alerts are correlated
    const clusterId = useCluster ? pick(clusterIds) : null;
    const suppressed = Math.random() > 0.3; // ~70% suppressed (dedup/batch/cooldown), matching target reduction

    await pool.query(
      `INSERT INTO alerts (fingerprint, alertname, service, labels, status, source, raw_payload, received_at, severity_score, cluster_id, is_root_cause, notification_sent, suppressed, suppression_reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        `seed-fp-${i}-${Date.now()}`,
        `${service}Alert${i}`,
        service,
        JSON.stringify({ severity, env: 'prod' }),
        'resolved',
        pick(['prometheus', 'datadog']),
        JSON.stringify({ seeded: true }),
        receivedAt,
        severity,
        clusterId,
        false,
        !suppressed,
        suppressed,
        suppressed ? pick(['duplicate', 'cooldown_active', 'batched']) : null,
      ]
    );
  }
}

async function seedStatsSnapshots(): Promise<void> {
  // create a few hourly snapshots over the past 24h showing the reduction trend
  for (let h = 24; h >= 0; h -= 2) {
    const windowStart = new Date(Date.now() - h * 60 * 60 * 1000);
    const windowEnd = new Date(windowStart.getTime() + 2 * 60 * 60 * 1000);
    const rawCount = Math.floor(Math.random() * 80) + 40;
    const notified = Math.floor(rawCount * (0.35 + Math.random() * 0.15)); // ~35-50% of raw, i.e. 50-65% reduction
    const reduction = ((1 - notified / rawCount) * 100).toFixed(2);

    await pool.query(
      `INSERT INTO stats_snapshots (window_start, window_end, raw_alert_count, notifications_sent, reduction_percent, avg_mttr_seconds, false_positive_rate)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [windowStart, windowEnd, rawCount, notified, reduction, Math.floor(Math.random() * 200) + 60, (Math.random() * 8).toFixed(2)]
    );
  }
}

async function main(): Promise<void> {
  console.log('Seeding historical clusters...');
  const clusterIds = await seedHistoricalClusters(15);

  console.log('Seeding historical alerts...');
  await seedHistoricalAlerts(300, clusterIds);

  console.log('Seeding stats snapshots (24h trend)...');
  await seedStatsSnapshots();

  console.log('Seed complete. Dashboard should now show ~48h of historical activity.');
  await pool.end();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
