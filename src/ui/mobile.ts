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

// ===== CONSTANTS =====

const TOOLBAR_HEIGHT = 56;
const PANEL_HEIGHT = 160;
export const PANEL_WIDTH = 300;
const BUTTON_SIZE = 44;

// ===== TOUCH STATE =====

export interface MobileState {
  selectedWellIdx: number;
  showPanel: boolean;
  draggingWellIdx: number;
  dragOffsetX: number;
  dragOffsetY: number;
  // Touch tracking
  touchStartX: number;
  touchStartY: number;
  touchStartTime: number;
  lastTapTime: number;
  lastTapX: number;
  lastTapY: number;
  longPressTimer: number;
  longPressProgress: number; // 0-1
  // Slider dragging
  draggingSlider: 'radius' | 'strength' | null;
  // Delete mode
  deleteMode: boolean;
  // Toolbar button areas (calculated on render)
  toolbarButtons: { id: string; x: number; y: number; w: number; h: number }[];
  // Panel areas
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

// ===== TOOLBAR LAYOUT =====

export function getToolbarY(canvasHeight: number, scale: number): number {
  return canvasHeight / scale - TOOLBAR_HEIGHT;
}

export function getToolbarHeight(): number {
  return TOOLBAR_HEIGHT;
}

export function getPanelHeight(): number {
  return PANEL_HEIGHT;
}

// ===== ORIENTATION SCREEN =====

export function renderRotationScreen(
  ctx: CanvasRenderingContext2D,
  time: number
): void {
  // Full dark background
  ctx.fillStyle = '#080810';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  const cx = GAME_WIDTH / 2;
  const cy = GAME_HEIGHT / 2 - 40;

  // Stars
  for (let i = 0; i < 30; i++) {
    const sx = ((i * 137.5) % GAME_WIDTH);
    const sy = ((i * 97.3 + 50) % GAME_HEIGHT);
    const alpha = 0.15 + Math.sin(time * 0.5 + i * 1.7) * 0.1;
    ctx.beginPath();
    ctx.arc(sx, sy, 0.8 + (i % 3) * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fill();
  }

  // Phone icon rotation animation
  const cycle = (time % 4.1);
  let rotation = 0;
  if (cycle < 1.5) {
    // Rotating to landscape
    const t = cycle / 1.5;
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    rotation = ease * (-Math.PI / 2);
  } else if (cycle < 2.7) {
    rotation = -Math.PI / 2; // Hold landscape
  } else if (cycle < 3.5) {
    // Rotating back
    const t = (cycle - 2.7) / 0.8;
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    rotation = -Math.PI / 2 + ease * (Math.PI / 2);
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  // Phone outline
  const pw = 40, ph = 64;
  ctx.strokeStyle = `rgba(${COLORS.cyanRgb}, 0.8)`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  roundRectPath(ctx, -pw / 2, -ph / 2, pw, ph, 6);
  ctx.stroke();
  ctx.fillStyle = `rgba(${COLORS.cyanRgb}, 0.05)`;
  ctx.fill();

  // Notch
  ctx.fillStyle = `rgba(${COLORS.cyanRgb}, 0.3)`;
  ctx.fillRect(-6, -ph / 2 + 2, 12, 3);

  // Home indicator
  ctx.fillRect(-8, ph / 2 - 8, 16, 2);

  ctx.restore();

  // Curved arrow
  const arrowAlpha = cycle < 2.7 ? 0.7 : 0.3 + Math.sin(time * 5) * 0.2;
  ctx.strokeStyle = `rgba(${COLORS.amberRgb}, ${arrowAlpha})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 55, -Math.PI * 0.7, -Math.PI * 0.2);
  ctx.stroke();

  // Arrowhead
  const aAngle = -Math.PI * 0.2;
  const ax = cx + Math.cos(aAngle) * 55;
  const ay = cy + Math.sin(aAngle) * 55;
  ctx.fillStyle = `rgba(${COLORS.amberRgb}, ${arrowAlpha})`;
  ctx.beginPath();
  ctx.moveTo(ax + 6, ay - 3);
  ctx.lineTo(ax - 2, ay - 8);
  ctx.lineTo(ax - 2, ay + 2);
  ctx.closePath();
  ctx.fill();

  // Text
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = '16px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ROTATE YOUR DEVICE', cx, cy + 90);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '12px system-ui';
  ctx.fillText('Graviton plays best in landscape', cx, cy + 115);

  // Accent line
  const lineY = GAME_HEIGHT * 0.75 + Math.sin(time * 0.3) * 10;
  const grd = ctx.createLinearGradient(0, lineY, GAME_WIDTH, lineY);
  grd.addColorStop(0, 'transparent');
  grd.addColorStop(0.5, `rgba(${COLORS.cyanRgb}, 0.15)`);
  grd.addColorStop(1, 'transparent');
  ctx.fillStyle = grd;
  ctx.fillRect(0, lineY, GAME_WIDTH, 1);
}

// ===== MOBILE TOOLBAR =====

export function renderMobileToolbar(
  ctx: CanvasRenderingContext2D,
  state: MobileState,
  wellCount: number,
  maxWells: number,
  launched: boolean,
  hasHint: boolean,
  hintActive: boolean,
  time: number
): void {
  const y = GAME_HEIGHT - TOOLBAR_HEIGHT;

  // Background
  ctx.fillStyle = 'rgba(10, 10, 20, 0.92)';
  ctx.fillRect(0, y, GAME_WIDTH, TOOLBAR_HEIGHT);
  ctx.fillStyle = `rgba(${COLORS.cyanRgb}, 0.25)`;
  ctx.fillRect(0, y, GAME_WIDTH, 1);

  // Calculate button positions
  const buttons: { id: string; label: string; color: string; iconFn: (cx: number, cy: number) => void }[] = [];

  if (!launched) {
    buttons.push({
      id: 'place',
      label: 'PULL',
      color: COLORS.cyan,
      iconFn: (cx, cy) => drawPlaceIcon(ctx, cx, cy, 'attractor'),
    });

    buttons.push({
      id: 'reset',
      label: 'RESET',
      color: 'rgba(255,255,255,0.7)',
      iconFn: (cx, cy) => drawResetIcon(ctx, cx, cy),
    });

    if (hasHint) {
      buttons.push({
        id: hintActive ? 'apply' : 'hint',
        label: hintActive ? 'APPLY' : 'HINT',
        color: hintActive ? COLORS.green : COLORS.amber,
        iconFn: (cx, cy) => drawHintIcon(ctx, cx, cy, hintActive),
      });
    }

    buttons.push({
      id: 'launch',
      label: 'LAUNCH',
      color: COLORS.amber,
      iconFn: (cx, cy) => drawLaunchIcon(ctx, cx, cy),
    });

    if (state.deleteMode) {
      buttons.push({
        id: 'delete',
        label: 'DEL',
        color: '#EF4444',
        iconFn: (cx, cy) => drawDeleteIcon(ctx, cx, cy, true),
      });
    } else if (wellCount > 0) {
      buttons.push({
        id: 'delete',
        label: 'DEL',
        color: 'rgba(239,68,68,0.6)',
        iconFn: (cx, cy) => drawDeleteIcon(ctx, cx, cy, false),
      });
    }
  } else {
    buttons.push({
      id: 'reset',
      label: 'RETRY',
      color: COLORS.amber,
      iconFn: (cx, cy) => drawResetIcon(ctx, cx, cy),
    });
  }

  const totalWidth = GAME_WIDTH - 24;
  const spacing = totalWidth / buttons.length;
  state.toolbarButtons = [];

  for (let i = 0; i < buttons.length; i++) {
    const btn = buttons[i];
    const bx = 12 + spacing * i + spacing / 2;
    const by = y + TOOLBAR_HEIGHT / 2;

    // Store hit area
    state.toolbarButtons.push({
      id: btn.id,
      x: bx - spacing / 2,
      y: y,
      w: spacing,
      h: TOOLBAR_HEIGHT,
    });

    // Active indicator for delete mode
    if (btn.id === 'delete' && state.deleteMode) {
      ctx.beginPath();
      ctx.arc(bx, by, 22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
      ctx.fill();
    }

    // Icon
    btn.iconFn(bx, by - 6);

    // Label
    ctx.fillStyle = btn.color;
    ctx.font = '9px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, bx, by + 16);
  }
}

// ===== SELECTED WELL PANEL =====

export function renderWellPanel(
  ctx: CanvasRenderingContext2D,
  well: GravityWell,
  state: MobileState,
  _time: number
): void {
  const isAtt = well.type === 'attractor';
  const color = isAtt ? COLORS.cyan : COLORS.violet;
  const colorRgb = isAtt ? COLORS.cyanRgb : COLORS.violetRgb;

  const pw = Math.min(PANEL_WIDTH, GAME_WIDTH - 24);
  const px = (GAME_WIDTH - pw) / 2;
  const py = GAME_HEIGHT - TOOLBAR_HEIGHT - PANEL_HEIGHT - 8;
  state.panelY = py;

  // Background
  ctx.fillStyle = 'rgba(15, 15, 28, 0.95)';
  ctx.beginPath();
  roundRectPath(ctx, px, py, pw, PANEL_HEIGHT, 12);
  ctx.fill();
  ctx.strokeStyle = `rgba(${colorRgb}, 0.3)`;
  ctx.lineWidth = 1;
  ctx.stroke();

  const innerX = px + 14;
  const innerW = pw - 28;
  let rowY = py + 16;

  // Header
  ctx.beginPath();
  ctx.arc(innerX + 6, rowY, 5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = 'bold 11px system-ui';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(isAtt ? 'ATTRACTOR' : 'REPELLER', innerX + 16, rowY);

  // Close button
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.5;
  const closeX = px + pw - 20;
  ctx.beginPath();
  ctx.moveTo(closeX - 5, rowY - 5);
  ctx.lineTo(closeX + 5, rowY + 5);
  ctx.moveTo(closeX + 5, rowY - 5);
  ctx.lineTo(closeX - 5, rowY + 5);
  ctx.stroke();

  // Radius slider
  rowY += 30;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.font = '9px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText('RADIUS', innerX, rowY);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText(String(well.radius), innerX + innerW, rowY);

  rowY += 14;
  renderSlider(ctx, innerX, rowY, innerW, (well.radius - 40) / 120, colorRgb, state.draggingSlider === 'radius');

  // Strength slider
  rowY += 28;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.font = '9px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText('POWER', innerX, rowY);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText(well.strength.toFixed(1), innerX + innerW, rowY);

  rowY += 14;
  renderSlider(ctx, innerX, rowY, innerW, (well.strength - 0.5) / 2.5, colorRgb, state.draggingSlider === 'strength');

  // Action buttons row
  rowY += 24;
  const btnW = (innerW - 8) / 2;
  const btnH = 30;

  // Toggle button
  const oppColor = isAtt ? COLORS.violetRgb : COLORS.cyanRgb;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.beginPath();
  roundRectPath(ctx, innerX, rowY, btnW, btnH, 6);
  ctx.fill();
  ctx.strokeStyle = `rgba(${oppColor}, 0.4)`;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = `rgba(${oppColor}, 0.8)`;
  ctx.font = '10px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isAtt ? 'SWITCH TO PUSH' : 'SWITCH TO PULL', innerX + btnW / 2, rowY + btnH / 2);

  // Delete button
  const delX = innerX + btnW + 8;
  ctx.fillStyle = 'rgba(153, 27, 27, 0.15)';
  ctx.beginPath();
  roundRectPath(ctx, delX, rowY, btnW, btnH, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
  ctx.font = '10px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('DELETE', delX + btnW / 2, rowY + btnH / 2);
}

function renderSlider(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number,
  value: number, colorRgb: string, active: boolean
): void {
  // Track background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  roundRectPath(ctx, x, y - 2, w, 4, 2);
  ctx.fill();

  // Track fill
  const fillW = w * Math.max(0, Math.min(1, value));
  ctx.fillStyle = `rgba(${colorRgb}, 0.5)`;
  ctx.beginPath();
  roundRectPath(ctx, x, y - 2, fillW, 4, 2);
  ctx.fill();

  // Thumb
  const tx = x + fillW;
  const thumbR = active ? 12 : 10;
  ctx.beginPath();
  ctx.arc(tx, y, thumbR, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${colorRgb}, 1)`;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

// ===== TOUCH HIT TESTING =====

export interface PanelHitResult {
  area: 'close' | 'radius-slider' | 'strength-slider' | 'toggle' | 'delete' | 'none';
}

export function hitTestPanel(
  gx: number, gy: number,
  state: MobileState,
  panelW: number
): PanelHitResult {
  const pw = Math.min(panelW, GAME_WIDTH - 24);
  const px = (GAME_WIDTH - pw) / 2;
  const py = state.panelY;
  const innerX = px + 14;
  const innerW = pw - 28;

  // Close button (top right corner)
  if (gx > px + pw - 35 && gy < py + 30 && gy > py) {
    return { area: 'close' };
  }

  // Radius slider area (y offset ~60 from panel top)
  const radiusY = py + 60;
  if (gy > radiusY - 16 && gy < radiusY + 16 && gx > innerX - 10 && gx < innerX + innerW + 10) {
    return { area: 'radius-slider' };
  }

  // Strength slider area (~88 from panel top)
  const strengthY = py + 88;
  if (gy > strengthY - 16 && gy < strengthY + 16 && gx > innerX - 10 && gx < innerX + innerW + 10) {
    return { area: 'strength-slider' };
  }

  // Buttons row (~112 from panel top)
  const btnY = py + 112;
  const btnW = (innerW - 8) / 2;
  if (gy > btnY && gy < btnY + 30) {
    if (gx > innerX && gx < innerX + btnW) return { area: 'toggle' };
    if (gx > innerX + btnW + 8 && gx < innerX + innerW) return { area: 'delete' };
  }

  if (gx > px && gx < px + pw && gy > py && gy < py + PANEL_HEIGHT) {
    return { area: 'none' }; // Inside panel but no specific area
  }

  return { area: 'none' };
}

export function getSliderValue(
  gx: number,
  state: MobileState,
  panelW: number
): number {
  const pw = Math.min(panelW, GAME_WIDTH - 24);
  const px = (GAME_WIDTH - pw) / 2;
  const innerX = px + 14;
  const innerW = pw - 28;
  return Math.max(0, Math.min(1, (gx - innerX) / innerW));
}

export function isInToolbar(gy: number): boolean {
  return gy > GAME_HEIGHT - TOOLBAR_HEIGHT;
}

export function isInPanel(gx: number, gy: number, state: MobileState): boolean {
  if (!state.showPanel) return false;
  const pw = Math.min(PANEL_WIDTH, GAME_WIDTH - 24);
  const px = (GAME_WIDTH - pw) / 2;
  return gx > px && gx < px + pw && gy > state.panelY && gy < state.panelY + PANEL_HEIGHT;
}

export function hitTestToolbar(
  gx: number, gy: number,
  state: MobileState
): string | null {
  if (gy < GAME_HEIGHT - TOOLBAR_HEIGHT) return null;
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

  // Pulsing selection ring
  const alpha = 0.3 + Math.sin(time * Math.PI * 2 / 1.2) * 0.2;
  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.lineDashOffset = -time * 20;
  ctx.beginPath();
  ctx.arc(wx, wy, well.radius + 8, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${COLORS.amberRgb}, ${alpha})`;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.setLineDash([]);

  // Corner brackets
  const bracketSize = 10;
  const half = (well.radius > 20 ? 20 : well.radius) + 8;
  const breath = Math.sin(time * Math.PI * 2 / 1.2) * 2;
  const bs = half + breath;
  ctx.strokeStyle = `rgba(${COLORS.amberRgb}, 0.6)`;
  ctx.lineWidth = 1.5;

  // Top-left
  ctx.beginPath();
  ctx.moveTo(wx - bs, wy - bs + bracketSize);
  ctx.lineTo(wx - bs, wy - bs);
  ctx.lineTo(wx - bs + bracketSize, wy - bs);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(wx + bs - bracketSize, wy - bs);
  ctx.lineTo(wx + bs, wy - bs);
  ctx.lineTo(wx + bs, wy - bs + bracketSize);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(wx - bs, wy + bs - bracketSize);
  ctx.lineTo(wx - bs, wy + bs);
  ctx.lineTo(wx - bs + bracketSize, wy + bs);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(wx + bs - bracketSize, wy + bs);
  ctx.lineTo(wx + bs, wy + bs);
  ctx.lineTo(wx + bs, wy + bs - bracketSize);
  ctx.stroke();

  // Value label above well
  const str = well.strength.toFixed(1);
  const labelText = `R:${well.radius} S:${str}`;
  ctx.font = '11px system-ui';
  const textW = ctx.measureText(labelText).width;
  const labelX = wx - textW / 2 - 6;
  const labelY = wy - well.radius - 22;

  ctx.fillStyle = 'rgba(10, 10, 20, 0.85)';
  ctx.beginPath();
  roundRectPath(ctx, labelX, labelY - 10, textW + 12, 20, 4);
  ctx.fill();
  ctx.strokeStyle = `rgba(${colorRgb}, 0.3)`;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = 'rgba(229, 231, 235, 0.8)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(labelText, wx, labelY);

  ctx.restore();
}

// ===== TOOLBAR ICON DRAWING =====

function drawPlaceIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, _type: 'attractor' | 'repeller'): void {
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${COLORS.cyanRgb}, 0.9)`;
  ctx.fill();
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 14px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+', cx, cy);
}

function drawResetIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 9, -Math.PI * 0.3, Math.PI * 1.3);
  ctx.stroke();
  // Arrowhead
  const angle = -Math.PI * 0.3;
  const ax = cx + Math.cos(angle) * 9;
  const ay = cy + Math.sin(angle) * 9;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.beginPath();
  ctx.moveTo(ax + 4, ay - 2);
  ctx.lineTo(ax - 2, ay - 5);
  ctx.lineTo(ax - 1, ay + 3);
  ctx.closePath();
  ctx.fill();
}

function drawLaunchIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.fillStyle = `rgba(${COLORS.amberRgb}, 1)`;
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy - 8);
  ctx.lineTo(cx + 8, cy);
  ctx.lineTo(cx - 6, cy + 8);
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = `rgba(${COLORS.amberRgb}, 0.4)`;
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawHintIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, active: boolean): void {
  const color = active ? `rgba(${COLORS.greenRgb}, 0.9)` : `rgba(${COLORS.amberRgb}, 0.8)`;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  // Bulb
  ctx.beginPath();
  ctx.arc(cx, cy - 3, 7, Math.PI * 1.2, Math.PI * 1.8);
  ctx.arc(cx, cy - 3, 7, -Math.PI * 0.8, Math.PI * 0.2);
  ctx.stroke();
  // Base lines
  ctx.beginPath();
  ctx.moveTo(cx - 4, cy + 5);
  ctx.lineTo(cx + 4, cy + 5);
  ctx.moveTo(cx - 3, cy + 8);
  ctx.lineTo(cx + 3, cy + 8);
  ctx.stroke();
  if (active) {
    ctx.beginPath();
    ctx.arc(cx, cy - 3, 7, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${COLORS.greenRgb}, 0.2)`;
    ctx.fill();
  }
}

function drawDeleteIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, active: boolean): void {
  ctx.strokeStyle = active ? 'rgba(239, 68, 68, 1)' : 'rgba(239, 68, 68, 0.6)';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy - 6);
  ctx.lineTo(cx + 6, cy + 6);
  ctx.moveTo(cx + 6, cy - 6);
  ctx.lineTo(cx - 6, cy + 6);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

// ===== HELPERS =====

function roundRectPath(
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
