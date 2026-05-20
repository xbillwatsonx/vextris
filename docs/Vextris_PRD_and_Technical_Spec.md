# Vextris Product Requirements Document and Technical Specification

Version: 0.3
Owner: Bill
Intended audience: Agentic product, design, engineering, QA, and audio teams
Target build: Web-first MVP using TypeScript and HTML5 Canvas

## Changelog

| Version | Date | Changes |
|---|---|---|
| 0.1 | — | Initial draft |
| 0.2 | 2026-05-18 | Deep review resolutions: ghost piece added, hold excluded, vex cluster processing clarified, color mapping defined, combo reset rules, lock delay post-cast, runtime fields added, DAS/ARR defaults, cast guardrails, QA matrix expanded, blockId removed from Cell |
| 0.3 | 2026-05-20 | Board array storage formalized as board[row][col]; hidden-row behavior defined per vex type; Shadow Vex cast order fixed to global sequence; cast animation timing clarified; RNG locked to FNV-1a + Mulberry32 with runtime state fields; piece geometry appendix added; shadow-block targeting defined; selectedSpellIndex post-cast behavior specified; full-bank cluster stop rule added; Color Vex QA replaced with mocked-RNG boundary tests |

---

## 1. Product summary

Vextris is a falling-block puzzle game built around classic tetromino clearing and a new spell mechanic called vexxing. The player controls falling pieces, clears horizontal rows, manages rising difficulty, and earns rare stored abilities called vexxes by aligning special magic-symbol blocks.

The core hook is simple: play the familiar falling-block loop, hunt for magic-symbol blocks, align two symbols, bank a spell, then cast it with the V key when the board needs disruption. The player can stockpile vexxes and use them across multiple rounds inside the same run.

Vextris has three MVP vex types:

**Color Vexxing:** destroys all locked board blocks of one selected color, chosen randomly with probability weighted by the number of cells of that color on the board.

**Shape Vexxing:** destroys all locked board blocks belonging to one selected tetromino shape, chosen uniformly at random from shapes present on the board.

**Shadow Vexxing:** available only when at least 40 percent of the board is filled. It inverts the board occupancy, removes the existing locked blocks, fills the prior empty spaces with shadow blocks, then gravity-collapses that inverse shape to the bottom.

## 2. Product goals

Create a playable MVP with tight controls, deterministic rules, clear feedback, and a data-driven vex system that can be expanded without rewriting the board engine.

Make vexxing feel rare, strategic, and readable. Vexxes should feel earned, not handed out constantly.

Build the codebase so new vex types, new symbols, board skins, scoring modes, and enemy modifiers can be added through configuration.

Deliver a spec that lets separate agents work in parallel without stepping on each other.

## 3. Non-goals for MVP

No multiplayer.

No online accounts.

No real-money purchases.

No hold piece.

No mobile touch controls in the first pass.

No licensed Tetris branding, names, sounds, visual identity, or exact UI presentation. Vextris uses original branding and original presentation.

## 4. Core game loop

1. Spawn a tetromino at the top of the board.
2. Player moves, rotates, soft-drops, or hard-drops the active piece.
3. Gravity moves the piece downward at the current level speed.
4. When the piece lands and the lock delay expires, the piece becomes part of the locked board.
5. Completed horizontal rows clear.
6. Score, level, and line counters update.
7. Vex-symbol alignment is checked.
8. If two vex symbols are aligned, a random vex ability is added to the player spell bank.
9. Player can press V at any eligible time to cast the currently selected stored vex.
10. Game continues until a new piece cannot spawn.

## 5. Terminology

**Board:** The visible 10 by 20 playfield plus 2 hidden spawn rows. Total board height is 22 rows. Stored internally as `board[row][col]` where `row` indexes the full 22-row array.

**Cell:** One grid location on the board.

**Locked cell:** A cell already committed to the board after a piece locks.

**Active piece:** The falling tetromino under player control.

**Ghost piece:** A translucent preview showing where the active piece will land. It does not interact with collision, does not count as occupied cells, and does not participate in vex alignment. Rendered purely as a visual aid.

**Tetromino shape:** One of I, O, T, S, Z, J, L.

**Vex mark:** A magic symbol embedded in one cell of a falling piece. The symbol is visible on the active piece so the player can position it strategically. It only triggers alignment after the piece locks and line clears resolve.

**Vex cell:** A locked board cell that contains a vex mark.

**Vex alignment:** Two locked vex cells touching in any of the 8 directions: horizontal, vertical, or diagonal.

**Spell bank:** The inventory of earned vex abilities.

**Cast:** The player activates a stored vex by pressing V.

**Round:** One continuous game session from start to game over. Spell bank persists through level changes inside the round.

## 6. Player controls

Keyboard controls for MVP:

| Key | Action |
|---|---|
| Left Arrow | Move active piece left one column |
| Right Arrow | Move active piece right one column |
| Down Arrow | Soft drop. Increases falling speed while held |
| Up Arrow | Rotate clockwise |
| Z | Rotate counterclockwise |
| Space | Hard drop. Instantly locks the piece at the lowest legal position |
| V | Cast selected vex from spell bank |
| C | Cycle selected vex in spell bank |
| P | Pause or resume |
| R | Restart after game over |
| Escape | Pause menu |

Control feel requirements:

Movement must feel immediate.

Repeated left and right movement must use configurable Delayed Auto Shift and Auto Repeat Rate.

Soft drop must award optional bonus points per cell.

Hard drop must instantly lock the piece at the lowest legal position. No lock delay is applied.

Rotation must use wall kicks so pieces do not feel brittle near walls or stacks.

Delayed Auto Shift (DAS) default: 167 ms.

Auto Repeat Rate (ARR) default: 33 ms.

Soft drop repeat interval: 50 ms.

Input buffer window: 150 ms.

## 7. Board rules

Visible board size: 10 columns by 20 rows.

Hidden spawn rows: 2 rows. Total board height is 22 rows.

**Internal storage convention:** The board is stored as `board[row][col]`, a 22×10 array of `Cell` objects. `row` indexes the full board from 0 to 21. The visible board occupies rows 2 through 21. Rows 0 and 1 are the hidden spawn rows.

**Coordinate mapping:**

- `arrayRow = y + hiddenRows` converts a logical y-coordinate to the internal array row.
- Logical y range for the visible board: 0 through 19, mapping to array rows 2 through 21.
- Logical y range for hidden spawn rows: -2 and -1, mapping to array rows 0 and 1.

**Coordinate system for collision, rendering, and gameplay logic:**

- Logical x: 0 to 9, left to right.
- Logical y: 0 to 19, top to bottom (visible).

A cell is occupied when it contains a locked block. The active piece and ghost piece are tracked separately from the locked board.

A line clears when every visible column in a row contains an occupied locked cell.

After line clear, rows above the cleared row fall downward by the number of cleared rows below them.

When a line clears, any vex marks in that cleared row are removed with the row. Alignment detection runs after line clear resolution, so cleared marks cannot grant vexes.

The game ends when a newly spawned piece collides with occupied locked cells in its spawn location.

## 8. Piece rules

Use the seven tetrominoes: I, O, T, S, Z, J, L.

Each piece has:

- `shapeId`: I, O, T, S, Z, J, L
- `colorId`: one of seven configured colors
- `rotationState`: 0, 1, 2, 3
- `blocks`: four local cell coordinates
- `optionalVexMark`: zero or one block index containing a magic symbol

Use a 7-bag randomizer. Each bag contains one of each shape. Shuffle the bag. Draw until empty. Repeat.

### Color-to-shape mapping

| shapeId | colorId | Description |
|---|---|---|
| I | cyan | Cyan |
| O | gold | Gold |
| T | violet | Violet |
| S | green | Green |
| Z | red | Red |
| J | blue | Blue |
| L | orange | Orange |
| SHADOW | shadow | Shadow black or dark purple |

These are Vextris colors. They intentionally differ from any established game's color assignments.

Shape identity must persist after a piece locks. Each locked cell stores the originating `shapeId` so Shape Vex can target by shape.

Color identity must persist after a piece locks. Each locked cell stores `colorId` so Color Vex can target by color.

## 9. Ghost piece

A ghost piece is a translucent preview of where the active piece will land. It is rendered at the lowest legal position directly below the active piece.

Ghost piece rules:

- Does not count as an occupied cell.
- Does not interact with collision detection for the active piece or other ghost pieces.
- Does not participate in vex alignment detection.
- Does not display vex marks — only the active piece renders the vex symbol.
- Rendered purely as a visual aid for the player.

The ghost piece position updates immediately when the active piece moves or rotates.

## 10. Vex mark spawning

Vex marks appear rarely inside special falling pieces.

The magic symbol must be visible on the active falling piece while it falls. The player needs to see it before lock so they can position it strategically. It renders on the active piece but only triggers alignment after the piece locks and line clears resolve.

MVP default spawn rule:

| Parameter | Default |
|---|---|
| Base chance per spawned piece | 8% (0.08) |
| Maximum marks per piece | 1 |
| Eligible pieces | All seven tetrominoes |
| Eligible block cells | All four cells in the piece |

When a piece becomes a vex-marked piece, choose one of its four cells at random and render the magic symbol on that cell.

Tuning parameters:

| Parameter | Default |
|---|---|
| `vexMarkChance` | 0.08 |
| `vexMarkMaxPerPiece` | 1 |
| `vexAlignmentConsumesMarks` | true |
| `vexGrantCountPerAlignment` | 1 |
| `vexMaxBankSize` | 9 |
| `vexMaxGrantsPerLock` | 2 |

The system must support changing these values from a config file.

## 11. Vex alignment detection

A vex alignment is created when two locked vex cells touch in any of the 8 directions.

Directions:

- left, right, up, down
- up-left, up-right, down-left, down-right

**Detection scope:** Alignment detection scans **visible cells only** (logical y = 0..19, array rows 2..21). Hidden spawn rows are excluded from alignment checks.

Detection timing:

Run alignment detection after the active piece locks and after any line clears resolve. Only locked cells count. A vex mark on the active falling piece does not trigger alignment until the piece locks.

Consumed mark rule:

When an alignment grants a vex, remove the magic symbols from the two cells used in that pair. The cells remain as normal locked blocks.

### Full-bank stop rule

**Before scanning begins**, check whether the spell bank is full (`spellBank.length >= vexMaxBankSize`, default: 9). If the bank is full, stop processing immediately. Do not scan. Do not consume any marks. Show "Spell Bank Full" feedback. All marks on the board remain untouched.

This is an early-exit gate, not a per-pair check. It prevents wasted cluster processing and ensures no marks are consumed when the bank cannot accept new spells.

### Cluster processing (immediate consumption)

When the bank is not full, and three or more vex cells touch in a cluster, use immediate consumption — not snapshot processing.

Algorithm:

1. Scan all locked **visible** cells top to bottom, then left to right (row-major order: logical y=0..19, x=0..9).
2. For each cell that has a vex mark, check adjacent cells in this fixed direction order:
   - right (x+1, y)
   - down-right (x+1, y+1)
   - down (x, y+1)
   - down-left (x-1, y+1)
   - left (x-1, y)
   - up-left (x-1, y-1)
   - up (x, y-1)
   - up-right (x+1, y-1)
3. When a valid pair is found (current cell has a mark, adjacent cell has a mark):
   - Grant one vex immediately.
   - Remove both marks immediately.
   - Continue scanning. Consumed marks cannot be used again in the same detection pass.
4. Stop when `vexMaxGrantsPerLock` is reached (default: 2), or when no more pairs exist.

Spell grant rule:

Each successful alignment adds one random vex to the spell bank.

Since the full-bank check runs before any scanning, individual pairs encountered during cluster processing never face a full-bank rejection mid-scan. The pair consumes marks and grants a vex unconditionally.

## 12. Spell bank

The spell bank stores earned vex abilities.

The bank persists during a round, across level changes and board state changes.

MVP bank size: 9.

The UI shows:

- Current selected vex
- Next stored vexes in queue order
- Count of stored vexes

A new vex is added to the end of the queue.

Pressing C cycles the selected vex forward by one position. When at the end of the queue, wrap to the first.

Pressing V casts the selected vex if it is eligible.

After successful casting, remove the vex from the bank.

### Selected spell index after casting

When a vex is successfully cast:

1. Remove the spell at `selectedSpellIndex` from the bank.
2. If spells remain, `selectedSpellIndex` stays at the same logical position. If the removed spell was the last in the bank and the index would now point past the end, clamp it to the new last index (i.e., `bank.length - 1`).
3. If the bank is now empty, set `selectedSpellIndex = -1` (no spell selected).

Pressing V when `selectedSpellIndex === -1` (empty bank) shows "No vex stored" and plays the denied-cast sound. No other state changes.

If a vex cannot be cast because its eligibility condition is not met, keep it in the bank and show clear denied feedback.

## 13. Vex type selection

When an alignment grants a vex, choose one from the weighted vex table.

Default weights:

| Vex Type | Weight |
|---|---|
| Color Vex | 45 |
| Shape Vex | 40 |
| Shadow Vex | 15 |

The weighted table must be config-driven.

The random selection must use the game RNG service so seeds can reproduce test runs.

## 14. Color Vexxing

### Description

Color Vex destroys every locked block of one board color, chosen randomly with probability weighted by the number of cells of that color on the board.

### Target selection

At cast time, build a weighted list from all occupied locked cells in the **total board** (visible rows + hidden spawn rows, array rows 0..21). Each locked cell contributes one weight to its color.

**Hidden-row inclusion:** Color Vex targets locked cells in hidden spawn rows. This means cells trapped in the hidden zone can be destroyed, potentially freeing the spawn area.

Example: if the board has 50 red cells, 12 blue cells, and 1 green cell, the selection probabilities are: red = 50/63, blue = 12/63, green = 1/63.

If no locked cells exist on the board, the cast fails.

### Effect

Destroy every locked cell (visible and hidden) whose color matches the selected target color.

**Shadow-block interaction:** Shadow blocks created by Shadow Vex have `colorId = 'shadow'` and are normal locked cells. They are eligible targets for Color Vex and contribute weight to the 'shadow' color pool during target selection.

After destruction, apply gravity collapse by column.

Line clears are evaluated after collapse.

### Feedback

- Flash target color.
- Show text: "Color Vex: [color name] banished."
- Play color-vex sound.
- Spawn particles from destroyed cells.

### Eligibility

At least one locked board cell exists.

### Failure behavior

If no locked cells exist, do not consume the spell. Show "No target color."

### Implementation notes

Because the color target is random (weighted), the UI reveals the target only during the cast animation.

Color Vex affects locked cells only. It does not affect the active falling piece.

## 15. Shape Vexxing

### Description

Shape Vex chooses one tetromino shape and destroys every locked block that came from that shape. The shape is chosen uniformly at random from shapes present on the board.

### Target selection

At cast time, collect all `shapeId` values present in locked cells in the **total board** (visible rows + hidden spawn rows, array rows 0..21). Choose one `shapeId` uniformly at random from that set.

**Hidden-row inclusion:** Shape Vex targets locked cells in hidden spawn rows. This means cells trapped in the hidden zone can be destroyed.

If no locked cells exist on the board, the cast fails.

### Effect

Destroy every locked cell (visible and hidden) with that `shapeId`.

**Shadow-block interaction:** Shadow blocks created by Shadow Vex have `shapeId = 'SHADOW'` and are normal locked cells. They are eligible targets for Shape Vex and appear in the set of present shapes during target selection.

After destruction, apply gravity collapse by column.

Line clears are evaluated after collapse.

### Feedback

- Highlight target shape silhouette.
- Show text: "Shape Vex: [shapeId] shattered."
- Play shape-vex sound.
- Spawn angular particles from destroyed cells.

### Eligibility

At least one locked board cell exists.

### Failure behavior

If no locked cells exist, do not consume the spell. Show "No target shape."

### Implementation notes

Shape Vex requires each locked cell to store the originating `shapeId`. This cannot be inferred from the board after pieces combine.

Shape Vex affects locked cells only. It does not affect the active falling piece.

## 16. Shadow Vexxing

### Description

Shadow Vex inverts the visible board occupancy, clears the current locked blocks, creates shadow blocks in the spaces that were empty, and collapses the resulting shadow mass to the bottom.

### Eligibility

Shadow Vex can only be cast when at least 40 percent of the **visible board** is occupied by locked cells.

- Visible board cells: 10 × 20 = 200 cells.
- Minimum occupied cells required: 80.
- Use locked visible cells only (array rows 2..21) for threshold calculation.

If `occupiedVisibleCellCount` is less than 80, do not consume the spell. Show "Shadow Vex requires 40 percent board fill."

### Cast algorithm (follows global cast sequence — see §17)

1. Freeze the full game loop: gravity timer, lock timer, input repeat timers (DAS/ARR), and all non-cast animations as specified in §17.
2. Snapshot **visible** board occupancy into `oldOccupied[10][20]`. Hidden spawn rows are not affected by Shadow Vex.
3. Create inverse mask where `inverseOccupied[x][y]` is true when `oldOccupied[x][y]` is false.
4. Clear all **visible** locked board cells (array rows 2..21). Hidden spawn rows are untouched.
5. For every true cell in `inverseOccupied`, create a shadow block entry with `colorId = 'shadow'` and `shapeId = 'SHADOW'`.
6. Apply gravity collapse by column so all shadow blocks fall to the lowest available cells.
7. Evaluate line clears after collapse. Line clear animation runs during the cast animation timeline.
8. Check active piece collision with the modified board (per §17 step 6 — shift upward up to 2 cells).
9. Resume the game loop after all cast effects and line clears resolve.
10. Consume the Shadow Vex.

### Shadow-block status after resolution

After Shadow Vex resolves, shadow blocks are **normal locked cells**. They:

- Have `colorId = 'shadow'` and `shapeId = 'SHADOW'`.
- Count toward board fill percentage.
- Can be targeted by Color Vex (contributing to the 'shadow' color weight) and Shape Vex (appearing as the 'SHADOW' shape in the present-shape set).
- Can hold vex marks if a vex-marked piece later locks on top of them.
- Participate in line clears normally.

### Gravity collapse definition

For each column independently:

1. Count occupied cells in that column.
2. Clear the column.
3. Place the same occupied cells from bottom upward, preserving their relative top-to-bottom order.

For Shadow Vex, preserving relative order has no visual effect unless shadow blocks later carry metadata. This is a forward-compatibility hook.

### Feedback

- Screen darkens for 300 milliseconds.
- Existing locked blocks fade out.
- Empty-space mask flashes with glyph outlines.
- Shadow blocks drop to the bottom.
- Show text: "Shadow Vex: board inverted."
- Play low-impact shadow sound.

### Risk note

Shadow Vex can create many filled cells. Its value comes from reshaping a dangerous board into a new configuration. Tune the result carefully so it feels powerful without becoming an automatic save.

## 17. Casting rules

The player can cast a vex while a piece is active, including during lock delay.

All casts are single-fire. Rapid double-tap of V is guarded: only one cast can resolve per press event. The player must release V before another V cast can trigger.

While `castState.active` is true (a cast animation is in progress), ignore all additional V presses. Do not buffer repeat casts during cast animation.

### Full cast resolution sequence (master rule)

This is the global cast sequence. All vex types follow these steps. Individual vex sections reference this master sequence rather than restating cast order.

1. Freeze the game loop: gravity timer, lock timer, input repeat timers (DAS/ARR), and all non-cast animations pause.
2. The active piece remains visible and frozen in its current position.
3. The board effect resolves (color destruction, shape destruction, or shadow inversion).
4. Gravity collapse runs.
5. Line clears resolve. Line clear animation runs as part of the cast animation timeline.
6. If the active piece now collides with modified locked cells, shift it upward until no collision exists, with a maximum of 2 cells. If still colliding after 2 shifts, trigger game over. This rule prevents board transforms from creating undefined overlap states.
7. Resume the game loop: gravity timer, lock timer, input repeat timers (DAS/ARR), and non-cast animations resume.
8. If the active piece is grounded after resumption, reset the lock delay timer to 500 ms. Do not reset the piece's lock-reset movement counter unless the player performs a valid move or rotation after the cast.
9. Input buffer becomes active again.

### Cast animation timing

During a cast (`castState.active === true`):

- **Frozen:** gameplay timers — gravity timer, lock delay timer, DAS/ARR repeat timers.
- **Frozen:** non-cast animations — line clear animations from pre-cast clears, particle systems not related to the cast, UI transitions not related to the cast.
- **Continues:** the cast animation timeline — `castState.progressMs` advances normally. This includes the vex effect animation, gravity collapse animation, and any line clear animations triggered by the cast itself.

In practice: the cast owns the visual timeline while it is active. The game world is paused and the cast unfolds its effects sequentially within that pause.

### Timing restrictions

Vex casts cannot occur while line clear animation is resolving. If V is pressed during line clear animation, buffer the cast for 250 milliseconds. If still valid after the animation, execute it.

Vex casts cannot occur during another vex cast animation. V presses during an active `castState` are ignored — they are not buffered.

## 18. Scoring

MVP scoring defaults:

| Event | Points |
|---|---|
| Single line clear | 100 × level |
| Double line clear | 300 × level |
| Triple line clear | 500 × level |
| Quad line clear | 800 × level |
| Soft drop | 1 point per cell |
| Hard drop | 2 points per cell |
| Vex alignment grant | 150 × level |
| Color Vex destroyed cell | 5 × level per cell |
| Shape Vex destroyed cell | 5 × level per cell |
| Shadow Vex cast | 250 × level |

Post-vex line clears use normal line clear scoring.

### Combo scoring

**Combo increment:** A lock event that clears at least one line increments the combo counter by 1.

**Combo reset:** A lock event that clears zero lines resets the combo counter to 0.

**Combo bonus:** 50 × `comboIndex` × level, awarded when a line-clearing lock event occurs.

**Vex interactions with combo:**

- Vex casts do not increment combo by themselves.
- Vex destruction alone does not change the combo counter.
- If a vex cast causes line clears after collapse, score those line clears normally but do **not** increment the lock-based combo counter. The combo counter remains unchanged.
- Shadow Vex's post-collapse line clears follow the same rule: score normally, no combo increment.

## 19. Leveling and gravity

Lines required per level: 10.

Level starts at 1.

Gravity speed increases each level.

### Gravity table

| Level | Gravity interval (ms per row) |
|---|---|
| 1 | 1000 |
| 2 | 900 |
| 3 | 800 |
| 4 | 700 |
| 5 | 600 |
| 6 | 500 |
| 7 | 420 |
| 8 | 350 |
| 9 | 280 |
| 10+ | Reduce by 20 ms per level, floor at 80 ms |

### Lock delay

Lock delay default: 500 ms.

Lock delay reset limit: 15 movement or rotation resets per piece.

Hard drop bypasses lock delay — the piece locks instantly.

## 20. Visual design direction

Theme:

Arcane geometry, neon glyphs, dark glass board, bright readable pieces, magic-symbol overlays.

Board style:

- Dark background grid.
- Subtle vignette.
- High contrast cells.

Vex cells use a bright magic symbol overlay that remains visible on top of color.

Ghost piece: translucent outline of the active piece at its landing position. Uses the active piece's color at reduced opacity (approximately 20-30%). Does not render vex marks.

Color Vex effect: target color pulses, then dissolves.

Shape Vex effect: target shape outlines appear over matching cells, then fracture.

Shadow Vex effect: board flips into a dark negative-space silhouette. Empty spaces gain ghost glyphs, then fall as shadow mass.

Readability rule:

Gameplay readability takes priority over decorative effects. All effects must be skippable or reduced through a low-effects setting.

## 21. Audio design direction

Audio should communicate state changes clearly:

| Event | Sound |
|---|---|
| Move | Short tick |
| Rotate | Soft mechanical click |
| Soft drop | Low repeating tick |
| Hard drop | Heavier impact |
| Line clear | Escalating magical sweep |
| Vex mark spawn | Tiny chime |
| Vex alignment | Spell capture sound |
| Color Vex cast | Crystalline burn |
| Shape Vex cast | Fracture burst |
| Shadow Vex cast | Deep reverse swell |
| Denied cast (ineligible vex) | Short muted thud |
| Denied cast (empty bank) | Short muted thud |
| Game over | Low descending tone |

## 22. UI requirements

### Main gameplay UI

- Score
- Level
- Lines cleared
- Next piece preview (3 pieces)
- Spell bank
- Selected spell indicator with frame highlight
- Board fill percent (percentage or compact meter)
- Pause menu
- Game over summary

### Next piece preview

Show 3 upcoming pieces in a vertical stack.

Preview pieces are shown as small icons — just the shape in its correct color, not full-size tetrominoes.

### Spell bank UI

- Show up to 9 stored vexes.
- Selected vex has a visible frame highlight.
- Each vex icon has unique color and symbol:
  - Color Vex: multi-color gem icon
  - Shape Vex: geometric fracture icon
  - Shadow Vex: dark eye or void icon
- Shadow Vex icon shows a locked/disabled state until the board reaches 40 percent fill. When eligible, the locked indicator is removed.

### Board fill percent

Display as a percentage with a compact progress-style meter. This helps the player understand Shadow Vex eligibility at a glance.

### Ghost piece

Rendered on the board as a translucent outline of the active piece at the lowest legal drop position. Updates immediately on piece movement and rotation.

## 23. Data model

TypeScript interfaces:

```ts
export type ShapeId = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L' | 'SHADOW';
export type ColorId = 'cyan' | 'gold' | 'violet' | 'green' | 'red' | 'blue' | 'orange' | 'shadow';
export type VexType = 'COLOR' | 'SHAPE' | 'SHADOW';

export interface Cell {
  occupied: boolean;
  colorId?: ColorId;
  shapeId?: ShapeId;
  hasVexMark?: boolean;
}

export interface ActivePiece {
  id: string;
  shapeId: ShapeId;
  colorId: ColorId;
  rotationState: number;
  origin: { x: number; y: number };
  blocks: Array<{ x: number; y: number }>;
  vexMarkBlockIndex?: number;
}

export interface GhostPiece {
  shapeId: ShapeId;
  colorId: ColorId;
  rotationState: number;
  origin: { x: number; y: number };
  blocks: Array<{ x: number; y: number }>;
}

export interface VexSpell {
  id: string;
  type: VexType;
  grantedAtLevel: number;
  grantedAtTick: number;
}

export interface GameState {
  board: Cell[][];              // board[row][col], 22 rows × 10 cols. row 0..21.
  activePiece?: ActivePiece;
  ghostPiece?: GhostPiece;
  nextQueue: ShapeId[];         // Exactly 3 upcoming shapes
  spellBank: VexSpell[];
  selectedSpellIndex: number;   // -1 when bank is empty
  score: number;
  level: number;
  linesCleared: number;
  comboCount: number;
  status: 'READY' | 'PLAYING' | 'PAUSED' | 'ANIMATING' | 'CASTING' | 'GAME_OVER';
  // Runtime state
  gravityTimerMs: number;
  lockDelayTimerMs: number;
  lockResetCount: number;
  dasState: { direction: 'left' | 'right' | null; timerMs: number; active: boolean };
  arrState: { direction: 'left' | 'right' | null; timerMs: number; active: boolean };
  inputBuffer: { action: string; timestampMs: number } | null;
  castState: { active: boolean; vexType?: VexType; progressMs: number };
  animationQueue: Array<{ type: string; startMs: number; durationMs: number; data?: Record<string, unknown> }>;
  // Reproducibility and RNG
  rngSeed: string;              // The seed string supplied at game start
  rngState: number;             // Current Mulberry32 state (32-bit unsigned integer)
  gameTick: number;             // Monotonically increasing tick counter
  pieceBag: ShapeId[];          // Current 7-bag (active bag being drawn from)
  pieceBagIndex: number;        // Draw position within the current bag
  nextSpellId: number;          // Monotonically increasing spell ID counter
}
```

### Runtime field descriptions

| Field | Purpose |
|---|---|
| `comboCount` | Current combo chain. Reset to 0 on a lock that clears zero lines |
| `gravityTimerMs` | Time elapsed since last gravity tick. Resets on drop |
| `lockDelayTimerMs` | Time elapsed since piece grounded. Piece locks when this reaches lock delay |
| `lockResetCount` | Number of times lock delay has been reset. Capped at 15 |
| `dasState` | Delayed Auto Shift state for held left/right keys |
| `arrState` | Auto Repeat Rate state after DAS fires |
| `inputBuffer` | Single buffered action with timestamp. Cleared after 150 ms or on consumption |
| `castState` | Tracks active cast animation. V input is ignored while `active` is true |
| `animationQueue` | Ordered queue of pending animations for the renderer |
| `rngSeed` | Seed string. Hashed with FNV-1a 32-bit to produce initial `rngState` |
| `rngState` | Current Mulberry32 PRNG state. Updated on every random call |
| `gameTick` | Incremented once per game loop tick. Used for reproducibility and event ordering |
| `pieceBag` | The current 7-bag array of ShapeId values being drawn from |
| `pieceBagIndex` | Index into `pieceBag` for the next draw. Resets to 0 when bag is exhausted and reshuffled |
| `nextSpellId` | Counter incremented each time a spell is granted. Used for unique spell IDs |

## 24. Engine architecture

Recommended module structure:

```
src/
  engine/
    board.ts          Board storage, cell access, collision checks, line clear detection, gravity collapse
    pieces.ts         Tetromino definitions, rotation states, wall kicks, piece spawn, ghost piece calculation
    random.ts         Seeded RNG (FNV-1a + Mulberry32), 7-bag shuffling, weighted vex selection
    input.ts          Keyboard state, input buffering, DAS, ARR, action mapping, double-tap guard
    gameLoop.ts       Tick loop, gravity timing, lock delay, status transitions, combo tracking
    vex.ts            Vex mark spawning, alignment detection, spell bank management, vex cast effects
  render/
    canvasRenderer.ts Board rendering, active piece, ghost piece, next-piece preview, particles, animations, UI hooks
  audio/
    audioManager.ts   Sound events, volume controls, mute
  config/
    gameConfig.ts     Board size, gravity table, scoring, vex weights, input timings, DAS/ARR defaults
  tests/
    Unit and integration tests
```

## 25. Board service functions

Required board functions:

- `createEmptyBoard(cols, totalRows, hiddenRows)` → creates `board[row][col]` as row-major 2D array
- `getCell(row, col)` → access by array indices
- `setCell(row, col, cell)`
- `isInsideVisibleBoard(row, col)` → true for array rows 2..21, col 0..9
- `isInsideTotalBoard(row, col)` → true for array rows 0..21, col 0..9
- `logicalToArrayRow(y)` → returns `y + hiddenRows`
- `arrayToLogicalRow(row)` → returns `row - hiddenRows`
- `collides(piece, board)` → checks piece blocks against occupied cells using array row indices
- `lockPiece(piece, board)` → writes piece cells into `board[row][col]`
- `findCompletedRows(board)` → scans visible rows (2..21) for full occupancy
- `clearRows(board, rowIndexes)` → removes rows by array row index, also removes vex marks in cleared rows
- `collapseColumns(board)` → gravity collapse across total board (rows 0..21)
- `getVisibleOccupiedCount(board)` → counts occupied cells in rows 2..21
- `getTotalOccupiedCount(board)` → counts occupied cells in rows 0..21
- `getVisibleFillPercent(board)` → `getVisibleOccupiedCount / 200`
- `cloneBoard(board)`
- `calculateGhostPosition(piece, board)` → returns lowest legal position for ghost piece

## 26. Vex service functions

Required vex functions:

- `maybeAttachVexMark(piece, rng, config)`
- `findVexAlignments(board, spellBank, config)` → includes full-bank early-exit gate; scans visible cells only
- `consumeVexMarks(board, alignmentPair)`
- `grantRandomVex(spellBank, rng, config, nextSpellId)` → assigns spell ID
- `canCastVex(vexType, gameState)`
- `castSelectedVex(gameState)` → follows global cast sequence (§17)
- `castColorVex(gameState)` → weighted target selection across total board (rows 0..21)
- `castShapeVex(gameState)` → uniform random target selection across total board (rows 0..21)
- `castShadowVex(gameState)` → visible-only; follows global cast sequence; shadow blocks become normal locked cells
- `selectRandomPresentColorWeighted(board, rng)` → scans total board (rows 0..21), weighted by cell count
- `selectRandomPresentShape(board, rng)` → scans total board (rows 0..21), uniform random
- `createInverseShadowBoard(board)` → operates on visible cells only (rows 2..21)

## 27. Randomness and reproducibility

All random outcomes must go through one seeded RNG service:

- Piece bag shuffle.
- Vex mark spawn.
- Vex mark location on piece.
- Random vex type granted (weighted table).
- Random target color for Color Vex (weighted).
- Random target shape for Shape Vex (uniform).

### RNG algorithm (locked for MVP)

**Seed hashing:** FNV-1a 32-bit.

The seed string (e.g., `"VEXTRIS-ABC123"`) is hashed using the FNV-1a 32-bit algorithm to produce the initial RNG state.

FNV-1a 32-bit constants:
- FNV offset basis: `0x811C9DC5`
- FNV prime: `0x01000193`

Algorithm:
```
hash = 0x811C9DC5
for each byte in seed string:
    hash = hash XOR byte
    hash = (hash * 0x01000193) & 0xFFFFFFFF
```

**PRNG:** Mulberry32.

The 32-bit hash is used as the initial state for a Mulberry32 PRNG.

```
state = hash  (from FNV-1a)
next():
    state = (state + 0x6D2B79F5) & 0xFFFFFFFF
    z = state
    z = (z ^ (z >>> 15)) * (z | 1)
    z = (z + ((z ^ (z >>> 7)) * (z | 61))) & 0xFFFFFFFF
    return (z ^ (z >>> 14)) >>> 0
```

Returns a 32-bit unsigned integer in [0, 2^32 - 1].

**Normalization helpers:**
- `rng.nextFloat()` → `next() / 2^32` (returns [0, 1))
- `rng.nextInt(max)` → `floor(nextFloat() * max)` (returns [0, max))
- `rng.shuffle(array)` → Fisher-Yates shuffle using `nextInt`

**GameState fields supporting RNG:**
- `rngSeed: string` — the original seed string.
- `rngState: number` — the current Mulberry32 state (updated on every `next()` call).
- `gameTick: number` — monotonically increasing, incremented once per game loop iteration. Not used as an entropy source; purely for reproducibility and event ordering.
- `pieceBag: ShapeId[]` — the active 7-bag.
- `pieceBagIndex: number` — draw position within the bag.
- `nextSpellId: number` — incremented each time a spell is granted, producing unique `VexSpell.id` values.

QA must be able to run a fixed seed and reproduce the same sequence of pieces, marks, vex grants, and targets.

## 28. MVP acceptance criteria

### Gameplay

- Player can start a game, control falling pieces, rotate, soft drop, hard drop, clear lines, level up, pause, restart, and reach game over.
- Pieces spawn using the 7-bag system.
- Ghost piece renders translucent at landing position without affecting collision or vex alignment.
- Locked cells retain `colorId` and `shapeId`.
- Vex marks are visible on active falling pieces.
- Vex marks appear at the configured rarity.
- Two locked vex marks touching in any of the 8 directions (visible cells only) grant a random vex.
- Full bank blocks all alignment detection — no marks consumed, no scanning occurs.
- Cluster processing uses immediate consumption in the specified direction order.
- Used vex marks are removed from cells while the cells remain on the board.
- Spell bank stores multiple vexes.
- Player can cycle selected vex with C.
- Player can cast selected vex with V.
- After casting, selectedSpellIndex remains at the same logical position (clamped if the cast spell was last in bank), or -1 if bank is empty.
- Color Vex destroys all locked cells of one color chosen with weighted random (total board, including hidden rows), and collapses columns.
- Shape Vex destroys all locked cells of one shape chosen uniformly (total board, including hidden rows), and collapses columns.
- Shadow blocks created by Shadow Vex are normal locked cells targetable by Color Vex and Shape Vex.
- Shadow Vex cannot cast before 40 percent visible board fill.
- Shadow Vex casts at 40 percent or above, creates inverse occupancy, clears original blocks, collapses shadow blocks to bottom, evaluates line clears BEFORE resuming game loop.
- Scoring updates for line clears, drops, vex grants, and vex effects.
- Combo increments on line-clearing locks, resets on non-clearing locks, and is unaffected by vex casts.
- Casting freezes the full game loop. Non-cast animations freeze during cast. Cast animation timeline continues. Lock delay resets to 500 ms after cast if piece is grounded.
- Casting during another cast animation is ignored.
- Double-tap V is guarded — only one cast per press event.
- Empty spell bank shows "No vex stored" feedback.
- Hard drop instantly locks the piece.
- Seeded RNG reproduces identical runs.

### UI

- Score, level, lines, 3-piece next preview, spell bank, selected spell, and board fill percentage are visible.
- Ghost piece is visible and updates in real time.
- Vex cells are visually distinct.
- Vex casts produce clear visual and audio feedback.
- Denied casts produce clear feedback without consuming the spell.
- Shadow Vex icon shows locked state below 40 percent fill.

### Technical

- Game runs at a stable 60 FPS target on modern desktop browsers.
- Core logic has unit tests for board, piece, line clear, ghost piece, vex alignment, and vex effects.
- RNG seed reproduces runs (FNV-1a + Mulberry32).
- Config file controls board size, scoring values, gravity table, vex spawn rate, vex weights, DAS, ARR, and other tuning parameters.

## 29. QA test matrix

### Board and line clearing

- Single, double, triple, and quad clears.
- Multiple separated row clears.
- Collapse after line clear.
- Game over on blocked spawn.
- Vex marks in cleared rows are removed (alignment runs after clear).
- `board[row][col]` indexing: verify `logicalToArrayRow(0)` returns `hiddenRows`; verify `logicalToArrayRow(-1)` returns 1.
- Visible board check: `isInsideVisibleBoard` returns false for rows 0 and 1, true for rows 2..21.

### Piece movement

- Wall collision.
- Stack collision.
- Rotation near walls.
- Rotation near stacked cells.
- Soft drop.
- Hard drop (instant lock).
- Lock delay.
- Lock delay post-cast reset.

### Ghost piece

- Ghost piece renders at correct landing position.
- Ghost piece updates on movement.
- Ghost piece updates on rotation.
- Ghost piece does not affect collision.
- Ghost piece does not display vex marks.
- Ghost piece does not participate in vex alignment.

### Vex mark spawning

- No mark when RNG fails chance.
- One mark when RNG passes chance.
- Mark appears on valid block index.
- Mark is visible on active falling piece.
- Mark locks into board cell.
- Mark on a piece that completes a line (mark removed, no alignment).

### Vex alignment

- Horizontal adjacent pair grants vex.
- Vertical adjacent pair grants vex.
- Diagonal adjacent pair grants vex.
- Non-adjacent marks do not grant vex.
- Multiple pairs grant up to `vexMaxGrantsPerLock`.
- Consumed marks no longer trigger.
- Cluster processing uses immediate consumption with correct direction order.
- **Full-bank early exit:** spellBank has 9 vexes → alignment detection returns immediately, zero marks consumed.
- **Full-bank early exit:** spellBank has 9 vexes, board has 3 adjacent vex marks → no vex granted, all 3 marks remain.
- Alignment checks visible cells only — vex marks in hidden spawn rows (rows 0..1) are ignored by alignment detection.

### Spell bank

- Grant adds spell to queue.
- Full bank blocks grant and preserves marks (no scanning occurs).
- C cycles selected spell.
- V casts selected spell.
- **Post-cast index:** cast spell at index 1 in a 3-spell bank → index remains 1, now pointing to what was index 2.
- **Post-cast index:** cast the last spell in a 1-spell bank → index becomes -1 (empty bank).
- **Post-cast index:** cast last spell in a 3-spell bank (index 2) → index clamps to 1 (new last index).
- Failed cast does not consume spell.
- Empty bank V press shows "No vex stored".

### Color Vex (mocked-RNG boundary tests)

All Color Vex target selection tests use a mocked RNG to produce deterministic, repeatable results without statistical variance.

- **Boundary — zero cells:** board has no locked cells → cast fails with "No target color", spell not consumed.
- **Boundary — single cell:** board has 1 red cell → mocked RNG returns value selecting red → red cell destroyed, board empty.
- **Boundary — single color, many cells:** board has only blue cells → mocked RNG returns value selecting blue → all blue cells destroyed.
- **Weight calculation — uneven distribution:** board has 3 red cells and 1 green cell. Verify weight map is `{red: 3, green: 1}`.
  - Mocked RNG returns float 0.2 (below 3/4) → red selected.
  - Mocked RNG returns float 0.8 (above 3/4) → green selected.
- **Weight calculation — equal distribution:** board has 2 red, 2 blue, 2 green. Verify weights are equal (2 each).
  - Mocked RNG returns boundary values to select each color.
- **Hidden-row inclusion:** board has 1 cyan cell in hidden row (array row 1) and zero visible cells → cyan is still a valid target. Mocked RNG returns value selecting cyan → hidden cell destroyed.
- **Shadow-block inclusion:** board has 5 shadow cells from a prior Shadow Vex → weight map includes `{shadow: 5}`. Mocked RNG selects shadow → all shadow cells destroyed.
- **Multiple colors with shadow:** board has red=3, shadow=2, blue=1. Weights = 3, 2, 1. Mocked RNG at boundary values selects each correctly.

### Shape Vex

- Chooses only present shapes.
- Selection is uniform random from present shapes.
- Destroys all cells of selected shape.
- Leaves other shapes intact.
- Collapses columns.
- Triggers line clear after collapse.
- Fails with "No target shape" when no locked cells exist.
- **Hidden-row inclusion:** locked shape cells in hidden spawn rows are included in target selection.
- **Shadow-block inclusion:** SHADOW-shaped cells appear in the present-shape set and are valid targets.

### Shadow Vex

- Cannot cast below 80 occupied visible cells.
- Can cast at exactly 80 occupied visible cells.
- Can cast above 80 occupied visible cells.
- Original occupied cells are cleared.
- Former empty cells become shadow cells with `colorId='shadow'` and `shapeId='SHADOW'`.
- Shadow cells collapse to bottom.
- **Cast order:** line clears resolve BEFORE game loop resumes (per global cast sequence §17).
- **Cast order:** do NOT resume timers before evaluating line clears.
- Active piece resumes without undefined overlap.
- Game over if piece still collides after 2-cell upward shift.
- **Shadow-block targeting:** after resolution, shadow cells are normal locked cells. Verify Color Vex can target them (color 'shadow'). Verify Shape Vex can target them (shape 'SHADOW').
- **Hidden-row isolation:** hidden spawn rows (array rows 0..1) are untouched by Shadow Vex. Verify cells in hidden rows persist after cast.

### Casting guardrails

- Cast during another cast animation is ignored.
- Rapid double-tap V only fires one cast.
- Cast during line clear animation buffers for 250 ms.
- Full game loop pauses during cast (gravity, lock, DAS/ARR).
- Non-cast animations freeze during cast.
- Cast animation timeline (`castState.progressMs`) advances during cast.
- Lock delay resets after cast if piece is grounded.
- Lock-reset counter not changed by cast alone.

### Combo

- Combo increments on consecutive line-clearing locks.
- Combo resets to 0 on non-clearing lock.
- Vex casts do not affect combo counter.
- Post-vex line clears score normally without combo increment.

### RNG reproducibility

- Same seed produces identical sequence: pieces, vex marks, vex grants, Color Vex targets, Shape Vex targets.
- Different seeds produce different sequences.
- FNV-1a hash is deterministic for any seed string.
- Mulberry32 produces the expected sequence for known initial states.

## 30. Agentic team decomposition

Use narrow work slices. Each agent gets one deliverable and one acceptance target.

**Product agent:**
Deliverable: Final PRD review and open-issue list.
Acceptance target: Confirms rules, terminology, and MVP scope are internally consistent.

**Game engine agent:**
Deliverable: Board, pieces, ghost piece, collision, gravity, line clear, lock delay, combo tracking, and scoring modules. Board uses `board[row][col]` convention. Piece geometry uses Appendix A data.
Acceptance target: Unit tests pass for base falling-block gameplay without vexes. Ghost piece renders and updates correctly.

**Vex systems agent:**
Deliverable: Vex mark spawning, alignment detection (immediate consumption, full-bank early exit, visible-only scanning), spell bank (with post-cast index rules), cast guardrails, and the three vex effects (Color weighted including hidden rows, Shape uniform including hidden rows, Shadow 40% threshold, visible-only, shadow blocks become normal cells).
Acceptance target: Unit tests pass for all vex rules, edge cases, cluster processing, shadow-block targeting, and cast freeze/resume cycle.

**Input agent:**
Deliverable: Keyboard mapping, DAS, ARR, input buffering, double-tap guard, cast-during-cast guarding, pause, restart.
Acceptance target: Input behavior matches the controls section. DAS/ARR timer values are configurable.

**Rendering agent:**
Deliverable: Canvas renderer for board, active piece, ghost piece, vex marks, spell bank, 3-piece next preview, board fill meter, and core animations.
Acceptance target: All game states are readable and visual feedback exists for each vex effect. Ghost piece is translucent and updates in real time.

**Audio agent:**
Deliverable: Audio event map and placeholder sound implementation.
Acceptance target: Every required game event triggers the correct sound hook.

**QA agent:**
Deliverable: Automated test suite and manual test checklist.
Acceptance target: Test matrix is covered by automated tests where practical and manual cases where visual timing matters. Color Vex tests use mocked RNG for deterministic boundary testing.

**Integration agent:**
Deliverable: Complete playable build.
Acceptance target: MVP acceptance criteria pass in browser.

## 31. Suggested first implementation order

1. Create project scaffold (directory, package.json, tsconfig, basic HTML/CSS host).
2. Implement board model using `board[row][col]` convention.
3. Implement tetromino definitions and spawning (use Appendix A for geometry and wall kicks).
4. Implement ghost piece calculation and rendering.
5. Implement RNG service (FNV-1a + Mulberry32).
6. Implement input system with DAS/ARR.
7. Implement game loop (gravity, lock delay, combo).
8. Implement collision, lock, line clear, score, and level.
9. Implement renderer with simple cells and ghost piece.
10. Implement vex mark spawning (with visibility on active piece).
11. Implement vex alignment (immediate-consumption cluster processing, full-bank early exit, visible-only scan) and spell bank.
12. Implement Color Vex (weighted, total board including hidden rows, mocked-RNG QA).
13. Implement Shape Vex (uniform, total board including hidden rows, shadow-block targeting).
14. Implement Shadow Vex (40% threshold, visible-only, global cast sequence, shadow blocks become normal cells).
15. Implement cast guardrails (double-tap guard, cast-during-cast blocking, input buffering, animation timing).
16. Add animations and audio hooks.
17. Add tests (mocked-RNG boundary tests for Color Vex, board convention tests, spell bank index tests).
18. Tune spawn rates, scoring, and Shadow Vex feel.

## 32. Open decisions

**Spell persistence after game over:**
Current MVP stores spells only during one round. Future versions can add profile-level spell persistence.

**Vex mark frequency:**
Default is 8 percent per piece. Tune after playtesting.

**Shadow Vex difficulty impact:**
Default threshold is exactly 40 percent filled. Tune the collapse and line clear interaction after testing.

**Board skins:**
MVP uses one visual theme. Future versions can add skins.

**Hold piece:**
Excluded from MVP. Add later after core loop and vex system feel right.

**Audio assets:**
MVP uses placeholder sounds. Full audio production is future work.

## 33. Definition of done

The MVP is done when a player can complete a full Vextris round from start to game over, earn vexes by aligning magic-symbol blocks, store multiple vexes, cast Color Vex, Shape Vex, and Shadow Vex with clear feedback, and replay the same run from a seed for testing.

The build must be playable, readable, testable, and configurable.

## 34. Copy-ready mission prompt for an agentic coding team

Build Vextris as a web-first TypeScript falling-block puzzle game using HTML5 Canvas. Use the PRD and technical spec as the source of truth. Implement classic tetromino falling-block gameplay with a 10 by 20 board, 2 hidden spawn rows (board stored as `board[row][col]`, 22 rows total), 7-bag randomizer, ghost piece, rotation with SRS wall kicks (Appendix A), soft drop, instant-lock hard drop, line clears, scoring, combo tracking, levels, pause, and game over.

Add the vex system. Rare pieces contain one visible magic-symbol block. After a piece locks and line clears resolve, two locked vex-symbol cells touching horizontally, vertically, or diagonally (visible cells only) grant one random stored vex using immediate-consumption cluster processing. Full bank stops all alignment detection immediately with zero marks consumed. The stored vex types are Color Vex, Shape Vex, and Shadow Vex. The player cycles stored vexes with C and casts the selected vex with V. After casting, selectedSpellIndex stays at the same position (clamped if needed) or goes to -1 if the bank is empty. Casting freezes gameplay timers, freezes non-cast animations, advances the cast animation timeline, and guards against double-tap. All vex types follow the global cast sequence: freeze → effect → collapse → line clears → collision check → resume.

Color Vex selects one present board color with probability weighted by cell count across the total board (including hidden spawn rows), destroys every locked cell of that color, collapses columns, and resolves line clears. Shape Vex selects one present shape uniformly at random across the total board (including hidden spawn rows), destroys every locked cell from that shape, collapses columns, and resolves line clears. Shadow Vex requires at least 40 percent visible board fill, clears visible locked cells (hidden rows untouched), creates shadow blocks in the prior empty cells with `colorId='shadow'` and `shapeId='SHADOW'`, collapses them to the bottom, resolves line clears BEFORE resuming the game loop. After Shadow Vex resolves, shadow blocks are normal locked cells targetable by Color Vex and Shape Vex.

Combo increments on line-clearing locks and resets on non-clearing locks. Vex casts do not affect combo. Post-vex line clears score normally without combo increment.

Use FNV-1a 32-bit hashing plus Mulberry32 PRNG for all randomness. Store `colorId` and `shapeId` on every locked cell. Keep game rules data-driven through config (including DAS=167ms, ARR=33ms defaults). Include unit tests for board logic, piece logic, ghost piece, line clears, vex alignment (cluster processing + full-bank early exit), spell bank behavior (including post-cast index rules), cast guardrails (animation timing), combo tracking, and all three vex effects (with mocked-RNG boundary tests for Color Vex). Deliver a playable browser build with clear visual feedback, placeholder audio hooks, and a compact UI showing score, level, lines, 3-piece next preview, spell bank, selected spell, and board fill percent.

---

## Appendix A: Piece Geometry

This appendix defines the exact coordinates, spawn origins, rotation states, and wall kick data for all seven tetrominoes. All coordinates are given as `{x, y}` offsets relative to the piece origin. Positive x is right, positive y is down (matching the board's logical coordinate system).

### A.1 Piece Shapes by Rotation State

Each shape is defined as an array of 4 block coordinates for each rotation state (0 through 3).

```
I-PIECE (cyan)

State 0: [(0,1), (1,1), (2,1), (3,1)]
State 1: [(2,0), (2,1), (2,2), (2,3)]
State 2: [(0,2), (1,2), (2,2), (3,2)]
State 3: [(1,0), (1,1), (1,2), (1,3)]

O-PIECE (gold)

State 0: [(0,0), (1,0), (0,1), (1,1)]
State 1: [(0,0), (1,0), (0,1), (1,1)]
State 2: [(0,0), (1,0), (0,1), (1,1)]
State 3: [(0,0), (1,0), (0,1), (1,1)]
(O-piece does not change with rotation.)

T-PIECE (violet)

State 0: [(0,0), (1,0), (2,0), (1,1)]
State 1: [(1,0), (0,1), (1,1), (1,2)]
State 2: [(1,0), (0,1), (1,1), (2,1)]
State 3: [(0,0), (0,1), (1,1), (0,2)]

S-PIECE (green)

State 0: [(1,0), (2,0), (0,1), (1,1)]
State 1: [(1,0), (1,1), (2,1), (2,2)]
State 2: [(1,1), (2,1), (0,2), (1,2)]
State 3: [(0,0), (0,1), (1,1), (1,2)]

Z-PIECE (red)

State 0: [(0,0), (1,0), (1,1), (2,1)]
State 1: [(2,0), (1,1), (2,1), (1,2)]
State 2: [(0,1), (1,1), (1,2), (2,2)]
State 3: [(1,0), (0,1), (1,1), (0,2)]

J-PIECE (blue)

State 0: [(0,0), (0,1), (1,1), (2,1)]
State 1: [(1,0), (2,0), (1,1), (1,2)]
State 2: [(0,1), (1,1), (2,1), (2,2)]
State 3: [(1,0), (1,1), (0,2), (1,2)]

L-PIECE (orange)

State 0: [(2,0), (0,1), (1,1), (2,1)]
State 1: [(1,0), (1,1), (1,2), (2,2)]
State 2: [(0,1), (1,1), (2,1), (0,2)]
State 3: [(0,0), (1,0), (1,1), (1,2)]
```

### A.2 Spawn Origins

When a piece spawns, its origin is placed at a fixed board position. The piece blocks are then computed as origin + block offset for each cell.

| Piece | Spawn (logical x, logical y) | Notes |
|---|---|---|
| I | (3, 0) | Spawns in row 0 of visible board |
| O | (4, 0) | Centered; occupies columns 4-5 |
| T, S, Z, J, L | (3, 0) | Standard 3-wide pieces |

Spawn rotation state is always 0.

The spawn position places the origin on the visible board. Some blocks may extend into hidden spawn rows (y = -1, -2) depending on the piece shape. This is normal — the hidden rows exist to accommodate pieces that extend above the visible area at spawn.

### A.3 Wall Kick Data

Wall kicks are applied when a rotation would place a piece in an illegal position (collision or out of bounds). The engine tests a sequence of offset positions. The first offset that produces a legal placement is used. If all five tests fail, the rotation is denied.

Wall kick offsets use `(dx, dy)` where:
- **dx:** column offset. Positive = right.
- **dy:** row offset. **Positive = UP** (opposite of the board's y-axis).

To apply a kick `(dx, dy)` in board coordinates:
```
newOrigin.x = origin.x + dx
newOrigin.y = origin.y - dy   // dy positive = up = subtract from logical y
```

#### A.3.1 J, L, S, Z, T Kicks (3×3 bounding box pieces)

```
0→1: ( 0, 0)  (-1, 0)  (-1,+1)  ( 0,-2)  (-1,-2)
1→2: ( 0, 0)  (+1, 0)  (+1,-1)  ( 0,+2)  (+1,+2)
2→3: ( 0, 0)  (+1, 0)  (+1,+1)  ( 0,-2)  (+1,-2)
3→0: ( 0, 0)  (-1, 0)  (-1,-1)  ( 0,+2)  (-1,+2)
```

For counterclockwise rotation (Z key), use the reverse transition:
```
1→0: negate dx of 0→1 kicks
2→1: negate dx of 1→2 kicks
3→2: negate dx of 2→3 kicks
0→3: negate dx of 3→0 kicks
```

#### A.3.2 I-Piece Kicks

```
0→1: ( 0, 0)  (-2, 0)  (+1, 0)  (-2,-1)  (+1,+2)
1→2: ( 0, 0)  (-1, 0)  (+2, 0)  (-1,+2)  (+2,-1)
2→3: ( 0, 0)  (+2, 0)  (-1, 0)  (+2,+1)  (-1,-2)
3→0: ( 0, 0)  (+1, 0)  (-2, 0)  (+1,-2)  (-2,+1)
```

For counterclockwise, negate dx of the corresponding clockwise transition.

#### A.3.3 O-Piece Kicks

The O-piece does not rotate. All kick tables are `[(0,0)]` (no offset tests needed).

### A.4 Rotation Rules

- Clockwise rotation (Up Arrow): advances `rotationState` by +1 (mod 4).
- Counterclockwise rotation (Z key): decreases `rotationState` by -1 (mod 4).
- Rotation applies the wall kick table for the `fromState → toState` transition.
- If all five kick offsets fail, the rotation is denied and the piece stays in its original state.
