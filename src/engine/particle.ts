import { Particle, COLORS } from './types';

export function renderParticle(
  ctx: CanvasRenderingContext2D,
  particle: Particle
): void {
  if (!particle.alive) return;

  // Render trail
  if (particle.trail.length > 1) {
    for (let i = 1; i < particle.trail.length; i++) {
      const prev = particle.trail[i - 1];
      const curr = particle.trail[i];
      const alpha = curr.alpha * 0.7;

      if (alpha <= 0.01) continue;

      const width = 2 + alpha * 4;

      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.strokeStyle = `rgba(${COLORS.amberRgb}, ${alpha})`;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Outer glow trail
    for (let i = 1; i < particle.trail.length; i++) {
      const prev = particle.trail[i - 1];
      const curr = particle.trail[i];
      const alpha = curr.alpha * 0.2;

      if (alpha <= 0.01) continue;

      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.strokeStyle = `rgba(${COLORS.amberRgb}, ${alpha})`;
      ctx.lineWidth = 10 + alpha * 8;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  if (!particle.launched) return;

  // Draw main particle glow
  const grd = ctx.createRadialGradient(
    particle.position.x,
    particle.position.y,
    0,
    particle.position.x,
    particle.position.y,
    20
  );
  grd.addColorStop(0, `rgba(255, 255, 255, 0.9)`);
  grd.addColorStop(0.2, `rgba(${COLORS.amberRgb}, 0.8)`);
  grd.addColorStop(0.6, `rgba(${COLORS.amberRgb}, 0.2)`);
  grd.addColorStop(1, `rgba(${COLORS.amberRgb}, 0)`);

  ctx.beginPath();
  ctx.arc(particle.position.x, particle.position.y, 20, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();

  // Core
  ctx.beginPath();
  ctx.arc(particle.position.x, particle.position.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = COLORS.amber;
  ctx.shadowBlur = 15;
  ctx.fill();
  ctx.shadowBlur = 0;
}

export function renderStartPoint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  time: number
): void {
  // Pulsing circle at start
  const pulse = 0.7 + Math.sin(time * 3) * 0.3;

  // Outer ring
  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${COLORS.amberRgb}, ${0.4 * pulse})`;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner circle
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${COLORS.amberRgb}, ${0.8 * pulse})`;
  ctx.shadowColor = COLORS.amber;
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Direction arrow
  const arrowLen = 30;
  const endX = x + Math.cos(angle) * arrowLen;
  const endY = y + Math.sin(angle) * arrowLen;

  ctx.beginPath();
  ctx.moveTo(x + Math.cos(angle) * 16, y + Math.sin(angle) * 16);
  ctx.lineTo(endX, endY);
  ctx.strokeStyle = `rgba(${COLORS.amberRgb}, ${0.5 * pulse})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Arrowhead
  const headLen = 8;
  const headAngle = 0.5;
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - Math.cos(angle - headAngle) * headLen,
    endY - Math.sin(angle - headAngle) * headLen
  );
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - Math.cos(angle + headAngle) * headLen,
    endY - Math.sin(angle + headAngle) * headLen
  );
  ctx.strokeStyle = `rgba(${COLORS.amberRgb}, ${0.5 * pulse})`;
  ctx.lineWidth = 2;
  ctx.stroke();
}
