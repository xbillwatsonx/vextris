/**
 * Vextris — Vex Spawning (§10, §13)
 *
 * Vex mark attachment to spawned pieces and weighted vex type selection.
 */

import { SeededRNG } from './random';
import type { VexConfig, VexWeights, VexType } from './vex';
import type { Block } from './pieces';
import { VEX_MARK_CHANCE, VEX_MARK_MAX_PER_PIECE } from '../config/gameConfig';

// ─── Local defaults (mirror vex.ts barrel; avoids circular import) ─

export const DEFAULT_VEX_CONFIG: VexConfig = {
  vexMarkChance: VEX_MARK_CHANCE,
  vexMarkMaxPerPiece: VEX_MARK_MAX_PER_PIECE,
  vexAlignmentConsumesMarks: true,
  vexGrantCountPerAlignment: 1,
  vexMaxBankSize: 9,
  vexMaxGrantsPerLock: 2,
};

export const DEFAULT_VEX_WEIGHTS: VexWeights = {
  COLOR: 45,
  SHAPE: 40,
  SHADOW: 15,
};

// ─── Vex Mark Spawning (§10) ────────────────────────────────────

/**
 * Attempts to attach a vex mark to a piece being spawned.
 * Returns the block index of the marked cell, or undefined if no mark attached.
 */
export function maybeAttachVexMark(
  pieceBlocks: Block[],
  rng: SeededRNG,
  config: VexConfig = DEFAULT_VEX_CONFIG,
): number | undefined {
  if (rng.nextFloat() >= config.vexMarkChance) {
    return undefined;
  }
  return rng.nextInt(pieceBlocks.length);
}

// ─── Weighted Vex Type Selection (§13) ──────────────────────────

/**
 * Selects a vex type using weighted random selection.
 */
export function selectVexType(
  rng: SeededRNG,
  weights: VexWeights = DEFAULT_VEX_WEIGHTS,
): VexType {
  const total = weights.COLOR + weights.SHAPE + weights.SHADOW;
  let roll = rng.nextFloat() * total;

  if (roll < weights.COLOR) return 'COLOR';
  roll -= weights.COLOR;
  if (roll < weights.SHAPE) return 'SHAPE';
  return 'SHADOW';
}
