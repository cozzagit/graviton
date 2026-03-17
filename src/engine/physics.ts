import {
  Vec2,
  GravityWell,
  Particle,
  Obstacle,
  LevelTarget,
  GAME_WIDTH,
  GAME_HEIGHT,
} from './types';

const GRAVITY_CONSTANT = 200000;
const MAX_TRAIL_LENGTH = 120;
const TRAIL_FADE_RATE = 0.012;
const MAX_SPEED = 600;
const BOUNCE_DAMPING = 0.4;

export function createParticle(position: Vec2): Particle {
  return {
    position: { x: position.x, y: position.y },
    velocity: { x: 0, y: 0 },
    alive: true,
    trail: [],
    launched: false,
  };
}

export function launchParticle(
  particle: Particle,
  angle: number,
  speed: number
): void {
  particle.velocity.x = Math.cos(angle) * speed;
  particle.velocity.y = Math.sin(angle) * speed;
  particle.launched = true;
}

export function updateParticle(
  particle: Particle,
  wells: GravityWell[],
  dt: number
): void {
  if (!particle.alive || !particle.launched) return;

  // Apply gravity from all wells
  for (const well of wells) {
    const dx = well.position.x - particle.position.x;
    const dy = well.position.y - particle.position.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);

    if (dist < 8) continue; // Prevent singularity

    const force =
      (GRAVITY_CONSTANT * well.strength) / Math.max(distSq, 400);
    const direction = well.type === 'attractor' ? 1 : -1;

    particle.velocity.x += (direction * force * dx) / dist * dt;
    particle.velocity.y += (direction * force * dy) / dist * dt;
  }

  // Clamp speed
  const speed = Math.sqrt(
    particle.velocity.x * particle.velocity.x +
      particle.velocity.y * particle.velocity.y
  );
  if (speed > MAX_SPEED) {
    const scale = MAX_SPEED / speed;
    particle.velocity.x *= scale;
    particle.velocity.y *= scale;
  }

  // Update position
  particle.position.x += particle.velocity.x * dt;
  particle.position.y += particle.velocity.y * dt;

  // Add trail point
  particle.trail.push({
    x: particle.position.x,
    y: particle.position.y,
    alpha: 1,
    age: 0,
  });

  // Fade and trim trail
  for (let i = particle.trail.length - 1; i >= 0; i--) {
    particle.trail[i].age += dt;
    particle.trail[i].alpha -= TRAIL_FADE_RATE;
    if (particle.trail[i].alpha <= 0) {
      particle.trail.splice(i, 1);
    }
  }

  if (particle.trail.length > MAX_TRAIL_LENGTH) {
    particle.trail.splice(0, particle.trail.length - MAX_TRAIL_LENGTH);
  }
}

export function checkOutOfBounds(particle: Particle, margin: number = 80): boolean {
  const p = particle.position;
  return (
    p.x < -margin ||
    p.x > GAME_WIDTH + margin ||
    p.y < -margin ||
    p.y > GAME_HEIGHT + margin
  );
}

export function checkObstacleCollision(
  particle: Particle,
  obstacles: Obstacle[]
): boolean {
  const px = particle.position.x;
  const py = particle.position.y;
  const pr = 4; // particle radius

  for (const obs of obstacles) {
    if (obs.kind === 'rect') {
      if (
        px + pr > obs.x &&
        px - pr < obs.x + obs.width &&
        py + pr > obs.y &&
        py - pr < obs.y + obs.height
      ) {
        return true;
      }
    } else {
      const dx = px - obs.x;
      const dy = py - obs.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < obs.radius + pr) {
        return true;
      }
    }
  }
  return false;
}

export function checkTargetReached(
  particle: Particle,
  target: LevelTarget
): boolean {
  const dx = particle.position.x - target.x;
  const dy = particle.position.y - target.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < target.radius + 4;
}

export function distanceBetween(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function simulateTrajectory(
  start: Vec2,
  launchAngle: number,
  launchSpeed: number,
  wells: GravityWell[],
  obstacles: Obstacle[],
  target: LevelTarget
): Vec2[] {
  const points: Vec2[] = [];
  const dt = 1 / 60;
  const pos = { x: start.x, y: start.y };
  const vel = {
    x: Math.cos(launchAngle) * launchSpeed,
    y: Math.sin(launchAngle) * launchSpeed,
  };

  for (let i = 0; i < 2000; i++) {
    points.push({ x: pos.x, y: pos.y });

    for (const well of wells) {
      const dx = well.position.x - pos.x;
      const dy = well.position.y - pos.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);
      if (dist < 8) continue;
      const force = (GRAVITY_CONSTANT * well.strength) / Math.max(distSq, 400);
      const direction = well.type === 'attractor' ? 1 : -1;
      vel.x += (direction * force * dx) / dist * dt;
      vel.y += (direction * force * dy) / dist * dt;
    }

    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
    if (speed > MAX_SPEED) {
      const scale = MAX_SPEED / speed;
      vel.x *= scale;
      vel.y *= scale;
    }

    pos.x += vel.x * dt;
    pos.y += vel.y * dt;

    // Target reached
    const dx = pos.x - target.x;
    const dy = pos.y - target.y;
    if (Math.sqrt(dx * dx + dy * dy) < target.radius + 4) {
      points.push({ x: pos.x, y: pos.y });
      break;
    }

    // Out of bounds
    if (pos.x < -80 || pos.x > GAME_WIDTH + 80 || pos.y < -80 || pos.y > GAME_HEIGHT + 80) break;

    // Obstacle hit
    let hit = false;
    for (const obs of obstacles) {
      if (obs.kind === 'rect') {
        if (pos.x + 4 > obs.x && pos.x - 4 < obs.x + obs.width &&
            pos.y + 4 > obs.y && pos.y - 4 < obs.y + obs.height) {
          hit = true; break;
        }
      } else {
        const odx = pos.x - obs.x;
        const ody = pos.y - obs.y;
        if (Math.sqrt(odx * odx + ody * ody) < obs.radius + 4) {
          hit = true; break;
        }
      }
    }
    if (hit) break;
  }

  return points;
}
