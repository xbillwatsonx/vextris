import { describe, expect, it } from 'vitest';
import { PointerHeldInputs } from '../input/heldInputs';
import { wireTouchControls } from '../input/touchControls';

class FakeButton {
  readonly listeners = new Map<string, Array<(event: FakePointerEvent) => void>>();
  readonly classList = { toggle: (name: string, enabled: boolean) => this.pressed = name === 'is-pressed' && enabled };
  pressed = false;
  captures: number[] = [];

  addEventListener(name: string, listener: (event: FakePointerEvent) => void): void {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
  }

  setPointerCapture(pointerId: number): void { this.captures.push(pointerId); }

  emit(name: string, pointerId = 1): FakePointerEvent {
    const event = new FakePointerEvent(pointerId);
    for (const listener of this.listeners.get(name) ?? []) listener(event);
    return event;
  }
}

class FakePointerEvent {
  defaultPrevented = false;
  propagationStopped = false;
  constructor(readonly pointerId: number) {}
  preventDefault(): void { this.defaultPrevented = true; }
  stopPropagation(): void { this.propagationStopped = true; }
}

describe('touch control DOM wiring', () => {
  it('activates a one-shot action from pointer input once and suppresses its synthetic click', () => {
    const button = new FakeButton();
    const actions: string[] = [];
    wireTouchControls({ actionButtons: [{ button, action: 'HARD_DROP' }], heldButtons: [], onAction: (action) => actions.push(action) });

    const down = button.emit('pointerdown', 7);
    button.emit('pointerup', 7);
    const click = button.emit('click', 7);

    expect(actions).toEqual(['HARD_DROP']);
    expect(down.defaultPrevented).toBe(true);
    expect(down.propagationStopped).toBe(true);
    expect(click.defaultPrevented).toBe(true);
  });

  it('activates a one-shot action from click when no pointer activation happened', () => {
    const button = new FakeButton();
    const actions: string[] = [];
    wireTouchControls({ actionButtons: [{ button, action: 'ROTATE_CW' }], heldButtons: [], onAction: (action) => actions.push(action) });

    button.emit('click');

    expect(actions).toEqual(['ROTATE_CW']);
  });

  it('blocks a concurrent pointer from repeating a one-shot action until release', () => {
    const button = new FakeButton();
    const actions: string[] = [];
    wireTouchControls({ actionButtons: [{ button, action: 'CAST_VEX' }], heldButtons: [], onAction: (action) => actions.push(action) });

    button.emit('pointerdown', 1);
    button.emit('pointerdown', 2);
    button.emit('pointerup', 1);
    button.emit('pointerdown', 2);

    expect(actions).toEqual(['CAST_VEX', 'CAST_VEX']);
  });

  it('releases held input and pressed states during global cleanup', () => {
    const button = new FakeButton();
    const held = new PointerHeldInputs();
    const controls = wireTouchControls({
      actionButtons: [],
      heldButtons: [{ button, key: 'ArrowLeft' }],
      heldInputs: held,
      onAction: () => undefined,
    });

    button.emit('pointerdown', 4);
    expect(held.has('ArrowLeft')).toBe(true);
    expect(button.pressed).toBe(true);

    controls.clearPressedInputs();
    expect(held.has('ArrowLeft')).toBe(false);
    expect(button.pressed).toBe(false);
  });
});
