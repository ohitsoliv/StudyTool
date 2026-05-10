import type { NodeDoc, EdgeDoc } from '../types/graph';
import { findEligiblePair } from './pathFinding';
import { selectClusterTitleParent } from './clusterTitle';
import { selectSorterCandidate } from './sorter';
import { selectMissingLinkPair } from './missingLink';

export interface Eligibility {
  eligible: boolean;
  reason?: string;
}

const TEXT_LAYER_MIN = 30;

interface EligibilityOptions {
  poolNodeIds?: Set<string>;
}

function filterNodesByPool(nodes: NodeDoc[], opts?: EligibilityOptions): NodeDoc[] {
  if (!opts?.poolNodeIds) return nodes;
  return nodes.filter((node) => opts.poolNodeIds?.has(node.id));
}

export function canCloze(node: NodeDoc, opts?: EligibilityOptions): Eligibility {
  if (opts?.poolNodeIds && !opts.poolNodeIds.has(node.id)) {
    return { eligible: false, reason: 'Needs a text layer >= 30 characters' };
  }
  const has = node.layers.some(
    (l) => l.contentType === 'text' && l.content.trim().length >= TEXT_LAYER_MIN
  );
  return has
    ? { eligible: true }
    : { eligible: false, reason: 'Needs a text layer >= 30 characters' };
}

export function canDebuggerNode(node: NodeDoc, opts?: EligibilityOptions): Eligibility {
  if (opts?.poolNodeIds && !opts.poolNodeIds.has(node.id)) {
    return { eligible: false, reason: 'Needs a code/math layer with a broken version' };
  }
  const has = node.layers.some(
    (l) =>
      (l.contentType === 'code' || l.contentType === 'math') &&
      (l.brokenVersion?.trim().length ?? 0) > 0
  );
  return has
    ? { eligible: true }
    : { eligible: false, reason: 'Needs a code/math layer with a broken version' };
}

export function canPathFinder(
  nodes: NodeDoc[],
  edges: EdgeDoc[],
  opts?: EligibilityOptions
): Eligibility {
  const filteredNodes = filterNodesByPool(nodes, opts);
  const nodeIdSet = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges = opts?.poolNodeIds
    ? edges.filter((edge) => nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target))
    : edges;
  if (filteredNodes.length < 3) return { eligible: false, reason: 'Needs >= 3 nodes' };
  if (filteredEdges.length < 2) return { eligible: false, reason: 'Needs >= 2 edges' };
  if (!findEligiblePair(filteredNodes, filteredEdges, opts)) {
    return { eligible: false, reason: 'Needs >= 2 edges' };
  }
  return { eligible: true };
}

export function canMissingLink(
  nodes: NodeDoc[],
  opts?: EligibilityOptions,
  edges: EdgeDoc[] = []
): Eligibility {
  const filteredNodes = filterNodesByPool(nodes, opts);
  if (filteredNodes.length < 2) return { eligible: false, reason: 'Needs >= 2 nodes' };
  if (edges.length > 0 && !selectMissingLinkPair(filteredNodes, edges, opts)) {
    return { eligible: false, reason: 'Needs >= 2 nodes' };
  }
  return { eligible: true };
}

export function canClusterTitle(
  edges: EdgeDoc[],
  opts?: EligibilityOptions,
  nodes: NodeDoc[] = []
): Eligibility {
  if (nodes.length > 0) {
    if (selectClusterTitleParent(nodes, edges, opts)) {
      return { eligible: true };
    }
    return { eligible: false, reason: 'Needs a node with >= 2 parent-child children' };
  }
  const childrenByParent: Record<string, number> = {};
  const filteredEdges = opts?.poolNodeIds
    ? edges.filter(
        (edge) => opts.poolNodeIds?.has(edge.source) && opts.poolNodeIds?.has(edge.target)
      )
    : edges;
  for (const e of filteredEdges) {
    if (e.type === 'parent-child') {
      childrenByParent[e.source] = (childrenByParent[e.source] ?? 0) + 1;
    }
  }
  return Object.values(childrenByParent).some((c) => c >= 2)
    ? { eligible: true }
    : { eligible: false, reason: 'Needs a node with >= 2 parent-child children' };
}

export function canSorter(
  edges: EdgeDoc[],
  opts?: EligibilityOptions,
  nodes: NodeDoc[] = []
): Eligibility {
  if (nodes.length > 0) {
    if (selectSorterCandidate(nodes, edges, opts)) {
      return { eligible: true };
    }
    return { eligible: false, reason: 'Needs >= 2 nodes each with >= 2 children' };
  }
  const parentChildren: Record<string, Set<string>> = {};
  const filteredEdges = opts?.poolNodeIds
    ? edges.filter(
        (edge) => opts.poolNodeIds?.has(edge.source) && opts.poolNodeIds?.has(edge.target)
      )
    : edges;
  for (const e of filteredEdges) {
    if (e.type === 'parent-child') {
      (parentChildren[e.source] ??= new Set()).add(e.target);
    }
  }
  const qualifying = Object.values(parentChildren).filter((s) => s.size >= 2);
  return qualifying.length >= 2
    ? { eligible: true }
    : { eligible: false, reason: 'Needs >= 2 nodes each with >= 2 children' };
}

export function canScenarioBuilder(nodes: NodeDoc[], opts?: EligibilityOptions): Eligibility {
  const filteredNodes = filterNodesByPool(nodes, opts);
  return filteredNodes.length >= 3
    ? { eligible: true }
    : { eligible: false, reason: 'Needs >= 3 nodes' };
}

export function canDebuggerSystem(nodes: NodeDoc[], opts?: EligibilityOptions): Eligibility {
  const filteredNodes = filterNodesByPool(nodes, opts);
  const has = filteredNodes.some((n) =>
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

export function canBridge(
  nodes: NodeDoc[],
  opts?: EligibilityOptions
): Eligibility {
  const pool = filterNodesByPool(nodes, opts).filter((n) => !n.archived);
  if (pool.length < 2) {
    return { eligible: false, reason: 'Needs ≥ 2 nodes.' };
  }
  return { eligible: true };
}

export function canExample(
  nodes: NodeDoc[],
  opts?: EligibilityOptions
): Eligibility {
  const pool = filterNodesByPool(nodes, opts).filter((n) => !n.archived);
  const hasContent = pool.some((n) => {
    const l1 = n.layers?.[0];
    return (
      l1 &&
      l1.contentType === 'text' &&
      typeof l1.content === 'string' &&
      l1.content.trim().length > 0
    );
  });
  if (!hasContent) {
    return {
      eligible: false,
      reason: 'Needs at least one node with Layer 1 text content.',
    };
  }
  return { eligible: true };
}

export function canStubFill(
  nodes: NodeDoc[],
  opts?: EligibilityOptions
): Eligibility {
  const pool = filterNodesByPool(nodes, opts).filter((n) => !n.archived);
  const hasStub = pool.some((n) => {
    if (!n.layers || n.layers.length === 0) return true;
    const l1 = n.layers[0];
    if (!l1) return true;
    if (typeof l1.content !== 'string') return true;
    return l1.content.trim().length === 0;
  });
  if (!hasStub) {
    return {
      eligible: false,
      reason: 'No empty nodes — every node already has Layer 1 content.',
    };
  }
  return { eligible: true };
}
