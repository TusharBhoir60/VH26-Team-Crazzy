import { TopologyGraph } from '../types';

export function getRelatedServices(
  service: string,
  graph: TopologyGraph,
  maxHops: number = 3
): Set<string> {
  const related = new Set<string>();

  // If the service is not in the graph at all, return empty set (fail open for this alert)
  if (!graph[service]) {
    return related;
  }

  // Find all upstream dependencies (things this service depends on)
  const findUpstream = (current: string, currentHop: number) => {
    if (currentHop > maxHops) return;
    const node = graph[current];
    if (!node || !node.depends_on) return;

    for (const dep of node.depends_on) {
      if (!related.has(dep)) {
        related.add(dep);
        findUpstream(dep, currentHop + 1);
      }
    }
  };

  // Find all downstream dependencies (things that depend on this service)
  const findDownstream = (current: string, currentHop: number) => {
    if (currentHop > maxHops) return;

    for (const [nodeName, nodeData] of Object.entries(graph)) {
      if (nodeData.depends_on && nodeData.depends_on.includes(current)) {
        if (!related.has(nodeName)) {
          related.add(nodeName);
          findDownstream(nodeName, currentHop + 1);
        }
      }
    }
  };

  findUpstream(service, 1);
  findDownstream(service, 1);

  return related;
}

export function isUpstreamOf(
  potentialUpstream: string,
  potentialDownstream: string,
  graph: TopologyGraph,
  maxHops: number = 5
): boolean {
  if (potentialUpstream === potentialDownstream) return false;

  const visited = new Set<string>();
  
  const search = (current: string, currentHop: number): boolean => {
    if (current === potentialUpstream) return true;
    if (currentHop > maxHops) return false;
    
    const node = graph[current];
    if (!node || !node.depends_on) return false;
    
    for (const dep of node.depends_on) {
      if (!visited.has(dep)) {
        visited.add(dep);
        if (search(dep, currentHop + 1)) return true;
      }
    }
    return false;
  };
  
  return search(potentialDownstream, 0);
}
