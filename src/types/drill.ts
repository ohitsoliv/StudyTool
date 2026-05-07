export type DrillKind = 'cloze';

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

export interface DrillResult {
  drill: ClozeDrill;
  score: number;
  masteryDelta: number;
  correct: number;
  total: number;
}
