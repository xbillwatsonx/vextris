# Vextris

Vextris is a classic falling-block puzzle game with magic spells.

Vex glyphs ✦ appear on random blocks as they fall. Lock two marked cells beside each other to earn a spell — then cast it to clear the board or flip the game.

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
| `npm test` | Run 321+ tests (Vitest) |
| `npm run preview` | Preview the production build locally |

## Tech

TypeScript, Vite, Vitest. Canvas-rendered on a pure black background with a spell bank side panel. localStorage-backed high score table (top 10).

## Project Structure

```
vextris/
├── src/
│   ├── engine/        # Game logic: board, pieces, game loop, vex system, scores
│   ├── render/        # Canvas renderer
│   ├── audio/         # Sound effects via Web Audio
│   ├── config/        # Tuning constants (gravity, scoring, DAS/ARR)
│   └── tests/         # 321 tests across 9 test files
├── public/            # Static assets and entry point (main.ts)
├── images/            # Artwork source files
└── docs/              # Design doc and conversation log
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

---

*Built by [Bill Watson](https://github.com/xbillwatsonx) — first project, learning to code.*
