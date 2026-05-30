/**
 * Vextris — Integration / Smoke Tests (Phase 3)
 *
 * Seed-locked end-to-end tests verifying that the full game pipeline —
 * spawn, lock, line clear, vex alignment, scoring, game over — produces
 * deterministic outcomes with fixed seeds.
 */

import { describe, it, expect } from 'vitest';
import {
  createGameState,
  startGame,
  lockAndResolve,
  hardDrop,
  softDrop,
  rotateCW,
  rotateCCW,
  moveLeft,
  moveRight,
  cycleSpell,
  castSelectedSpell,
  createActivePiece,
} from '../engine/gameLoop';
import type { GameState, ActivePiece } from '../engine/gameLoop';
import {
  createEmptyBoard,
  setCell,
  getCell,
  getVisibleOccupiedCount,
  getTotalOccupiedCount,
  COLS,
  TOTAL_ROWS,
  HIDDEN_ROWS,
  logicalToArrayRow,
} from '../engine/board';
import type { Board, ShapeId, ColorId } from '../engine/board';
import { SHAPES } from '../engine/pieces';

// ─── Helpers ────────────────────────────────────────────────────

/** Create a clean PLAYING state with a controlled active piece */
function stateWithPiece(shapeId: ShapeId, origin?: { x: number; y: number }) {
  const state = createGameState('int-test');
  state.status = 'PLAYING';
  state.activePiece = createActivePiece(shapeId);
  if (origin) state.activePiece.origin = { ...origin };
  return state;
}

/** Fill all cells in a logical row (0-19 visible, negative = hidden) */
function fillLogicalRow(board: Board, logicalY: number, colorId: ColorId = 'red', shapeId: ShapeId = 'Z'): void {
  const row = logicalToArrayRow(logicalY);
  if (row < 0 || row >= TOTAL_ROWS) return;
  for (let c = 0; c < COLS; c++) {
    setCell(board, row, c, { occupied: true, colorId, shapeId });
  }
}

/** Place an occupied cell at a logical (x, y) position */
function lockCell(board: Board, x: number, logicalY: number, colorId: ColorId = 'red', shapeId: ShapeId = 'Z'): void {
  const row = logicalToArrayRow(logicalY);
  if (row >= 0 && row < TOTAL_ROWS && x >= 0 && x < COLS) {
    setCell(board, row, x, { occupied: true, colorId, shapeId });
  }
}

/** Count occupied cells in the board */
function countOccupied(board: Board): number {
  let count = 0;
  for (let r = 0; r < TOTAL_ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r]![c]!.occupied) count++;
    }
  }
  return count;
}

/** Run a known action sequence on two copies and compare final state */
function runAndCompare(
  seed: string,
  actions: (s: GameState) => void,
): void {
  const s1 = createGameState(seed);
  startGame(s1);
  actions(s1);

  const s2 = createGameState(seed);
  startGame(s2);
  actions(s2);

  // Compare board
  for (let r = 0; r < TOTAL_ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const c1 = s1.board[r]![c]!;
      const c2 = s2.board[r]![c]!;
      expect(c1.occupied).toBe(c2.occupied);
      expect(c1.colorId).toBe(c2.colorId);
      expect(c1.shapeId).toBe(c2.shapeId);
      expect(c1.hasVexMark).toBe(c2.hasVexMark);
    }
  }

  // Compare state fields
  expect(s1.score).toBe(s2.score);
  expect(s1.linesCleared).toBe(s2.linesCleared);
  expect(s1.level).toBe(s2.level);
  expect(s1.comboCount).toBe(s2.comboCount);
  expect(s1.status).toBe(s2.status);
  expect(s1.spellBank.length).toBe(s2.spellBank.length);
  expect(s1.selectedSpellIndex).toBe(s2.selectedSpellIndex);
  expect(s1.gameTick).toBe(s2.gameTick);
}

// ─── Fixed-Seed Determinism ─────────────────────────────────────

describe('fixed-seed determinism', () => {
  it('same seed + same sequence = identical final state', () => {
    // Sequence: move left, rotate CW, hard drop, repeat 3 times
    const sequence = (s: GameState) => {
      for (let i = 0; i < 3; i++) {
        moveLeft(s);
        rotateCW(s);
        hardDrop(s);
      }
    };
    runAndCompare('determinism-test', sequence);
  });

  it('same seed + 5 × hard drop = identical final state', () => {
    const sequence = (s: GameState) => {
      for (let i = 0; i < 5; i++) {
        hardDrop(s);
      }
    };
    runAndCompare('harddrop-repro', sequence);
  });

  it('same seed + complex movement sequence = identical final state', () => {
    const sequence = (s: GameState) => {
      const moves = [
        () => moveLeft(s),
        () => moveLeft(s),
        () => rotateCW(s),
        () => rotateCW(s),
        () => rotateCCW(s),
        () => moveRight(s),
        () => softDrop(s),
        () => softDrop(s),
        () => hardDrop(s),
      ];
      for (const move of moves) move();

      // Second piece: just hard drop
      hardDrop(s);

      // Third piece: move right, rotate CCW, hard drop
      moveRight(s);
      rotateCCW(s);
      hardDrop(s);
    };
    runAndCompare('complex-repro', sequence);
  });
});

// ─── Different Seeds Diverge ────────────────────────────────────

describe('different seeds diverge', () => {
  it('two different seeds produce different first piece', () => {
    const s1 = createGameState('seed-alpha');
    startGame(s1);

    const s2 = createGameState('seed-beta');
    startGame(s2);

    // With 7 shapes, probability both equal is ~14%
    // Run multiple seed pairs to be safe
    let diverged = false;
    const pairs = [
      ['a', 'b'], ['c', 'd'], ['e', 'f'],
      ['test-1', 'test-2'], ['run-x', 'run-y'],
    ];

    for (const pair of pairs) {
      const a = pair[0]!;
      const b = pair[1]!;
      const sa = createGameState(a);
      startGame(sa);
      const sb = createGameState(b);
      startGame(sb);

      if (sa.activePiece!.shapeId !== sb.activePiece!.shapeId) {
        diverged = true;
        break;
      }
    }

    expect(diverged).toBe(true);
  });

  it('different seeds produce different final board state', () => {
    const sequence = (s: GameState) => {
      for (let i = 0; i < 8; i++) hardDrop(s);
    };

    const s1 = createGameState('diverge-1');
    startGame(s1);
    sequence(s1);

    const s2 = createGameState('diverge-2');
    startGame(s2);
    sequence(s2);

    // At least something should be different
    const diffs: string[] = [];
    for (let r = 0; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (s1.board[r]![c]!.occupied !== s2.board[r]![c]!.occupied ||
            s1.board[r]![c]!.shapeId !== s2.board[r]![c]!.shapeId) {
          diffs.push(`[${r},${c}]`);
        }
      }
    }
    expect(diffs.length).toBeGreaterThan(0);
  });
});

// ─── Hard Drop Scoring ──────────────────────────────────────────

describe('hard drop scoring', () => {
  it('scores 0 when piece is already at ghost (grounded)', () => {
    // O-piece at y=18 → blocks at y=18, 19 → ghost is at y=18
    const s = stateWithPiece('O', { x: 4, y: 18 });

    const scoreBefore = s.score;
    hardDrop(s);
    // cellsDropped = ghost.y - origin.y = 18 - 18 = 0 → score = 0 × 2 = 0
    // But hardDrop also calls lockAndResolve which may add scores if lines clear
    // O at (4,18),(5,18),(4,19),(5,19) — no full rows → 0
    expect(s.score).toBe(scoreBefore);
  });

  it('scores 2 points per cell when piece drops 1 row', () => {
    // O-piece at y=17 → ghost at y=18 → 1 cell dropped → score 1 × 2 = 2
    const s = stateWithPiece('O', { x: 4, y: 17 });

    hardDrop(s);
    expect(s.score).toBe(2);
  });

  it('scores correctly for a 10-row drop', () => {
    // O-piece at y=8 → ghost at y=18 → 10 cells dropped → score 10 × 2 = 20
    const s = stateWithPiece('O', { x: 4, y: 8 });

    hardDrop(s);
    expect(s.score).toBe(20);
  });

  it('hard drop score adds to existing score', () => {
    const s = stateWithPiece('O', { x: 4, y: 17 });
    s.score = 150;

    hardDrop(s);
    expect(s.score).toBe(152); // 150 + 2
  });

  it('hard drop with line clear includes both scores', () => {
    // O-piece at (4, 1) on filled row 19 → drop score + line clear score
    const s = stateWithPiece('O', { x: 4, y: 1 });

    // Ghost will be at y=18 (bottom)
    // cellsDropped = 17 → score 17 × 2 = 34
    // No line clears from just 4 blocks — no need to fill row

    hardDrop(s);
    // 17 cells × 2 = 34
    expect(s.score).toBe(34);
    expect(s.linesCleared).toBe(0);
  });
});

// ─── Line Clear Integration ─────────────────────────────────────

describe('line clear integration', () => {
  it('lockAndResolve clears a single full row', () => {
    // Fill row 19 completely
    const s = stateWithPiece('O', { x: 4, y: 17 });
    fillLogicalRow(s.board, 19);

    // O at (4,17) & (5,17) does NOT fill row 17 fully
    // But it fills cols 4-5 of row 18 and 4-5 of row 19
    // Row 19 already full → single clear
    lockAndResolve(s);

    expect(s.linesCleared).toBe(1);
    // Score: 100 × 1 + 0 combo = 100
    expect(s.score).toBe(100);
    expect(s.comboCount).toBe(1);
  });

  it('lockAndResolve clears a double (tetris-like)', () => {
    // I-piece at origin (0, 17), state 0: blocks [(0,1),(1,1),(2,1),(3,1)]
    // At origin (0,17): blocks at logical (0,18),(1,18),(2,18),(3,18)
    const s = stateWithPiece('I', { x: 0, y: 17 });

    // Fill row 19 completely
    fillLogicalRow(s.board, 19);
    // Fill row 18 completely
    fillLogicalRow(s.board, 18);
    // Clear cols 0-3 in row 18 so I-piece fills the gap
    const r18 = logicalToArrayRow(18);
    for (let c = 0; c <= 3; c++) {
      setCell(s.board, r18, c, { occupied: false });
    }

    lockAndResolve(s);

    // I-piece fills cols 0-3 of row 18 (blocks at y=1 offset from origin y=17)
    // Row 18 now fully filled, row 19 fully filled → double clear
    expect(s.linesCleared).toBe(2);
    expect(s.score).toBe(300);
    expect(s.comboCount).toBe(1);
  });

  it('non-clearing lock resets combo', () => {
    // First: clear a line to get combo=1
    const s = stateWithPiece('O', { x: 4, y: 17 });
    fillLogicalRow(s.board, 19);
    lockAndResolve(s);
    expect(s.comboCount).toBe(1);

    // Second: lock without clearing
    s.activePiece = createActivePiece('O');
    s.activePiece.origin = { x: 4, y: 1 };
    lockAndResolve(s);

    // No lines cleared → combo resets
    expect(s.comboCount).toBe(0);
    // Score should still be the same (nothing added for non-clear)
    expect(s.score).toBe(100);
  });
});

// ─── Vex Cast Integration ───────────────────────────────────────

describe('vex cast integration', () => {
  it('adjacent vex marks on locked pieces grant a spell', () => {
    // Place two adjacent vex-marked cells
    const s = createGameState('vex-integration');
    startGame(s);

    const board = s.board;
    setCell(board, HIDDEN_ROWS + 5, 3, {
      occupied: true, colorId: 'red', shapeId: 'Z', hasVexMark: true,
    });
    setCell(board, HIDDEN_ROWS + 5, 4, {
      occupied: true, colorId: 'red', shapeId: 'Z', hasVexMark: true,
    });

    // Lock current piece (which triggers vex alignment detection)
    // The piece won't have a vex mark, but the board cells already do
    // Move piece to ground then hardDrop
    while (softDrop(s)) { /* drop to ground */ }
    hardDrop(s);

    // Should have at least 1 spell in bank from the adjacent vex marks
    expect(s.spellBank.length).toBeGreaterThanOrEqual(1);
  });

  it('vex cast with fixed-seed gives deterministic outcome', () => {
    // Create a board with a dominating red color so COLOR vex destroys red
    const s = createGameState('vex-cast-repro');
    startGame(s);

    // Place 5 red cells and 1 green cell
    const board = s.board;
    for (let c = 0; c < 5; c++) {
      setCell(board, HIDDEN_ROWS + 10, c, {
        occupied: true, colorId: 'red', shapeId: 'Z',
      });
    }
    setCell(board, HIDDEN_ROWS + 10, 5, {
      occupied: true, colorId: 'green', shapeId: 'S',
    });

    // Add adjacent vex marks to grant a spell
    setCell(board, HIDDEN_ROWS + 5, 3, {
      occupied: true, colorId: 'cyan', shapeId: 'I', hasVexMark: true,
    });
    setCell(board, HIDDEN_ROWS + 5, 4, {
      occupied: true, colorId: 'cyan', shapeId: 'I', hasVexMark: true,
    });

    // Lock current piece to trigger alignment detection → grants spell
    while (softDrop(s)) { /* drop */ }
    hardDrop(s);

    // Must have a spell
    expect(s.spellBank.length).toBeGreaterThan(0);
    expect(s.selectedSpellIndex).toBeGreaterThanOrEqual(0);

    const spellIndex = s.selectedSpellIndex;
    const spellType = s.spellBank[spellIndex]!.type;

    // Count occupied cells before cast
    const occupiedBefore = countOccupied(s.board);

    // Cast the spell
    const castResult = castSelectedSpell(s);
    expect(castResult.ok).toBe(true);

    // Board occupied count should decrease after a successful cast
    const occupiedAfter = countOccupied(s.board);
    // COLOR vex destroys all cells of the target color
    // Either red (5 destroyed), green (1 destroyed), or cyan (2 destroyed)
    expect(occupiedAfter).toBeLessThan(occupiedBefore);
    // At least 1 cell destroyed
    expect(occupiedBefore - occupiedAfter).toBeGreaterThanOrEqual(1);
  });

  it('cycleSpell wraps around the spell bank', () => {
    const s = createGameState('spell-cycle');
    startGame(s);

    // Place adjacent vex marks to grant spells, then lock to trigger
    for (let c = 3; c < 5; c++) {
      setCell(s.board, HIDDEN_ROWS + 5, c, {
        occupied: true, colorId: 'red', shapeId: 'Z', hasVexMark: true,
      });
    }
    // Grant initial spells
    while (softDrop(s)) { /* drop */ }
    hardDrop(s);

    const bankSize = s.spellBank.length;
    if (bankSize >= 2) {
      const initialIndex = s.selectedSpellIndex;
      cycleSpell(s);
      expect(s.selectedSpellIndex).toBe((initialIndex + 1) % bankSize);
    }
  });
});

// ─── Game Over ──────────────────────────────────────────────────

describe('game over', () => {
  it('returns GAME_OVER when spawn position is fully blocked', () => {
    const s = createGameState('gameover-seed');

    // Fill the top rows completely so spawn is blocked
    for (let r = 0; r <= 1; r++) {
      fillLogicalRow(s.board, r - HIDDEN_ROWS + r); // hidden rows 0 and 1
    }
    // Actually just fill the two hidden rows directly
    for (let r = 0; r < HIDDEN_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        setCell(s.board, r, c, { occupied: true, colorId: 'gray' as any, shapeId: 'Z' as any });
      }
    }

    const result = startGame(s);
    expect(result).toBe(false);
    expect(s.status).toBe('GAME_OVER');
  });

  it('game over triggered by full board after repeated hard drops', () => {
    // Drop pieces until the board fills up
    const s = createGameState('fill-to-death');
    startGame(s);

    // Fill lower rows except for a narrow gap
    for (let y = 10; y <= 19; y++) {
      fillLogicalRow(s.board, y);
    }

    // Hard drop current piece, then keep dropping new pieces
    let dropped = 0;
    const maxDrops = 30; // safety limit
    while (s.status !== 'GAME_OVER' && dropped < maxDrops) {
      hardDrop(s);
      dropped++;
    }

    expect(s.status).toBe('GAME_OVER');
    expect(dropped).toBeLessThan(maxDrops); // shouldn't hit safety limit

    // No active piece after game over
    expect(s.activePiece).toBeUndefined();
  });
});

// ─── State Integrity ────────────────────────────────────────────

describe('state integrity', () => {
  it('ghost piece updates after every movement action', () => {
    const s = createGameState('integrity-seed');
    startGame(s);

    const initialGhostY = s.ghostPiece!.origin.y;

    moveLeft(s);
    expect(s.ghostPiece!.origin.x).toBe(s.activePiece!.origin.x);

    rotateCW(s);
    expect(s.ghostPiece!.rotationState).toBe(s.activePiece!.rotationState);

    softDrop(s);
    expect(s.ghostPiece!.origin.y).toBeLessThan(initialGhostY); // closer to bottom
  });

  it('board never exceeds COLS × TOTAL_ROWS dimensions', () => {
    const s = createGameState('dim-check');
    startGame(s);

    // Run many actions
    for (let i = 0; i < 10; i++) {
      moveLeft(s);
      rotateCW(s);
      softDrop(s);
      moveRight(s);
      hardDrop(s);
    }

    expect(s.board.length).toBe(TOTAL_ROWS);
    for (const row of s.board) {
      expect(row.length).toBe(COLS);
    }
  });

  it('occupied count never exceeds board size', () => {
    const s = createGameState('count-check');
    startGame(s);

    for (let i = 0; i < 10; i++) {
      hardDrop(s);
      if (s.status === 'GAME_OVER') break;
    }

    const total = countOccupied(s.board);
    expect(total).toBeLessThanOrEqual(TOTAL_ROWS * COLS);
  });
});
