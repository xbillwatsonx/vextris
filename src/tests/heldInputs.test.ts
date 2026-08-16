import { describe, expect, it } from 'vitest';
import { PointerHeldInputs } from '../input/heldInputs';

describe('PointerHeldInputs', () => {
  it('adds and removes a held key by its pointer owner', () => {
    const held = new PointerHeldInputs();

    held.add(4, 'ArrowLeft');
    expect(held.has('ArrowLeft')).toBe(true);

    held.remove(4);
    expect(held.has('ArrowLeft')).toBe(false);
  });

  it('clears every pointer-owned held key', () => {
    const held = new PointerHeldInputs();
    held.add(4, 'ArrowLeft');
    held.add(8, 'ArrowDown');

    held.clear();

    expect(held.has('ArrowLeft')).toBe(false);
    expect(held.has('ArrowDown')).toBe(false);
  });

  it('keeps an action held until every duplicate pointer owner releases it', () => {
    const held = new PointerHeldInputs();
    held.add(4, 'ArrowRight');
    held.add(8, 'ArrowRight');

    held.remove(4);
    expect(held.has('ArrowRight')).toBe(true);

    held.remove(8);
    expect(held.has('ArrowRight')).toBe(false);
  });

  it('replaces a repeated pointer owner rather than retaining its old action', () => {
    const held = new PointerHeldInputs();
    held.add(4, 'ArrowLeft');
    held.add(4, 'ArrowRight');

    expect(held.has('ArrowLeft')).toBe(false);
    expect(held.has('ArrowRight')).toBe(true);
  });

  it('unions pointer-held input with the separate keyboard-held set', () => {
    const held = new PointerHeldInputs();
    const keyboardHeld = new Set(['ArrowDown']);
    held.add(4, 'ArrowLeft');

    expect(held.isHeld('ArrowLeft', keyboardHeld)).toBe(true);
    expect(held.isHeld('ArrowDown', keyboardHeld)).toBe(true);

    held.remove(4);
    expect(held.isHeld('ArrowDown', keyboardHeld)).toBe(true);
  });

  it('safely clears pointer ownership for pointer cancellation and blur', () => {
    const held = new PointerHeldInputs();
    held.add(4, 'ArrowLeft');
    held.remove(4); // pointercancel/lostpointercapture
    expect(held.has('ArrowLeft')).toBe(false);

    held.add(8, 'ArrowRight');
    held.clear(); // window blur / hidden document
    expect(held.has('ArrowRight')).toBe(false);
  });
});
