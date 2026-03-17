export interface Vec2 {
  x: number;
  y: number;
}

export type WellType = 'attractor' | 'repeller';

export interface GravityWell {
  position: Vec2;
  type: WellType;
  strength: number;
  radius: number;
}

export interface Particle {
  position: Vec2;
  velocity: Vec2;
  alive: boolean;
  trail: TrailPoint[];
  launched: boolean;
}

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  age: number;
}

export interface ObstacleRect {
  kind: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ObstacleCircle {
  kind: 'circle';
  x: number;
  y: number;
  radius: number;
}

export type Obstacle = ObstacleRect | ObstacleCircle;

export interface LevelTarget {
  x: number;
  y: number;
  radius: number;
}

export interface LevelDefinition {
  id: number;
  name: string;
  start: Vec2;
  launchAngle: number;
  launchSpeed: number;
  target: LevelTarget;
  obstacles: Obstacle[];
  par: number;
  maxWells: number;
  decorations?: Decoration[];
  solution?: GravityWell[];
}

export interface Decoration {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
}

export type GameScreen = 'title' | 'tutorial' | 'levelSelect' | 'playing' | 'victory' | 'fail';

export interface LevelProgress {
  unlocked: boolean;
  stars: number;
  completed: boolean;
}

export interface SaveData {
  levels: Record<number, LevelProgress>;
}

export interface Button {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  onClick: () => void;
  hovered: boolean;
  color?: string;
  fontSize?: number;
}

export interface FloatingParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
}

export interface ExplosionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
}

export const COLORS = {
  background: '#0A0A14',
  backgroundRgb: '10, 10, 20',
  cyan: '#06B6D4',
  cyanRgb: '6, 182, 212',
  violet: '#8B5CF6',
  violetRgb: '139, 92, 246',
  amber: '#F59E0B',
  amberRgb: '245, 158, 11',
  green: '#10B981',
  greenRgb: '16, 185, 129',
  red: '#991B1B',
  redRgb: '153, 27, 27',
  white: '#FFFFFF',
  textDim: '#6B7280',
  textBright: '#E5E7EB',
  grid: 'rgba(255, 255, 255, 0.03)',
} as const;

export const GAME_WIDTH = 1200;
export const GAME_HEIGHT = 800;
