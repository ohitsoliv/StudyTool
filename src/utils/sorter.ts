import type { EdgeDoc, NodeDoc } from '../types/graph';

export interface SorterCandidate {
  parentIds: string[];
  childIds: string[];
  assignments: Record<string, string>;
}

export function selectSorterCandidate(
  nodes: NodeDoc[],
  edges: EdgeDoc[]
): SorterCandidate | null {
  const activeNodeIds = new Set(nodes.filter((n) => !n.archived).map((n) => n.id));

  // Build parent -> children map (only parent-child edges, active nodes only)
  const parentToChildren = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (edge.type !== 'parent-child') continue;
    if (!activeNodeIds.has(edge.source) || !activeNodeIds.has(edge.target)) continue;
    if (!parentToChildren.has(edge.source)) parentToChildren.set(edge.source, new Set());
    parentToChildren.get(edge.source)!.add(edge.target);
  }

  // Eligible parents: >= 2 children
  const eligibleParents = Array.from(parentToChildren.entries())
    .filter(([, children]) => children.size >= 2)
    .map(([id]) => id);

  if (eligibleParents.length < 2) return null;

  // Shuffle eligible parents for random selection
  const shuffled = [...eligibleParents].sort(() => Math.random() - 0.5);

  // Try combinations of 2-3 parents
  for (let numParents = Math.min(3, shuffled.length); numParents >= 2; numParents--) {
    const parentSubset = shuffled.slice(0, numParents);
    const childSets = parentSubset.map((p) => Array.from(parentToChildren.get(p)!));

    // Check total child count is 4-7
    const totalChildren = childSets.reduce((sum, arr) => sum + arr.length, 0);
    if (totalChildren < 4 || totalChildren > 7) continue;

    // Check no child belongs to more than one parent in the set
    const allChildren = childSets.flat();
    const childCounts = new Map<string, number>();
    for (const c of allChildren) childCounts.set(c, (childCounts.get(c) ?? 0) + 1);
    const hasDuplicates = Array.from(childCounts.values()).some((v) => v > 1);
    if (hasDuplicates) continue;

    // Build assignments truth map
    const assignments: Record<string, string> = {};
    for (let i = 0; i < parentSubset.length; i++) {
      for (const childId of childSets[i]) {
        assignments[childId] = parentSubset[i];
      }
    }

    return {
      parentIds: parentSubset,
      childIds: allChildren,
      assignments,
    };
  }

  // Try all possible pairs from eligible parents if simple slice didn't work
  for (let i = 0; i < eligibleParents.length; i++) {
    for (let j = i + 1; j < eligibleParents.length; j++) {
      const p1 = eligibleParents[i];
      const p2 = eligibleParents[j];
      const c1 = Array.from(parentToChildren.get(p1)!);
      const c2 = Array.from(parentToChildren.get(p2)!);
      const total = c1.length + c2.length;
      if (total < 4 || total > 7) continue;
      const allC = [...c1, ...c2];
      const dupes = new Set(c1).size + new Set(c2).size !== new Set(allC).size;
      if (dupes) continue;
      const assignments: Record<string, string> = {};
      for (const c of c1) assignments[c] = p1;
      for (const c of c2) assignments[c] = p2;
      return { parentIds: [p1, p2], childIds: allC, assignments };
    }
  }

  return null;
}
