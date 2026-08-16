import { describe, expect, it } from 'vitest';
import { getMobileControlPresentation, shouldUseMobileGameplayPresentation } from '../ui/mobilePresentation';

describe('shouldUseMobileGameplayPresentation', () => {
  it.each([
    ['READY', true, false],
    ['PLAYING', true, true],
    ['PAUSED', true, false],
    ['GAME_OVER', true, false],
    ['PLAYING', false, false],
  ] as const)('returns %s presentation decision for coarse portrait=%s', (status, coarsePortrait, expected) => {
    expect(shouldUseMobileGameplayPresentation(status, coarsePortrait)).toBe(expected);
  });
});

describe('getMobileControlPresentation', () => {
  it('maps playing audio-enabled state to unpressed Pause and Mute controls', () => {
    expect(getMobileControlPresentation('PLAYING', false)).toEqual({
      pause: { label: 'Pause', pressed: false },
      mute: { label: 'Mute', pressed: false },
    });
  });

  it('maps paused muted state to pressed Resume and Unmute controls', () => {
    expect(getMobileControlPresentation('PAUSED', true)).toEqual({
      pause: { label: 'Resume', pressed: true },
      mute: { label: 'Unmute', pressed: true },
    });
  });
});
