// src/types/graph.ts
import { Timestamp } from 'firebase/firestore';

export type ContentType = 'text' | 'code' | 'math';
export type EdgeType = 'parent-child' | 'related' | 'prerequisite' | 'sequence';

export interface Layer {
  depth: number;
  content: string;
  contentType: ContentType;
  language?: string;
  createdAt: Timestamp;
}

export interface Mastery {
  score: number;
  lastReviewedAt: Timestamp | null;
  reviewCount: number;
}

export interface NodeDoc {
  id: string;
  title: string;
  position: { x: number; y: number };
  layers: Layer[];
  tags: string[];
  mastery: Mastery;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  archived: boolean;
  clusterId: string | null;
}

export interface EdgeDoc {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  label?: string;
  createdAt: Timestamp;
}

export interface ClusterDoc {
  id: string;
  title: string;
  nodeIds: string[];
  collapsed: boolean;
  createdAt: Timestamp;
}

export interface GraphMetadata {
  id: string;
  name: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}