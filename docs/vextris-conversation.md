# Vextris — Conversation Export

Session: 20260520_030627_c7a1e989

## User

Good v0.2 pass. Do one more spec patch before scaffolding.

Required patches:

1. Define board array storage as "board[row][col]", with "arrayRow = y + hiddenRows" and visible y range "0..19".

2. Define hidden-row behavior:
   Color Vex and Shape Vex affect all locked cells in total board, including hidden rows. Shadow Vex affects visible cells only. Vex alignment checks visible cells only.

3. Fix Shadow Vex cast order. Do not resume timers before line clears. Use the global cast sequence as the master rule.

4. Clarify cast animation timing. Gameplay timers and non-cast animations freeze. Cast animation timeline continues.

5. Lock RNG implementation. Use FNV-1a 32-bit string hashing plus Mulberry32 PRNG. Add "rngState", "gameTick", "pieceBag", "pieceBagIndex", and "nextSpellId" to runtime state.

6. Add piece geometry appendix: shape coordinates, spawn origins, rotation states, and wall kick table.

7. Decide Shadow-block targeting. Use this rule for MVP: Shadow blocks are normal locked cells after Shadow Vex resolves and can be targeted by Color Vex and Shape Vex.

8. Define selected spell index after casting.

9. Define full-bank cluster behavior: if bank is full during alignment detection, stop processing immediately and consume no marks.

10. Replace statistical Color Vex QA with deterministic mocked-RNG boundary tests.

After those patches, create the Vextris project directory and scaffold. No gameplay implementation until the patched spec is committed as v0.3.

## Hermes



> **Tool:** `None`

> **Tool:** `None`

## Hermes



> **Tool:** `None`

> **Tool:** `None`

## Hermes



> **Tool:** `None`

## Hermes



> **Tool:** `None`

## Hermes



> **Tool:** `None`

> **Tool:** `None`

## Hermes

Now I have the full v0.2 spec. Let me work through all 10 patches systematically. There are many edits across different sections — I'll use `execute_code` to apply them all in one pass.

> **Tool:** `None`

## Hermes

I have the full v0.2 spec in front of me. Let me apply all 10 patches systematically. Given how many sections are touched, I'll construct v0.3 as a complete write.

> **Tool:** `None`

## Hermes

Spec written. Now scaffold the project directory.

> **Tool:** `None`

## Hermes



> **Tool:** `None`

> **Tool:** `None`

## Hermes



> **Tool:** `None`

## Hermes

Now let me set up the scaffold files.

> **Tool:** `None`

> **Tool:** `None`

> **Tool:** `None`

## Hermes

That lint error is expected — `vite` types don't exist until `npm install` runs. Normal for a scaffold. Let me continue.

> **Tool:** `None`

> **Tool:** `None`

## Hermes



> **Tool:** `None`

> **Tool:** `None`

> **Tool:** `None`

> **Tool:** `None`

> **Tool:** `None`

> **Tool:** `None`

> **Tool:** `None`

> **Tool:** `None`

> **Tool:** `None`

> **Tool:** `None`

## Hermes

Now let me verify the scaffold and commit.

> **Tool:** `None`

## Hermes



> **Tool:** `None`

## Hermes



> **Tool:** `None`

## Hermes



> **Tool:** `None`

## Hermes



> **Tool:** `None`

## Hermes

Done. Spec v0.3 committed at `aea6810` in `/home/xbill/vextris`.

Here's the patch summary:

**v0.2 → v0.3 — 10 patches applied:**

1. **Board array storage** — defined as `board[row][col]`, 22×10. `arrayRow = y + hiddenRows`. `logicalToArrayRow()` and `arrayToLogicalRow()` helpers added. Visible y range `0..19` maps to rows `2..21`.

2. **Hidden-row behavior** — Color Vex and Shape Vex now target the **total board** (rows 0..21, including hidden spawn rows). Shadow Vex affects **visible only** (rows 2..21). Vex alignment scans **visible only**. Each vex section now explicitly states its scope.

3. **Shadow Vex cast order** — fixed. Shadow Vex now follows the global cast sequence (§17) as the master rule. Line clears resolve **during** the cast timeline, timers do **not** resume before line clears. Old §16 step order removed.

4. **Cast animation timing** — new §17 subsection. Gameplay timers and non-cast animations freeze. Cast animation timeline (`castState.progressMs`) continues. Cast owns the visual timeline.

5. **RNG locked** — §27 now specifies FNV-1a 32-bit (`0x811C9DC5` / `0x01000193`) + Mulberry32 with full algorithm pseudocode. `GameState` extended with `rngState`, `gameTick`, `pieceBag`, `pieceBagIndex`, `nextSpellId`.

6. **Piece geometry appendix** — new Appendix A with all seven tetromino shapes in all four rotation states, spawn origins table, full SRS wall kick tables for J/L/S/Z/T and I-piece, counterclockwise reversal rule.

7. **Shadow-block targeting** — §16 now states shadow blocks are normal locked cells after Shadow Vex resolves. They have `colorId='shadow'` and `shapeId='SHADOW'`. Both Color Vex and Shape Vex can target them. QA tests added.

8. **Selected spell index after casting** — §12 defines the behavior: index stays at the same logical position, clamps to `bank.length - 1` if it points past the end, goes to `-1` on empty bank. QA test cases added for all three scenarios.

9. **Full-bank cluster behavior** — §11.1 added: before any scanning, check `spellBank.length >= 9`. If full, stop immediately, consume zero marks, show "Spell Bank Full." QA tests for the early-exit gate.

10. **Color Vex QA** — §29 replaced all statistical tests ("50-cell color chosen more often") with deterministic mocked-RNG boundary tests. Eight explicit test cases covering: zero cells, single cell, single color, uneven weights, equal weights, hidden-row inclusion, shadow-block inclusion, and multi-color with shadow.

**Scaffold:**
- `/home/xbill/vextris/` — git repo, `.gitignore`, `package.json`, `tsconfig.json`, `vite.config.ts`
- `src/engine/` — board, pieces, random, input, gameLoop, vex (all scaffold exports)
- `src/render/`, `src/audio/`, `src/config/`
- `public/` — `index.html` (game canvas + side panel layout), `main.ts` (canvas init + grid draw)
- `docs/` — full v0.3 spec

No gameplay implementation. Ready for engine work.
