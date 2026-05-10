import type { Drill } from './drill';

export type SessionMode = 'open' | 'class-study' | 'exam-prep';

export type SessionLens = 'memorizer' | 'architect' | 'practitioner';

export interface SessionConfigOpen {
  mode: 'open';
  durationMinutes: number;
}

export interface SessionConfigClassStudy {
  mode: 'class-study';
  tag: string;
  durationMinutes: number | null;
}

export interface SessionConfigExamPrep {
  mode: 'exam-prep';
  drillCount: number;
  durationMinutes: number | null;
}

export type SessionConfig =
  | SessionConfigOpen
  | SessionConfigClassStudy
  | SessionConfigExamPrep;

export interface SessionState {
  config: SessionConfig;
  startedAt: number;
  deadlineAt: number | null;
  drillsCompleted: number;
  drillsTarget: number | null;
  poolNodeIds: Set<string> | null;
  lastLens: SessionLens | null;
  boundReached: boolean;
}

export const DRILL_TO_LENS: Record<Drill['kind'], SessionLens> = {
  'cloze': 'memorizer',
  'path-finder': 'memorizer',
  'missing-link': 'architect',
  'cluster-title': 'architect',
  'sorter': 'architect',
  'scenario-builder': 'practitioner',
  'debugger': 'practitioner',
  'bridge': 'architect',
  'example': 'practitioner',
  'stub-fill': 'memorizer',
};
