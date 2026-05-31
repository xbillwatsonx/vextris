/**
 * Vextris — Audio Manager (§21)
 *
 * Programmatic sound synthesis using the Web Audio API.
 * No external audio files — everything is generated with oscillators
 * and noise for a tight, retro-chiptune feel.
 */

/** Enum of all audio events in the game */
export type AudioEvent =
  | 'move'
  | 'rotate'
  | 'soft_drop'
  | 'hard_drop'
  | 'line_clear'
  | 'level_up'
  | 'vex_mark_spawn'
  | 'vex_alignment'
  | 'color_vex_cast'
  | 'shape_vex_cast'
  | 'shadow_vex_cast'
  | 'cast_denied'
  | 'empty_bank'
  | 'game_over'
  | 'pause'
  | 'resume'
  | 'combo';

// ─── Audio Context ──────────────────────────────────────────────

let _ctx: AudioContext | null = null;

/** Lazy-init on first user interaction (browser autoplay policy). */
function ctx(): AudioContext | null {
  if (_muted) return null;
  if (!_ctx) {
    try {
      _ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  return _ctx;
}

// ─── Helpers ────────────────────────────────────────────────────

/** Play a simple tone with optional frequency sweep and duration. */
function tone(
  freq: number,
  durationSec: number,
  type: OscillatorType = 'square',
  endFreq?: number,
  gain: number = 0.15,
  delaySec: number = 0,
): void {
  const c = ctx();
  if (!c) return;
  const osc = c.createOscillator();
  const vol = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + delaySec);
  if (endFreq !== undefined) {
    osc.frequency.linearRampToValueAtTime(endFreq, c.currentTime + delaySec + durationSec);
  }
  vol.gain.setValueAtTime(gain, c.currentTime + delaySec);
  vol.gain.linearRampToValueAtTime(0, c.currentTime + delaySec + durationSec);
  osc.connect(vol);
  vol.connect(c.destination);
  osc.start(c.currentTime + delaySec);
  osc.stop(c.currentTime + delaySec + durationSec + 0.01);
}

/** Play a short noise burst (for impacts/thuds). */
function noise(
  durationSec: number,
  gain: number = 0.1,
  highpass: number = 0,
): void {
  const c = ctx();
  if (!c) return;
  const bufferSize = Math.ceil(c.sampleRate * durationSec);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  if (highpass > 0) {
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = highpass;
    src.connect(hp);
    const vol = c.createGain();
    vol.gain.setValueAtTime(gain, c.currentTime);
    vol.gain.linearRampToValueAtTime(0, c.currentTime + durationSec);
    hp.connect(vol);
    vol.connect(c.destination);
  } else {
    const vol = c.createGain();
    vol.gain.setValueAtTime(gain, c.currentTime);
    vol.gain.linearRampToValueAtTime(0, c.currentTime + durationSec);
    src.connect(vol);
    vol.connect(c.destination);
  }
  src.start();
}

/** Two-note chime using triangle wave for a clean magical feel. */
function chime(
  freq1: number,
  freq2: number,
  noteDuration: number = 0.08,
  gap: number = 0.04,
  gain: number = 0.12,
): void {
  tone(freq1, noteDuration, 'triangle', undefined, gain, 0);
  tone(freq2, noteDuration, 'triangle', undefined, gain, noteDuration + gap);
}

// ─── Sound Map ──────────────────────────────────────────────────

const sounds: Record<AudioEvent, () => void> = {
  move() {
    tone(220, 0.04, 'square', undefined, 0.06);
  },

  rotate() {
    tone(440, 0.05, 'square', undefined, 0.08, 0);
    tone(554, 0.05, 'square', undefined, 0.08, 0.04);
  },

  soft_drop() {
    tone(180, 0.06, 'triangle', 120, 0.06);
  },

  hard_drop() {
    noise(0.12, 0.18, 200);
    tone(80, 0.1, 'sine', 50, 0.2, 0.01);
  },

  line_clear() {
    const c = ctx();
    if (!c) return;
    const notes = [523, 659, 784]; // C5, E5, G5
    notes.forEach((freq, i) => {
      tone(freq, 0.15, 'triangle', undefined, 0.1, i * 0.07);
    });
  },

  level_up() {
    const c = ctx();
    if (!c) return;
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      tone(freq, 0.2, 'triangle', undefined, 0.1, i * 0.1);
    });
  },

  combo() {
    const c = ctx();
    if (!c) return;
    tone(784, 0.08, 'triangle', undefined, 0.12, 0);
    tone(988, 0.08, 'triangle', undefined, 0.12, 0.06);
  },

  vex_mark_spawn() {
    tone(1200, 0.06, 'sine', 1600, 0.06);
    tone(1600, 0.06, 'sine', 2000, 0.04, 0.04);
  },

  vex_alignment() {
    const c = ctx();
    if (!c) return;
    chime(880, 1100, 0.1, 0.05, 0.1);
    tone(1320, 0.2, 'triangle', undefined, 0.08, 0.2);
  },

  color_vex_cast() {
    noise(0.1, 0.08, 400);
    tone(200, 0.3, 'sawtooth', 80, 0.1, 0.05);
    chime(660, 880, 0.12, 0.04, 0.08);
  },

  shape_vex_cast() {
    noise(0.1, 0.08, 400);
    tone(200, 0.3, 'sawtooth', 80, 0.1, 0.05);
    chime(554, 740, 0.12, 0.04, 0.08);
  },

  shadow_vex_cast() {
    noise(0.15, 0.1, 200);
    tone(120, 0.4, 'sine', 40, 0.15, 0.05);
    // Deep rumble
    const c = ctx();
    if (c) {
      const osc = c.createOscillator();
      const vol = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(55, c.currentTime + 0.05);
      osc.frequency.linearRampToValueAtTime(30, c.currentTime + 0.5);
      vol.gain.setValueAtTime(0.12, c.currentTime + 0.05);
      vol.gain.linearRampToValueAtTime(0, c.currentTime + 0.5);
      osc.connect(vol);
      vol.connect(c.destination);
      osc.start(c.currentTime + 0.05);
      osc.stop(c.currentTime + 0.55);
    }
  },

  cast_denied() {
    tone(150, 0.1, 'square', 100, 0.06);
    tone(100, 0.1, 'square', undefined, 0.04, 0.08);
  },

  empty_bank() {
    tone(200, 0.06, 'square', 150, 0.05);
  },

  game_over() {
    const c = ctx();
    if (!c) return;
    const notes = [440, 349, 277]; // A4, F4, C#4
    notes.forEach((freq, i) => {
      tone(freq, 0.35, 'triangle', undefined, 0.12, i * 0.35);
    });
  },

  pause() {
    tone(600, 0.05, 'sine', undefined, 0.08);
  },

  resume() {
    tone(500, 0.04, 'sine', undefined, 0.06, 0);
    tone(700, 0.04, 'sine', undefined, 0.06, 0.05);
  },
};

// ─── Public API ─────────────────────────────────────────────────

export function playSound(event: AudioEvent): void {
  if (_muted) return;
  sounds[event]();
}

/** Mute state */
let _muted = false;

export function isMuted(): boolean {
  return _muted;
}

export function setMuted(muted: boolean): void {
  _muted = muted;
}

export function toggleMute(): boolean {
  _muted = !_muted;
  return _muted;
}
