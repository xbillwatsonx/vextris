/**
 * Vextris — Main Entry Point
 *
 * Initializes the game, wires keyboard input, runs the game loop,
 * and renders every frame via the canvas renderer.
 */

import { createGameState, startGame, moveLeft, moveRight, softDrop, hardDrop, rotateCW, rotateCCW, tick, cycleSpell, castSelectedSpell } from '../src/engine/gameLoop';
import { render } from '../src/render/canvasRenderer';
import { playSound, toggleMute } from '../src/audio/audioManager';

// ─── DOM References ──────────────────────────────────────────────

const gameCanvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const nextCanvas = document.getElementById('next-canvas') as HTMLCanvasElement;
const spellContainer = document.getElementById('spell-slots')!;

const gameCtx = gameCanvas.getContext('2d')!;
const nextCtx = nextCanvas.getContext('2d')!;

// ─── Input State ────────────────────────────────────────────────

const keys = new Set<string>();
let vKeyReleased = true; // release-based double-tap guard (§17)

document.addEventListener('keydown', (e) => {
  keys.add(e.code);

  // Immediate actions (no repeat needed)
  switch (e.code) {
    case 'Space':
      e.preventDefault();
      hardDrop(state);
      playSound('hard_drop');
      break;
    case 'KeyV': {
      e.preventDefault();
      if (!vKeyReleased) break; // must release V before another cast
      vKeyReleased = false;
      const result = castSelectedSpell(state);
      break;
    }
    case 'KeyC':
      cycleSpell(state);
      break;
    case 'KeyP':
      if (state.status === 'PLAYING') {
        state.status = 'PAUSED';
        playSound('pause');
      } else if (state.status === 'PAUSED') {
        state.status = 'PLAYING';
        playSound('resume');
      }
      break;
    case 'ArrowUp':
      e.preventDefault();
      rotateCW(state);
      playSound('rotate');
      break;
    case 'KeyZ':
      e.preventDefault();
      rotateCCW(state);
      playSound('rotate');
      break;
    case 'Escape':
      if (state.status === 'PLAYING') {
        state.status = 'PAUSED';
        playSound('pause');
      } else if (state.status === 'PAUSED') {
        state.status = 'PLAYING';
        playSound('resume');
      }
      break;
    case 'KeyR':
      if (state.status === 'GAME_OVER') {
        restartGame();
      }
      break;
    case 'KeyM':
      toggleMute();
      break;
  }
});

document.addEventListener('keyup', (e) => {
  keys.delete(e.code);
  if (e.code === 'KeyV') {
    vKeyReleased = true;
  }
});

// ─── Game State ─────────────────────────────────────────────────

const seed = 'VEXTRIS-' + Math.random().toString(36).slice(2, 8).toUpperCase();
const state = createGameState(seed);

function restartGame(): void {
  const newSeed = 'VEXTRIS-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const newState = createGameState(newSeed);
  Object.assign(state, newState);
  startGame(state);
  playSound('resume');
}

// ─── Game Loop ──────────────────────────────────────────────────

let lastFrame = performance.now();
const DAS_DELAY = 167; // ms before auto-repeat starts
const ARR_INTERVAL = 33; // ms between auto-repeat moves
let dasTimer = 0;
let arrTimer = 0;
let dasDirection: 'left' | 'right' | null = null;

function gameLoop(now: number): void {
  const deltaMs = now - lastFrame;
  lastFrame = now;

  if (state.status === 'PLAYING') {
    // Tick game logic
    tick(state, deltaMs);

    // Handle held keys (DAS/ARR for left/right, soft drop)
    handleHeldKeys(deltaMs);
  }

  // Render
  render(gameCtx, nextCtx, nextCanvas, spellContainer, state);

  requestAnimationFrame(gameLoop);
}

function handleHeldKeys(deltaMs: number): void {
  const leftHeld = keys.has('ArrowLeft');
  const rightHeld = keys.has('ArrowRight');
  const downHeld = keys.has('ArrowDown');
  const upHeld = keys.has('ArrowUp');
  const zHeld = keys.has('KeyZ');

  // Rotation (one-shot, triggered once on press)
  // Already handled in keydown — DAS not needed for rotation

  // Soft drop — repeat while held
  if (downHeld) {
    softDrop(state);
    playSound('soft_drop');
  }

  // DAS/ARR for horizontal movement
  const newDirection = leftHeld ? 'left' : rightHeld ? 'right' : null;

  if (newDirection !== dasDirection) {
    // Direction changed or released
    dasDirection = newDirection;
    dasTimer = 0;
    arrTimer = 0;

    // Initial press: move immediately
    if (newDirection === 'left') {
      moveLeft(state);
      playSound('move');
    } else if (newDirection === 'right') {
      moveRight(state);
      playSound('move');
    }
  } else if (dasDirection) {
    // Same direction held
    dasTimer += deltaMs;

    if (dasTimer >= DAS_DELAY) {
      arrTimer += deltaMs;

      while (arrTimer >= ARR_INTERVAL) {
        arrTimer -= ARR_INTERVAL;
        if (dasDirection === 'left') {
          moveLeft(state);
          playSound('move');
        } else {
          moveRight(state);
          playSound('move');
        }
      }
    }
  }
}

// ─── Start ──────────────────────────────────────────────────────

startGame(state);
console.log(`Vextris started. Seed: ${state.rngSeed}`);
lastFrame = performance.now();
requestAnimationFrame(gameLoop);
