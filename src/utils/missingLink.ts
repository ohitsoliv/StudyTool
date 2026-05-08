import type { EdgeDoc, NodeDoc } from '../types/graph';

function buildBidirectionalAdjacency(edges: EdgeDoc[]): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();

  const ensure = (id: string): Set<string> => {
    let set = adjacency.get(id);
    if (!set) {
      set = new Set<string>();
      adjacency.set(id, set);
    }
    return set;
  };

  for (const edge of edges) {
    ensure(edge.source).add(edge.target);
    ensure(edge.target).add(edge.source);
  }

  return adjacency;
}

function hasDirectEdge(aId: string, bId: string, edges: EdgeDoc[]): boolean {
  return edges.some(
    (edge) =>
      (edge.source === aId && edge.target === bId) ||
      (edge.source === bId && edge.target === aId)
  );
}

function hasBidirectionalPath(
  startId: string,
  endId: string,
  adjacency: Map<string, Set<string>>
): boolean {
  if (startId === endId) return true;
  const visited = new Set<string>([startId]);
  const frontier: string[] = [startId];

  while (frontier.length > 0) {
    const current = frontier.shift();
    if (!current) continue;
    for (const neighbor of adjacency.get(current) ?? []) {
      if (visited.has(neighbor)) continue;
      if (neighbor === endId) return true;
      visited.add(neighbor);
      frontier.push(neighbor);
    }
  }

  return false;
}

function twoHopNeighbors(
  nodeId: string,
  adjacency: Map<string, Set<string>>
): Set<string> {
  const result = new Set<string>();
  const oneHop = adjacency.get(nodeId) ?? new Set<string>();

  for (const mid of oneHop) {
    for (const neighbor of adjacency.get(mid) ?? []) {
      if (neighbor !== nodeId) result.add(neighbor);
    }
  }

  return result;
}

function sharesTag(a: NodeDoc, b: NodeDoc): boolean {
  if (a.tags.length === 0 || b.tags.length === 0) return false;
  const tags = new Set(a.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean));
  return b.tags.some((tag) => tags.has(tag.trim().toLowerCase()));
}

export function selectMissingLinkPair(
  nodes: NodeDoc[],
  edges: EdgeDoc[],
  opts?: { poolNodeIds?: Set<string> }
): { aId: string; bId: string } | null {
  const candidates = nodes.filter(
    (node) => !node.archived && (!opts?.poolNodeIds || opts.poolNodeIds.has(node.id))
  );
  if (candidates.length < 2) return null;

  const adjacency = buildBidirectionalAdjacency(edges);
  const twoHopMap = new Map<string, Set<string>>();
  for (const node of candidates) {
    twoHopMap.set(node.id, twoHopNeighbors(node.id, adjacency));
  }

  const eligible: Array<{ aId: string; bId: string }> = [];
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i];
      const b = candidates[j];
      if (a.id === b.id) continue;
      if (hasDirectEdge(a.id, b.id, edges)) continue;
      if (hasBidirectionalPath(a.id, b.id, adjacency)) continue;

      const shareTwoHop = Array.from(twoHopMap.get(a.id) ?? []).some((id) =>
        (twoHopMap.get(b.id) ?? new Set<string>()).has(id)
      );

      if (!sharesTag(a, b) && !shareTwoHop) continue;
      eligible.push({ aId: a.id, bId: b.id });
    }
  }

  if (eligible.length === 0) return null;
  return eligible[Math.floor(Math.random() * eligible.length)];
}