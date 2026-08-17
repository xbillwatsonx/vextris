import { afterEach, describe, expect, it } from 'vitest';
import { renderStats } from '../render/canvasRenderer';
import { stateWithPiece } from './test-utils';

interface FakeElement {
  textContent: string | null;
}

const originalDocument = globalThis.document;

afterEach(() => {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: originalDocument,
  });
});

describe('renderStats', () => {
  it('mirrors score, level, and selected spell into the mobile HUD', () => {
    const elements = new Map<string, FakeElement>([
      ['mobile-score', { textContent: null }],
      ['mobile-level', { textContent: null }],
      ['mobile-selected-spell', { textContent: null }],
    ]);
    const fakeDocument = {
      getElementById(id: string): FakeElement | null {
        return elements.get(id) ?? null;
      },
    };
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: fakeDocument,
    });

    const state = stateWithPiece('T', { x: 4, y: 5 });
    state.score = 12345;
    state.level = 7;
    state.spellBank = [{ id: 'spell-1', type: 'SHAPE', grantedAtLevel: 7, grantedAtTick: 12 }];
    state.selectedSpellIndex = 0;

    renderStats(state);

    expect(elements.get('mobile-score')!.textContent).toBe('12345');
    expect(elements.get('mobile-level')!.textContent).toBe('7');
    expect(elements.get('mobile-selected-spell')!.textContent).toBe('Shape');
  });
});
