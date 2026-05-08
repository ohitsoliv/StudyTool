import type { ClozeBlank } from '../types/drill';

const STOP_WORDS = new Set<string>([
  'this', 'that', 'with', 'from', 'have', 'will', 'they',
  'their', 'there', 'what', 'when', 'where', 'which', 'been', 'were',
  'would', 'could', 'should', 'also', 'then', 'than', 'into', 'onto',
  'about', 'these', 'those', 'your', 'more', 'some', 'such', 'each',
  'most', 'very', 'just', 'like', 'only', 'over', 'after', 'before',
  'other', 'between', 'through',
]);

function cleanForCheck(token: string): string {
  return token.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '').toLowerCase();
}

function isPurelyNumeric(cleaned: string): boolean {
  return cleaned.length > 0 && !/[a-zA-Z]/.test(cleaned);
}

export function selectBlanks(
  text: string,
  _seed: number
): { display: string[]; blanks: ClozeBlank[] } {
  const tokens = text.split(/\s+/).filter((t) => t.length > 0);

  const candidates: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const cleaned = cleanForCheck(tokens[i]);
    if (cleaned.length < 4) continue;
    if (isPurelyNumeric(cleaned)) continue;
    if (STOP_WORDS.has(cleaned)) continue;
    candidates.push(i);
  }

  if (candidates.length === 0) {
    return { display: [...tokens], blanks: [] };
  }

  const M = 1n << 32n;
  const A = 1664525n;
  const C = 1013904223n;

  let seedBig = 0n;
  for (let i = 0; i < text.length; i++) {
    seedBig = (seedBig + BigInt(text.charCodeAt(i)) * BigInt(i + 1)) % M;
  }

  let state = seedBig;
  const nextRand = (): number => {
    state = (A * state + C) % M;
    return Number(state);
  };

  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = nextRand() % (i + 1);
    const tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }

  const count = Math.min(8, Math.max(1, Math.floor(candidates.length * 0.25)));
  const selectedIndices = shuffled.slice(0, count).sort((a, b) => a - b);

  const display = [...tokens];
  const blanks: ClozeBlank[] = [];

  for (const idx of selectedIndices) {
    blanks.push({ index: idx, answer: tokens[idx], userAnswer: '' });
    display[idx] = '';
  }

  return { display, blanks };
}
