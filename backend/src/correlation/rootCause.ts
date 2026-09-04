import { Alert } from '../types/alert.types';
import { TopologyGraph } from './types';
import { isUpstreamOf } from './topology/traversal';

const severityWeight = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function selectRootCause(alerts: Alert[], graph: TopologyGraph): Alert {
  if (!alerts || alerts.length === 0) {
    throw new Error('Cannot select root cause from an empty group of alerts');
  }

  if (alerts.length === 1) {
    return alerts[0]!;
  }

  // We want to find the most upstream alert.
  // We can sort them. An alert A is "more upstream" than B if B depends on A.
  // If neither depends on the other, they are at the same depth relative to each other,
  // we break ties by severity, then by timestamp.

  const sortedAlerts = [...alerts].sort((a, b) => {
    // 1. Topology position
    const aIsUpstreamOfB = isUpstreamOf(a.service, b.service, graph);
    const bIsUpstreamOfA = isUpstreamOf(b.service, a.service, graph);

    if (aIsUpstreamOfB && !bIsUpstreamOfA) return -1; // A is upstream of B, so A is root cause
    if (bIsUpstreamOfA && !aIsUpstreamOfB) return 1;  // B is upstream of A, so B is root cause

    // 2. Severity tie-breaker
    const weightA = a.severity_score ? severityWeight[a.severity_score] || 0 : 0;
    const weightB = b.severity_score ? severityWeight[b.severity_score] || 0 : 0;
    
    if (weightA !== weightB) {
      return weightB - weightA; // Higher severity first
    }

    // 3. Earliest timestamp tie-breaker
    const timeA = new Date(a.received_at).getTime();
    const timeB = new Date(b.received_at).getTime();

    return timeA - timeB; // Earliest time first
  });

  return sortedAlerts[0]!;
}
