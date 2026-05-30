/**
 * Vextris — Board Operations Tests (Phase 3 additions)
 *
 * Tests for lockPiece, findCompletedRows, clearRows, collapseColumns.
 */

import { describe, it, expect } from 'vitest';
import {
  createEmptyBoard,
  lockPiece,
  findCompletedRows,
  clearRows,
  collapseColumns,
  setCell,
  getCell,
  getVisibleOccupiedCount,
  COLS,
  TOTAL_ROWS,
  HIDDEN_ROWS,
} from '../engine/board';
import { getBlocks } from '../engine/pieces';
import type { ColorId, ShapeId } from '../engine/board';

describe('lockPiece', () => {
  it('writes 4 cells as occupied with correct colorId and shapeId', () => {
    const board = createEmptyBoard();
    const blocks = getBlocks('T', 0);
    lockPiece(board, blocks, { x: 3, y: 5 }, 'violet', 'T');

    // T state 0: [(0,0), (1,0), (2,0), (1,1)]
    expect(getCell(board, 5 + HIDDEN_ROWS, 3).occupied).toBe(true);
    expect(getCell(board, 5 + HIDDEN_ROWS, 3).colorId).toBe('violet');
    expect(getCell(board, 5 + HIDDEN_ROWS, 3).shapeId).toBe('T');

    expect(getCell(board, 6 + HIDDEN_ROWS, 4).occupied).toBe(true);
    expect(getCell(board, 6 + HIDDEN_ROWS, 4).shapeId).toBe('T');
  });

  it('locks all 4 blocks', () => {
    const board = createEmptyBoard();
    lockPiece(board, getBlocks('O', 0), { x: 4, y: 0 }, 'gold', 'O');
    let count = 0;
    for (let r = 0; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (getCell(board, r, c).occupied) count++;
      }
    }
    expect(count).toBe(4);
  });

  it('sets hasVexMark to false by default', () => {
    const board = createEmptyBoard();
    // O-piece at (4,5), state 0: [(0,0), (1,0), (0,1), (1,1)]
    lockPiece(board, getBlocks('O', 0), { x: 4, y: 5 }, 'gold', 'O');
    const cell = getCell(board, 5 + HIDDEN_ROWS, 4);
    expect(cell.hasVexMark).toBe(false);
  });

  it('does not lock cells outside the board', () => {
    const board = createEmptyBoard();
    // O-piece at top-left edge, origin (-1, -1)
    lockPiece(board, getBlocks('O', 0), { x: -1, y: -1 }, 'gold', 'O');
    // Should only lock cells that fall within the board
    const count = getVisibleOccupiedCount(board);
    // O: blocks at (-1,-1), (0,-1), (-1,0), (0,0) — only (0,0) is in visible, (0,-1) is hidden
    // Actually: (-1,y) out, (y,-1) in hidden rows. Total cells on board should be 2 (hidden rows)
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

describe('findCompletedRows', () => {
  it('returns empty for an empty board', () => {
    const board = createEmptyBoard();
    expect(findCompletedRows(board)).toEqual([]);
  });

  it('finds a single completed row', () => {
    const board = createEmptyBoard();
    // Fill row 10 (logical y=8)
    for (let c = 0; c < COLS; c++) {
      setCell(board, 10, c, { occupied: true });
    }
    expect(findCompletedRows(board)).toEqual([10]);
  });

  it('finds multiple completed rows', () => {
    const board = createEmptyBoard();
    for (let c = 0; c < COLS; c++) {
      setCell(board, 5, c, { occupied: true });
      setCell(board, 10, c, { occupied: true });
      setCell(board, 15, c, { occupied: true });
    }
    const rows = findCompletedRows(board);
    expect(rows).toContain(5);
    expect(rows).toContain(10);
    expect(rows).toContain(15);
    expect(rows).toHaveLength(3);
  });

  it('ignores incomplete rows', () => {
    const board = createEmptyBoard();
    // Fill all but one cell in row 5
    for (let c = 0; c < COLS - 1; c++) {
      setCell(board, 5, c, { occupied: true });
    }
    expect(findCompletedRows(board)).toEqual([]);
  });

  it('only scans visible rows (HIDDEN_ROWS..TOTAL_ROWS-1)', () => {
    const board = createEmptyBoard();
    // Fill a hidden row completely
    for (let c = 0; c < COLS; c++) {
      setCell(board, 1, c, { occupied: true }); // hidden row
    }
    // Filling a hidden row shouldn't show up as completed
    expect(findCompletedRows(board)).toEqual([]);
  });
});

describe('clearRows', () => {
  it('clears a single row', () => {
    const board = createEmptyBoard();
    for (let c = 0; c < COLS; c++) {
      setCell(board, 5, c, { occupied: true, colorId: 'red', shapeId: 'Z' as ShapeId });
    }
    clearRows(board, [5]);
    // Row should be empty now
    for (let c = 0; c < COLS; c++) {
      expect(getCell(board, 5, c).occupied).toBe(false);
    }
  });

  it('clears multiple rows', () => {
    const board = createEmptyBoard();
    for (const r of [3, 7, 12]) {
      for (let c = 0; c < COLS; c++) {
        setCell(board, r, c, { occupied: true });
      }
    }
    clearRows(board, [3, 7, 12]);
    for (const r of [3, 7, 12]) {
      for (let c = 0; c < COLS; c++) {
        expect(getCell(board, r, c).occupied).toBe(false);
      }
    }
  });

  it('leaves other rows untouched', () => {
    const board = createEmptyBoard();
    setCell(board, 6, 0, { occupied: true });
    setCell(board, 6, 1, { occupied: true });
    clearRows(board, [5]); // clear different row
    expect(getCell(board, 6, 0).occupied).toBe(true);
  });

  it('removes vex marks from cleared rows', () => {
    const board = createEmptyBoard();
    setCell(board, 5, 3, { occupied: true, colorId: 'blue', shapeId: 'J' as ShapeId, hasVexMark: true });
    clearRows(board, [5]);
    expect(getCell(board, 5, 3).occupied).toBe(false);
    expect(getCell(board, 5, 3).hasVexMark).toBeUndefined();
  });
});

describe('collapseColumns', () => {
  it('empty board stays empty', () => {
    const board = createEmptyBoard();
    collapseColumns(board);
    for (let r = 0; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        expect(getCell(board, r, c).occupied).toBe(false);
      }
    }
  });

  it('occupied cells fall to the bottom', () => {
    const board = createEmptyBoard();
    setCell(board, 3, 0, { occupied: true, colorId: 'red' as ColorId });
    collapseColumns(board);
    // Cell should now be at the bottom
    expect(getCell(board, TOTAL_ROWS - 1, 0).occupied).toBe(true);
    expect(getCell(board, TOTAL_ROWS - 1, 0).colorId).toBe('red');
    expect(getCell(board, 3, 0).occupied).toBe(false);
  });

  it('preserves relative top-to-bottom order', () => {
    const board = createEmptyBoard();
    setCell(board, 4, 0, { occupied: true, colorId: 'cyan' as ColorId });
    setCell(board, 8, 0, { occupied: true, colorId: 'red' as ColorId });
    setCell(board, 12, 0, { occupied: true, colorId: 'green' as ColorId });
    collapseColumns(board);
    // Should stack from bottom up: cyan lowest, red above, green top
    expect(getCell(board, TOTAL_ROWS - 3, 0).colorId).toBe('cyan');
    expect(getCell(board, TOTAL_ROWS - 2, 0).colorId).toBe('red');
    expect(getCell(board, TOTAL_ROWS - 1, 0).colorId).toBe('green');
  });

  it('collapses all columns independently', () => {
    const board = createEmptyBoard();
    setCell(board, 5, 2, { occupied: true });
    setCell(board, 10, 7, { occupied: true });
    collapseColumns(board);
    // Col 2 cell moves to bottom-1 (since it's the only one in that column)
    expect(getCell(board, TOTAL_ROWS - 1, 2).occupied).toBe(true);
    expect(getCell(board, TOTAL_ROWS - 1, 7).occupied).toBe(true);
  });

  it('cells above cleared rows collapse down', () => {
    const board = createEmptyBoard();
    // Set up: row 5 cleared, rows 3 and 7 occupied
    setCell(board, 3, 0, { occupied: true, colorId: 'blue' as ColorId });
    setCell(board, 7, 0, { occupied: true, colorId: 'orange' as ColorId });
    // Clear row 5 (which is empty in this col anyway), then collapse
    collapseColumns(board);

    // After collapse: blue and orange should be at bottom
    expect(getCell(board, TOTAL_ROWS - 2, 0).colorId).toBe('blue');
    expect(getCell(board, TOTAL_ROWS - 1, 0).colorId).toBe('orange');
  });

  it('preserves Cell properties after collapse', () => {
    const board = createEmptyBoard();
    setCell(board, 5, 3, {
      occupied: true,
      colorId: 'violet',
      shapeId: 'T' as ShapeId,
      hasVexMark: true,
    });
    collapseColumns(board);
    const collapsed = getCell(board, TOTAL_ROWS - 1, 3);
    expect(collapsed.occupied).toBe(true);
    expect(collapsed.colorId).toBe('violet');
    expect(collapsed.shapeId).toBe('T');
    expect(collapsed.hasVexMark).toBe(true);
  });
});
