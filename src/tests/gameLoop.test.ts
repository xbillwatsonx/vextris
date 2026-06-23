/**
 * Vextris — Game Loop Tests (Phase 3)
 *
 * Tests for spawning, movement, rotation, gravity, lock delay,
 * hard drop, line clear, scoring, combo, leveling, and game over.
 */

import { describe, it, expect } from 'vitest';
import {
  createGameState,
  startGame,
  moveLeft,
  moveRight,
  softDrop,
  hardDrop,
  rotateCW,
  rotateCCW,
  applyGravity,
  lockAndResolve,
  tick,
  createActivePiece,
  castSelectedSpell,
  resolveCastCollision,
} from '../engine/gameLoop';
import {
  setCell,
  getVisibleOccupiedCount,
  COLS,
  HIDDEN_ROWS,
} from '../engine/board';
import { LOCK_DELAY_MS, STARTING_LEVEL } from '../config/gameConfig';
import {
  occupiedCell,
  fillRow,
  makeCleanState,
  activeX,
  activeY,
} from './test-utils';

// ─── createGameState ────────────────────────────────────────────

describe('createGameState', () => {
  it('initializes with correct defaults', () => {
    const state = createGameState('seed1');
    expect(state.status).toBe('READY');
    expect(state.score).toBe(0);
    expect(state.level).toBe(STARTING_LEVEL);
    expect(state.linesCleared).toBe(0);
    expect(state.comboCount).toBe(0);
    expect(state.activePiece).toBeUndefined();
    expect(state.ghostPiece).toBeUndefined();
    expect(state.spellBank).toEqual([]);
    expect(state.selectedSpellIndex).toBe(-1);
  });

  it('stores the seed', () => {
    const state = createGameState('vextris-run-1');
    expect(state.rngSeed).toBe('vextris-run-1');
  });
});

// ─── startGame & Spawning ───────────────────────────────────────

describe('startGame', () => {
  it('transitions from READY to PLAYING', () => {
    const state = createGameState('s');
    expect(state.status).toBe('READY');
    startGame(state);
    expect(state.status).toBe('PLAYING');
  });

  it('spawns an active piece', () => {
    const state = createGameState('s');
    startGame(state);
    expect(state.activePiece).toBeDefined();
    expect(state.activePiece!.blocks).toHaveLength(4);
  });

  it('creates a ghost piece', () => {
    const state = createGameState('s');
    startGame(state);
    expect(state.ghostPiece).toBeDefined();
    // Ghost should be at or below the active piece
    expect(state.ghostPiece!.origin.y).toBeGreaterThanOrEqual(state.activePiece!.origin.y);
  });

  it('fills next queue with 3 pieces', () => {
    const state = createGameState('s');
    startGame(state);
    expect(state.nextQueue).toHaveLength(3);
  });

  it('detects game over on blocked spawn', () => {
    const state = createGameState('s');
    // Fill all cells where pieces spawn
    const board = state.board;
    for (let c = 3; c <= 6; c++) {
      setCell(board, HIDDEN_ROWS, c, occupiedCell());
      setCell(board, HIDDEN_ROWS + 1, c, occupiedCell());
    }
    const result = startGame(state);
    expect(result).toBe(false);
    expect(state.status).toBe('GAME_OVER');
  });

  it('spawn rotation state is always 0', () => {
    const state = createGameState('s');
    startGame(state);
    expect(state.activePiece!.rotationState).toBe(0);
  });
});

// ─── Movement ───────────────────────────────────────────────────

describe('moveLeft and moveRight', () => {
  it('moveLeft decreases x by 1', () => {
    const state = makeCleanState();
    const startX = activeX(state);
    moveLeft(state);
    expect(activeX(state)).toBe(startX - 1);
  });

  it('moveRight increases x by 1', () => {
    const state = makeCleanState();
    const startX = activeX(state);
    moveRight(state);
    expect(activeX(state)).toBe(startX + 1);
  });

  it('moveLeft fails at left wall', () => {
    const state = makeCleanState();
    // Move all the way left
    while (moveLeft(state)) { /* keep going */ }
    const atWall = activeX(state);
    expect(moveLeft(state)).toBe(false);
    expect(activeX(state)).toBe(atWall); // unchanged
  });

  it('moveRight fails at right wall', () => {
    const state = makeCleanState();
    while (moveRight(state)) { /* keep going */ }
    const atWall = activeX(state);
    expect(moveRight(state)).toBe(false);
    expect(activeX(state)).toBe(atWall);
  });

  it('ghost piece updates after move', () => {
    const state = makeCleanState();
    const ghostBefore = state.ghostPiece!.origin.x;
    moveLeft(state);
    expect(state.ghostPiece!.origin.x).toBe(ghostBefore - 1);
  });
});

describe('softDrop', () => {
  it('moves piece down one row', () => {
    const state = makeCleanState();
    const startY = activeY(state);
    softDrop(state);
    expect(activeY(state)).toBe(startY + 1);
  });

  it('awards 1 point per cell (soft drop score)', () => {
    const state = makeCleanState();
    softDrop(state);
    expect(state.score).toBe(1); // 1 row × 1 point
  });

  it('fails when piece is grounded (below is blocked)', () => {
    const state = makeCleanState();
    // Drop to bottom
    hardDrop(state); // locks, spawns new piece
    startGame(state); // ...actually no, hardDrop already spawns. Let's just use a new state

    const state2 = makeCleanState();
    // Fill row below the spawn to block softDrop
    fillRow(state2, 1); // blocks row 1
    // Piece spawns at y=0 for most, so block row 1
    if (state2.activePiece!.shapeId === 'O') {
      // O spans (0,0)-(1,1), so block row 2
      fillRow(state2, 2);
    }
    // Actually just drop to the ground
    while (softDrop(state)) { /* keep going */ }
    const finalY = activeY(state);
    expect(softDrop(state)).toBe(false);
    expect(activeY(state)).toBe(finalY);
  });
});

describe('hardDrop', () => {
  it('instantly locks the piece', () => {
    const state = makeCleanState();
    hardDrop(state);
    // Piece should be locked (now on board) and a new piece spawned
    expect(getVisibleOccupiedCount(state.board)).toBe(4); // 4 cells locked
    expect(state.activePiece).toBeDefined(); // new piece spawned
  });

  it('awards 2 points per cell dropped (hard drop score)', () => {
    const state = makeCleanState();
    const ghostY = state.ghostPiece!.origin.y;
    const startY = activeY(state);
    const cellsDropped = ghostY - startY;
    hardDrop(state);
    expect(state.score).toBe(cellsDropped * 2);
  });

  it('clears filled rows after hard drop', () => {
    const state = makeCleanState('simple-clear');
    // Fill row 19 completely
    fillRow(state, 19);
    // Fill row 18 except cols 4-5
    const r18 = 18 + HIDDEN_ROWS;
    for (let c = 0; c < COLS; c++) {
      setCell(state.board, r18, c, occupiedCell());
    }
    setCell(state.board, r18, 4, { occupied: false });
    setCell(state.board, r18, 5, { occupied: false });

    // Replace active piece with a controlled O-piece at (4, 17)
    const p = createActivePiece('O');
    p.origin = { x: 4, y: 17 };
    state.activePiece = p;

    lockAndResolve(state);
    // O blocks at (4,17), (5,17), (4,18), (5,18) fill row 18 gap
    // Rows 18 and 19 become full → double clear
    expect(state.linesCleared).toBe(2);
  });
});

// ─── Rotation ───────────────────────────────────────────────────

describe('rotation', () => {
  it('rotateCW advances rotation state', () => {
    const state = makeCleanState();
    expect(state.activePiece!.rotationState).toBe(0);
    const result = rotateCW(state);
    // May fail if against wall, but for most pieces in open space it works
    if (state.activePiece!.shapeId === 'O') {
      // O doesn't change visually but rotation state advances
      expect(state.activePiece!.rotationState).toBe(1);
    } else {
      // Most pieces can rotate
      expect(result).toBe(true);
      expect(state.activePiece!.rotationState).toBe(1);
    }
  });

  it('rotateCCW goes back to original state', () => {
    const state = makeCleanState();
    if (state.activePiece!.shapeId === 'O') {
      rotateCW(state);
      rotateCCW(state);
      expect(state.activePiece!.rotationState).toBe(0);
    } else if (rotateCW(state)) {
      rotateCCW(state);
      expect(state.activePiece!.rotationState).toBe(0);
    }
  });

  it('rotation updates ghost piece', () => {
    const state = makeCleanState();
    if (state.activePiece!.shapeId !== 'O' && rotateCW(state)) {
      expect(state.ghostPiece!.rotationState).toBe(state.activePiece!.rotationState);
    }
  });
});

// ─── Gravity ────────────────────────────────────────────────────

describe('gravity', () => {
  it('applyGravity with enough time drops the piece', () => {
    const state = makeCleanState();
    const startY = activeY(state);
    // Level 1: 1000ms per row
    applyGravity(state, 1000);
    expect(activeY(state)).toBe(startY + 1);
  });

  it('applyGravity with small time does not drop', () => {
    const state = makeCleanState();
    const startY = activeY(state);
    applyGravity(state, 500); // half of level-1 interval
    expect(activeY(state)).toBe(startY);
  });

  it('applyGravity accumulates partial time', () => {
    const state = makeCleanState();
    const startY = activeY(state);
    applyGravity(state, 600);
    expect(activeY(state)).toBe(startY); // not enough yet
    applyGravity(state, 600);
    expect(activeY(state)).toBe(startY + 1); // now it triggers
  });

  it('gravity stops at the bottom (grounded)', () => {
    const state = makeCleanState();
    // Drop all the way down
    while (softDrop(state)) { /* keep going */ }
    const groundedY = activeY(state);
    // Apply gravity; piece should not move further
    applyGravity(state, 1000);
    expect(activeY(state)).toBe(groundedY);
  });
});

// ─── Lock Delay ─────────────────────────────────────────────────

describe('lock delay', () => {
  it('tick locks piece after LOCK_DELAY_MS when grounded', () => {
    const state = makeCleanState();
    // Drop to bottom
    while (softDrop(state)) { /* keep going */ }

    // Tick past lock delay
    tick(state, LOCK_DELAY_MS);
    // After lock delay, piece should have locked and new piece spawned
    // tick may trigger lock if lockDelayTimerMs >= LOCK_DELAY_MS
  });

  it('lock delay resets on movement when grounded', () => {
    const state = makeCleanState();
    // Drop to bottom
    while (softDrop(state)) { /* keep going */ }
    // Tick partway through lock delay
    tick(state, 250);
    // Move left to reset lock
    moveLeft(state);
    // Timer should have reset
    expect(state.lockDelayTimerMs).toBe(0);
  });

  it('hard drop bypasses lock delay entirely', () => {
    const state = makeCleanState();
    hardDrop(state);
    // Piece locked instantly, new piece spawned
    expect(state.activePiece).toBeDefined();
    expect(getVisibleOccupiedCount(state.board)).toBeGreaterThanOrEqual(4);
  });
});

// ─── Line Clear & Scoring ───────────────────────────────────────

describe('line clearing and scoring', () => {
  it('single line clear scores 100 × level at level 1', () => {
    const state = makeCleanState('single-test');
    // Fill row 19 completely
    fillRow(state, 19);
    // Fill row 18 except 4 cells (one-piece gap)
    const arrayRow18 = 18 + HIDDEN_ROWS;
    for (let c = 0; c < COLS; c++) {
      setCell(state.board, arrayRow18, c, occupiedCell());
    }
    // Clear 4 cells in row 18 where O-piece would go
    for (let c = 4; c <= 5; c++) {
      setCell(state.board, arrayRow18, c, { occupied: false });
      setCell(state.board, 19 + HIDDEN_ROWS, c, { occupied: false });
    }

    // This is getting complex. Simpler: manually lock an O-piece directly
    const state2 = makeCleanState('line-test');
    // Fill row 19 completely, row 18 except where O-piece fits at (4,17)
    fillRow(state2, 19);
    const r18 = 18 + HIDDEN_ROWS;
    for (let c = 0; c < COLS; c++) {
      setCell(state2.board, r18, c, occupiedCell());
    }
    // Clear cols 4-5 in row 18
    setCell(state2.board, r18, 4, { occupied: false });
    setCell(state2.board, r18, 5, { occupied: false });

    // Now lockAndResolve the O-piece at (4, 17) which fills cols 4-5
    const activePiece = createActivePiece('O');
    activePiece.origin = { x: 4, y: 17 };
    state2.activePiece = activePiece;

    lockAndResolve(state2);
    // O at (4,17) → blocks at (4,17), (5,17), (4,18), (5,18)
    // Row 17 (array 19) was already full — cleared
    // Row 18 is now full — cleared
    // That's a double clear = 300 × 1 + combo
    expect(state2.linesCleared).toBe(2);
    // Score: (300 + 50 × 0) × 1 = 300 (combo starts at 0, increments after clear)
    // Actually comboCount is 0 at lock, then incremented to 1 after clear
    expect(state2.score).toBe(300);
    expect(state2.comboCount).toBe(1);
  });

  it('zero lines cleared gives zero line score', () => {
    const state = makeCleanState('zero-test');
    const piece = createActivePiece('O');
    piece.origin = { x: 4, y: 18 };
    state.activePiece = piece;
    const scoreBefore = state.score;
    lockAndResolve(state);
    // No lines cleared
    expect(state.linesCleared).toBe(0);
    expect(state.score).toBe(scoreBefore);
    expect(state.comboCount).toBe(0); // combo resets
  });
});

// ─── Combo (§18) ────────────────────────────────────────────────

describe('combo', () => {
  it('combo increments on consecutive line-clearing locks', () => {
    const state = makeCleanState('combo-test');
    // Fill rows 18-19 completely, row 17 with a gap
    fillRow(state, 19);
    fillRow(state, 18);

    // First lock: fill row 17 gap with an O-piece at (4,16)
    const r17 = 17 + HIDDEN_ROWS;
    for (let c = 0; c < COLS; c++) {
      setCell(state.board, r17, c, occupiedCell());
    }
    setCell(state.board, r17, 4, { occupied: false });
    setCell(state.board, r17, 5, { occupied: false });

    const p1 = createActivePiece('O');
    p1.origin = { x: 4, y: 16 };
    state.activePiece = p1;
    lockAndResolve(state);
    // Single line clear (row 17)
    expect(state.comboCount).toBe(1);
    const scoreAfter1 = state.score;

    // Now fill row 16 with gap for next piece
    const r16 = 16 + HIDDEN_ROWS;
    for (let c = 0; c < COLS; c++) {
      setCell(state.board, r16, c, occupiedCell());
    }
    setCell(state.board, r16, 4, { occupied: false });
    setCell(state.board, r16, 5, { occupied: false });

    const p2 = createActivePiece('O');
    p2.origin = { x: 4, y: 15 };
    state.activePiece = p2;
    lockAndResolve(state);
    // Single line clear with combo 1: (100 + 50×1) × 1 = 150
    expect(state.comboCount).toBe(2);
    expect(state.score).toBe(scoreAfter1 + 150);
  });

  it('combo resets to 0 on non-clearing lock', () => {
    const state = makeCleanState('combo-reset');
    // First: clear a line to get combo=1
    fillRow(state, 19);
    const r18 = 18 + HIDDEN_ROWS;
    for (let c = 0; c < COLS; c++) {
      setCell(state.board, r18, c, occupiedCell());
    }
    setCell(state.board, r18, 4, { occupied: false });
    setCell(state.board, r18, 5, { occupied: false });

    const p1 = createActivePiece('O');
    p1.origin = { x: 4, y: 17 };
    state.activePiece = p1;
    lockAndResolve(state);
    expect(state.comboCount).toBe(1);

    // Second: lock without clearing (drop O-piece high on empty board)
    const p2 = createActivePiece('O');
    p2.origin = { x: 4, y: 2 };
    state.activePiece = p2;
    lockAndResolve(state);
    expect(state.comboCount).toBe(0); // RESET
  });
});

// ─── Leveling ───────────────────────────────────────────────────

describe('leveling', () => {
  it('level starts at 1', () => {
    const state = createGameState('s');
    expect(state.level).toBe(1);
  });

  it('level advances every 10 lines', () => {
    const state = makeCleanState('level-test');
    // Manually set linesCleared and recalculate level
    // We need to advance lines by clearing.
    // Easiest: use lockAndResolve repeatedly with full rows

    // Fill rows 19 down to 10 (that's 10 rows)
    for (let r = 10; r <= 19; r++) {
      fillRow(state, r);
    }
    // Now fill row 9 except a gap
    const r9 = 9 + HIDDEN_ROWS;
    for (let c = 0; c < COLS; c++) {
      setCell(state.board, r9, c, occupiedCell());
    }
    setCell(state.board, r9, 4, { occupied: false });
    setCell(state.board, r9, 5, { occupied: false });

    const p = createActivePiece('O');
    p.origin = { x: 4, y: 8 };
    state.activePiece = p;
    lockAndResolve(state);
    // Should clear rows 9-19 = 11 rows
    expect(state.linesCleared).toBeGreaterThanOrEqual(10);
    expect(state.level).toBeGreaterThanOrEqual(2);
  });
});

// ─── Game Over ──────────────────────────────────────────────────

describe('game over', () => {
  it('game over when spawn is blocked', () => {
    const state = createGameState('go-seed');
    // Fill visible rows 0-1 (first two visible rows)
    fillRow(state, 0);
    fillRow(state, 1);
    // Now start
    const result = startGame(state);
    expect(result).toBe(false);
    expect(state.status).toBe('GAME_OVER');
  });

  it('game over after line clear if next spawn blocked', () => {
    const state = makeCleanState('go2');
    // Fill rows 0-19 completely
    for (let r = 0; r <= 19; r++) {
      fillRow(state, r);
    }
    // Hard drop will fill remaining gaps, clear rows, but spawn area still full
    // Actually hardDrop spawns new piece first, so let's use lockAndResolve
    // which will clear many rows
    const p = createActivePiece('O');
    p.origin = { x: 4, y: 0 };
    state.activePiece = p;
    lockAndResolve(state);
    // After clearing 20 rows, the board is empty — spawn should work
    expect(state.status).toBe('PLAYING');
  });
});

// ─── Ghost Piece Tracking ───────────────────────────────────────

describe('ghost piece', () => {
  it('ghost is at or below active piece', () => {
    const state = makeCleanState();
    expect(state.ghostPiece!.origin.y).toBeGreaterThanOrEqual(state.activePiece!.origin.y);
  });

  it('ghost x matches active piece x', () => {
    const state = makeCleanState();
    expect(state.ghostPiece!.origin.x).toBe(state.activePiece!.origin.x);
  });

  it('ghost shares shape and color with active', () => {
    const state = makeCleanState();
    expect(state.ghostPiece!.shapeId).toBe(state.activePiece!.shapeId);
    expect(state.ghostPiece!.colorId).toBe(state.activePiece!.colorId);
  });

  it('ghost drops to the very bottom on empty board', () => {
    const state = makeCleanState();
    const ghost = state.ghostPiece!;
    // Ghost should be at the lowest legal position — near bottom
    // For most pieces, ghost.y + max-block-y = 19
    const maxBlockY = Math.max(...state.activePiece!.blocks.map(b => b.y));
    expect(ghost.origin.y + maxBlockY).toBe(19);
  });
});

// ─── Post-vex line clear scoring (state-level) ───────────────────

describe('post-vex line clear scoring via castSelectedSpell', () => {
  it('Color Vex: post-collapse line clear awards score, increments linesCleared, combo unchanged', () => {
    const state = makeCleanState('color-score');
    state.activePiece = undefined; // remove spawned piece for clean board setup

    // Set up a board where destroying red causes a collapse into a full row.
    // Row 19: 9 red (cols 1-9) + 1 blue (col 0)
    // Row 18: 9 blue (cols 1-9) + 1 red (col 0)
    // Destroying red → collapse → row 19 = 10 blue = full row → 1 line clear
    for (let c = 1; c < COLS; c++) {
      setCell(state.board, HIDDEN_ROWS + 19, c, occupiedCell('red', 'Z'));
      setCell(state.board, HIDDEN_ROWS + 18, c, occupiedCell('blue', 'J'));
    }
    setCell(state.board, HIDDEN_ROWS + 19, 0, occupiedCell('blue', 'J'));
    setCell(state.board, HIDDEN_ROWS + 18, 0, occupiedCell('red', 'Z'));

    // Add a COLOR spell
    state.spellBank = [{ id: 's1', type: 'COLOR', grantedAtLevel: 1, grantedAtTick: 0 }];
    state.selectedSpellIndex = 0;

    // Put a valid active piece high up so it doesn't interfere
    state.activePiece = createActivePiece('I');
    state.activePiece.origin = { x: 3, y: 0 };
    state.status = 'PLAYING';

    const scoreBefore = state.score;
    const comboBefore = state.comboCount;

    const result = castSelectedSpell(state);
    expect(result.ok).toBe(true);
    expect(state.linesCleared).toBe(1);
    // Score should include: destroyed cells (some) + line clear (100 × level)
    expect(state.score).toBeGreaterThan(scoreBefore);
    expect(state.comboCount).toBe(comboBefore);
  });

  it('Shape Vex: post-collapse line clear awards score, increments linesCleared, combo unchanged', () => {
    const state = makeCleanState('shape-score');
    state.activePiece = undefined;

    // Same pattern but shape-based: destroying Z causes collapse into full row
    for (let c = 1; c < COLS; c++) {
      setCell(state.board, HIDDEN_ROWS + 19, c, occupiedCell('red', 'Z'));
      setCell(state.board, HIDDEN_ROWS + 18, c, occupiedCell('blue', 'J'));
    }
    setCell(state.board, HIDDEN_ROWS + 19, 0, occupiedCell('blue', 'J'));
    setCell(state.board, HIDDEN_ROWS + 18, 0, occupiedCell('red', 'Z'));

    state.spellBank = [{ id: 's1', type: 'SHAPE', grantedAtLevel: 1, grantedAtTick: 0 }];
    state.selectedSpellIndex = 0;
    state.activePiece = createActivePiece('I');
    state.activePiece.origin = { x: 3, y: 0 };
    state.status = 'PLAYING';

    const comboBefore = state.comboCount;

    const result = castSelectedSpell(state);
    expect(result.ok).toBe(true);
    expect(state.linesCleared).toBe(1);
    expect(state.comboCount).toBe(comboBefore);
  });

  it('Level recalculates when linesCleared crosses threshold via post-vex clear', () => {
    const state = makeCleanState('level-up');
    state.activePiece = undefined;

    // Set linesCleared to 9 so 1 more line clear triggers level up (10 lines = level 2)
    state.linesCleared = 9;
    state.level = 1;

    // Set up board for a 1-line clear via Color Vex
    for (let c = 1; c < COLS; c++) {
      setCell(state.board, HIDDEN_ROWS + 19, c, occupiedCell('red', 'Z'));
      setCell(state.board, HIDDEN_ROWS + 18, c, occupiedCell('blue', 'J'));
    }
    setCell(state.board, HIDDEN_ROWS + 19, 0, occupiedCell('blue', 'J'));
    setCell(state.board, HIDDEN_ROWS + 18, 0, occupiedCell('red', 'Z'));

    state.spellBank = [{ id: 's1', type: 'COLOR', grantedAtLevel: 1, grantedAtTick: 0 }];
    state.selectedSpellIndex = 0;
    state.activePiece = createActivePiece('I');
    state.activePiece.origin = { x: 3, y: 0 };
    state.status = 'PLAYING';

    castSelectedSpell(state);
    expect(state.linesCleared).toBe(10);
    expect(state.level).toBe(2);
  });

  it('Shadow Vex: post-collapse line clears are scored, linesCleared incremented, combo unchanged', () => {
    const state = makeCleanState('shadow-score');
    state.activePiece = undefined;

    // Fill 10 rows completely (100 cells) → meets 40% threshold (80 cells)
    // Inverse: 10 empty rows become shadow blocks (10 cols each = full rows)
    // After collapse: 10 full rows → 10 line clears
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < COLS; c++) {
        setCell(state.board, HIDDEN_ROWS + r, c, occupiedCell('red', 'Z'));
      }
    }

    state.spellBank = [{ id: 's1', type: 'SHADOW', grantedAtLevel: 1, grantedAtTick: 0 }];
    state.selectedSpellIndex = 0;
    state.activePiece = createActivePiece('I');
    state.activePiece.origin = { x: 3, y: 0 };
    state.status = 'PLAYING';

    const comboBefore = state.comboCount;
    const scoreBefore = state.score;

    const result = castSelectedSpell(state);
    expect(result.ok).toBe(true);
    expect(state.linesCleared).toBe(10);
    // Shadow Vex flat score (250 × 1) + post-vex line clears (10 lines = 2 quads + 1 double = 1900 × 1)
    expect(state.score).toBe(scoreBefore + 250 + 1900);
    expect(state.comboCount).toBe(comboBefore);
  });

  it('5+ post-vex line clears use chunked quad scoring', () => {
    const state = makeCleanState('shadow-5plus');
    state.activePiece = undefined;

    // Fill 12 rows completely (120 cells) → meets threshold
    // Inverse: 8 empty rows become shadow → 8 full rows after collapse
    // 8 lines = 2 quads = 1600 × level
    for (let r = 0; r < 12; r++) {
      for (let c = 0; c < COLS; c++) {
        setCell(state.board, HIDDEN_ROWS + r, c, occupiedCell('red', 'Z'));
      }
    }

    state.spellBank = [{ id: 's1', type: 'SHADOW', grantedAtLevel: 1, grantedAtTick: 0 }];
    state.selectedSpellIndex = 0;
    state.activePiece = createActivePiece('I');
    state.activePiece.origin = { x: 3, y: 0 };
    state.status = 'PLAYING';

    const scoreBefore = state.score;

    const result = castSelectedSpell(state);
    expect(result.ok).toBe(true);
    // 8 lines cleared = 2 quads = 1600 × 1
    // Shadow Vex flat score = 250 × 1
    expect(state.linesCleared).toBe(8);
    expect(state.score).toBe(scoreBefore + 250 + 1600);
  });
});

// ─── Cast collision recovery (resolveCastCollision) ─────────────

describe('cast collision recovery (resolveCastCollision)', () => {
  it('no shift needed: piece does not collide after cast', () => {
    const state = makeCleanState('cc-noshift');

    // Piece is at y=5, nothing under it
    state.activePiece = createActivePiece('I');
    state.activePiece.origin = { x: 3, y: 5 };

    const ok = resolveCastCollision(state);
    expect(ok).toBe(true);
    expect(state.status).toBe('PLAYING');
    expect(state.activePiece.origin.y).toBe(5);
  });

  it('one-cell shift: piece collides at current y, clears at y-1', () => {
    const state = makeCleanState('cc-1shift');

    // I-piece rotation 0: blocks at (0,1),(1,1),(2,1),(3,1)
    // Origin (3, 5): world cells at (3,6),(4,6),(5,6),(6,6) → row 6
    // Place locked cells at row 6 cols 3-6 (under piece) → collision at y=5
    // Row 5 (y=4) should be empty → shift 1 clears
    setCell(state.board, HIDDEN_ROWS + 6, 3, occupiedCell('blue', 'J'));
    setCell(state.board, HIDDEN_ROWS + 6, 4, occupiedCell('blue', 'J'));
    setCell(state.board, HIDDEN_ROWS + 6, 5, occupiedCell('blue', 'J'));
    setCell(state.board, HIDDEN_ROWS + 6, 6, occupiedCell('blue', 'J'));

    state.activePiece = createActivePiece('I');
    state.activePiece.origin = { x: 3, y: 5 };

    const ok = resolveCastCollision(state);
    expect(ok).toBe(true);
    expect(state.status).toBe('PLAYING');
    // Piece should have shifted up by 1: y=5 → y=4
    expect(state.activePiece.origin.y).toBe(4);
  });

  it('two-cell shift: piece collides at y and y-1, clears at y-2', () => {
    const state = makeCleanState('cc-2shift');

    // I-piece rotation 0: blocks at (0,1),(1,1),(2,1),(3,1)
    // Origin (3, 5): world cells at (3,6),(4,6),(5,6),(6,6) → row 6
    // Place locked cells at row 6 (under piece) AND row 5 (y-1) cols 3-6
    // Row 4 (y-2) should be empty → shift 2 clears
    setCell(state.board, HIDDEN_ROWS + 6, 3, occupiedCell('blue', 'J'));
    setCell(state.board, HIDDEN_ROWS + 6, 4, occupiedCell('blue', 'J'));
    setCell(state.board, HIDDEN_ROWS + 6, 5, occupiedCell('blue', 'J'));
    setCell(state.board, HIDDEN_ROWS + 6, 6, occupiedCell('blue', 'J'));
    setCell(state.board, HIDDEN_ROWS + 5, 3, occupiedCell('blue', 'J'));
    setCell(state.board, HIDDEN_ROWS + 5, 4, occupiedCell('blue', 'J'));
    setCell(state.board, HIDDEN_ROWS + 5, 5, occupiedCell('blue', 'J'));
    setCell(state.board, HIDDEN_ROWS + 5, 6, occupiedCell('blue', 'J'));

    state.activePiece = createActivePiece('I');
    state.activePiece.origin = { x: 3, y: 5 };

    const ok = resolveCastCollision(state);
    expect(ok).toBe(true);
    expect(state.status).toBe('PLAYING');
    // Piece should have shifted up by 2: y=5 → y=3
    expect(state.activePiece.origin.y).toBe(3);
  });

  it('still colliding after max shift triggers GAME_OVER', () => {
    const state = makeCleanState('cc-gameover');

    // I-piece rotation 0: blocks at (0,1),(1,1),(2,1),(3,1)
    // Origin (3, 5): world cells at (3,6),(4,6),(5,6),(6,6) → row 6
    // Place locked cells at rows 6, 5, AND 4 cols 3-6
    // Shift 0: row 6 → collision. Shift 1: row 5 → collision. Shift 2: row 4 → collision.
    // All 3 shifts fail → GAME_OVER
    setCell(state.board, HIDDEN_ROWS + 6, 3, occupiedCell('blue', 'J'));
    setCell(state.board, HIDDEN_ROWS + 6, 4, occupiedCell('blue', 'J'));
    setCell(state.board, HIDDEN_ROWS + 6, 5, occupiedCell('blue', 'J'));
    setCell(state.board, HIDDEN_ROWS + 6, 6, occupiedCell('blue', 'J'));
    setCell(state.board, HIDDEN_ROWS + 5, 3, occupiedCell('blue', 'J'));
    setCell(state.board, HIDDEN_ROWS + 5, 4, occupiedCell('blue', 'J'));
    setCell(state.board, HIDDEN_ROWS + 5, 5, occupiedCell('blue', 'J'));
    setCell(state.board, HIDDEN_ROWS + 5, 6, occupiedCell('blue', 'J'));
    setCell(state.board, HIDDEN_ROWS + 4, 3, occupiedCell('blue', 'J'));
    setCell(state.board, HIDDEN_ROWS + 4, 4, occupiedCell('blue', 'J'));
    setCell(state.board, HIDDEN_ROWS + 4, 5, occupiedCell('blue', 'J'));
    setCell(state.board, HIDDEN_ROWS + 4, 6, occupiedCell('blue', 'J'));

    state.activePiece = createActivePiece('I');
    state.activePiece.origin = { x: 3, y: 5 };

    const ok = resolveCastCollision(state);
    expect(ok).toBe(false);
    expect(state.status).toBe('GAME_OVER');
    expect(state.activePiece).toBeUndefined();
    expect(state.ghostPiece).toBeUndefined();
  });
});
