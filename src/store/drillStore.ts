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
  DebuggerDrill,
  BridgeDrill,
  ExampleDrill,
  StubFillDrill,
  DrillResult,
} from '../types/drill';
import type { EdgeDoc, EdgeType, NodeDoc } from '../types/graph';
import { pickRandomEligibleNode, selectBlanks } from '../utils/cloze';
import { findEligiblePair, getNeighbors } from '../utils/pathFinding';
import { selectMissingLinkPair } from '../utils/missingLink';
import { selectClusterTitleParent } from '../utils/clusterTitle';
import { selectSorterCandidate } from '../utils/sorter';
import { matchScore } from '../utils/stringMatch';
import { similarity } from '../utils/debugDiff';
import { useGraphStore } from './graphStore';
import { useViewStore } from './viewStore';

type DrillPhase = 'idle' | 'active' | 'graded';

interface DrillStoreState {
  currentDrill: Drill | null;
  result: DrillResult | null;
  phase: DrillPhase;
  startCloze: (node: NodeDoc) => void;
  startClozeRandom: (opts?: { poolNodeIds?: Set<string> }) => boolean;
  setAnswer: (blankIndex: number, value: string) => void;
  submit: () => void;
  dismiss: () => void;
  startPathFinder: (opts?: { poolNodeIds?: Set<string> }) => boolean;
  clickPathStep: (nodeId: string) => 'valid' | 'invalid' | 'finished' | 'noop';
  giveUp: () => void;
  startMissingLink: (
    nodes: NodeDoc[],
    edges: EdgeDoc[],
    opts?: { poolNodeIds?: Set<string> }
  ) => boolean;
  setMissingLinkType: (type: EdgeType) => void;
  setMissingLinkJustification: (text: string) => void;
  submitMissingLink: () => Promise<boolean>;
  giveUpMissingLink: () => Promise<void>;
  startClusterTitle: (
    nodes: NodeDoc[],
    edges: EdgeDoc[],
    opts?: { poolNodeIds?: Set<string> }
  ) => boolean;
  setClusterTitleInput: (text: string) => void;
  submitClusterTitle: () => Promise<boolean>;
  giveUpClusterTitle: () => Promise<void>;
  startSorter: (
    nodes: NodeDoc[],
    edges: EdgeDoc[],
    opts?: { poolNodeIds?: Set<string> }
  ) => boolean;
  assignChild: (childId: string, parentId: string | null) => void;
  submitSorter: () => Promise<void>;
  giveUpSorter: () => Promise<void>;
  startScenarioBuilder: (opts?: { poolNodeIds?: Set<string> }) => boolean;
  setProblemStatement: (text: string) => void;
  commitProblemStatement: () => void;
  addToPipeline: (nodeId: string) => void;
  removeFromPipeline: (index: number) => void;
  reorderPipeline: (fromIndex: number, toIndex: number) => void;
  submitScenarioBuilder: () => void;
  gradeScenarioBuilder: (verdict: 'correct' | 'partial' | 'wrong') => Promise<void>;
  startDebugger: (
    opts?: { nodeId?: string; layerDepth?: number },
    randomOpts?: { poolNodeIds?: Set<string> }
  ) => boolean;
  setDebuggerInput: (text: string) => void;
  submitDebugger: () => void;
  giveUpDebugger: () => void;
  startBridge: () => boolean;
  pickBridgeNode: (nodeId: string) => void;
  setBridgeType: (type: EdgeType) => void;
  setBridgeLabel: (text: string) => void;
  submitBridge: () => Promise<boolean>;
  cancelBridge: () => void;
  startExample: (opts?: { sourceNodeId?: string }) => boolean;
  setExampleInput: (text: string) => void;
  submitExample: () => Promise<boolean>;
  cancelExample: () => void;
  startStubFill: (opts?: { nodeId?: string }) => boolean;
  setStubFillInput: (text: string) => void;
  submitStubFill: () => Promise<boolean>;
  cancelStubFill: () => void;
}

const MIN_TEXT_LEN = 30;

function masteryDeltaFromScore(score: number): number {
  if (score === 1.0) return 0.10;
  if (score >= 0.80) return 0.05;
  if (score >= 0.50) return 0.0;
  return -0.10;
}

async function applyMasteryDelta(nodeIds: string[], masteryDelta: number): Promise<void> {
  const graphState = useGraphStore.getState();
  await Promise.all(
    nodeIds.map(async (id) => {
      const node = graphState.nodes.find((candidate) => candidate.id === id);
      if (!node) return;
      const newScore = Math.min(1, Math.max(0, node.mastery.score + masteryDelta));
      await graphState.updateNode(id, {
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
  const graphState = useGraphStore.getState();
  await Promise.all(
    nodeIds.map(async (id) => {
      const node = graphState.nodes.find((candidate) => candidate.id === id);
      if (!node) return;
      await graphState.updateNode(id, {
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

  // ------------------- CLOZE (carried forward from Packet 6) -------------------

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

    useViewStore.getState().setViewMode('focus');

    const { display, blanks } = selectBlanks(content, 0);

    const drill: ClozeDrill = {
      kind: 'cloze',
      nodeId: node.id,
      layerDepth: layerIndex + 1,
      displayText: display,
      blanks,
    };

    set({ currentDrill: drill, result: null, phase: 'active' });

    const newAccessCount = (node.accessCount ?? 0) + 1;
    useGraphStore.getState().updateNode(node.id, {
      accessCount: newAccessCount,
      lastAccessedAt: Timestamp.now(),
    });
  },

  startClozeRandom: (opts) => {
    const node = pickRandomEligibleNode(useGraphStore.getState().nodes, opts);
    if (!node) return false;
    get().startCloze(node);
    return true;
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
        const a = b.answer.trim().toLowerCase();
        const u = b.userAnswer.trim().toLowerCase();
        if (a === u) correct++;
      }
      const total = drill.blanks.length;
      const score = total > 0 ? correct / total : 0;
      const masteryDelta = masteryDeltaFromScore(score);

      const node = useGraphStore
        .getState()
        .nodes.find((n) => n.id === drill.nodeId);
      if (node) {
        const newScore = Math.min(1, Math.max(0, node.mastery.score + masteryDelta));
        useGraphStore.getState().updateNode(drill.nodeId, {
          mastery: {
            score: newScore,
            lastReviewedAt: Timestamp.now(),
            reviewCount: node.mastery.reviewCount + 1,
          },
        });
      }

      const result: DrillResult = {
        drill,
        score,
        masteryDelta,
        correct,
        total,
      };
      set({ result, phase: 'graded' });
      return;
    }

    // -------------------- PATH FINDER --------------------
    if (drill.kind !== 'path-finder') return;
    if (!drill.finished) {
      get().giveUp();
      return;
    }

    const validSteps = drill.userPath.length;
    const invalidAttempts = drill.invalidAttempts;
    const totalAttempts = validSteps + invalidAttempts;
    const efficiency = totalAttempts === 0 ? 1 : validSteps / totalAttempts;

    let score: number;
    if (invalidAttempts === 0 && validSteps === drill.shortestPathLength) {
      score = 1.0;
    } else if (invalidAttempts === 0) {
      score = 0.85;
    } else {
      score = Math.min(
        1,
        Math.max(0, efficiency * (drill.shortestPathLength / validSteps))
      );
    }

    const masteryDelta = masteryDeltaFromScore(score);

    const graphState = useGraphStore.getState();
    for (const id of [drill.startNodeId, drill.endNodeId]) {
      const n = graphState.nodes.find((x) => x.id === id);
      if (n) {
        const newScore = Math.min(1, Math.max(0, n.mastery.score + masteryDelta));
        graphState.updateNode(id, {
          mastery: {
            score: newScore,
            lastReviewedAt: Timestamp.now(),
            reviewCount: n.mastery.reviewCount + 1,
          },
        });
      }
    }

    const result: DrillResult = {
      drill,
      score,
      masteryDelta,
      reachedEnd: true,
      validSteps,
      invalidAttempts,
      shortestPathLength: drill.shortestPathLength,
    };
    set({ result, phase: 'graded' });
  },

  startBridge: () => {
    const graphState = useGraphStore.getState();
    const nodes = graphState.nodes.filter((n) => !n.archived);
    if (nodes.length < 2) return false;
    useViewStore.getState().setViewMode('dual');
    set({
      currentDrill: {
        kind: 'bridge',
        aId: null,
        bId: null,
        chosenType: 'related',
        label: '',
      },
      phase: 'active',
      result: null,
    });
    return true;
  },

  pickBridgeNode: (nodeId: string) => {
    const d = get().currentDrill;
    if (!d || d.kind !== 'bridge') return;
    if (d.aId === null) {
      set({ currentDrill: { ...d, aId: nodeId } });
      return;
    }
    if (d.bId === null && nodeId !== d.aId) {
      set({ currentDrill: { ...d, bId: nodeId } });
    }
  },

  setBridgeType: (type: EdgeType) => {
    const d = get().currentDrill;
    if (!d || d.kind !== 'bridge') return;
    set({ currentDrill: { ...d, chosenType: type } });
  },

  setBridgeLabel: (text: string) => {
    const d = get().currentDrill;
    if (!d || d.kind !== 'bridge') return;
    set({ currentDrill: { ...d, label: text } });
  },

  submitBridge: async () => {
    const d = get().currentDrill;
    if (!d || d.kind !== 'bridge') return false;
    if (!d.aId || !d.bId || !d.chosenType) return false;
    const trimmed = d.label.trim();
    if (trimmed.length < 5) return false;

    const graphStore = useGraphStore.getState();
    await graphStore.createEdge({
      source: d.aId,
      target: d.bId,
      type: d.chosenType,
      label: trimmed,
    });

    await applyMasteryDelta([d.aId], 0.05);
    await applyMasteryDelta([d.bId], 0.05);

    const completedDrill: BridgeDrill = { ...d, label: trimmed, outcome: 'created' };
    set({
      currentDrill: completedDrill,
      phase: 'graded',
      result: { drill: completedDrill, score: 1, masteryDelta: 0.05 },
    });
    return true;
  },

  cancelBridge: () => {
    get().dismiss();
  },

  startExample: (opts) => {
    const graphState = useGraphStore.getState();
    const nodes = graphState.nodes.filter((n) => !n.archived);
    const hasL1Text = (n: NodeDoc) => {
      const l1 = n.layers?.[0];
      return (
        l1 &&
        l1.contentType === 'text' &&
        typeof l1.content === 'string' &&
        l1.content.trim().length > 0
      );
    };

    let sourceNodeId: string | undefined;
    if (opts?.sourceNodeId) {
      const candidate = nodes.find((n) => n.id === opts.sourceNodeId);
      if (candidate && hasL1Text(candidate)) sourceNodeId = candidate.id;
    }
    if (!sourceNodeId) {
      const eligible = nodes.filter(hasL1Text);
      if (eligible.length === 0) return false;
      sourceNodeId = eligible[Math.floor(Math.random() * eligible.length)].id;
    }

    void markAccessed([sourceNodeId]);

    set({
      currentDrill: { kind: 'example', sourceNodeId, userInput: '' },
      phase: 'active',
      result: null,
    });
    return true;
  },

  setExampleInput: (text: string) => {
    const d = get().currentDrill;
    if (!d || d.kind !== 'example') return;
    set({ currentDrill: { ...d, userInput: text } });
  },

  submitExample: async () => {
    const d = get().currentDrill;
    if (!d || d.kind !== 'example') return false;
    const trimmed = d.userInput.trim();
    if (trimmed.length < 10) return false;

    const graphStore = useGraphStore.getState();
    const source = graphStore.nodes.find((n) => n.id === d.sourceNodeId);
    if (!source) return false;

    const titleSeed = trimmed.slice(0, 30).trim();
    const ellipsis = trimmed.length > 30 ? '…' : '';
    const newTitle = `Example: ${titleSeed}${ellipsis}`;

    const newId = await graphStore.createNode({
      title: newTitle,
      position: {
        x: source.position.x + 260,
        y: source.position.y + 60,
      },
      layers: [
        {
          depth: 1,
          content: trimmed,
          contentType: 'text',
          createdAt: Timestamp.now(),
        },
      ],
      tags: [],
      mastery: { score: 0, lastReviewedAt: null, reviewCount: 0 },
      archived: false,
      clusterId: null,
      accessCount: 0,
      lastAccessedAt: null,
    });
    if (!newId) return false;

    await graphStore.createEdge({
      source: d.sourceNodeId,
      target: newId,
      type: 'related',
    });

    await applyMasteryDelta([d.sourceNodeId], 0.05);

    const completedDrill: ExampleDrill = {
      ...d,
      userInput: trimmed,
      createdNodeId: newId,
      outcome: 'created',
    };
    set({
      currentDrill: completedDrill,
      phase: 'graded',
      result: { drill: completedDrill, score: 1, masteryDelta: 0.05 },
    });
    return true;
  },

  cancelExample: () => {
    get().dismiss();
  },

  startStubFill: (opts) => {
    const graphState = useGraphStore.getState();
    const nodes = graphState.nodes.filter((n) => !n.archived);
    const isStub = (n: NodeDoc) => {
      if (!n.layers || n.layers.length === 0) return true;
      const l1 = n.layers[0];
      if (!l1) return true;
      if (typeof l1.content !== 'string') return true;
      return l1.content.trim().length === 0;
    };

    let nodeId: string | undefined;
    if (opts?.nodeId) {
      const candidate = nodes.find((n) => n.id === opts.nodeId);
      if (candidate && isStub(candidate)) nodeId = candidate.id;
    }
    if (!nodeId) {
      const eligible = nodes.filter(isStub);
      if (eligible.length === 0) return false;
      nodeId = eligible[Math.floor(Math.random() * eligible.length)].id;
    }

    void markAccessed([nodeId]);

    set({
      currentDrill: { kind: 'stub-fill', nodeId, userInput: '' },
      phase: 'active',
      result: null,
    });
    return true;
  },

  setStubFillInput: (text: string) => {
    const d = get().currentDrill;
    if (!d || d.kind !== 'stub-fill') return;
    set({ currentDrill: { ...d, userInput: text } });
  },

  submitStubFill: async () => {
    const d = get().currentDrill;
    if (!d || d.kind !== 'stub-fill') return false;
    const trimmed = d.userInput.trim();
    if (trimmed.length < 10) return false;

    const graphStore = useGraphStore.getState();
    const node = graphStore.nodes.find((n) => n.id === d.nodeId);
    if (!node) return false;

    let newLayers;
    if (!node.layers || node.layers.length === 0) {
      newLayers = [
        {
          depth: 1,
          content: trimmed,
          contentType: 'text' as const,
          createdAt: Timestamp.now(),
        },
      ];
    } else {
      newLayers = [...node.layers];
      newLayers[0] = { ...newLayers[0], content: trimmed };
    }

    await graphStore.updateNode(d.nodeId, { layers: newLayers });
    await applyMasteryDelta([d.nodeId], 0.05);

    const completedDrill: StubFillDrill = {
      ...d,
      userInput: trimmed,
      outcome: 'filled',
    };
    set({
      currentDrill: completedDrill,
      phase: 'graded',
      result: { drill: completedDrill, score: 1, masteryDelta: 0.05 },
    });
    return true;
  },

  cancelStubFill: () => {
    get().dismiss();
  },

  dismiss: () => {
    const drill = get().currentDrill;
    if (drill?.kind === 'sorter') {
      void restorePositions(drill.originalPositions);
    }
    if (drill?.kind === 'scenario-builder') {
      useViewStore.getState().setViewMode('canvas');
    }
    if (drill?.kind === 'bridge') {
      useViewStore.getState().setViewMode('canvas');
    }
    if (drill?.kind === 'debugger') {
      useViewStore.getState().setViewMode('canvas');
    }
    set({ currentDrill: null, result: null, phase: 'idle' });
  },

  // ------------------- PATH FINDER actions -------------------

  startPathFinder: (opts) => {
    const { nodes, edges } = useGraphStore.getState();
    const pair = findEligiblePair(nodes, edges, opts);
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

    const updateNode = useGraphStore.getState().updateNode;
    for (const id of [pair.startId, pair.endId]) {
      const n = useGraphStore.getState().nodes.find((x) => x.id === id);
      if (n) {
        updateNode(id, {
          accessCount: (n.accessCount ?? 0) + 1,
          lastAccessedAt: Timestamp.now(),
        });
      }
    }
    return true;
  },

  clickPathStep: (nodeId) => {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'path-finder' || get().phase !== 'active')
      return 'noop';
    if (drill.finished) return 'noop';

    const currentPos =
      drill.userPath.length === 0
        ? drill.startNodeId
        : drill.userPath[drill.userPath.length - 1];

    if (nodeId === currentPos) return 'noop';
    if (drill.userPath.includes(nodeId)) return 'noop';

    const edges = useGraphStore.getState().edges;
    const neighbors = getNeighbors(currentPos, edges);

    if (neighbors.has(nodeId)) {
      const newPath = [...drill.userPath, nodeId];
      const finished = nodeId === drill.endNodeId;
      set({ currentDrill: { ...drill, userPath: newPath, finished } });
      return finished ? 'finished' : 'valid';
    }

    set({
      currentDrill: { ...drill, invalidAttempts: drill.invalidAttempts + 1 },
    });
    return 'invalid';
  },

  giveUp: () => {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'path-finder' || get().phase !== 'active')
      return;

    const graphState = useGraphStore.getState();
    for (const id of [drill.startNodeId, drill.endNodeId]) {
      const n = graphState.nodes.find((x) => x.id === id);
      if (n) {
        const newScore = Math.min(1, Math.max(0, n.mastery.score - 0.10));
        graphState.updateNode(id, {
          mastery: {
            score: newScore,
            lastReviewedAt: Timestamp.now(),
            reviewCount: n.mastery.reviewCount + 1,
          },
        });
      }
    }

    const result: DrillResult = {
      drill,
      score: 0,
      masteryDelta: -0.10,
      reachedEnd: false,
      validSteps: drill.userPath.length,
      invalidAttempts: drill.invalidAttempts,
      shortestPathLength: drill.shortestPathLength,
    };
    set({ result, phase: 'graded' });
  },

  startMissingLink: (nodes, edges, opts) => {
    const pair = selectMissingLinkPair(nodes, edges, opts);
    if (!pair) return false;

    const drill: MissingLinkDrill = {
      kind: 'missing-link',
      aId: pair.aId,
      bId: pair.bId,
      chosenType: null,
      justification: '',
    };

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
    if (!drill || drill.kind !== 'missing-link' || get().phase !== 'active') {
      return false;
    }

    const justification = drill.justification.trim();
    if (!drill.chosenType || justification.length < 10) return false;

    await useGraphStore.getState().createEdge({
      source: drill.aId,
      target: drill.bId,
      type: drill.chosenType,
      label: justification,
    });
    await applyMasteryDelta([drill.aId, drill.bId], 0.10);

    const gradedDrill: MissingLinkDrill = {
      ...drill,
      justification,
      outcome: 'passed',
    };
    const result: DrillResult = {
      drill: gradedDrill,
      score: 1,
      masteryDelta: 0.10,
    };
    set({ currentDrill: gradedDrill, result, phase: 'graded' });
    return true;
  },

  giveUpMissingLink: async () => {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'missing-link' || get().phase !== 'active') {
      return;
    }

    await applyMasteryDelta([drill.aId, drill.bId], -0.10);
    const gradedDrill: MissingLinkDrill = { ...drill, outcome: 'gave-up' };
    const result: DrillResult = {
      drill: gradedDrill,
      score: 0,
      masteryDelta: -0.10,
    };
    set({ currentDrill: gradedDrill, result, phase: 'graded' });
  },

  startClusterTitle: (nodes, edges, opts) => {
    const selection = selectClusterTitleParent(nodes, edges, opts);
    if (!selection) return false;

    const drill: ClusterTitleDrill = {
      kind: 'cluster-title',
      parentId: selection.parentId,
      childIds: selection.childIds,
      userInput: '',
    };

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
    if (!drill || drill.kind !== 'cluster-title' || get().phase !== 'active') {
      return false;
    }

    const input = drill.userInput.trim();
    if (input.length < 1) return false;

    const parent = useGraphStore.getState().nodes.find((node) => node.id === drill.parentId);
    if (!parent) return false;

    const score = matchScore(input, parent.title);
    const masteryDelta =
      score === 1.0 ? 0.10 : score === 0.9 ? 0.05 : score === 0.7 ? 0.0 : -0.10;

    await applyMasteryDelta([drill.parentId], masteryDelta);
    const gradedDrill: ClusterTitleDrill = { ...drill, userInput: input, score };
    const result: DrillResult = {
      drill: gradedDrill,
      score,
      masteryDelta,
    };
    set({ currentDrill: gradedDrill, result, phase: 'graded' });
    return true;
  },

  giveUpClusterTitle: async () => {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'cluster-title' || get().phase !== 'active') {
      return;
    }

    await applyMasteryDelta([drill.parentId], -0.10);
    const gradedDrill: ClusterTitleDrill = { ...drill, score: 0, gaveUp: true };
    const result: DrillResult = {
      drill: gradedDrill,
      score: 0,
      masteryDelta: -0.10,
    };
    set({ currentDrill: gradedDrill, result, phase: 'graded' });
  },

  startSorter: (nodes, edges, opts) => {
    const candidate = selectSorterCandidate(nodes, edges, opts);
    if (!candidate) return false;

    const allIds = [...candidate.parentIds, ...candidate.childIds];
    const originalPositions: Record<string, { x: number; y: number }> = {};
    for (const id of allIds) {
      const node = nodes.find((n) => n.id === id);
      if (node) originalPositions[id] = { ...node.position };
    }

    const allNodes = allIds.map((id) => nodes.find((n) => n.id === id)).filter(Boolean) as NodeDoc[];
    const maxY = allNodes.reduce((m, n) => Math.max(m, n.position.y), 0);
    const scrambleY = maxY + 250;
    const parentCentroidX =
      candidate.parentIds.reduce((sum, id) => {
        const n = nodes.find((x) => x.id === id);
        return sum + (n?.position.x ?? 0);
      }, 0) / candidate.parentIds.length;
    const spacing = 200;
    const totalWidth = (candidate.childIds.length - 1) * spacing;
    const startX = parentCentroidX - totalWidth / 2;

    const gs = useGraphStore.getState();
    for (let i = 0; i < candidate.childIds.length; i++) {
      const childId = candidate.childIds[i];
      void gs.updateNode(childId, { position: { x: startX + i * spacing, y: scrambleY } });
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
    set({ currentDrill: { ...drill, userAssignments: { ...drill.userAssignments, [childId]: parentId } } });
  },

  submitSorter: async () => {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'sorter' || get().phase !== 'active') return;
    const correct = drill.childIds.filter((c) => drill.userAssignments[c] === drill.truth[c]).length;
    const score = drill.childIds.length > 0 ? correct / drill.childIds.length : 0;
    const masteryDelta = masteryDeltaFromScore(score);
    await applyMasteryDelta([...drill.parentIds, ...drill.childIds], masteryDelta);
    const gradedDrill: SorterDrill = { ...drill, score };
    set({ currentDrill: gradedDrill, result: { drill: gradedDrill, score, masteryDelta, correct, total: drill.childIds.length }, phase: 'graded' });
  },

  giveUpSorter: async () => {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'sorter' || get().phase !== 'active') return;
    await applyMasteryDelta([...drill.parentIds, ...drill.childIds], -0.10);
    const gradedDrill: SorterDrill = { ...drill, score: 0, gaveUp: true };
    set({ currentDrill: gradedDrill, result: { drill: gradedDrill, score: 0, masteryDelta: -0.10, correct: 0, total: drill.childIds.length }, phase: 'graded' });
  },

  startScenarioBuilder: (opts) => {
    const { nodes } = useGraphStore.getState();
    const candidateNodes = opts?.poolNodeIds
      ? nodes.filter((node) => opts.poolNodeIds?.has(node.id))
      : nodes;
    if (candidateNodes.length < 3) return false;
    const drill: ScenarioBuilderDrill = {
      kind: 'scenario-builder',
      problemStatement: '',
      pipeline: [],
      builderPhase: 'authoring',
    };
    set({ currentDrill: drill, result: null, phase: 'active' });
    useViewStore.getState().setViewMode('dual');
    return true;
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
    const newPipeline = drill.pipeline.filter((_, i) => i !== index);
    set({ currentDrill: { ...drill, pipeline: newPipeline } });
  },

  reorderPipeline: (fromIndex, toIndex) => {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'scenario-builder' || drill.builderPhase !== 'building') return;
    const len = drill.pipeline.length;
    if (fromIndex < 0 || fromIndex >= len || toIndex < 0 || toIndex >= len) return;
    const arr = [...drill.pipeline];
    const [item] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, item);
    set({ currentDrill: { ...drill, pipeline: arr } });
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
        verdict: undefined,
        problemStatement: drill.problemStatement,
        pipeline: [...drill.pipeline],
        nodesAffected: [],
      },
    });
  },

  gradeScenarioBuilder: async (verdict) => {
    const { result } = get();
    if (!result || result.drill.kind !== 'scenario-builder' || result.verdict !== undefined) return;
    const delta = verdict === 'correct' ? 0.10 : verdict === 'partial' ? 0.05 : -0.10;
    const pipeline = result.pipeline ?? [];
    await applyMasteryDelta(pipeline, delta);
    set({
      result: {
        ...result,
        verdict,
        masteryDelta: delta,
        nodesAffected: [...pipeline],
      },
    });
  },

  // ------------------- DEBUGGER -------------------

  startDebugger: (opts, randomOpts) => {
    const { nodes } = useGraphStore.getState();

    type Candidate = { nodeId: string; layerDepth: number; layer: import('../types/graph').Layer; node: import('../types/graph').NodeDoc };
    const candidates: Candidate[] = [];
    for (const node of nodes) {
      if (node.archived) continue;
      for (const layer of node.layers) {
        if (
          (layer.contentType === 'code' || layer.contentType === 'math') &&
          layer.brokenVersion && layer.brokenVersion.trim().length > 0 &&
          layer.content && layer.content.trim().length > 0
        ) {
          candidates.push({ nodeId: node.id, layerDepth: layer.depth, layer, node });
        }
      }
    }

    let chosen: Candidate | undefined;
    if (opts?.nodeId !== undefined || opts?.layerDepth !== undefined) {
      chosen = candidates.find(
        (c) =>
          (opts.nodeId === undefined || c.nodeId === opts.nodeId) &&
          (opts.layerDepth === undefined || c.layerDepth === opts.layerDepth)
      );
    } else {
      const randomCandidates = randomOpts?.poolNodeIds
        ? candidates.filter((candidate) => randomOpts.poolNodeIds?.has(candidate.nodeId))
        : candidates;
      if (randomCandidates.length > 0) {
        chosen = randomCandidates[Math.floor(Math.random() * randomCandidates.length)];
      }
    }

    if (!chosen) return false;

    const drill: DebuggerDrill = {
      kind: 'debugger',
      nodeId: chosen.nodeId,
      layerDepth: chosen.layerDepth,
      contentType: chosen.layer.contentType as 'code' | 'math',
      language: chosen.layer.language,
      canonical: chosen.layer.content,
      brokenVersion: chosen.layer.brokenVersion!,
      input: chosen.layer.brokenVersion!,
    };

    set({ currentDrill: drill, result: null, phase: 'active' });
    useViewStore.getState().setViewMode('focus');
    void markAccessed([chosen.nodeId]);
    return true;
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

    const { nodes } = useGraphStore.getState();
    const node = nodes.find((n) => n.id === drill.nodeId);
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

    const { nodes } = useGraphStore.getState();
    const node = nodes.find((n) => n.id === drill.nodeId);
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