/**
 * Vextris — Vex Mark Rotation Tests (Phase 2.5)
 *
 * Tests for `tryRotate` ↔ `vexMarkBlockIndex` remapping during
 * clockwise and counterclockwise rotation, including wall-kick cases.
 *
 * The rotation bug (mark jumping to wrong cell on non-O pieces,
 * sticking on O-piece) was fixed in Phase 2, but no tests covered
 * the remapping logic. These tests verify the existing fix.
 */

import { describe, it, expect } from 'vitest';
import {
  rotateCW,
  rotateCCW,
} from '../engine/gameLoop';
import {
  setCell,
  COLS,
  TOTAL_ROWS,
  HIDDEN_ROWS,
  logicalToArrayRow,
} from '../engine/board';
import type { Board } from '../engine/board';
import { stateWithPiece } from './test-utils';

// ─── Helpers ────────────────────────────────────────────────────

function fillCellForKickTest(board: Board, x: number, logicalY: number): void {
  const arrayRow = logicalToArrayRow(logicalY);
  if (arrayRow >= 0 && arrayRow < TOTAL_ROWS && x >= 0 && x < COLS) {
    setCell(board, arrayRow, x, {
      occupied: true,
      colorId: 'red',
      shapeId: 'Z',
    });
  }
}

// ─── O-Piece (manual cycle) ─────────────────────────────────────

describe('O-piece vex mark rotation', () => {
  it('CW: vexMarkBlockIndex cycles 0→1→3→2→0', () => {
    const s = stateWithPiece('O');
    s.activePiece!.vexMarkBlockIndex = 0;

    rotateCW(s);
    expect(s.activePiece!.vexMarkBlockIndex).toBe(1);

    rotateCW(s);
    expect(s.activePiece!.vexMarkBlockIndex).toBe(3);

    rotateCW(s);
    expect(s.activePiece!.vexMarkBlockIndex).toBe(2);

    rotateCW(s);
    expect(s.activePiece!.vexMarkBlockIndex).toBe(0); // full cycle
  });

  it('CCW: vexMarkBlockIndex cycles 0→2→3→1→0', () => {
    const s = stateWithPiece('O');
    s.activePiece!.vexMarkBlockIndex = 0;

    rotateCCW(s);
    expect(s.activePiece!.vexMarkBlockIndex).toBe(2);

    rotateCCW(s);
    expect(s.activePiece!.vexMarkBlockIndex).toBe(3);

    rotateCCW(s);
    expect(s.activePiece!.vexMarkBlockIndex).toBe(1);

    rotateCCW(s);
    expect(s.activePiece!.vexMarkBlockIndex).toBe(0); // full cycle
  });

  it('CW + CCW cancel each other out', () => {
    const s = stateWithPiece('O');
    s.activePiece!.vexMarkBlockIndex = 2;

    rotateCW(s);
    expect(s.activePiece!.vexMarkBlockIndex).toBe(0); // 2→0 in CW map
    rotateCCW(s);
    expect(s.activePiece!.vexMarkBlockIndex).toBe(2); // 0→2 in CCW map

    // Also test starting from other indices
    s.activePiece!.vexMarkBlockIndex = 1;
    rotateCW(s);  // 1→3
    rotateCCW(s); // 3→1
    expect(s.activePiece!.vexMarkBlockIndex).toBe(1);

    s.activePiece!.vexMarkBlockIndex = 3;
    rotateCCW(s); // 3→1
    rotateCW(s);  // 1→3
    expect(s.activePiece!.vexMarkBlockIndex).toBe(3);
  });

  it('4 CW rotations return to original index for all start positions', () => {
    for (let start = 0; start < 4; start++) {
      const s = stateWithPiece('O');
      s.activePiece!.vexMarkBlockIndex = start;
      for (let i = 0; i < 4; i++) rotateCW(s);
      expect(s.activePiece!.vexMarkBlockIndex).toBe(start);
    }
  });
});

// ─── I-Piece (world-position remapping) ─────────────────────────

describe('I-piece vex mark rotation remapping', () => {
  it('CW: mark on index 2 remaps to index 1 (same world cell)', () => {
    // I state 0: [(0,1),(1,1),(2,1),(3,1)] at origin (3,0)
    // Mark at index 2 → world position (5, 1)
    // After CW to state 1: [(2,0),(2,1),(2,2),(2,3)]
    // Identity kick: origin stays (3,0)
    // Index 1 block is at (5,1) → closest to world (5,1)
    const s = stateWithPiece('I', { x: 3, y: 0 });
    s.activePiece!.vexMarkBlockIndex = 2;

    rotateCW(s);

    expect(s.activePiece!.rotationState).toBe(1);
    expect(s.activePiece!.vexMarkBlockIndex).toBe(1);
  });

  it('CW: mark on index 0 remaps to index 0 (same world cell)', () => {
    // I state 0: [(0,1),(1,1),(2,1),(3,1)] at origin (3,0)
    // Mark at index 0 → world (3,1)
    // After CW: state 1 [(2,0),(2,1),(2,2),(2,3)], origin (3,0)
    // Index 0 at (5,0), index 1 at (5,1) — index 1 is closest (dist 0)
    const s = stateWithPiece('I', { x: 3, y: 0 });
    s.activePiece!.vexMarkBlockIndex = 0;

    rotateCW(s);

    expect(s.activePiece!.rotationState).toBe(1);
    expect(s.activePiece!.vexMarkBlockIndex).toBe(1);
  });

  it('CW: mark on index 3 remaps to closest new block', () => {
    // I state 0: mark at index 3 → world (6,1)
    // After CW state 1: identity origin (3,0):
    //   index 0: (5,0) dist=|5-6|+|0-1|=2
    //   index 1: (5,1) dist=|5-6|+|1-1|=1  ← closest
    //   index 2: (5,2) dist=|5-6|+|2-1|=2
    //   index 3: (5,3) dist=|5-6|+|3-1|=3
    const s = stateWithPiece('I', { x: 3, y: 0 });
    s.activePiece!.vexMarkBlockIndex = 3;

    rotateCW(s);

    expect(s.activePiece!.rotationState).toBe(1);
    expect(s.activePiece!.vexMarkBlockIndex).toBe(1);
  });
});

// ─── T-Piece (world-position remapping) ─────────────────────────

describe('T-piece vex mark rotation remapping', () => {
  it('CW: outer-corner mark remaps to same world cell', () => {
    // T state 0: [(0,0),(1,0),(2,0),(1,1)] at origin (3,0)
    // Mark at index 3 (block (1,1)) → world (4,1)
    // After CW state 1: [(1,0),(0,1),(1,1),(1,2)]
    // Identity kick: origin (3,0)
    // Index 2 block at (4,1) → dist 0 → best
    const s = stateWithPiece('T', { x: 3, y: 0 });
    s.activePiece!.vexMarkBlockIndex = 3;

    rotateCW(s);

    expect(s.activePiece!.rotationState).toBe(1);
    expect(s.activePiece!.vexMarkBlockIndex).toBe(2);
  });

  it('CW: center-bar mark remaps correctly', () => {
    // T state 0: mark at index 1 (block (1,0)) → world (4,0)
    // After CW state 1: index 0 at (4,0) → dist 0
    const s = stateWithPiece('T', { x: 3, y: 0 });
    s.activePiece!.vexMarkBlockIndex = 1;

    rotateCW(s);

    expect(s.activePiece!.rotationState).toBe(1);
    expect(s.activePiece!.vexMarkBlockIndex).toBe(0);
  });
});

// ─── Rotation with Wall Kick (§8, Appendix A.3) ─────────────────

describe('vex mark remapping across wall kicks', () => {
  it('I-piece: mark remaps correctly when non-identity kick is used', () => {
    // I piece at origin (3,0), state 0, mark at index 0 → world (3,1)
    //
    // After CW to state 1: identity kick places blocks at (5,0)-(5,3).
    // We fill those cells to force a non-identity kick.
    //
    // Kick table I 0→1:
    //   0: (0,0)   → origin (3,0)  [blocked]
    //   1: (-2,0)  → origin (1,0)  [should work]
    //
    // With kick (-2,0): newBlocks at (3,0),(3,1),(3,2),(3,3)
    // Index 1 at (3,1) → dist 0 from world (3,1) → best
    const s = stateWithPiece('I', { x: 3, y: 0 });
    s.activePiece!.vexMarkBlockIndex = 0;

    // Fill cells that identity-kick rotated I would occupy
    // State 1 blocks at identity origin (3,0): (5,0),(5,1),(5,2),(5,3)
    for (let y = 0; y <= 3; y++) {
      fillCellForKickTest(s.board, 5, y);
    }

    rotateCW(s);

    expect(s.activePiece!.rotationState).toBe(1);
    // Origin should have shifted due to kick
    expect(s.activePiece!.origin.x).toBe(1); // 3 + (-2)
    expect(s.activePiece!.origin.y).toBe(0); // 0 - 0
    // Mark should be at index 1 (block at (3,1) = world (3,1) = original)
    expect(s.activePiece!.vexMarkBlockIndex).toBe(1);
  });
});

// ─── Boundary: no mark → nothing to remap ───────────────────────

describe('rotation without vex mark', () => {
  it('rotateCW works normally when piece has no vex mark', () => {
    const s = stateWithPiece('T', { x: 3, y: 0 });
    // No vexMarkBlockIndex set

    const result = rotateCW(s);
    expect(result).toBe(true);
    expect(s.activePiece!.rotationState).toBe(1);
    expect(s.activePiece!.vexMarkBlockIndex).toBeUndefined();
  });

  it('rotateCCW works normally when piece has no vex mark', () => {
    const s = stateWithPiece('S', { x: 3, y: 0 });

    const result = rotateCCW(s);
    expect(result).toBe(true);
    expect(s.activePiece!.rotationState).toBe(3);
    expect(s.activePiece!.vexMarkBlockIndex).toBeUndefined();
  });
});
