import Redis from 'ioredis';
import { Alert, BatchedGroup } from '../types/alert.types';
import { NotificationChannel, severityToChannelMapping } from '../shared/channelMapping';
import { logger } from '../shared/logger';
import { formatNotification } from './formatNotification';
import { sendWithRetry } from './retry';
import { PagerDutyAdapter } from './adapters/pagerduty';
import { SlackAdapter } from './adapters/slack';
import { DiscordAdapter } from './adapters/discord';
import { ChannelAdapter, RouterConfig } from './types';

// Singleton adapters to reuse connections/configs
const adapters: Partial<Record<NotificationChannel, ChannelAdapter>> = {
  [NotificationChannel.PAGERDUTY]: new PagerDutyAdapter(),
  [NotificationChannel.SLACK]: new SlackAdapter(),
  [NotificationChannel.DISCORD]: new DiscordAdapter(),
};

const DEFAULT_CONFIG: RouterConfig = {
  maxRetries: 3,
  initialBackoffMs: 2000,
};

function getSeverity(incidentOrBatch: Alert | BatchedGroup) {
  if ('incidents' in incidentOrBatch) {
    return incidentOrBatch.severity;
  }
  return incidentOrBatch.final_severity || incidentOrBatch.severity_score;
}

export async function route(
  incidentOrBatch: Alert | BatchedGroup,
  redis: Redis,
  config: RouterConfig = DEFAULT_CONFIG
): Promise<void> {
  const severity = getSeverity(incidentOrBatch);
  
  if (!severity) {
    logger.error({ incidentOrBatch }, 'Cannot route incident/batch without severity');
    return;
  }

  const channel = severityToChannelMapping[severity];
  if (!channel) {
    logger.error({ severity }, 'No channel mapping found for severity');
    return;
  }

  const adapter = adapters[channel];
  if (!adapter) {
    logger.error({ channel }, 'No adapter registered for channel');
    return;
  }

  const content = formatNotification(incidentOrBatch);
  
  logger.info({ channel, severity }, 'Routing notification');

  // The retry wrapper handles errors and dead-lettering internally.
  const success = await sendWithRetry(
    adapter,
    content,
    incidentOrBatch,
    channel,
    config,
    redis
  );
  
  if (!success && severity === 'critical') {
    // Distinct log for critical delivery failure (e.g. failed PagerDuty page)
    const incidentId = 'id' in incidentOrBatch ? incidentOrBatch.id : incidentOrBatch.fingerprint;
    logger.fatal(
      { channel, severity, incidentId },
      'router.critical_delivery_failed: CRITICAL ALERT DELIVERY FAILED'
    );
  }
}
