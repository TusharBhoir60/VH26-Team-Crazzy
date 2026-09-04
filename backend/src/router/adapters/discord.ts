import axios from 'axios';
import { Incident, BatchedGroup } from '../../types/alert.types';
import { ChannelAdapter, DeliveryResult } from '../types';

export class DiscordAdapter implements ChannelAdapter {
  private webhookUrl: string;

  constructor(webhookUrl?: string) {
    this.webhookUrl = webhookUrl || process.env.DISCORD_WEBHOOK_URL || '';
  }

  async send(content: string, incident: Incident | BatchedGroup): Promise<DeliveryResult> {
    if (!this.webhookUrl) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[MOCK] Discord delivery successful (No webhook URL configured)');
        return { success: true };
      }
      return { success: false, error: 'DISCORD_WEBHOOK_URL is not configured', retryable: false };
    }

    try {
      const response = await axios.post(
        this.webhookUrl,
        {
          content
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      if (response.status >= 200 && response.status < 300) {
        return { success: true };
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
