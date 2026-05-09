// src/types/universe.ts
import type { Timestamp } from 'firebase/firestore';
import type { EdgeType } from './graph';

export interface UniverseEdge {
  id: string;
  source: string;       // graphId
  target: string;       // graphId
  type: EdgeType;
  label?: string;
  createdAt: Timestamp;
}

export interface UniversePrefs {
  edges: UniverseEdge[];
}

export interface AggregateMastery {
  mean: number;          // [0, 1]; 0 when nodeCount is 0
  nodeCount: number;     // non-archived nodes only
  reviewedCount: number; // non-archived AND mastery.reviewCount > 0
}
