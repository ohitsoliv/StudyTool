import type { EdgeDoc, NodeDoc } from '../types/graph';

/**
 * Traversable neighbors of nodeId.
 * - parent-child / related: bidirectional
 * - prerequisite / sequence: source -> target only
 */
export function getNeighbors(nodeId: string, edges: EdgeDoc[]): Set<string> {
  const out = new Set<string>();
  for (const e of edges) {
    if (e.source === nodeId) {
      out.add(e.target);
    } else if (e.target === nodeId) {
      if (e.type === 'parent-child' || e.type === 'related') {
        out.add(e.source);
      }
    }
  }
  return out;
}

/**
 * BFS shortest path length from startId to endId.
 * Returns -1 if no path. Returns 0 if startId === endId.
 */
export function shortestPathLength(
  startId: string,
  endId: string,
  edges: EdgeDoc[]
): number {
  if (startId === endId) return 0;
  const visited = new Set<string>([startId]);
  let frontier: string[] = [startId];
  let depth = 0;
  while (frontier.length > 0) {
    depth++;
    const next: string[] = [];
    for (const node of frontier) {
      for (const nb of getNeighbors(node, edges)) {
        if (visited.has(nb)) continue;
        if (nb === endId) return depth;
        visited.add(nb);
        next.push(nb);
      }
    }
    frontier = next;
  }
  return -1;
}

/**
 * Pick a random eligible (start, end) pair such that:
 * - both nodes are non-archived
 * - there is a traversable path between them
 * - shortest path length >= 2 (not direct neighbors)
 * Returns null if no eligible pair exists.
 */
export function findEligiblePair(
  nodes: NodeDoc[],
  edges: EdgeDoc[]
): { startId: string; endId: string; shortestLength: number } | null {
  const candidates = nodes.filter((n) => !n.archived);
  if (candidates.length < 2) return null;
  const order = [...candidates].sort(() => Math.random() - 0.5);
  for (const start of order) {
    const dist = new Map<string, number>();
    dist.set(start.id, 0);
    let frontier = [start.id];
    let depth = 0;
    while (frontier.length > 0) {
      depth++;
      const next: string[] = [];
      for (const node of frontier) {
        for (const nb of getNeighbors(node, edges)) {
          if (dist.has(nb)) continue;
          dist.set(nb, depth);
          next.push(nb);
        }
      }
      frontier = next;
    }
    const farEnough: Array<[string, number]> = [];
    for (const [id, d] of dist) {
      if (id !== start.id && d >= 2) farEnough.push([id, d]);
    }
    if (farEnough.length > 0) {
      const [endId, d] = farEnough[Math.floor(Math.random() * farEnough.length)];
      return { startId: start.id, endId, shortestLength: d };
    }
  }
  return null;
}
