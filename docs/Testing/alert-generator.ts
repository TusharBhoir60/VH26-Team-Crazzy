/**
 * Synthetic alert generator — simulates realistic alert traffic patterns
 * for testing pipeline noise reduction, correlation accuracy, and critical-alert protection.
 *
 * Usage: ts-node scripts/alert-generator.ts --scenario=mixed-burst --target=http://localhost:8080/webhook/prometheus
 */

import axios from 'axios';

interface AlertmanagerAlert {
  status: 'firing' | 'resolved';
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: string;
  endsAt: string;
  fingerprint: string;
}

function makeAlert(alertname: string, service: string, severity: string, fingerprint: string, status: 'firing' | 'resolved' = 'firing'): AlertmanagerAlert {
  const now = new Date().toISOString();
  return {
    status,
    labels: { alertname, severity, service, instance: `${service}-pod-${Math.floor(Math.random() * 1000)}` },
    annotations: { summary: `${alertname} on ${service}`, description: `Synthetic test alert` },
    startsAt: now,
    endsAt: status === 'resolved' ? now : '',
    fingerprint,
  };
}

async function sendAlert(target: string, alert: AlertmanagerAlert): Promise<void> {
  try {
    await axios.post(target, { receiver: 'test', status: alert.status, alerts: [alert] });
  } catch (err) {
    console.error(`Failed to send alert ${alert.fingerprint}:`, (err as Error).message);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// SCENARIO A: Duplicate storm — 1 alert, 100 identical firings over 10s
async function scenarioDuplicateStorm(target: string): Promise<void> {
  console.log('--- Scenario A: Duplicate Storm ---');
  const fingerprint = 'dup-storm-fp-001';
  for (let i = 0; i < 100; i++) {
    await sendAlert(target, makeAlert('HighMemoryUsage', 'payments-service', 'high', fingerprint));
    await sleep(100); // 100 alerts over 10s
  }
  console.log('Sent 100 duplicate alerts. Expected: 1 notification.');
}

// SCENARIO B: Cascade outage — database failure cascades through dependency chain
async function scenarioCascadeOutage(target: string): Promise<void> {
  console.log('--- Scenario B: Cascade Outage ---');
  const services = [
    { name: 'database', alertname: 'DatabaseConnectionPoolExhausted', severity: 'critical' },
    { name: 'auth-service', alertname: 'AuthServiceUnavailable', severity: 'critical' },
    { name: 'payment-service', alertname: 'PaymentServiceTimeout', severity: 'high' },
    { name: 'checkout-api', alertname: 'CheckoutAPIErrors', severity: 'high' },
    { name: 'frontend', alertname: 'FrontendDegraded', severity: 'medium' },
  ];
  for (const svc of services) {
    await sendAlert(target, makeAlert(svc.alertname, svc.name, svc.severity, `cascade-${svc.name}-fp`));
    await sleep(500); // slight stagger to simulate real cascade timing, within correlation window
  }
  console.log('Sent 5 cascading alerts. Expected: 1 cluster, root_cause=database, 1 notification.');
}

// SCENARIO C: Flapping alert — fire/resolve cycles
async function scenarioFlapping(target: string): Promise<void> {
  console.log('--- Scenario C: Flapping Alert ---');
  const fingerprint = 'flap-fp-001';
  for (let cycle = 0; cycle < 5; cycle++) {
    await sendAlert(target, makeAlert('IntermittentConnectionError', 'inventory-service', 'medium', fingerprint, 'firing'));
    await sleep(2000);
    await sendAlert(target, makeAlert('IntermittentConnectionError', 'inventory-service', 'medium', fingerprint, 'resolved'));
    await sleep(2000);
  }
  console.log('Sent 5 fire/resolve cycles. Expected: state=flapping by cycle 3, reduced notification count.');
}

// SCENARIO D: Mixed severity burst — the core 50%+ reduction proof
async function scenarioMixedBurst(target: string): Promise<void> {
  console.log('--- Scenario D: Mixed Severity Burst (200 raw alerts) ---');
  let sent = 0;

  // 150 duplicates across 3 distinct issues (50 each)
  const dupIssues = [
    { fp: 'mixed-dup-1', name: 'DiskSpaceWarning', service: 'log-aggregator', severity: 'low' },
    { fp: 'mixed-dup-2', name: 'HighCPU', service: 'worker-pool', severity: 'medium' },
    { fp: 'mixed-dup-3', name: 'SlowQuery', service: 'reporting-service', severity: 'low' },
  ];
  for (const issue of dupIssues) {
    for (let i = 0; i < 50; i++) {
      await sendAlert(target, makeAlert(issue.name, issue.service, issue.severity, issue.fp));
      sent++;
      await sleep(50);
    }
  }

  // 30 correlated cascade alerts (reuse cascade pattern x6)
  for (let c = 0; c < 6; c++) {
    const services = ['database', 'auth-service', 'payment-service', 'checkout-api', 'frontend'];
    for (const svc of services) {
      await sendAlert(target, makeAlert(`CascadeIssue${c}`, svc, 'high', `mixed-cascade-${c}-${svc}`));
      sent++;
      await sleep(50);
    }
  }

  // 20 standalone unique alerts, including at least 3 critical
  for (let i = 0; i < 20; i++) {
    const severity = i < 3 ? 'critical' : 'medium';
    await sendAlert(target, makeAlert(`UniqueIssue${i}`, `service-${i}`, severity, `mixed-unique-${i}`));
    sent++;
    await sleep(50);
  }

  console.log(`Sent ${sent} raw alerts. Expected: notifications <= ${Math.floor(sent * 0.5)} (50%+ reduction), all 3 critical alerts notified.`);
}

// SCENARIO E: Critical buried in noise — the most important test
async function scenarioCriticalBuriedInNoise(target: string): Promise<void> {
  console.log('--- Scenario E: Critical Alert Buried in Noise ---');
  const noisePromises: Promise<void>[] = [];
  for (let i = 0; i < 300; i++) {
    noisePromises.push(sendAlert(target, makeAlert(`NoiseAlert${i}`, `noise-service-${i % 20}`, 'low', `noise-fp-${i}`)));
  }
  // fire the critical alert in the middle of the noise burst
  await Promise.all(noisePromises.slice(0, 150));
  await sendAlert(target, makeAlert('DatabaseDown', 'database', 'critical', 'critical-buried-fp'));
  await Promise.all(noisePromises.slice(150));
  console.log('Sent 300 noise alerts + 1 critical mid-burst. Expected: critical alert generates immediate notification, NOT suppressed by noise batching.');
}

async function main(): Promise<void> {
  const scenario = process.argv.find((a) => a.startsWith('--scenario='))?.split('=')[1] || 'all';
  const target = process.argv.find((a) => a.startsWith('--target='))?.split('=')[1] || 'http://localhost:8080/webhook/prometheus';

  const scenarios: Record<string, (t: string) => Promise<void>> = {
    'duplicate-storm': scenarioDuplicateStorm,
    'cascade-outage': scenarioCascadeOutage,
    flapping: scenarioFlapping,
    'mixed-burst': scenarioMixedBurst,
    'critical-buried': scenarioCriticalBuriedInNoise,
  };

  if (scenario === 'all') {
    for (const [name, fn] of Object.entries(scenarios)) {
      console.log(`\n=== Running: ${name} ===`);
      await fn(target);
      await sleep(3000); // gap between scenarios
    }
  } else if (scenarios[scenario]) {
    await scenarios[scenario](target);
  } else {
    console.error(`Unknown scenario: ${scenario}. Available: ${Object.keys(scenarios).join(', ')}, all`);
    process.exit(1);
  }

  console.log('\nDone. Check dashboard /api/stats for reduction_percent and critical_alerts_notified.');
}

main().catch((err) => {
  console.error('Generator failed:', err);
  process.exit(1);
});
