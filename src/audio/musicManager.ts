/**
 * Vextris — Music Manager
 *
 * Background music system using HTML5 <audio> elements.
 * Plays looping .ogg tracks that escalate with level intensity,
 * plus a "Danger State" override when the board gets scary.
 *
 * Separate from audioManager.ts (which handles SFX only).
 */

// ─── Track Definitions ─────────────────────────────────────────

/** Ordered list of level tracks (index 0 = level 1). */
const LEVEL_TRACKS = [
  'music/Vextris 01.ogg',
  'music/Vextris 02.ogg',
  'music/Vextris 03.ogg',
  'music/Vextris-04.ogg',
  'music/Vextris-05.ogg',
  'music/Vextris-06.ogg',
  'music/Vextris-07.ogg',
] as const;

const DANGER_TRACK = 'music/Vextris-Danger-State.ogg';

/** Board fill % that triggers danger state (0-1). */
const DANGER_FILL_THRESHOLD = 0.70;

/** Volume for normal playback. */
const NORMAL_VOLUME = 0.45;

/** Volume when paused (ducks but doesn't stop). */
const PAUSED_VOLUME = 0.12;

/** Crossfade duration in milliseconds. */
const FADE_DURATION_MS = 2000;

/** How often to check fill / level for track changes (ms). */
const POLL_INTERVAL_MS = 500;

// ─── Internal State ────────────────────────────────────────────

/** Audio element for the currently playing level track. */
let levelAudio: HTMLAudioElement | null = null;

/** Audio element for the danger track (when active). */
let dangerAudio: HTMLAudioElement | null = null;

/** Which level track index is currently loaded (-1 = none). */
let currentLevelIndex = -1;

/** Whether danger state is currently active. */
let dangerActive = false;

/** Whether music is muted (shares mute with SFX). */
let musicMuted = false;

/** Whether music has been started at all (requires user gesture). */
let started = false;

/** Last time we polled for level/fill changes. */
let lastPollMs = 0;

/** Current game phase for volume management. */
type MusicPhase = 'intro' | 'playing' | 'paused' | 'game_over';
let currentPhase: MusicPhase = 'intro';

// ─── Audio Element Factory ─────────────────────────────────────

/**
 * Creates a looping, preloaded audio element for a track URL.
 * Starts at volume 0 so we can fade it in.
 */
function createAudioElement(src: string): HTMLAudioElement {
  const el = new Audio(src);
  el.loop = true;
  el.preload = 'auto';
  el.volume = 0;
  return el;
}

// ─── Fade Helpers ──────────────────────────────────────────────

/**
 * Smoothly fades an audio element's volume to a target over FADE_DURATION_MS.
 * Cancels any in-progress fade on the same element.
 */
const fadeTimers = new WeakMap<HTMLAudioElement, number>();

function fadeTo(el: HTMLAudioElement, target: number, durationMs: number = FADE_DURATION_MS): void {
  // Cancel existing fade
  const existingTimer = fadeTimers.get(el);
  if (existingTimer !== undefined) {
    clearInterval(existingTimer);
  }

  const startVolume = el.volume;
  const delta = target - startVolume;
  if (Math.abs(delta) < 0.01) {
    el.volume = target;
    return;
  }

  const steps = Math.max(2, Math.ceil(durationMs / 50));
  const stepSize = delta / steps;
  let step = 0;

  const timer = setInterval(() => {
    step++;
    if (step >= steps) {
      el.volume = target;
      clearInterval(timer);
      fadeTimers.delete(el);
    } else {
      el.volume = startVolume + stepSize * step;
    }
  }, 50);

  fadeTimers.set(el, timer);
}

/** Fades out and pauses an element. */
function fadeOutAndStop(el: HTMLAudioElement): void {
  fadeTo(el, 0, FADE_DURATION_MS);
  // Pause after fade completes
  setTimeout(() => {
    el.pause();
    // Reset to beginning so it's fresh next time
    el.currentTime = 0;
  }, FADE_DURATION_MS + 100);
}

// ─── Core Logic ────────────────────────────────────────────────

/**
 * Returns the level track index for a given level (0-based).
 * Levels 1-7 map directly; level 8+ all use track 7 (index 6).
 */
function levelToTrackIndex(level: number): number {
  return Math.min(level - 1, LEVEL_TRACKS.length - 1);
}

/**
 * Switches the level track to a new index with a crossfade.
 * No-op if already playing that index.
 */
function switchLevelTrack(index: number): void {
  if (index === currentLevelIndex && levelAudio) return;

  const newSrc = LEVEL_TRACKS[index];
  if (!newSrc) return;

  // Fade out old track if exists
  if (levelAudio) {
    fadeOutAndStop(levelAudio);
  }

  // Create and start new track
  const newEl = createAudioElement(newSrc);
  newEl.play().catch(() => {
    // Autoplay policy — will retry on next user gesture
  });

  // Fade in to appropriate volume (unless muted or not in playing phase)
  const targetVol = getTargetVolumeForPhase(currentPhase);
  fadeTo(newEl, targetVol);

  levelAudio = newEl;
  currentLevelIndex = index;
}

/**
 * Activates danger state: fades in danger track, ducks level track.
 */
function activateDanger(): void {
  if (dangerActive) return;
  dangerActive = true;

  // Create danger audio if needed
  if (!dangerAudio) {
    dangerAudio = createAudioElement(DANGER_TRACK);
  }

  dangerAudio.play().catch(() => {
    // Autoplay policy
  });

  // Fade danger in, duck level track down
  const targetVol = getTargetVolumeForPhase(currentPhase);
  fadeTo(dangerAudio, targetVol);
  if (levelAudio) {
    fadeTo(levelAudio, targetVol * 0.3);
  }
}

/**
 * Deactivates danger state: fades out danger track, restores level track.
 */
function deactivateDanger(): void {
  if (!dangerActive) return;
  dangerActive = false;

  if (dangerAudio) {
    fadeOutAndStop(dangerAudio);
  }

  // Restore level track volume
  if (levelAudio) {
    const targetVol = getTargetVolumeForPhase(currentPhase);
    fadeTo(levelAudio, targetVol);
  }
}

/**
 * Returns the target volume for the current phase, accounting for mute.
 */
function getTargetVolumeForPhase(phase: MusicPhase): number {
  if (musicMuted) return 0;
  switch (phase) {
    case 'intro': return 0;       // silent during intro screens
    case 'playing': return NORMAL_VOLUME;
    case 'paused': return PAUSED_VOLUME;
    case 'game_over': return 0;
  }
}

/**
 * Applies the correct volume to all active tracks based on current phase.
 */
function applyPhaseVolume(): void {
  const target = getTargetVolumeForPhase(currentPhase);

  if (dangerActive && dangerAudio) {
    fadeTo(dangerAudio, target);
    if (levelAudio) {
      fadeTo(levelAudio, target * 0.3);
    }
  } else if (levelAudio) {
    fadeTo(levelAudio, target);
  }
}

// ─── Public API ────────────────────────────────────────────────

/**
 * Starts the music system. Must be called after a user gesture
 * (browser autoplay policy). Begins playing the level-1 track.
 */
export function startMusic(): void {
  if (started) return;
  started = true;
  currentPhase = 'playing';
  switchLevelTrack(0);
}

/**
 * Updates music based on current game state. Call this from the game loop.
 * Checks level and board fill at a throttled interval.
 *
 * @param level  Current game level (1-based)
 * @param fillPercent  Board fill as 0-1 (from getVisibleFillPercent)
 * @param status  Current GameStatus
 * @param nowMs  Current timestamp (performance.now())
 */
export function updateMusic(
  level: number,
  fillPercent: number,
  status: string,
  nowMs: number,
): void {
  if (!started) return;

  // Throttle polling
  if (nowMs - lastPollMs < POLL_INTERVAL_MS) return;
  lastPollMs = nowMs;

  // Handle phase transitions
  let newPhase: MusicPhase;
  switch (status) {
    case 'PLAYING': newPhase = 'playing'; break;
    case 'PAUSED': newPhase = 'paused'; break;
    case 'GAME_OVER': newPhase = 'game_over'; break;
    default: newPhase = 'playing'; break; // READY, ANIMATING, CASTING → treat as playing
  }

  if (newPhase !== currentPhase) {
    currentPhase = newPhase;
    applyPhaseVolume();

    // On game over, stop everything after fade
    if (newPhase === 'game_over') {
      if (levelAudio) fadeOutAndStop(levelAudio);
      if (dangerAudio) fadeOutAndStop(dangerAudio);
      currentLevelIndex = -1;
      dangerActive = false;
    }
  }

  // Don't check level/fill changes if not actively playing
  if (newPhase !== 'playing') return;

  // Check for level track change
  const targetIndex = levelToTrackIndex(level);
  if (targetIndex !== currentLevelIndex) {
    switchLevelTrack(targetIndex);
  }

  // Check for danger state toggle
  const shouldDanger = fillPercent >= DANGER_FILL_THRESHOLD;
  if (shouldDanger && !dangerActive) {
    activateDanger();
  } else if (!shouldDanger && dangerActive) {
    deactivateDanger();
  }
}

/**
 * Sets music mute state. When muted, all tracks fade to 0.
 * When unmuted, they fade back to phase-appropriate volume.
 */
export function setMusicMuted(muted: boolean): void {
  musicMuted = muted;
  applyPhaseVolume();
}

/**
 * Returns whether music is currently muted.
 */
export function isMusicMuted(): boolean {
  return musicMuted;
}

/**
 * Fully stops and resets the music system.
 * Used when restarting the game from game over.
 */
export function resetMusic(): void {
  if (levelAudio) {
    levelAudio.pause();
    levelAudio.currentTime = 0;
  }
  if (dangerAudio) {
    dangerAudio.pause();
    dangerAudio.currentTime = 0;
  }
  currentLevelIndex = -1;
  dangerActive = false;
  currentPhase = 'playing';
  // Restart with level 1 track
  switchLevelTrack(0);
}