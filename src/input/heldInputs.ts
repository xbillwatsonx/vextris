export type HeldKey = 'ArrowLeft' | 'ArrowDown' | 'ArrowRight';

/**
 * Tracks held movement controls by Pointer Event owner. Keyboard state stays
 * with the browser input layer so ending a touch cannot release a keyboard key.
 */
export class PointerHeldInputs {
  private readonly byPointer = new Map<number, HeldKey>();

  add(pointerId: number, key: HeldKey): void {
    this.byPointer.set(pointerId, key);
  }

  remove(pointerId: number): void {
    this.byPointer.delete(pointerId);
  }

  clear(): void {
    this.byPointer.clear();
  }

  has(key: HeldKey): boolean {
    return [...this.byPointer.values()].includes(key);
  }

  isHeld(key: HeldKey, keyboardHeld: ReadonlySet<string>): boolean {
    return keyboardHeld.has(key) || this.has(key);
  }
}
