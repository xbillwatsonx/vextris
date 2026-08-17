/**
 * Vextris — Main Entry Point
 *
 * Initializes the game, wires keyboard input, runs the game loop,
 * and renders every frame via the canvas renderer.
 */

import { createGameState, startGame, moveLeft, moveRight, softDrop, tick } from '../src/engine/gameLoop';
import { runGameAction } from '../src/input/gameActions';
import type { GameAction } from '../src/input/gameActions';
import { render } from '../src/render/canvasRenderer';
import { playSound, toggleMute, isMuted } from '../src/audio/audioManager';
import { startMusic, updateMusic, setMusicMuted, resetMusic } from '../src/audio/musicManager';
import { saveScore, loadScores, isHighScore } from '../src/engine/scores';
import { SOFT_DROP_INTERVAL_MS } from '../src/config/gameConfig';
import { getVisibleFillPercent } from '../src/engine/board';
import { getMobileControlPresentation, shouldUseMobileGameplayPresentation } from '../src/ui/mobilePresentation';
import { PointerHeldInputs } from '../src/input/heldInputs';
import type { HeldKey } from '../src/input/heldInputs';
import { createNameEntry, transitionNameEntry } from '../src/input/nameEntry';
import { wireTouchControls } from '../src/input/touchControls';

// ─── DOM References ──────────────────────────────────────────────

const gameCanvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const nextCanvas = document.getElementById('next-canvas') as HTMLCanvasElement;
const spellContainer = document.getElementById('spell-slots')!;
const introOverlay = document.getElementById('intro-overlay')!;
const instructionsOverlay = document.getElementById('instructions-overlay')!;
const scoreboardOverlay = document.getElementById('scoreboard-overlay')!;
const nameEntryOverlay = document.getElementById('name-entry-overlay')!;
const mobilePauseButton = document.getElementById('mobile-pause') as HTMLButtonElement;
const mobileMuteButton = document.getElementById('mobile-mute') as HTMLButtonElement;

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
    updateMobileGameplayPresentation();
  } else {
    // Start game
    introPhase = 'done';
    instructionsOverlay.classList.add('hidden');
    startGame(state);
    updateMobileGameplayPresentation();
    playSound('resume');
    // Start background music (user gesture has occurred)
    startMusic();
  }
}

// ─── Scoreboard ─────────────────────────────────────────────────

let scoreboardShown = false;
let savedDate = '';

function showScoreboard(): void {
  if (scoreboardShown) return;
  scoreboardShown = true;
  updateMobileGameplayPresentation();

  savedDate = new Date().toISOString();

  // Populate final stats
  const finalScore = document.getElementById('final-score');
  const finalLevel = document.getElementById('final-level');
  const finalLines = document.getElementById('final-lines');
  if (finalScore) finalScore.textContent = String(state.score);
  if (finalLevel) finalLevel.textContent = String(state.level);
  if (finalLines) finalLines.textContent = String(state.linesCleared);

  // Check if this is a high score — if so, show name entry first
  if (isHighScore(state.score)) {
    startNameEntry();
  } else {
    // Not a high score — save with placeholder and show board
    saveScore({
      name: '---',
      score: state.score,
      level: state.level,
      lines: state.linesCleared,
      date: savedDate,
    });
    renderScoreboard();
  }
}

function renderScoreboard(): void {
  const scores = loadScores();
  const listEl = document.getElementById('high-scores-list');
  if (!listEl) return;

  if (scores.length === 0) {
    listEl.innerHTML = '<div class="no-scores">No scores yet — play again!</div>';
  } else {
    let html = '<table class="score-table"><tr><th>#</th><th>NAME</th><th>SCORE</th><th>LEVEL</th><th>LINES</th></tr>';
    for (let i = 0; i < scores.length; i++) {
      const s = scores[i]!;
      const isLatest = s.date === savedDate;
      html += `<tr class="${isLatest ? 'highlight' : ''}">
        <td>${i + 1}</td>
        <td>${s.name}</td>
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

// ─── Name Entry ─────────────────────────────────────────────────

let nameEntryActive = false;
let nameEntry = createNameEntry();

function startNameEntry(): void {
  nameEntryActive = true;
  nameEntry = createNameEntry();
  updateNameSlots();
  nameEntryOverlay.classList.remove('hidden');
}

function updateNameSlots(): void {
  for (let i = 0; i < 3; i++) {
    const slot = document.getElementById(`name-slot-${i}`);
    if (!slot) continue;
    slot.textContent = nameEntry.chars[i] || '';
    slot.className = 'name-slot';
    if (i === nameEntry.cursor) slot.classList.add('active');
    if (nameEntry.chars[i]) slot.classList.add('filled');
  }
}

function handleNameKey(key: string): void {
  const transition = transitionNameEntry(nameEntry, key);
  nameEntry = transition.entry;
  if (transition.confirmedName) {
    nameEntryActive = false;
    nameEntryOverlay.classList.add('hidden');
    saveScore({
      name: transition.confirmedName,
      score: state.score,
      level: state.level,
      lines: state.linesCleared,
      date: savedDate,
    });
    renderScoreboard();
    return;
  }
  updateNameSlots();
}

function dismissScoreboard(): void {
  scoreboardShown = false;
  scoreboardOverlay.classList.add('hidden');
  restartGame();
}

// ─── Input State ────────────────────────────────────────────────

const keys = new Set<string>();
const pointerHeldInputs = new PointerHeldInputs();
let vKeyReleased = true; // release-based double-tap guard (§17)

function runOneShotGameAction(action: GameAction): void {
  const result = runGameAction(state, action);
  if (result.sound) playSound(result.sound);
  updateMobileGameplayPresentation();
}

document.addEventListener('keydown', (e) => {
  // Name entry: capture all keys
  if (nameEntryActive) {
    e.preventDefault();
    handleNameKey(e.key);
    return;
  }

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
      runOneShotGameAction('HARD_DROP');
      break;
    case 'KeyV': {
      e.preventDefault();
      if (!vKeyReleased) break; // must release V before another cast
      vKeyReleased = false;
      runOneShotGameAction('CAST_VEX');
      break;
    }
    case 'KeyC':
      runOneShotGameAction('CYCLE_VEX');
      break;
    case 'KeyP':
      runOneShotGameAction('TOGGLE_PAUSE');
      break;
    case 'ArrowUp':
      e.preventDefault();
      runOneShotGameAction('ROTATE_CW');
      break;
    case 'KeyZ':
      e.preventDefault();
      runOneShotGameAction('ROTATE_CCW');
      break;
    case 'Escape':
      runOneShotGameAction('TOGGLE_PAUSE');
      break;
    case 'KeyM':
      toggleAudioMute();
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
const coarsePortraitQuery = window.matchMedia('(pointer: coarse) and (orientation: portrait)');

function updateMobileGameplayPresentation(): void {
  document.body.classList.toggle(
    'is-mobile-gameplay',
    shouldUseMobileGameplayPresentation(state.status, coarsePortraitQuery.matches),
  );
  updateMobileControlPresentation();
}

function updateMobileControlPresentation(): void {
  const controls = getMobileControlPresentation(state.status, isMuted());
  mobilePauseButton.textContent = controls.pause.label;
  mobilePauseButton.setAttribute('aria-label', controls.pause.label);
  mobilePauseButton.setAttribute('aria-pressed', String(controls.pause.pressed));
  mobileMuteButton.textContent = controls.mute.label;
  mobileMuteButton.setAttribute('aria-label', controls.mute.label);
  mobileMuteButton.setAttribute('aria-pressed', String(controls.mute.pressed));
}

function toggleAudioMute(): void {
  toggleMute();
  setMusicMuted(isMuted());
  updateMobileControlPresentation();
}

coarsePortraitQuery.addEventListener('change', updateMobileGameplayPresentation);

function wireNameEntryKeypad(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-name-key]')) {
    const key = button.dataset.nameKey;
    if (!key) continue;
    let activePointer: number | null = null;
    let suppressNextClick = false;
    const stop = (event: PointerEvent): void => {
      event.preventDefault();
      event.stopPropagation();
    };
    button.addEventListener('pointerdown', (event) => {
      stop(event);
      if (activePointer !== null) return;
      activePointer = event.pointerId;
      suppressNextClick = true;
      try {
        button.setPointerCapture(event.pointerId);
      } catch {
        // A cancelled pointer cannot be captured; pointer cleanup remains safe.
      }
      handleNameKey(key);
    });
    for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
      button.addEventListener(eventName, (event) => {
        stop(event);
        if (activePointer === event.pointerId) activePointer = null;
      });
    }
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (suppressNextClick) {
        suppressNextClick = false;
        return;
      }
      handleNameKey(key);
    });
  }
}

function wireBrowserTouchControls() {
  const actionButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-action]')]
    .map((button) => ({ button, action: button.dataset.action }))
    .filter((item): item is { button: HTMLButtonElement; action: GameAction | 'TOGGLE_MUTE' } =>
      item.action !== undefined,
    );
  const heldButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-held-key]')]
    .map((button) => ({ button, key: button.dataset.heldKey }))
    .filter((item): item is { button: HTMLButtonElement; key: HeldKey } => item.key !== undefined);

  return wireTouchControls({
    actionButtons,
    heldButtons,
    heldInputs: pointerHeldInputs,
    onAction: (action) => {
      if (action === 'TOGGLE_MUTE') toggleAudioMute();
      else runOneShotGameAction(action);
    },
  });
}

const browserTouchControls = wireBrowserTouchControls();

window.addEventListener('blur', () => browserTouchControls.clearPressedInputs());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') browserTouchControls.clearPressedInputs();
});

function restartGame(): void {
  const newSeed = 'VEXTRIS-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const newState = createGameState(newSeed);
  Object.assign(state, newState);
  startGame(state);
  updateMobileGameplayPresentation();
  playSound('resume');
  // Reset music for new game
  resetMusic();
}

// ─── Game Loop ──────────────────────────────────────────────────

let lastFrame = performance.now();
const DAS_DELAY = 167; // ms before auto-repeat starts
const ARR_INTERVAL = 33; // ms between auto-repeat moves
let dasTimer = 0;
let arrTimer = 0;
let dasDirection: 'left' | 'right' | null = null;
let softDropTimer = 0;
let prevDownHeld = false;

function gameLoop(now: number): void {
  const deltaMs = now - lastFrame;
  lastFrame = now;

  if (state.status === 'PLAYING') {
    // Tick game logic
    tick(state, deltaMs);

    // Handle held keys (DAS/ARR for left/right, soft drop)
    handleHeldKeys(deltaMs);
  }
  updateMobileGameplayPresentation();

  // Detect game over — show scoreboard once
  if (state.status === 'GAME_OVER' && !scoreboardShown) {
    showScoreboard();
  }

  // Update background music (level/fill/phase tracking)
  updateMusic(state.level, getVisibleFillPercent(state.board), state.status, now);

  // Render
  render(gameCtx, nextCtx, nextCanvas, spellContainer, state);

  requestAnimationFrame(gameLoop);
}

function handleHeldKeys(deltaMs: number): void {
  const leftHeld = pointerHeldInputs.isHeld('ArrowLeft', keys);
  const rightHeld = pointerHeldInputs.isHeld('ArrowRight', keys);
  const downHeld = pointerHeldInputs.isHeld('ArrowDown', keys);

  // Rotation (one-shot, triggered once on press)
  // Already handled in keydown — DAS not needed for rotation

  // Soft drop — immediate on first press, then gated by SOFT_DROP_INTERVAL_MS
  if (downHeld) {
    if (!prevDownHeld) {
      // Initial press: immediate soft drop
      if (softDrop(state)) playSound('soft_drop');
    } else {
      // Repeat gated by interval
      softDropTimer += deltaMs;
      while (softDropTimer >= SOFT_DROP_INTERVAL_MS) {
        softDropTimer -= SOFT_DROP_INTERVAL_MS;
        if (softDrop(state)) playSound('soft_drop');
      }
    }
  } else {
    softDropTimer = 0;
  }
  prevDownHeld = downHeld;

  // DAS/ARR for horizontal movement
  const newDirection = leftHeld ? 'left' : rightHeld ? 'right' : null;

  if (newDirection !== dasDirection) {
    // Direction changed or released
    dasDirection = newDirection;
    dasTimer = 0;
    arrTimer = 0;

    // Initial press: move immediately
    if (newDirection === 'left') {
      if (moveLeft(state)) playSound('move');
    } else if (newDirection === 'right') {
      if (moveRight(state)) playSound('move');
    }
  } else if (dasDirection) {
    // Same direction held
    dasTimer += deltaMs;

    if (dasTimer >= DAS_DELAY) {
      arrTimer += deltaMs;

      while (arrTimer >= ARR_INTERVAL) {
        arrTimer -= ARR_INTERVAL;
        if (dasDirection === 'left') {
          if (moveLeft(state)) playSound('move');
        } else {
          if (moveRight(state)) playSound('move');
        }
      }
    }
  }
}

// ─── Start ──────────────────────────────────────────────────────

// Game begins in READY state. Intro screen is shown via the overlay.
// Phase 1: artwork → any key shows instructions
// Phase 2: instructions → any key starts the game
function advanceIntroFromPointer(event: PointerEvent): void {
  event.preventDefault();
  event.stopPropagation();
  advanceIntro();
}

// Pointer events make the intro reliably advance on touch screens without
// waiting for a synthesized click event.
introOverlay.addEventListener('pointerup', advanceIntroFromPointer);
instructionsOverlay.addEventListener('pointerup', advanceIntroFromPointer);
scoreboardOverlay.addEventListener('click', dismissScoreboard);
wireNameEntryKeypad();

console.log(`Vextris loaded. Seed: ${state.rngSeed}`);
updateMobileGameplayPresentation();
lastFrame = performance.now();
requestAnimationFrame(gameLoop);
