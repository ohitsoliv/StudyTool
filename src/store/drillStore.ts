import { create } from 'zustand';
import { selectBlanks } from '../utils/clozeSelection';
import type { ClozeDrill, DrillResult } from '../types/drill';
import type { NodeDoc } from '../types/graph';
import { useGraphStore } from './graphStore';
import { Timestamp } from 'firebase/firestore';

const MIN_TEXT_LEN = 30;

interface DrillState {
  phase: 'idle' | 'active' | 'graded';
  currentDrill: ClozeDrill | null;
  result: DrillResult | null;
  startCloze: (node: NodeDoc) => void;
  setAnswer: (blankIdx: number, answer: string) => void;
  submit: () => void;
  dismiss: () => void;
}

export const useDrillStore = create<DrillState>((set, get) => ({
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
    if (!currentDrill) return;
    const blanks = currentDrill.blanks.map((b, i) =>
      i === blankIdx ? { ...b, userAnswer: answer } : b
    );
    set({ currentDrill: { ...currentDrill, blanks } });
  },

  submit() {
    const { currentDrill } = get();
    if (!currentDrill) return;

    const total = currentDrill.blanks.length;
    if (total === 0) return;

    const correct = currentDrill.blanks.filter(
      (b) =>
        b.answer.trim().toLowerCase() === b.userAnswer.trim().toLowerCase()
    ).length;

    const score = correct / total;

    let masteryDelta: number;
    if (score >= 1.0) {
      masteryDelta = 0.1;
    } else if (score >= 0.8) {
      masteryDelta = 0.05;
    } else if (score >= 0.5) {
      masteryDelta = 0;
    } else {
      masteryDelta = -0.1;
    }

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
}));