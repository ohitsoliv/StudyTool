import type { NodeDoc, EdgeDoc } from '../types/graph';

export interface Eligibility {
  eligible: boolean;
  reason?: string;
}

const TEXT_LAYER_MIN = 30;

export function canCloze(node: NodeDoc): Eligibility {
  const has = node.layers.some(
    (l) => l.contentType === 'text' && l.content.trim().length >= TEXT_LAYER_MIN
  );
  return has
    ? { eligible: true }
    : { eligible: false, reason: 'Needs a text layer >= 30 characters' };
}

export function canDebuggerNode(node: NodeDoc): Eligibility {
  const has = node.layers.some(
    (l) =>
      (l.contentType === 'code' || l.contentType === 'math') &&
      (l.brokenVersion?.trim().length ?? 0) > 0
  );
  return has
    ? { eligible: true }
    : { eligible: false, reason: 'Needs a code/math layer with a broken version' };
}

export function canPathFinder(nodes: NodeDoc[], edges: EdgeDoc[]): Eligibility {
  if (nodes.length < 3) return { eligible: false, reason: 'Needs >= 3 nodes' };
  if (edges.length < 2) return { eligible: false, reason: 'Needs >= 2 edges' };
  return { eligible: true };
}

export function canMissingLink(nodes: NodeDoc[]): Eligibility {
  if (nodes.length < 2) return { eligible: false, reason: 'Needs >= 2 nodes' };
  return { eligible: true };
}

export function canClusterTitle(edges: EdgeDoc[]): Eligibility {
  const childrenByParent: Record<string, number> = {};
  for (const e of edges) {
    if (e.type === 'parent-child') {
      childrenByParent[e.source] = (childrenByParent[e.source] ?? 0) + 1;
    }
  }
  return Object.values(childrenByParent).some((c) => c >= 2)
    ? { eligible: true }
    : { eligible: false, reason: 'Needs a node with >= 2 parent-child children' };
}

export function canSorter(edges: EdgeDoc[]): Eligibility {
  const parentChildren: Record<string, Set<string>> = {};
  for (const e of edges) {
    if (e.type === 'parent-child') {
      (parentChildren[e.source] ??= new Set()).add(e.target);
    }
  }
  const qualifying = Object.values(parentChildren).filter((s) => s.size >= 2);
  return qualifying.length >= 2
    ? { eligible: true }
    : { eligible: false, reason: 'Needs >= 2 nodes each with >= 2 children' };
}

export function canScenarioBuilder(nodes: NodeDoc[]): Eligibility {
  return nodes.length >= 3
    ? { eligible: true }
    : { eligible: false, reason: 'Needs >= 3 nodes' };
}

export function canDebuggerSystem(nodes: NodeDoc[]): Eligibility {
  const has = nodes.some((n) =>
    n.layers.some(
      (l) =>
        (l.contentType === 'code' || l.contentType === 'math') &&
        (l.brokenVersion?.trim().length ?? 0) > 0
    )
  );
  return has
    ? { eligible: true }
    : { eligible: false, reason: 'No layers have a broken version yet' };
}
