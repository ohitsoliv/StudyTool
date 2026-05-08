function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[.,!?;:'"`\(\)\[\]\{\}\/\\\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[a.length][b.length];
}

export function matchScore(input: string, expected: string): number {
  const normalizedInput = normalize(input);
  const normalizedExpected = normalize(expected);

  if (!normalizedInput || !normalizedExpected) return 0;
  if (normalizedInput === normalizedExpected) return 1.0;
  if (levenshtein(normalizedInput, normalizedExpected) <= 2) return 0.9;
  if (
    normalizedInput.includes(normalizedExpected) ||
    normalizedExpected.includes(normalizedInput)
  ) {
    return 0.7;
  }

  const inputWords = new Set(normalizedInput.split(' ').filter(Boolean));
  const expectedWords = new Set(normalizedExpected.split(' ').filter(Boolean));
  const union = new Set([...inputWords, ...expectedWords]);
  let intersection = 0;
  for (const word of inputWords) {
    if (expectedWords.has(word)) intersection++;
  }

  return union.size > 0 && intersection / union.size >= 0.5 ? 0.5 : 0.0;
}