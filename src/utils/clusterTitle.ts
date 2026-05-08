import type { EdgeDoc, NodeDoc } from '../types/graph';

export function selectClusterTitleParent(
  nodes: NodeDoc[],
  edges: EdgeDoc[],
  opts?: { poolNodeIds?: Set<string> }
): { parentId: string; childIds: string[] } | null {
  const nodeIds = new Set(
    nodes
      .filter(
        (node) => !node.archived && (!opts?.poolNodeIds || opts.poolNodeIds.has(node.id))
      )
      .map((node) => node.id)
  );
  const parentToChildren = new Map<string, Set<string>>();

  for (const edge of edges) {
    if (edge.type !== 'parent-child') continue;
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    let children = parentToChildren.get(edge.source);
    if (!children) {
      children = new Set<string>();
      parentToChildren.set(edge.source, children);
    }
    children.add(edge.target);
  }

  const eligible = Array.from(parentToChildren.entries())
    .filter(([, childIds]) => childIds.size >= 2)
    .map(([parentId, childIds]) => ({ parentId, childIds: Array.from(childIds) }));

  if (eligible.length === 0) return null;
  return eligible[Math.floor(Math.random() * eligible.length)];
}