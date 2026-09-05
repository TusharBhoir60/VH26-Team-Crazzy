import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { getRedisClient } from '../src/shared/redis.client';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

const redis = getRedisClient();

const SERVICES = ['database', 'auth-service', 'payment-service', 'checkout-api', 'frontend', 'inventory-service', 'notification-service'];
const SEVERITIES: Array<'critical' | 'high' | 'medium' | 'low'> = ['critical', 'high', 'medium', 'low'];
const ALERT_NAMES: Record<string, string[]> = {
  'database': ['PostgresHighConnections', 'PostgresSlowQueries', 'PostgresReplicationLag', 'PostgresDiskUsage90'],
  'auth-service': ['AuthServiceTimeout', 'OAuthTokenRefreshFailure', 'JWTValidationError', 'AuthRateLimitReached'],
  'payment-service': ['PaymentGateway500Error', 'PaymentLatencyP99High', 'PaymentDeclineRateSpike', 'StripeWebhookFailure'],
  'checkout-api': ['CheckoutCartTimeout', 'CheckoutInventoryMismatch', 'CheckoutHTTP502Error'],
  'frontend': ['FrontendCDNLatencyHigh', 'FrontendJSErrorRateSpike', 'FrontendLCPDegraded'],
  'inventory-service': ['InventorySyncDelay', 'InventoryStockMismatch', 'InventoryRateLimitHit'],
  'notification-service': ['NotificationQueueBacklog', 'EmailDeliveryFailure', 'SMSProviderTimeout'],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function minutesAgo(m: number): string {
  return new Date(Date.now() - m * 60 * 1000).toISOString();
}

async function seedRedisStats() {
  console.log('  → Seeding stats counters...');
  await redis.set('stats:raw_alerts_total', '15204');
  await redis.set('stats:notifications_sent', '5102');
  await redis.set('stats:critical_raw_total', '142');
  await redis.set('stats:critical_notified', '142');

  // MTTR & MTTA
  await redis.set('stats:mttr_seconds', '312');   // 5.2 minutes
  await redis.set('stats:mtta_seconds', '108');   // 1.8 minutes

  // Severity breakdown (should sum to raw_alerts_total)
  await redis.set('stats:severity:critical', '142');
  await redis.set('stats:severity:high', '1823');
  await redis.set('stats:severity:medium', '5640');
  await redis.set('stats:severity:low', '7599');
}

async function seedRedisIncidents() {
  console.log('  → Seeding active incidents...');

  const incidents = [
    {
      incident_id: uuidv4(),
      severity: 'critical',
      root_cause_service: 'payment-service',
      root_cause_alertname: 'PaymentGateway500Error',
      root_cause_confidence: 'high',
      affected_services: ['payment-service', 'checkout-api', 'frontend'],
      alerts: [
        { fingerprint: 'fp-pay-1', alertname: 'PaymentGateway500Error', service: 'payment-service', severity_score: 'critical' },
        { fingerprint: 'fp-chk-1', alertname: 'CheckoutCartTimeout', service: 'checkout-api', severity_score: 'high' },
      ],
      state: 'open',
      started_at: minutesAgo(12),
      title: 'Payment Gateway High HTTP 500 Error Rate',
      impact: '1,240 checkout failures',
    },
    {
      incident_id: uuidv4(),
      severity: 'high',
      root_cause_service: 'database',
      root_cause_alertname: 'PostgresHighConnections',
      root_cause_confidence: 'high',
      affected_services: ['database', 'auth-service', 'payment-service'],
      alerts: [
        { fingerprint: 'fp-db-1', alertname: 'PostgresHighConnections', service: 'database', severity_score: 'high' },
        { fingerprint: 'fp-auth-1', alertname: 'AuthServiceTimeout', service: 'auth-service', severity_score: 'high' },
      ],
      state: 'open',
      started_at: minutesAgo(45),
      title: 'Database Connection Pool Exhaustion on Postgres Cluster',
      impact: '450 slow queries (>2s)',
    },
    {
      incident_id: uuidv4(),
      severity: 'medium',
      root_cause_service: 'inventory-service',
      root_cause_alertname: 'InventoryRateLimitHit',
      root_cause_confidence: 'medium',
      affected_services: ['inventory-service'],
      alerts: [
        { fingerprint: 'fp-inv-1', alertname: 'InventoryRateLimitHit', service: 'inventory-service', severity_score: 'medium' },
      ],
      state: 'investigating',
      started_at: minutesAgo(120),
      title: 'Inventory Rate Limiting Threshold Reached',
      impact: 'Sync delayed for 12 sellers',
    },
    {
      incident_id: uuidv4(),
      severity: 'low',
      root_cause_service: 'auth-service',
      root_cause_alertname: 'OAuthTokenRefreshFailure',
      root_cause_confidence: 'medium',
      affected_services: ['auth-service'],
      alerts: [
        { fingerprint: 'fp-auth-2', alertname: 'OAuthTokenRefreshFailure', service: 'auth-service', severity_score: 'low' },
      ],
      state: 'resolved',
      started_at: minutesAgo(240),
      title: 'OAuth Token Refresh Flakiness during Traffic Peak',
      impact: 'Auto-retried by client SDK',
    },
  ];

  for (const inc of incidents) {
    await redis.set(`incident:${inc.incident_id}`, JSON.stringify(inc));
  }
}

async function seedRecentAlerts() {
  console.log('  → Seeding recent alerts feed...');

  const recentAlerts = [
    { alertname: 'PaymentGateway500Error', service: 'payment-service', severity: 'critical', status: 'firing', source: 'prometheus', received_at: minutesAgo(2) },
    { alertname: 'CheckoutCartTimeout', service: 'checkout-api', severity: 'high', status: 'firing', source: 'prometheus', received_at: minutesAgo(3) },
    { alertname: 'PaymentLatencyP99High', service: 'payment-service', severity: 'high', status: 'firing', source: 'datadog', received_at: minutesAgo(5) },
    { alertname: 'PostgresHighConnections', service: 'database', severity: 'high', status: 'firing', source: 'prometheus', received_at: minutesAgo(8) },
    { alertname: 'AuthServiceTimeout', service: 'auth-service', severity: 'high', status: 'firing', source: 'prometheus', received_at: minutesAgo(12) },
    { alertname: 'FrontendLCPDegraded', service: 'frontend', severity: 'medium', status: 'firing', source: 'datadog', received_at: minutesAgo(15) },
    { alertname: 'InventoryRateLimitHit', service: 'inventory-service', severity: 'medium', status: 'firing', source: 'prometheus', received_at: minutesAgo(18) },
    { alertname: 'PostgresSlowQueries', service: 'database', severity: 'medium', status: 'firing', source: 'prometheus', received_at: minutesAgo(22) },
    { alertname: 'FrontendJSErrorRateSpike', service: 'frontend', severity: 'medium', status: 'resolved', source: 'datadog', received_at: minutesAgo(28) },
    { alertname: 'StripeWebhookFailure', service: 'payment-service', severity: 'high', status: 'resolved', source: 'prometheus', received_at: minutesAgo(35) },
    { alertname: 'NotificationQueueBacklog', service: 'notification-service', severity: 'low', status: 'firing', source: 'prometheus', received_at: minutesAgo(40) },
    { alertname: 'OAuthTokenRefreshFailure', service: 'auth-service', severity: 'low', status: 'resolved', source: 'prometheus', received_at: minutesAgo(48) },
    { alertname: 'EmailDeliveryFailure', service: 'notification-service', severity: 'low', status: 'resolved', source: 'datadog', received_at: minutesAgo(55) },
    { alertname: 'FrontendCDNLatencyHigh', service: 'frontend', severity: 'low', status: 'resolved', source: 'datadog', received_at: minutesAgo(62) },
    { alertname: 'InventorySyncDelay', service: 'inventory-service', severity: 'medium', status: 'resolved', source: 'prometheus', received_at: minutesAgo(70) },
    { alertname: 'PostgresDiskUsage90', service: 'database', severity: 'high', status: 'resolved', source: 'prometheus', received_at: minutesAgo(82) },
    { alertname: 'JWTValidationError', service: 'auth-service', severity: 'medium', status: 'resolved', source: 'prometheus', received_at: minutesAgo(95) },
    { alertname: 'CheckoutHTTP502Error', service: 'checkout-api', severity: 'high', status: 'resolved', source: 'prometheus', received_at: minutesAgo(110) },
    { alertname: 'PaymentDeclineRateSpike', service: 'payment-service', severity: 'critical', status: 'resolved', source: 'datadog', received_at: minutesAgo(130) },
    { alertname: 'SMSProviderTimeout', service: 'notification-service', severity: 'low', status: 'resolved', source: 'prometheus', received_at: minutesAgo(145) },
  ];

  // Clear old entries
  await redis.del('recent_alerts');

  for (const alert of recentAlerts) {
    const entry = {
      fingerprint: `seed-${alert.alertname}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...alert,
    };
    const score = new Date(alert.received_at).getTime();
    await redis.zadd('recent_alerts', score.toString(), JSON.stringify(entry));
  }
}

async function seedDLQAndQuarantine() {
  console.log('  → Seeding DLQ and quarantine entries...');

  const dlqEntry = {
    dlqId: `dlq-${Date.now()}-seed`,
    source: 'prometheus',
    reason: 'Missing required field: alertname',
    timestamp: minutesAgo(30),
  };
  await redis.set(`dlq:${dlqEntry.dlqId}`, JSON.stringify(dlqEntry));

  const quarantineEntry = {
    quarantineId: `quar-${Date.now()}-seed`,
    reason: 'Safety Gate: LLM confidence below threshold (0.32 < 0.5)',
    timestamp: minutesAgo(60),
  };
  await redis.set(`quarantine:${quarantineEntry.quarantineId}`, JSON.stringify(quarantineEntry));
}

async function seedSupabaseData() {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.log('  ⚠ Skipping Supabase seed (SUPABASE_URL or SUPABASE_SECRET_KEY not set)');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

  console.log('  → Seeding Supabase clusters...');
  for (let i = 0; i < 15; i++) {
    const clusterId = uuidv4();
    const severity = pick(SEVERITIES);
    const rootService = pick(SERVICES);
    const createdAt = new Date(Date.now() - Math.random() * 48 * 60 * 60 * 1000);
    const affectedCount = Math.floor(Math.random() * 4) + 1;
    const affected = Array.from({ length: affectedCount }, () => pick(SERVICES));

    const { error } = await supabase.from('clusters').insert({
      cluster_id: clusterId,
      severity,
      root_cause_service: rootService,
      root_cause_alertname: pick(ALERT_NAMES[rootService] || ['UnknownAlert']),
      root_cause_confidence: pick(['high', 'medium']),
      affected_services: affected,
      downstream_count: affectedCount,
      raw_alert_count_suppressed: Math.floor(Math.random() * 40) + 5,
      ai_narrative: `${rootService} experienced a transient issue affecting ${affectedCount} downstream service(s). Resolved automatically.`,
      created_at: createdAt.toISOString(),
    });
    if (error) console.error('  ⚠ Supabase cluster insert:', error.message);
  }

  console.log('  → Seeding Supabase stats_snapshots...');
  for (let h = 24; h >= 0; h -= 2) {
    const windowStart = new Date(Date.now() - h * 60 * 60 * 1000);
    const windowEnd = new Date(windowStart.getTime() + 2 * 60 * 60 * 1000);
    const rawCount = Math.floor(Math.random() * 80) + 40;
    const notified = Math.floor(rawCount * (0.35 + Math.random() * 0.15));
    const reduction = ((1 - notified / rawCount) * 100).toFixed(2);

    const { error } = await supabase.from('stats_snapshots').insert({
      window_start: windowStart.toISOString(),
      window_end: windowEnd.toISOString(),
      raw_alert_count: rawCount,
      notifications_sent: notified,
      reduction_percent: Number(reduction),
      avg_mttr_seconds: Math.floor(Math.random() * 200) + 60,
      false_positive_rate: Number((Math.random() * 8).toFixed(2)),
    });
    if (error) console.error('  ⚠ Supabase stats_snapshot insert:', error.message);
  }
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  Alert Fatigue Buster — Demo Seed');
  console.log('═══════════════════════════════════════\n');

  try {
    console.log('[1/5] Redis Stats & KPIs');
    await seedRedisStats();

    console.log('[2/5] Redis Active Incidents');
    await seedRedisIncidents();

    console.log('[3/5] Redis Recent Alerts Feed');
    await seedRecentAlerts();

    console.log('[4/5] Redis DLQ & Quarantine');
    await seedDLQAndQuarantine();

    console.log('[5/5] Supabase Historical Data');
    await seedSupabaseData();

    console.log('\n✅ Seed Complete!');
    console.log('   Dashboard: http://localhost:5173');
    console.log('   API:       http://localhost:8080/api/v1/dashboard/stats');
  } catch (err) {
    console.error('Seed script failed:', err);
  } finally {
    redis.quit();
    process.exit(0);
  }
}

main();
