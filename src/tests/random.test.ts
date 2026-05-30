/**
 * Vextris — RNG Tests (§27, §29)
 */

import { describe, it, expect } from 'vitest';
import { fnv1a32, mulberry32, SeededRNG, createBag } from '../engine/random';

describe('fnv1a32', () => {
  it('empty string produces known hash', () => {
    const hash = fnv1a32('');
    expect(hash).toBe(0x811C9DC5);
  });

  it('same seed produces same hash', () => {
    expect(fnv1a32('VEXTRIS-ABC')).toBe(fnv1a32('VEXTRIS-ABC'));
  });

  it('different seeds produce different hashes', () => {
    expect(fnv1a32('seed-A')).not.toBe(fnv1a32('seed-B'));
  });

  it('returns 32-bit unsigned integer (0 to 2^32-1)', () => {
    const hash = fnv1a32('test-seed-123');
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThan(4294967296);
  });
});

describe('mulberry32', () => {
  it('produces deterministic sequence from known state', () => {
    let state = 12345;
    const results: number[] = [];
    for (let i = 0; i < 5; i++) {
      const r = mulberry32(state);
      results.push(r.value);
      state = r.next;
    }
    // Same initial state gives same sequence
    state = 12345;
    for (let i = 0; i < 5; i++) {
      const r = mulberry32(state);
      expect(r.value).toBe(results[i]);
      state = r.next;
    }
  });

  it('returns values in 32-bit unsigned range', () => {
    let state = 42;
    for (let i = 0; i < 100; i++) {
      const r = mulberry32(state);
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThan(4294967296);
      state = r.next;
    }
  });
});

describe('SeededRNG', () => {
  it('same seed reproduces same sequence', () => {
    const rng1 = new SeededRNG('VEXTRIS-TEST-1');
    const rng2 = new SeededRNG('VEXTRIS-TEST-1');

    for (let i = 0; i < 20; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it('different seeds produce different sequences', () => {
    const rng1 = new SeededRNG('seed-A');
    const rng2 = new SeededRNG('seed-B');

    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());
    expect(seq1).not.toEqual(seq2);
  });

  it('nextFloat returns values in [0, 1)', () => {
    const rng = new SeededRNG('float-test');
    for (let i = 0; i < 100; i++) {
      const f = rng.nextFloat();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
  });

  it('nextInt returns values in [0, max)', () => {
    const rng = new SeededRNG('int-test');
    for (let i = 0; i < 100; i++) {
      const n = rng.nextInt(5);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(5);
    }
  });

  it('shuffle returns array of same length', () => {
    const rng = new SeededRNG('shuffle-test');
    const arr = [1, 2, 3, 4, 5, 6, 7];
    const result = rng.shuffle([...arr]);
    expect(result).toHaveLength(7);
  });

  it('shuffle contains same elements', () => {
    const rng = new SeededRNG('shuffle-test');
    const arr = [1, 2, 3, 4, 5, 6, 7];
    const shuffled = rng.shuffle([...arr]);
    expect(shuffled.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('shuffle is deterministic with same seed', () => {
    const arr = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const rng1 = new SeededRNG('shuffle-seed');
    const result1 = rng1.shuffle([...arr]);

    const rng2 = new SeededRNG('shuffle-seed');
    const result2 = rng2.shuffle([...arr]);

    expect(result1).toEqual(result2);
  });

  it('state getter returns current state', () => {
    const rng = new SeededRNG('state-test');
    const s1 = rng.state;
    rng.next();
    expect(rng.state).not.toBe(s1);
  });
});

describe('createBag (7-bag)', () => {
  it('returns exactly 7 shapes', () => {
    const rng = new SeededRNG('bag-1');
    const bag = createBag(rng);
    expect(bag).toHaveLength(7);
  });

  it('contains one of each shape', () => {
    const rng = new SeededRNG('bag-2');
    const bag = createBag(rng);
    const sorted = [...bag].sort();
    expect(sorted).toEqual(['I', 'J', 'L', 'O', 'S', 'T', 'Z']);
  });

  it('differs from raw order (is shuffled)', () => {
    const rng = new SeededRNG('bag-3');
    const bag = createBag(rng);
    expect(bag).not.toEqual(['I', 'O', 'T', 'S', 'Z', 'J', 'L']);
  });

  it('deterministic with same seed', () => {
    const rng1 = new SeededRNG('det-bag');
    const rng2 = new SeededRNG('det-bag');
    expect(createBag(rng1)).toEqual(createBag(rng2));
  });

  it('different seeds produce different bags', () => {
    const rng1 = new SeededRNG('bag-A');
    const rng2 = new SeededRNG('bag-B');
    // Very unlikely to match (1 in 5040)
    expect(createBag(rng1)).not.toEqual(createBag(rng2));
  });
});
