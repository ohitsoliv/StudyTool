// src/utils/graphHierarchy.ts
import type { GraphMetadata } from '../types/graph';

const MAX_DEPTH = 32;

/**
 * A graph is top-level when it has no parent pointers.
 * Both undefined and null count as "no parent."
 */
export function isTopLevel(g: GraphMetadata): boolean {
  return !g.parentNodeId && !g.parentGraphId;
}

/**
 * Build the chain of graphs from the root down to currentGraphId,
 * inclusive. Order: [root, ..., current]. Single-element array if
 * currentGraphId is top-level. Empty array if not found.
 *
 * Walks via parentGraphId. Bounded at MAX_DEPTH and cycle-guarded
 * to defend against data corruption - both conditions log a warning
 * and truncate.
 */
export function buildBreadcrumb(
  currentGraphId: string,
  allGraphs: GraphMetadata[],
): GraphMetadata[] {
  const byId = new Map(allGraphs.map((g) => [g.id, g]));
  const chain: GraphMetadata[] = [];
  const seen = new Set<string>();
  let id: string | null | undefined = currentGraphId;
  let depth = 0;

  while (id && depth < MAX_DEPTH) {
    if (seen.has(id)) {
      console.warn(
        '[graphHierarchy] cycle detected in parent chain at',
        id,
      );
      break;
    }
    seen.add(id);
    const g = byId.get(id);
    if (!g) break;
    chain.unshift(g);
    id = g.parentGraphId ?? null;
    depth++;
  }

  if (depth >= MAX_DEPTH) {
    console.warn('[graphHierarchy] breadcrumb depth limit reached');
  }

  return chain;
}
