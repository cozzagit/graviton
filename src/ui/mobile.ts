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

// ===== CONSTANTS (all in game units — scaled up for mobile visibility) =====

const TOOLBAR_HEIGHT = 110;
const PANEL_HEIGHT = 310;
export const PANEL_WIDTH = 500;
const BUTTON_SIZE = 80;
const FONT_SM = 18;
const FONT_MD = 22;
const FONT_LG = 28;
const ICON_R = 20;

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

// ===== LAYOUT =====

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

  // Phone rotation animation
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
  const pw = 50, ph = 80;
  ctx.strokeStyle = `rgba(${COLORS.cyanRgb}, 0.8)`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  roundRectPath(ctx, -pw / 2, -ph / 2, pw, ph, 8);
  ctx.stroke();
  ctx.fillStyle = `rgba(${COLORS.cyanRgb}, 0.05)`;
  ctx.fill();
  ctx.fillStyle = `rgba(${COLORS.cyanRgb}, 0.3)`;
  ctx.fillRect(-8, -ph / 2 + 3, 16, 4);
  ctx.fillRect(-10, ph / 2 - 10, 20, 3);
  ctx.restore();

  // Arrow
  const arrowAlpha = cycle < 2.7 ? 0.7 : 0.3 + Math.sin(time * 5) * 0.2;
  ctx.strokeStyle = `rgba(${COLORS.amberRgb}, ${arrowAlpha})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 65, -Math.PI * 0.7, -Math.PI * 0.2);
  ctx.stroke();
  const aAngle = -Math.PI * 0.2;
  const ax = cx + Math.cos(aAngle) * 65;
  const ay = cy + Math.sin(aAngle) * 65;
  ctx.fillStyle = `rgba(${COLORS.amberRgb}, ${arrowAlpha})`;
  ctx.beginPath();
  ctx.moveTo(ax + 8, ay - 4);
  ctx.lineTo(ax - 3, ay - 10);
  ctx.lineTo(ax - 2, ay + 4);
  ctx.closePath();
  ctx.fill();

  // Text
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = 'bold 28px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ROTATE YOUR DEVICE', cx, cy + 110);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '20px system-ui';
  ctx.fillText('Graviton plays best in landscape', cx, cy + 145);
}

// ===== MOBILE TOOLBAR =====

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
  const y = GAME_HEIGHT - TOOLBAR_HEIGHT;

  // Background
  ctx.fillStyle = 'rgba(10, 10, 20, 0.92)';
  ctx.fillRect(0, y, GAME_WIDTH, TOOLBAR_HEIGHT);
  ctx.fillStyle = `rgba(${COLORS.cyanRgb}, 0.25)`;
  ctx.fillRect(0, y, GAME_WIDTH, 2);

  // Build button list
  const buttons: { id: string; label: string; color: string; iconFn: (cx: number, cy: number) => void }[] = [];

  if (!launched) {
    buttons.push({
      id: 'place',
      label: 'PLACE',
      color: COLORS.cyan,
      iconFn: (cx, cy) => drawPlaceIcon(ctx, cx, cy),
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
    if (wellCount > 0) {
      buttons.push({
        id: 'delete',
        label: state.deleteMode ? 'CANCEL' : 'DELETE',
        color: state.deleteMode ? COLORS.amber : '#EF4444',
        iconFn: (cx, cy) => drawDeleteIcon(ctx, cx, cy, state.deleteMode),
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

  const totalWidth = GAME_WIDTH - 40;
  const spacing = totalWidth / buttons.length;
  state.toolbarButtons = [];

  for (let i = 0; i < buttons.length; i++) {
    const btn = buttons[i];
    const bx = 20 + spacing * i + spacing / 2;
    const by = y + TOOLBAR_HEIGHT / 2;

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
      ctx.arc(bx, by - 6, ICON_R + 12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
      ctx.fill();
    }

    // Launch button special background
    if (btn.id === 'launch') {
      ctx.fillStyle = `rgba(${COLORS.amberRgb}, 0.15)`;
      ctx.beginPath();
      roundRectPath(ctx, bx - 55, by - 28, 110, 50, 25);
      ctx.fill();
      ctx.strokeStyle = `rgba(${COLORS.amberRgb}, 0.4)`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Icon
    btn.iconFn(bx, by - 10);

    // Label
    ctx.fillStyle = btn.color;
    ctx.font = `bold ${FONT_SM}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, bx, by + 30);
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

  const pw = Math.min(PANEL_WIDTH, GAME_WIDTH - 40);
  const px = (GAME_WIDTH - pw) / 2;
  const py = GAME_HEIGHT - TOOLBAR_HEIGHT - PANEL_HEIGHT - 12;
  state.panelY = py;

  // Background
  ctx.fillStyle = 'rgba(15, 15, 28, 0.95)';
  ctx.beginPath();
  roundRectPath(ctx, px, py, pw, PANEL_HEIGHT, 16);
  ctx.fill();
  ctx.strokeStyle = `rgba(${colorRgb}, 0.4)`;
  ctx.lineWidth = 2;
  ctx.stroke();

  const innerX = px + 24;
  const innerW = pw - 48;
  let rowY = py + 30;

  // Header: type dot + label
  ctx.beginPath();
  ctx.arc(innerX + 10, rowY, 10, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = `bold ${FONT_MD}px system-ui`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(isAtt ? 'ATTRACTOR' : 'REPELLER', innerX + 28, rowY);

  // Close X button (top right)
  const closeX = px + pw - 36;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(closeX - 10, rowY - 10);
  ctx.lineTo(closeX + 10, rowY + 10);
  ctx.moveTo(closeX + 10, rowY - 10);
  ctx.lineTo(closeX - 10, rowY + 10);
  ctx.stroke();
  ctx.lineCap = 'butt';

  // --- Radius slider ---
  rowY += 50;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = `${FONT_SM}px system-ui`;
  ctx.textAlign = 'left';
  ctx.fillText('RADIUS', innerX, rowY);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = `bold ${FONT_MD}px system-ui`;
  ctx.fillText(String(well.radius), innerX + innerW, rowY);

  rowY += 26;
  renderSlider(ctx, innerX, rowY, innerW, (well.radius - 40) / 120, colorRgb, state.draggingSlider === 'radius');

  // --- Strength slider ---
  rowY += 50;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = `${FONT_SM}px system-ui`;
  ctx.textAlign = 'left';
  ctx.fillText('POWER', innerX, rowY);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = `bold ${FONT_MD}px system-ui`;
  ctx.fillText(well.strength.toFixed(1), innerX + innerW, rowY);

  rowY += 26;
  renderSlider(ctx, innerX, rowY, innerW, (well.strength - 0.5) / 2.5, colorRgb, state.draggingSlider === 'strength');

  // --- Action buttons ---
  rowY += 44;
  const btnW = (innerW - 16) / 2;
  const btnH = 52;

  // Toggle button
  const oppColor = isAtt ? COLORS.violetRgb : COLORS.cyanRgb;
  const oppLabel = isAtt ? 'SWITCH TO PUSH' : 'SWITCH TO PULL';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.beginPath();
  roundRectPath(ctx, innerX, rowY, btnW, btnH, 10);
  ctx.fill();
  ctx.strokeStyle = `rgba(${oppColor}, 0.5)`;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = `rgba(${oppColor}, 0.9)`;
  ctx.font = `bold ${FONT_SM - 2}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(oppLabel, innerX + btnW / 2, rowY + btnH / 2);

  // Delete button
  const delX = innerX + btnW + 16;
  ctx.fillStyle = 'rgba(153, 27, 27, 0.2)';
  ctx.beginPath();
  roundRectPath(ctx, delX, rowY, btnW, btnH, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
  ctx.font = `bold ${FONT_SM}px system-ui`;
  ctx.textAlign = 'center';
  ctx.fillText('DELETE', delX + btnW / 2, rowY + btnH / 2);
}

function renderSlider(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number,
  value: number, colorRgb: string, active: boolean
): void {
  const trackH = 8;
  const thumbR = active ? 20 : 16;

  // Track background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  roundRectPath(ctx, x, y - trackH / 2, w, trackH, 4);
  ctx.fill();

  // Track fill
  const fillW = w * Math.max(0, Math.min(1, value));
  if (fillW > 0) {
    ctx.fillStyle = `rgba(${colorRgb}, 0.5)`;
    ctx.beginPath();
    roundRectPath(ctx, x, y - trackH / 2, fillW, trackH, 4);
    ctx.fill();
  }

  // Thumb
  const tx = x + fillW;
  ctx.beginPath();
  ctx.arc(tx, y, thumbR, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${colorRgb}, 1)`;
  ctx.shadowColor = `rgba(${colorRgb}, 0.4)`;
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 3;
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
  const pw = Math.min(panelW, GAME_WIDTH - 40);
  const px = (GAME_WIDTH - pw) / 2;
  const py = state.panelY;
  const innerX = px + 24;
  const innerW = pw - 48;

  if (gx < px || gx > px + pw || gy < py || gy > py + PANEL_HEIGHT) {
    return { area: 'none' };
  }

  // Close button (top right)
  if (gx > px + pw - 60 && gy < py + 50) {
    return { area: 'close' };
  }

  // Radius slider area (~106 from panel top)
  const radiusY = py + 106;
  if (gy > radiusY - 28 && gy < radiusY + 28 && gx > innerX - 20 && gx < innerX + innerW + 20) {
    return { area: 'radius-slider' };
  }

  // Strength slider area (~182 from panel top)
  const strengthY = py + 182;
  if (gy > strengthY - 28 && gy < strengthY + 28 && gx > innerX - 20 && gx < innerX + innerW + 20) {
    return { area: 'strength-slider' };
  }

  // Action buttons (~226 from panel top)
  const btnY = py + 226;
  const btnW = (innerW - 16) / 2;
  if (gy > btnY && gy < btnY + 52) {
    if (gx > innerX && gx < innerX + btnW) return { area: 'toggle' };
    if (gx > innerX + btnW + 16 && gx < innerX + innerW) return { area: 'delete' };
  }

  return { area: 'none' };
}

export function getSliderValue(
  gx: number,
  state: MobileState,
  panelW: number
): number {
  const pw = Math.min(panelW, GAME_WIDTH - 40);
  const px = (GAME_WIDTH - pw) / 2;
  const innerX = px + 24;
  const innerW = pw - 48;
  return Math.max(0, Math.min(1, (gx - innerX) / innerW));
}

export function isInToolbar(gy: number): boolean {
  return gy > GAME_HEIGHT - TOOLBAR_HEIGHT;
}

export function isInPanel(gx: number, gy: number, state: MobileState): boolean {
  if (!state.showPanel) return false;
  const pw = Math.min(PANEL_WIDTH, GAME_WIDTH - 40);
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
  ctx.setLineDash([8, 6]);
  ctx.lineDashOffset = -time * 20;
  ctx.beginPath();
  ctx.arc(wx, wy, well.radius + 10, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${COLORS.amberRgb}, ${alpha})`;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.setLineDash([]);

  // Corner brackets
  const bs = 26;
  const bracketLen = 14;
  const breath = Math.sin(time * Math.PI * 2 / 1.2) * 3;
  const s = bs + breath;
  ctx.strokeStyle = `rgba(${COLORS.amberRgb}, 0.6)`;
  ctx.lineWidth = 2.5;

  const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  for (const [dx, dy] of corners) {
    const cx = wx + dx * s;
    const cy = wy + dy * s;
    ctx.beginPath();
    ctx.moveTo(cx, cy + dy * -bracketLen);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + dx * -bracketLen, cy);
    ctx.stroke();
  }

  // Value label above well
  const str = well.strength.toFixed(1);
  const labelText = `R:${well.radius}  S:${str}`;
  ctx.font = `bold ${FONT_SM}px system-ui`;
  const textW = ctx.measureText(labelText).width;
  const labelX = wx - textW / 2 - 10;
  const labelY = wy - well.radius - 35;

  ctx.fillStyle = 'rgba(10, 10, 20, 0.9)';
  ctx.beginPath();
  roundRectPath(ctx, labelX, labelY - 14, textW + 20, 28, 6);
  ctx.fill();
  ctx.strokeStyle = `rgba(${colorRgb}, 0.4)`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = 'rgba(229, 231, 235, 0.9)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(labelText, wx, labelY);

  ctx.restore();
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
  // Top bar
  ctx.fillStyle = 'rgba(10, 10, 20, 0.75)';
  ctx.fillRect(0, 0, GAME_WIDTH, 60);
  ctx.fillStyle = `rgba(${COLORS.cyanRgb}, 0.2)`;
  ctx.fillRect(0, 59, GAME_WIDTH, 2);

  // Level name
  ctx.fillStyle = COLORS.textBright;
  ctx.font = `bold ${FONT_MD}px system-ui`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Lv ${levelId}: ${levelName}`, 20, 32);

  // Wells + par
  ctx.fillStyle = COLORS.textDim;
  ctx.font = `${FONT_SM}px system-ui`;
  ctx.textAlign = 'right';
  ctx.fillText(`Wells ${wellCount}/${maxWells}  Par ${par}`, GAME_WIDTH - 20, 32);
}

// ===== TOOLBAR ICON DRAWING (scaled up) =====

function drawPlaceIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.beginPath();
  ctx.arc(cx, cy, ICON_R, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${COLORS.cyanRgb}, 0.9)`;
  ctx.fill();
  ctx.fillStyle = '#FFF';
  ctx.font = `bold ${FONT_LG}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+', cx, cy);
}

function drawResetIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, ICON_R - 4, -Math.PI * 0.3, Math.PI * 1.3);
  ctx.stroke();
  const angle = -Math.PI * 0.3;
  const r = ICON_R - 4;
  const tipX = cx + Math.cos(angle) * r;
  const tipY = cy + Math.sin(angle) * r;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.beginPath();
  ctx.moveTo(tipX + 6, tipY - 3);
  ctx.lineTo(tipX - 3, tipY - 7);
  ctx.lineTo(tipX - 2, tipY + 4);
  ctx.closePath();
  ctx.fill();
}

function drawLaunchIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.fillStyle = `rgba(${COLORS.amberRgb}, 1)`;
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy - 14);
  ctx.lineTo(cx + 14, cy);
  ctx.lineTo(cx - 10, cy + 14);
  ctx.closePath();
  ctx.shadowColor = `rgba(${COLORS.amberRgb}, 0.5)`;
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawHintIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, active: boolean): void {
  const color = active ? `rgba(${COLORS.greenRgb}, 0.9)` : `rgba(${COLORS.amberRgb}, 0.8)`;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy - 4, 12, Math.PI * 1.15, Math.PI * 1.85);
  ctx.arc(cx, cy - 4, 12, -Math.PI * 0.85, Math.PI * 0.15);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy + 10);
  ctx.lineTo(cx + 6, cy + 10);
  ctx.moveTo(cx - 5, cy + 15);
  ctx.lineTo(cx + 5, cy + 15);
  ctx.stroke();
  if (active) {
    ctx.beginPath();
    ctx.arc(cx, cy - 4, 12, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${COLORS.greenRgb}, 0.2)`;
    ctx.fill();
  }
}

function drawDeleteIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, active: boolean): void {
  ctx.strokeStyle = active ? 'rgba(239, 68, 68, 1)' : 'rgba(239, 68, 68, 0.7)';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy - 10);
  ctx.lineTo(cx + 10, cy + 10);
  ctx.moveTo(cx + 10, cy - 10);
  ctx.lineTo(cx - 10, cy + 10);
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
