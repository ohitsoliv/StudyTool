// src/store/graphStore.ts
import { create } from 'zustand';
import { Unsubscribe } from 'firebase/firestore';
import { NodeDoc, EdgeDoc } from '../types/graph';
import {
  getUserId,
  subscribeToNodes,
  subscribeToEdges,
  createNode,
  updateNode as fsUpdateNode,
  deleteNode as fsDeleteNode,
  createEdge,
  updateEdge as fsUpdateEdge,
  deleteEdge as fsDeleteEdge,
  createGraph as fsCreateGraph,
  updateGraph as fsUpdateGraph,
} from '../services/storage';

interface GraphState {
  currentGraphId: string | null;
  nodes: NodeDoc[];
  edges: EdgeDoc[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  loading: boolean;
  error: string | null;
  _unsubscribers: { nodes?: Unsubscribe; edges?: Unsubscribe };

  setCurrentGraph: (graphId: string | null) => void;
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  createNode: (partial: Omit<NodeDoc, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string | null>;
  updateNode: (nodeId: string, patch: Partial<NodeDoc>) => Promise<void>;
  deleteNode: (nodeId: string) => Promise<void>;
  createEdge: (partial: Omit<EdgeDoc, 'id' | 'createdAt'>) => Promise<string | null>;
  updateEdge: (edgeId: string, patch: Partial<EdgeDoc>) => Promise<void>;
  deleteEdge: (edgeId: string) => Promise<void>;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  currentGraphId: null,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  loading: false,
  error: null,
  _unsubscribers: {},

  setCurrentGraph(graphId) {
    const { _unsubscribers } = get();
    _unsubscribers.nodes?.();
    _unsubscribers.edges?.();

    if (!graphId) {
      set({ currentGraphId: null, nodes: [], edges: [], _unsubscribers: {} });
      return;
    }

    set({ currentGraphId: graphId, loading: true, nodes: [], edges: [] });
    const userId = getUserId();

    const unsubNodes = subscribeToNodes(userId, graphId, nodes => {
      set({ nodes, loading: false });
    });

    const unsubEdges = subscribeToEdges(userId, graphId, edges => {
      set({ edges });
    });

    set({ _unsubscribers: { nodes: unsubNodes, edges: unsubEdges } });
  },

  selectNode(nodeId) {
    set({ selectedNodeId: nodeId, selectedEdgeId: null });
  },

  selectEdge(edgeId) {
    set({ selectedEdgeId: edgeId, selectedNodeId: null });
  },

  async createNode(partial) {
    const { currentGraphId } = get();
    if (!currentGraphId) return null;
    return createNode(getUserId(), currentGraphId, partial);
  },

  async updateNode(nodeId, patch) {
    const { currentGraphId } = get();
    if (!currentGraphId) throw new Error('No graph selected');
    await fsUpdateNode(getUserId(), currentGraphId, nodeId, patch);
  },

  async deleteNode(nodeId) {
    const { currentGraphId } = get();
    if (!currentGraphId) throw new Error('No graph selected');
    await fsDeleteNode(getUserId(), currentGraphId, nodeId);
  },

  async createEdge(partial) {
    const { currentGraphId } = get();
    if (!currentGraphId) return null;
    return createEdge(getUserId(), currentGraphId, partial);
  },

  async updateEdge(edgeId, patch) {
    const { currentGraphId } = get();
    if (!currentGraphId) return;
    await fsUpdateEdge(getUserId(), currentGraphId, edgeId, patch);
    set((state) => ({
      edges: state.edges.map((e) =>
        e.id === edgeId ? { ...e, ...patch } : e
      ),
    }));
  },

  async deleteEdge(edgeId) {
    const { currentGraphId } = get();
    if (!currentGraphId) throw new Error('No graph selected');
    await fsDeleteEdge(getUserId(), currentGraphId, edgeId);
  },

  async createChildGraph(sourceNodeId) {
    const { currentGraphId, nodes } = get();
    if (!currentGraphId) return null;
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return null;
    if (sourceNode.childGraphId) {
      // Already has a child — just enter it
      get().setCurrentGraph(sourceNode.childGraphId);
      return sourceNode.childGraphId;
    }
    const userId = getUserId();
    const childName = sourceNode.title || 'Untitled';
    const childGraphId = await fsCreateGraph(userId, childName);
    try {
      await fsUpdateGraph(userId, childGraphId, {
        parentNodeId: sourceNodeId,
        parentGraphId: currentGraphId,
      });
      await fsUpdateNode(userId, currentGraphId, sourceNodeId, {
        childGraphId,
      });
    } catch (err) {
      console.error('[graphStore] createChildGraph link write failed', err);
    }
    get().setCurrentGraph(childGraphId);
    return childGraphId;
  },

  async unlinkChildGraph(sourceNodeId) {
    const { currentGraphId, nodes } = get();
    if (!currentGraphId) return;
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode || !sourceNode.childGraphId) return;
    const childGraphId = sourceNode.childGraphId;
    const userId = getUserId();
    try {
      await fsUpdateNode(userId, currentGraphId, sourceNodeId, {
        childGraphId: null,
      });
      await fsUpdateGraph(userId, childGraphId, {
        parentNodeId: null,
        parentGraphId: null,
      });
    } catch (err) {
      console.error('[graphStore] unlinkChildGraph write failed', err);
    }
  },
}));

export function getSelectedEntity():
  | { kind: 'node'; node: NodeDoc }
  | { kind: 'edge'; edge: EdgeDoc }
  | null {
  const s = useGraphStore.getState();
  if (s.selectedEdgeId) {
    const edge = s.edges.find((e) => e.id === s.selectedEdgeId);
    if (edge) return { kind: 'edge', edge };
  }
  if (s.selectedNodeId) {
    const node = s.nodes.find((n) => n.id === s.selectedNodeId);
    if (node) return { kind: 'node', node };
  }
  return null;
  createChildGraph: (sourceNodeId: string) => Promise<string | null>;
  unlinkChildGraph: (sourceNodeId: string) => Promise<void>;
}