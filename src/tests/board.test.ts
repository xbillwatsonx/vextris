/**
 * Vextris — Board Foundation Tests (Phase 1)
 *
 * Tests for the core board data structures: board storage, coordinate
 * conversion, cell access, bounds checking, occupancy count, fill
 * percent, and board cloning.
 *
 * Spec references: §7, §23, §25
 */

import { describe, it, expect } from 'vitest';
import {
  createEmptyBoard,
  logicalToArrayRow,
  arrayToLogicalRow,
  getCell,
  setCell,
  isInsideVisibleBoard,
  isInsideTotalBoard,
  getVisibleOccupiedCount,
  getTotalOccupiedCount,
  getVisibleFillPercent,
  cloneBoard,
  COLS,
  TOTAL_ROWS,
  HIDDEN_ROWS,
  VISIBLE_ROWS,
  VISIBLE_CELL_COUNT,
} from '../engine/board';
import type { Board, Cell } from '../engine/board';

// ─── Helpers ─────────────────────────────────────────────────────

/** Counts total rows in a board (safety check) */
function rowCount(board: Board): number {
  return board.length;
}

/** Counts total cols in a board row (safety check) */
function colCount(board: Board): number {
  return board[0]!.length;
}

// ─── board[row][col] Storage ─────────────────────────────────────

describe('board[row][col] storage', () => {
  it('has TOTAL_ROWS rows (22)', () => {
    const board = createEmptyBoard();
    expect(rowCount(board)).toBe(TOTAL_ROWS);
  });

  it('has COLS columns per row (10)', () => {
    const board = createEmptyBoard();
    for (let r = 0; r < TOTAL_ROWS; r++) {
      expect(colCount(board)).toBe(COLS);
    }
  });

  it('every cell is initialized unoccupied with no color, shape, or vex mark', () => {
    const board = createEmptyBoard();
    for (let r = 0; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = board[r]![c]!;
        expect(cell.occupied).toBe(false);
        expect(cell.colorId).toBeUndefined();
        expect(cell.shapeId).toBeUndefined();
        expect(cell.hasVexMark).toBeUndefined();
      }
    }
  });

  it('is row-major: board[0] is topmost hidden row, board[21] is bottom visible row', () => {
    const board = createEmptyBoard();
    // First row of cells are all unoccupied (hidden spawn zone)
    expect(board[0]![0]!.occupied).toBe(false);
    // Last row of cells are all unoccupied (playfield floor)
    expect(board[21]![0]!.occupied).toBe(false);
  });
});

// ─── createEmptyBoard ────────────────────────────────────────────

describe('createEmptyBoard', () => {
  it('creates a board with default dimensions (22 rows × 10 cols)', () => {
    const board = createEmptyBoard();
    expect(board.length).toBe(TOTAL_ROWS);
    expect(board[0]!.length).toBe(COLS);
  });

  it('every board from createEmptyBoard is a fresh instance', () => {
    const a = createEmptyBoard();
    const b = createEmptyBoard();
    setCell(a, 2, 3, { occupied: true });
    expect(getCell(b, 2, 3).occupied).toBe(false);
  });

  it('accepts custom dimensions', () => {
    const board = createEmptyBoard(8, 24, 3);
    expect(board.length).toBe(24);
    expect(board[0]!.length).toBe(8);
  });

  it('custom hiddenRows does not affect board dimensions (only used externally)', () => {
    const board = createEmptyBoard(10, 22, 5);
    expect(board.length).toBe(22);
    expect(board[0]!.length).toBe(10);
  });
});

// ─── Coordinate Conversion ───────────────────────────────────────

describe('logicalToArrayRow', () => {
  it('maps logical y=0 to array row HIDDEN_ROWS (2)', () => {
    expect(logicalToArrayRow(0)).toBe(HIDDEN_ROWS);
  });

  it('maps logical y=-1 to array row 1 (top hidden row)', () => {
    expect(logicalToArrayRow(-1)).toBe(1);
  });

  it('maps logical y=-2 to array row 0 (topmost row)', () => {
    expect(logicalToArrayRow(-2)).toBe(0);
  });

  it('maps logical y=19 (last visible row) to array row 21 (bottom)', () => {
    expect(logicalToArrayRow(19)).toBe(21);
  });

  it('accepts custom hiddenRows', () => {
    expect(logicalToArrayRow(0, 3)).toBe(3);
    expect(logicalToArrayRow(-1, 3)).toBe(2);
  });
});

describe('arrayToLogicalRow', () => {
  it('maps array row 2 (HIDDEN_ROWS) to logical y=0', () => {
    expect(arrayToLogicalRow(2)).toBe(0);
  });

  it('maps array row 1 to logical y=-1', () => {
    expect(arrayToLogicalRow(1)).toBe(-1);
  });

  it('maps array row 0 to logical y=-2', () => {
    expect(arrayToLogicalRow(0)).toBe(-2);
  });

  it('maps array row 21 (bottom) to logical y=19', () => {
    expect(arrayToLogicalRow(21)).toBe(19);
  });

  it('is the inverse of logicalToArrayRow for visible rows', () => {
    for (let y = 0; y < VISIBLE_ROWS; y++) {
      expect(arrayToLogicalRow(logicalToArrayRow(y))).toBe(y);
    }
  });

  it('is the inverse of logicalToArrayRow for hidden rows', () => {
    for (let y = -2; y < 0; y++) {
      expect(arrayToLogicalRow(logicalToArrayRow(y))).toBe(y);
    }
  });
});

// ─── Cell Access ─────────────────────────────────────────────────

describe('getCell', () => {
  const board = createEmptyBoard();

  it('returns an unoccupied cell for an empty board position', () => {
    const cell = getCell(board, 5, 3);
    expect(cell.occupied).toBe(false);
  });

  it('returns the correct cell after setCell', () => {
    const b = createEmptyBoard();
    setCell(b, 10, 4, { occupied: true, colorId: 'cyan' });
    const cell = getCell(b, 10, 4);
    expect(cell.occupied).toBe(true);
    expect(cell.colorId).toBe('cyan');
  });

  it('throws on negative row', () => {
    expect(() => getCell(board, -1, 0)).toThrow('Row -1 out of bounds');
  });

  it('throws on row >= TOTAL_ROWS', () => {
    expect(() => getCell(board, 22, 0)).toThrow('Row 22 out of bounds');
  });

  it('throws on negative col', () => {
    expect(() => getCell(board, 0, -1)).toThrow('Col -1 out of bounds');
  });

  it('throws on col >= COLS', () => {
    expect(() => getCell(board, 0, 10)).toThrow('Col 10 out of bounds');
  });
});

describe('setCell', () => {
  it('mutates the cell in place', () => {
    const board = createEmptyBoard();
    setCell(board, 15, 7, { occupied: true, colorId: 'red', hasVexMark: true });
    const cell = board[15]![7]!;
    expect(cell.occupied).toBe(true);
    expect(cell.colorId).toBe('red');
    expect(cell.hasVexMark).toBe(true);
  });

  it('overwrites an already-occupied cell', () => {
    const board = createEmptyBoard();
    setCell(board, 10, 5, { occupied: true, colorId: 'blue' });
    setCell(board, 10, 5, { occupied: false });
    expect(getCell(board, 10, 5).occupied).toBe(false);
  });

  it('throws on out-of-bounds row', () => {
    const board = createEmptyBoard();
    expect(() => setCell(board, 22, 0, { occupied: true })).toThrow();
  });

  it('throws on out-of-bounds col', () => {
    const board = createEmptyBoard();
    expect(() => setCell(board, 0, 10, { occupied: true })).toThrow();
  });
});

// ─── Bounds Checks ───────────────────────────────────────────────

describe('isInsideVisibleBoard', () => {
  it('returns true for first visible row, first column', () => {
    expect(isInsideVisibleBoard(HIDDEN_ROWS, 0)).toBe(true);
  });

  it('returns true for last visible row, last column', () => {
    expect(isInsideVisibleBoard(TOTAL_ROWS - 1, COLS - 1)).toBe(true);
  });

  it('returns false for row 0 (hidden)', () => {
    expect(isInsideVisibleBoard(0, 0)).toBe(false);
  });

  it('returns false for row 1 (hidden)', () => {
    expect(isInsideVisibleBoard(1, 0)).toBe(false);
  });

  it('returns false for row >= TOTAL_ROWS', () => {
    expect(isInsideVisibleBoard(22, 5)).toBe(false);
  });

  it('returns false for negative row', () => {
    expect(isInsideVisibleBoard(-1, 5)).toBe(false);
  });

  it('returns false for negative col', () => {
    expect(isInsideVisibleBoard(10, -1)).toBe(false);
  });

  it('returns false for col >= COLS', () => {
    expect(isInsideVisibleBoard(10, 10)).toBe(false);
  });

  it('accepts every visible cell (row 2..21, col 0..9)', () => {
    for (let r = HIDDEN_ROWS; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        expect(isInsideVisibleBoard(r, c)).toBe(true);
      }
    }
  });
});

describe('isInsideTotalBoard', () => {
  it('returns true for row 0, col 0 (top hidden row)', () => {
    expect(isInsideTotalBoard(0, 0)).toBe(true);
  });

  it('returns true for row 1, col 0 (bottom hidden row)', () => {
    expect(isInsideTotalBoard(1, 0)).toBe(true);
  });

  it('returns true for last row, last col', () => {
    expect(isInsideTotalBoard(TOTAL_ROWS - 1, COLS - 1)).toBe(true);
  });

  it('returns false for row >= TOTAL_ROWS', () => {
    expect(isInsideTotalBoard(22, 0)).toBe(false);
  });

  it('returns false for negative row', () => {
    expect(isInsideTotalBoard(-1, 0)).toBe(false);
  });

  it('returns false for negative col', () => {
    expect(isInsideTotalBoard(5, -1)).toBe(false);
  });

  it('returns false for col >= COLS', () => {
    expect(isInsideTotalBoard(5, 10)).toBe(false);
  });

  it('total board contains hidden rows that visible board rejects', () => {
    // Row 0 is in total board but not visible board
    expect(isInsideTotalBoard(0, 5)).toBe(true);
    expect(isInsideVisibleBoard(0, 5)).toBe(false);
  });
});

// ─── Occupancy Counts ────────────────────────────────────────────

describe('getVisibleOccupiedCount', () => {
  it('returns 0 for an empty board', () => {
    expect(getVisibleOccupiedCount(createEmptyBoard())).toBe(0);
  });

  it('counts occupied cells only in visible rows (HIDDEN_ROWS..TOTAL_ROWS-1)', () => {
    const board = createEmptyBoard();
    // Occupy a cell in a visible row
    setCell(board, 10, 3, { occupied: true });
    // Occupy a cell in a hidden row — should NOT be counted
    setCell(board, 0, 3, { occupied: true });
    setCell(board, 1, 3, { occupied: true });

    expect(getVisibleOccupiedCount(board)).toBe(1);
  });

  it('counts all occupied cells in visible area', () => {
    const board = createEmptyBoard();
    // Occupy 3 cells in visible rows
    setCell(board, HIDDEN_ROWS, 0, { occupied: true });
    setCell(board, 10, 5, { occupied: true });
    setCell(board, TOTAL_ROWS - 1, COLS - 1, { occupied: true });

    expect(getVisibleOccupiedCount(board)).toBe(3);
  });

  it('matches VISIBLE_CELL_COUNT when board is completely full (visible)', () => {
    const board = createEmptyBoard();
    for (let r = HIDDEN_ROWS; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        setCell(board, r, c, { occupied: true });
      }
    }
    expect(getVisibleOccupiedCount(board)).toBe(VISIBLE_CELL_COUNT);
    expect(getVisibleOccupiedCount(board)).toBe(200);
  });
});

describe('getTotalOccupiedCount', () => {
  it('returns 0 for an empty board', () => {
    expect(getTotalOccupiedCount(createEmptyBoard())).toBe(0);
  });

  it('counts occupied cells in hidden rows as well', () => {
    const board = createEmptyBoard();
    setCell(board, 0, 3, { occupied: true }); // hidden row
    setCell(board, 1, 4, { occupied: true }); // hidden row
    setCell(board, 10, 5, { occupied: true }); // visible row

    expect(getTotalOccupiedCount(board)).toBe(3);
  });

  it('equals visible count when hidden rows are empty', () => {
    const board = createEmptyBoard();
    setCell(board, HIDDEN_ROWS, 0, { occupied: true });
    setCell(board, 15, 9, { occupied: true });

    expect(getTotalOccupiedCount(board)).toBe(2);
    expect(getVisibleOccupiedCount(board)).toBe(2);
  });

  it('is always >= visible count', () => {
    const board = createEmptyBoard();
    setCell(board, 0, 0, { occupied: true }); // hidden only
    expect(getTotalOccupiedCount(board)).toBeGreaterThanOrEqual(
      getVisibleOccupiedCount(board)
    );
  });
});

// ─── Fill Percent ────────────────────────────────────────────────

describe('getVisibleFillPercent', () => {
  it('returns 0.0 for an empty board', () => {
    expect(getVisibleFillPercent(createEmptyBoard())).toBe(0);
  });

  it('returns exactly 1.0 for a completely full visible board', () => {
    const board = createEmptyBoard();
    for (let r = HIDDEN_ROWS; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        setCell(board, r, c, { occupied: true });
      }
    }
    expect(getVisibleFillPercent(board)).toBe(1);
  });

  it('returns 0.01 for exactly 2 cells occupied (2/200)', () => {
    const board = createEmptyBoard();
    setCell(board, HIDDEN_ROWS, 0, { occupied: true });
    setCell(board, HIDDEN_ROWS, 1, { occupied: true });
    expect(getVisibleFillPercent(board)).toBe(0.01);
  });

  it('hidden row occupancy does not affect visible fill percent', () => {
    const board = createEmptyBoard();
    // Fill all hidden rows
    for (let r = 0; r < HIDDEN_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        setCell(board, r, c, { occupied: true });
      }
    }
    expect(getVisibleFillPercent(board)).toBe(0);
  });

  it('returns a number in [0, 1] for any random occupancy', () => {
    const board = createEmptyBoard();
    // Place some random cells
    setCell(board, 3, 2, { occupied: true });
    setCell(board, 7, 8, { occupied: true });
    setCell(board, 12, 4, { occupied: true });
    const pct = getVisibleFillPercent(board);
    expect(pct).toBeGreaterThanOrEqual(0);
    expect(pct).toBeLessThanOrEqual(1);
  });
});

// ─── Clone Board ─────────────────────────────────────────────────

describe('cloneBoard', () => {
  it('produces a board with the same dimensions', () => {
    const original = createEmptyBoard();
    const clone = cloneBoard(original);
    expect(clone.length).toBe(original.length);
    expect(clone[0]!.length).toBe(original[0]!.length);
  });

  it('copies cell state accurately', () => {
    const original = createEmptyBoard();
    setCell(original, 5, 5, {
      occupied: true,
      colorId: 'violet',
      shapeId: 'T',
      hasVexMark: true,
    });
    const clone = cloneBoard(original);
    const cell = clone[5]![5]!;
    expect(cell.occupied).toBe(true);
    expect(cell.colorId).toBe('violet');
    expect(cell.shapeId).toBe('T');
    expect(cell.hasVexMark).toBe(true);
  });

  it('does not share cell references with the original', () => {
    const original = createEmptyBoard();
    setCell(original, 10, 3, { occupied: true, colorId: 'red' });
    const clone = cloneBoard(original);

    // Mutate clone, original must not be affected
    setCell(clone, 10, 3, { occupied: false });
    expect(getCell(original, 10, 3).occupied).toBe(true);
  });

  it('does not share row references with the original', () => {
    const original = createEmptyBoard();
    const clone = cloneBoard(original);

    setCell(clone, 8, 2, { occupied: true });
    expect(getCell(original, 8, 2).occupied).toBe(false);
  });

  it('cloning an empty board produces all unoccupied cells', () => {
    const original = createEmptyBoard();
    const clone = cloneBoard(original);

    for (let r = 0; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        expect(clone[r]![c]!.occupied).toBe(false);
      }
    }
  });

  it('occupancy counts match after clone', () => {
    const original = createEmptyBoard();
    setCell(original, 5, 0, { occupied: true });
    setCell(original, 10, 3, { occupied: true });
    setCell(original, 15, 7, { occupied: true });

    const clone = cloneBoard(original);
    expect(getVisibleOccupiedCount(clone)).toBe(getVisibleOccupiedCount(original));
    expect(getTotalOccupiedCount(clone)).toBe(getTotalOccupiedCount(original));
  });
});

// ─── Constants ───────────────────────────────────────────────────

describe('board constants', () => {
  it('COLS = 10', () => expect(COLS).toBe(10));
  it('TOTAL_ROWS = 22', () => expect(TOTAL_ROWS).toBe(22));
  it('HIDDEN_ROWS = 2', () => expect(HIDDEN_ROWS).toBe(2));
  it('VISIBLE_ROWS = 20', () => expect(VISIBLE_ROWS).toBe(20));
  it('VISIBLE_CELL_COUNT = 200', () => expect(VISIBLE_CELL_COUNT).toBe(200));
});
