import type { EdgeType } from './graph';

export type DrillKind = 'cloze' | 'path-finder' | 'missing-link' | 'cluster-title' | 'sorter';

export interface ClozeBlank {
  index: number;
  answer: string;
  userAnswer: string;
}

export interface ClozeDrill {
  kind: 'cloze';
  nodeId: string;
  layerDepth: number;
  displayText: string[];
  blanks: ClozeBlank[];
}

export interface PathFinderDrill {
  kind: 'path-finder';
  startNodeId: string;
  endNodeId: string;
  shortestPathLength: number;
  userPath: string[];
  invalidAttempts: number;
  finished: boolean;
}

export interface MissingLinkDrill {
  kind: 'missing-link';
  aId: string;
  bId: string;
  chosenType: EdgeType | null;
  justification: string;
  outcome?: 'passed' | 'gave-up';
}

export interface ClusterTitleDrill {
  kind: 'cluster-title';
  parentId: string;
  childIds: string[];
  userInput: string;
  score?: number;
  gaveUp?: boolean;
}

export interface SorterDrill {
  kind: 'sorter';
  parentIds: string[];
  childIds: string[];
  truth: Record<string, string>;
  userAssignments: Record<string, string | null>;
  originalPositions: Record<string, { x: number; y: number }>;
  score?: number;
  gaveUp?: boolean;
}

export type Drill = ClozeDrill | PathFinderDrill | MissingLinkDrill | ClusterTitleDrill | SorterDrill;

export interface DrillResult {
  drill: Drill;
  score: number;
  masteryDelta: number;
  correct?: number;
  total?: number;
  reachedEnd?: boolean;
  validSteps?: number;
  invalidAttempts?: number;
  shortestPathLength?: number;
}
