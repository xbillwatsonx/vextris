import { describe, expect, it } from 'vitest';
import { runGameAction } from '../input/gameActions';
import { countOccupied, lockCell, stateWithPiece } from './test-utils';

describe('runGameAction', () => {
  it('moves the active piece left and right', () => {
    const state = stateWithPiece('T', { x: 4, y: 5 });

    expect(runGameAction(state, 'MOVE_LEFT')).toEqual({ didChange: true, sound: 'move' });
    expect(state.activePiece!.origin.x).toBe(3);

    expect(runGameAction(state, 'MOVE_RIGHT')).toEqual({ didChange: true, sound: 'move' });
    expect(state.activePiece!.origin.x).toBe(4);
  });

  it('soft drops the active piece', () => {
    const state = stateWithPiece('T', { x: 4, y: 5 });

    expect(runGameAction(state, 'SOFT_DROP')).toEqual({ didChange: true, sound: 'soft_drop' });
    expect(state.activePiece!.origin.y).toBe(6);
  });

  it('hard drops and locks the active piece', () => {
    const state = stateWithPiece('O', { x: 0, y: 5 });

    expect(runGameAction(state, 'HARD_DROP')).toEqual({ didChange: true, sound: 'hard_drop' });
    expect(countOccupied(state.board)).toBe(4);
  });

  it('rotates clockwise', () => {
    const state = stateWithPiece('T', { x: 4, y: 5 });

    expect(runGameAction(state, 'ROTATE_CW')).toEqual({ didChange: true, sound: 'rotate' });
    expect(state.activePiece!.rotationState).toBe(1);
  });

  it('rotates counterclockwise', () => {
    const state = stateWithPiece('T', { x: 4, y: 5 });

    expect(runGameAction(state, 'ROTATE_CCW')).toEqual({ didChange: true, sound: 'rotate' });
    expect(state.activePiece!.rotationState).toBe(3);
  });

  it('cycles the selected Vex spell', () => {
    const state = stateWithPiece('T', { x: 4, y: 5 });
    state.spellBank = [
      { id: 'spell-1', type: 'COLOR', grantedAtLevel: 1, grantedAtTick: 0 },
      { id: 'spell-2', type: 'SHAPE', grantedAtLevel: 1, grantedAtTick: 0 },
    ];
    state.selectedSpellIndex = 0;

    expect(runGameAction(state, 'CYCLE_VEX')).toEqual({ didChange: true });
    expect(state.selectedSpellIndex).toBe(1);
  });

  it('casts the selected Vex spell', () => {
    const state = stateWithPiece('T', { x: 4, y: 5 });
    lockCell(state.board, 0, 19, 'red', 'Z');
    state.spellBank = [{ id: 'spell-1', type: 'COLOR', grantedAtLevel: 1, grantedAtTick: 0 }];
    state.selectedSpellIndex = 0;

    expect(runGameAction(state, 'CAST_VEX')).toEqual({ didChange: true });
    expect(state.spellBank).toHaveLength(0);
    expect(state.selectedSpellIndex).toBe(-1);
  });

  it('pauses and resumes the game', () => {
    const state = stateWithPiece('T', { x: 4, y: 5 });

    expect(runGameAction(state, 'TOGGLE_PAUSE')).toEqual({ didChange: true, sound: 'pause' });
    expect(state.status).toBe('PAUSED');

    expect(runGameAction(state, 'TOGGLE_PAUSE')).toEqual({ didChange: true, sound: 'resume' });
    expect(state.status).toBe('PLAYING');
  });

  it('returns no change or sound for blocked movement, drop, and rotation', () => {
    const leftBlocked = stateWithPiece('O', { x: 0, y: 5 });
    expect(runGameAction(leftBlocked, 'MOVE_LEFT')).toEqual({ didChange: false });
    expect(leftBlocked.activePiece!.origin).toEqual({ x: 0, y: 5 });

    const dropBlocked = stateWithPiece('O', { x: 4, y: 18 });
    const scoreBeforeDrop = dropBlocked.score;
    expect(runGameAction(dropBlocked, 'SOFT_DROP')).toEqual({ didChange: false });
    expect(dropBlocked.activePiece!.origin).toEqual({ x: 4, y: 18 });
    expect(dropBlocked.score).toBe(scoreBeforeDrop);

    const rotationBlocked = stateWithPiece('T', { x: 4, y: 5 });
    for (const [x, y] of [[5, 7], [3, 6], [3, 5], [4, 8], [3, 8]]) {
      lockCell(rotationBlocked.board, x!, y!, 'blue', 'J');
    }
    expect(runGameAction(rotationBlocked, 'ROTATE_CW')).toEqual({ didChange: false });
    expect(rotationBlocked.activePiece!.rotationState).toBe(0);
  });

  it('returns no change or sound when cycling or casting with an empty spell bank', () => {
    const state = stateWithPiece('T', { x: 4, y: 5 });
    const scoreBefore = state.score;

    expect(runGameAction(state, 'CYCLE_VEX')).toEqual({ didChange: false });
    expect(state.selectedSpellIndex).toBe(-1);
    expect(state.spellBank).toEqual([]);

    expect(runGameAction(state, 'CAST_VEX')).toEqual({ didChange: false });
    expect(state.selectedSpellIndex).toBe(-1);
    expect(state.spellBank).toEqual([]);
    expect(state.score).toBe(scoreBefore);
  });

  it.each(['READY', 'ANIMATING', 'CASTING', 'GAME_OVER'] as const)(
    'returns no change or sound when toggling pause from %s',
    (status) => {
      const state = stateWithPiece('T', { x: 4, y: 5 });
      state.status = status;

      expect(runGameAction(state, 'TOGGLE_PAUSE')).toEqual({ didChange: false });
      expect(state.status).toBe(status);
    },
  );

  it('reports change when a cast modifies state before post-cast collision ends the game', () => {
    const state = stateWithPiece('I', { x: 3, y: 5 });
    for (let y = 4; y < 20; y++) {
      for (const x of [3, 4, 5, 6]) {
        lockCell(state.board, x, y, 'blue', 'J');
      }
    }
    lockCell(state.board, 9, -2, 'red', 'Z');
    // This RNG state selects red, leaving the blue collision rows intact after the cast.
    state.rngState = 257;
    state.spellBank = [{ id: 'spell-1', type: 'COLOR', grantedAtLevel: 1, grantedAtTick: 0 }];
    state.selectedSpellIndex = 0;

    const result = runGameAction(state, 'CAST_VEX');

    expect(state.status).toBe('GAME_OVER');
    expect(state.score).toBeGreaterThan(0);
    expect(state.spellBank).toHaveLength(0);
    expect(result).toEqual({ didChange: true });
  });
});
