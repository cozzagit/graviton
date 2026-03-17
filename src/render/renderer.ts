import {
  GravityWell,
  Particle,
  Vec2,
  LevelDefinition,
} from '../engine/types';
import { renderParticle, renderStartPoint } from '../engine/particle';
import { renderBackground } from './background';
import {
  renderGravityWell,
  renderGhostWell,
  renderTrajectoryLine,
  renderTarget,
  renderObstacle,
  renderExplosions,
  renderWellTooltip,
} from './effects';

export function renderPlayingState(
  ctx: CanvasRenderingContext2D,
  level: LevelDefinition,
  wells: GravityWell[],
  particle: Particle,
  time: number,
  hoveredWellIdx: number = -1,
  hintWells?: GravityWell[],
  hintTrajectory?: Vec2[],
  hintReachesTarget?: boolean
): void {
  renderBackground(ctx, time);

  // Obstacles
  for (const obs of level.obstacles) {
    renderObstacle(ctx, obs, time);
  }

  // Target
  renderTarget(ctx, level.target, time);

  // Hint trajectory (behind everything)
  if (hintTrajectory && hintTrajectory.length > 0) {
    renderTrajectoryLine(ctx, hintTrajectory, time, hintReachesTarget ?? false);
  }

  // Ghost wells (hint)
  if (hintWells) {
    for (const well of hintWells) {
      renderGhostWell(ctx, well, time);
    }
  }

  // Start point (only if not launched)
  if (!particle.launched) {
    renderStartPoint(ctx, level.start.x, level.start.y, level.launchAngle, time);
  }

  // Gravity wells
  for (let i = 0; i < wells.length; i++) {
    renderGravityWell(ctx, wells[i], time, i === hoveredWellIdx);
  }

  // Tooltip for hovered well (on top of wells)
  if (hoveredWellIdx >= 0 && hoveredWellIdx < wells.length) {
    renderWellTooltip(ctx, wells[hoveredWellIdx], time);
  }

  // Particle
  renderParticle(ctx, particle);

  // Explosions on top
  renderExplosions(ctx);
}
