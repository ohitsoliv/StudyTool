// src/services/firestoreService.ts
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  CollectionReference,
  Unsubscribe,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { NodeDoc, EdgeDoc, GraphMetadata } from '../types/graph';

// TODO: Replace with auth.currentUser.uid when Auth is implemented
export function getUserId(): string {
  return 'dev-user';
}

export const getGraphsRef = (userId: string): CollectionReference<DocumentData> =>
  collection(db, 'users', userId, 'graphs');

export const getNodesRef = (userId: string, graphId: string): CollectionReference<DocumentData> =>
  collection(db, 'users', userId, 'graphs', graphId, 'nodes');

export const getEdgesRef = (userId: string, graphId: string): CollectionReference<DocumentData> =>
  collection(db, 'users', userId, 'graphs', graphId, 'edges');

export const getClustersRef = (userId: string, graphId: string): CollectionReference<DocumentData> =>
  collection(db, 'users', userId, 'graphs', graphId, 'clusters');

function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export async function listGraphs(userId: string): Promise<GraphMetadata[]> {
  const snap = await getDocs(getGraphsRef(userId));
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as GraphMetadata));
}

export async function createGraph(userId: string, name: string): Promise<string> {
  const ref = await addDoc(getGraphsRef(userId), {
    name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteGraph(userId: string, graphId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'graphs', graphId));
}

export async function listNodes(userId: string, graphId: string): Promise<NodeDoc[]> {
  const snap = await getDocs(getNodesRef(userId, graphId));
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as NodeDoc));
}

export async function createNode(
  userId: string,
  graphId: string,
  partial: Omit<NodeDoc, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = await addDoc(getNodesRef(userId, graphId), stripUndefined({
    ...partial,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  return ref.id;
}

export async function updateNode(
  userId: string,
  graphId: string,
  nodeId: string,
  patch: Partial<NodeDoc>
): Promise<void> {
  await updateDoc(doc(db, 'users', userId, 'graphs', graphId, 'nodes', nodeId), stripUndefined({
    ...patch,
    updatedAt: serverTimestamp(),
  }));
}

export async function deleteNode(
  userId: string,
  graphId: string,
  nodeId: string
): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'graphs', graphId, 'nodes', nodeId));
}

export async function listEdges(userId: string, graphId: string): Promise<EdgeDoc[]> {
  const snap = await getDocs(getEdgesRef(userId, graphId));
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as EdgeDoc));
}

export async function createEdge(
  userId: string,
  graphId: string,
  partial: Omit<EdgeDoc, 'id' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(getEdgesRef(userId, graphId), stripUndefined({
    ...partial,
    createdAt: serverTimestamp(),
  }));
  return ref.id;
}

export async function deleteEdge(
  userId: string,
  graphId: string,
  edgeId: string
): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'graphs', graphId, 'edges', edgeId));
}

export function subscribeToNodes(
  userId: string,
  graphId: string,
  callback: (nodes: NodeDoc[]) => void
): Unsubscribe {
  return onSnapshot(getNodesRef(userId, graphId), snap => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as NodeDoc)));
  });
}

export function subscribeToEdges(
  userId: string,
  graphId: string,
  callback: (edges: EdgeDoc[]) => void
): Unsubscribe {
  return onSnapshot(getEdgesRef(userId, graphId), snap => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as EdgeDoc)));
  });
}