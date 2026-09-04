import { promises as fs } from 'fs';
import * as path from 'path';
import { TopologyGraph } from '../types';

let cachedGraph: TopologyGraph | null = null;

export async function loadTopologyGraph(): Promise<TopologyGraph> {
  if (cachedGraph) {
    return cachedGraph;
  }

  try {
    const graphPath = path.resolve(__dirname, 'serviceGraph.json');
    const data = await fs.readFile(graphPath, 'utf8');
    cachedGraph = JSON.parse(data) as TopologyGraph;
    return cachedGraph;
  } catch (error) {
    // Return empty graph on error to support fail-open
    console.error('Failed to load topology graph, returning empty graph:', error);
    return {};
  }
}
