import { describe, expect, it } from 'vitest';
import { createNameEntry, transitionNameEntry } from '../input/nameEntry';

describe('name entry transitions', () => {
  it('accepts A-Z keys as uppercase initials and advances to the final slot', () => {
    let entry = createNameEntry();
    entry = transitionNameEntry(entry, 'a').entry;
    entry = transitionNameEntry(entry, 'Z').entry;
    entry = transitionNameEntry(entry, 'q').entry;

    expect(entry).toEqual({ chars: ['A', 'Z', 'Q'], cursor: 2 });
  });

  it('ignores non-letter keys without changing the entry', () => {
    const entry = createNameEntry();

    expect(transitionNameEntry(entry, '7')).toEqual({ entry });
  });

  it('backspace clears the prior slot and does not wrap before the first slot', () => {
    const initial = { chars: ['A', 'B', ''], cursor: 2 } as const;
    const afterBackspace = transitionNameEntry(initial, 'Backspace').entry;
    const atStart = transitionNameEntry({ chars: ['', 'B', ''], cursor: 0 }, 'Backspace').entry;

    expect(afterBackspace).toEqual({ chars: ['A', '', ''], cursor: 1 });
    expect(atStart).toEqual({ chars: ['', 'B', ''], cursor: 0 });
  });

  it('confirms a partially-entered name without changing it', () => {
    const result = transitionNameEntry({ chars: ['B', 'O', ''], cursor: 2 }, 'Enter');

    expect(result.confirmedName).toBe('BO');
    expect(result.entry).toEqual({ chars: ['B', 'O', ''], cursor: 2 });
  });

  it('uses AAA when confirm is pressed with every slot blank', () => {
    expect(transitionNameEntry(createNameEntry(), 'Enter').confirmedName).toBe('AAA');
  });
});
