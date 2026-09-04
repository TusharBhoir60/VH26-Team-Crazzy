import { Incident, BatchedGroup } from '../types/alert.types';
import { getDestinationChannel } from '../shared/channelMapping';

interface CurrentWindow {
  start: number;
  incidents: Incident[];
}

let currentWindow: CurrentWindow | null = null;

// TODO: Migrate to Redis-backed batch store for horizontal scaling consistency.
// Currently in-memory — each instance maintains its own batch window.

export const addIncidentToBatch = (incident: Incident): void => {
  if (!currentWindow) {
    currentWindow = { start: Date.now(), incidents: [] };
  }
  currentWindow.incidents.push(incident);
};

export const flushBatch = (): BatchedGroup[] => {
  if (!currentWindow || currentWindow.incidents.length === 0) {
    currentWindow = null;
    return [];
  }

  const end = Date.now();
  const start = currentWindow.start;
  const incidents = currentWindow.incidents;
  
  // Reset window for the next batch
  currentWindow = null;

  const groupsMap = new Map<string, BatchedGroup>();

  for (const incident of incidents) {
    const channel = getDestinationChannel(incident.severity);
    const key = `${incident.severity}:${channel}`;
    
    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        severity: incident.severity,
        destinationChannel: channel,
        incidents: [],
        windowStart: start,
        windowEnd: end,
      });
    }
    groupsMap.get(key)!.incidents.push(incident);
  }

  return Array.from(groupsMap.values());
};

export const resetBatchStoreForTesting = (): void => {
  currentWindow = null;
};
