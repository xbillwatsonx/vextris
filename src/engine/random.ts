/**
 * Vextris — Seeded Random Number Generator (§27)
 *
 * FNV-1a 32-bit seed hashing + Mulberry32 PRNG + Fisher-Yates shuffle.
 * All random outcomes go through one seeded RNG service.
 */

import type { ShapeId } from './board';

/**
 * Hash a seed string to a 32-bit unsigned integer using FNV-1a.
 *
 * FNV-1a 32-bit constants:
 *   offset basis: 0x811C9DC5
 *   prime:        0x01000193
 */
export function fnv1a32(seed: string): number {
  let hash = 0x811C9DC5 | 0; // ensure 32-bit signed representation
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    // multiply in 32-bit unsigned space
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0; // return as unsigned 32-bit
}

/**
 * Mulberry32 PRNG.
 * State is a 32-bit unsigned integer. Returns { next: newState, value: [0, 2^32-1] }.
 */
export function mulberry32(state: number): { next: number; value: number } {
  let s = (state + 0x6D2B79F5) | 0;
  let z = s;
  z = Math.imul(z ^ (z >>> 15), z | 1);
  z = (z + Math.imul(z ^ (z >>> 7), z | 61)) | 0;
  return { next: s >>> 0, value: (z ^ (z >>> 14)) >>> 0 };
}

/**
 * Seeded PRNG wrapping FNV-1a + Mulberry32.
 */
export class SeededRNG {
  private _state: number;

  constructor(seed: string) {
    this._state = fnv1a32(seed);
  }

  get state(): number {
    return this._state;
  }

  /** Raw 32-bit unsigned integer. Advances state. */
  next(): number {
    const result = mulberry32(this._state);
    this._state = result.next;
    return result.value;
  }

  /** Float in [0, 1). */
  nextFloat(): number {
    return this.next() / 4294967296; // 2^32
  }

  /** Integer in [0, max). */
  nextInt(max: number): number {
    return Math.floor(this.nextFloat() * max);
  }

  /** Fisher-Yates shuffle in place. Returns same array. */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(i + 1);
      const tmp = array[i]!;
      array[i] = array[j]!;
      array[j] = tmp;
    }
    return array;
  }
}

/** Create a shuffled 7-bag using the given RNG. */
export function createBag(rng: SeededRNG): ShapeId[] {
  const bag: ShapeId[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  rng.shuffle(bag);
  return bag;
}
