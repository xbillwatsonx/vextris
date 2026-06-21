/**
 * Vextris — Seed Reproducibility Integration Test (§27, §29)
 *
 * Verifies that the same seed produces identical game sequences:
 * piece draws, vex marks, vex grants, Color/Shape target selection.
 */

import { describe, it, expect } from 'vitest';
import { createGameState, startGame } from '../engine/gameLoop';
import { SeededRNG } from '../engine/random';
import {
  maybeAttachVexMark,
  selectVexType,
  selectRandomPresentColorWeighted,
  selectRandomPresentShape,
  buildWeightedColorMap,
  getPresentShapes,
} from '../engine/vex';
import {
  createEmptyBoard,
  setCell,
  HIDDEN_ROWS,
} from '../engine/board';
import type { VexSpellBank } from '../engine/vex';

// ─── Helpers ────────────────────────────────────────────────────

function occupiedCell(color: string, shape: string, vexMark = false) {
  return { occupied: true, colorId: color, shapeId: shape, hasVexMark: vexMark } as any;
}

// ─── RNG Seed: Same seed = same everything ──────────────────────

describe('RNG seed reproducibility', () => {
  const SEED = 'VEXTRIS-REPRO-TEST';

  it('same seed produces identical bag draws', () => {
    const state1 = createGameState(SEED);
    startGame(state1);
    const queue1 = [...state1.nextQueue];

    const state2 = createGameState(SEED);
    startGame(state2);
    const queue2 = [...state2.nextQueue];

    expect(queue1).toEqual(queue2);
  });

  it('same seed produces identical vex mark spawns', () => {
    const rng1 = new SeededRNG(SEED);
    const rng2 = new SeededRNG(SEED);

    const blocks = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }];

    for (let i = 0; i < 50; i++) {
      const m1 = maybeAttachVexMark(blocks, rng1);
      const m2 = maybeAttachVexMark(blocks, rng2);
      expect(m1).toBe(m2); // same mark result
    }
  });

  it('same seed produces identical vex type selections', () => {
    const rng1 = new SeededRNG(SEED);
    const rng2 = new SeededRNG(SEED);

    for (let i = 0; i < 50; i++) {
      expect(selectVexType(rng1)).toBe(selectVexType(rng2));
    }
  });

  it('same seed produces identical Color Vex weighted targets', () => {
    const board = createEmptyBoard();
    setCell(board, HIDDEN_ROWS + 3, 0, occupiedCell('red', 'Z'));
    setCell(board, HIDDEN_ROWS + 3, 1, occupiedCell('red', 'Z'));
    setCell(board, HIDDEN_ROWS + 3, 2, occupiedCell('red', 'Z'));
    setCell(board, HIDDEN_ROWS + 3, 3, occupiedCell('green', 'S'));

    const rng1 = new SeededRNG(SEED);
    const rng2 = new SeededRNG(SEED);

    // Board is immutable for this test — same state, same RNG = same result
    const board1 = createEmptyBoard();
    setCell(board1, HIDDEN_ROWS + 3, 0, occupiedCell('red', 'Z'));
    setCell(board1, HIDDEN_ROWS + 3, 1, occupiedCell('red', 'Z'));
    setCell(board1, HIDDEN_ROWS + 3, 2, occupiedCell('red', 'Z'));
    setCell(board1, HIDDEN_ROWS + 3, 3, occupiedCell('green', 'S'));

    const board2 = createEmptyBoard();
    setCell(board2, HIDDEN_ROWS + 3, 0, occupiedCell('red', 'Z'));
    setCell(board2, HIDDEN_ROWS + 3, 1, occupiedCell('red', 'Z'));
    setCell(board2, HIDDEN_ROWS + 3, 2, occupiedCell('red', 'Z'));
    setCell(board2, HIDDEN_ROWS + 3, 3, occupiedCell('green', 'S'));

    const target1 = selectRandomPresentColorWeighted(board1, rng1);
    const target2 = selectRandomPresentColorWeighted(board2, rng2);
    expect(target1).toBe(target2);
  });

  it('same seed produces identical Shape Vex targets', () => {
    const board1 = createEmptyBoard();
    setCell(board1, HIDDEN_ROWS + 3, 0, occupiedCell('red', 'Z'));
    setCell(board1, HIDDEN_ROWS + 3, 1, occupiedCell('blue', 'J'));
    setCell(board1, HIDDEN_ROWS + 3, 2, occupiedCell('green', 'S'));

    const board2 = createEmptyBoard();
    setCell(board2, HIDDEN_ROWS + 3, 0, occupiedCell('red', 'Z'));
    setCell(board2, HIDDEN_ROWS + 3, 1, occupiedCell('blue', 'J'));
    setCell(board2, HIDDEN_ROWS + 3, 2, occupiedCell('green', 'S'));

    const rng1 = new SeededRNG(SEED);
    const rng2 = new SeededRNG(SEED);

    expect(selectRandomPresentShape(board1, rng1)).toBe(selectRandomPresentShape(board2, rng2));
  });

  it('different seeds produce different sequences', () => {
    const rng1 = new SeededRNG('seed-A');
    const rng2 = new SeededRNG('seed-B');

    const diffs: boolean[] = [];
    for (let i = 0; i < 20; i++) {
      diffs.push(rng1.next() !== rng2.next());
    }
    // At least some should differ (overwhelming probability)
    expect(diffs.some(d => d)).toBe(true);
  });

  it('full game state RNG state is captured and restorable', () => {
    const state = createGameState(SEED);
    expect(state.rngState).toBeGreaterThan(0);
    expect(state.rngSeed).toBe(SEED);

    // After starting game, RNG state advances
    const rngBefore = state.rngState;
    startGame(state);
    expect(state.rngState).not.toBe(rngBefore);
  });

  it('FNV-1a produces same hash for same seed string', () => {
    // Verify the hash is deterministic (same as SeededRNG constructor)
    const rng1 = new SeededRNG('deterministic');
    const rng2 = new SeededRNG('deterministic');
    expect(rng1.state).toBe(rng2.state);
    expect(rng1.next()).toBe(rng2.next());
  });
});

// ─── Board State Determinism ────────────────────────────────────

describe('board state determinism', () => {
  it('same seed produces same initial board', () => {
    const s1 = createGameState('board-repro');
    const s2 = createGameState('board-repro');

    for (let r = 0; r < 22; r++) {
      for (let c = 0; c < 10; c++) {
        expect(s1.board[r]![c]!.occupied).toBe(s2.board[r]![c]!.occupied);
      }
    }
  });

  it('same seed produces same first active piece', () => {
    const s1 = createGameState('piece-repro');
    startGame(s1);

    const s2 = createGameState('piece-repro');
    startGame(s2);

    expect(s1.activePiece!.shapeId).toBe(s2.activePiece!.shapeId);
    expect(s1.activePiece!.colorId).toBe(s2.activePiece!.colorId);
    expect(s1.activePiece!.rotationState).toBe(s2.activePiece!.rotationState);
    expect(s1.activePiece!.origin).toEqual(s2.activePiece!.origin);
    expect(s1.activePiece!.vexMarkBlockIndex).toBe(s2.activePiece!.vexMarkBlockIndex);
  });
});
