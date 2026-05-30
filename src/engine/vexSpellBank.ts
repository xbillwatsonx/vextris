/**
 * Vextris — Vex Spell Bank Operations (§12)
 *
 * Spell granting, selection cycling, and removal with post-cast index rules.
 */

import { SeededRNG } from './random';
import type { VexSpell, VexSpellBank, VexWeights } from './vex';
import { selectVexType, DEFAULT_VEX_WEIGHTS } from './vexSpawning';

// ─── Spell Bank Operations (§12) ────────────────────────────────

/**
 * Grants a random vex spell to the bank.
 * Does NOT check full-bank — caller must do the early-exit check first.
 */
export function grantRandomVex(
  spellBank: VexSpellBank,
  rng: SeededRNG,
  level: number,
  gameTick: number,
  nextSpellId: number,
  weights: VexWeights = DEFAULT_VEX_WEIGHTS,
): { spell: VexSpell; nextId: number } {
  const type = selectVexType(rng, weights);
  const spell: VexSpell = {
    id: `spell-${nextSpellId}`,
    type,
    grantedAtLevel: level,
    grantedAtTick: gameTick,
  };
  spellBank.push(spell);
  return { spell, nextId: nextSpellId + 1 };
}

/**
 * Cycles the selected spell index forward by one position.
 * Wraps to the first when at end. Returns new index.
 * Returns -1 if bank is empty.
 */
export function cycleSpellIndex(
  spellBank: VexSpellBank,
  currentIndex: number,
): number {
  if (spellBank.length === 0) return -1;
  return (currentIndex + 1) % spellBank.length;
}

/**
 * Removes a spell at the given index and returns the new index
 * following post-cast index rules (§12).
 */
export function removeSpellAtIndex(
  spellBank: VexSpellBank,
  index: number,
): { removed: VexSpell; newIndex: number } {
  const removed = spellBank.splice(index, 1)[0]!;

  if (spellBank.length === 0) {
    return { removed, newIndex: -1 };
  }

  const newIndex = Math.min(index, spellBank.length - 1);
  return { removed, newIndex };
}
