import type { NodeDoc, EdgeDoc, GraphMetadata } from '../../types/graph';
import type { UniversePrefs } from '../../types/universe';

export type Unsubscribe = () => void;

export interface StorageBackend {
  getUserId(): string;

  listGraphs(userId: string): Promise<GraphMetadata[]>;
  createGraph(userId: string, name: string): Promise<string>;
  deleteGraph(userId: string, graphId: string): Promise<void>;
  updateGraph(
    userId: string,
    graphId: string,
    patch: Partial<GraphMetadata>,
  ): Promise<void>;

  listNodes(userId: string, graphId: string): Promise<NodeDoc[]>;
  createNode(
    userId: string,
    graphId: string,
    partial: Omit<NodeDoc, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string>;
  updateNode(
    userId: string,
    graphId: string,
    nodeId: string,
    patch: Partial<NodeDoc>,
  ): Promise<void>;
  deleteNode(userId: string, graphId: string, nodeId: string): Promise<void>;
  updateEdge(
    userId: string,
    graphId: string,
    edgeId: string,
    partial: Partial<EdgeDoc>,
  ): Promise<void>;
  listEdges(userId: string, graphId: string): Promise<EdgeDoc[]>;
  createEdge(
    userId: string,
    graphId: string,
    partial: Omit<EdgeDoc, 'id' | 'createdAt'>,
  ): Promise<string>;
  deleteEdge(userId: string, graphId: string, edgeId: string): Promise<void>;

  subscribeToNodes(
    userId: string,
    graphId: string,
    callback: (nodes: NodeDoc[]) => void,
  ): Unsubscribe;
  subscribeToEdges(
    userId: string,
    graphId: string,
    callback: (edges: EdgeDoc[]) => void,
  ): Unsubscribe;

  getUniversePrefs(userId: string): Promise<UniversePrefs | null>;
  setUniversePrefs(userId: string, prefs: UniversePrefs): Promise<void>;

  resetAll?(): Promise<void>;
}
