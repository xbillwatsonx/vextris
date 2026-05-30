/**
 * Vextris — Vex Alignment Detection (§11) & Cast Eligibility (§14-16)
 */

import type { Board } from './board';
import {
  isInsideVisibleBoard,
  COLS,
  TOTAL_ROWS,
  HIDDEN_ROWS,
  getVisibleOccupiedCount,
} from './board';
import { SeededRNG } from './random';
import type { VexSpellBank, VexConfig, VexType, AlignmentPair, VexWeights } from './vex';
import { grantRandomVex } from './vexSpellBank';
import { DEFAULT_VEX_WEIGHTS } from './vexSpawning';
import { SHADOW_VEX_MIN_CELLS } from '../config/gameConfig';

/** Local default config (mirrors vex.ts barrel) */
const DEFAULT_VEX_CONFIG: VexConfig = {
  vexMarkChance: 0.08,
  vexMarkMaxPerPiece: 1,
  vexAlignmentConsumesMarks: true,
  vexGrantCountPerAlignment: 1,
  vexMaxBankSize: 9,
  vexMaxGrantsPerLock: 2,
};

const ADJACENT_DIRS: [number, number][] = [
  [1, 0], [1, 1], [0, 1], [-1, 1],
  [-1, 0], [-1, -1], [0, -1], [1, -1],
];

export function findVexAlignments(
  board: Board,
  spellBank: VexSpellBank,
  rng: SeededRNG,
  level: number,
  gameTick: number,
  nextSpellId: number,
  config: VexConfig = DEFAULT_VEX_CONFIG,
  weights: VexWeights = DEFAULT_VEX_WEIGHTS,
): { alignments: AlignmentPair[]; nextSpellId: number } {
  const alignments: AlignmentPair[] = [];
  let currentSpellId = nextSpellId;

  if (spellBank.length >= config.vexMaxBankSize) {
    return { alignments: [], nextSpellId: currentSpellId };
  }

  for (let row = HIDDEN_ROWS; row < TOTAL_ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = board[row]![col]!;

      if (alignments.length >= config.vexMaxGrantsPerLock) {
        return { alignments, nextSpellId: currentSpellId };
      }

      if (!cell.hasVexMark || !cell.occupied) continue;

      for (const [dx, dy] of ADJACENT_DIRS) {
        if (alignments.length >= config.vexMaxGrantsPerLock) break;

        const adjRow = row + dy;
        const adjCol = col + dx;
        if (!isInsideVisibleBoard(adjRow, adjCol)) continue;

        const adjCell = board[adjRow]![adjCol]!;
        if (!adjCell.hasVexMark || !adjCell.occupied) continue;

        if (config.vexAlignmentConsumesMarks) {
          board[row]![col]!.hasVexMark = false;
          board[adjRow]![adjCol]!.hasVexMark = false;
        }

        alignments.push({ row1: row, col1: col, row2: adjRow, col2: adjCol });

        const result = grantRandomVex(spellBank, rng, level, gameTick, currentSpellId, weights);
        currentSpellId = result.nextId;

        if (spellBank.length >= config.vexMaxBankSize) {
          return { alignments, nextSpellId: currentSpellId };
        }
        break;
      }
    }
  }

  return { alignments, nextSpellId: currentSpellId };
}

function getTotalOccupiedCountForCast(board: Board): number {
  let count = 0;
  for (let r = 0; r < TOTAL_ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r]![c]!.occupied) count++;
    }
  }
  return count;
}

export function canCastVex(
  type: VexType,
  gameState: {
    board: Board;
    activePiece?: unknown;
    castState?: { active: boolean };
    selectedSpellIndex: number;
    spellBank: ReadonlyArray<{ type: VexType }>;
  },
): boolean {
  if (gameState.selectedSpellIndex < 0) return false;
  const spell = gameState.spellBank[gameState.selectedSpellIndex];
  if (!spell || spell.type !== type) return false;
  if (gameState.castState?.active) return false;

  switch (type) {
    case 'COLOR':
    case 'SHAPE':
      return getTotalOccupiedCountForCast(gameState.board) > 0;
    case 'SHADOW':
      return getVisibleOccupiedCount(gameState.board) >= SHADOW_VEX_MIN_CELLS;
    default:
      return false;
  }
}
