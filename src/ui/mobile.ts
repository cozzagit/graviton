import {
  GravityWell,
  COLORS,
  GAME_WIDTH,
  GAME_HEIGHT,
} from '../engine/types';

// ===== MOBILE DETECTION =====

export function isMobileDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function isPortrait(): boolean {
  return window.innerWidth < window.innerHeight;
}

export function needsRotation(): boolean {
  return isMobileDevice() && isPortrait() && window.innerWidth < 768;
}

// ===== SIZES — all in game units (1200x800), designed to be ~48px+ CSS on phone =====
// On a 750x350 phone landscape, scale ≈ 0.44, so 110 game units ≈ 48px CSS

const TOOLBAR_H = 140;          // bottom bar height
const PANEL_H = 300;            // editing panel (replaces toolbar)
const BTN_RADIUS = 42;          // toolbar circle button radius
const ICON_SIZE = 28;           // icon size inside buttons
const FONT_LABEL = 20;          // button labels
const FONT_TITLE = 28;          // panel header
const FONT_VALUE = 24;          // slider values
const FONT_SLIDER_LABEL = 20;   // slider labels
const FONT_ACTION_BTN = 22;     // action button text
const SLIDER_THUMB_R = 22;      // slider thumb radius
const SLIDER_TRACK_H = 12;      // slider track height
const ACTION_BTN_H = 64;        // action button height

export const PANEL_WIDTH = 600; // max panel width (centered)

// ===== TOUCH STATE =====

export interface MobileState {
  selectedWellIdx: number;
  showPanel: boolean;
  draggingWellIdx: number;
  dragOffsetX: number;
  dragOffsetY: number;
  touchStartX: number;
  touchStartY: number;
  touchStartTime: number;
  lastTapTime: number;
  lastTapX: number;
  lastTapY: number;
  longPressTimer: number;
  longPressProgress: number;
  draggingSlider: 'radius' | 'strength' | null;
  deleteMode: boolean;
  toolbarButtons: { id: string; x: number; y: number; w: number; h: number }[];
  panelY: number;
}

export function createMobileState(): MobileState {
  return {
    selectedWellIdx: -1,
    showPanel: false,
    draggingWellIdx: -1,
    dragOffsetX: 0,
    dragOffsetY: 0,
    touchStartX: 0,
    touchStartY: 0,
    touchStartTime: 0,
    lastTapTime: 0,
    lastTapX: 0,
    lastTapY: 0,
    longPressTimer: 0,
    longPressProgress: 0,
    draggingSlider: null,
    deleteMode: false,
    toolbarButtons: [],
    panelY: 0,
  };
}

// ===== LAYOUT HELPERS =====

export function getToolbarHeight(): number {
  return TOOLBAR_H;
}

export function getPanelHeight(): number {
  return PANEL_H;
}

// The bottom chrome height (toolbar OR panel, whichever is showing)
export function getBottomChromeHeight(state: MobileState): number {
  return state.showPanel ? PANEL_H : TOOLBAR_H;
}

// ===== ORIENTATION SCREEN =====

export function renderRotationScreen(
  ctx: CanvasRenderingContext2D,
  time: number
): void {
  ctx.fillStyle = '#080810';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  const cx = GAME_WIDTH / 2;
  const cy = GAME_HEIGHT / 2 - 30;

  // Stars
  for (let i = 0; i < 30; i++) {
    const sx = ((i * 137.5) % GAME_WIDTH);
    const sy = ((i * 97.3 + 50) % GAME_HEIGHT);
    const alpha = 0.15 + Math.sin(time * 0.5 + i * 1.7) * 0.1;
    ctx.beginPath();
    ctx.arc(sx, sy, 1 + (i % 3) * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fill();
  }

  // Phone rotation
  const cycle = (time % 4.1);
  let rotation = 0;
  if (cycle < 1.5) {
    const t = cycle / 1.5;
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    rotation = ease * (-Math.PI / 2);
  } else if (cycle < 2.7) {
    rotation = -Math.PI / 2;
  } else if (cycle < 3.5) {
    const t = (cycle - 2.7) / 0.8;
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    rotation = -Math.PI / 2 + ease * (Math.PI / 2);
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  const pw = 60, ph = 100;
  ctx.strokeStyle = `rgba(${COLORS.cyanRgb}, 0.8)`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  rrp(ctx, -pw / 2, -ph / 2, pw, ph, 10);
  ctx.stroke();
  ctx.fillStyle = `rgba(${COLORS.cyanRgb}, 0.05)`;
  ctx.fill();
  ctx.fillStyle = `rgba(${COLORS.cyanRgb}, 0.3)`;
  ctx.fillRect(-10, -ph / 2 + 4, 20, 5);
  ctx.fillRect(-12, ph / 2 - 12, 24, 3);
  ctx.restore();

  const arrowAlpha = cycle < 2.7 ? 0.7 : 0.3 + Math.sin(time * 5) * 0.2;
  ctx.strokeStyle = `rgba(${COLORS.amberRgb}, ${arrowAlpha})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 80, -Math.PI * 0.7, -Math.PI * 0.2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = 'bold 36px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ROTATE YOUR DEVICE', cx, cy + 130);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.font = '24px system-ui';
  ctx.fillText('Graviton plays best in landscape', cx, cy + 170);
}

// ===== MOBILE HUD (top bar) =====

export function renderMobileHUD(
  ctx: CanvasRenderingContext2D,
  levelId: number,
  levelName: string,
  wellCount: number,
  maxWells: number,
  par: number
): void {
  ctx.fillStyle = 'rgba(10, 10, 20, 0.8)';
  ctx.fillRect(0, 0, GAME_WIDTH, 70);
  ctx.fillStyle = `rgba(${COLORS.cyanRgb}, 0.2)`;
  ctx.fillRect(0, 69, GAME_WIDTH, 2);

  ctx.fillStyle = COLORS.textBright;
  ctx.font = `bold 26px system-ui`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Lv ${levelId}: ${levelName}`, 24, 36);

  ctx.fillStyle = COLORS.textDim;
  ctx.font = '22px system-ui';
  ctx.textAlign = 'right';
  ctx.fillText(`Wells ${wellCount}/${maxWells}  |  Par ${par}`, GAME_WIDTH - 24, 36);
}

// ===== MOBILE TOOLBAR (circle buttons) =====

export function renderMobileToolbar(
  ctx: CanvasRenderingContext2D,
  state: MobileState,
  wellCount: number,
  _maxWells: number,
  launched: boolean,
  hasHint: boolean,
  hintActive: boolean,
  _time: number
): void {
  // Don't render toolbar when panel is open
  if (state.showPanel) return;

  const y = GAME_HEIGHT - TOOLBAR_H;

  // Background
  ctx.fillStyle = 'rgba(10, 10, 20, 0.92)';
  ctx.fillRect(0, y, GAME_WIDTH, TOOLBAR_H);
  ctx.fillStyle = `rgba(${COLORS.cyanRgb}, 0.2)`;
  ctx.fillRect(0, y, GAME_WIDTH, 2);

  type BtnDef = { id: string; label: string; bgColor: string; iconFn: (cx: number, cy: number) => void };
  const buttons: BtnDef[] = [];

  if (!launched) {
    buttons.push({ id: 'place', label: 'PLACE', bgColor: `rgba(${COLORS.cyanRgb}, 0.2)`,
      iconFn: (cx, cy) => { drawCircleIcon(ctx, cx, cy, '+', COLORS.cyan); } });
    buttons.push({ id: 'reset', label: 'RESET', bgColor: 'rgba(255,255,255,0.08)',
      iconFn: (cx, cy) => { drawResetIconM(ctx, cx, cy); } });
    if (hasHint) {
      const isApply = hintActive;
      buttons.push({ id: isApply ? 'apply' : 'hint',
        label: isApply ? 'APPLY' : 'HINT',
        bgColor: isApply ? `rgba(${COLORS.greenRgb}, 0.2)` : `rgba(${COLORS.amberRgb}, 0.15)`,
        iconFn: (cx, cy) => { drawHintIconM(ctx, cx, cy, isApply); } });
    }
    buttons.push({ id: 'launch', label: 'LAUNCH', bgColor: `rgba(${COLORS.amberRgb}, 0.25)`,
      iconFn: (cx, cy) => { drawLaunchIconM(ctx, cx, cy); } });
    if (wellCount > 0) {
      buttons.push({ id: 'delete', label: state.deleteMode ? 'CANCEL' : 'DEL',
        bgColor: state.deleteMode ? `rgba(${COLORS.amberRgb}, 0.15)` : 'rgba(239,68,68,0.15)',
        iconFn: (cx, cy) => { drawDeleteIconM(ctx, cx, cy, state.deleteMode); } });
    }
  } else {
    buttons.push({ id: 'reset', label: 'RETRY', bgColor: `rgba(${COLORS.amberRgb}, 0.2)`,
      iconFn: (cx, cy) => { drawResetIconM(ctx, cx, cy); } });
  }

  const spacing = GAME_WIDTH / buttons.length;
  state.toolbarButtons = [];

  for (let i = 0; i < buttons.length; i++) {
    const btn = buttons[i];
    const bx = spacing * i + spacing / 2;
    const by = y + 55;

    state.toolbarButtons.push({ id: btn.id, x: bx - spacing / 2, y, w: spacing, h: TOOLBAR_H });

    // Circle background
    ctx.beginPath();
    ctx.arc(bx, by, BTN_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = btn.bgColor;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Icon
    btn.iconFn(bx, by);

    // Label below
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `bold ${FONT_LABEL}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, bx, by + BTN_RADIUS + 18);
  }
}

// ===== WELL EDITING PANEL (replaces toolbar) =====

export function renderWellPanel(
  ctx: CanvasRenderingContext2D,
  well: GravityWell,
  state: MobileState,
  _time: number
): void {
  const isAtt = well.type === 'attractor';
  const color = isAtt ? COLORS.cyan : COLORS.violet;
  const colorRgb = isAtt ? COLORS.cyanRgb : COLORS.violetRgb;

  const py = GAME_HEIGHT - PANEL_H;
  state.panelY = py;

  // Background
  ctx.fillStyle = 'rgba(12, 12, 24, 0.95)';
  ctx.fillRect(0, py, GAME_WIDTH, PANEL_H);
  ctx.fillStyle = `rgba(${colorRgb}, 0.3)`;
  ctx.fillRect(0, py, GAME_WIDTH, 3);

  const pad = 30;
  const innerW = GAME_WIDTH - pad * 2;

  // ---- Row 1: Header ----
  let rowY = py + 32;

  // Type dot
  ctx.beginPath();
  ctx.arc(pad + 14, rowY, 12, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Type label
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = `bold ${FONT_TITLE}px system-ui`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(isAtt ? 'ATTRACTOR' : 'REPELLER', pad + 36, rowY);

  // Close X (top right)
  const closeX = GAME_WIDTH - pad - 10;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(closeX - 14, rowY - 14);
  ctx.lineTo(closeX + 14, rowY + 14);
  ctx.moveTo(closeX + 14, rowY - 14);
  ctx.lineTo(closeX - 14, rowY + 14);
  ctx.stroke();
  ctx.lineCap = 'butt';

  // ---- Row 2: Radius slider ----
  rowY += 58;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.font = `${FONT_SLIDER_LABEL}px system-ui`;
  ctx.textAlign = 'left';
  ctx.fillText('RADIUS', pad, rowY);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = `bold ${FONT_VALUE}px system-ui`;
  ctx.textAlign = 'right';
  ctx.fillText(String(well.radius), GAME_WIDTH - pad, rowY);

  rowY += 30;
  drawSlider(ctx, pad, rowY, innerW, (well.radius - 40) / 120, colorRgb, state.draggingSlider === 'radius');

  // ---- Row 3: Strength slider ----
  rowY += 52;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.font = `${FONT_SLIDER_LABEL}px system-ui`;
  ctx.textAlign = 'left';
  ctx.fillText('POWER', pad, rowY);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = `bold ${FONT_VALUE}px system-ui`;
  ctx.textAlign = 'right';
  ctx.fillText(well.strength.toFixed(1), GAME_WIDTH - pad, rowY);

  rowY += 30;
  drawSlider(ctx, pad, rowY, innerW, (well.strength - 0.5) / 2.5, colorRgb, state.draggingSlider === 'strength');

  // ---- Row 4: Action buttons ----
  rowY += 42;
  const btnGap = 16;
  const btnCount = 3;
  const btnW = (innerW - btnGap * (btnCount - 1)) / btnCount;

  // Toggle type button
  const oppColorRgb = isAtt ? COLORS.violetRgb : COLORS.cyanRgb;
  const oppLabel = isAtt ? 'PUSH' : 'PULL';
  drawActionBtn(ctx, pad, rowY, btnW, `rgba(${oppColorRgb}, 0.12)`, `rgba(${oppColorRgb}, 0.5)`,
    `rgba(${oppColorRgb}, 0.9)`, `\u2194 ${oppLabel}`);

  // Delete button
  drawActionBtn(ctx, pad + btnW + btnGap, rowY, btnW, 'rgba(239,68,68,0.12)', 'rgba(239,68,68,0.4)',
    'rgba(239,68,68,0.9)', '\u2715 DELETE');

  // Done/close button
  drawActionBtn(ctx, pad + (btnW + btnGap) * 2, rowY, btnW, `rgba(${COLORS.greenRgb}, 0.12)`,
    `rgba(${COLORS.greenRgb}, 0.4)`, `rgba(${COLORS.greenRgb}, 0.9)`, '\u2713 DONE');
}

function drawSlider(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number,
  value: number, colorRgb: string, active: boolean
): void {
  const val = Math.max(0, Math.min(1, value));

  // Track bg
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  rrp(ctx, x, y - SLIDER_TRACK_H / 2, w, SLIDER_TRACK_H, SLIDER_TRACK_H / 2);
  ctx.fill();

  // Track fill
  const fillW = Math.max(SLIDER_TRACK_H, w * val);
  ctx.fillStyle = `rgba(${colorRgb}, 0.45)`;
  ctx.beginPath();
  rrp(ctx, x, y - SLIDER_TRACK_H / 2, fillW, SLIDER_TRACK_H, SLIDER_TRACK_H / 2);
  ctx.fill();

  // Thumb
  const tx = x + w * val;
  const r = active ? SLIDER_THUMB_R + 4 : SLIDER_THUMB_R;
  ctx.beginPath();
  ctx.arc(tx, y, r, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${colorRgb}, 1)`;
  ctx.shadowColor = `rgba(${colorRgb}, 0.5)`;
  ctx.shadowBlur = active ? 14 : 8;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawActionBtn(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number,
  bgColor: string, borderColor: string, textColor: string, label: string
): void {
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  rrp(ctx, x, y, w, ACTION_BTN_H, 12);
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.font = `bold ${FONT_ACTION_BTN}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + ACTION_BTN_H / 2);
}

// ===== TOUCH HIT TESTING =====

export interface PanelHitResult {
  area: 'close' | 'radius-slider' | 'strength-slider' | 'toggle' | 'delete' | 'done' | 'none';
}

export function hitTestPanel(
  gx: number, gy: number,
  state: MobileState,
  _panelW: number
): PanelHitResult {
  const py = state.panelY;
  const pad = 30;
  const innerW = GAME_WIDTH - pad * 2;

  if (gy < py) return { area: 'none' };

  // Close X (top right area)
  if (gx > GAME_WIDTH - 80 && gy < py + 60) return { area: 'close' };

  // Radius slider: py + 120 center
  const rSliderY = py + 120;
  if (gy > rSliderY - 30 && gy < rSliderY + 30 && gx > pad - 20 && gx < GAME_WIDTH - pad + 20) {
    return { area: 'radius-slider' };
  }

  // Strength slider: py + 202 center
  const sSliderY = py + 202;
  if (gy > sSliderY - 30 && gy < sSliderY + 30 && gx > pad - 20 && gx < GAME_WIDTH - pad + 20) {
    return { area: 'strength-slider' };
  }

  // Action buttons: py + 244
  const btnY = py + 244;
  if (gy > btnY && gy < btnY + ACTION_BTN_H) {
    const btnGap = 16;
    const btnW = (innerW - btnGap * 2) / 3;
    if (gx > pad && gx < pad + btnW) return { area: 'toggle' };
    if (gx > pad + btnW + btnGap && gx < pad + btnW * 2 + btnGap) return { area: 'delete' };
    if (gx > pad + (btnW + btnGap) * 2 && gx < pad + innerW) return { area: 'done' };
  }

  return { area: 'none' };
}

export function getSliderValue(
  gx: number,
  _state: MobileState,
  _panelW: number
): number {
  const pad = 30;
  const innerW = GAME_WIDTH - pad * 2;
  return Math.max(0, Math.min(1, (gx - pad) / innerW));
}

export function isInToolbar(gy: number): boolean {
  return gy > GAME_HEIGHT - TOOLBAR_H;
}

export function isInPanel(gx: number, gy: number, state: MobileState): boolean {
  if (!state.showPanel) return false;
  return gy > state.panelY;
}

export function hitTestToolbar(
  gx: number, gy: number,
  state: MobileState
): string | null {
  if (state.showPanel) return null; // panel replaces toolbar
  if (gy < GAME_HEIGHT - TOOLBAR_H) return null;
  for (const btn of state.toolbarButtons) {
    if (gx > btn.x && gx < btn.x + btn.w && gy > btn.y && gy < btn.y + btn.h) {
      return btn.id;
    }
  }
  return null;
}

// ===== SELECTED WELL HIGHLIGHT =====

export function renderMobileWellSelection(
  ctx: CanvasRenderingContext2D,
  well: GravityWell,
  time: number
): void {
  const wx = well.position.x;
  const wy = well.position.y;
  const isAtt = well.type === 'attractor';
  const colorRgb = isAtt ? COLORS.cyanRgb : COLORS.violetRgb;

  // Pulsing ring
  const alpha = 0.35 + Math.sin(time * Math.PI * 2 / 1.2) * 0.2;
  ctx.save();
  ctx.setLineDash([10, 8]);
  ctx.lineDashOffset = -time * 25;
  ctx.beginPath();
  ctx.arc(wx, wy, well.radius + 12, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${COLORS.amberRgb}, ${alpha})`;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.setLineDash([]);

  // Corner brackets
  const bs = 30;
  const bLen = 18;
  const breath = Math.sin(time * Math.PI * 2 / 1.2) * 3;
  const s = bs + breath;
  ctx.strokeStyle = `rgba(${COLORS.amberRgb}, 0.7)`;
  ctx.lineWidth = 3;

  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const cx = wx + dx * s;
    const cy = wy + dy * s;
    ctx.beginPath();
    ctx.moveTo(cx, cy - dy * bLen);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx - dx * bLen, cy);
    ctx.stroke();
  }

  // Floating value label
  const str = well.strength.toFixed(1);
  const labelText = `R:${well.radius}  S:${str}`;
  ctx.font = `bold 22px system-ui`;
  const textW = ctx.measureText(labelText).width;
  const labelX = wx - textW / 2 - 12;
  const labelY = wy - well.radius - 40;

  ctx.fillStyle = 'rgba(10, 10, 20, 0.92)';
  ctx.beginPath();
  rrp(ctx, labelX, labelY - 16, textW + 24, 32, 8);
  ctx.fill();
  ctx.strokeStyle = `rgba(${colorRgb}, 0.5)`;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(labelText, wx, labelY);

  ctx.restore();
}

// ===== TOOLBAR ICONS (big, clear) =====

function drawCircleIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, symbol: string, color: string): void {
  ctx.beginPath();
  ctx.arc(cx, cy, ICON_SIZE - 4, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#FFF';
  ctx.font = `bold ${ICON_SIZE + 6}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbol, cx, cy);
}

function drawResetIconM(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, ICON_SIZE - 8, -Math.PI * 0.3, Math.PI * 1.3);
  ctx.stroke();
  const a = -Math.PI * 0.3;
  const r = ICON_SIZE - 8;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(a) * r + 8, cy + Math.sin(a) * r - 4);
  ctx.lineTo(cx + Math.cos(a) * r - 4, cy + Math.sin(a) * r - 10);
  ctx.lineTo(cx + Math.cos(a) * r - 3, cy + Math.sin(a) * r + 5);
  ctx.closePath();
  ctx.fill();
}

function drawLaunchIconM(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.fillStyle = COLORS.amber;
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy - 18);
  ctx.lineTo(cx + 18, cy);
  ctx.lineTo(cx - 14, cy + 18);
  ctx.closePath();
  ctx.shadowColor = `rgba(${COLORS.amberRgb}, 0.6)`;
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawHintIconM(ctx: CanvasRenderingContext2D, cx: number, cy: number, active: boolean): void {
  const c = active ? COLORS.green : COLORS.amber;
  ctx.strokeStyle = c;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(cx, cy - 5, 14, Math.PI * 1.15, Math.PI * 1.85);
  ctx.arc(cx, cy - 5, 14, -Math.PI * 0.85, Math.PI * 0.15);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 7, cy + 12);
  ctx.lineTo(cx + 7, cy + 12);
  ctx.moveTo(cx - 5, cy + 18);
  ctx.lineTo(cx + 5, cy + 18);
  ctx.stroke();
  if (active) {
    ctx.beginPath();
    ctx.arc(cx, cy - 5, 14, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${COLORS.greenRgb}, 0.2)`;
    ctx.fill();
  }
}

function drawDeleteIconM(ctx: CanvasRenderingContext2D, cx: number, cy: number, active: boolean): void {
  ctx.strokeStyle = active ? COLORS.amber : 'rgba(239, 68, 68, 0.8)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 12, cy - 12);
  ctx.lineTo(cx + 12, cy + 12);
  ctx.moveTo(cx + 12, cy - 12);
  ctx.lineTo(cx - 12, cy + 12);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

// ===== ROUNDED RECT PATH (short name for convenience) =====

function rrp(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
): void {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
