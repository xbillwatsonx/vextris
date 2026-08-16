import { describe, expect, it } from 'vitest';
import { shouldUseMobileGameplayPresentation } from '../ui/mobilePresentation';

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
