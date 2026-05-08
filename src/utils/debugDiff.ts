// src/utils/debugDiff.ts
// Pure utilities for the Debugger drill — no React dependencies.

/**
 * Normalize a string for similarity comparison:
 * collapse all whitespace runs to a single space, trim ends.
 * Preserves case and punctuation (semantics matter for code/math).
 */
export function normalize(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Levenshtein distance between two strings.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  // dp[i][j] = edit distance between a[0..i-1] and b[0..j-1]
  const dp: number[][] = [];
  for (let i = 0; i <= m; i++) {
    dp[i] = new Array<number>(n + 1).fill(0);
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Similarity score in [0, 1] between canonical and user input.
 * Normalizes both strings first, then computes Levenshtein-based ratio.
 * Empty vs empty → 1; one empty → 0.
 */
export function similarity(canonical: string, input: string): number {
  const a = normalize(canonical);
  const b = normalize(input);
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return Math.min(1, Math.max(0, 1 - dist / maxLen));
}
