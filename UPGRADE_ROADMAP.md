# Vextris — Upgrade Roadmap

## Current State (May 2026)

All 6 spec phases are implemented: full game loop, vex system, canvas rendering, UI, and audio hooks. 289 tests pass (8 test files). Production bundle is 18 KB JS + build in ~288ms.

The game is fun and playable, but several areas could be firmed up before major feature work.

---

## Next Steps (ordered by priority)

### ~~1. Board Foundation Test Suite~~ ✅ DONE (2025-05-25)

The board layer (`src/engine/board.ts`) now has a dedicated test suite: `src/tests/board.test.ts` with **70 tests** across 11 `describe` blocks. Total test count: 289 (up from 279).

Tests cover:
- `board[row][col]` storage (4 tests — dimensions, initialization, row-major layout)
- `createEmptyBoard` (4 tests — defaults, independence, custom dimensions)
- `logicalToArrayRow` / `arrayToLogicalRow` (10 tests — boundary values, custom hiddenRows, roundtrip invariance)
- `getCell` / `setCell` (10 tests — read, write, overwrite, bounds errors)
- `isInsideVisibleBoard` / `isInsideTotalBoard` (12 tests — edge cases, exhaustive visible cell sweep, hidden vs total divergence)
- `getVisibleOccupiedCount` / `getTotalOccupiedCount` (9 tests — empty, partial, full, hidden exclusion, ordering invariant)
- `getVisibleFillPercent` (6 tests — 0.0, 1.0, 0.01, hidden-row isolation, range guarantee)
- `cloneBoard` (7 tests — deep copy, cell isolation, row isolation, count parity)
- Constants (5 tests — COLS, TOTAL_ROWS, HIDDEN_ROWS, VISIBLE_ROWS, VISIBLE_CELL_COUNT)

---

### ~~2. Vex Mark Rotation — Add Tests~~ ✅ Complete

The rotation bug (mark jumping to wrong cell on non-O pieces, sticking on O-piece) is fixed and tested. Additional bug found and squashed: O-piece CW/CCW detection was broken (`isCW` always false due to checking `piece.rotationState` after it was already mutated to `newState`).

**Delivered:** 12 tests in `src/tests/rotation.test.ts`

- O-piece: CW cycle 0→1→3→2→0, CCW cycle 0→2→3→1→0, CW+CCW cancel, 4×CW returns
- I-piece: mark remaps to same world cell after CW rotation (3 test positions)
- T-piece: outer-corner and center-bar remap correctly
- Wall kick: mark remaps correctly when non-identity kick offset applied
- No-mark boundary: rotation works normally without vexMarkBlockIndex

**File:** `src/tests/rotation.test.ts` ✅

---

### ~~3. Integration / Smoke Tests~~ ✅ Complete

Seed-locked end-to-end tests verifying that the full game pipeline produces deterministic outcomes with fixed seeds.

**Delivered:** 21 tests in `src/tests/integration.test.ts`

- **Fixed-seed determinism** (3 tests) — same seed + same actions = identical final board, score, spell bank, and status
- **Different seeds diverge** (2 tests) — different seeds produce different first piece and different final board
- **Hard drop scoring** (5 tests) — 0, 1, 10 rows dropped, score accumulation, score with line clear
- **Line clear integration** (3 tests) — single clear, double clear, combo reset on non-clear
- **Vex cast integration** (3 tests) — adjacent marks grant spell, COLOR vex destroys cells, spell cycle wraparound
- **Game over** (2 tests) — blocked spawn, gradual board fill
- **State integrity** (3 tests) — ghost tracking, board dimensions, occupied count bounds

**File:** `src/tests/integration.test.ts` ✅

**Full suite:** 9 test files, 322 tests, all passing.

---

### ~~4. Code Quality / Structure~~ ✅ Complete

Engine refactored into focused modules. All imports backward-compatible via barrel re-exports.

**Changes:**
- **Split `gameLoop.ts`** (711 → 583 lines): extracted rotation into `rotation.ts`, shared types into `types.ts`
- **Split `vex.ts`** (597 → 138 lines): extracted into `vexSpawning.ts`, `vexSpellBank.ts`, `vexAlignment.ts`, `vexCasting.ts`; barrel re-exports all public APIs
- **Deduplicated test helpers**: `occCell`, `fillRow`, `makeCleanState`, `countOccupied`, `stateWithPiece`, `activeX`/`activeY` unified in `src/tests/test-utils.ts` and consumed by gameLoop, pieces, rotation, and integration tests

**New files:** `rotation.ts`, `types.ts`, `vexSpawning.ts`, `vexSpellBank.ts`, `vexAlignment.ts`, `vexCasting.ts`, `test-utils.ts`

**Full suite:** 9 test files, 321 tests, all passing.

---

### 5. Rendering Edge Cases

- Ghost piece doesn't show vex mark (low priority, UX decision)
- No visual indicator for "40% fill threshold met" on Shadow Vex
- Spell bank could show tooltip/flavor text on hover

---

### 6. Performance / Polish

- Benchmark `collides()` — called on every tick, gravity step, rotation attempt, and ghost calculation
- Profile rendering — `drawBoard` iterates all 200 visible cells every frame
- Consider `OffscreenCanvas` for the main board if frame drops occur

---

## Phase Gates (from original spec)

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Board foundation | ✅ Built + tested (70 tests) |
| 2 | Pieces & collision | ✅ Built, tested |
| 3 | Core game loop | ✅ Built, tested |
| 4 | Vex system | ✅ Built, tested |
| 5 | Rendering, UI, audio | ✅ Built |
| 6 | Integration & QA | ✅ MVP complete |

---

## File Locations

| File | Purpose |
|------|---------|
| `docs/Vextris_PRD_and_Technical_Spec.md` | Full spec (25 KB, 6 phases) |
| `docs/vextris-conversation.md` | Design conversation log |
| `UPGRADE_ROADMAP.md` | This file |
| `src/engine/board.ts` | Board layer — 70 dedicated tests |
| `src/engine/gameLoop.ts` | Game loop + rotation + locking (700+ lines) |
| `src/engine/vex.ts` | Vex system (597 lines) |
| `src/engine/pieces.ts` | Piece definitions, collision, ghost |
| `src/render/canvasRenderer.ts` | Canvas rendering |
| `src/config/gameConfig.ts` | Tunable constants |
| `public/main.ts` | Entry point, input handling, game loop |
| `src/tests/board.test.ts` | **NEW** — Phase 1 board foundation tests (70 tests) |
| `src/tests/` | 8 test files, 289 tests total |
