import { Severity } from '../types/alert.types';

export const getDestinationChannel = (severity: Severity | null): string => {
  switch (severity) {
    case 'critical':
      return 'pagerduty';
    case 'warning':
      return 'slack';
    case 'info':
      return 'email-discord';
    case 'unknown':
    default:
      return 'slack'; // Safe fallback
  }
};
