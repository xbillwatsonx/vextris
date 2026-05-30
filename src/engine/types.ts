/**
 * Vextris — Shared Game Types
 *
 * ActivePiece, GhostPiece, GameState, and related types used by
 * gameLoop, rotation, and other engine modules. Extracted here to
 * break circular dependencies.
 */

import type { Board, ShapeId, ColorId } from './board';
import type { Block, Origin, RotationState } from './pieces';

// ─── Active Piece (§8) ──────────────────────────────────────────

export interface ActivePiece {
  id: string;
  shapeId: ShapeId;
  colorId: ColorId;
  rotationState: RotationState;
  origin: Origin;
  blocks: Block[];
  vexMarkBlockIndex?: number;
}

// ─── Ghost Piece (§9) ───────────────────────────────────────────

export interface GhostPiece {
  shapeId: ShapeId;
  colorId: ColorId;
  rotationState: RotationState;
  origin: Origin;
  blocks: Block[];
}

// ─── Spell ──────────────────────────────────────────────────────

export interface VexSpell {
  id: string;
  type: 'COLOR' | 'SHAPE' | 'SHADOW';
  grantedAtLevel: number;
  grantedAtTick: number;
}

// ─── Game Status ────────────────────────────────────────────────

export type GameStatus = 'READY' | 'PLAYING' | 'PAUSED' | 'ANIMATING' | 'CASTING' | 'GAME_OVER';

// ─── Game State (§23) ──────────────────────────────────────────

export interface GameState {
  board: Board;
  activePiece?: ActivePiece;
  ghostPiece?: GhostPiece;
  nextQueue: ShapeId[];
  spellBank: VexSpell[];
  selectedSpellIndex: number;
  score: number;
  level: number;
  linesCleared: number;
  comboCount: number;
  status: GameStatus;
  // Runtime
  gravityTimerMs: number;
  lockDelayTimerMs: number;
  lockResetCount: number;
  gameTick: number;
  // RNG
  rngSeed: string;
  rngState: number;
  pieceBag: ShapeId[];
  pieceBagIndex: number;
  nextSpellId: number;
}
