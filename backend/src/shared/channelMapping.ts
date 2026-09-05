import { Severity } from '../types/alert.types';

/**
 * Canonical notification channels.
 */
export enum NotificationChannel {
  PAGERDUTY = 'pagerduty',
  SLACK = 'slack',
  DISCORD = 'discord',
}

/**
 * Single source of truth: Severity → Notification Channel mapping.
 * Both Batching and Router use this mapping.
 */
export const severityToChannelMapping: Record<Severity, NotificationChannel> = {
  critical: NotificationChannel.PAGERDUTY,
  warning: NotificationChannel.SLACK,
  info: NotificationChannel.DISCORD,
  unknown: NotificationChannel.SLACK, // Safe fallback
};

/**
 * Convenience function for Batching (returns string).
 */
export const getDestinationChannel = (severity: Severity | null): string => {
  if (!severity) {
    return NotificationChannel.SLACK;
  }
  return severityToChannelMapping[severity] ?? NotificationChannel.SLACK;
};
