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
});
