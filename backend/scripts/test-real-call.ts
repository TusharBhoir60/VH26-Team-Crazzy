import { config } from 'dotenv';
// Load real environment variables from .env file
config();

import { handleCriticalAlert } from '../src/critical-alert-escalation';
import { CriticalAlert } from '../src/critical-alert-escalation/types';
import { logger } from '../src/shared/logger';

async function runRealTest() {
  logger.info('Starting REAL critical alert escalation test...');

  // Check if Twilio credentials exist
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    logger.error('Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN in .env file!');
    logger.error('Please add your Twilio credentials to backend/.env and try again.');
    return;
  }

  if (!process.env.ONCALL_PHONE_NUMBER) {
    logger.error('Missing ONCALL_PHONE_NUMBER in .env file! Where should we call?');
    return;
  }

  const mockAlert: CriticalAlert = {
    alertName: 'RealTwilioTest',
    service: 'payment-gateway',
    severity: 'critical',
    severityReasoning: 'This is a test of the Alert Fatigue Buster AI voice escalation.',
    message: 'Testing real Twilio integration. If you hear this, the setup is working perfectly!',
    timestamp: new Date().toISOString()
  };

  // Override timer to 5 seconds so we don't have to wait 3 minutes for the call
  const options = {
    escalationTimerMs: 5000
  };

  logger.info(`Will attempt to call ${process.env.ONCALL_PHONE_NUMBER} in 5 seconds...`);
  
  await handleCriticalAlert(mockAlert, options);
  
  // Keep script alive long enough for the timeout to fire and API requests to finish
  setTimeout(() => {
    logger.info('Test script finished.');
  }, 10000);
}

runRealTest().catch(console.error);
