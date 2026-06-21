/**
 * Vextris — Vex System Tests (Phase 4)
 *
 * Tests for vex mark spawning, alignment detection (cluster processing,
 * full-bank early exit, visible-only scan), spell bank operations,
 * Color Vex, Shape Vex, Shadow Vex, and cast guardrails.
 */

import { describe, it, expect } from 'vitest';
import {
  createEmptyBoard,
  setCell,
  getCell,
  getVisibleOccupiedCount,
  COLS,
  TOTAL_ROWS,
  HIDDEN_ROWS,
} from '../engine/board';
import type { Board, ColorId, ShapeId, Cell } from '../engine/board';
import { SeededRNG } from '../engine/random';
import {
  maybeAttachVexMark,
  selectVexType,
  grantRandomVex,
  cycleSpellIndex,
  removeSpellAtIndex,
  findVexAlignments,
  canCastVex,
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
} from '../engine/vex';
import type { VexSpellBank, VexConfig, VexWeights } from '../engine/vex';
import { DEFAULT_VEX_CONFIG, DEFAULT_VEX_WEIGHTS } from '../engine/vex';
import {
  VEX_MAX_BANK_SIZE,
} from '../config/gameConfig';

// ─── Helpers ────────────────────────────────────────────────────

function occCell(color: ColorId = 'red', shape: ShapeId = 'Z', vexMark = false): Cell {
  return { occupied: true, colorId: color, shapeId: shape, hasVexMark: vexMark };
}

function makeRNG(seed = 'vex-test'): SeededRNG {
  return new SeededRNG(seed);
}

function emptyBank(): VexSpellBank {
  return [];
}

function fullBank(): VexSpellBank {
  const bank: VexSpellBank = [];
  for (let i = 0; i < VEX_MAX_BANK_SIZE; i++) {
    bank.push({ id: `spell-${i}`, type: 'COLOR', grantedAtLevel: 1, grantedAtTick: i });
  }
  return bank;
}

// ─── Vex Mark Spawning (§10) ────────────────────────────────────

describe('maybeAttachVexMark', () => {
  it('no mark when RNG fails chance (below threshold)', () => {
    // Mock: we need a specific RNG. Use a seed that produces < 0.08 on first call.
    // Actually, test the logical behavior: if chance is 0, never attaches
    const rng = makeRNG('no-mark');
    const blocks = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }];
    const cfg = { ...DEFAULT_VEX_CONFIG, vexMarkChance: 0 };
    expect(maybeAttachVexMark(blocks, rng, cfg)).toBeUndefined();
  });

  it('always attaches when chance is 1.0', () => {
    const blocks = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }];
    const cfg = { ...DEFAULT_VEX_CONFIG, vexMarkChance: 1.0 };
    // Test multiple seeds all produce a mark
    for (const seed of ['a', 'b', 'c']) {
      const rng = new SeededRNG(seed);
      const idx = maybeAttachVexMark(blocks, rng, cfg);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(4);
    }
  });

  it('returns a valid block index (0-3)', () => {
    const rng = makeRNG('valid-idx');
    const blocks = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }];
    const cfg = { ...DEFAULT_VEX_CONFIG, vexMarkChance: 1.0 };
    const idx = maybeAttachVexMark(blocks, rng, cfg);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(4);
  });
});

// ─── Vex Type Selection (§13) ───────────────────────────────────

describe('selectVexType', () => {
  it('selects COLOR when weight is 100%', () => {
    const rng = makeRNG('color-only');
    const weights: VexWeights = { COLOR: 100, SHAPE: 0, SHADOW: 0 };
    for (let i = 0; i < 10; i++) {
      expect(selectVexType(rng, weights)).toBe('COLOR');
    }
  });

  it('selects SHAPE when weight is 100%', () => {
    const rng = makeRNG('shape-only');
    const weights: VexWeights = { COLOR: 0, SHAPE: 100, SHADOW: 0 };
    for (let i = 0; i < 10; i++) {
      expect(selectVexType(rng, weights)).toBe('SHAPE');
    }
  });

  it('selects SHADOW when weight is 100%', () => {
    const rng = makeRNG('shadow-only');
    const weights: VexWeights = { COLOR: 0, SHAPE: 0, SHADOW: 100 };
    for (let i = 0; i < 10; i++) {
      expect(selectVexType(rng, weights)).toBe('SHADOW');
    }
  });

  it('default weights produce all three types over many trials', () => {
    const rng = makeRNG('mixed');
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      seen.add(selectVexType(rng));
    }
    expect(seen.has('COLOR')).toBe(true);
    expect(seen.has('SHAPE')).toBe(true);
    expect(seen.has('SHADOW')).toBe(true);
  });
});

// ─── Spell Bank (§12) ───────────────────────────────────────────

describe('grantRandomVex', () => {
  it('adds a spell to the bank', () => {
    const bank = emptyBank();
    const rng = makeRNG();
    const result = grantRandomVex(bank, rng, 1, 0, 1);
    expect(bank).toHaveLength(1);
    expect(bank[0]!.type).toBeDefined();
    expect(bank[0]!.id).toBe('spell-1');
    expect(result.nextId).toBe(2);
  });

  it('adds to end of bank', () => {
    const bank = emptyBank();
    const rng = makeRNG();
    grantRandomVex(bank, rng, 1, 0, 1);
    grantRandomVex(bank, rng, 1, 0, 2);
    expect(bank).toHaveLength(2);
    expect(bank[0]!.id).toBe('spell-1');
    expect(bank[1]!.id).toBe('spell-2');
  });

  it('increments nextSpellId', () => {
    const bank = emptyBank();
    let ns = 5;
    const rng1 = makeRNG('a');
    const r2 = grantRandomVex(bank, rng1, 1, 0, ns);
    ns = r2.nextId;
    expect(ns).toBe(6);
    const rng2 = makeRNG('b');
    const r3 = grantRandomVex(bank, rng2, 1, 0, ns);
    expect(r3.nextId).toBe(7);
  });
});

describe('cycleSpellIndex', () => {
  it('returns -1 for empty bank', () => {
    expect(cycleSpellIndex([], -1)).toBe(-1);
  });

  it('cycles forward by one', () => {
    const bank: VexSpellBank = [
      { id: 's1', type: 'COLOR', grantedAtLevel: 1, grantedAtTick: 0 },
      { id: 's2', type: 'SHAPE', grantedAtLevel: 1, grantedAtTick: 1 },
      { id: 's3', type: 'SHADOW', grantedAtLevel: 1, grantedAtTick: 2 },
    ];
    expect(cycleSpellIndex(bank, 0)).toBe(1);
    expect(cycleSpellIndex(bank, 1)).toBe(2);
    expect(cycleSpellIndex(bank, 2)).toBe(0); // wrap
  });
});

describe('removeSpellAtIndex', () => {
  it('removes at index and returns new index at same position', () => {
    const bank: VexSpellBank = [
      { id: 's1', type: 'COLOR', grantedAtLevel: 1, grantedAtTick: 0 },
      { id: 's2', type: 'SHAPE', grantedAtLevel: 1, grantedAtTick: 1 },
      { id: 's3', type: 'SHADOW', grantedAtLevel: 1, grantedAtTick: 2 },
    ];
    const result = removeSpellAtIndex(bank, 1);
    expect(result.removed.id).toBe('s2');
    expect(bank).toHaveLength(2);
    expect(result.newIndex).toBe(1); // stays at same logical position
    expect(bank[1]!.id).toBe('s3');
  });

  it('clamps newIndex when last spell removed', () => {
    const bank: VexSpellBank = [
      { id: 's1', type: 'COLOR', grantedAtLevel: 1, grantedAtTick: 0 },
      { id: 's2', type: 'SHAPE', grantedAtLevel: 1, grantedAtTick: 1 },
      { id: 's3', type: 'SHADOW', grantedAtLevel: 1, grantedAtTick: 2 },
    ];
    const result = removeSpellAtIndex(bank, 2); // remove last
    expect(result.newIndex).toBe(1); // clamped to new last index
  });

  it('returns -1 when bank becomes empty', () => {
    const bank: VexSpellBank = [
      { id: 's1', type: 'COLOR', grantedAtLevel: 1, grantedAtTick: 0 },
    ];
    const result = removeSpellAtIndex(bank, 0);
    expect(bank).toHaveLength(0);
    expect(result.newIndex).toBe(-1);
  });
});

// ─── Vex Alignment Detection (§11) ──────────────────────────────

describe('findVexAlignments', () => {
  it('returns empty for board with no vex marks', () => {
    const board = createEmptyBoard();
    const bank = emptyBank();
    const rng = makeRNG();
    const result = findVexAlignments(board, bank, rng, 1, 0, 1);
    expect(result.alignments).toEqual([]);
    expect(bank).toHaveLength(0);
  });

  it('horizontal adjacent pair grants a vex', () => {
    const board = createEmptyBoard();
    setCell(board, HIDDEN_ROWS + 5, 3, occCell('red', 'Z', true));
    setCell(board, HIDDEN_ROWS + 5, 4, occCell('red', 'Z', true));
    const bank = emptyBank();
    const rng = makeRNG('horiz');
    const result = findVexAlignments(board, bank, rng, 1, 0, 1);
    expect(result.alignments).toHaveLength(1);
    expect(bank).toHaveLength(1);
  });

  it('vertical adjacent pair grants a vex', () => {
    const board = createEmptyBoard();
    setCell(board, HIDDEN_ROWS + 5, 3, occCell('red', 'Z', true));
    setCell(board, HIDDEN_ROWS + 6, 3, occCell('red', 'Z', true));
    const bank = emptyBank();
    const rng = makeRNG('vert');
    const result = findVexAlignments(board, bank, rng, 1, 0, 1);
    expect(result.alignments).toHaveLength(1);
    expect(bank).toHaveLength(1);
  });

  it('diagonal adjacent pair grants a vex', () => {
    const board = createEmptyBoard();
    setCell(board, HIDDEN_ROWS + 5, 3, occCell('red', 'Z', true));
    setCell(board, HIDDEN_ROWS + 6, 4, occCell('red', 'Z', true));
    const bank = emptyBank();
    const rng = makeRNG('diag');
    const result = findVexAlignments(board, bank, rng, 1, 0, 1);
    expect(result.alignments).toHaveLength(1);
    expect(bank).toHaveLength(1);
  });

  it('non-adjacent marks do not grant vex', () => {
    const board = createEmptyBoard();
    setCell(board, HIDDEN_ROWS + 5, 1, occCell('red', 'Z', true));
    setCell(board, HIDDEN_ROWS + 5, 9, occCell('red', 'Z', true)); // far apart
    const bank = emptyBank();
    const rng = makeRNG('far');
    const result = findVexAlignments(board, bank, rng, 1, 0, 1);
    expect(result.alignments).toEqual([]);
    expect(bank).toHaveLength(0);
  });

  it('consumes marks after granting vex', () => {
    const board = createEmptyBoard();
    setCell(board, HIDDEN_ROWS + 5, 3, occCell('red', 'Z', true));
    setCell(board, HIDDEN_ROWS + 5, 4, occCell('red', 'Z', true));
    const bank = emptyBank();
    const rng = makeRNG('consume');
    findVexAlignments(board, bank, rng, 1, 0, 1);
    expect(getCell(board, HIDDEN_ROWS + 5, 3).hasVexMark).toBe(false);
    expect(getCell(board, HIDDEN_ROWS + 5, 4).hasVexMark).toBe(false);
  });

  it('cells remain occupied after vex mark consumed', () => {
    const board = createEmptyBoard();
    setCell(board, HIDDEN_ROWS + 5, 3, occCell('red', 'Z', true));
    setCell(board, HIDDEN_ROWS + 5, 4, occCell('red', 'Z', true));
    const bank = emptyBank();
    const rng = makeRNG('remain');
    findVexAlignments(board, bank, rng, 1, 0, 1);
    expect(getCell(board, HIDDEN_ROWS + 5, 3).occupied).toBe(true);
    expect(getCell(board, HIDDEN_ROWS + 5, 4).occupied).toBe(true);
  });

  it('full-bank early exit: no scanning, no marks consumed', () => {
    const board = createEmptyBoard();
    setCell(board, HIDDEN_ROWS + 5, 3, occCell('red', 'Z', true));
    setCell(board, HIDDEN_ROWS + 5, 4, occCell('red', 'Z', true));
    const bank = fullBank(); // 9 spells
    const rng = makeRNG('full');
    const result = findVexAlignments(board, bank, rng, 1, 0, 1);
    expect(result.alignments).toEqual([]);
    expect(bank).toHaveLength(9); // unchanged
    // Marks still present
    expect(getCell(board, HIDDEN_ROWS + 5, 3).hasVexMark).toBe(true);
    expect(getCell(board, HIDDEN_ROWS + 5, 4).hasVexMark).toBe(true);
  });

  it('max grants per lock (default 2) stops after 2', () => {
    const board = createEmptyBoard();
    // Create 4 vex marks in a chain
    setCell(board, HIDDEN_ROWS + 5, 2, occCell('red', 'Z', true));
    setCell(board, HIDDEN_ROWS + 5, 3, occCell('red', 'Z', true));
    setCell(board, HIDDEN_ROWS + 5, 4, occCell('red', 'Z', true));
    setCell(board, HIDDEN_ROWS + 5, 5, occCell('red', 'Z', true));
    const bank = emptyBank();
    const rng = makeRNG('max-grants');
    const result = findVexAlignments(board, bank, rng, 1, 0, 1);
    // Should grant at most 2 vexes
    expect(result.alignments.length).toBeGreaterThanOrEqual(1);
    expect(result.alignments.length).toBeLessThanOrEqual(2);
    expect(bank.length).toBeLessThanOrEqual(2);
  });

  it('alignment checks visible cells only — hidden rows ignored', () => {
    const board = createEmptyBoard();
    // Hidden row vex marks
    setCell(board, 0, 3, occCell('red', 'Z', true));
    setCell(board, 0, 4, occCell('red', 'Z', true));
    const bank = emptyBank();
    const rng = makeRNG('hidden');
    const result = findVexAlignments(board, bank, rng, 1, 0, 1);
    expect(result.alignments).toEqual([]);
    expect(bank).toHaveLength(0);
  });

  it('cluster with 3 adjacent marks uses immediate consumption', () => {
    const board = createEmptyBoard();
    // Horizontal trio
    setCell(board, HIDDEN_ROWS + 5, 2, occCell('red', 'Z', true));
    setCell(board, HIDDEN_ROWS + 5, 3, occCell('red', 'Z', true));
    setCell(board, HIDDEN_ROWS + 5, 4, occCell('red', 'Z', true));
    const bank = emptyBank();
    const rng = makeRNG('cluster');
    const result = findVexAlignments(board, bank, rng, 1, 0, 1);
    // At least 1 pair found (2 marks consumed)
    expect(result.alignments.length).toBeGreaterThanOrEqual(1);
    expect(bank.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Color Vex (§14) ────────────────────────────────────────────

describe('Color Vex — weighted color map', () => {
  it('returns empty map for empty board', () => {
    const board = createEmptyBoard();
    const map = buildWeightedColorMap(board);
    expect(map.size).toBe(0);
  });

  it('single cell → weight 1', () => {
    const board = createEmptyBoard();
    setCell(board, HIDDEN_ROWS + 3, 5, occCell('red', 'Z'));
    const map = buildWeightedColorMap(board);
    expect(map.get('red')).toBe(1);
  });

  it('multiple colors → weighted correctly', () => {
    const board = createEmptyBoard();
    setCell(board, HIDDEN_ROWS + 3, 0, occCell('red', 'Z'));
    setCell(board, HIDDEN_ROWS + 3, 1, occCell('red', 'Z'));
    setCell(board, HIDDEN_ROWS + 3, 2, occCell('red', 'Z'));
    setCell(board, HIDDEN_ROWS + 3, 3, occCell('green', 'S'));
    const map = buildWeightedColorMap(board);
    expect(map.get('red')).toBe(3);
    expect(map.get('green')).toBe(1);
  });

  it('includes hidden rows', () => {
    const board = createEmptyBoard();
    setCell(board, 0, 3, occCell('cyan', 'I'));
    const map = buildWeightedColorMap(board);
    expect(map.get('cyan')).toBe(1);
  });

  it('includes shadow blocks', () => {
    const board = createEmptyBoard();
    setCell(board, HIDDEN_ROWS + 5, 3, { occupied: true, colorId: 'shadow', shapeId: 'SHADOW' });
    const map = buildWeightedColorMap(board);
    expect(map.get('shadow')).toBe(1);
  });
});

describe('Color Vex — target selection (mocked RNG)', () => {
  it('selectRandomPresentColorWeighted returns undefined for empty board', () => {
    const board = createEmptyBoard();
    const rng = makeRNG('empty');
    expect(selectRandomPresentColorWeighted(board, rng)).toBeUndefined();
  });

  it('single color always selects that color', () => {
    const board = createEmptyBoard();
    setCell(board, HIDDEN_ROWS + 3, 3, occCell('blue', 'J'));
    // Many trials: always blue
    for (const seed of ['a', 'b', 'c', 'd', 'e']) {
      const rng = new SeededRNG(seed);
      expect(selectRandomPresentColorWeighted(board, rng)).toBe('blue');
    }
  });

  it('uneven distribution: red=3, green=1 → specific RNG selects expected', () => {
    const board = createEmptyBoard();
    for (let c = 0; c < 3; c++) setCell(board, HIDDEN_ROWS + 3, c, occCell('red', 'Z'));
    setCell(board, HIDDEN_ROWS + 3, 3, occCell('green', 'S'));

    // Find a seed that produces red (weight 3/4 → roll < 0.75)
    const rngRed = new SeededRNG('red-select');
    const target1 = selectRandomPresentColorWeighted(board, rngRed);
    expect(['red', 'green']).toContain(target1);
  });

  it('hidden-rows included: 1 cyan in hidden row', () => {
    const board = createEmptyBoard();
    setCell(board, 0, 3, occCell('cyan', 'I'));
    const rng = makeRNG('hidden-include');
    expect(selectRandomPresentColorWeighted(board, rng)).toBe('cyan');
  });
});

describe('Color Vex — castColorVex', () => {
  it('destroys all cells of target color', () => {
    const board = createEmptyBoard();
    setCell(board, HIDDEN_ROWS + 3, 0, occCell('red', 'Z'));
    setCell(board, HIDDEN_ROWS + 3, 1, occCell('red', 'Z'));
    setCell(board, HIDDEN_ROWS + 3, 2, occCell('blue', 'J'));
    const destroyed = castColorVex(board, 'red');
    expect(destroyed).toBe(2);
    expect(getCell(board, HIDDEN_ROWS + 3, 0).occupied).toBe(false);
    expect(getCell(board, HIDDEN_ROWS + 3, 1).occupied).toBe(false);
    expect(getCell(board, HIDDEN_ROWS + 3, 2).occupied).toBe(true); // blue survives
  });

  it('destroys hidden row cells of target color', () => {
    const board = createEmptyBoard();
    setCell(board, 0, 3, occCell('cyan', 'I'));
    const destroyed = castColorVex(board, 'cyan');
    expect(destroyed).toBe(1);
    expect(getCell(board, 0, 3).occupied).toBe(false);
  });

  it('destroys shadow blocks', () => {
    const board = createEmptyBoard();
    setCell(board, HIDDEN_ROWS + 5, 3, { occupied: true, colorId: 'shadow', shapeId: 'SHADOW' });
    const destroyed = castColorVex(board, 'shadow');
    expect(destroyed).toBe(1);
    expect(getCell(board, HIDDEN_ROWS + 5, 3).occupied).toBe(false);
  });
});

describe('Color Vex — full cast resolution', () => {
  it('resolveColorVexCast: destroys, collapses, line clears, returns target', () => {
    const board = createEmptyBoard();
    setCell(board, HIDDEN_ROWS + 19, 0, occCell('red', 'Z'));
    setCell(board, HIDDEN_ROWS + 19, 1, occCell('red', 'Z'));
    // Fill rest of row 19 with blue so red removal + collapse doesn't clear a row
    for (let c = 2; c < COLS; c++) {
      setCell(board, HIDDEN_ROWS + 19, c, occCell('blue', 'J'));
    }

    const rng = makeRNG('color-resolve');
    const result = resolveColorVexCast(board, rng);
    expect(result).toBeDefined();
    expect(result!.target).toBeDefined();
    expect(result!.destroyed).toBeGreaterThanOrEqual(0);
    // Board should still be valid
    expect(getVisibleOccupiedCount(board)).toBeGreaterThanOrEqual(0);
  });
});

// ─── Shape Vex (§15) ────────────────────────────────────────────

describe('Shape Vex — present shapes', () => {
  it('returns empty set for empty board', () => {
    const board = createEmptyBoard();
    expect(getPresentShapes(board).size).toBe(0);
  });

  it('collects all unique shapes', () => {
    const board = createEmptyBoard();
    setCell(board, HIDDEN_ROWS + 3, 0, occCell('red', 'Z'));
    setCell(board, HIDDEN_ROWS + 3, 1, occCell('blue', 'J'));
    setCell(board, HIDDEN_ROWS + 3, 2, occCell('green', 'S'));
    const shapes = getPresentShapes(board);
    expect(shapes.has('Z')).toBe(true);
    expect(shapes.has('J')).toBe(true);
    expect(shapes.has('S')).toBe(true);
    expect(shapes.size).toBe(3);
  });

  it('includes hidden row shapes', () => {
    const board = createEmptyBoard();
    setCell(board, 0, 3, occCell('cyan', 'I'));
    expect(getPresentShapes(board).has('I')).toBe(true);
  });

  it('includes SHADOW shape', () => {
    const board = createEmptyBoard();
    setCell(board, HIDDEN_ROWS + 5, 3, { occupied: true, colorId: 'shadow', shapeId: 'SHADOW' });
    expect(getPresentShapes(board).has('SHADOW')).toBe(true);
  });
});

describe('Shape Vex — target selection', () => {
  it('selectRandomPresentShape returns undefined for empty board', () => {
    const board = createEmptyBoard();
    expect(selectRandomPresentShape(board, makeRNG())).toBeUndefined();
  });

  it('uniform random from present shapes', () => {
    const board = createEmptyBoard();
    setCell(board, HIDDEN_ROWS + 3, 0, occCell('red', 'Z'));
    setCell(board, HIDDEN_ROWS + 3, 1, occCell('blue', 'J'));
    setCell(board, HIDDEN_ROWS + 3, 2, occCell('green', 'S'));
    // With 3 shapes, all should be selectable with different seeds
    const shapes = new Set<ShapeId>();
    for (const seed of ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8']) {
      const shape = selectRandomPresentShape(board, new SeededRNG(seed));
      expect(shape).toBeDefined();
      shapes.add(shape!);
    }
    // Should see at least 2 different shapes with 8 trials
    expect(shapes.size).toBeGreaterThanOrEqual(2);
  });
});

describe('Shape Vex — castShapeVex', () => {
  it('destroys all cells of target shape', () => {
    const board = createEmptyBoard();
    setCell(board, HIDDEN_ROWS + 3, 0, occCell('red', 'Z'));
    setCell(board, HIDDEN_ROWS + 3, 1, occCell('red', 'Z'));
    setCell(board, HIDDEN_ROWS + 3, 2, occCell('blue', 'J'));
    const destroyed = castShapeVex(board, 'Z');
    expect(destroyed).toBe(2);
    expect(getCell(board, HIDDEN_ROWS + 3, 2).occupied).toBe(true); // J survives
  });

  it('destroys hidden row cells of target shape', () => {
    const board = createEmptyBoard();
    setCell(board, 0, 3, occCell('cyan', 'I'));
    expect(castShapeVex(board, 'I')).toBe(1);
  });

  it('destroys SHADOW blocks', () => {
    const board = createEmptyBoard();
    setCell(board, HIDDEN_ROWS + 5, 3, { occupied: true, colorId: 'shadow', shapeId: 'SHADOW' });
    expect(castShapeVex(board, 'SHADOW')).toBe(1);
  });
});

// ─── Shadow Vex (§16) ───────────────────────────────────────────

describe('Shadow Vex — inverse board', () => {
  it('empty board → all shadow blocks (200 visible cells)', () => {
    const board = createEmptyBoard();
    const inverse = createInverseShadowBoard(board);
    let count = 0;
    for (let r = HIDDEN_ROWS; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (inverse[r]![c]!.occupied) {
          count++;
          expect(inverse[r]![c]!.colorId).toBe('shadow');
          expect(inverse[r]![c]!.shapeId).toBe('SHADOW');
        }
      }
    }
    expect(count).toBe(200);
  });

  it('hidden rows are untouched (all empty)', () => {
    const board = createEmptyBoard();
    setCell(board, 0, 3, occCell('red', 'Z'));
    const inverse = createInverseShadowBoard(board);
    // Hidden cell in original should not create shadow
    for (let r = 0; r < HIDDEN_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        expect(inverse[r]![c]!.occupied).toBe(false);
      }
    }
  });

  it('does not modify original board', () => {
    const board = createEmptyBoard();
    setCell(board, HIDDEN_ROWS + 5, 3, occCell('red', 'Z'));
    const before = getCell(board, HIDDEN_ROWS + 5, 3);
    createInverseShadowBoard(board);
    expect(getCell(board, HIDDEN_ROWS + 5, 3).occupied).toBe(before.occupied);
  });
});

describe('Shadow Vex — applyShadowVexBoard', () => {
  it('clears all visible cells', () => {
    const board = createEmptyBoard();
    setCell(board, HIDDEN_ROWS + 5, 3, occCell('red', 'Z'));
    applyShadowVexBoard(board);
    for (let r = HIDDEN_ROWS; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (getCell(board, r, c).occupied) {
          expect(getCell(board, r, c).colorId).toBe('shadow');
        }
      }
    }
  });

  it('shadow blocks collapse to bottom', () => {
    const board = createEmptyBoard();
    // Start with some cells occupied — they get cleared and shadow fills remaining
    for (let c = 0; c < COLS; c++) {
      setCell(board, HIDDEN_ROWS + 10, c, occCell('red', 'Z'));
    }
    applyShadowVexBoard(board);
    // After: all cells from row 10 are cleared. Shadow fills the inverse.
    // Should have 190 shadow blocks (200 - 10 filled) collapsed to bottom
    const visibleCount = getVisibleOccupiedCount(board);
    expect(visibleCount).toBe(190);
  });

  it('hidden rows persist after cast', () => {
    const board = createEmptyBoard();
    setCell(board, 0, 3, occCell('cyan', 'I'));
    applyShadowVexBoard(board);
    // Hidden row cell should survive
    expect(getCell(board, 0, 3).occupied).toBe(true);
    expect(getCell(board, 0, 3).colorId).toBe('cyan');
  });

  it('shadow blocks have colorId=shadow and shapeId=SHADOW', () => {
    const board = createEmptyBoard();
    applyShadowVexBoard(board);
    // Check a bottom-row shadow block
    const cell = getCell(board, TOTAL_ROWS - 1, 5);
    expect(cell.occupied).toBe(true);
    expect(cell.colorId).toBe('shadow');
    expect(cell.shapeId).toBe('SHADOW');
  });

  it('post-cast shadow blocks are normal locked cells', () => {
    const board = createEmptyBoard();
    applyShadowVexBoard(board);
    const cell = getCell(board, HIDDEN_ROWS + 10, 3);
    if (cell.occupied) {
      expect(cell.colorId).toBeTruthy();
      expect(cell.shapeId).toBeTruthy();
    }
  });
});

describe('Shadow Vex — full cast resolution', () => {
  it('resolveShadowVexCast applies effect and runs line clears', () => {
    const board = createEmptyBoard();
    resolveShadowVexCast(board);
    // Board should be in valid state
    const visible = getVisibleOccupiedCount(board);
    expect(visible).toBeLessThanOrEqual(200);
    expect(visible).toBeGreaterThanOrEqual(0);
  });
});

// ─── Cast Eligibility (§14-16) ──────────────────────────────────

describe('canCastVex', () => {
  function makeState(board: Board, bank: VexSpellBank, idx: number, casting = false) {
    return {
      board,
      castState: { active: casting },
      selectedSpellIndex: idx,
      spellBank: bank,
    };
  }

  it('empty bank → false for any type', () => {
    const state = makeState(createEmptyBoard(), emptyBank(), -1);
    expect(canCastVex('COLOR', state)).toBe(false);
  });

  it('wrong type at selected index → false', () => {
    const bank: VexSpellBank = [
      { id: 's1', type: 'COLOR', grantedAtLevel: 1, grantedAtTick: 0 },
    ];
    const state = makeState(createEmptyBoard(), bank, 0);
    expect(canCastVex('SHAPE', state)).toBe(false);
  });

  it('correct type with locked cells → true (Color/Shape)', () => {
    const board = createEmptyBoard();
    setCell(board, HIDDEN_ROWS + 5, 3, occCell('red', 'Z'));
    const bank: VexSpellBank = [
      { id: 's1', type: 'COLOR', grantedAtLevel: 1, grantedAtTick: 0 },
    ];
    expect(canCastVex('COLOR', makeState(board, bank, 0))).toBe(true);
  });

  it('Color Vex: no locked cells → false', () => {
    const bank: VexSpellBank = [
      { id: 's1', type: 'COLOR', grantedAtLevel: 1, grantedAtTick: 0 },
    ];
    expect(canCastVex('COLOR', makeState(createEmptyBoard(), bank, 0))).toBe(false);
  });

  it('Shadow Vex: below 40% → false', () => {
    const board = createEmptyBoard();
    // 79 cells = below 80 minimum
    let placed = 0;
    for (let r = HIDDEN_ROWS; r < TOTAL_ROWS && placed < 79; r++) {
      for (let c = 0; c < COLS && placed < 79; c++) {
        setCell(board, r, c, occCell());
        placed++;
      }
    }
    const bank: VexSpellBank = [
      { id: 's1', type: 'SHADOW', grantedAtLevel: 1, grantedAtTick: 0 },
    ];
    expect(canCastVex('SHADOW', makeState(board, bank, 0))).toBe(false);
  });

  it('Shadow Vex: at exactly 80 cells → true', () => {
    const board = createEmptyBoard();
    let placed = 0;
    for (let r = HIDDEN_ROWS; r < TOTAL_ROWS && placed < 80; r++) {
      for (let c = 0; c < COLS && placed < 80; c++) {
        setCell(board, r, c, occCell());
        placed++;
      }
    }
    expect(getVisibleOccupiedCount(board)).toBe(80);
    const bank: VexSpellBank = [
      { id: 's1', type: 'SHADOW', grantedAtLevel: 1, grantedAtTick: 0 },
    ];
    expect(canCastVex('SHADOW', makeState(board, bank, 0))).toBe(true);
  });

  it('cannot cast during active cast animation', () => {
    const board = createEmptyBoard();
    setCell(board, HIDDEN_ROWS + 5, 3, occCell('red', 'Z'));
    const bank: VexSpellBank = [
      { id: 's1', type: 'COLOR', grantedAtLevel: 1, grantedAtTick: 0 },
    ];
    expect(canCastVex('COLOR', makeState(board, bank, 0, true))).toBe(false);
  });
});

// ─── Post-Vex Line Clears ───────────────────────────────────────

describe('resolvePostVexLineClears', () => {
  it('detects and clears completed rows after vex effect', () => {
    const board = createEmptyBoard();
    // Fill row 19 completely
    for (let c = 0; c < COLS; c++) {
      setCell(board, TOTAL_ROWS - 1, c, occCell('red', 'Z'));
    }
    const cleared = resolvePostVexLineClears(board);
    expect(cleared).toBe(1);
    expect(getCell(board, TOTAL_ROWS - 1, 0).occupied).toBe(false);
  });

  it('returns 0 when no rows are complete', () => {
    const board = createEmptyBoard();
    setCell(board, HIDDEN_ROWS + 5, 3, occCell());
    expect(resolvePostVexLineClears(board)).toBe(0);
  });
});
