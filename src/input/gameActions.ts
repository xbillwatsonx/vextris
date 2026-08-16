import type { AudioEvent } from '../audio/audioManager';
import {
  castSelectedSpell,
  cycleSpell,
  hardDrop,
  moveLeft,
  moveRight,
  rotateCCW,
  rotateCW,
  softDrop,
} from '../engine/gameLoop';
import type { GameState } from '../engine/types';

export type GameAction =
  | 'MOVE_LEFT'
  | 'MOVE_RIGHT'
  | 'SOFT_DROP'
  | 'HARD_DROP'
  | 'ROTATE_CW'
  | 'ROTATE_CCW'
  | 'CYCLE_VEX'
  | 'CAST_VEX'
  | 'TOGGLE_PAUSE';

export interface GameActionResult {
  didChange: boolean;
  sound?: AudioEvent;
}

export function runGameAction(state: GameState, action: GameAction): GameActionResult {
  switch (action) {
    case 'MOVE_LEFT':
      return actionResult(moveLeft(state), 'move');
    case 'MOVE_RIGHT':
      return actionResult(moveRight(state), 'move');
    case 'SOFT_DROP':
      return actionResult(softDrop(state), 'soft_drop');
    case 'HARD_DROP':
      return actionResult(hardDrop(state), 'hard_drop');
    case 'ROTATE_CW':
      return actionResult(rotateCW(state), 'rotate');
    case 'ROTATE_CCW':
      return actionResult(rotateCCW(state), 'rotate');
    case 'CYCLE_VEX': {
      const selectedSpellIndex = state.selectedSpellIndex;
      cycleSpell(state);
      return { didChange: state.selectedSpellIndex !== selectedSpellIndex };
    }
    case 'CAST_VEX': {
      const result = castSelectedSpell(state);
      return { didChange: result.ok || result.reason === 'game_over' };
    }
    case 'TOGGLE_PAUSE':
      if (state.status === 'PLAYING') {
        state.status = 'PAUSED';
        return { didChange: true, sound: 'pause' };
      }
      if (state.status === 'PAUSED') {
        state.status = 'PLAYING';
        return { didChange: true, sound: 'resume' };
      }
      return { didChange: false };
  }
}

function actionResult(didChange: boolean, sound: AudioEvent): GameActionResult {
  return didChange ? { didChange, sound } : { didChange };
}
