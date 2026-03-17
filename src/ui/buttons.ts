import { Button, COLORS } from '../engine/types';

export function createButton(
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  onClick: () => void,
  color?: string,
  fontSize?: number
): Button {
  return { x, y, width, height, label, onClick, hovered: false, color, fontSize };
}

export function isPointInButton(
  button: Button,
  px: number,
  py: number
): boolean {
  return (
    px >= button.x &&
    px <= button.x + button.width &&
    py >= button.y &&
    py <= button.y + button.height
  );
}

export function renderButton(
  ctx: CanvasRenderingContext2D,
  button: Button,
  time: number
): void {
  const color = button.color || COLORS.cyan;
  const isHovered = button.hovered;
  const borderAlpha = isHovered ? 0.9 : 0.5;
  const fillAlpha = isHovered ? 0.15 : 0.05;
  const pulse = isHovered ? 1 : 0.7 + Math.sin(time * 2) * 0.1;

  // Background
  ctx.fillStyle = `rgba(255, 255, 255, ${fillAlpha})`;
  ctx.beginPath();
  roundRect(ctx, button.x, button.y, button.width, button.height, 6);
  ctx.fill();

  // Border
  ctx.strokeStyle = color;
  ctx.globalAlpha = borderAlpha * pulse;
  ctx.lineWidth = isHovered ? 2 : 1;
  ctx.beginPath();
  roundRect(ctx, button.x, button.y, button.width, button.height, 6);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Glow on hover
  if (isHovered) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    roundRect(ctx, button.x, button.y, button.width, button.height, 6);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Label
  const fontSize = button.fontSize || 16;
  ctx.fillStyle = isHovered ? '#FFFFFF' : COLORS.textBright;
  ctx.font = `${fontSize}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    button.label,
    button.x + button.width / 2,
    button.y + button.height / 2
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
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
