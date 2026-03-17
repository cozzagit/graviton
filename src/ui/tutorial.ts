import {
  Button,
  COLORS,
  GAME_WIDTH,
  GAME_HEIGHT,
} from '../engine/types';
import { renderBackground } from '../render/background';
import { renderButton } from './buttons';

const PAGES = [
  // Page 0: Overview
  (ctx: CanvasRenderingContext2D, time: number) => {
    drawTitle(ctx, 'HOW TO PLAY');
    drawSubtitle(ctx, 'Guide the particle to the target using gravity wells');

    // Draw particle → target illustration
    const cx = GAME_WIDTH / 2;
    const y = 320;

    // Start point
    drawGlowDot(ctx, cx - 250, y, 6, COLORS.cyan, time);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('START', cx - 250, y + 25);

    // Dotted path curving through a well
    ctx.save();
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = `rgba(${COLORS.cyanRgb}, 0.4)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 220, y);
    ctx.quadraticCurveTo(cx, y - 80, cx + 220, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Well in the middle
    drawWellIcon(ctx, cx, y - 50, 'attractor', time);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('GRAVITY WELL', cx, y - 90);

    // Target
    drawTargetIcon(ctx, cx + 250, y, time);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px system-ui';
    ctx.fillText('TARGET', cx + 250, y + 25);

    // Steps
    const stepsY = 430;
    const steps = [
      '1. Place gravity wells on the field',
      '2. Adjust their type, radius and strength',
      '3. Press SPACE to launch the particle',
      '4. The particle curves toward attractors and away from repellers',
    ];
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    for (let i = 0; i < steps.length; i++) {
      ctx.fillStyle = `rgba(${COLORS.cyanRgb}, ${0.7 - i * 0.05})`;
      ctx.fillText(steps[i], cx, stepsY + i * 28);
    }
  },

  // Page 1: Well types
  (ctx: CanvasRenderingContext2D, time: number) => {
    drawTitle(ctx, 'GRAVITY WELLS');

    const cx = GAME_WIDTH / 2;

    // --- ATTRACTOR ---
    const ax = cx - 220;
    const ay = 280;

    drawWellIcon(ctx, ax, ay, 'attractor', time);

    // Radius ring
    ctx.save();
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.arc(ax, ay, 70, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${COLORS.cyanRgb}, 0.2)`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Arrows pointing IN
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) * i + Math.PI / 4;
      drawArrow(ctx, ax + Math.cos(angle) * 55, ay + Math.sin(angle) * 55,
        ax + Math.cos(angle) * 30, ay + Math.sin(angle) * 30,
        `rgba(${COLORS.cyanRgb}, 0.5)`);
    }

    ctx.fillStyle = COLORS.cyan;
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('ATTRACTOR', ax, ay - 90);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '13px system-ui';
    ctx.fillText('Pulls particle toward it', ax, ay - 70);
    ctx.fillText('Left-click to place', ax, ay + 95);

    // --- REPELLER ---
    const rx = cx + 220;
    const ry = 280;

    drawWellIcon(ctx, rx, ry, 'repeller', time);

    ctx.save();
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.arc(rx, ry, 70, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${COLORS.violetRgb}, 0.2)`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Arrows pointing OUT
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) * i + Math.PI / 4;
      drawArrow(ctx, rx + Math.cos(angle) * 30, ry + Math.sin(angle) * 30,
        rx + Math.cos(angle) * 55, ry + Math.sin(angle) * 55,
        `rgba(${COLORS.violetRgb}, 0.5)`);
    }

    ctx.fillStyle = COLORS.violet;
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('REPELLER', rx, ry - 90);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '13px system-ui';
    ctx.fillText('Pushes particle away', rx, ry - 70);
    ctx.fillText('Right-click to toggle type', rx, ry + 95);

    // Radius explanation
    const ey = 440;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('The dashed circle shows the radius of influence.', cx, ey);
    ctx.fillText('The closer the particle passes, the stronger the effect.', cx, ey + 24);

    // Strength/radius info
    ctx.fillStyle = `rgba(${COLORS.amberRgb}, 0.5)`;
    ctx.font = '13px system-ui';
    ctx.fillText('Radius and strength affect how much the trajectory bends.', cx, ey + 60);
  },

  // Page 2: Controls
  (ctx: CanvasRenderingContext2D, _time: number) => {
    drawTitle(ctx, 'CONTROLS');

    const cx = GAME_WIDTH / 2;
    const startY = 200;
    const lineH = 42;

    const controls: [string, string, string][] = [
      ['Left Click', 'Place an attractor well', COLORS.cyan],
      ['Right Click', 'Toggle attractor / repeller', COLORS.violet],
      ['Middle Click', 'Delete a well', '#EF4444'],
      ['Scroll Wheel', 'Adjust well radius (hover over well)', COLORS.amber],
      ['Shift + Scroll', 'Adjust well strength (hover over well)', COLORS.amber],
      ['Delete / Backspace', 'Remove hovered well', '#EF4444'],
      ['Space', 'Launch the particle', COLORS.green],
      ['R', 'Reset the level', COLORS.textDim],
      ['H', 'Toggle hint (shows suggested solution)', COLORS.violet],
      ['Escape', 'Back to level select', COLORS.textDim],
    ];

    for (let i = 0; i < controls.length; i++) {
      const y = startY + i * lineH;
      const [key, desc, color] = controls[i];

      // Key badge
      const keyW = Math.max(ctx.measureText(key).width + 20, 100);
      const kx = cx - 180;
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.strokeStyle = `rgba(255,255,255,0.15)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      roundRect(ctx, kx - keyW / 2, y - 12, keyW, 26, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(key, kx, y + 1);

      // Description
      ctx.fillStyle = 'rgba(229, 231, 235, 0.7)';
      ctx.font = '13px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(desc, cx - 80, y + 1);
    }
  },

  // Page 3: Tips
  (ctx: CanvasRenderingContext2D, time: number) => {
    drawTitle(ctx, 'TIPS & SCORING');

    const cx = GAME_WIDTH / 2;

    // Scoring
    const sy = 210;
    ctx.fillStyle = COLORS.amber;
    ctx.font = 'bold 15px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('SCORING', cx, sy);

    const scoring = [
      ['3 Stars', `Use ${'\u2264'} par wells`, COLORS.amber],
      ['2 Stars', 'Use par + 1 wells', COLORS.amber],
      ['1 Star', 'Use more wells', COLORS.textDim],
    ];
    for (let i = 0; i < scoring.length; i++) {
      const y = sy + 30 + i * 30;
      // Stars
      const starCount = 3 - i;
      for (let s = 0; s < 3; s++) {
        ctx.fillStyle = s < starCount
          ? `rgba(${COLORS.amberRgb}, 0.8)`
          : `rgba(${COLORS.amberRgb}, 0.15)`;
        ctx.font = '16px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('\u2605', cx - 120 + s * 18, y);
      }
      ctx.fillStyle = 'rgba(229,231,235,0.6)';
      ctx.font = '13px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(scoring[i][1], cx - 60, y);
    }

    // Tips
    const ty = 370;
    ctx.fillStyle = COLORS.green;
    ctx.font = 'bold 15px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('TIPS', cx, ty);

    const tips = [
      'Wells closer to the trajectory have a much stronger effect',
      'Use attractors to curve the path, repellers to push away from obstacles',
      'Increase strength (Shift+Scroll) for tighter curves',
      'Use the Hint button to see a suggested solution',
      'Click Apply to place the suggested wells, then modify them',
      'The fewer wells you use, the higher your star rating',
    ];

    ctx.font = '13px system-ui';
    ctx.textAlign = 'center';
    for (let i = 0; i < tips.length; i++) {
      ctx.fillStyle = `rgba(255,255,255, ${0.55 - i * 0.03})`;
      ctx.fillText(tips[i], cx, ty + 28 + i * 26);
    }
  },
];

// ===== PUBLIC API =====

export const TUTORIAL_PAGE_COUNT = PAGES.length;

export function renderTutorial(
  ctx: CanvasRenderingContext2D,
  time: number,
  page: number,
  buttons: Button[]
): void {
  renderBackground(ctx, time);

  // Draw current page
  if (page >= 0 && page < PAGES.length) {
    PAGES[page](ctx, time);
  }

  // Page dots
  const dotY = GAME_HEIGHT - 65;
  for (let i = 0; i < PAGES.length; i++) {
    ctx.beginPath();
    ctx.arc(GAME_WIDTH / 2 + (i - (PAGES.length - 1) / 2) * 18, dotY, 4, 0, Math.PI * 2);
    ctx.fillStyle = i === page
      ? COLORS.cyan
      : 'rgba(255,255,255,0.15)';
    ctx.fill();
  }

  // Buttons
  for (const btn of buttons) {
    renderButton(ctx, btn, time);
  }
}

// ===== HELPER DRAWING FUNCTIONS =====

function drawTitle(ctx: CanvasRenderingContext2D, text: string): void {
  ctx.shadowColor = COLORS.cyan;
  ctx.shadowBlur = 20;
  ctx.fillStyle = COLORS.cyan;
  ctx.font = 'bold 36px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, GAME_WIDTH / 2, 100);
  ctx.shadowBlur = 0;

  ctx.fillStyle = COLORS.cyan;
  ctx.fillRect(GAME_WIDTH / 2 - 50, 125, 100, 2);
}

function drawSubtitle(ctx: CanvasRenderingContext2D, text: string): void {
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '16px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(text, GAME_WIDTH / 2, 160);
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

  // Glow
  const grd = ctx.createRadialGradient(x, y, 0, x, y, 25);
  grd.addColorStop(0, `rgba(${rgb}, ${0.4 * pulse})`);
  grd.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.beginPath();
  ctx.arc(x, y, 25, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();

  // Core
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Symbol
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 14px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isAtt ? '+' : '\u2212', x, y);
}

function drawTargetIcon(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  time: number
): void {
  const pulse = 0.6 + Math.sin(time * 2.5) * 0.4;

  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${COLORS.greenRgb}, ${0.5 * pulse})`;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
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
  const headLen = 6;

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
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
