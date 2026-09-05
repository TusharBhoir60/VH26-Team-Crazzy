import { handleCriticalAlert } from '../src/critical-alert-escalation';
import { CriticalAlert } from '../src/critical-alert-escalation/types';
import { logger } from '../src/shared/logger';
import nock from 'nock';

// Mock the environment variables for testing
process.env.PAGERDUTY_INTEGRATION_KEY = 'mock_pd_key';
process.env.PAGERDUTY_API_TOKEN = 'mock_pd_token';
process.env.TWILIO_ACCOUNT_SID = 'AC_mock_sid';
process.env.TWILIO_AUTH_TOKEN = 'mock_auth_token';
process.env.TWILIO_FROM_PHONE = '+10000000000';
process.env.ONCALL_PHONE_NUMBER = '+19999999999';

// Setup network mocks
nock('https://events.pagerduty.com')
  .post('/v2/enqueue')
  .reply(202, { status: 'success', message: 'Event processed', dedup_key: 'mock-dedup-123' });

nock('https://api.pagerduty.com')
  .get('/incidents')
  .query({ incident_key: 'mock-dedup-123' })
  .reply(200, { incidents: [{ status: 'triggered' }] });

nock('https://api.twilio.com')
  .post('/2010-04-01/Accounts/AC_mock_sid/Calls.json')
  .reply(201, { sid: 'CA_mock_call_sid', status: 'queued' });

async function runTest() {
  logger.info('Starting critical alert escalation test...');

  const mockAlert: CriticalAlert = {
    alertName: 'DatabaseDown',
    service: 'primary-db',
    severity: 'critical',
    severityReasoning: 'Connection pool exhausted for primary-db',
    message: 'Primary database is unreachable, all queries failing',
    timestamp: new Date().toISOString()
  };

  // Override timer to 5 seconds for demo purposes
  const options = {
    escalationTimerMs: 5000
  };

  await handleCriticalAlert(mockAlert, options);
  
  // Keep script alive long enough for setTimeout to fire
  setTimeout(() => {
    logger.info('Test script finished.');
  }, 6000);
}

runTest().catch(console.error);
