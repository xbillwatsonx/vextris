import type { GameAction } from './gameActions';
import type { HeldKey, PointerHeldInputs } from './heldInputs';

export interface TouchPointerEvent {
  pointerId: number;
  preventDefault(): void;
  stopPropagation(): void;
}

export interface TouchButton {
  addEventListener(name: string, listener: (event: TouchPointerEvent) => void): void;
  classList: { toggle(name: string, force?: boolean): void };
  setPointerCapture(pointerId: number): void;
}

export interface TouchControlWiring {
  actionButtons: ReadonlyArray<{ button: TouchButton; action: GameAction | 'TOGGLE_MUTE' }>;
  heldButtons: ReadonlyArray<{ button: TouchButton; key: HeldKey }>;
  heldInputs?: PointerHeldInputs;
  onAction(action: GameAction | 'TOGGLE_MUTE'): void;
}

export interface WiredTouchControls {
  clearPressedInputs(): void;
}

function stop(event: TouchPointerEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

function setPressed(button: TouchButton, pressed: boolean): void {
  button.classList.toggle('is-pressed', pressed);
}

function capture(button: TouchButton, pointerId: number): void {
  try {
    button.setPointerCapture(pointerId);
  } catch {
    // A cancelled pointer cannot be captured; its release path is still safe.
  }
}

/**
 * Wire touch buttons using Pointer Events while retaining click activation for
 * keyboard/assistive-tech users. Pointer-originated synthetic clicks are
 * consumed so a physical tap has exactly one effect.
 */
export function wireTouchControls(wiring: TouchControlWiring): WiredTouchControls {
  const pressedButtons = new Set<TouchButton>();

  for (const { button, action } of wiring.actionButtons) {
    let activePointer: number | null = null;
    let suppressNextClick = false;
    button.addEventListener('pointerdown', (event) => {
      stop(event);
      if (activePointer !== null) return;
      activePointer = event.pointerId;
      suppressNextClick = true;
      capture(button, event.pointerId);
      setPressed(button, true);
      pressedButtons.add(button);
      wiring.onAction(action);
    });
    for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      button.addEventListener(eventName, (event) => {
        stop(event);
        if (activePointer === event.pointerId) activePointer = null;
        setPressed(button, false);
        pressedButtons.delete(button);
      });
    }
    button.addEventListener('click', (event) => {
      stop(event);
      if (suppressNextClick) {
        suppressNextClick = false;
        return;
      }
      wiring.onAction(action);
    });
  }

  for (const { button, key } of wiring.heldButtons) {
    button.addEventListener('pointerdown', (event) => {
      stop(event);
      capture(button, event.pointerId);
      wiring.heldInputs?.add(event.pointerId, key);
      setPressed(button, true);
      pressedButtons.add(button);
    });
    for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      button.addEventListener(eventName, (event) => {
        stop(event);
        wiring.heldInputs?.remove(event.pointerId);
        setPressed(button, false);
        pressedButtons.delete(button);
      });
    }
  }

  return {
    clearPressedInputs(): void {
      wiring.heldInputs?.clear();
      for (const button of pressedButtons) setPressed(button, false);
      pressedButtons.clear();
    },
  };
}
