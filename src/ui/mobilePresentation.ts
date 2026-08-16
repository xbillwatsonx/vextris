import type { GameStatus } from '../engine/types';

export interface MobileControlState {
  label: 'Pause' | 'Resume' | 'Mute' | 'Unmute';
  pressed: boolean;
}

/** Whether a coarse portrait viewport should show its in-play mobile UI. */
export function shouldUseMobileGameplayPresentation(status: GameStatus, isCoarsePortrait: boolean): boolean {
  return isCoarsePortrait && status === 'PLAYING';
}

/** Labels and pressed states for the mobile pause and mute controls. */
export function getMobileControlPresentation(status: GameStatus, muted: boolean): {
  pause: MobileControlState;
  mute: MobileControlState;
} {
  const paused = status === 'PAUSED';
  return {
    pause: { label: paused ? 'Resume' : 'Pause', pressed: paused },
    mute: { label: muted ? 'Unmute' : 'Mute', pressed: muted },
  };
}
