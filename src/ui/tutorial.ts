import {
  Button,
  COLORS,
  GAME_WIDTH,
  GAME_HEIGHT,
} from '../engine/types';
import { renderBackground } from '../render/background';
import { renderButton } from './buttons';

// Mobile scale factor for all sizes
let S = 1;

const PAGES = [
  // Page 0: Overview
  (ctx: CanvasRenderingContext2D, time: number) => {
    drawTitle(ctx, 'HOW TO PLAY');
    drawSubtitle(ctx, 'Guide the particle to the target');

    const cx = GAME_WIDTH / 2;
    const y = 280 * S + 40;

    // Start → Well → Target illustration
    const spread = 200 * S;

    drawGlowDot(ctx, cx - spread, y, 8 * S, COLORS.cyan, time);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `${14 * S}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('START', cx - spread, y + 30 * S);

    // Curved path
    ctx.save();
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = `rgba(${COLORS.cyanRgb}, 0.4)`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - spread + 30, y);
    ctx.quadraticCurveTo(cx, y - 70 * S, cx + spread - 30, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    drawWellIcon(ctx, cx, y - 45 * S, 'attractor', time);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `${13 * S}px system-ui`;
    ctx.fillText('GRAVITY WELL', cx, y - 80 * S);

    drawTargetIcon(ctx, cx + spread, y, time);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `${14 * S}px system-ui`;
    ctx.fillText('TARGET', cx + spread, y + 30 * S);

    // Steps
    const stepsY = y + 70 * S;
    const steps = [
      '1. Place gravity wells on the field',
      '2. Adjust type, radius and strength',
      '3. Press LAUNCH to fire the particle',
      '4. Particle curves toward attractors, away from repellers',
    ];
    ctx.textAlign = 'center';
    for (let i = 0; i < steps.length; i++) {
      ctx.fillStyle = `rgba(${COLORS.cyanRgb}, ${0.75 - i * 0.05})`;
      ctx.font = `${16 * S}px system-ui`;
      ctx.fillText(steps[i], cx, stepsY + i * 32 * S);
    }
  },

  // Page 1: Well types
  (ctx: CanvasRenderingContext2D, time: number) => {
    drawTitle(ctx, 'GRAVITY WELLS');

    const cx = GAME_WIDTH / 2;
    const wellY = 240 + 30 * S;

    // --- ATTRACTOR ---
    const ax = cx - 200 * S;
    drawWellIcon(ctx, ax, wellY, 'attractor', time);

    // Radius ring
    ctx.save();
    ctx.setLineDash([6, 10]);
    ctx.beginPath();
    ctx.arc(ax, wellY, 60 * S, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${COLORS.cyanRgb}, 0.25)`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Inward arrows
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) * i + Math.PI / 4;
      const r1 = 45 * S, r2 = 25 * S;
      drawArrow(ctx, ax + Math.cos(angle) * r1, wellY + Math.sin(angle) * r1,
        ax + Math.cos(angle) * r2, wellY + Math.sin(angle) * r2,
        `rgba(${COLORS.cyanRgb}, 0.6)`);
    }

    ctx.fillStyle = COLORS.cyan;
    ctx.font = `bold ${20 * S}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('ATTRACTOR', ax, wellY - 80 * S);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `${15 * S}px system-ui`;
    ctx.fillText('Pulls particle in', ax, wellY - 58 * S);

    // --- REPELLER ---
    const rx = cx + 200 * S;
    drawWellIcon(ctx, rx, wellY, 'repeller', time);

    ctx.save();
    ctx.setLineDash([6, 10]);
    ctx.beginPath();
    ctx.arc(rx, wellY, 60 * S, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${COLORS.violetRgb}, 0.25)`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Outward arrows
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) * i + Math.PI / 4;
      const r1 = 25 * S, r2 = 45 * S;
      drawArrow(ctx, rx + Math.cos(angle) * r1, wellY + Math.sin(angle) * r1,
        rx + Math.cos(angle) * r2, wellY + Math.sin(angle) * r2,
        `rgba(${COLORS.violetRgb}, 0.6)`);
    }

    ctx.fillStyle = COLORS.violet;
    ctx.font = `bold ${20 * S}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('REPELLER', rx, wellY - 80 * S);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `${15 * S}px system-ui`;
    ctx.fillText('Pushes particle away', rx, wellY - 58 * S);

    // Bottom info
    const infoY = wellY + 100 * S;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = `${15 * S}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('Dashed circle = radius of influence', cx, infoY);
    ctx.fillText('Closer to the well = stronger effect', cx, infoY + 28 * S);
    ctx.fillStyle = `rgba(${COLORS.amberRgb}, 0.5)`;
    ctx.fillText('Adjust radius & strength after placing', cx, infoY + 62 * S);
  },

  // Page 2: Controls
  (ctx: CanvasRenderingContext2D, _time: number) => {
    drawTitle(ctx, 'CONTROLS');

    const cx = GAME_WIDTH / 2;
    const startY = 180;
    const lineH = 48 * S;
    const f = 15 * S;

    const controls: [string, string, string][] = [
      ['Tap empty', 'Place an attractor well', COLORS.cyan],
      ['Tap well', 'Select well (edit panel)', COLORS.amber],
      ['Double-tap well', 'Toggle attractor / repeller', COLORS.violet],
      ['Long-press well', 'Drag to reposition', COLORS.amber],
      ['Scroll / Slider', 'Adjust radius and strength', COLORS.amber],
      ['LAUNCH button', 'Fire the particle', COLORS.green],
      ['RESET button', 'Reset the level', COLORS.textDim],
      ['HINT button', 'Show suggested solution', COLORS.violet],
    ];

    ctx.font = `${f}px system-ui`;

    for (let i = 0; i < controls.length; i++) {
      const y = startY + i * lineH;
      const [key, desc, color] = controls[i];

      // Key badge
      const keyW = Math.max(ctx.measureText(key).width + 24 * S, 120 * S);
      const kx = cx - 160 * S;
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      roundRect(ctx, kx - keyW / 2, y - 14 * S, keyW, 30 * S, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = `bold ${f}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(key, kx, y + 1);

      // Description
      ctx.fillStyle = 'rgba(229, 231, 235, 0.7)';
      ctx.font = `${f}px system-ui`;
      ctx.textAlign = 'left';
      ctx.fillText(desc, cx - 50 * S, y + 1);
    }
  },

  // Page 3: Tips
  (ctx: CanvasRenderingContext2D, _time: number) => {
    drawTitle(ctx, 'TIPS & SCORING');

    const cx = GAME_WIDTH / 2;
    const f = 16 * S;

    // Scoring
    const sy = 200;
    ctx.fillStyle = COLORS.amber;
    ctx.font = `bold ${18 * S}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('SCORING', cx, sy);

    const scoring = [
      ['Use \u2264 par wells', 3],
      ['Use par + 1 wells', 2],
      ['Use more wells', 1],
    ];
    for (let i = 0; i < scoring.length; i++) {
      const y = sy + 36 * S + i * 34 * S;
      const [label, starCount] = scoring[i];
      for (let s = 0; s < 3; s++) {
        ctx.fillStyle = s < (starCount as number)
          ? `rgba(${COLORS.amberRgb}, 0.8)`
          : `rgba(${COLORS.amberRgb}, 0.15)`;
        ctx.font = `${20 * S}px system-ui`;
        ctx.textAlign = 'center';
        ctx.fillText('\u2605', cx - 110 * S + s * 22 * S, y);
      }
      ctx.fillStyle = 'rgba(229,231,235,0.65)';
      ctx.font = `${f}px system-ui`;
      ctx.textAlign = 'left';
      ctx.fillText(label as string, cx - 50 * S, y);
    }

    // Tips
    const ty = sy + 160 * S;
    ctx.fillStyle = COLORS.green;
    ctx.font = `bold ${18 * S}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('TIPS', cx, ty);

    const tips = [
      'Wells closer to the path = stronger effect',
      'Use HINT to see a suggested solution',
      'Tap APPLY to place the suggested wells',
      'Fewer wells = more stars',
    ];

    for (let i = 0; i < tips.length; i++) {
      ctx.fillStyle = `rgba(255,255,255, ${0.6 - i * 0.04})`;
      ctx.font = `${f}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText(tips[i], cx, ty + 34 * S + i * 32 * S);
    }
  },
];

// ===== PUBLIC API =====

export const TUTORIAL_PAGE_COUNT = PAGES.length;

export function renderTutorial(
  ctx: CanvasRenderingContext2D,
  time: number,
  page: number,
  buttons: Button[],
  mobile: boolean = false
): void {
  S = mobile ? 1.6 : 1;

  renderBackground(ctx, time);

  if (page >= 0 && page < PAGES.length) {
    PAGES[page](ctx, time);
  }

  // Page dots
  const dotR = 6 * S;
  const dotY = GAME_HEIGHT - 80 * S;
  for (let i = 0; i < PAGES.length; i++) {
    ctx.beginPath();
    ctx.arc(GAME_WIDTH / 2 + (i - (PAGES.length - 1) / 2) * 24 * S, dotY, dotR, 0, Math.PI * 2);
    ctx.fillStyle = i === page ? COLORS.cyan : 'rgba(255,255,255,0.2)';
    ctx.fill();
  }

  for (const btn of buttons) {
    renderButton(ctx, btn, time);
  }
}

// ===== HELPER DRAWING =====

function drawTitle(ctx: CanvasRenderingContext2D, text: string): void {
  ctx.shadowColor = COLORS.cyan;
  ctx.shadowBlur = 20;
  ctx.fillStyle = COLORS.cyan;
  ctx.font = `bold ${36 * S}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, GAME_WIDTH / 2, 80 * S + 20);
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.cyan;
  ctx.fillRect(GAME_WIDTH / 2 - 50 * S, 105 * S + 20, 100 * S, 3);
}

function drawSubtitle(ctx: CanvasRenderingContext2D, text: string): void {
  ctx.fillStyle = COLORS.textDim;
  ctx.font = `${18 * S}px system-ui`;
  ctx.textAlign = 'center';
  ctx.fillText(text, GAME_WIDTH / 2, 135 * S + 20);
}

function drawGlowDot(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  color: string, time: number
): void {
  const pulse = 0.7 + Math.sin(time * 3) * 0.3;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12 * pulse;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawWellIcon(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  type: 'attractor' | 'repeller',
  time: number
): void {
  const isAtt = type === 'attractor';
  const color = isAtt ? COLORS.cyan : COLORS.violet;
  const rgb = isAtt ? COLORS.cyanRgb : COLORS.violetRgb;
  const pulse = 0.7 + Math.sin(time * 3) * 0.3;
  const r = 12 * S;

  const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 2.5);
  grd.addColorStop(0, `rgba(${rgb}, ${0.4 * pulse})`);
  grd.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.beginPath();
  ctx.arc(x, y, r * 2.5, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#FFF';
  ctx.font = `bold ${16 * S}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isAtt ? '+' : '\u2212', x, y);
}

function drawTargetIcon(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, time: number
): void {
  const pulse = 0.6 + Math.sin(time * 2.5) * 0.4;
  const r = 24 * S;

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${COLORS.greenRgb}, ${0.5 * pulse})`;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, 5 * S, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.green;
  ctx.shadowColor = COLORS.green;
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number, fromY: number,
  toX: number, toY: number,
  color: string
): void {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const headLen = 8 * S;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - Math.cos(angle - 0.4) * headLen, toY - Math.sin(angle - 0.4) * headLen);
  ctx.lineTo(toX - Math.cos(angle + 0.4) * headLen, toY - Math.sin(angle + 0.4) * headLen);
  ctx.closePath();
  ctx.fill();
}

function roundRect(
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
