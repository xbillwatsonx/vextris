/**
 * Vextris — Game Loop (§4, §7-8, §18-19, §23-24)
 *
 * Orchestrates spawning, gravity, lock delay, hard drop,
 * line clearing, scoring, leveling, combo tracking,
 * vex mark spawning, alignment detection, and spell casting.
 */

import type { Board, ShapeId } from './board';
import {
  createEmptyBoard,
  lockPiece as boardLockPiece,
  findCompletedRows,
  clearRows,
  collapseColumns,
  COLS,
  TOTAL_ROWS,
  HIDDEN_ROWS,
} from './board';
import {
  getBlocks,
  getColor,
  SPAWN_ORIGINS,
  collides,
  calculateGhostPosition,
} from './pieces';
import type { Origin } from './pieces';
import { SeededRNG, createBag } from './random';
import {
  LOCK_DELAY_MS,
  LOCK_RESET_LIMIT,
  STARTING_LEVEL,
  NEXT_QUEUE_SIZE,
  getGravityInterval,
  getLevel,
  getLineClearScore,
  getDropScore,
  SCORE_VEX_ALIGNMENT,
  SCORE_VEX_CELL_DESTROYED,
  SCORE_SHADOW_VEX,
} from '../config/gameConfig';
import {
  maybeAttachVexMark,
  findVexAlignments,
  cycleSpellIndex,
  removeSpellAtIndex,
  canCastVex,
  resolveColorVexCast,
  resolveShapeVexCast,
  resolveShadowVexCast,
} from './vex';
import {
  playSound,
} from '../audio/audioManager';
import type { AudioEvent } from '../audio/audioManager';

// Local type imports (used in function signatures)
import type {
  ActivePiece,
  GhostPiece,
  GameState,
} from './types';

// Re-export rotation functions (implemented in rotation.ts)
export { rotateCW, rotateCCW } from './rotation';

// Re-export shared types
export type {
  ActivePiece,
  GhostPiece,
  VexSpell,
  GameStatus,
  GameState,
} from './types';

// ─── Factory ────────────────────────────────────────────────────

let pieceIdCounter = 0;

function nextPieceId(): string {
  return `p${++pieceIdCounter}`;
}

/**
 * Creates a fresh game state in READY status.
 * Board is empty, no active piece, next queue unpopulated.
 */
export function createGameState(seed: string): GameState {
  const rng = new SeededRNG(seed);
  return {
    board: createEmptyBoard(),
    activePiece: undefined,
    ghostPiece: undefined,
    nextQueue: [],
    spellBank: [],
    selectedSpellIndex: -1,
    score: 0,
    level: STARTING_LEVEL,
    linesCleared: 0,
    comboCount: 0,
    status: 'READY',
    gravityTimerMs: 0,
    lockDelayTimerMs: 0,
    lockResetCount: 0,
    gameTick: 0,
    rngSeed: seed,
    rngState: rng.state,
    pieceBag: [],
    pieceBagIndex: 0,
    nextSpellId: 1,
  };
}

// ─── RNG Access ─────────────────────────────────────────────────

function getRNG(state: GameState): SeededRNG {
  // Reconstruct RNG from saved state (for reproducibility)
  return Object.assign(new SeededRNG(state.rngSeed), { _state: state.rngState });
}

function saveRNG(state: GameState, rng: SeededRNG): void {
  state.rngState = rng.state;
}

// ─── Next Queue / Bag Management (§8) ───────────────────────────

/**
 * Draws one shape from the 7-bag. Refills and reshuffles when exhausted.
 */
function drawFromBag(state: GameState, rng: SeededRNG): ShapeId {
  if (state.pieceBagIndex >= state.pieceBag.length) {
    state.pieceBag = createBag(rng);
    state.pieceBagIndex = 0;
  }
  const shape = state.pieceBag[state.pieceBagIndex]!;
  state.pieceBagIndex++;
  return shape;
}

/**
 * Fills the next queue to at least NEXT_QUEUE_SIZE items.
 */
function fillNextQueue(state: GameState, rng: SeededRNG): void {
  while (state.nextQueue.length < NEXT_QUEUE_SIZE) {
    state.nextQueue.push(drawFromBag(state, rng));
  }
}

// ─── Piece Spawning (§8, Appendix A.2) ──────────────────────────

/**
 * Creates an ActivePiece from a shape ID, placed at its spawn origin.
 */
export function createActivePiece(shapeId: ShapeId): ActivePiece {
  return {
    id: nextPieceId(),
    shapeId,
    colorId: getColor(shapeId),
    rotationState: 0,
    origin: { ...SPAWN_ORIGINS[shapeId] },
    blocks: getBlocks(shapeId, 0),
  };
}

/**
 * Spawns a piece: draws from the queue, creates active piece, updates ghost.
 * Returns false if the spawn position is blocked (game over).
 */
export function spawnPiece(state: GameState, rng: SeededRNG): boolean {
  fillNextQueue(state, rng);
  const shapeId = state.nextQueue.shift()!;
  fillNextQueue(state, rng); // maintain queue size

  const piece = createActivePiece(shapeId);

  // Maybe attach vex mark (§10)
  const markIndex = maybeAttachVexMark(piece.blocks, rng);
  if (markIndex !== undefined) {
    piece.vexMarkBlockIndex = markIndex;
    playSound('vex_mark_spawn');
  }

  // Check spawn collision
  if (collides(piece.blocks, piece.origin, state.board)) {
    state.activePiece = undefined;
    state.ghostPiece = undefined;
    return false; // game over
  }

  state.activePiece = piece;
  state.ghostPiece = buildGhost(piece, state.board);
  state.lockDelayTimerMs = 0;
  state.lockResetCount = 0;
  return true;
}

// ─── Ghost Piece (§9) ───────────────────────────────────────────

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

// ─── Game Start ─────────────────────────────────────────────────

/**
 * Starts the game: transitions from READY to PLAYING, spawns first piece.
 * Returns true if successful, false if initial spawn is blocked.
 */
export function startGame(state: GameState): boolean {
  if (state.status !== 'READY') return false;

  const rng = getRNG(state);
  state.status = 'PLAYING';
  const ok = spawnPiece(state, rng);
  saveRNG(state, rng);

  if (!ok) {
    state.status = 'GAME_OVER';
  }
  return ok;
}

// ─── Movement ───────────────────────────────────────────────────

/**
 * Moves the active piece left by one column. Returns true if move succeeded.
 */
export function moveLeft(state: GameState): boolean {
  if (!state.activePiece || state.status !== 'PLAYING') return false;

  const piece = state.activePiece;
  const newOrigin: Origin = { x: piece.origin.x - 1, y: piece.origin.y };

  if (!collides(piece.blocks, newOrigin, state.board)) {
    piece.origin = newOrigin;
    state.ghostPiece = buildGhost(piece, state.board);
    resetLockIfGrounded(state);
    return true;
  }
  return false;
}

/**
 * Moves the active piece right by one column. Returns true if move succeeded.
 */
export function moveRight(state: GameState): boolean {
  if (!state.activePiece || state.status !== 'PLAYING') return false;

  const piece = state.activePiece;
  const newOrigin: Origin = { x: piece.origin.x + 1, y: piece.origin.y };

  if (!collides(piece.blocks, newOrigin, state.board)) {
    piece.origin = newOrigin;
    state.ghostPiece = buildGhost(piece, state.board);
    resetLockIfGrounded(state);
    return true;
  }
  return false;
}

/**
 * Soft drop: moves piece down one row. Awards score per cell.
 */
export function softDrop(state: GameState): boolean {
  if (!state.activePiece || state.status !== 'PLAYING') return false;

  const piece = state.activePiece;
  const newOrigin: Origin = { x: piece.origin.x, y: piece.origin.y + 1 };

  if (!collides(piece.blocks, newOrigin, state.board)) {
    piece.origin = newOrigin;
    state.ghostPiece = buildGhost(piece, state.board);
    state.score += getDropScore(1, false);
    return true;
  }
  return false;
}

/**
 * Hard drop: instantly places piece at ghost position, locks, and resolves.
 */
export function hardDrop(state: GameState): void {
  if (!state.activePiece || state.status !== 'PLAYING') return;

  const piece = state.activePiece;
  const ghostOrigin = calculateGhostPosition(piece.blocks, piece.origin, state.board);
  const cellsDropped = ghostOrigin.y - piece.origin.y;

  // Move to ghost position
  piece.origin = ghostOrigin;

  // Score the drop
  state.score += getDropScore(cellsDropped, true);

  // Lock immediately (no lock delay)
  lockAndResolve(state);
}

// ─── Lock Delay (§19) ──────────────────────────────────────────

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

// ─── Gravity & Lock Resolution ──────────────────────────────────

/**
 * Advances the game by deltaMs. Handles gravity and lock delay.
 * Returns status after tick.
 */
export function tick(state: GameState, deltaMs: number): void {
  if (state.status !== 'PLAYING' || !state.activePiece) return;

  state.gameTick++;

  const gravityInterval = getGravityInterval(state.level);

  // Gravity: handle multiple ticks when tab was backgrounded
  state.gravityTimerMs += deltaMs;
  while (state.gravityTimerMs >= gravityInterval) {
    state.gravityTimerMs -= gravityInterval;

    const piece = state.activePiece;
    const below: Origin = { x: piece.origin.x, y: piece.origin.y + 1 };
    if (!collides(piece.blocks, below, state.board)) {
      piece.origin.y++;
      state.ghostPiece = buildGhost(piece, state.board);
    } else {
      break; // stop gravity when grounded
    }
  }

  // Lock delay: check if piece is grounded
  const piece = state.activePiece;
  const grounded: Origin = { x: piece.origin.x, y: piece.origin.y + 1 };
  if (collides(piece.blocks, grounded, state.board)) {
    state.lockDelayTimerMs += deltaMs;
    if (state.lockDelayTimerMs >= LOCK_DELAY_MS) {
      lockAndResolve(state);
    }
  } else {
    state.lockDelayTimerMs = 0;
  }
}

/**
 * Locks the active piece, resolves line clears, scores, spawns next piece.
 */
export function lockAndResolve(state: GameState): void {
  if (!state.activePiece) return;

  const piece = state.activePiece;

  // Lock piece onto board, preserving any vex mark
  boardLockPiece(state.board, piece.blocks, piece.origin, piece.colorId, piece.shapeId);

  // Transfer vex mark from active piece to locked cell
  if (piece.vexMarkBlockIndex !== undefined) {
    const block = piece.blocks[piece.vexMarkBlockIndex]!;
    const arrayRow = (piece.origin.y + block.y) + HIDDEN_ROWS;
    const col = piece.origin.x + block.x;
    if (arrayRow >= 0 && arrayRow < TOTAL_ROWS && col >= 0 && col < COLS) {
      state.board[arrayRow]![col]!.hasVexMark = true;
    }
  }

  // Find and clear completed rows
  const completedRows = findCompletedRows(state.board);
  const linesCleared = completedRows.length;

  if (linesCleared > 0) {
    playSound('line_clear');
    clearRows(state.board, completedRows);
    collapseColumns(state.board);

    // Score
    state.score += getLineClearScore(linesCleared, state.comboCount, state.level);

    // Combo
    state.comboCount += 1;
    if (state.comboCount > 1) {
      playSound('combo');
    }
  } else {
    // Reset combo on non-clearing lock
    state.comboCount = 0;
  }

  // Vex alignment detection (§11) — runs after line clears resolve
  const rng = getRNG(state);
  const alignResult = findVexAlignments(
    state.board,
    state.spellBank,
    rng,
    state.level,
    state.gameTick,
    state.nextSpellId,
  );
  state.nextSpellId = alignResult.nextSpellId;

  // Score vex alignment grants
  if (alignResult.alignments.length > 0) {
    state.score += SCORE_VEX_ALIGNMENT * state.level * alignResult.alignments.length;
    playSound('vex_alignment');
  }

  // Set selectedSpellIndex if newly granted and bank was empty
  if (state.spellBank.length > 0 && state.selectedSpellIndex < 0) {
    state.selectedSpellIndex = 0;
  }

  // Level up
  const oldLevel = state.level;
  state.linesCleared += linesCleared;
  state.level = getLevel(state.linesCleared);
  if (state.level > oldLevel) {
    playSound('level_up');
  }

  // Spawn next piece
  state.activePiece = undefined;
  state.ghostPiece = undefined;
  state.gravityTimerMs = 0;
  state.lockDelayTimerMs = 0;

  const ok = spawnPiece(state, rng);
  saveRNG(state, rng);

  if (!ok) {
    state.status = 'GAME_OVER';
    playSound('game_over');
  }
}

/**
 * Advance game tick with explicit gravity+lock timing.
 * Use this for test determinism — pass deltaMs to advance gravity.
 * If you just want to apply gravity (no lock delay check), use applyGravity.
 */
export function applyGravity(state: GameState, deltaMs: number): void {
  if (state.status !== 'PLAYING' || !state.activePiece) return;

  state.gravityTimerMs += deltaMs;
  const interval = getGravityInterval(state.level);

  while (state.gravityTimerMs >= interval) {
    state.gravityTimerMs -= interval;

    const piece = state.activePiece;
    const below: Origin = { x: piece.origin.x, y: piece.origin.y + 1 };
    if (!collides(piece.blocks, below, state.board)) {
      piece.origin.y++;
      state.ghostPiece = buildGhost(piece, state.board);
    }
  }
}

// ─── Spell Bank Operations (§12) ────────────────────────────────

/**
 * Cycles the selected spell index forward (C key).
 */
export function cycleSpell(state: GameState): void {
  if (state.status !== 'PLAYING') return;
  state.selectedSpellIndex = cycleSpellIndex(state.spellBank, state.selectedSpellIndex);
}

/**
 * Casts the selected spell (V key).
 * Returns the result of the cast attempt.
 */
export function castSelectedSpell(state: GameState): { ok: boolean; reason?: string } {
  if (state.status !== 'PLAYING' && state.status !== 'CASTING') return { ok: false, reason: 'not_playing' };

  // Can't cast during active cast animation
  if (state.status === 'CASTING') return { ok: false, reason: 'casting' };

  // Empty bank
  if (state.selectedSpellIndex < 0 || state.spellBank.length === 0) {
    playSound('empty_bank');
    return { ok: false, reason: 'empty_bank' };
  }

  const spell = state.spellBank[state.selectedSpellIndex]!;

  // Check type-specific eligibility
  if (!canCastVex(spell.type, {
    board: state.board,
    selectedSpellIndex: state.selectedSpellIndex,
    spellBank: state.spellBank,
    castState: { active: false },
  })) {
    playSound('cast_denied');
    return { ok: false, reason: 'ineligible' };
  }

  // Execute the cast (§17: freeze game loop during cast)
  const prevStatus = state.status;
  state.status = 'CASTING';

  const rng = getRNG(state);
  let destroyed: number;
  let soundEvent: AudioEvent;

  switch (spell.type) {
    case 'COLOR': {
      const result = resolveColorVexCast(state.board, rng);
      if (!result) {
        state.status = prevStatus;
        playSound('cast_denied');
        return { ok: false, reason: 'no_target' };
      }
      destroyed = result.destroyed;
      soundEvent = 'color_vex_cast';
      break;
    }
    case 'SHAPE': {
      const result = resolveShapeVexCast(state.board, rng);
      if (!result) {
        state.status = prevStatus;
        playSound('cast_denied');
        return { ok: false, reason: 'no_target' };
      }
      destroyed = result.destroyed;
      soundEvent = 'shape_vex_cast';
      break;
    }
    case 'SHADOW': {
      resolveShadowVexCast(state.board);
      destroyed = 0;
      soundEvent = 'shadow_vex_cast';
      state.score += SCORE_SHADOW_VEX * state.level;
      break;
    }
    default:
      state.status = prevStatus;
      return { ok: false, reason: 'unknown_type' };
  }

  // Score vex cell destruction
  if (destroyed > 0) {
    state.score += SCORE_VEX_CELL_DESTROYED * destroyed * state.level;
  }

  playSound(soundEvent);

  // Remove spell from bank with post-cast index rules (§12)
  const { newIndex } = removeSpellAtIndex(state.spellBank, state.selectedSpellIndex);
  state.selectedSpellIndex = newIndex;

  // Post-cast: check active piece collision, shift up if needed (§17 step 6)
  if (state.activePiece) {
    for (let shift = 0; shift < 2; shift++) {
      const checkOrigin = { x: state.activePiece.origin.x, y: state.activePiece.origin.y - shift };
      if (!collides(state.activePiece.blocks, checkOrigin, state.board)) {
        state.activePiece.origin.y -= shift;
        state.ghostPiece = buildGhost(state.activePiece, state.board);
        break;
      }
    }

    // Reset lock delay if grounded after cast (§17 step 8)
    const grounded: Origin = { x: state.activePiece.origin.x, y: state.activePiece.origin.y + 1 };
    if (collides(state.activePiece.blocks, grounded, state.board)) {
      state.lockDelayTimerMs = 0;
    }
  }

  saveRNG(state, rng);
  state.status = prevStatus; // resume game loop (§17 step 7)
  return { ok: true };
}
