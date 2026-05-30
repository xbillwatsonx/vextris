/**
 * Vextris — Shared Test Utilities
 *
 * Common helpers for board setup, piece creation, and state management
 * used across multiple test files. Import from this module instead of
 * duplicating helpers.
 */

import { createGameState, startGame, createActivePiece } from '../engine/gameLoop';
import type { GameState } from '../engine/types';
import type { Board, ShapeId, Cell, ColorId } from '../engine/board';
import {
  setCell,
  HIDDEN_ROWS,
  TOTAL_ROWS,
  COLS,
  logicalToArrayRow,
} from '../engine/board';
import type { Origin } from '../engine/pieces';

// ─── Cell Helpers ───────────────────────────────────────────────

/** Create a simple occupied cell (default: red Z). */
export function occupiedCell(
  colorId: ColorId = 'red',
  shapeId: ShapeId = 'Z',
  vexMark = false,
): Cell {
  return { occupied: true, colorId, shapeId, hasVexMark: vexMark };
}

// ─── Board Helpers ──────────────────────────────────────────────

/** Fill all cells in a logical row (0-19 visible, negative = hidden). */
export function fillLogicalRow(
  board: Board,
  logicalY: number,
  colorId: ColorId = 'red',
  shapeId: ShapeId = 'Z',
): void {
  const row = logicalToArrayRow(logicalY);
  if (row < 0 || row >= TOTAL_ROWS) return;
  for (let c = 0; c < COLS; c++) {
    setCell(board, row, c, occupiedCell(colorId, shapeId));
  }
}

/** Fill all cells in a visible row (0-19) on the given game state's board. */
export function fillRow(state: GameState, visibleRow: number): void {
  const board = state.board;
  const arrayRow = visibleRow + HIDDEN_ROWS;
  for (let c = 0; c < COLS; c++) {
    setCell(board, arrayRow, c, occupiedCell());
  }
}

/** Count occupied cells in a board. */
export function countOccupied(board: Board): number {
  let count = 0;
  for (let r = 0; r < TOTAL_ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r]![c]!.occupied) count++;
    }
  }
  return count;
}

/** Place an occupied cell at a logical (x, y) position. */
export function lockCell(
  board: Board,
  x: number,
  logicalY: number,
  colorId: ColorId = 'red',
  shapeId: ShapeId = 'Z',
): void {
  const row = logicalToArrayRow(logicalY);
  if (row >= 0 && row < TOTAL_ROWS && x >= 0 && x < COLS) {
    setCell(board, row, x, occupiedCell(colorId, shapeId));
  }
}

// ─── State Helpers ──────────────────────────────────────────────

/** Create a clean PLAYING state with the first piece spawned. */
export function makeCleanState(seed = 'test-seed'): GameState {
  const state = createGameState(seed);
  startGame(state);
  return state;
}

/** Create a PLAYING state with a controlled active piece at an optional origin. */
export function stateWithPiece(
  shapeId: ShapeId,
  origin?: { x: number; y: number },
): GameState {
  const state = createGameState('int-test');
  state.status = 'PLAYING';
  state.activePiece = createActivePiece(shapeId);
  if (origin) state.activePiece.origin = { ...origin };
  return state;
}

// ─── State Access Helpers ───────────────────────────────────────

export function activeX(state: GameState): number {
  return state.activePiece!.origin.x;
}

export function activeY(state: GameState): number {
  return state.activePiece!.origin.y;
}
