import { openDB, type IDBPDatabase } from 'idb';
import { Timestamp } from 'firebase/firestore';
import type { EdgeDoc, GraphMetadata, Layer, NodeDoc } from '../../types/graph';
import type { StorageBackend, Unsubscribe } from './types';

const DB_NAME = 'studytool-local';
const DB_VERSION = 1;

// ------------- Timestamp serialization -------------

type SerializedTs = { seconds: number; nanoseconds: number } | null;

function serializeTs(ts: Timestamp | null | undefined): SerializedTs {
  if (!ts) return null;
  return { seconds: ts.seconds, nanoseconds: ts.nanoseconds };
}

function deserializeTs(raw: any): Timestamp | null {
  if (!raw) return null;
  return new Timestamp(raw.seconds, raw.nanoseconds);
}

// ------------- DB lifecycle -------------

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('graphs')) {
          db.createObjectStore('graphs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('nodes')) {
          const nodes = db.createObjectStore('nodes', { keyPath: 'id' });
          nodes.createIndex('graphId', 'graphId');
        }
        if (!db.objectStoreNames.contains('edges')) {
          const edges = db.createObjectStore('edges', { keyPath: 'id' });
          edges.createIndex('graphId', 'graphId');
        }
      },
    });
  }
  return dbPromise;
}

// ------------- Pub-sub -------------

type NodesCallback = (nodes: NodeDoc[]) => void;
type EdgesCallback = (edges: EdgeDoc[]) => void;
const nodeSubs = new Map<string, Set<NodesCallback>>();
const edgeSubs = new Map<string, Set<EdgesCallback>>();

async function notifyNodes(graphId: string): Promise<void> {
  const subs = nodeSubs.get(graphId);
  if (!subs || subs.size === 0) return;
  const nodes = await readNodesByGraph(graphId);
  for (const cb of subs) cb(nodes);
}

async function notifyEdges(graphId: string): Promise<void> {
  const subs = edgeSubs.get(graphId);
  if (!subs || subs.size === 0) return;
  const edges = await readEdgesByGraph(graphId);
  for (const cb of subs) cb(edges);
}

// ------------- Doc serialization -------------

function serializeGraph(g: GraphMetadata): any {
  return {
    ...g,
    createdAt: serializeTs(g.createdAt as any),
    updatedAt: serializeTs(g.updatedAt as any),
  };
}

function deserializeGraph(raw: any): GraphMetadata {
  if (!raw) return raw;
  return {
    ...raw,
    createdAt: deserializeTs(raw.createdAt),
    updatedAt: deserializeTs(raw.updatedAt),
  } as GraphMetadata;
}

function serializeNode(n: NodeDoc & { graphId: string }): any {
  const { mastery, layers, createdAt, updatedAt, ...rest } = n as any;
  return {
    ...rest,
    createdAt: serializeTs(createdAt),
    updatedAt: serializeTs(updatedAt),
    mastery: mastery
      ? {
          ...mastery,
          lastReviewedAt: serializeTs(mastery.lastReviewedAt),
        }
      : mastery ?? null,
    layers: Array.isArray(layers)
      ? layers.map((l: Layer) => ({
          ...l,
          createdAt: serializeTs(l.createdAt as any),
        }))
      : layers ?? null,
  };
}

function deserializeNode(raw: any): NodeDoc {
  if (!raw) return raw;
  const rest: any = { ...raw };
  delete rest.graphId; // strip the denormalized index field
  return {
    ...rest,
    createdAt: deserializeTs(raw.createdAt),
    updatedAt: deserializeTs(raw.updatedAt),
    mastery: raw.mastery
      ? {
          ...raw.mastery,
          lastReviewedAt: deserializeTs(raw.mastery.lastReviewedAt),
        }
      : raw.mastery,
    layers: Array.isArray(raw.layers)
      ? raw.layers.map((l: any) => ({
          ...l,
          createdAt: deserializeTs(l.createdAt),
        }))
      : raw.layers,
  } as NodeDoc;
}

function serializeEdge(e: EdgeDoc & { graphId: string }): any {
  return {
    ...e,
    createdAt: serializeTs((e as any).createdAt),
  };
}

function deserializeEdge(raw: any): EdgeDoc {
  if (!raw) return raw;
  const rest: any = { ...raw };
  delete rest.graphId;
  return {
    ...rest,
    createdAt: deserializeTs(raw.createdAt),
  } as EdgeDoc;
}

// ------------- Read helpers -------------

async function readNodesByGraph(graphId: string): Promise<NodeDoc[]> {
  const db = await getDB();
  const raws = await db.getAllFromIndex('nodes', 'graphId', graphId);
  return raws.map(deserializeNode);
}

async function readEdgesByGraph(graphId: string): Promise<EdgeDoc[]> {
  const db = await getDB();
  const raws = await db.getAllFromIndex('edges', 'graphId', graphId);
  return raws.map(deserializeEdge);
}

// ------------- Backend impl -------------

export const localBackend: StorageBackend = {
  getUserId() {
    return 'dev-user';
  },

  async listGraphs(_userId) {
    const db = await getDB();
    const raws = await db.getAll('graphs');
    return raws.map(deserializeGraph).sort((a, b) => {
      const at = a.updatedAt ? a.updatedAt.toMillis() : 0;
      const bt = b.updatedAt ? b.updatedAt.toMillis() : 0;
      return bt - at;
    });
  },

  async createGraph(_userId, name) {
    const db = await getDB();
    const id = crypto.randomUUID();
    const now = Timestamp.now();
    const meta: GraphMetadata = {
      id,
      name,
      createdAt: now,
      updatedAt: now,
    } as GraphMetadata;
    await db.put('graphs', serializeGraph(meta));
    return id;
  },

  async deleteGraph(_userId, graphId) {
    const db = await getDB();
    const tx = db.transaction(['graphs', 'nodes', 'edges'], 'readwrite');
    await tx.objectStore('graphs').delete(graphId);
    const nodeKeys = await tx
      .objectStore('nodes')
      .index('graphId')
      .getAllKeys(graphId);
    for (const k of nodeKeys) await tx.objectStore('nodes').delete(k);
    const edgeKeys = await tx
      .objectStore('edges')
      .index('graphId')
      .getAllKeys(graphId);
    for (const k of edgeKeys) await tx.objectStore('edges').delete(k);
    await tx.done;
    await notifyNodes(graphId);
    await notifyEdges(graphId);
  },

  async listNodes(_userId, graphId) {
    return readNodesByGraph(graphId);
  },

  async createNode(_userId, graphId, partial) {
    const db = await getDB();
    const id = crypto.randomUUID();
    const now = Timestamp.now();
    const node = {
      ...(partial as any),
      id,
      graphId,
      createdAt: now,
      updatedAt: now,
    } as NodeDoc & { graphId: string };
    await db.put('nodes', serializeNode(node));
    await notifyNodes(graphId);
    return id;
  },

  async updateNode(_userId, graphId, nodeId, patch) {
    const db = await getDB();
    const existing = await db.get('nodes', nodeId);
    if (!existing) throw new Error(`Node ${nodeId} not found`);
    const current = deserializeNode(existing);
    const updated = {
      ...current,
      ...patch,
      id: nodeId,
      graphId, // re-attach denormalized index
      updatedAt: Timestamp.now(),
      // preserve original createdAt regardless of patch
      createdAt: current.createdAt,
    } as NodeDoc & { graphId: string };
    await db.put('nodes', serializeNode(updated));
    await notifyNodes(graphId);
  },

  async deleteNode(_userId, graphId, nodeId) {
    const db = await getDB();
    await db.delete('nodes', nodeId);
    await notifyNodes(graphId);
  },

  async listEdges(_userId, graphId) {
    return readEdgesByGraph(graphId);
  },

  async createEdge(_userId, graphId, partial) {
    const db = await getDB();
    const id = crypto.randomUUID();
    const now = Timestamp.now();
    const edge = {
      ...(partial as any),
      id,
      graphId,
      createdAt: now,
    } as EdgeDoc & { graphId: string };
    await db.put('edges', serializeEdge(edge));
    await notifyEdges(graphId);
    return id;
  },

  async deleteEdge(_userId, graphId, edgeId) {
    const db = await getDB();
    await db.delete('edges', edgeId);
    await notifyEdges(graphId);
  },

  async updateEdge(_userId, graphId, edgeId, partial) {
    const db = await getDB();
    const existing = await db.get('edges', edgeId);
    if (!existing) throw new Error(`Edge ${edgeId} not found`);
    const current = deserializeEdge(existing);
    const updated = {
      ...current,
      ...partial,
      id: edgeId,
      graphId,
      createdAt: current.createdAt,
    } as EdgeDoc & { graphId: string };
    await db.put('edges', serializeEdge(updated));
    await notifyEdges(graphId);
  },

  subscribeToNodes(_userId, graphId, callback): Unsubscribe {
    let set = nodeSubs.get(graphId);
    if (!set) {
      set = new Set();
      nodeSubs.set(graphId, set);
    }
    set.add(callback);
    queueMicrotask(async () => {
      try {
        const nodes = await readNodesByGraph(graphId);
        if (nodeSubs.get(graphId)?.has(callback)) {
          callback(nodes);
        }
      } catch (err) {
        console.error('[localBackend] subscribeToNodes initial fire failed', err);
      }
    });
    return () => {
      const s = nodeSubs.get(graphId);
      s?.delete(callback);
      if (s && s.size === 0) nodeSubs.delete(graphId);
    };
  },

  subscribeToEdges(_userId, graphId, callback): Unsubscribe {
    let set = edgeSubs.get(graphId);
    if (!set) {
      set = new Set();
      edgeSubs.set(graphId, set);
    }
    set.add(callback);
    queueMicrotask(async () => {
      try {
        const edges = await readEdgesByGraph(graphId);
        if (edgeSubs.get(graphId)?.has(callback)) {
          callback(edges);
        }
      } catch (err) {
        console.error('[localBackend] subscribeToEdges initial fire failed', err);
      }
    });
    return () => {
      const s = edgeSubs.get(graphId);
      s?.delete(callback);
      if (s && s.size === 0) edgeSubs.delete(graphId);
    };
  },

  async resetAll() {
    const db = await getDB();
    const tx = db.transaction(['graphs', 'nodes', 'edges'], 'readwrite');
    await tx.objectStore('graphs').clear();
    await tx.objectStore('nodes').clear();
    await tx.objectStore('edges').clear();
    await tx.done;
    // Notify any active subscribers that their data is now empty
    const nodeGraphIds = Array.from(nodeSubs.keys());
    const edgeGraphIds = Array.from(edgeSubs.keys());
    for (const gid of nodeGraphIds) await notifyNodes(gid);
    for (const gid of edgeGraphIds) await notifyEdges(gid);
  },
};