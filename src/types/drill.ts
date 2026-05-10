import type { EdgeType } from './graph';

export type DrillKind = 'cloze' | 'path-finder' | 'missing-link' | 'cluster-title' | 'sorter' | 'scenario-builder' | 'debugger' | 'bridge' | 'example' | 'stub-fill';

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
  shortestPathLength: number; // edge count of shortest path; for scoring
  userPath: string[];          // ids of visited nodes in order; excludes start; ends with endNodeId on success
  invalidAttempts: number;     // count of clicks that did not produce a valid edge traversal
  finished: boolean;           // true once user reaches endNodeId
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

export interface ScenarioBuilderDrill {
  kind: 'scenario-builder';
  problemStatement: string;
  pipeline: string[];
  builderPhase: 'authoring' | 'building';
}

export interface DebuggerDrill {
  kind: 'debugger';
  nodeId: string;
  layerDepth: number;
  contentType: 'code' | 'math';
  language?: string;
  canonical: string;
  brokenVersion: string;
  input: string;
}

export interface BridgeDrill {
  kind: 'bridge';
  aId: string | null;
  bId: string | null;
  chosenType: EdgeType | null;
  label: string;
  outcome?: 'created' | 'cancelled';
}

export interface ExampleDrill {
  kind: 'example';
  sourceNodeId: string;
  userInput: string;
  createdNodeId?: string;
  outcome?: 'created' | 'cancelled';
}

export interface StubFillDrill {
  kind: 'stub-fill';
  nodeId: string;
  userInput: string;
  outcome?: 'filled' | 'cancelled';
}

export type Drill =
  | ClozeDrill
  | PathFinderDrill
  | MissingLinkDrill
  | ClusterTitleDrill
  | SorterDrill
  | ScenarioBuilderDrill
  | DebuggerDrill
  | BridgeDrill
  | ExampleDrill
  | StubFillDrill;

export interface DrillResult {
  drill: Drill;
  score: number;        // [0, 1]
  masteryDelta: number;
  // Cloze-only fields:
  correct?: number;
  total?: number;
  // Path-finder-only fields:
  reachedEnd?: boolean;
  validSteps?: number;
  invalidAttempts?: number;
  shortestPathLength?: number;
  // Scenario-builder fields:
  verdict?: 'correct' | 'partial' | 'wrong';
  problemStatement?: string;
  pipeline?: string[];
  nodesAffected?: string[];
  // Debugger fields:
  similarity?: number;  // 0–1
  nodeId?: string;
  layerDepth?: number;
}