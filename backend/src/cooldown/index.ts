import { Incident } from '../correlation/types';
import { CooldownResult } from './types';
import { checkAndApplyCooldown } from './store';
import {
  COOLDOWN_MS_CRITICAL,
  COOLDOWN_MS_WARNING,
  COOLDOWN_MS_INFO,
} from './config';

/**
 * Entry point for the Adaptive Cooldown stage.
 * Receives an incident and determines whether it should be allowed through
 * or suppressed based on its severity-scaled cooldown window.
 */
export async function applyCooldown(incident: Incident): Promise<CooldownResult> {
  const severity = incident.severity || 'unknown';
  
  let cooldownMs = COOLDOWN_MS_INFO;
  switch (severity) {
    case 'critical':
      cooldownMs = COOLDOWN_MS_CRITICAL;
      break;
    case 'warning':
      cooldownMs = COOLDOWN_MS_WARNING;
      break;
    case 'info':
    case 'unknown':
    default:
      cooldownMs = COOLDOWN_MS_INFO;
      break;
  }

  // The documentation notes: "Cooldown is keyed by the incident's fingerprint"
  // The most stable fingerprint representing an incident is its root cause fingerprint.
  const fingerprint = incident.root_cause.fingerprint;

  if (!fingerprint) {
    throw new Error('Incident is missing a root_cause fingerprint, cannot apply cooldown.');
  }

  return checkAndApplyCooldown(fingerprint, cooldownMs);
}
