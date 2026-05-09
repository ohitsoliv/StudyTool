import { firestoreBackend } from './firestoreBackend';
import { localBackend } from './localBackend';
import type { StorageBackend } from './types';
import type { UniversePrefs } from '../../types/universe';

const mode = (import.meta.env.VITE_STORAGE_MODE ?? 'local').toLowerCase();

export const storage: StorageBackend =
  mode === 'cloud' ? firestoreBackend : localBackend;

export const STORAGE_MODE: 'local' | 'cloud' =
  mode === 'cloud' ? 'cloud' : 'local';

// Re-export every StorageBackend method as a standalone function for backward compat
export const getUserId = () => storage.getUserId();

export const listGraphs = (userId: string) => storage.listGraphs(userId);
export const createGraph = (userId: string, name: string) =>
  storage.createGraph(userId, name);
export const deleteGraph = (userId: string, graphId: string) =>
  storage.deleteGraph(userId, graphId);

export const listNodes = (userId: string, graphId: string) =>
  storage.listNodes(userId, graphId);
export const createNode = (
  ...args: Parameters<StorageBackend['createNode']>
) => storage.createNode(...args);
export const updateNode = (
  ...args: Parameters<StorageBackend['updateNode']>
) => storage.updateNode(...args);
export const deleteNode = (
  ...args: Parameters<StorageBackend['deleteNode']>
) => storage.deleteNode(...args);

export const listEdges = (userId: string, graphId: string) =>
  storage.listEdges(userId, graphId);
export const createEdge = (
  ...args: Parameters<StorageBackend['createEdge']>
) => storage.createEdge(...args);
export const deleteEdge = (
  ...args: Parameters<StorageBackend['deleteEdge']>
) => storage.deleteEdge(...args);

export const subscribeToNodes = (
  ...args: Parameters<StorageBackend['subscribeToNodes']>
) => storage.subscribeToNodes(...args);
export const subscribeToEdges = (
  ...args: Parameters<StorageBackend['subscribeToEdges']>
) => storage.subscribeToEdges(...args);

export const resetAll = () => storage.resetAll?.();

export const updateEdge = (
  ...args: Parameters<StorageBackend['updateEdge']>
) => storage.updateEdge(...args);

export const updateGraph = (
  ...args: Parameters<StorageBackend['updateGraph']>
) => storage.updateGraph(...args);

export const getUniversePrefs = (userId: string) =>
  storage.getUniversePrefs(userId);

export const setUniversePrefs = (userId: string, prefs: UniversePrefs) =>
  storage.setUniversePrefs(userId, prefs);

export type { StorageBackend, Unsubscribe } from './types';