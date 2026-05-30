/**
 * Vextris — Rotation System (§8, Appendix A.3)
 *
 * Wall-kick rotation with vex mark remapping for clockwise
 * and counterclockwise rotation of the active piece.
 *
 * Imported by gameLoop.ts. No circular dependency — all
 * rotation-specific helpers are self-contained here.
 */

import type { Board } from './board';
import {
  getBlocks,
  collides,
  rotateClockwise,
  rotateCounterclockwise,
  getKicks,
  calculateGhostPosition,
} from './pieces';
import type { Block, Origin, RotationState } from './pieces';
import type { GameState, ActivePiece, GhostPiece } from './gameLoop';
import { LOCK_RESET_LIMIT } from '../config/gameConfig';

// ─── Internal helpers ───────────────────────────────────────────

/** Build ghost piece for the given active piece */
function buildGhost(piece: ActivePiece, board: Board): GhostPiece {
  const ghostOrigin = calculateGhostPosition(piece.blocks, piece.origin, board);
  return {
    shapeId: piece.shapeId,
    colorId: piece.colorId,
    rotationState: piece.rotationState,
    origin: ghostOrigin,
    blocks: piece.blocks, // same rotation blocks
  };
}

/** Reset lock delay timer if the piece is grounded and under reset limit */
function resetLockIfGrounded(state: GameState): void {
  const piece = state.activePiece!;
  const below: Origin = { x: piece.origin.x, y: piece.origin.y + 1 };

  if (collides(piece.blocks, below, state.board)) {
    // Piece is grounded — reset lock delay if under limit
    if (state.lockResetCount < LOCK_RESET_LIMIT) {
      state.lockDelayTimerMs = 0;
      state.lockResetCount++;
    }
  }
}

// ─── Rotation ───────────────────────────────────────────────────

/**
 * Attempts rotation (clockwise or counterclockwise) with wall kicks.
 * Returns true if rotation succeeded.
 */
export function tryRotate(state: GameState, newState: RotationState): boolean {
  const piece = state.activePiece!;
  const kicks = getKicks(piece.rotationState, newState, piece.shapeId);
  const newBlocks = getBlocks(piece.shapeId, newState);

  // Capture the marked cell's absolute world position before rotation.
  // After rotation + kick, we find which new block lands closest to it.
  const markWorld = piece.vexMarkBlockIndex != null
    ? {
        x: piece.origin.x + piece.blocks[piece.vexMarkBlockIndex]!.x,
        y: piece.origin.y + piece.blocks[piece.vexMarkBlockIndex]!.y,
      }
    : null;

  for (const kick of kicks) {
    // kick.dy positive = up = subtract from logical y (Appendix A.3)
    const kickOrigin: Origin = {
      x: piece.origin.x + kick.dx,
      y: piece.origin.y - kick.dy,
    };

    if (!collides(newBlocks, kickOrigin, state.board)) {
      const oldState = piece.rotationState;
      piece.origin = kickOrigin;
      piece.rotationState = newState;
      piece.blocks = newBlocks;

      // Remap vex mark: find which new block lands closest to the old
      // marked cell's world position (accounting for the kick shift).
      if (markWorld != null && piece.vexMarkBlockIndex != null) {
        if (piece.shapeId === 'O') {
          // O-piece cells are identical across rotations, so world-position
          // remapping would always find the same cell. Cycle the mark through
          // the 4 cells manually. CW: 0→1→3→2→0  CCW: 0→2→3→1→0
          const isCW = newState === rotateClockwise(oldState);
          const cwMap  = [1, 3, 0, 2] as const;
          const ccwMap = [2, 0, 3, 1] as const;
          piece.vexMarkBlockIndex =
            (isCW ? cwMap : ccwMap)[piece.vexMarkBlockIndex]!;
        } else {
          let bestIdx = 0;
          let bestDist = Infinity;
          for (let i = 0; i < newBlocks.length; i++) {
            const bx = piece.origin.x + newBlocks[i]!.x;
            const by = piece.origin.y + newBlocks[i]!.y;
            const dist = Math.abs(bx - markWorld.x) + Math.abs(by - markWorld.y);
            if (dist < bestDist) { bestDist = dist; bestIdx = i; }
          }
          piece.vexMarkBlockIndex = bestIdx;
        }
      }

      state.ghostPiece = buildGhost(piece, state.board);
      resetLockIfGrounded(state);
      return true;
    }
  }
  return false;
}

/** Clockwise rotation of the active piece. */
export function rotateCW(state: GameState): boolean {
  if (!state.activePiece || state.status !== 'PLAYING') return false;
  return tryRotate(state, rotateClockwise(state.activePiece.rotationState));
}

/** Counterclockwise rotation of the active piece. */
export function rotateCCW(state: GameState): boolean {
  if (!state.activePiece || state.status !== 'PLAYING') return false;
  return tryRotate(state, rotateCounterclockwise(state.activePiece.rotationState));
}
