export interface NameEntryState {
  chars: readonly [string, string, string];
  cursor: number;
}

export interface NameEntryTransition {
  entry: NameEntryState;
  confirmedName?: string;
}

export function createNameEntry(): NameEntryState {
  return { chars: ['', '', ''], cursor: 0 };
}

/** Returns the next immutable initials-entry state for one input key. */
export function transitionNameEntry(entry: NameEntryState, key: string): NameEntryTransition {
  if (key === 'Enter') {
    return {
      entry,
      confirmedName: entry.chars.every((char) => char === '') ? 'AAA' : entry.chars.join(''),
    };
  }

  const chars = [...entry.chars] as [string, string, string];
  let cursor = entry.cursor;
  if (key === 'Backspace') {
    if (cursor > 0) cursor--;
    chars[cursor] = '';
    return { entry: { chars, cursor } };
  }

  if (/^[A-Za-z]$/.test(key)) {
    chars[cursor] = key.toUpperCase();
    if (cursor < chars.length - 1) cursor++;
    return { entry: { chars, cursor } };
  }

  return { entry };
}
