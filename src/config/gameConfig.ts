/**
 * Vextris — Game Configuration
 *
 * Board size, gravity table, scoring, lock delay, DAS/ARR defaults.
 * All values data-driven and configurable (spec §19, §18, §6).
 */

// ─── Board Dimensions (§7) ─────────────────────────────────────

export const COLS = 10;
export const TOTAL_ROWS = 22;
export const HIDDEN_ROWS = 2;
export const VISIBLE_ROWS = 20;
export const VISIBLE_CELL_COUNT = 200;

// ─── Gravity Table (§19) ───────────────────────────────────────

/**
 * Gravity interval in ms per row for levels 1-9.
 * Level 10+ reduces by 20ms per level, floor at 80ms.
 */
const GRAVITY_TABLE: Record<number, number> = {
  1: 1000,
  2: 900,
  3: 800,
  4: 700,
  5: 600,
  6: 500,
  7: 420,
  8: 350,
  9: 280,
};

/**
 * Returns the gravity interval (ms per row) for a given level.
 * Level starts at 1. Level 10+ reduces by 20ms per level, floor at 80ms.
 */
export function getGravityInterval(level: number): number {
  if (level <= 9) {
    return GRAVITY_TABLE[level] ?? 1000;
  }
  const ms = 280 - (level - 9) * 20;
  return Math.max(ms, 80);
}

// ─── Lock Delay (§19) ──────────────────────────────────────────

export const LOCK_DELAY_MS = 500;
export const LOCK_RESET_LIMIT = 15;

// ─── Leveling (§19) ────────────────────────────────────────────

export const LINES_PER_LEVEL = 10;
export const STARTING_LEVEL = 1;

/** Calculate level from total lines cleared */
export function getLevel(totalLinesCleared: number): number {
  return STARTING_LEVEL + Math.floor(totalLinesCleared / LINES_PER_LEVEL);
}

// ─── Scoring (§18) ─────────────────────────────────────────────

export const SCORE_SINGLE = 100;
export const SCORE_DOUBLE = 300;
export const SCORE_TRIPLE = 500;
export const SCORE_QUAD = 800;
export const SCORE_SOFT_DROP = 1;
export const SCORE_HARD_DROP = 2;
export const SCORE_VEX_ALIGNMENT = 150;
export const SCORE_VEX_CELL_DESTROYED = 5;
export const SCORE_SHADOW_VEX = 250;
export const SCORE_COMBO_BONUS = 50;

export const LINE_CLEAR_SCORES: Record<number, number> = {
  1: SCORE_SINGLE,
  2: SCORE_DOUBLE,
  3: SCORE_TRIPLE,
  4: SCORE_QUAD,
};

/** Calculate line clear score: (line clear score + combo bonus) × level */
export function getLineClearScore(linesCleared: number, comboCount: number, level: number): number {
  const lineScore = LINE_CLEAR_SCORES[linesCleared] ?? 0;
  return (lineScore + SCORE_COMBO_BONUS * comboCount) * level;
}

/** Calculate hard/soft drop score: cells × points per cell */
export function getDropScore(cellsDropped: number, hardDrop: boolean): number {
  return cellsDropped * (hardDrop ? SCORE_HARD_DROP : SCORE_SOFT_DROP);
}

// ─── Input Timing (§6) ─────────────────────────────────────────

export const DAS_MS = 167;
export const ARR_MS = 33;
export const SOFT_DROP_INTERVAL_MS = 50;
export const INPUT_BUFFER_WINDOW_MS = 150;

// ─── 7-Bag (§8) ────────────────────────────────────────────────

/** Number of next pieces to preview */
export const NEXT_QUEUE_SIZE = 3;

// ─── Vex Tuning (§10) ──────────────────────────────────────────

export const VEX_MARK_CHANCE = 0.08;
export const VEX_MARK_MAX_PER_PIECE = 1;
export const VEX_ALIGNMENT_CONSUMES_MARKS = true;
export const VEX_GRANT_COUNT_PER_ALIGNMENT = 1;
export const VEX_MAX_BANK_SIZE = 9;
export const VEX_MAX_GRANTS_PER_LOCK = 2;

// ─── Shadow Vex (§16) ──────────────────────────────────────────

export const SHADOW_VEX_FILL_THRESHOLD = 0.4; // 40% of visible board
export const SHADOW_VEX_MIN_CELLS = 80; // 40% × 200
export const SHADOW_VEX_DARKEN_MS = 300;

// ─── Cast Guardrails (§17) ────────────────────────────────────

export const CAST_POST_LOCK_DELAY_MS = 500;
export const CAST_UPWARD_SHIFT_MAX = 2;
export const CAST_BUFFER_WINDOW_MS = 250;
