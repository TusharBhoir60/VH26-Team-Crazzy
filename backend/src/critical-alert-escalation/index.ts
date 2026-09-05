import { CriticalAlert, EscalationOptions } from './types';
import { triggerPagerDutyIncident, checkIncidentStatus } from './pagerduty';
import { triggerVoiceCall } from './twilio';
import { logger } from '../shared/logger';

export async function handleCriticalAlert(alert: CriticalAlert, options: EscalationOptions = {}): Promise<void> {
  // Load configuration from options or environment variables
  const pdIntegrationKey = options.pagerDutyIntegrationKey || process.env.PAGERDUTY_INTEGRATION_KEY;
  const pdApiToken = options.pagerDutyApiToken || process.env.PAGERDUTY_API_TOKEN;
  const twilioSid = options.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = options.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = options.twilioFromPhone || process.env.TWILIO_FROM_PHONE;
  const oncallPhone = options.oncallPhoneNumber || process.env.ONCALL_PHONE_NUMBER;
  
  const timerMs = options.escalationTimerMs || Number(process.env.ESCALATION_TIMER_MS) || 180000; // default 3 mins

  logger.info({ alertName: alert.alertName }, 'Handling critical alert escalation');

  if (!pdIntegrationKey) {
    logger.warn('PAGERDUTY_INTEGRATION_KEY is missing. Cannot send alert to PagerDuty.');
    return;
  }

  // 1. Trigger PagerDuty Incident
  const dedupKey = await triggerPagerDutyIncident(alert, pdIntegrationKey);
  if (!dedupKey) {
    logger.error('Failed to get dedupKey from PagerDuty, but continuing escalation to fail-safe towards alerting the human.');
  } else {
    logger.info('Alert sent to PagerDuty');
  }

  // 2. Start Acknowledgment Timer
  logger.info(`Timer started (${timerMs / 1000} seconds)`);

  setTimeout(async () => {
    logger.info('Checking status');
    
    // 3. Check Incident Status
    let status = 'triggered';
    if (pdApiToken) {
      if (dedupKey) {
        status = await checkIncidentStatus(dedupKey, pdApiToken);
      } else {
        logger.warn('No dedupKey available (PagerDuty trigger failed initially), assuming incident is still triggered.');
      }
    } else {
      logger.warn('PAGERDUTY_API_TOKEN is missing, assuming incident is still triggered to fail-safe.');
    }

    if (status === 'acknowledged' || status === 'resolved') {
      logger.info(`Status: ${status}. Alert was handled in time.`);
      return;
    }

    logger.info(`Status: ${status}, not acknowledged`);

    // 4. Trigger Voice Call Escalation
    if (!twilioSid || !twilioAuth || !twilioFrom || !oncallPhone) {
      logger.warn('Twilio credentials or phone numbers missing. Cannot place AI voice call.');
      return;
    }

    logger.info('Placing AI voice call');
    await triggerVoiceCall(alert, twilioSid, twilioAuth, twilioFrom, oncallPhone);

  }, timerMs);
}
