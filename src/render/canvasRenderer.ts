/**
 * Vextris — Canvas Renderer (§20, §22)
 *
 * Renders the board, active piece, ghost piece, vex marks,
 * next-piece preview, spell bank, and board fill meter.
 */

import type { GameState, ActivePiece, GhostPiece, VexSpell } from '../engine/gameLoop';
import { getVisibleFillPercent, getVisibleOccupiedCount, COLS, VISIBLE_ROWS, HIDDEN_ROWS, TOTAL_ROWS } from '../engine/board';
import type { ColorId, ShapeId } from '../engine/board';
import { getBlocks, getColor } from '../engine/pieces';
import { SHADOW_VEX_MIN_CELLS } from '../config/gameConfig';

// ─── Colors (§8) ────────────────────────────────────────────────

const CELL_COLORS: Record<string, string> = {
  cyan:    '#00e5ff',
  gold:    '#ffd600',
  violet:  '#b388ff',
  green:   '#69f0ae',
  red:     '#ff5252',
  blue:    '#448aff',
  orange:  '#ff9100',
  shadow:  '#2a0033',
};

const CELL_BORDER = '#1a1a2e';
const GRID_COLOR = '#12122a';
const BG_COLOR = '#000000';
const GHOST_ALPHA = 0.25;
const VEX_GLOW_COLOR = '#c084fc'; // neon purple
const VEX_CORE_COLOR = '#e4c8ff'; // bright core
const CELL_SIZE_PX = 32;

// ─── Drawing Helpers ────────────────────────────────────────────

function drawCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colorId: ColorId | undefined,
  alpha = 1,
): void {
  const color = colorId ? CELL_COLORS[colorId] : undefined;
  ctx.globalAlpha = alpha;

  if (color) {
    // Fill
    ctx.fillStyle = color;
    ctx.fillRect(x, y, CELL_SIZE_PX, CELL_SIZE_PX);

    // Inner highlight
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x + 1, y + 1, CELL_SIZE_PX - 2, Math.floor(CELL_SIZE_PX / 2));
  }

  // Border
  ctx.strokeStyle = CELL_BORDER;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, CELL_SIZE_PX - 1, CELL_SIZE_PX - 1);
  ctx.globalAlpha = 1;
}

// ─── Vex Mark Rendering ──────────────────────────────────────────

const VEX_PULSE_PERIOD_TICKS = 45; // one full pulse cycle (~0.75s at 60fps)

/** Shared diamond path helper. */
function diamondPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.moveTo(cx, cy - r);       // top
  ctx.lineTo(cx + r, cy);       // right
  ctx.lineTo(cx, cy + r);       // bottom
  ctx.lineTo(cx - r, cy);       // left
  ctx.closePath();
}

/**
 * Draws a neon diamond vex glyph that pulses with the game tick.
 * Three layers: outer glow ring, inner glow ring, solid core.
 * The pulse oscillates on a sine wave so it breathes without being distracting.
 */
function drawVexSymbol(ctx: CanvasRenderingContext2D, cx: number, cy: number, gameTick: number): void {
  // Sinusoidal pulse: cycles 0→1→0 smoothly
  const pulse = (Math.sin((gameTick / VEX_PULSE_PERIOD_TICKS) * Math.PI * 2) + 1) / 2;

  ctx.save();

  // Outer glow — pulses in size and opacity
  const outerR = 5.5 + pulse * 3;
  ctx.globalAlpha = 0.15 + pulse * 0.3;
  ctx.fillStyle = VEX_GLOW_COLOR;
  ctx.beginPath();
  diamondPath(ctx, cx, cy, outerR);
  ctx.fill();

  // Inner glow
  const innerR = 2.5 + pulse * 2;
  ctx.globalAlpha = 0.35 + pulse * 0.4;
  ctx.fillStyle = VEX_GLOW_COLOR;
  ctx.beginPath();
  diamondPath(ctx, cx, cy, innerR);
  ctx.fill();

  // Solid core — steady
  ctx.globalAlpha = 1;
  ctx.fillStyle = VEX_CORE_COLOR;
  ctx.beginPath();
  diamondPath(ctx, cx, cy, 2);
  ctx.fill();

  ctx.restore();
}

// ─── Board Rendering (§20) ──────────────────────────────────────

/** Draws the full board: grid background, locked cells, vex marks */
export function drawBoard(ctx: CanvasRenderingContext2D, state: GameState): void {
  const board = state.board;

  // Grid background
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, COLS * CELL_SIZE_PX, VISIBLE_ROWS * CELL_SIZE_PX);

  // Grid lines
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 0.5;
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * CELL_SIZE_PX, 0);
    ctx.lineTo(c * CELL_SIZE_PX, VISIBLE_ROWS * CELL_SIZE_PX);
    ctx.stroke();
  }
  for (let r = 0; r <= VISIBLE_ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * CELL_SIZE_PX);
    ctx.lineTo(COLS * CELL_SIZE_PX, r * CELL_SIZE_PX);
    ctx.stroke();
  }

  // Locked cells (visible rows only: array rows 2..21 → logical y 0..19)
  for (let row = HIDDEN_ROWS; row < TOTAL_ROWS; row++) {
    const logicalY = row - HIDDEN_ROWS;
    for (let col = 0; col < COLS; col++) {
      const cell = board[row]![col]!;
      if (!cell.occupied) continue;

      const x = col * CELL_SIZE_PX;
      const y = logicalY * CELL_SIZE_PX;
      drawCell(ctx, x, y, cell.colorId);

      // Vex mark overlay
      if (cell.hasVexMark) {
        drawVexSymbol(ctx, x + CELL_SIZE_PX / 2, y + CELL_SIZE_PX / 2, state.gameTick);
      }
    }
  }
}

// ─── Active Piece (§20) ─────────────────────────────────────────

export function drawActivePiece(ctx: CanvasRenderingContext2D, piece: ActivePiece, gameTick: number): void {
  for (let i = 0; i < piece.blocks.length; i++) {
    const block = piece.blocks[i]!;
    const col = piece.origin.x + block.x;
    const logicalY = piece.origin.y + block.y;

    // Only draw visible cells
    if (logicalY < 0 || col < 0 || col >= COLS || logicalY >= VISIBLE_ROWS) continue;

    const x = col * CELL_SIZE_PX;
    const y = logicalY * CELL_SIZE_PX;
    drawCell(ctx, x, y, piece.colorId);

    // Vex mark on active piece
    if (piece.vexMarkBlockIndex === i) {
      drawVexSymbol(ctx, x + CELL_SIZE_PX / 2, y + CELL_SIZE_PX / 2, gameTick);
    }
  }
}

// ─── Ghost Piece (§9, §20) ──────────────────────────────────────

export function drawGhostPiece(ctx: CanvasRenderingContext2D, ghost: GhostPiece): void {
  for (const block of ghost.blocks) {
    const col = ghost.origin.x + block.x;
    const logicalY = ghost.origin.y + block.y;

    if (logicalY < 0 || col < 0 || col >= COLS || logicalY >= VISIBLE_ROWS) continue;

    const x = col * CELL_SIZE_PX;
    const y = logicalY * CELL_SIZE_PX;

    // Outline only at reduced opacity
    ctx.globalAlpha = GHOST_ALPHA;
    ctx.strokeStyle = CELL_COLORS[ghost.colorId] ?? '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, CELL_SIZE_PX - 4, CELL_SIZE_PX - 4);
    ctx.globalAlpha = 1;
  }
}

// ─── Next Piece Preview (§22) ───────────────────────────────────

const PREVIEW_CELL = 20; // smaller cell size for preview

export function drawNextPreview(
  ctx: CanvasRenderingContext2D,
  nextQueue: ShapeId[],
  canvas: HTMLCanvasElement,
): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < nextQueue.length; i++) {
    const shapeId = nextQueue[i]!;
    const blocks = getBlocks(shapeId, 0);
    const colorId = getColor(shapeId);
    const color = CELL_COLORS[colorId] ?? '#ffffff';

    const offsetY = i * 60;
    const centerX = 10;

    for (const block of blocks) {
      const px = centerX + block.x * PREVIEW_CELL;
      const py = offsetY + 10 + block.y * PREVIEW_CELL;

      ctx.fillStyle = color;
      ctx.fillRect(px, py, PREVIEW_CELL, PREVIEW_CELL);
      ctx.strokeStyle = CELL_BORDER;
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, PREVIEW_CELL - 1, PREVIEW_CELL - 1);
    }
  }
}

// ─── Spell Bank UI (§22) ────────────────────────────────────────

const VEX_ICONS: Record<string, string> = {
  COLOR: '◆',
  SHAPE: '◈',
  SHADOW: '◉',
};

const VEX_LABELS: Record<string, string> = {
  COLOR: 'Color',
  SHAPE: 'Shape',
  SHADOW: 'Shadow',
};

const VEX_EFFECTS: Record<string, string> = {
  COLOR: 'Destroys a random color',
  SHAPE: 'Destroys a random shape',
  SHADOW: 'Inverts the board',
};

const VEX_ICON_COLORS: Record<string, string> = {
  COLOR: '#b388ff',
  SHAPE: '#69f0ae',
  SHADOW: '#7c4dff',
};

export function renderSpellBank(
  container: HTMLElement,
  spellBank: ReadonlyArray<VexSpell>,
  selectedIndex: number,
  visibleFillPercent: number,
): void {
  if (spellBank.length === 0) {
    container.innerHTML = '<span style="color:#555;font-size:0.8rem">No vex stored</span>';
    return;
  }

  const canCastShadow = visibleFillPercent >= 0.4;

  let html = '';
  for (let i = 0; i < spellBank.length; i++) {
    const spell = spellBank[i]!;
    const isShadow = spell.type === 'SHADOW';
    const shadowLocked = isShadow && !canCastShadow;
    const icon = VEX_ICONS[spell.type] ?? '?';
    const label = VEX_LABELS[spell.type] ?? spell.type;
    const effect = VEX_EFFECTS[spell.type] ?? '';
    const color = VEX_ICON_COLORS[spell.type] ?? '#888';
    const selected = i === selectedIndex;

    html += `<div class="spell-item${selected ? ' selected' : ''}${shadowLocked ? ' locked' : ''}">
      <span class="spell-icon" style="color:${color}">${icon}</span>
      <span class="spell-label">${label}</span>
      <span class="spell-effect">${effect}</span>
      ${shadowLocked ? '🔒' : ''}
    </div>`;
  }

  // legend
  html += '<div class="spells-legend">';
  for (const type of ['COLOR', 'SHAPE', 'SHADOW'] as const) {
    html += `<span><b style="color:${VEX_ICON_COLORS[type]}">${VEX_ICONS[type]}</b> ${VEX_LABELS[type]}</span>`;
  }
  html += '</div>';

  container.innerHTML = html;
}

// ─── Stats UI (§22) ─────────────────────────────────────────────

export function renderStats(state: GameState): void {
  const scoreEl = document.getElementById('stat-score');
  const levelEl = document.getElementById('stat-level');
  const linesEl = document.getElementById('stat-lines');
  const fillEl = document.getElementById('stat-fill');

  if (scoreEl) scoreEl.textContent = String(state.score);
  if (levelEl) levelEl.textContent = String(state.level);
  if (linesEl) linesEl.textContent = String(state.linesCleared);
  if (fillEl) {
    const pct = Math.round(getVisibleFillPercent(state.board) * 100);
    fillEl.textContent = `${pct}%`;
  }
}

// ─── Full Frame Render ──────────────────────────────────────────

export function render(
  ctx: CanvasRenderingContext2D,
  nextCtx: CanvasRenderingContext2D,
  nextCanvas: HTMLCanvasElement,
  spellContainer: HTMLElement,
  state: GameState,
): void {
  // Clear canvases
  ctx.clearRect(0, 0, COLS * CELL_SIZE_PX, VISIBLE_ROWS * CELL_SIZE_PX);

  // Draw board (locked cells + grid)
  drawBoard(ctx, state);

  // Draw ghost piece
  if (state.ghostPiece) {
    drawGhostPiece(ctx, state.ghostPiece);
  }

  // Draw active piece (on top)
  if (state.activePiece) {
    drawActivePiece(ctx, state.activePiece, state.gameTick);
  }

  // Next preview
  drawNextPreview(nextCtx, state.nextQueue, nextCanvas);

  // Stats
  renderStats(state);

  // Spell bank
  renderSpellBank(spellContainer, state.spellBank, state.selectedSpellIndex, getVisibleFillPercent(state.board));
}
