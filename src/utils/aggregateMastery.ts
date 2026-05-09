// src/utils/aggregateMastery.ts
import type { NodeDoc } from '../types/graph';
import type { AggregateMastery } from '../types/universe';

/**
 * Compute aggregate mastery signals for a graph from its nodes.
 * Filters out archived nodes. Returns zeros when no active nodes exist.
 */
export function computeAggregate(nodes: NodeDoc[]): AggregateMastery {
  const active = nodes.filter((n) => !n.archived);
  if (active.length === 0) {
    return { mean: 0, nodeCount: 0, reviewedCount: 0 };
  }
  const total = active.reduce((sum, n) => sum + (n.mastery?.score ?? 0), 0);
  const reviewedCount = active.filter(
    (n) => (n.mastery?.reviewCount ?? 0) > 0,
  ).length;
  return {
    mean: total / active.length,
    nodeCount: active.length,
    reviewedCount,
  };
}
