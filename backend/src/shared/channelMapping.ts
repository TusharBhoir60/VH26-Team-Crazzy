import { Severity } from '../types/alert.types';

export enum NotificationChannel {
  PAGERDUTY = 'pagerduty',
  SLACK = 'slack',
  DISCORD = 'discord',
}

export const severityToChannelMapping: Record<Severity, NotificationChannel> = {
  'critical': NotificationChannel.PAGERDUTY,
  'warning': NotificationChannel.SLACK,
  'info': NotificationChannel.DISCORD,
  'unknown': NotificationChannel.DISCORD,
};
