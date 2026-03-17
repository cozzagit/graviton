import {
  Button,
  GravityWell,
  SaveData,
  LevelDefinition,
  COLORS,
  GAME_WIDTH,
  GAME_HEIGHT,
} from '../engine/types';
import { renderTitleBackground, renderBackground } from '../render/background';
import { renderStars } from '../render/effects';
import { createButton, renderButton } from './buttons';
import { LEVELS } from '../game/levels';

// ----- TITLE SCREEN -----

export function renderTitleScreen(
  ctx: CanvasRenderingContext2D,
  time: number,
  playButton: Button
): void {
  renderTitleBackground(ctx, time);

  const titleY = GAME_HEIGHT * 0.32;
  const bounce = Math.sin(time * 1.2) * 4;

  ctx.shadowColor = COLORS.cyan;
  ctx.shadowBlur = 30;
  ctx.fillStyle = COLORS.cyan;
  ctx.font = 'bold 72px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GRAVITON', GAME_WIDTH / 2, titleY + bounce);
  ctx.shadowBlur = 0;

  ctx.fillStyle = COLORS.textDim;
  ctx.font = '18px system-ui';
  ctx.fillText(
    'Place gravity wells. Guide the particle. Reach the target.',
    GAME_WIDTH / 2,
    titleY + 55
  );

  renderButton(ctx, playButton, time);

  ctx.fillStyle = `rgba(255, 255, 255, 0.15)`;
  ctx.font = '12px system-ui';
  ctx.fillText('Click to place wells | Right-click to toggle type | Space to launch', GAME_WIDTH / 2, GAME_HEIGHT - 40);
}

// ----- LEVEL SELECT -----

export interface LevelSelectButton {
  id: number;
  x: number;
  y: number;
  size: number;
  hovered: boolean;
}

export function createLevelSelectButtons(): LevelSelectButton[] {
  const cols = 5;
  const size = 80;
  const gap = 20;
  const totalWidth = cols * size + (cols - 1) * gap;
  const startX = (GAME_WIDTH - totalWidth) / 2;
  const startY = 180;

  const buttons: LevelSelectButton[] = [];
  for (let i = 0; i < 20; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    buttons.push({
      id: i + 1,
      x: startX + col * (size + gap),
      y: startY + row * (size + gap),
      size,
      hovered: false,
    });
  }
  return buttons;
}

export function renderLevelSelect(
  ctx: CanvasRenderingContext2D,
  time: number,
  saveData: SaveData,
  levelButtons: LevelSelectButton[],
  backButton: Button
): void {
  renderBackground(ctx, time);

  ctx.fillStyle = COLORS.textBright;
  ctx.font = 'bold 36px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SELECT LEVEL', GAME_WIDTH / 2, 80);

  ctx.fillStyle = COLORS.cyan;
  ctx.fillRect(GAME_WIDTH / 2 - 60, 108, 120, 2);

  for (const btn of levelButtons) {
    const progress = saveData.levels[btn.id];
    const unlocked = progress?.unlocked ?? false;
    const stars = progress?.stars ?? 0;
    const level = LEVELS[btn.id - 1];

    const alpha = unlocked ? 1 : 0.3;
    const borderColor = unlocked
      ? btn.hovered
        ? COLORS.cyan
        : `rgba(${COLORS.cyanRgb}, 0.4)`
      : `rgba(255, 255, 255, 0.1)`;
    const fillColor = btn.hovered && unlocked
      ? `rgba(${COLORS.cyanRgb}, 0.1)`
      : `rgba(255, 255, 255, 0.03)`;

    ctx.fillStyle = fillColor;
    ctx.fillRect(btn.x, btn.y, btn.size, btn.size);

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = btn.hovered && unlocked ? 2 : 1;
    ctx.strokeRect(btn.x, btn.y, btn.size, btn.size);

    if (btn.hovered && unlocked) {
      ctx.shadowColor = COLORS.cyan;
      ctx.shadowBlur = 10;
      ctx.strokeRect(btn.x, btn.y, btn.size, btn.size);
      ctx.shadowBlur = 0;
    }

    ctx.globalAlpha = alpha;
    ctx.fillStyle = unlocked ? COLORS.textBright : COLORS.textDim;
    ctx.font = 'bold 22px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      String(btn.id),
      btn.x + btn.size / 2,
      btn.y + btn.size / 2 - (stars > 0 ? 8 : 0)
    );

    if (btn.hovered && unlocked && level) {
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '10px system-ui';
      ctx.fillText(level.name, btn.x + btn.size / 2, btn.y + btn.size - 28);
    }

    if (stars > 0) {
      renderStars(ctx, btn.x + btn.size / 2, btn.y + btn.size - 16, stars, 3, 8, false, time);
    }

    if (!unlocked) {
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '18px system-ui';
      ctx.fillText('\uD83D\uDD12', btn.x + btn.size / 2, btn.y + btn.size / 2 + 12);
    }

    ctx.globalAlpha = 1;
  }

  renderButton(ctx, backButton, time);
}

// ----- HUD -----

export function renderHUD(
  ctx: CanvasRenderingContext2D,
  level: LevelDefinition,
  wellCount: number,
  launched: boolean,
  time: number,
  buttons: Button[],
  hoveredWell?: GravityWell
): void {
  // Top bar background
  ctx.fillStyle = 'rgba(10, 10, 20, 0.7)';
  ctx.fillRect(0, 0, GAME_WIDTH, 50);
  ctx.fillStyle = `rgba(${COLORS.cyanRgb}, 0.15)`;
  ctx.fillRect(0, 49, GAME_WIDTH, 1);

  // Level name (left)
  ctx.fillStyle = COLORS.textBright;
  ctx.font = 'bold 16px system-ui';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Level ${level.id}: ${level.name}`, 16, 25);

  // Wells count + par (center)
  const wellText = `Wells: ${wellCount}/${level.maxWells}  |  Par: ${level.par}`;
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '13px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(wellText, GAME_WIDTH / 2, 25);

  // Hovered well info (right of center)
  if (hoveredWell) {
    const str = hoveredWell.strength.toFixed(hoveredWell.strength % 1 === 0 ? 0 : 2);
    const infoText = `R:${hoveredWell.radius} S:${str}`;
    ctx.fillStyle = `rgba(${COLORS.amberRgb}, 0.6)`;
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(infoText, GAME_WIDTH / 2 + 180, 25);
  }

  // Buttons
  for (const btn of buttons) {
    renderButton(ctx, btn, time);
  }

  // Bottom contextual info
  if (!launched) {
    // Control chips
    renderControlChips(ctx, time);

    // Contextual prompt
    let promptText = '';
    let promptColor = `rgba(${COLORS.amberRgb}, 0.45)`;

    if (wellCount === 0) {
      promptText = 'Click to place your first gravity well';
    } else if (wellCount >= level.maxWells) {
      promptText = 'All wells placed \u2014 Space to launch';
      promptColor = `rgba(${COLORS.greenRgb}, 0.5)`;
    } else {
      promptText = 'Press Space to launch';
    }

    ctx.fillStyle = promptColor;
    ctx.font = '13px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(promptText, GAME_WIDTH / 2, GAME_HEIGHT - 20);
  }
}

function renderControlChips(ctx: CanvasRenderingContext2D, _time: number): void {
  const chips = [
    'LMB Place',
    'RMB Toggle',
    'MMB Delete',
    'Scroll Resize',
    'Shift+Scroll Strength',
  ];

  const chipH = 18;
  const chipPadX = 6;
  const gap = 5;
  let x = 14;
  const y = GAME_HEIGHT - 44;

  ctx.font = '10px system-ui';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  for (const label of chips) {
    const textW = ctx.measureText(label).width;
    const chipW = textW + chipPadX * 2;

    // Background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.beginPath();
    roundRectChip(ctx, x, y, chipW, chipH, 3);
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillText(label, x + chipPadX, y + chipH / 2);

    x += chipW + gap;
  }
}

function roundRectChip(
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

// ----- VICTORY OVERLAY -----

export function renderVictoryOverlay(
  ctx: CanvasRenderingContext2D,
  stars: number,
  time: number,
  animProgress: number,
  buttons: Button[]
): void {
  const overlayAlpha = Math.min(animProgress * 2, 0.6);
  ctx.fillStyle = `rgba(10, 10, 20, ${overlayAlpha})`;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  if (animProgress < 0.2) return;

  const textProgress = Math.min((animProgress - 0.2) / 0.3, 1);
  const starProgress = Math.max(0, (animProgress - 0.4) / 0.6);

  if (textProgress > 0) {
    const scale = 0.5 + textProgress * 0.5;
    ctx.save();
    ctx.translate(GAME_WIDTH / 2, GAME_HEIGHT * 0.35);
    ctx.scale(scale, scale);
    ctx.globalAlpha = textProgress;

    ctx.shadowColor = COLORS.green;
    ctx.shadowBlur = 25;
    ctx.fillStyle = COLORS.green;
    ctx.font = 'bold 48px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LEVEL COMPLETE', 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  if (starProgress > 0) {
    renderStars(ctx, GAME_WIDTH / 2, GAME_HEIGHT * 0.48, stars, 3, 24, true, time, starProgress * 1.5);
  }

  if (animProgress > 0.8) {
    const btnAlpha = Math.min((animProgress - 0.8) / 0.2, 1);
    ctx.globalAlpha = btnAlpha;
    for (const btn of buttons) {
      renderButton(ctx, btn, time);
    }
    ctx.globalAlpha = 1;
  }
}

// ----- FAIL OVERLAY -----

export function renderFailOverlay(
  ctx: CanvasRenderingContext2D,
  time: number,
  animProgress: number,
  buttons: Button[]
): void {
  const overlayAlpha = Math.min(animProgress * 2, 0.6);
  ctx.fillStyle = `rgba(10, 10, 20, ${overlayAlpha})`;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  if (animProgress < 0.2) return;

  const textProgress = Math.min((animProgress - 0.2) / 0.3, 1);

  if (textProgress > 0) {
    ctx.globalAlpha = textProgress;

    ctx.shadowColor = COLORS.red;
    ctx.shadowBlur = 20;
    ctx.fillStyle = `rgba(${COLORS.redRgb}, 0.9)`;
    ctx.font = 'bold 40px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MISSED', GAME_WIDTH / 2, GAME_HEIGHT * 0.38);
    ctx.shadowBlur = 0;

    ctx.fillStyle = COLORS.textDim;
    ctx.font = '16px system-ui';
    ctx.fillText('The particle was lost...', GAME_WIDTH / 2, GAME_HEIGHT * 0.45);

    ctx.globalAlpha = 1;
  }

  if (animProgress > 0.6) {
    const btnAlpha = Math.min((animProgress - 0.6) / 0.2, 1);
    ctx.globalAlpha = btnAlpha;
    for (const btn of buttons) {
      renderButton(ctx, btn, time);
    }
    ctx.globalAlpha = 1;
  }
}
