/**
 * Vextris — Phase 2 Pieces & Collision Tests
 *
 * Tests for tetromino definitions, rotation states, spawn origins,
 * wall kicks, collision detection, and ghost piece calculation.
 *
 * Spec references: §8, §9, §25, Appendix A
 */

import { describe, it, expect } from 'vitest';
import { createEmptyBoard, setCell, HIDDEN_ROWS } from '../engine/board';
import type { Board, ShapeId } from '../engine/board';
import {
  SHAPES,
  COLOR_MAP,
  SPAWN_ORIGINS,
  getAllShapeIds,
  getBlocks,
  getColor,
  rotateClockwise,
  rotateCounterclockwise,
  getKicks,
  collides,
  calculateGhostPosition,
} from '../engine/pieces';
import { occupiedCell } from './test-utils';

// ─── Shape Definitions (Appendix A.1) ───────────────────────────

describe('Shape definitions', () => {
  it('defines all 7 tetromino shapes', () => {
    const shapes = getAllShapeIds();
    expect(shapes).toHaveLength(7);
    expect(shapes).toContain('I');
    expect(shapes).toContain('O');
    expect(shapes).toContain('T');
    expect(shapes).toContain('S');
    expect(shapes).toContain('Z');
    expect(shapes).toContain('J');
    expect(shapes).toContain('L');
  });

  it('each shape has exactly 4 rotation states', () => {
    for (const id of getAllShapeIds()) {
      expect(SHAPES[id]).toHaveLength(4);
    }
  });

  it('each rotation state has exactly 4 blocks', () => {
    for (const id of getAllShapeIds()) {
      for (let r = 0; r < 4; r++) {
        expect(SHAPES[id][r]).toHaveLength(4);
      }
    }
  });

  // ─── I-Piece (cyan) ──────────────────────────────────────────

  it('I-piece state 0 matches spec: [(0,1), (1,1), (2,1), (3,1)]', () => {
    const blocks = getBlocks('I', 0);
    expect(blocks).toEqual([
      { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 },
    ]);
  });

  it('I-piece state 1 matches spec: [(2,0), (2,1), (2,2), (2,3)]', () => {
    const blocks = getBlocks('I', 1);
    expect(blocks).toEqual([
      { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 },
    ]);
  });

  it('I-piece state 2 matches spec: [(0,2), (1,2), (2,2), (3,2)]', () => {
    const blocks = getBlocks('I', 2);
    expect(blocks).toEqual([
      { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 },
    ]);
  });

  it('I-piece state 3 matches spec: [(1,0), (1,1), (1,2), (1,3)]', () => {
    const blocks = getBlocks('I', 3);
    expect(blocks).toEqual([
      { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 },
    ]);
  });

  // ─── O-Piece (gold) ──────────────────────────────────────────

  it('O-piece all states match spec: [(0,0), (1,0), (0,1), (1,1)]', () => {
    const expected = [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 },
    ];
    for (let r = 0; r < 4; r++) {
      expect(getBlocks('O', r)).toEqual(expected);
    }
  });

  it('O-piece is invariant across all rotation states', () => {
    const state0 = getBlocks('O', 0);
    for (let r = 1; r < 4; r++) {
      expect(getBlocks('O', r)).toEqual(state0);
    }
  });

  // ─── T-Piece (violet) ────────────────────────────────────────

  it('T-piece state 0: [(0,0), (1,0), (2,0), (1,1)]', () => {
    expect(getBlocks('T', 0)).toEqual([
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 },
    ]);
  });

  it('T-piece state 1: [(1,0), (0,1), (1,1), (1,2)]', () => {
    expect(getBlocks('T', 1)).toEqual([
      { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 },
    ]);
  });

  it('T-piece state 2: [(1,0), (0,1), (1,1), (2,1)]', () => {
    expect(getBlocks('T', 2)).toEqual([
      { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
    ]);
  });

  it('T-piece state 3: [(0,0), (0,1), (1,1), (0,2)]', () => {
    expect(getBlocks('T', 3)).toEqual([
      { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 2 },
    ]);
  });

  // ─── S-Piece (green) ─────────────────────────────────────────

  it('S-piece state 0: [(1,0), (2,0), (0,1), (1,1)]', () => {
    expect(getBlocks('S', 0)).toEqual([
      { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 },
    ]);
  });

  it('S-piece state 1: [(1,0), (1,1), (2,1), (2,2)]', () => {
    expect(getBlocks('S', 1)).toEqual([
      { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 },
    ]);
  });

  it('S-piece state 2: [(1,1), (2,1), (0,2), (1,2)]', () => {
    expect(getBlocks('S', 2)).toEqual([
      { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 },
    ]);
  });

  it('S-piece state 3: [(0,0), (0,1), (1,1), (1,2)]', () => {
    expect(getBlocks('S', 3)).toEqual([
      { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 },
    ]);
  });

  // ─── Z-Piece (red) ───────────────────────────────────────────

  it('Z-piece state 0: [(0,0), (1,0), (1,1), (2,1)]', () => {
    expect(getBlocks('Z', 0)).toEqual([
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 },
    ]);
  });

  it('Z-piece state 1: [(2,0), (1,1), (2,1), (1,2)]', () => {
    expect(getBlocks('Z', 1)).toEqual([
      { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 },
    ]);
  });

  it('Z-piece state 2: [(0,1), (1,1), (1,2), (2,2)]', () => {
    expect(getBlocks('Z', 2)).toEqual([
      { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 },
    ]);
  });

  it('Z-piece state 3: [(1,0), (0,1), (1,1), (0,2)]', () => {
    expect(getBlocks('Z', 3)).toEqual([
      { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 2 },
    ]);
  });

  // ─── J-Piece (blue) ──────────────────────────────────────────

  it('J-piece state 0: [(0,0), (0,1), (1,1), (2,1)]', () => {
    expect(getBlocks('J', 0)).toEqual([
      { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
    ]);
  });

  // ─── L-Piece (orange) ────────────────────────────────────────

  it('L-piece state 0: [(2,0), (0,1), (1,1), (2,1)]', () => {
    expect(getBlocks('L', 0)).toEqual([
      { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
    ]);
  });
});

// ─── Color Mapping (§8) ─────────────────────────────────────────

describe('Color mapping', () => {
  it('I → cyan', () => expect(getColor('I')).toBe('cyan'));
  it('O → gold', () => expect(getColor('O')).toBe('gold'));
  it('T → violet', () => expect(getColor('T')).toBe('violet'));
  it('S → green', () => expect(getColor('S')).toBe('green'));
  it('Z → red', () => expect(getColor('Z')).toBe('red'));
  it('J → blue', () => expect(getColor('J')).toBe('blue'));
  it('L → orange', () => expect(getColor('L')).toBe('orange'));

  it('COLOR_MAP covers all shapes', () => {
    for (const id of getAllShapeIds()) {
      expect(COLOR_MAP[id]).toBeDefined();
    }
  });
});

// ─── Rotation Helpers (§8, Appendix A.4) ────────────────────────

describe('rotation helpers', () => {
  it('rotateClockwise advances +1 (mod 4)', () => {
    expect(rotateClockwise(0)).toBe(1);
    expect(rotateClockwise(1)).toBe(2);
    expect(rotateClockwise(2)).toBe(3);
    expect(rotateClockwise(3)).toBe(0);
  });

  it('rotateCounterclockwise decreases -1 (mod 4)', () => {
    expect(rotateCounterclockwise(0)).toBe(3);
    expect(rotateCounterclockwise(3)).toBe(2);
    expect(rotateCounterclockwise(2)).toBe(1);
    expect(rotateCounterclockwise(1)).toBe(0);
  });

  it('full cycle: 4 clockwise rotations return to original state', () => {
    let state = 0;
    for (let i = 0; i < 4; i++) state = rotateClockwise(state);
    expect(state).toBe(0);
  });

  it('full cycle: 4 counterclockwise rotations return to original state', () => {
    let state = 0;
    for (let i = 0; i < 4; i++) state = rotateCounterclockwise(state);
    expect(state).toBe(0);
  });

  it('clockwise then counterclockwise returns to original', () => {
    for (let s = 0; s < 4; s++) {
      expect(rotateCounterclockwise(rotateClockwise(s))).toBe(s);
    }
  });
});

// ─── Spawn Origins (Appendix A.2) ───────────────────────────────

describe('spawn origins', () => {
  it('I-piece spawns at (3, 0)', () => {
    expect(SPAWN_ORIGINS['I']).toEqual({ x: 3, y: 0 });
  });

  it('O-piece spawns at (4, 0)', () => {
    expect(SPAWN_ORIGINS['O']).toEqual({ x: 4, y: 0 });
  });

  it('T, S, Z, J, L spawn at (3, 0)', () => {
    for (const id of ['T', 'S', 'Z', 'J', 'L'] as ShapeId[]) {
      expect(SPAWN_ORIGINS[id]).toEqual({ x: 3, y: 0 });
    }
  });
});

// ─── Wall Kicks (Appendix A.3) ──────────────────────────────────

describe('wall kicks', () => {
  describe('JLSZT kicks', () => {
    it('0→1: [(0,0), (-1,0), (-1,+1), (0,-2), (-1,-2)]', () => {
      const kicks = getKicks(0, 1, 'T');
      expect(kicks).toEqual([
        { dx: 0, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: -1, dy: 1 },
        { dx: 0, dy: -2 },
        { dx: -1, dy: -2 },
      ]);
    });

    it('1→2: [(0,0), (+1,0), (+1,-1), (0,+2), (+1,+2)]', () => {
      const kicks = getKicks(1, 2, 'T');
      expect(kicks).toEqual([
        { dx: 0, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: 1, dy: -1 },
        { dx: 0, dy: 2 },
        { dx: 1, dy: 2 },
      ]);
    });

    it('2→3: [(0,0), (+1,0), (+1,+1), (0,-2), (+1,-2)]', () => {
      const kicks = getKicks(2, 3, 'T');
      expect(kicks).toEqual([
        { dx: 0, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: 1, dy: 1 },
        { dx: 0, dy: -2 },
        { dx: 1, dy: -2 },
      ]);
    });

    it('3→0: [(0,0), (-1,0), (-1,-1), (0,+2), (-1,+2)]', () => {
      const kicks = getKicks(3, 0, 'T');
      expect(kicks).toEqual([
        { dx: 0, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: -1, dy: -1 },
        { dx: 0, dy: 2 },
        { dx: -1, dy: 2 },
      ]);
    });

    it('all transitions have 5 kick offsets (including identity)', () => {
      for (const shape of ['J', 'L', 'S', 'Z', 'T'] as ShapeId[]) {
        for (let from = 0; from < 4; from++) {
          const to = (from + 1) % 4;
          expect(getKicks(from, to, shape)).toHaveLength(5);
        }
      }
    });
  });

  describe('I-piece kicks', () => {
    it('0→1: [(0,0), (-2,0), (+1,0), (-2,-1), (+1,+2)]', () => {
      const kicks = getKicks(0, 1, 'I');
      expect(kicks).toEqual([
        { dx: 0, dy: 0 },
        { dx: -2, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: -2, dy: -1 },
        { dx: 1, dy: 2 },
      ]);
    });

    it('1→2: [(0,0), (-1,0), (+2,0), (-1,+2), (+2,-1)]', () => {
      const kicks = getKicks(1, 2, 'I');
      expect(kicks).toEqual([
        { dx: 0, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 2, dy: 0 },
        { dx: -1, dy: 2 },
        { dx: 2, dy: -1 },
      ]);
    });

    it('2→3: [(0,0), (+2,0), (-1,0), (+2,+1), (-1,-2)]', () => {
      const kicks = getKicks(2, 3, 'I');
      expect(kicks).toEqual([
        { dx: 0, dy: 0 },
        { dx: 2, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 2, dy: 1 },
        { dx: -1, dy: -2 },
      ]);
    });

    it('3→0: [(0,0), (+1,0), (-2,0), (+1,-2), (-2,+1)]', () => {
      const kicks = getKicks(3, 0, 'I');
      expect(kicks).toEqual([
        { dx: 0, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: -2, dy: 0 },
        { dx: 1, dy: -2 },
        { dx: -2, dy: 1 },
      ]);
    });

    it('all transitions have 5 kick offsets', () => {
      for (let from = 0; from < 4; from++) {
        const to = (from + 1) % 4;
        expect(getKicks(from, to, 'I')).toHaveLength(5);
      }
    });
  });

  describe('O-piece kicks', () => {
    it('O-piece has only identity kick for all transitions', () => {
      for (let from = 0; from < 4; from++) {
        const to = (from + 1) % 4;
        expect(getKicks(from, to, 'O')).toEqual([{ dx: 0, dy: 0 }]);
      }
    });
  });

  describe('counterclockwise kicks (Appendix A.3)', () => {
    it('reverse kicks negate dx of clockwise transition', () => {
      const cwKicks = getKicks(0, 1, 'J');
      const ccwKicks = getKicks(1, 0, 'J');
      expect(ccwKicks).toEqual(cwKicks.map(k => ({ dx: -k.dx, dy: k.dy })));
    });

    it('all JLSZT reverse transitions negate dx', () => {
      for (const shape of ['J', 'L', 'S', 'Z', 'T'] as ShapeId[]) {
        for (let from = 0; from < 4; from++) {
          const to = rotateClockwise(from);
          const cwKicks = getKicks(from, to, shape);
          const ccwKicks = getKicks(to, from, shape);
          const expected = cwKicks.map(k => ({ dx: -k.dx, dy: k.dy }));
          expect(ccwKicks).toEqual(expected);
        }
      }
    });

    it('all I-piece reverse transitions negate dx', () => {
      for (let from = 0; from < 4; from++) {
        const to = rotateClockwise(from);
        const cwKicks = getKicks(from, to, 'I');
        const ccwKicks = getKicks(to, from, 'I');
        const expected = cwKicks.map(k => ({ dx: -k.dx, dy: k.dy }));
        expect(ccwKicks).toEqual(expected);
      }
    });
  });
});

// ─── Collision Detection (§25) ──────────────────────────────────

describe('collides', () => {
  it('no collision when piece is in empty space', () => {
    const board = createEmptyBoard();
    const blocks = getBlocks('T', 0);
    const origin = { x: 3, y: 5 };
    expect(collides(blocks, origin, board)).toBe(false);
  });

  it('collision when piece overlaps occupied cell', () => {
    const board = createEmptyBoard();
    setCell(board, 5 + HIDDEN_ROWS, 4, occupiedCell());
    const blocks = getBlocks('T', 0);
    const origin = { x: 3, y: 5 };
    expect(collides(blocks, origin, board)).toBe(true);
  });

  it('collision when piece extends below visible board (y+block.y >= 20)', () => {
    const board = createEmptyBoard();
    const blocks = getBlocks('O', 0);
    const origin = { x: 4, y: 19 };
    expect(collides(blocks, origin, board)).toBe(true);
  });

  it('collision when piece extends left of board (x+block.x < 0)', () => {
    const board = createEmptyBoard();
    const blocks = getBlocks('I', 0);
    const origin = { x: -1, y: 5 };
    expect(collides(blocks, origin, board)).toBe(true);
  });

  it('collision when piece extends right of board (x+block.x >= 10)', () => {
    const board = createEmptyBoard();
    const blocks = getBlocks('I', 0);
    const origin = { x: 9, y: 5 };
    expect(collides(blocks, origin, board)).toBe(true);
  });

  it('no collision when blocks are within empty hidden rows', () => {
    const board = createEmptyBoard();
    const blocks = getBlocks('T', 0);
    const origin = { x: 3, y: -1 };
    expect(collides(blocks, origin, board)).toBe(false);
  });

  it('collision when piece block is above hidden rows (y+block.y < -HIDDEN_ROWS)', () => {
    const board = createEmptyBoard();
    const blocks = getBlocks('T', 0);
    const origin = { x: 3, y: -3 };
    expect(collides(blocks, origin, board)).toBe(true);
  });
});

// ─── Ghost Piece Calculation (§9, §25) ──────────────────────────

describe('calculateGhostPosition', () => {
  it('empty board: ghost drops to bottom (logical y=20 - piece height)', () => {
    const board = createEmptyBoard();
    const blocks = getBlocks('O', 0);
    const origin = { x: 4, y: 0 };
    const ghost = calculateGhostPosition(blocks, origin, board);
    expect(ghost.x).toBe(4);
    expect(ghost.y).toBe(18);
  });

  it('ghost stops just above an occupied cell', () => {
    const board = createEmptyBoard();
    setCell(board, 8 + HIDDEN_ROWS, 3, occupiedCell());
    const blocks = getBlocks('I', 0);
    const origin = { x: 0, y: 0 };
    const ghost = calculateGhostPosition(blocks, origin, board);
    expect(ghost.x).toBe(0);
    expect(ghost.y).toBe(6);
  });

  it('ghost at current position when piece is already grounded', () => {
    const board = createEmptyBoard();
    const blocks = getBlocks('O', 0);
    const origin = { x: 4, y: 0 };
    // O-piece at (4,0): blocks at y=0,1. Set a block at y=1 → ghost can't drop
    setCell(board, 1 + HIDDEN_ROWS, 4, occupiedCell());
    const ghost = calculateGhostPosition(blocks, origin, board);
    expect(ghost.y).toBe(0);
  });
});
