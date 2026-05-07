import { create } from 'zustand';
import { Timestamp } from 'firebase/firestore';
import type { Drill, ClozeDrill, PathFinderDrill, DrillResult } from '../types/drill';
import type { NodeDoc } from '../types/graph';
import { selectBlanks } from '../utils/clozeSelection';
import { findEligiblePair, getNeighbors } from '../utils/pathFinding';
import { useGraphStore } from './graphStore';

const MIN_TEXT_LEN = 30;

interface DrillStoreState {
  phase: 'idle' | 'active' | 'graded';
  currentDrill: Drill | null;
  result: DrillResult | null;
  startCloze: (node: NodeDoc) => void;
  setAnswer: (blankIdx: number, answer: string) => void;
  submit: () => void;
  dismiss: () => void;
  startPathFinder: () => boolean;
  clickPathStep: (nodeId: string) => 'valid' | 'invalid' | 'finished' | 'noop';
  giveUp: () => void;
}

function masteryDeltaFromScore(score: number): number {
  if (score >= 1.0) return 0.1;
  if (score >= 0.8) return 0.05;
  if (score >= 0.5) return 0;
  return -0.1;
}

export const useDrillStore = create<DrillStoreState>((set, get) => ({
  phase: 'idle',
  currentDrill: null,
  result: null,

  startCloze(node) {
    const layer = node.layers.find(
      (l) =>
        l.contentType === 'text' &&
        typeof l.content === 'string' &&
        l.content.trim().length >= MIN_TEXT_LEN
    );
    if (!layer || typeof layer.content !== 'string') return;

    const { display, blanks } = selectBlanks(layer.content, 0);

    const drill: ClozeDrill = {
      kind: 'cloze',
      nodeId: node.id,
      layerDepth: layer.depth,
      displayText: display,
      blanks,
    };

    set({ phase: 'active', currentDrill: drill, result: null });
  },

  setAnswer(blankIdx, answer) {
    const { currentDrill } = get();
    if (!currentDrill || currentDrill.kind !== 'cloze') return;
    const blanks = currentDrill.blanks.map((b, i) =>
      i === blankIdx ? { ...b, userAnswer: answer } : b
    );
    set({ currentDrill: { ...currentDrill, blanks } });
  },

  submit() {
    const { currentDrill } = get();
    if (!currentDrill) return;

    // ── PATH FINDER ──────────────────────────────────────────────────────────
    if (currentDrill.kind === 'path-finder') {
      if (!currentDrill.finished) {
        get().giveUp();
        return;
      }
      const validSteps = currentDrill.userPath.length;
      const shortest = currentDrill.shortestPathLength;
      const hopDiff = validSteps - shortest;
      let score: number;
      if (hopDiff <= 0) score = 1.0;
      else if (hopDiff === 1) score = 0.85;
      else if (hopDiff === 2) score = 0.7;
      else score = 0.0;
      const masteryDelta = masteryDeltaFromScore(score);
      const graphState = useGraphStore.getState();
      for (const id of [currentDrill.startNodeId, currentDrill.endNodeId]) {
        const n = graphState.nodes.find((x) => x.id === id);
        if (n) {
          const newScore = Math.min(1, Math.max(0, n.mastery.score + masteryDelta));
          void graphState.updateNode(id, {
            mastery: { score: newScore, lastReviewedAt: Timestamp.now(), reviewCount: n.mastery.reviewCount + 1 },
          });
        }
      }
      const result: DrillResult = {
        drill: currentDrill,
        score,
        masteryDelta,
        reachedEnd: true,
        validSteps,
        invalidAttempts: currentDrill.invalidAttempts,
        shortestPathLength: shortest,
      };
      set({ phase: 'graded', result });
      return;
    }

    // ── CLOZE ─────────────────────────────────────────────────────────────────
    const total = currentDrill.blanks.length;
    if (total === 0) return;

    const correct = currentDrill.blanks.filter(
      (b) =>
        b.answer.trim().toLowerCase() === b.userAnswer.trim().toLowerCase()
    ).length;

    const score = correct / total;
    const masteryDelta = masteryDeltaFromScore(score);
    const result: DrillResult = { drill: currentDrill, score, masteryDelta, correct, total };

    const graphState = useGraphStore.getState();
    const node = graphState.nodes.find((n) => n.id === currentDrill.nodeId);
    if (node) {
      const currentScore = node.mastery?.score ?? 0;
      const newScore = Math.max(0, Math.min(1, currentScore + masteryDelta));
      void graphState.updateNode(currentDrill.nodeId, {
        mastery: {
          score: newScore,
          lastReviewedAt: Timestamp.now(),
          reviewCount: (node.mastery?.reviewCount ?? 0) + 1,
        },
        accessCount: (node.accessCount ?? 0) + 1,
        lastAccessedAt: Timestamp.now(),
      });
    }

    set({ phase: 'graded', result });
  },

  dismiss() {
    set({ phase: 'idle', currentDrill: null, result: null });
  },

  // ── PATH FINDER actions ───────────────────────────────────────────────────

  startPathFinder() {
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
    const updateNode = useGraphStore.getState().updateNode;
    for (const id of [pair.startId, pair.endId]) {
      const n = useGraphStore.getState().nodes.find((x) => x.id === id);
      if (n) {
        void updateNode(id, {
          accessCount: (n.accessCount ?? 0) + 1,
          lastAccessedAt: Timestamp.now(),
        });
      }
    }
    return true;
  },

  clickPathStep(nodeId) {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'path-finder' || get().phase !== 'active') return 'noop';
    if (drill.finished) return 'noop';
    const currentPos = drill.userPath.length === 0 ? drill.startNodeId : drill.userPath[drill.userPath.length - 1];
    if (nodeId === currentPos || nodeId === drill.startNodeId) return 'noop';
    if (drill.userPath.includes(nodeId)) return 'noop';
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

  giveUp() {
    const drill = get().currentDrill;
    if (!drill || drill.kind !== 'path-finder' || get().phase !== 'active') return;
    const graphState = useGraphStore.getState();
    for (const id of [drill.startNodeId, drill.endNodeId]) {
      const n = graphState.nodes.find((x) => x.id === id);
      if (n) {
        const newScore = Math.min(1, Math.max(0, n.mastery.score - 0.1));
        void graphState.updateNode(id, {
          mastery: { score: newScore, lastReviewedAt: Timestamp.now(), reviewCount: n.mastery.reviewCount + 1 },
        });
      }
    }
    const result: DrillResult = {
      drill,
      score: 0,
      masteryDelta: -0.1,
      reachedEnd: false,
      validSteps: drill.userPath.length,
      invalidAttempts: drill.invalidAttempts,
      shortestPathLength: drill.shortestPathLength,
    };
    set({ phase: 'graded', result });
  },
}));
