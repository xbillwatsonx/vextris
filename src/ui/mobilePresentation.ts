import type { GameStatus } from '../engine/types';

/** Whether a coarse portrait viewport should show its in-play mobile UI. */
export function shouldUseMobileGameplayPresentation(status: GameStatus, isCoarsePortrait: boolean): boolean {
  return isCoarsePortrait && status === 'PLAYING';
}
