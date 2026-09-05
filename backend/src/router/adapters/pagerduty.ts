import axios from 'axios';
import { Incident, BatchedGroup } from '../../types/alert.types';
import { ChannelAdapter, DeliveryResult } from '../types';

export class PagerDutyAdapter implements ChannelAdapter {
  private configuredKey?: string;
  private endpoint = 'https://events.pagerduty.com/v2/enqueue';

  constructor(routingKey?: string) {
    this.configuredKey = routingKey;
  }

  async send(content: string, incident: Incident | BatchedGroup): Promise<DeliveryResult> {
    // Read env lazily so dotenv.config() has time to load
    const routingKey = this.configuredKey || process.env.PAGERDUTY_ROUTING_KEY || '';

    if (!routingKey) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[MOCK] PagerDuty delivery successful (No routing key configured)');
        return { success: true, messageId: 'mock-pd-123' };
      }
      return { success: false, error: 'PAGERDUTY_ROUTING_KEY is not configured', retryable: false };
    }

    try {
      const response = await axios.post(
        this.endpoint,
        {
          routing_key: routingKey,
          event_action: 'trigger',
          payload: {
            summary: content,
            source: 'Antigravity Router',
            severity: 'critical',
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      if (response.status >= 200 && response.status < 300) {
        return { success: true, messageId: response.data?.dedup_key };
      }

      return {
        success: false,
        error: `Unexpected status code ${response.status}`,
        retryable: response.status >= 500 || response.status === 429,
      };
    } catch (err: any) {
      if (err.response) {
        return {
          success: false,
          error: `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}`,
          retryable: err.response.status >= 500 || err.response.status === 429,
        };
      }
      return { success: false, error: err.message, retryable: true };
    }
  }
}
