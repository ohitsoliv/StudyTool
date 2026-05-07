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
  deleteEdge as fsDeleteEdge,
} from '../services/firestoreService';

interface GraphState {
  currentGraphId: string | null;
  nodes: NodeDoc[];
  edges: EdgeDoc[];
  selectedNodeId: string | null;
  loading: boolean;
  error: string | null;
  _unsubscribers: { nodes?: Unsubscribe; edges?: Unsubscribe };

  setCurrentGraph: (graphId: string | null) => void;
  selectNode: (nodeId: string | null) => void;
  addNode: (partial: Omit<NodeDoc, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateNode: (nodeId: string, patch: Partial<NodeDoc>) => Promise<void>;
  deleteNode: (nodeId: string) => Promise<void>;
  addEdge: (partial: Omit<EdgeDoc, 'id' | 'createdAt'>) => Promise<string>;
  deleteEdge: (edgeId: string) => Promise<void>;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  currentGraphId: null,
  nodes: [],
  edges: [],
  selectedNodeId: null,
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
    set({ selectedNodeId: nodeId });
  },

  async addNode(partial) {
    const { currentGraphId } = get();
    if (!currentGraphId) throw new Error('No graph selected');
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

  async addEdge(partial) {
    const { currentGraphId } = get();
    if (!currentGraphId) throw new Error('No graph selected');
    return createEdge(getUserId(), currentGraphId, partial);
  },

  async deleteEdge(edgeId) {
    const { currentGraphId } = get();
    if (!currentGraphId) throw new Error('No graph selected');
    await fsDeleteEdge(getUserId(), currentGraphId, edgeId);
  },
}));