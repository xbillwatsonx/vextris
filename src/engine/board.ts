/**
 * Vextris — Board Model
 *
 * Board stored as board[row][col]: totalRows rows × COLS columns.
 * arrayRow = y + hiddenRows (hiddenRows = 2).
 * Visible board: array rows hiddenRows..(totalRows-1) (logical y 0..19).
 * Hidden spawn rows: array rows 0..(hiddenRows-1) (logical y negative).
 *
 * v0.3 — Phase 1 implementation.
 */

/** Standard board dimensions (spec §7, §23) */
export const COLS = 10;
export const TOTAL_ROWS = 22;
export const HIDDEN_ROWS = 2;
export const VISIBLE_ROWS = TOTAL_ROWS - HIDDEN_ROWS; // 20

/** Visible cell count: 10 × 20 = 200 (spec §16) */
export const VISIBLE_CELL_COUNT = COLS * VISIBLE_ROWS;

// ─── Types (§23) ────────────────────────────────────────────────

export type ShapeId = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L' | 'SHADOW';
export type ColorId = 'cyan' | 'gold' | 'violet' | 'green' | 'red' | 'blue' | 'orange' | 'shadow';

export interface Cell {
  occupied: boolean;
  colorId?: ColorId;
  shapeId?: ShapeId;
  hasVexMark?: boolean;
}

/**
 * Full board is board[row][col] where:
 *   - row 0..(HIDDEN_ROWS-1): hidden spawn rows
 *   - row HIDDEN_ROWS..(TOTAL_ROWS-1): visible rows
 *   - col 0..(COLS-1): all columns
 *
 * board[row][col] is a Cell. The array is row-major: board[0] is row 0 (top hidden row).
 */
export type Board = Cell[][];

// ─── Factory ────────────────────────────────────────────────────

/**
 * Creates an empty board: totalRows × COLS, every cell unoccupied.
 * Returns board[row][col] — row-major 2D array.
 */
export function createEmptyBoard(
  cols: number = COLS,
  totalRows: number = TOTAL_ROWS,
): Board {
  const board: Board = [];
  for (let r = 0; r < totalRows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({ occupied: false });
    }
    board.push(row);
  }
  return board;
}

// ─── Coordinate Conversion (§7) ─────────────────────────────────

/**
 * Converts a logical y-coordinate to the internal array row index.
 *   logicalToArrayRow(0)  → hiddenRows  (first visible row)
 *   logicalToArrayRow(-1) → hiddenRows - 1 (top hidden row)
 */
export function logicalToArrayRow(y: number, hiddenRows: number = HIDDEN_ROWS): number {
  return y + hiddenRows;
}

/**
 * Converts an internal array row index to a logical y-coordinate.
 *   arrayToLogicalRow(hiddenRows)     → 0
 *   arrayToLogicalRow(hiddenRows - 1) → -1
 */
export function arrayToLogicalRow(row: number, hiddenRows: number = HIDDEN_ROWS): number {
  return row - hiddenRows;
}

// ─── Cell Access ────────────────────────────────────────────────

/**
 * Returns the Cell at board[row][col].
 * Throws if indices are out of bounds.
 */
export function getCell(board: Board, row: number, col: number): Cell {
  if (row < 0 || row >= board.length) {
    throw new Error(`Row ${row} out of bounds (0..${board.length - 1})`);
  }
  if (col < 0 || col >= COLS) {
    throw new Error(`Col ${col} out of bounds (0..${COLS - 1})`);
  }
  return board[row]![col]!;
}

/**
 * Sets the Cell at board[row][col]. Mutates the board in place.
 * Throws if indices are out of bounds.
 */
export function setCell(board: Board, row: number, col: number, cell: Cell): void {
  if (row < 0 || row >= board.length) {
    throw new Error(`Row ${row} out of bounds (0..${board.length - 1})`);
  }
  if (col < 0 || col >= COLS) {
    throw new Error(`Col ${col} out of bounds (0..${COLS - 1})`);
  }
  board[row]![col] = cell;
}

// ─── Bounds Checks (§25) ────────────────────────────────────────

/**
 * Returns true for array rows HIDDEN_ROWS..(TOTAL_ROWS-1) and cols 0..(COLS-1).
 * Visible board occupies rows 2..21, logical y 0..19.
 */
export function isInsideVisibleBoard(row: number, col: number): boolean {
  return row >= HIDDEN_ROWS && row < TOTAL_ROWS && col >= 0 && col < COLS;
}

/**
 * Returns true for array rows 0..(TOTAL_ROWS-1) and cols 0..(COLS-1).
 * Total board includes hidden spawn rows.
 */
export function isInsideTotalBoard(row: number, col: number): boolean {
  return row >= 0 && row < TOTAL_ROWS && col >= 0 && col < COLS;
}

// ─── Occupancy Counts (§25) ─────────────────────────────────────

/**
 * Counts occupied cells in visible rows only (HIDDEN_ROWS..TOTAL_ROWS-1).
 */
export function getVisibleOccupiedCount(board: Board): number {
  let count = 0;
  for (let r = HIDDEN_ROWS; r < TOTAL_ROWS; r++) {
    const row = board[r]!;
    for (let c = 0; c < COLS; c++) {
      if (row[c]!.occupied) count++;
    }
  }
  return count;
}

/**
 * Counts occupied cells in ALL rows (0..TOTAL_ROWS-1), including hidden spawn rows.
 */
export function getTotalOccupiedCount(board: Board): number {
  let count = 0;
  for (let r = 0; r < TOTAL_ROWS; r++) {
    const row = board[r]!;
    for (let c = 0; c < COLS; c++) {
      if (row[c]!.occupied) count++;
    }
  }
  return count;
}

/**
 * Returns visible fill fraction: getVisibleOccupiedCount / VISIBLE_CELL_COUNT.
 * Returns a number in [0, 1].
 */
export function getVisibleFillPercent(board: Board): number {
  return getVisibleOccupiedCount(board) / VISIBLE_CELL_COUNT;
}

// ─── Clone ──────────────────────────────────────────────────────

/**
 * Deep-clones the board. The returned board shares no Cell references
 * with the original.
 */
export function cloneBoard(board: Board): Board {
  return board.map(row => row.map(cell => ({ ...cell })));
}

// ─── Piece Locking & Row Operations (§25) ───────────────────────

/**
 * Locks a piece onto the board by writing its cells as occupied.
 * Each cell stores the piece's colorId and shapeId.
 * Mutates the board in place.
 *
 * @param board - The locked board
 * @param blocks - The 4 block offsets in the piece's current rotation
 * @param origin - Logical (x, y) origin of the piece
 * @param colorId - Color of the locking piece
 * @param shapeId - Shape of the locking piece
 */
export function lockPiece(
  board: Board,
  blocks: { x: number; y: number }[],
  origin: { x: number; y: number },
  colorId: ColorId,
  shapeId: ShapeId,
): void {
  for (const block of blocks) {
    const arrayRow = logicalToArrayRow(origin.y + block.y);
    const col = origin.x + block.x;
    if (isInsideTotalBoard(arrayRow, col)) {
      board[arrayRow]![col] = {
        occupied: true,
        colorId,
        shapeId,
        hasVexMark: false,
      };
    }
  }
}

/**
 * Finds completed (full) visible rows.
 * Returns an array of array row indexes (HIDDEN_ROWS..TOTAL_ROWS-1)
 * where every column is occupied.
 */
export function findCompletedRows(board: Board): number[] {
  const completed: number[] = [];
  for (let r = HIDDEN_ROWS; r < TOTAL_ROWS; r++) {
    const row = board[r]!;
    let full = true;
    for (let c = 0; c < COLS; c++) {
      if (!row[c]!.occupied) {
        full = false;
        break;
      }
    }
    if (full) {
      completed.push(r);
    }
  }
  return completed;
}

/**
 * Clears the specified rows by array row index.
 * Also removes vex marks from cleared cells per spec §7.
 * Mutates the board in place.
 */
export function clearRows(board: Board, rowIndexes: number[]): void {
  for (const r of rowIndexes) {
    for (let c = 0; c < COLS; c++) {
      board[r]![c] = { occupied: false };
    }
  }
}

/**
 * Applies gravity collapse across the total board (rows 0..TOTAL_ROWS-1).
 * For each column independently: all occupied cells fall to the lowest
 * available positions, preserving relative top-to-bottom order.
 * Mutates the board in place.
 */
export function collapseColumns(board: Board): void {
  for (let c = 0; c < COLS; c++) {
    // Collect occupied cells top-to-bottom
    const occupied: Cell[] = [];
    for (let r = 0; r < TOTAL_ROWS; r++) {
      if (board[r]![c]!.occupied) {
        occupied.push(board[r]![c]!);
      }
    }
    // Clear the column
    for (let r = 0; r < TOTAL_ROWS; r++) {
      board[r]![c] = { occupied: false };
    }
    // Place occupied cells from bottom up, preserving order
    for (let i = 0; i < occupied.length; i++) {
      const placeRow = TOTAL_ROWS - occupied.length + i;
      board[placeRow]![c] = occupied[i]!;
    }
  }
}
