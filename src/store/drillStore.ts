import { create } from 'zustand';
import { Timestamp } from 'firebase/firestore';
import type {
  Drill,
  ClozeDrill,
  PathFinderDrill,
  MissingLinkDrill,
  ClusterTitleDrill,
  SorterDrill,
  ScenarioBuilderDrill,
  DrillResult,
} from '../types/drill';
import type { EdgeDoc, EdgeType, NodeDoc } from '../types/graph';
import { selectBlanks } from '../utils/cloze';
import { findEligiblePair, getNeighbors } from '../utils/pathFinding';
import { selectMissingLinkPair } from '../utils/missingLink';
import { selectClusterTitleParent } from '../utils/clusterTitle';
import { selectSorterCandidate } from '../utils/sorter';
import { matchScore } from '../utils/stringMatch';
import { useGraphStore } from './graphStore';
import { useViewStore } from './viewStore';

type DrillPhase = 'idle' | 'active' | 'graded';

interface DrillStoreState {
  currentDrill: Drill | null;
  result: DrillResult | null;
  phase: DrillPhase;
  startCloze: (node: NodeDoc) => void;
  setAnswer: (blankIndex: number, value: string) => void;
  submit: () => void;
  dismiss: () => void;
  startPathFinder: () => boolean;
  clickPathStep: (nodeId: string) => 'valid' | 'invalid' | 'finished' | 'noop';
  giveUp: () => void;
  startMissingLink: (nodes: NodeDoc[], edges: EdgeDoc[]) => boolean;
  setMissingLinkType: (type: EdgeType) => void;
  setMissingLinkJustification: (text: string) => void;
  submitMissingLink: () => Promise<boolean>;
  giveUpMissingLink: () => Promise<void>;
  startClusterTitle: (nodes: NodeDoc[], edges: EdgeDoc[]) => boolean;
  setClusterTitleInput: (text: string) => void;
  submitClusterTitle: () => Promise<boolean>;
  giveUpClusterTitle: () => Promise<void>;
  startSorter: (nodes: NodeDoc[], edges: EdgeDoc[]) => boolean;
  assignChild: (childId: string, parentId: string | null) => void;
  submitSorter: () => Promise<void>;
  giveUpSorter: () => Promise<void>;
  startScenarioBuilder: () => void;
  setProblemStatement: (text: string) => void;
  commitProblemStatement: () => void;
  addToPipeline: (nodeId: string) => void;
  removeFromPipeline: (index: number) => void;
  reorderPipeline: (fromIndex: number, toIndex: number) => void;
  submitScenarioBuilder: () => void;
  gradeScenarioBuilder: (verdict: 'correct' | 'partial' | 'wrong') => Promise<void>;
}

const MIN_TEXT_LEN = 30;

function masteryDeltaFromScore(score: number): number {
  if (score === 1.0) return 0.10;
  if (score >= 0.80) return 0.05;
  if (score >= 0.50) return 0.0;
  return -0.10;
}

async function applyMasteryDelta(nodeIds: string[], delta: number): Promise<void> {
  const gs = useGraphStore.getState();
  await Promise.all(
    nodeIds.map(async (id) => {
      const node = gs.nodes.find((n) => n.id === id);
      if (!node) return;
      const newScore = Math.min(1, Math.max(0, node.mastery.score + delta));
      await gs.updateNode(id, {
        mastery: {
          score: newScore,
          lastReviewedAt: Timestamp.now(),
          reviewCount: node.mastery.reviewCount + 1,
        },
      });
    })
  );
}

async function markAccessed(nodeIds: string[]): Promise<void> {
  const gs = useGraphStore.getState();
  await Promise.all(
    nodeIds.map(async (id) => {
      const node = gs.nodes.find((n) => n.id === id);
      if (!node) return;
      await gs.updateNode(id, {
        accessCount: (node.accessCount ?? 0) + 1,
        lastAccessedAt: Timestamp.now(),
      });
    })
  );
}

async function restorePositions(originalPositions: Record<string, { x: number; y: number }>): Promise<void> {
  const gs = useGraphStore.getState();
  await Promise.all(
    Object.entries(originalPositions).map(async ([id, position]) => {
      await gs.updateNode(id, { position });
    })
  );
}

export const useDrillStore = create<DrillStoreState>((set, get) => ({
  currentDrill: null,
  result: null,
  phase: 'idle',

  startCloze: (node) => {
    let layerIndex = -1;
    let content = '';
    for (let i = 0; i < node.layers.length; i++) {
      const layer = node.layers[i];
      if (
        layer.contentType === 'text' &&
        typeof layer.content === 'string' &&
        layer.content.trim().length >= MIN_TEXT_LEN
      ) {
        layerIndex = i;
        content = layer.content;
        break;
      }
    }
    if (layerIndex === -1) return;
    const { display, blanks } = selectBlanks(content, 0);
    const drill: ClozeDrill = {
      kind: 'cloze',
      nodeId: node.id,
      layerDepth: layerIndex + 1,
      displayText: display,
      blanks,
    };
    set({ currentDrill: drill, result: null, phase: 'active' });
    useGraphStore.getState().updateNode(node.id, {
      accessCount: (node.accessCount ?? 0) + 1,
      lastAccessedAt: Timestamp.now(),
    });
  },

  setAnswer: (blankIndex, value) => {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'cloze') return;
    if (blankIndex < 0 || blankIndex >= drill.blanks.length) return;
    const newBlanks = drill.blanks.map((b, i) =>
      i === blankIndex ? { ...b, userAnswer: value } : b
    );
    set({ currentDrill: { ...drill, blanks: newBlanks } });
  },

  submit: () => {
    const drill = get().currentDrill;
    if (!drill) return;
    if (drill.kind === 'cloze') {
      let correct = 0;
      for (const b of drill.blanks) {
        if (b.answer.trim().toLowerCase() === b.userAnswer.trim().toLowerCase()) correct++;
      }
      const total = drill.blanks.length;
      const score = total > 0 ? correct / total : 0;
      const masteryDelta = masteryDeltaFromScore(score);
      const node = useGraphStore.getState().nodes.find((n) => n.id === drill.nodeId);
      if (node) {
        const newScore = Math.min(1, Math.max(0, node.mastery.score + masteryDelta));
        useGraphStore.getState().updateNode(drill.nodeId, {
          mastery: { score: newScore, lastReviewedAt: Timestamp.now(), reviewCount: node.mastery.reviewCount + 1 },
        });
      }
      set({ result: { drill, score, masteryDelta, correct, total }, phase: 'graded' });
      return;
    }
    if (drill.kind !== 'path-finder') return;
    if (!drill.finished) { get().giveUp(); return; }
    const validSteps = drill.userPath.length;
    const invalidAttempts = drill.invalidAttempts;
    const efficiency = (validSteps + invalidAttempts) === 0 ? 1 : validSteps / (validSteps + invalidAttempts);
    let score: number;
    if (invalidAttempts === 0 && validSteps === drill.shortestPathLength) score = 1.0;
    else if (invalidAttempts === 0) score = 0.85;
    else score = Math.min(1, Math.max(0, efficiency * (drill.shortestPathLength / validSteps)));
    const masteryDelta = masteryDeltaFromScore(score);
    const gs = useGraphStore.getState();
    for (const id of [drill.startNodeId, drill.endNodeId]) {
      const n = gs.nodes.find((x) => x.id === id);
      if (n) {
        const newScore = Math.min(1, Math.max(0, n.mastery.score + masteryDelta));
        gs.updateNode(id, { mastery: { score: newScore, lastReviewedAt: Timestamp.now(), reviewCount: n.mastery.reviewCount + 1 } });
      }
    }
    set({ result: { drill, score, masteryDelta, reachedEnd: true, validSteps, invalidAttempts, shortestPathLength: drill.shortestPathLength }, phase: 'graded' });
  },

  dismiss: () => {
    const drill = get().currentDrill;
    if (drill?.kind === 'sorter') {
      void restorePositions(drill.originalPositions);
    }
    if (drill?.kind === 'scenario-builder') {
      useViewStore.getState().setViewMode('canvas');
    }
    set({ currentDrill: null, result: null, phase: 'idle' });
  },

  startPathFinder: () => {
    const { nodes, edges } = useGraphStore.getState();
    const pair = findEligiblePair(nodes, edges);
    if (!pair) return false;
    const drill: PathFinderDrill = {
      kind: 'path-finder',
      startNodeId: pair.startId,
      endNodeId: pair.endId,
      shortestPathLength: pair.shortestLength,
      userPath: [],
      invalidAttempts: 0,
      finished: false,
    };
    set({ currentDrill: drill, result: null, phase: 'active' });
    const gs = useGraphStore.getState();
    for (const id of [pair.startId, pair.endId]) {
      const n = gs.nodes.find((x) => x.id === id);
      if (n) gs.updateNode(id, { accessCount: (n.accessCount ?? 0) + 1, lastAccessedAt: Timestamp.now() });
    }
    return true;
  },

  clickPathStep: (nodeId) => {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'path-finder' || get().phase !== 'active') return 'noop';
    if (drill.finished) return 'noop';
    const currentPos = drill.userPath.length === 0 ? drill.startNodeId : drill.userPath[drill.userPath.length - 1];
    if (nodeId === currentPos || drill.userPath.includes(nodeId)) return 'noop';
    const edges = useGraphStore.getState().edges;
    const neighbors = getNeighbors(currentPos, edges);
    if (neighbors.has(nodeId)) {
      const newPath = [...drill.userPath, nodeId];
      const finished = nodeId === drill.endNodeId;
      set({ currentDrill: { ...drill, userPath: newPath, finished } });
      return finished ? 'finished' : 'valid';
    }
    set({ currentDrill: { ...drill, invalidAttempts: drill.invalidAttempts + 1 } });
    return 'invalid';
  },

  giveUp: () => {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'path-finder' || get().phase !== 'active') return;
    const gs = useGraphStore.getState();
    for (const id of [drill.startNodeId, drill.endNodeId]) {
      const n = gs.nodes.find((x) => x.id === id);
      if (n) {
        const newScore = Math.min(1, Math.max(0, n.mastery.score - 0.10));
        gs.updateNode(id, { mastery: { score: newScore, lastReviewedAt: Timestamp.now(), reviewCount: n.mastery.reviewCount + 1 } });
      }
    }
    set({ result: { drill, score: 0, masteryDelta: -0.10, reachedEnd: false, validSteps: drill.userPath.length, invalidAttempts: drill.invalidAttempts, shortestPathLength: drill.shortestPathLength }, phase: 'graded' });
  },

  startMissingLink: (nodes, edges) => {
    const pair = selectMissingLinkPair(nodes, edges);
    if (!pair) return false;
    const drill: MissingLinkDrill = { kind: 'missing-link', aId: pair.aId, bId: pair.bId, chosenType: null, justification: '' };
    set({ currentDrill: drill, result: null, phase: 'active' });
    void markAccessed([pair.aId, pair.bId]);
    return true;
  },

  setMissingLinkType: (type) => {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'missing-link') return;
    set({ currentDrill: { ...drill, chosenType: type } });
  },

  setMissingLinkJustification: (text) => {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'missing-link') return;
    set({ currentDrill: { ...drill, justification: text } });
  },

  submitMissingLink: async () => {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'missing-link' || get().phase !== 'active') return false;
    const justification = drill.justification.trim();
    if (!drill.chosenType || justification.length < 10) return false;
    await useGraphStore.getState().createEdge({ source: drill.aId, target: drill.bId, type: drill.chosenType, label: justification });
    await applyMasteryDelta([drill.aId, drill.bId], 0.10);
    const gradedDrill: MissingLinkDrill = { ...drill, justification, outcome: 'passed' };
    set({ currentDrill: gradedDrill, result: { drill: gradedDrill, score: 1, masteryDelta: 0.10 }, phase: 'graded' });
    return true;
  },

  giveUpMissingLink: async () => {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'missing-link' || get().phase !== 'active') return;
    await applyMasteryDelta([drill.aId, drill.bId], -0.10);
    const gradedDrill: MissingLinkDrill = { ...drill, outcome: 'gave-up' };
    set({ currentDrill: gradedDrill, result: { drill: gradedDrill, score: 0, masteryDelta: -0.10 }, phase: 'graded' });
  },

  startClusterTitle: (nodes, edges) => {
    const selection = selectClusterTitleParent(nodes, edges);
    if (!selection) return false;
    const drill: ClusterTitleDrill = { kind: 'cluster-title', parentId: selection.parentId, childIds: selection.childIds, userInput: '' };
    set({ currentDrill: drill, result: null, phase: 'active' });
    void markAccessed([selection.parentId]);
    return true;
  },

  setClusterTitleInput: (text) => {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'cluster-title') return;
    set({ currentDrill: { ...drill, userInput: text } });
  },

  submitClusterTitle: async () => {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'cluster-title' || get().phase !== 'active') return false;
    const input = drill.userInput.trim();
    if (input.length < 1) return false;
    const parent = useGraphStore.getState().nodes.find((n) => n.id === drill.parentId);
    if (!parent) return false;
    const score = matchScore(input, parent.title);
    const masteryDelta = score === 1.0 ? 0.10 : score === 0.9 ? 0.05 : score === 0.7 ? 0.0 : -0.10;
    await applyMasteryDelta([drill.parentId], masteryDelta);
    const gradedDrill: ClusterTitleDrill = { ...drill, userInput: input, score };
    set({ currentDrill: gradedDrill, result: { drill: gradedDrill, score, masteryDelta }, phase: 'graded' });
    return true;
  },

  giveUpClusterTitle: async () => {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'cluster-title' || get().phase !== 'active') return;
    await applyMasteryDelta([drill.parentId], -0.10);
    const gradedDrill: ClusterTitleDrill = { ...drill, score: 0, gaveUp: true };
    set({ currentDrill: gradedDrill, result: { drill: gradedDrill, score: 0, masteryDelta: -0.10 }, phase: 'graded' });
  },

  startSorter: (nodes, edges) => {
    const candidate = selectSorterCandidate(nodes, edges);
    if (!candidate) return false;

    // Save original positions for all parents + children
    const allIds = [...candidate.parentIds, ...candidate.childIds];
    const originalPositions: Record<string, { x: number; y: number }> = {};
    for (const id of allIds) {
      const node = nodes.find((n) => n.id === id);
      if (node) originalPositions[id] = { ...node.position };
    }

    // Compute scrambled positions: bottom of canvas, spread evenly
    const allNodes = [...candidate.parentIds, ...candidate.childIds].map((id) => nodes.find((n) => n.id === id)).filter(Boolean) as NodeDoc[];
    const maxY = allNodes.reduce((m, n) => Math.max(m, n.position.y), 0);
    const scrambleY = maxY + 250;
    const parentCentroidX = candidate.parentIds.reduce((sum, id) => {
      const n = nodes.find((x) => x.id === id);
      return sum + (n?.position.x ?? 0);
    }, 0) / candidate.parentIds.length;
    const spacing = 200;
    const totalWidth = (candidate.childIds.length - 1) * spacing;
    const startX = parentCentroidX - totalWidth / 2;

    const gs = useGraphStore.getState();
    for (let i = 0; i < candidate.childIds.length; i++) {
      const childId = candidate.childIds[i];
      const scrambledPos = { x: startX + i * spacing, y: scrambleY };
      void gs.updateNode(childId, { position: scrambledPos });
    }

    const userAssignments: Record<string, string | null> = {};
    for (const childId of candidate.childIds) {
      userAssignments[childId] = null;
    }

    const drill: SorterDrill = {
      kind: 'sorter',
      parentIds: candidate.parentIds,
      childIds: candidate.childIds,
      truth: candidate.assignments,
      userAssignments,
      originalPositions,
    };
    set({ currentDrill: drill, result: null, phase: 'active' });
    void markAccessed(allIds);
    return true;
  },

  assignChild: (childId, parentId) => {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'sorter' || get().phase !== 'active') return;
    set({
      currentDrill: {
        ...drill,
        userAssignments: { ...drill.userAssignments, [childId]: parentId },
      },
    });
  },

  submitSorter: async () => {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'sorter' || get().phase !== 'active') return;
    const correct = drill.childIds.filter((c) => drill.userAssignments[c] === drill.truth[c]).length;
    const score = drill.childIds.length > 0 ? correct / drill.childIds.length : 0;
    const masteryDelta = masteryDeltaFromScore(score);
    const allIds = [...drill.parentIds, ...drill.childIds];
    await applyMasteryDelta(allIds, masteryDelta);
    const gradedDrill: SorterDrill = { ...drill, score };
    set({ currentDrill: gradedDrill, result: { drill: gradedDrill, score, masteryDelta, correct, total: drill.childIds.length }, phase: 'graded' });
  },

  giveUpSorter: async () => {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'sorter' || get().phase !== 'active') return;
    const allIds = [...drill.parentIds, ...drill.childIds];
    await applyMasteryDelta(allIds, -0.10);
    const gradedDrill: SorterDrill = { ...drill, score: 0, gaveUp: true };
    set({ currentDrill: gradedDrill, result: { drill: gradedDrill, score: 0, masteryDelta: -0.10, correct: 0, total: drill.childIds.length }, phase: 'graded' });
  },

  startScenarioBuilder: () => {
    const { nodes } = useGraphStore.getState();
    if (nodes.length < 3) return;
    const drill: ScenarioBuilderDrill = {
      kind: 'scenario-builder',
      problemStatement: '',
      pipeline: [],
      builderPhase: 'authoring',
    };
    set({ currentDrill: drill, result: null, phase: 'active' });
    useViewStore.getState().setViewMode('dual');
  },

  setProblemStatement: (text) => {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'scenario-builder' || drill.builderPhase !== 'authoring') return;
    set({ currentDrill: { ...drill, problemStatement: text } });
  },

  commitProblemStatement: () => {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'scenario-builder' || drill.builderPhase !== 'authoring') return;
    if (drill.problemStatement.trim().length < 10) return;
    set({ currentDrill: { ...drill, builderPhase: 'building' } });
  },

  addToPipeline: (nodeId) => {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'scenario-builder' || drill.builderPhase !== 'building') return;
    if (drill.pipeline.includes(nodeId)) return;
    set({ currentDrill: { ...drill, pipeline: [...drill.pipeline, nodeId] } });

    const gs = useGraphStore.getState();
    const node = gs.nodes.find((n) => n.id === nodeId);
    if (node) {
      void gs.updateNode(nodeId, {
        accessCount: (node.accessCount ?? 0) + 1,
        lastAccessedAt: Timestamp.now(),
      });
    }
  },

  removeFromPipeline: (index) => {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'scenario-builder' || drill.builderPhase !== 'building') return;
    if (index < 0 || index >= drill.pipeline.length) return;
    const next = drill.pipeline.filter((_, i) => i !== index);
    set({ currentDrill: { ...drill, pipeline: next } });
  },

  reorderPipeline: (fromIndex, toIndex) => {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'scenario-builder' || drill.builderPhase !== 'building') return;
    const len = drill.pipeline.length;
    if (fromIndex < 0 || fromIndex >= len || toIndex < 0 || toIndex >= len) return;
    const next = [...drill.pipeline];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    set({ currentDrill: { ...drill, pipeline: next } });
  },

  submitScenarioBuilder: () => {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'scenario-builder' || drill.builderPhase !== 'building') return;
    if (drill.pipeline.length < 1) return;
    set({
      phase: 'graded',
      result: {
        drill,
        score: 0,
        masteryDelta: 0,
        problemStatement: drill.problemStatement,
        pipeline: [...drill.pipeline],
        nodesAffected: [],
      },
    });
  },

  gradeScenarioBuilder: async (verdict) => {
    const { result } = get();
    if (!result || result.drill.kind !== 'scenario-builder' || result.verdict !== undefined) return;

    const masteryDelta = verdict === 'correct' ? 0.10 : verdict === 'partial' ? 0.05 : -0.10;
    const nodeIds = result.pipeline ?? [];
    await applyMasteryDelta(nodeIds, masteryDelta);

    set({
      result: {
        ...result,
        verdict,
        masteryDelta,
        nodesAffected: [...nodeIds],
      },
    });
  },

  startDebugger: (opts) => {
    const { nodes } = useGraphStore.getState();

    type Candidate = {
      nodeId: string;
      layerDepth: number;
      layer: import('../types/graph').Layer;
    };

    const candidates: Candidate[] = [];
    for (const node of nodes) {
      if (node.archived) continue;
      for (const layer of node.layers) {
        if (
          (layer.contentType === 'code' || layer.contentType === 'math') &&
          layer.brokenVersion && layer.brokenVersion.trim().length > 0 &&
          layer.content && layer.content.trim().length > 0
        ) {
          candidates.push({ nodeId: node.id, layerDepth: layer.depth, layer });
        }
      }
    }

    let chosen: Candidate | undefined;
    if (opts?.nodeId !== undefined || opts?.layerDepth !== undefined) {
      chosen = candidates.find(
        (candidate) =>
          (opts.nodeId === undefined || candidate.nodeId === opts.nodeId) &&
          (opts.layerDepth === undefined || candidate.layerDepth === opts.layerDepth)
      );
    } else if (candidates.length > 0) {
      chosen = candidates[Math.floor(Math.random() * candidates.length)];
    }

    if (!chosen) return;

    const drill: DebuggerDrill = {
      kind: 'debugger',
      nodeId: chosen.nodeId,
      layerDepth: chosen.layerDepth,
      contentType: chosen.layer.contentType as 'code' | 'math',
      language: chosen.layer.language,
      canonical: chosen.layer.content,
      brokenVersion: chosen.layer.brokenVersion,
      input: chosen.layer.brokenVersion,
    };

    set({ currentDrill: drill, result: null, phase: 'active' });
    useViewStore.getState().setViewMode('focus');
    void markAccessed([chosen.nodeId]);
  },

  setDebuggerInput: (text) => {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'debugger' || get().phase !== 'active') return;
    set({ currentDrill: { ...drill, input: text } });
  },

  submitDebugger: () => {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'debugger' || get().phase !== 'active') return;

    const sim = similarity(drill.canonical, drill.input);
    const masteryDelta = sim >= 0.99 ? 0.10 : sim >= 0.80 ? 0.05 : sim >= 0.50 ? 0 : -0.10;

    const node = useGraphStore.getState().nodes.find((n) => n.id === drill.nodeId);
    if (node) {
      const newScore = Math.min(1, Math.max(0, node.mastery.score + masteryDelta));
      void useGraphStore.getState().updateNode(drill.nodeId, {
        mastery: {
          score: newScore,
          lastReviewedAt: Timestamp.now(),
          reviewCount: node.mastery.reviewCount + 1,
        },
      });
    }

    const result: DrillResult = {
      drill,
      score: sim,
      masteryDelta,
      similarity: sim,
      nodeId: drill.nodeId,
      layerDepth: drill.layerDepth,
    };
    set({ result, phase: 'graded' });
  },

  giveUpDebugger: () => {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'debugger' || get().phase !== 'active') return;

    const node = useGraphStore.getState().nodes.find((n) => n.id === drill.nodeId);
    if (node) {
      const newScore = Math.min(1, Math.max(0, node.mastery.score - 0.10));
      void useGraphStore.getState().updateNode(drill.nodeId, {
        mastery: {
          score: newScore,
          lastReviewedAt: Timestamp.now(),
          reviewCount: node.mastery.reviewCount + 1,
        },
      });
    }

    const result: DrillResult = {
      drill,
      score: 0,
      masteryDelta: -0.10,
      similarity: 0,
      nodeId: drill.nodeId,
      layerDepth: drill.layerDepth,
    };
    set({ result, phase: 'graded' });
  },
}));

