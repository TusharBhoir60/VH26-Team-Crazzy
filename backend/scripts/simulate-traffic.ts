import axios from 'axios';

const INGEST_URL = 'http://localhost:8080/webhooks/alertmanager';

const alerts = [
  {
    status: 'firing',
    labels: {
      alertname: 'DatabaseHighCPU',
      service: 'database',
      severity: 'critical',
      instance: 'db-master-01'
    },
    annotations: {
      description: 'Database CPU utilization has exceeded 90% for > 5m',
      summary: 'High CPU on database master'
    }
  },
  {
    status: 'firing',
    labels: {
      alertname: 'PostgresSlowQueries',
      service: 'database',
      severity: 'high',
      instance: 'db-master-01'
    }
  },
  {
    status: 'firing',
    labels: {
      alertname: 'PaymentGateway500Error',
      service: 'payment-service',
      severity: 'critical',
      region: 'us-east-1'
    },
    annotations: {
      summary: 'Payment service returning HTTP 500'
    }
  },
  {
    status: 'firing',
    labels: {
      alertname: 'PaymentLatencyP99High',
      service: 'payment-service',
      severity: 'high',
      region: 'us-east-1'
    }
  },
  {
    status: 'firing',
    labels: {
      alertname: 'CheckoutCartTimeout',
      service: 'checkout-api',
      severity: 'high'
    }
  }
];

async function simulate() {
  console.log(`Sending ${alerts.length} simulated alerts to ${INGEST_URL}...`);
  try {
    const response = await axios.post(INGEST_URL, { alerts }, {
      headers: {
        'Content-Type': 'application/json'
        // Intentionally skipping HMAC signature headers so it bypasses auth in development
      }
    });
    console.log('✅ Simulation sent successfully!');
    console.log('Response:', response.data);
    console.log('\nCheck your backend logs and configured channels (Slack, PagerDuty, Discord) for the notification routing.');
  } catch (error: any) {
    console.error('❌ Failed to send simulated traffic:');
    if (error.response) {
      console.error(`Status ${error.response.status}:`, error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

simulate();
