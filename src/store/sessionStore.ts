import { create } from 'zustand';
import type { Drill } from '../types/drill';
import type { SessionConfig, SessionState } from '../types/session';
import { DRILL_TO_LENS } from '../types/session';
import {
  canBridge,
  canClusterTitle,
  canDebuggerSystem,
  canExample,
  canMissingLink,
  canPathFinder,
  canScenarioBuilder,
  canSorter,
  canStubFill,
} from '../utils/drillEligibility';
import { pickRandomEligibleNode } from '../utils/cloze';
import { useGraphStore } from './graphStore';
import { useDrillStore } from './drillStore';
import { useViewStore } from './viewStore';

interface SessionStore {
  session: SessionState | null;
  modalOpen: boolean;

  // Modal control
  openModal(): void;
  closeModal(): void;

  // Session lifecycle
  startSession(config: SessionConfig): void;
  endSession(): void;
  advanceSession(): void;
  markBoundReached(): void;

  // Internal helpers exposed for testing / future packets
  pickNextDrill(): Drill['kind'] | null;
}

let sessionTimer: ReturnType<typeof setInterval> | null = null;

function clearSessionTimer(): void {
  if (sessionTimer !== null) {
    clearInterval(sessionTimer);
    sessionTimer = null;
  }
}

function buildPoolNodeIdsForConfig(config: SessionConfig): Set<string> | null {
  if (config.mode !== 'class-study') return null;
  const tagNeedle = config.tag.trim().toLowerCase();
  if (tagNeedle.length === 0) return new Set<string>();
  const nodes = useGraphStore.getState().nodes;
  const ids = nodes
    .filter((node) => !node.archived)
    .filter((node) =>
      node.tags.some((tag) => tag.trim().toLowerCase() === tagNeedle)
    )
    .map((node) => node.id);
  return new Set(ids);
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  session: null,
  modalOpen: false,

  openModal: () => set({ modalOpen: true }),
  closeModal: () => set({ modalOpen: false }),

  startSession: (config) => {
    clearSessionTimer();

    const now = Date.now();
    const durationMinutes = config.durationMinutes;
    const deadlineAt =
      durationMinutes === null
        ? null
        : now + Math.max(0, durationMinutes) * 60_000;

    const state: SessionState = {
      config,
      startedAt: now,
      deadlineAt,
      drillsCompleted: 0,
      drillsTarget: config.mode === 'exam-prep' ? Math.max(1, config.drillCount) : null,
      poolNodeIds: buildPoolNodeIdsForConfig(config),
      lastLens: null,
      boundReached: false,
    };

    set({ session: state, modalOpen: false });
    useViewStore.getState().setViewMode('focus');

    if (deadlineAt !== null) {
      sessionTimer = setInterval(() => {
        const session = get().session;
        if (!session || session.boundReached) return;
        if (session.deadlineAt !== null && Date.now() >= session.deadlineAt) {
          get().markBoundReached();
        }
      }, 1000);
    }

    get().advanceSession();
  },

  endSession: () => {
    clearSessionTimer();
    useDrillStore.getState().dismiss();
    useViewStore.getState().setViewMode('focus');
    set({ session: null, modalOpen: false });
  },

  markBoundReached: () => {
    set((state) => {
      if (!state.session) return state;
      if (state.session.boundReached) return state;
      return {
        session: {
          ...state.session,
          boundReached: true,
        },
      };
    });
  },

  pickNextDrill: () => {
    const session = get().session;
    if (!session) return null;

    const { nodes, edges } = useGraphStore.getState();
    const opts = session.poolNodeIds ? { poolNodeIds: session.poolNodeIds } : undefined;
    const eligible: Drill['kind'][] = [];

    if (pickRandomEligibleNode(nodes, opts)) eligible.push('cloze');
    if (canPathFinder(nodes, edges, opts).eligible) eligible.push('path-finder');
    if (canMissingLink(nodes, opts, edges).eligible) eligible.push('missing-link');
    if (canClusterTitle(edges, opts, nodes).eligible) eligible.push('cluster-title');
    if (canSorter(edges, opts, nodes).eligible) eligible.push('sorter');
    if (canScenarioBuilder(nodes, opts).eligible) eligible.push('scenario-builder');
    if (canDebuggerSystem(nodes, opts).eligible) eligible.push('debugger');
    if (canBridge(nodes, opts).eligible) eligible.push('bridge');
    if (canExample(nodes, opts).eligible) eligible.push('example');
    if (canStubFill(nodes, opts).eligible) eligible.push('stub-fill');

    if (eligible.length === 0) return null;

    const lensFiltered = session.lastLens
      ? eligible.filter((kind) => DRILL_TO_LENS[kind] !== session.lastLens)
      : eligible;
    const source = lensFiltered.length > 0 ? lensFiltered : eligible;

    return source[Math.floor(Math.random() * source.length)];
  },

  advanceSession: () => {
    const session = get().session;
    if (!session) return;

    const drillStore = useDrillStore.getState();
    const wasGraded = drillStore.phase === 'graded';
    if (drillStore.phase === 'active') return;

    let drillsCompleted = session.drillsCompleted + (wasGraded ? 1 : 0);
    if (wasGraded) {
      drillStore.dismiss();
    }

    const timedOut = session.deadlineAt !== null && Date.now() >= session.deadlineAt;
    const hitTarget = session.drillsTarget !== null && drillsCompleted >= session.drillsTarget;

    if (session.boundReached || timedOut || hitTarget) {
      set((state) => {
        if (!state.session) return state;
        return {
          session: {
            ...state.session,
            drillsCompleted,
            boundReached: true,
          },
        };
      });
      return;
    }

    const nextKind = get().pickNextDrill();
    if (!nextKind) {
      set((state) => {
        if (!state.session) return state;
        return {
          session: {
            ...state.session,
            drillsCompleted,
            boundReached: true,
          },
        };
      });
      return;
    }

    const { nodes, edges } = useGraphStore.getState();
    const opts = session.poolNodeIds ? { poolNodeIds: session.poolNodeIds } : undefined;

    let started = false;
    switch (nextKind) {
      case 'cloze':
        started = drillStore.startClozeRandom(opts);
        break;
      case 'path-finder':
        started = drillStore.startPathFinder(opts);
        break;
      case 'missing-link':
        started = drillStore.startMissingLink(nodes, edges, opts);
        break;
      case 'cluster-title':
        started = drillStore.startClusterTitle(nodes, edges, opts);
        break;
      case 'sorter':
        started = drillStore.startSorter(nodes, edges, opts);
        break;
      case 'scenario-builder':
        started = drillStore.startScenarioBuilder(opts);
        break;
      case 'debugger':
        started = drillStore.startDebugger(undefined, opts);
        break;
      case 'bridge':
        started = drillStore.startBridge();
        break;
      case 'example':
        started = drillStore.startExample();
        break;
      case 'stub-fill':
        started = drillStore.startStubFill();
        break;
    }

    if (!started) {
      set((state) => {
        if (!state.session) return state;
        return {
          session: {
            ...state.session,
            drillsCompleted,
            boundReached: true,
          },
        };
      });
      return;
    }

    set((state) => {
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          drillsCompleted,
          lastLens: DRILL_TO_LENS[nextKind],
        },
      };
    });
  },
}));
interface SessionStore {
  session: SessionState | null;
  modalOpen: boolean;

  // Modal control
  openModal(): void;
  closeModal(): void;

  // Session lifecycle
  startSession(config: SessionConfig): void;       // builds pool, schedules first drill
  endSession(): void;                              // clears state, resets view to picker
  advanceSession(): void;                          // called when user clicks "Next drill"
  markBoundReached(): void;                        // internal — called by timer tick

  // Internal helpers exposed for testing / future packets
  pickNextDrill(): Drill['kind'] | null;           // returns null when nothing eligible in pool
}