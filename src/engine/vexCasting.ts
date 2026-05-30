/**
 * Vextris — Vex Casting (§14-17, §26)
 *
 * Color Vex, Shape Vex, and Shadow Vex cast logic: target selection,
 * destruction, collapse, line-clear resolution, and Shadow Vex inversion.
 */

import type { Board, ShapeId, ColorId } from './board';
import {
  createEmptyBoard,
  cloneBoard,
  HIDDEN_ROWS,
  TOTAL_ROWS,
  COLS,
  findCompletedRows,
  clearRows,
  collapseColumns,
} from './board';
import { SeededRNG } from './random';

// ─── Color Vex (§14) ────────────────────────────────────────────

/**
 * Builds a weighted color map from all locked cells in the total board
 * (visible + hidden rows). Returns a Map from ColorId to weight.
 */
export function buildWeightedColorMap(board: Board): Map<ColorId, number> {
  const map = new Map<ColorId, number>();
  for (let r = 0; r < TOTAL_ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = board[r]![c]!;
      if (cell.occupied && cell.colorId) {
        map.set(cell.colorId, (map.get(cell.colorId) ?? 0) + 1);
      }
    }
  }
  return map;
}

/**
 * Selects a target color using weighted random selection.
 * Returns undefined if no locked cells exist.
 */
export function selectRandomPresentColorWeighted(
  board: Board,
  rng: SeededRNG,
): ColorId | undefined {
  const weights = buildWeightedColorMap(board);
  if (weights.size === 0) return undefined;

  const total = [...weights.values()].reduce((a, b) => a + b, 0);
  let roll = rng.nextFloat() * total;

  for (const [color, weight] of weights) {
    roll -= weight;
    if (roll < 0) return color;
  }

  // Fallback: return the first color
  return weights.keys().next().value;
}

/**
 * Casts Color Vex: destroys all locked cells of the selected color
 * across the total board. Returns count destroyed.
 */
export function castColorVex(board: Board, targetColor: ColorId): number {
  let destroyed = 0;
  for (let r = 0; r < TOTAL_ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = board[r]![c]!;
      if (cell.occupied && cell.colorId === targetColor) {
        board[r]![c] = { occupied: false };
        destroyed++;
      }
    }
  }
  return destroyed;
}

// ─── Shape Vex (§15) ────────────────────────────────────────────

/**
 * Collects the set of unique shapeIds present in locked cells
 * across the total board. Returns empty set if no locked cells.
 */
export function getPresentShapes(board: Board): Set<ShapeId> {
  const shapes = new Set<ShapeId>();
  for (let r = 0; r < TOTAL_ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = board[r]![c]!;
      if (cell.occupied && cell.shapeId) {
        shapes.add(cell.shapeId);
      }
    }
  }
  return shapes;
}

/**
 * Selects a target shape uniformly at random from shapes present
 * on the total board. Returns undefined if no locked cells.
 */
export function selectRandomPresentShape(
  board: Board,
  rng: SeededRNG,
): ShapeId | undefined {
  const shapes = [...getPresentShapes(board)];
  if (shapes.length === 0) return undefined;
  return shapes[rng.nextInt(shapes.length)]!;
}

/**
 * Casts Shape Vex: destroys all locked cells of the selected shape
 * across the total board. Returns count destroyed.
 */
export function castShapeVex(board: Board, targetShape: ShapeId): number {
  let destroyed = 0;
  for (let r = 0; r < TOTAL_ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = board[r]![c]!;
      if (cell.occupied && cell.shapeId === targetShape) {
        board[r]![c] = { occupied: false };
        destroyed++;
      }
    }
  }
  return destroyed;
}

// ─── Shadow Vex (§16) ───────────────────────────────────────────

/**
 * Creates an inverse shadow mask from visible cells only.
 * Returns a new board of shadow blocks: wherever there was empty visible space,
 * place a shadow block. Where there were locked cells, leave empty.
 *
 * Hidden spawn rows are untouched (all cells empty).
 */
export function createInverseShadowBoard(originalBoard: Board): Board {
  const board = createEmptyBoard();

  // Only operate on visible rows
  for (let r = HIDDEN_ROWS; r < TOTAL_ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!originalBoard[r]![c]!.occupied) {
        // Empty visible cell → shadow block
        board[r]![c] = {
          occupied: true,
          colorId: 'shadow',
          shapeId: 'SHADOW',
        };
      }
    }
  }

  return board;
}

/**
 * Applies the full Shadow Vex effect (§16 cast algorithm):
 * 1. Snapshot visible board occupancy
 * 2. Clear all visible locked cells (hidden rows untouched)
 * 3. Create shadow blocks in formerly-empty visible spaces
 * 4. Collapse columns
 *
 * Operates on visible cells only. Hidden spawn rows are preserved.
 */
export function applyShadowVexBoard(board: Board): void {
  // 1. Snapshot visible board BEFORE clearing (spec §16 step 2)
  const snapshot = cloneBoard(board);

  // 2. Clear visible locked cells (spec §16 step 4)
  for (let r = HIDDEN_ROWS; r < TOTAL_ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      board[r]![c] = { occupied: false };
    }
  }

  // 3. Create inverse from snapshot and collapse (spec §16 steps 5-6)
  const inverse = createInverseShadowBoard(snapshot);
  collapseColumns(inverse);

  // 4. Copy collapsed shadow blocks back to original board (visible rows only)
  for (let r = HIDDEN_ROWS; r < TOTAL_ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (inverse[r]![c]!.occupied) {
        board[r]![c] = { ...inverse[r]![c]! };
      }
    }
  }
}

// ─── Cast Resolution Sequence (§17) ─────────────────────────────

/**
 * Resolves post-vex line clears after a cast destroys cells.
 */
export function resolvePostVexLineClears(board: Board): number {
  const completedRows = findCompletedRows(board);
  if (completedRows.length > 0) {
    clearRows(board, completedRows);
    collapseColumns(board);
    return completedRows.length;
  }
  return 0;
}

/**
 * Resolves a Color Vex cast: select target, destroy, collapse, line clear.
 * Returns destruction count or undefined if no target.
 */
export function resolveColorVexCast(
  board: Board,
  rng: SeededRNG,
): { destroyed: number; target: ColorId } | undefined {
  const target = selectRandomPresentColorWeighted(board, rng);
  if (!target) return undefined;

  const destroyed = castColorVex(board, target);
  collapseColumns(board);

  // Resolve post-vex line clears
  resolvePostVexLineClears(board);

  return { destroyed, target };
}

/**
 * Resolves a Shape Vex cast: select target, destroy, collapse, line clear.
 */
export function resolveShapeVexCast(
  board: Board,
  rng: SeededRNG,
): { destroyed: number; target: ShapeId } | undefined {
  const target = selectRandomPresentShape(board, rng);
  if (!target) return undefined;

  const destroyed = castShapeVex(board, target);
  collapseColumns(board);

  // Resolve post-vex line clears
  resolvePostVexLineClears(board);

  return { destroyed, target };
}

/**
 * Resolves a Shadow Vex cast directly on the board.
 */
export function resolveShadowVexCast(board: Board): void {
  applyShadowVexBoard(board);
}
