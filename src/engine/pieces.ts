/**
 * Vextris — Piece Definitions
 *
 * Tetromino shapes, rotation states, spawn origins, wall kicks,
 * collision detection, and ghost piece calculation.
 *
 * Spec references: §8, §9, §25, Appendix A
 */

import type { ShapeId, ColorId, Board } from './board';
import {
  logicalToArrayRow,
  isInsideTotalBoard,
} from './board';

// ─── Types ──────────────────────────────────────────────────────

/** A local block offset relative to piece origin */
export interface Block {
  x: number;
  y: number;
}

/** Kick offset: dx in columns, dy in rows (positive = up) */
export interface Kick {
  dx: number;
  dy: number;
}

/** Piece origin: logical x, logical y */
export interface Origin {
  x: number;
  y: number;
}

/** Rotation states are 0..3 */
export type RotationState = number;

/** Shape definition: 4 rotation states, each with 4 blocks */
type ShapeData = [Block[], Block[], Block[], Block[]];

// ─── Color Mapping (§8) ─────────────────────────────────────────

export const COLOR_MAP: Record<ShapeId, ColorId> = {
  I: 'cyan',
  O: 'gold',
  T: 'violet',
  S: 'green',
  Z: 'red',
  J: 'blue',
  L: 'orange',
  SHADOW: 'shadow',
};

/** Returns the color for a given shape */
export function getColor(shapeId: ShapeId): ColorId {
  return COLOR_MAP[shapeId];
}

// ─── Shape Definitions (Appendix A.1) ────────────────────────────

/**
 * SHAPES[shapeId][rotationState] → array of 4 {x, y} block offsets.
 * x: right-positive, y: down-positive (logical coordinates).
 */
export const SHAPES: Record<ShapeId, ShapeData> = {
  I: [
    // State 0: [(0,1), (1,1), (2,1), (3,1)]
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }],
    // State 1: [(2,0), (2,1), (2,2), (2,3)]
    [{ x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }],
    // State 2: [(0,2), (1,2), (2,2), (3,2)]
    [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }],
    // State 3: [(1,0), (1,1), (1,2), (1,3)]
    [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }],
  ],
  O: [
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
  ],
  T: [
    // State 0: [(0,0), (1,0), (2,0), (1,1)]
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }],
    // State 1: [(1,0), (0,1), (1,1), (1,2)]
    [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
    // State 2: [(1,0), (0,1), (1,1), (2,1)]
    [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    // State 3: [(0,0), (0,1), (1,1), (0,2)]
    [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 2 }],
  ],
  S: [
    // State 0: [(1,0), (2,0), (0,1), (1,1)]
    [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    // State 1: [(1,0), (1,1), (2,1), (2,2)]
    [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }],
    // State 2: [(1,1), (2,1), (0,2), (1,2)]
    [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
    // State 3: [(0,0), (0,1), (1,1), (1,2)]
    [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
  ],
  Z: [
    // State 0: [(0,0), (1,0), (1,1), (2,1)]
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    // State 1: [(2,0), (1,1), (2,1), (1,2)]
    [{ x: 2, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }],
    // State 2: [(0,1), (1,1), (1,2), (2,2)]
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }],
    // State 3: [(1,0), (0,1), (1,1), (0,2)]
    [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 2 }],
  ],
  J: [
    // State 0: [(0,0), (0,1), (1,1), (2,1)]
    [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    // State 1: [(1,0), (2,0), (1,1), (1,2)]
    [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
    // State 2: [(0,1), (1,1), (2,1), (2,2)]
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }],
    // State 3: [(1,0), (1,1), (0,2), (1,2)]
    [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
  ],
  L: [
    // State 0: [(2,0), (0,1), (1,1), (2,1)]
    [{ x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    // State 1: [(1,0), (1,1), (1,2), (2,2)]
    [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }],
    // State 2: [(0,1), (1,1), (2,1), (0,2)]
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 0, y: 2 }],
    // State 3: [(0,0), (1,0), (1,1), (1,2)]
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
  ],
  // SHADOW is for shadow blocks after Shadow Vex — not a real tetromino
  SHADOW: [
    [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
    [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
    [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
    [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
  ],
};

/** All 7 playable tetromino shape IDs */
const ALL_SHAPE_IDS: ShapeId[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export function getAllShapeIds(): ShapeId[] {
  return ALL_SHAPE_IDS;
}

/**
 * Returns the 4 block offsets for a given shape and rotation state.
 */
export function getBlocks(shapeId: ShapeId, rotationState: RotationState): Block[] {
  return SHAPES[shapeId][rotationState] as Block[];
}

// ─── Rotation Helpers (§8, Appendix A.4) ────────────────────────

/** Clockwise: +1 (mod 4) */
export function rotateClockwise(state: RotationState): RotationState {
  return (state + 1) % 4;
}

/** Counterclockwise: -1 (mod 4) */
export function rotateCounterclockwise(state: RotationState): RotationState {
  return (state + 3) % 4;
}

// ─── Spawn Origins (Appendix A.2) ───────────────────────────────

export const SPAWN_ORIGINS: Record<ShapeId, Origin> = {
  I: { x: 3, y: 0 },
  O: { x: 4, y: 0 },
  T: { x: 3, y: 0 },
  S: { x: 3, y: 0 },
  Z: { x: 3, y: 0 },
  J: { x: 3, y: 0 },
  L: { x: 3, y: 0 },
  SHADOW: { x: 0, y: 0 },
};

// ─── Wall Kick Data (Appendix A.3) ───────────────────────────────

/**
 * JLSZT kicks: 5 offsets per transition (from→to where to = (from+1)%4 clockwise).
 * Stored as fromState→direction where 'cw' = clockwise, 'ccw' = counterclockwise.
 */
const JLSZT_KICKS_CW: Kick[][] = [
  // 0→1
  [{ dx: 0, dy: 0 }, { dx: -1, dy: 0 }, { dx: -1, dy: 1 }, { dx: 0, dy: -2 }, { dx: -1, dy: -2 }],
  // 1→2
  [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 1, dy: -1 }, { dx: 0, dy: 2 }, { dx: 1, dy: 2 }],
  // 2→3
  [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 1, dy: 1 }, { dx: 0, dy: -2 }, { dx: 1, dy: -2 }],
  // 3→0
  [{ dx: 0, dy: 0 }, { dx: -1, dy: 0 }, { dx: -1, dy: -1 }, { dx: 0, dy: 2 }, { dx: -1, dy: 2 }],
];

const I_KICKS_CW: Kick[][] = [
  // 0→1
  [{ dx: 0, dy: 0 }, { dx: -2, dy: 0 }, { dx: 1, dy: 0 }, { dx: -2, dy: -1 }, { dx: 1, dy: 2 }],
  // 1→2
  [{ dx: 0, dy: 0 }, { dx: -1, dy: 0 }, { dx: 2, dy: 0 }, { dx: -1, dy: 2 }, { dx: 2, dy: -1 }],
  // 2→3
  [{ dx: 0, dy: 0 }, { dx: 2, dy: 0 }, { dx: -1, dy: 0 }, { dx: 2, dy: 1 }, { dx: -1, dy: -2 }],
  // 3→0
  [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: -2, dy: 0 }, { dx: 1, dy: -2 }, { dx: -2, dy: 1 }],
];

/**
 * Returns the kick offsets for a transition from `fromState` to `toState`.
 *
 * Clockwise: uses the CW table directly.
 * Counterclockwise: negates dx of the clockwise reverse transition.
 * O-piece: always returns [(0,0)].
 */
export function getKicks(
  fromState: RotationState,
  toState: RotationState,
  shapeId: ShapeId,
): Kick[] {
  if (shapeId === 'O') {
    return [{ dx: 0, dy: 0 }];
  }

  const isClockwise = toState === rotateClockwise(fromState);

  if (shapeId === 'I') {
    if (isClockwise) {
      return I_KICKS_CW[fromState]!;
    } else {
      // Counterclockwise: negate dx of the clockwise reverse transition
      // fromState → toState ccw is the reverse of toState → fromState cw
      return I_KICKS_CW[toState]!.map(k => ({ dx: -k.dx, dy: k.dy }));
    }
  }

  // J, L, S, Z, T
  if (isClockwise) {
    return JLSZT_KICKS_CW[fromState]!;
  } else {
    return JLSZT_KICKS_CW[toState]!.map(k => ({ dx: -k.dx, dy: k.dy }));
  }
}

// ─── Collision Detection (§25) ──────────────────────────────────

/**
 * Returns true if placing the piece at the given origin would cause a collision.
 *
 * A collision occurs when any block:
 *   - Falls outside the total board (rows 0..21, cols 0..9), OR
 *   - Overlaps an occupied locked cell
 *
 * @param blocks - The 4 block offsets for the piece in its current rotation
 * @param origin - Logical (x, y) position of the piece origin
 * @param board - The locked board
 */
export function collides(blocks: Block[], origin: Origin, board: Board): boolean {
  for (const block of blocks) {
    const col = origin.x + block.x;
    const logicalY = origin.y + block.y;

    // Check total board bounds (includes hidden spawn rows)
    if (!isInsideTotalBoard(logicalToArrayRow(logicalY), col)) {
      return true;
    }

    // Check if cell is occupied
    const arrayRow = logicalToArrayRow(logicalY);
    if (board[arrayRow]![col]!.occupied) {
      return true;
    }
  }
  return false;
}

// ─── Ghost Piece Calculation (§9, §25) ──────────────────────────

/**
 * Returns the lowest legal origin for the ghost piece by dropping
 * the piece one row at a time until collision.
 *
 * The ghost x position always matches the origin x.
 * The ghost does not interact with collision for the active piece
 * and does not count as occupied cells.
 */
export function calculateGhostPosition(
  blocks: Block[],
  origin: Origin,
  board: Board,
): Origin {
  let ghostY = origin.y;

  // Drop one row at a time until collision
  while (true) {
    const nextY = ghostY + 1;
    const nextOrigin: Origin = { x: origin.x, y: nextY };

    if (collides(blocks, nextOrigin, board)) {
      break;
    }

    ghostY = nextY;
  }

  return { x: origin.x, y: ghostY };
}
