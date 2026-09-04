import { Alert, BatchedGroup } from '../types/alert.types';

export interface DeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  retryable?: boolean;
}

export interface ChannelAdapter {
  send(content: string, incident: Alert | BatchedGroup): Promise<DeliveryResult>;
}

export interface RouterConfig {
  maxRetries: number;
  initialBackoffMs: number;
}
