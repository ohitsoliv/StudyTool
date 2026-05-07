import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { EdgeDoc, GraphMetadata, NodeDoc } from '../../types/graph';
import type { StorageBackend, Unsubscribe } from './types';

/**
 * Recursively strip undefined fields. Firestore rejects undefined values
 * in writes, but allows nulls. Preserves Timestamp instances unchanged.
 */
function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (
      v !== null &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      !(v instanceof Timestamp)
    ) {
      out[k] = stripUndefined(v);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

const getGraphsRef = (userId: string) =>
  collection(db, 'users', userId, 'graphs');
const getNodesRef = (userId: string, graphId: string) =>
  collection(db, 'users', userId, 'graphs', graphId, 'nodes');
const getEdgesRef = (userId: string, graphId: string) =>
  collection(db, 'users', userId, 'graphs', graphId, 'edges');

export const firestoreBackend: StorageBackend = {
  getUserId() {
    // Auth-driven override comes in a later packet
    return 'dev-user';
  },

  async listGraphs(userId) {
    const snap = await getDocs(
      query(getGraphsRef(userId), orderBy('updatedAt', 'desc')),
    );
    // id placed AFTER spread to win against any stray id field in stored data
    return snap.docs.map((d) => ({
      ...(d.data() as Omit<GraphMetadata, 'id'>),
      id: d.id,
    }));
  },

  async createGraph(userId, name) {
    const ref = await addDoc(
      getGraphsRef(userId),
      stripUndefined({
        name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    return ref.id;
  },

  async deleteGraph(userId, graphId) {
    await deleteDoc(doc(getGraphsRef(userId), graphId));
  },

  async listNodes(userId, graphId) {
    const snap = await getDocs(getNodesRef(userId, graphId));
    return snap.docs.map((d) => ({
      ...(d.data() as Omit<NodeDoc, 'id'>),
      id: d.id,
    }));
  },

  async createNode(userId, graphId, partial) {
    const ref = await addDoc(
      getNodesRef(userId, graphId),
      stripUndefined({
        ...partial,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    return ref.id;
  },

  async updateNode(userId, graphId, nodeId, patch) {
    await updateDoc(
      doc(getNodesRef(userId, graphId), nodeId),
      stripUndefined({ ...patch, updatedAt: serverTimestamp() }),
    );
  },

  async updateEdge(userId, graphId, edgeId, partial) {
    await updateDoc(
      doc(getEdgesRef(userId, graphId), edgeId),
      stripUndefined({ ...partial }),
    );
  },

  async deleteNode(userId, graphId, nodeId) {
    await deleteDoc(doc(getNodesRef(userId, graphId), nodeId));
  },

  async listEdges(userId, graphId) {
    const snap = await getDocs(getEdgesRef(userId, graphId));
    return snap.docs.map((d) => ({
      ...(d.data() as Omit<EdgeDoc, 'id'>),
      id: d.id,
    }));
  },

  async createEdge(userId, graphId, partial) {
    const ref = await addDoc(
      getEdgesRef(userId, graphId),
      stripUndefined({
        ...partial,
        createdAt: serverTimestamp(),
      }),
    );
    return ref.id;
  },

  async deleteEdge(userId, graphId, edgeId) {
    await deleteDoc(doc(getEdgesRef(userId, graphId), edgeId));
  },

  subscribeToNodes(userId, graphId, callback): Unsubscribe {
    return onSnapshot(getNodesRef(userId, graphId), (snap) => {
      const nodes = snap.docs.map((d) => ({
        ...(d.data() as Omit<NodeDoc, 'id'>),
        id: d.id,
      }));
      callback(nodes);
    });
  },

  subscribeToEdges(userId, graphId, callback): Unsubscribe {
    return onSnapshot(getEdgesRef(userId, graphId), (snap) => {
      const edges = snap.docs.map((d) => ({
        ...(d.data() as Omit<EdgeDoc, 'id'>),
        id: d.id,
      }));
      callback(edges);
    });
  },

  // resetAll intentionally omitted on cloud
};