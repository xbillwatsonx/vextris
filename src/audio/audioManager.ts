/**
 * Vextris — Audio Manager (§21)
 *
 * Sound event map and placeholder audio hooks.
 * MVP uses placeholder console calls; real audio assets are future work.
 */

/** Enum of all audio events in the game */
export type AudioEvent =
  | 'move'
  | 'rotate'
  | 'soft_drop'
  | 'hard_drop'
  | 'line_clear'
  | 'level_up'
  | 'vex_mark_spawn'
  | 'vex_alignment'
  | 'color_vex_cast'
  | 'shape_vex_cast'
  | 'shadow_vex_cast'
  | 'cast_denied'
  | 'empty_bank'
  | 'game_over'
  | 'pause'
  | 'resume'
  | 'combo';

/**
 * Placeholder audio hook — logs to console in MVP.
 * Replace with Web Audio API or HTMLAudioElement sounds in production.
 */
export function playSound(event: AudioEvent): void {
  // Placeholder: log for debugging
  console.debug(`[audio] ${event}`);
}

/** Mute state */
let _muted = false;

export function isMuted(): boolean {
  return _muted;
}

export function setMuted(muted: boolean): void {
  _muted = muted;
}

export function toggleMute(): boolean {
  _muted = !_muted;
  return _muted;
}
