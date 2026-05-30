/**
 * Vextris — Vex System (§10-17, §26)
 *
 * Public API barrel. Types and config live here; implementations are
 * delegated to focused modules:
 *   vexSpawning.ts   — mark attachment, type selection
 *   vexSpellBank.ts  — spell granting, cycling, removal
 *   vexAlignment.ts  — alignment detection, cast eligibility
 *   vexCasting.ts    — Color, Shape, Shadow vex casting
 */

import type { Board, Cell, ShapeId, ColorId } from './board';
import {
  createEmptyBoard,
  cloneBoard,
  setCell,
  getCell,
  isInsideVisibleBoard,
  isInsideTotalBoard,
  COLS,
  TOTAL_ROWS,
  HIDDEN_ROWS,
  VISIBLE_CELL_COUNT,
  findCompletedRows,
  clearRows,
  collapseColumns,
  getVisibleOccupiedCount,
} from './board';
import { SeededRNG } from './random';
import {
  VEX_MARK_CHANCE,
  VEX_MARK_MAX_PER_PIECE,
  VEX_ALIGNMENT_CONSUMES_MARKS,
  VEX_GRANT_COUNT_PER_ALIGNMENT,
  VEX_MAX_BANK_SIZE,
  VEX_MAX_GRANTS_PER_LOCK,
  SHADOW_VEX_FILL_THRESHOLD,
  SHADOW_VEX_MIN_CELLS,
} from '../config/gameConfig';
import { collides } from './pieces';
import type { Block, Origin } from './pieces';

// ─── Types ──────────────────────────────────────────────────────

export type VexType = 'COLOR' | 'SHAPE' | 'SHADOW';

export interface VexSpell {
  id: string;
  type: VexType;
  grantedAtLevel: number;
  grantedAtTick: number;
}

export type VexSpellBank = VexSpell[];

export interface AlignmentPair {
  row1: number;
  col1: number;
  row2: number;
  col2: number;
}

/** Feedback from a cast attempt */
export type CastResult =
  | { ok: true; type: VexType; destroyed?: number }
  | { ok: false; reason: 'empty_bank' | 'ineligible' | 'casting' | 'no_target' };

/** Vex configuration (subset of game config used by vex system) */
export interface VexConfig {
  vexMarkChance: number;
  vexMarkMaxPerPiece: number;
  vexAlignmentConsumesMarks: boolean;
  vexGrantCountPerAlignment: number;
  vexMaxBankSize: number;
  vexMaxGrantsPerLock: number;
}

export const DEFAULT_VEX_CONFIG: VexConfig = {
  vexMarkChance: VEX_MARK_CHANCE,
  vexMarkMaxPerPiece: VEX_MARK_MAX_PER_PIECE,
  vexAlignmentConsumesMarks: VEX_ALIGNMENT_CONSUMES_MARKS,
  vexGrantCountPerAlignment: VEX_GRANT_COUNT_PER_ALIGNMENT,
  vexMaxBankSize: VEX_MAX_BANK_SIZE,
  vexMaxGrantsPerLock: VEX_MAX_GRANTS_PER_LOCK,
};

/** Vex type weights (§13) */
export interface VexWeights {
  COLOR: number;
  SHAPE: number;
  SHADOW: number;
}

export const DEFAULT_VEX_WEIGHTS: VexWeights = {
  COLOR: 45,
  SHAPE: 40,
  SHADOW: 15,
};

// ─── Re-exports from focused modules ────────────────────────────

// Spawning (§10, §13)
export { maybeAttachVexMark, selectVexType } from './vexSpawning';

// Spell bank (§12)
export { grantRandomVex, cycleSpellIndex, removeSpellAtIndex } from './vexSpellBank';

// Alignment detection (§11) & cast eligibility (§14-16)
export { findVexAlignments, canCastVex } from './vexAlignment';

// Casting (§14-17, §26)
export {
  buildWeightedColorMap,
  selectRandomPresentColorWeighted,
  castColorVex,
  getPresentShapes,
  selectRandomPresentShape,
  castShapeVex,
  createInverseShadowBoard,
  applyShadowVexBoard,
  resolveColorVexCast,
  resolveShapeVexCast,
  resolveShadowVexCast,
  resolvePostVexLineClears,
} from './vexCasting';

/**
 * Counts total occupied cells across the entire board (visible + hidden).
 * Used by gameLoop for pre/post-cast stat tracking.
 */
export function countTotalOccupied(board: Board): number {
  let count = 0;
  for (let r = 0; r < TOTAL_ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r]![c]!.occupied) count++;
    }
  }
  return count;
}
