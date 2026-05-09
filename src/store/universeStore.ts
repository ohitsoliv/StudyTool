// src/store/universeStore.ts
import { create } from 'zustand';
import { Timestamp } from 'firebase/firestore';
import type { GraphMetadata, EdgeType } from '../types/graph';
import type { UniverseEdge, AggregateMastery } from '../types/universe';
import {
  getUserId,
  listGraphs,
  listNodes,
  createGraph,
  updateGraph,
  getUniversePrefs,
  setUniversePrefs,
} from '../services/storage';
import { computeAggregate } from '../utils/aggregateMastery';

const GRID_COLUMNS = 4;
const GRID_COL_GAP = 320;
const GRID_ROW_GAP = 220;

function gridPosition(index: number): { x: number; y: number } {
  const col = index % GRID_COLUMNS;
  const row = Math.floor(index / GRID_COLUMNS);
  return { x: col * GRID_COL_GAP, y: row * GRID_ROW_GAP };
}

const EMPTY_AGGREGATE: AggregateMastery = {
  mean: 0,
  nodeCount: 0,
  reviewedCount: 0,
};

interface UniverseState {
  graphs: GraphMetadata[];
  positions: Record<string, { x: number; y: number }>;
  edges: UniverseEdge[];
  aggregates: Record<string, AggregateMastery>;
  selectedEdgeId: string | null;
  renamingGraphId: string | null;
  loading: boolean;

  load: () => Promise<void>;
  setPosition: (graphId: string, pos: { x: number; y: number }) => Promise<void>;
  createEdge: (source: string, target: string, type: EdgeType) => Promise<void>;
  updateEdge: (edgeId: string, patch: Partial<UniverseEdge>) => Promise<void>;
  deleteEdge: (edgeId: string) => Promise<void>;
  selectEdge: (edgeId: string | null) => void;
  createGraphInUniverse: (
    name: string,
    position: { x: number; y: number },
  ) => Promise<void>;
  renameGraph: (graphId: string, newName: string) => Promise<void>;
  setRenamingGraphId: (id: string | null) => void;
}

export const useUniverseStore = create<UniverseState>((set, get) => ({
  graphs: [],
  positions: {},
  edges: [],
  aggregates: {},
  selectedEdgeId: null,
  renamingGraphId: null,
  loading: false,

  load: async () => {
    set({ loading: true });
    const userId = getUserId();

    const graphs = await listGraphs(userId);
    const prefs = await getUniversePrefs(userId);
    const edges = prefs?.edges ?? [];

    const positions: Record<string, { x: number; y: number }> = {};
    const persistPromises: Promise<unknown>[] = [];

    graphs.forEach((g, i) => {
      if (g.universePosition) {
        positions[g.id] = g.universePosition;
      } else {
        const pos = gridPosition(i);
        positions[g.id] = pos;
        persistPromises.push(
          updateGraph(userId, g.id, { universePosition: pos }).catch((err) => {
            console.error('[universeStore] persist universePosition failed', err);
          }),
        );
      }
    });

    // Don't block on auto-position persistence
    void Promise.allSettled(persistPromises);

    // Aggregate mastery: read each graph's nodes once
    const aggregateEntries = await Promise.all(
      graphs.map(async (g) => {
        try {
          const nodes = await listNodes(userId, g.id);
          return [g.id, computeAggregate(nodes)] as const;
        } catch (err) {
          console.error(`[universeStore] listNodes failed for ${g.id}`, err);
          return [g.id, EMPTY_AGGREGATE] as const;
        }
      }),
    );
    const aggregates: Record<string, AggregateMastery> = {};
    for (const [id, agg] of aggregateEntries) aggregates[id] = agg;

    set({
      graphs,
      positions,
      edges,
      aggregates,
      loading: false,
    });
  },

  setPosition: async (graphId, pos) => {
    set((s) => ({
      positions: { ...s.positions, [graphId]: pos },
    }));
    try {
      await updateGraph(getUserId(), graphId, { universePosition: pos });
    } catch (err) {
      console.error('[universeStore] setPosition persist failed', err);
    }
  },

  createEdge: async (source, target, type) => {
    if (source === target) return;
    const existing = get().edges;
    if (
      existing.some(
        (e) => e.source === source && e.target === target && e.type === type,
      )
    ) {
      return;
    }
    const newEdge: UniverseEdge = {
      id: crypto.randomUUID(),
      source,
      target,
      type,
      createdAt: Timestamp.now(),
    };
    const nextEdges = [...existing, newEdge];
    set({ edges: nextEdges });
    try {
      await setUniversePrefs(getUserId(), { edges: nextEdges });
    } catch (err) {
      console.error('[universeStore] createEdge persist failed', err);
    }
  },

  updateEdge: async (edgeId, patch) => {
    const nextEdges = get().edges.map((e) =>
      e.id === edgeId ? { ...e, ...patch } : e,
    );
    set({ edges: nextEdges });
    try {
      await setUniversePrefs(getUserId(), { edges: nextEdges });
    } catch (err) {
      console.error('[universeStore] updateEdge persist failed', err);
    }
  },

  deleteEdge: async (edgeId) => {
    const nextEdges = get().edges.filter((e) => e.id !== edgeId);
    set((s) => ({
      edges: nextEdges,
      selectedEdgeId: s.selectedEdgeId === edgeId ? null : s.selectedEdgeId,
    }));
    try {
      await setUniversePrefs(getUserId(), { edges: nextEdges });
    } catch (err) {
      console.error('[universeStore] deleteEdge persist failed', err);
    }
  },

  selectEdge: (edgeId) => set({ selectedEdgeId: edgeId }),

  createGraphInUniverse: async (name, position) => {
    const userId = getUserId();
    const newId = await createGraph(userId, name);
    try {
      await updateGraph(userId, newId, { universePosition: position });
    } catch (err) {
      console.error(
        '[universeStore] createGraphInUniverse persist position failed',
        err,
      );
    }
    // Synthesize a metadata entry; real timestamps will come back on next load
    const now = Timestamp.now();
    const newMeta: GraphMetadata = {
      id: newId,
      name,
      createdAt: now,
      updatedAt: now,
      universePosition: position,
    };
    set((s) => ({
      graphs: [newMeta, ...s.graphs],
      positions: { ...s.positions, [newId]: position },
      aggregates: { ...s.aggregates, [newId]: EMPTY_AGGREGATE },
      renamingGraphId: newId,
    }));
  },

  renameGraph: async (graphId, newName) => {
    const trimmed = newName.trim();
    if (trimmed.length === 0) {
      set({ renamingGraphId: null });
      return;
    }
    const current = get().graphs.find((g) => g.id === graphId);
    if (current && current.name === trimmed) {
      set({ renamingGraphId: null });
      return;
    }
    set((s) => ({
      graphs: s.graphs.map((g) =>
        g.id === graphId ? { ...g, name: trimmed } : g,
      ),
      renamingGraphId: null,
    }));
    try {
      await updateGraph(getUserId(), graphId, { name: trimmed });
    } catch (err) {
      console.error('[universeStore] renameGraph persist failed', err);
    }
  },

  setRenamingGraphId: (id) => set({ renamingGraphId: id }),
}));
