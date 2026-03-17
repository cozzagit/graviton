import { FloatingParticle, COLORS, GAME_WIDTH, GAME_HEIGHT } from '../engine/types';

const BG_PARTICLE_COUNT = 40;
let bgParticles: FloatingParticle[] = [];

export function initBackground(): void {
  bgParticles = [];
  for (let i = 0; i < BG_PARTICLE_COUNT; i++) {
    bgParticles.push(createBgParticle());
  }
}

function createBgParticle(): FloatingParticle {
  const colors = [COLORS.cyan, COLORS.violet, COLORS.amber];
  return {
    x: Math.random() * GAME_WIDTH,
    y: Math.random() * GAME_HEIGHT,
    vx: (Math.random() - 0.5) * 15,
    vy: (Math.random() - 0.5) * 15,
    radius: Math.random() * 2 + 0.5,
    alpha: Math.random() * 0.3 + 0.05,
    color: colors[Math.floor(Math.random() * colors.length)],
  };
}

export function updateBackground(dt: number): void {
  for (const p of bgParticles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (p.x < 0) p.x = GAME_WIDTH;
    if (p.x > GAME_WIDTH) p.x = 0;
    if (p.y < 0) p.y = GAME_HEIGHT;
    if (p.y > GAME_HEIGHT) p.y = 0;
  }
}

export function renderBackground(ctx: CanvasRenderingContext2D, time: number): void {
  // Solid background
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Subtle grid
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  const gridSize = 50;
  for (let x = 0; x < GAME_WIDTH; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, GAME_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < GAME_HEIGHT; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(GAME_WIDTH, y);
    ctx.stroke();
  }

  // Floating particles
  for (const p of bgParticles) {
    const flicker = 0.7 + Math.sin(time * 2 + p.x * 0.01) * 0.3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.alpha * flicker;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export function renderTitleBackground(ctx: CanvasRenderingContext2D, time: number): void {
  renderBackground(ctx, time);

  // Extra large ambient glow spots for title screen
  const glows = [
    { x: GAME_WIDTH * 0.3, y: GAME_HEIGHT * 0.4, color: COLORS.cyanRgb, r: 200 },
    { x: GAME_WIDTH * 0.7, y: GAME_HEIGHT * 0.6, color: COLORS.violetRgb, r: 180 },
    { x: GAME_WIDTH * 0.5, y: GAME_HEIGHT * 0.3, color: COLORS.amberRgb, r: 150 },
  ];

  for (const g of glows) {
    const pulse = 0.5 + Math.sin(time * 0.8 + g.x * 0.005) * 0.3;
    const grd = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r);
    grd.addColorStop(0, `rgba(${g.color}, ${0.06 * pulse})`);
    grd.addColorStop(1, `rgba(${g.color}, 0)`);
    ctx.fillStyle = grd;
    ctx.fillRect(g.x - g.r, g.y - g.r, g.r * 2, g.r * 2);
  }
}
