# Vextris

Vextris is a classic falling-block puzzle game with magic spells, wrapped in an arcane jewel-tone aesthetic.

Vex glyphs ✦ appear on random blocks as they fall. Lock two marked cells beside each other to earn a spell — then cast it to clear the board or flip the game. Make the top 10 and leave your initials on the scoreboard, just like the old arcade cabinets.

[Play on GitHub Pages](https://xbillwatsonx.github.io/vextris)

---

## Getting Started

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Press any key on the intro screen to see the instructions, then press any key again to play.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Type-check and build into `dist/` |
| `npm test` | Run 344 tests (Vitest) |
| `npm run preview` | Preview the production build locally |

## Tech

TypeScript, Vite, Vitest. Canvas-rendered on a pure black background with a spell bank side panel. localStorage-backed high score table (top 10) with retro 3-letter initials entry.

## Visual Style

The game uses an arcane jewel-tone palette inspired by dark magic and retro arcade cabinets:

| Role | Color |
|---|---|
| Background | `#000000` solid black |
| Board grid | `#2A1840` dark purple |
| Panels / cards | `#140B24` Temple Indigo |
| Borders / accents | `#6E2BFF` Arcane Purple |
| Primary text | `#F3EEFF` Moon Mist |
| Secondary text | `#D9C6FF` Soft Lavender |
| Score / gold | `#F5B83D` Rune Gold |

**Piece colors:**

| Piece | Color |
|---|---|
| I (cyan) | `#2FE7FF` Crystal Cyan |
| O (gold) | `#F5B83D` Rune Gold |
| T (violet) | `#8B3FCF` Deep Purple |
| S (green) | `#2EBD6F` Dark Jewel Green |
| Z (red) | `#FF4FD8` Spell Pink |
| J (blue) | `#2563EB` Cobalt Blue |
| L (orange) | `#FF8C2A` Amber Flame |
| Shadow | `#24113D` Deep Rune Purple |

## Project Structure

```
vextris/
├── src/
│   ├── engine/        # Game logic: board, pieces, game loop, vex system, scores
│   ├── render/        # Canvas renderer
│   ├── audio/         # Sound effects via Web Audio + background music
│   ├── config/        # Tuning constants (gravity, scoring, DAS/ARR)
│   └── tests/         # 344 tests across 10 test files
├── public/            # Static assets and entry point (main.ts)
├── images/            # Artwork source files
└── docs/              # Design doc and proposals
```

## Controls

| Action | Key |
|---|---|
| Move left / right | ← → |
| Soft drop | ↓ |
| Hard drop | Space |
| Rotate clockwise | ↑ |
| Rotate counter-clockwise | Z |
| Cycle spell | C |
| Cast spell | V |
| Pause | P or Esc |
| Mute | M |

## Spells

- **Color Vex** ◆ — Clears every cell of one random color
- **Shape Vex** ◈ — Clears every cell matching one random piece shape
- **Shadow Vex** ◉ — Inverts the board (requires 40% fill)

## High Scores

Top 10 scores are saved to localStorage. If your score makes the board, you'll be prompted to enter your 3-letter initials — type A-Z, backspace to correct, Enter to confirm. Non-high-scores are saved as `---`.

---

*Built by [Bill Watson](https://github.com/xbillwatsonx) — first project, learning to code.*
