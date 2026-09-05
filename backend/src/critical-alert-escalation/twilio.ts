import twilio from 'twilio';
import { CriticalAlert } from './types';
import { logger } from '../shared/logger';

export async function triggerVoiceCall(
  alert: CriticalAlert,
  accountSid: string,
  authToken: string,
  fromPhone: string,
  toPhone: string
): Promise<void> {
  try {
    const client = twilio(accountSid, authToken);
    
    // Construct the spoken message
    const summaryMessage = `Critical alert. ${alert.service} is down. ${alert.severityReasoning}. This has not been acknowledged in PagerDuty.`;
    
    // Use TwiML to speak the message
    const twiml = `<Response><Say>${summaryMessage}</Say></Response>`;
    
    logger.info({ toPhone }, 'Placing AI voice call');
    
    const call = await client.calls.create({
      url: `http://twimlets.com/echo?Twiml=${encodeURIComponent(twiml)}`,
      to: toPhone,
      from: fromPhone,
    });
    
    logger.info({ callSid: call.sid, status: call.status }, `Call result: ${call.status}`);
  } catch (error: any) {
    logger.error({ 
      error, 
      message: error.message, 
      details: error.details,
      code: error.code,
      status: error.status
    }, 'Call result: failed to place AI voice call');
    // We log but do not throw to avoid crashing the process
  }
}
