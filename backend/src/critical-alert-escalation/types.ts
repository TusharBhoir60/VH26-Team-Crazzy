import { Severity } from '../types/alert.types';

export interface CriticalAlert {
  alertName: string;
  service: string;
  severity: Severity;
  severityReasoning: string;
  message: string;
  timestamp: string;
}

export interface EscalationOptions {
  pagerDutyIntegrationKey?: string;
  pagerDutyApiToken?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromPhone?: string;
  oncallPhoneNumber?: string;
  escalationTimerMs?: number;
}
