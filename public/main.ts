/**
 * Vextris — Main Entry Point
 *
 * Initializes the game, wires keyboard input, runs the game loop,
 * and renders every frame via the canvas renderer.
 */

import { createGameState, startGame, moveLeft, moveRight, softDrop, hardDrop, rotateCW, rotateCCW, tick, cycleSpell, castSelectedSpell } from '../src/engine/gameLoop';
import { render } from '../src/render/canvasRenderer';
import { playSound, toggleMute } from '../src/audio/audioManager';
import { saveScore, loadScores } from '../src/engine/scores';

// ─── DOM References ──────────────────────────────────────────────

const gameCanvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const nextCanvas = document.getElementById('next-canvas') as HTMLCanvasElement;
const spellContainer = document.getElementById('spell-slots')!;
const introOverlay = document.getElementById('intro-overlay')!;
const instructionsOverlay = document.getElementById('instructions-overlay')!;
const scoreboardOverlay = document.getElementById('scoreboard-overlay')!;

const gameCtx = gameCanvas.getContext('2d')!;
const nextCtx = nextCanvas.getContext('2d')!;

// ─── Intro Screen ───────────────────────────────────────────────

/**
 * Two-phase intro: artwork first, then instructions, then game.
 * Phase 1: any keypress shows instructions
 * Phase 2: any keypress starts the game
 */
let introPhase: 'artwork' | 'instructions' | 'done' = 'artwork';

function advanceIntro(): void {
  if (introPhase === 'done') return;

  if (introPhase === 'artwork') {
    // Show instructions
    introPhase = 'instructions';
    introOverlay.classList.add('hidden');
    instructionsOverlay.classList.remove('hidden');
  } else {
    // Start game
    introPhase = 'done';
    instructionsOverlay.classList.add('hidden');
    startGame(state);
    playSound('resume');
  }
}

// ─── Scoreboard ─────────────────────────────────────────────────

let scoreboardShown = false;

function showScoreboard(): void {
  if (scoreboardShown) return;
  scoreboardShown = true;

  // Save score
  saveScore({
    score: state.score,
    level: state.level,
    lines: state.linesCleared,
    date: new Date().toISOString(),
  });

  // Populate final stats
  const finalScore = document.getElementById('final-score');
  const finalLevel = document.getElementById('final-level');
  const finalLines = document.getElementById('final-lines');
  if (finalScore) finalScore.textContent = String(state.score);
  if (finalLevel) finalLevel.textContent = String(state.level);
  if (finalLines) finalLines.textContent = String(state.linesCleared);

  // Populate high scores
  const scores = loadScores();
  const listEl = document.getElementById('high-scores-list');
  if (!listEl) return;

  if (scores.length === 0) {
    listEl.innerHTML = '<div class="no-scores">No scores yet — play again!</div>';
  } else {
    let html = '<table class="score-table"><tr><th>#</th><th>SCORE</th><th>LEVEL</th><th>LINES</th></tr>';
    for (let i = 0; i < scores.length; i++) {
      const s = scores[i]!;
      const isLatest = s.score === state.score && s.level === state.level && s.lines === state.linesCleared;
      html += `<tr class="${isLatest ? 'highlight' : ''}">
        <td>${i + 1}</td>
        <td>${s.score.toLocaleString()}</td>
        <td>${s.level}</td>
        <td>${s.lines}</td>
      </tr>`;
    }
    html += '</table>';
    listEl.innerHTML = html;
  }

  scoreboardOverlay.classList.remove('hidden');
}

function dismissScoreboard(): void {
  scoreboardShown = false;
  scoreboardOverlay.classList.add('hidden');
  restartGame();
}

// ─── Input State ────────────────────────────────────────────────

const keys = new Set<string>();
let vKeyReleased = true; // release-based double-tap guard (§17)

document.addEventListener('keydown', (e) => {
  // Scoreboard overlay: any key restarts (game over)
  if (scoreboardShown) {
    e.preventDefault();
    dismissScoreboard();
    return;
  }

  // Intro screen: any key advances through intro phases
  if (state.status === 'READY') {
    e.preventDefault();
    advanceIntro();
    return;
  }

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
      castSelectedSpell(state);
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

  // Detect game over — show scoreboard once
  if (state.status === 'GAME_OVER' && !scoreboardShown) {
    showScoreboard();
  }

  // Render
  render(gameCtx, nextCtx, nextCanvas, spellContainer, state);

  requestAnimationFrame(gameLoop);
}

function handleHeldKeys(deltaMs: number): void {
  const leftHeld = keys.has('ArrowLeft');
  const rightHeld = keys.has('ArrowRight');
  const downHeld = keys.has('ArrowDown');

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

// Game begins in READY state. Intro screen is shown via the overlay.
// Phase 1: artwork → any key shows instructions
// Phase 2: instructions → any key starts the game
introOverlay.addEventListener('click', advanceIntro);
instructionsOverlay.addEventListener('click', advanceIntro);
scoreboardOverlay.addEventListener('click', dismissScoreboard);

console.log(`Vextris loaded. Seed: ${state.rngSeed}`);
lastFrame = performance.now();
requestAnimationFrame(gameLoop);
