/**
 * Vextris — Game Config Tests
 *
 * Unit tests for getPostVexLineClearScore chunked quad scoring helper.
 */

import { describe, it, expect } from 'vitest';
import { getPostVexLineClearScore } from '../config/gameConfig';

describe('getPostVexLineClearScore', () => {
  it('returns 0 for 0 lines', () => {
    expect(getPostVexLineClearScore(0, 1)).toBe(0);
  });

  it('matches existing table for 1-4 lines at level 1', () => {
    expect(getPostVexLineClearScore(1, 1)).toBe(100);   // single
    expect(getPostVexLineClearScore(2, 1)).toBe(300);   // double
    expect(getPostVexLineClearScore(3, 1)).toBe(500);   // triple
    expect(getPostVexLineClearScore(4, 1)).toBe(800);   // quad
  });

  it('scores 5 lines as quad + single = 900 at level 1', () => {
    expect(getPostVexLineClearScore(5, 1)).toBe(900);
  });

  it('scores 6 lines as quad + double = 1100 at level 1', () => {
    expect(getPostVexLineClearScore(6, 1)).toBe(1100);
  });

  it('scores 8 lines as quad + quad = 1600 at level 1', () => {
    expect(getPostVexLineClearScore(8, 1)).toBe(1600);
  });

  it('scores 20 lines as five quads = 4000 at level 1', () => {
    expect(getPostVexLineClearScore(20, 1)).toBe(4000);
  });

  it('multiplies by level: 5 lines at level 2 = 1800', () => {
    expect(getPostVexLineClearScore(5, 2)).toBe(1800);
  });

  it('multiplies by level: 7 lines at level 3 = 3900', () => {
    expect(getPostVexLineClearScore(7, 3)).toBe(3900);
  });
});