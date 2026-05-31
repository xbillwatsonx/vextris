/**
 * Vextris — High Scores
 *
 * Persistent top-10 scoreboard backed by localStorage.
 */

export interface ScoreEntry {
  score: number;
  level: number;
  lines: number;
  date: string; // ISO 8601
}

const STORAGE_KEY = 'vextris-high-scores';
const MAX_SCORES = 10;

/** Load scores from localStorage, newest first for ties. */
export function loadScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidEntry).slice(0, MAX_SCORES);
  } catch {
    return [];
  }
}

/** Add a score, return the updated (trimmed) list. */
export function saveScore(entry: ScoreEntry): ScoreEntry[] {
  const scores = loadScores();
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score || b.date.localeCompare(a.date));
  const trimmed = scores.slice(0, MAX_SCORES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch { /* quota exceeded — silently drop */ }
  return trimmed;
}

/** Returns true if this score would make the top 10. */
export function isHighScore(score: number): boolean {
  const scores = loadScores();
  if (scores.length < MAX_SCORES) return true;
  return score > (scores[MAX_SCORES - 1]?.score ?? 0);
}

/** Wipe all scores. */
export function clearScores(): void {
  localStorage.removeItem(STORAGE_KEY);
}

function isValidEntry(e: unknown): e is ScoreEntry {
  if (!e || typeof e !== 'object') return false;
  const s = e as Record<string, unknown>;
  return typeof s.score === 'number'
    && typeof s.level === 'number'
    && typeof s.lines === 'number'
    && typeof s.date === 'string';
}
