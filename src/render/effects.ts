import {
  ExplosionParticle,
  GravityWell,
  Obstacle,
  LevelTarget,
  Vec2,
  COLORS,
} from '../engine/types';

let explosionParticles: ExplosionParticle[] = [];

export function spawnExplosion(
  x: number, y: number, count: number, color: string, speed: number = 200
): void {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const spd = speed * (0.5 + Math.random() * 0.5);
    explosionParticles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life: 1,
      maxLife: 0.8 + Math.random() * 0.5,
      radius: 2 + Math.random() * 3,
      color,
    });
  }
}

export function updateExplosions(dt: number): void {
  for (let i = explosionParticles.length - 1; i >= 0; i--) {
    const p = explosionParticles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.98;
    p.vy *= 0.98;
    p.life -= dt / p.maxLife;
    if (p.life <= 0) {
      explosionParticles.splice(i, 1);
    }
  }
}

export function renderExplosions(ctx: CanvasRenderingContext2D): void {
  for (const p of explosionParticles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life * 0.8;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}

export function clearExplosions(): void {
  explosionParticles = [];
}

// ===== GRAVITY WELL RENDERING =====

export function renderGravityWell(
  ctx: CanvasRenderingContext2D,
  well: GravityWell,
  time: number,
  isHovered: boolean
): void {
  const isAttractor = well.type === 'attractor';
  const color = isAttractor ? COLORS.cyan : COLORS.violet;
  const colorRgb = isAttractor ? COLORS.cyanRgb : COLORS.violetRgb;
  const pulse = 0.7 + Math.sin(time * 3 + well.position.x * 0.1) * 0.3;
  const wx = well.position.x;
  const wy = well.position.y;

  // --- Radius boundary ring (always visible) ---
  const radiusAlpha = isHovered ? 0.35 : 0.12;
  ctx.save();
  ctx.setLineDash([4, 8]);
  ctx.beginPath();
  ctx.arc(wx, wy, well.radius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${colorRgb}, ${radiusAlpha})`;
  ctx.lineWidth = isHovered ? 1.5 : 1;
  ctx.shadowColor = `rgba(${colorRgb}, ${radiusAlpha * 0.5})`;
  ctx.shadowBlur = isHovered ? 6 : 3;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.setLineDash([]);
  ctx.restore();

  // --- Radius fill on hover ---
  if (isHovered) {
    const grdR = ctx.createRadialGradient(wx, wy, 0, wx, wy, well.radius);
    grdR.addColorStop(0, `rgba(${colorRgb}, 0.08)`);
    grdR.addColorStop(0.6, `rgba(${colorRgb}, 0.03)`);
    grdR.addColorStop(1, `rgba(${colorRgb}, 0)`);
    ctx.beginPath();
    ctx.arc(wx, wy, well.radius, 0, Math.PI * 2);
    ctx.fillStyle = grdR;
    ctx.fill();
  }

  // --- Rotating field lines (4 dashed radial lines) ---
  const rotSpeed = isAttractor ? 0.15 : -0.15;
  const rotAngle = time * rotSpeed;
  ctx.save();
  ctx.setLineDash([3, 8]);
  ctx.strokeStyle = `rgba(${colorRgb}, ${isHovered ? 0.2 : 0.08})`;
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 4; i++) {
    const angle = rotAngle + (Math.PI / 2) * i + Math.PI / 4;
    ctx.beginPath();
    ctx.moveTo(wx + Math.cos(angle) * 14, wy + Math.sin(angle) * 14);
    ctx.lineTo(wx + Math.cos(angle) * well.radius, wy + Math.sin(angle) * well.radius);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();

  // --- Directional concentric rings ---
  // Attractors: rings animate INWARD (converging), Repellers: OUTWARD (expanding)
  const ringCount = Math.ceil(well.strength * 2);
  for (let i = 0; i < ringCount; i++) {
    let t: number;
    if (isAttractor) {
      t = (1 - ((time * 0.5 + i / ringCount) % 1)); // inward
    } else {
      t = ((time * 0.5 + i / ringCount) % 1); // outward
    }
    const radius = well.radius * 0.2 + t * well.radius * 0.8;
    const alpha = (1 - (isAttractor ? 1 - t : t)) * 0.18 * pulse;

    ctx.beginPath();
    ctx.arc(wx, wy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${colorRgb}, ${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // --- Strength tick marks ---
  const tickCount = Math.round(well.strength * 4);
  const tickRingRadius = 18;
  const tickRotation = time * (isAttractor ? 0.3 : -0.3);
  ctx.strokeStyle = `rgba(${colorRgb}, 0.5)`;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  for (let i = 0; i < tickCount; i++) {
    const angle = tickRotation + (Math.PI * 2 * i) / tickCount;
    const x1 = wx + Math.cos(angle) * tickRingRadius;
    const y1 = wy + Math.sin(angle) * tickRingRadius;
    const x2 = wx + Math.cos(angle) * (tickRingRadius + 4);
    const y2 = wy + Math.sin(angle) * (tickRingRadius + 4);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  // --- Main glow ---
  const coreSize = 3 + well.strength * 3;
  const glowRadius = coreSize * 4;
  const grd = ctx.createRadialGradient(wx, wy, 0, wx, wy, glowRadius);
  grd.addColorStop(0, `rgba(${colorRgb}, ${0.6 * pulse})`);
  grd.addColorStop(0.4, `rgba(${colorRgb}, ${0.2 * pulse})`);
  grd.addColorStop(1, `rgba(${colorRgb}, 0)`);
  ctx.beginPath();
  ctx.arc(wx, wy, glowRadius, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();

  // --- Core ---
  ctx.beginPath();
  ctx.arc(wx, wy, coreSize, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = well.strength * 5 + (isHovered ? 8 : 0);
  ctx.fill();
  ctx.shadowBlur = 0;

  // --- Symbol ---
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${12 + well.strength * 2}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isAttractor ? '+' : '\u2212', wx, wy);

  // --- Hover highlight ring ---
  if (isHovered) {
    const highlightPulse = 19 + Math.sin(time * 3) * 2;
    ctx.beginPath();
    ctx.arc(wx, wy, highlightPulse, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(229, 231, 235, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(229, 231, 235, 0.15)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

// ===== WELL TOOLTIP =====

export function renderWellTooltip(
  ctx: CanvasRenderingContext2D,
  well: GravityWell,
  time: number
): void {
  const isAttractor = well.type === 'attractor';
  const colorRgb = isAttractor ? COLORS.cyanRgb : COLORS.violetRgb;
  const color = isAttractor ? COLORS.cyan : COLORS.violet;
  const wx = well.position.x;

  // Position: above the well, flip if too close to top
  const flipBelow = well.position.y < 80;
  const ty = flipBelow ? well.position.y + 40 : well.position.y - 50;

  const panelW = 140;
  const panelH = 44;
  const px = wx - panelW / 2;

  // Background panel
  ctx.fillStyle = 'rgba(10, 10, 20, 0.85)';
  ctx.beginPath();
  roundRectPath(ctx, px, ty, panelW, panelH, 4);
  ctx.fill();
  ctx.strokeStyle = `rgba(${colorRgb}, 0.35)`;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Type label
  ctx.fillStyle = color;
  ctx.font = 'bold 10px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isAttractor ? 'ATTRACTOR' : 'REPELLER', wx, ty + 13);

  // Parameters
  const str = well.strength.toFixed(well.strength % 1 === 0 ? 0 : 1);
  ctx.fillStyle = 'rgba(229, 231, 235, 0.7)';
  ctx.font = '10px system-ui';
  ctx.fillText(`R: ${well.radius}  S: ${str}`, wx, ty + 27);

  // Hint for adjustment
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.font = '8px system-ui';
  ctx.fillText('scroll: radius  |  shift+scroll: strength', wx, ty + 39);
}

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

// ===== GHOST WELL (HINT) =====

export function renderGhostWell(
  ctx: CanvasRenderingContext2D,
  well: GravityWell,
  time: number
): void {
  const isAttractor = well.type === 'attractor';
  const colorRgb = isAttractor ? COLORS.cyanRgb : COLORS.violetRgb;
  const wx = well.position.x;
  const wy = well.position.y;
  const shimmer = 0.6 + 0.4 * Math.sin(time * 2.0);

  // --- Dashed radius boundary ---
  ctx.save();
  ctx.globalAlpha = shimmer;
  ctx.setLineDash([2, 6]);
  ctx.beginPath();
  ctx.arc(wx, wy, well.radius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${colorRgb}, 0.08)`;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.setLineDash([]);

  // --- Ghost pulse rings (2 only, dashed) ---
  ctx.setLineDash([4, 8]);
  for (let i = 0; i < 2; i++) {
    const radius = 14 + i * 14;
    ctx.beginPath();
    ctx.arc(wx, wy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${colorRgb}, 0.1)`;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // --- Core: hollow dashed circle ---
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  ctx.arc(wx, wy, 6, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${colorRgb}, 0.3)`;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.setLineDash([]);

  // --- Directional chevrons (inward for attractor, outward for repeller) ---
  const chevronDist = 14;
  const chevronLen = 4;
  ctx.strokeStyle = `rgba(255, 255, 255, 0.2)`;
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI / 2) * i;
    const cx = wx + Math.cos(angle) * chevronDist;
    const cy = wy + Math.sin(angle) * chevronDist;
    const dir = isAttractor ? -1 : 1; // inward vs outward
    const tipX = cx + Math.cos(angle) * chevronLen * dir;
    const tipY = cy + Math.sin(angle) * chevronLen * dir;
    const perpX = Math.cos(angle + Math.PI / 2) * 3;
    const perpY = Math.sin(angle + Math.PI / 2) * 3;

    ctx.beginPath();
    ctx.moveTo(tipX + perpX, tipY + perpY);
    ctx.lineTo(cx, cy);
    ctx.lineTo(tipX - perpX, tipY - perpY);
    ctx.stroke();
  }

  // --- Label ---
  ctx.fillStyle = `rgba(${colorRgb}, 0.4)`;
  ctx.font = '9px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isAttractor ? 'PULL' : 'PUSH', wx, wy + 22);

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ===== TRAJECTORY LINE =====

export function renderTrajectoryLine(
  ctx: CanvasRenderingContext2D,
  points: Vec2[],
  time: number,
  reachesTarget: boolean
): void {
  if (points.length < 2) return;

  const color = reachesTarget ? COLORS.greenRgb : COLORS.amberRgb;

  ctx.save();
  ctx.setLineDash([8, 6]);
  ctx.lineDashOffset = -time * 40;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 3) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);

  ctx.strokeStyle = `rgba(${color}, 0.7)`;
  ctx.shadowColor = `rgba(${color}, 0.5)`;
  ctx.shadowBlur = 6;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ===== TARGET =====

export function renderTarget(
  ctx: CanvasRenderingContext2D,
  target: LevelTarget,
  time: number
): void {
  const pulse = 0.6 + Math.sin(time * 2.5) * 0.4;

  const grd = ctx.createRadialGradient(
    target.x, target.y, 0, target.x, target.y, target.radius * 2.5
  );
  grd.addColorStop(0, `rgba(${COLORS.greenRgb}, ${0.15 * pulse})`);
  grd.addColorStop(0.5, `rgba(${COLORS.greenRgb}, ${0.05 * pulse})`);
  grd.addColorStop(1, `rgba(${COLORS.greenRgb}, 0)`);
  ctx.fillStyle = grd;
  ctx.fillRect(
    target.x - target.radius * 2.5, target.y - target.radius * 2.5,
    target.radius * 5, target.radius * 5
  );

  for (let i = 0; i < 2; i++) {
    const t = ((time * 0.8 + i * 0.5) % 1);
    const radius = target.radius * (0.5 + t * 0.8);
    const alpha = (1 - t) * 0.3 * pulse;
    ctx.beginPath();
    ctx.arc(target.x, target.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${COLORS.greenRgb}, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${COLORS.greenRgb}, ${0.6 * pulse})`;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(target.x, target.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.green;
  ctx.shadowColor = COLORS.green;
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;
}

// ===== OBSTACLE =====

export function renderObstacle(
  ctx: CanvasRenderingContext2D,
  obs: Obstacle,
  time: number
): void {
  const pulse = 0.7 + Math.sin(time * 1.5) * 0.15;

  if (obs.kind === 'rect') {
    ctx.shadowColor = COLORS.red;
    ctx.shadowBlur = 8;
    ctx.fillStyle = `rgba(${COLORS.redRgb}, ${0.5 * pulse})`;
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(${COLORS.redRgb}, ${0.7 * pulse})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
  } else {
    ctx.beginPath();
    ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${COLORS.redRgb}, ${0.35 * pulse})`;
    ctx.shadowColor = COLORS.red;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${COLORS.redRgb}, ${0.6 * pulse})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

// ===== STARS =====

export function renderStars(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  count: number, maxCount: number,
  size: number, animated: boolean,
  time: number, revealProgress: number = 1
): void {
  const spacing = size * 2.2;
  const startX = x - ((maxCount - 1) * spacing) / 2;

  for (let i = 0; i < maxCount; i++) {
    const filled = i < count;
    const sx = startX + i * spacing;
    const revealDelay = i * 0.3;
    const localProgress = Math.max(0, Math.min(1, (revealProgress - revealDelay) / 0.4));

    if (animated && localProgress < 1) {
      drawStar(ctx, sx, y, size * localProgress, filled, time);
    } else {
      drawStar(ctx, sx, y, size, filled, time);
    }
  }
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, size: number, filled: boolean, time: number
): void {
  if (size <= 0) return;
  const spikes = 5;
  const outerRadius = size;
  const innerRadius = size * 0.4;

  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI * i) / spikes - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  if (filled) {
    const glow = 0.8 + Math.sin(time * 2 + cx * 0.1) * 0.2;
    ctx.fillStyle = `rgba(${COLORS.amberRgb}, ${glow})`;
    ctx.shadowColor = COLORS.amber;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  } else {
    ctx.strokeStyle = `rgba(${COLORS.amberRgb}, 0.25)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}
