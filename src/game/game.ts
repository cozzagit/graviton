import {
  GameScreen,
  GravityWell,
  Particle,
  LevelDefinition,
  Button,
  SaveData,
  Vec2,
  COLORS,
  GAME_WIDTH,
  GAME_HEIGHT,
} from '../engine/types';
import {
  createParticle,
  launchParticle,
  updateParticle,
  checkOutOfBounds,
  checkObstacleCollision,
  checkTargetReached,
  distanceBetween,
  simulateTrajectory,
} from '../engine/physics';
import { LEVELS } from './levels';
import {
  calculateStars,
  loadProgress,
  completeLevelAndSave,
} from './scoring';
import {
  renderPlayingState,
} from '../render/renderer';
import {
  initBackground,
  updateBackground,
} from '../render/background';
import {
  spawnExplosion,
  updateExplosions,
  clearExplosions,
} from '../render/effects';
import {
  renderTitleScreen,
  renderLevelSelect,
  renderHUD,
  renderVictoryOverlay,
  renderFailOverlay,
  createLevelSelectButtons,
  LevelSelectButton,
} from '../ui/screens';
import { createButton, isPointInButton } from '../ui/buttons';
import { renderTutorial, TUTORIAL_PAGE_COUNT } from '../ui/tutorial';
import {
  playLaunch,
  playPlace,
  playToggle,
  playVictory,
  playFail,
  playClick,
  playRemove,
} from '../audio/synth';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private screen: GameScreen = 'title';
  private time: number = 0;
  private lastTime: number = 0;

  // Game state
  private currentLevel: LevelDefinition = LEVELS[0];
  private wells: GravityWell[] = [];
  private particle: Particle = createParticle({ x: 0, y: 0 });
  private saveData: SaveData;

  // Victory / Fail
  private resultStars: number = 0;
  private overlayProgress: number = 0;

  // Coordinate scaling
  private scaleX: number = 1;
  private scaleY: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private displayScale: number = 1;

  // UI elements
  private titlePlayButton: Button;
  private titleHowToPlayButton: Button;
  private levelSelectButtons: LevelSelectButton[] = [];
  private levelSelectBackButton: Button;
  private hudButtons: Button[] = [];
  private victoryButtons: Button[] = [];
  private failButtons: Button[] = [];

  // Hint mode
  private hintActive: boolean = false;
  private hintTrajectory: Vec2[] = [];
  private hintReachesTarget: boolean = false;

  // Well interaction
  private hoveredWellIdx: number = -1;

  // Tutorial
  private tutorialPage: number = 0;
  private tutorialButtons: Button[] = [];

  // Mouse
  private mouseX: number = 0;
  private mouseY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;

    this.saveData = loadProgress();
    initBackground();

    // Create persistent UI
    this.titlePlayButton = createButton(
      GAME_WIDTH / 2 - 80,
      GAME_HEIGHT * 0.50,
      160,
      48,
      'PLAY',
      () => this.goToLevelSelect(),
      COLORS.cyan,
      20
    );

    this.titleHowToPlayButton = createButton(
      GAME_WIDTH / 2 - 80,
      GAME_HEIGHT * 0.60,
      160,
      38,
      'How to Play',
      () => this.goToTutorial(),
      COLORS.violet,
      16
    );

    this.levelSelectButtons = createLevelSelectButtons();
    this.levelSelectBackButton = createButton(
      20,
      GAME_HEIGHT - 60,
      100,
      36,
      'Back',
      () => this.goToTitle(),
    );

    this.setupInput();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const windowW = window.innerWidth;
    const windowH = window.innerHeight;

    const gameAspect = GAME_WIDTH / GAME_HEIGHT;
    const windowAspect = windowW / windowH;

    let drawW: number;
    let drawH: number;

    if (windowAspect > gameAspect) {
      drawH = windowH;
      drawW = drawH * gameAspect;
    } else {
      drawW = windowW;
      drawH = drawW / gameAspect;
    }

    this.canvas.width = drawW * dpr;
    this.canvas.height = drawH * dpr;
    this.canvas.style.width = `${drawW}px`;
    this.canvas.style.height = `${drawH}px`;
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = `${(windowW - drawW) / 2}px`;
    this.canvas.style.top = `${(windowH - drawH) / 2}px`;

    this.displayScale = drawW / GAME_WIDTH;
    this.offsetX = (windowW - drawW) / 2;
    this.offsetY = (windowH - drawH) / 2;
    this.scaleX = (drawW * dpr) / GAME_WIDTH;
    this.scaleY = (drawH * dpr) / GAME_HEIGHT;
  }

  private screenToGame(clientX: number, clientY: number): Vec2 {
    return {
      x: (clientX - this.offsetX) / this.displayScale,
      y: (clientY - this.offsetY) / this.displayScale,
    };
  }

  private setupInput(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const pos = this.screenToGame(e.clientX, e.clientY);
      this.mouseX = pos.x;
      this.mouseY = pos.y;
      this.updateHovers();
    });

    this.canvas.addEventListener('click', (e) => {
      const pos = this.screenToGame(e.clientX, e.clientY);
      this.handleClick(pos.x, pos.y);
    });

    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const pos = this.screenToGame(e.clientX, e.clientY);
      this.handleRightClick(pos.x, pos.y);
    });

    // Middle-click to delete a well
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        const pos = this.screenToGame(e.clientX, e.clientY);
        this.handleMiddleClick(pos.x, pos.y);
      }
    });

    // Scroll wheel to adjust well radius / strength
    this.canvas.addEventListener('wheel', (e) => {
      if (this.screen === 'playing' && !this.particle.launched) {
        e.preventDefault();
        this.handleWheel(e.deltaY, e.shiftKey);
      }
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.handleSpace();
      }
      if (e.code === 'Escape') {
        if (this.screen === 'playing' || this.screen === 'victory' || this.screen === 'fail') {
          this.goToLevelSelect();
        } else if (this.screen === 'levelSelect' || this.screen === 'tutorial') {
          this.goToTitle();
        }
      }
      if (e.code === 'KeyR' && this.screen === 'playing') {
        this.resetLevel();
      }
      if (e.code === 'KeyH' && this.screen === 'playing' && !this.particle.launched) {
        this.toggleHint();
      }
      // Delete key removes hovered well
      if ((e.code === 'Delete' || e.code === 'Backspace') && this.screen === 'playing' && !this.particle.launched) {
        if (this.hoveredWellIdx >= 0) {
          this.wells.splice(this.hoveredWellIdx, 1);
          this.hoveredWellIdx = -1;
          playRemove();
        }
      }
    });
  }

  private updateHovers(): void {
    const mx = this.mouseX;
    const my = this.mouseY;

    if (this.screen === 'title') {
      this.titlePlayButton.hovered = isPointInButton(this.titlePlayButton, mx, my);
      this.titleHowToPlayButton.hovered = isPointInButton(this.titleHowToPlayButton, mx, my);
    }

    if (this.screen === 'tutorial') {
      for (const btn of this.tutorialButtons) {
        btn.hovered = isPointInButton(btn, mx, my);
      }
    }

    if (this.screen === 'levelSelect') {
      for (const btn of this.levelSelectButtons) {
        btn.hovered =
          mx >= btn.x &&
          mx <= btn.x + btn.size &&
          my >= btn.y &&
          my <= btn.y + btn.size;
      }
      this.levelSelectBackButton.hovered = isPointInButton(this.levelSelectBackButton, mx, my);
    }

    if (this.screen === 'playing') {
      for (const btn of this.hudButtons) {
        btn.hovered = isPointInButton(btn, mx, my);
      }
      // Track hovered well
      this.hoveredWellIdx = -1;
      if (!this.particle.launched) {
        for (let i = 0; i < this.wells.length; i++) {
          const dist = distanceBetween({ x: mx, y: my }, this.wells[i].position);
          if (dist < 30) {
            this.hoveredWellIdx = i;
            break;
          }
        }
      }
    }

    if (this.screen === 'victory') {
      for (const btn of this.victoryButtons) {
        btn.hovered = isPointInButton(btn, mx, my);
      }
    }

    if (this.screen === 'fail') {
      for (const btn of this.failButtons) {
        btn.hovered = isPointInButton(btn, mx, my);
      }
    }
  }

  private handleClick(x: number, y: number): void {
    if (this.screen === 'title') {
      if (isPointInButton(this.titlePlayButton, x, y)) {
        playClick();
        this.titlePlayButton.onClick();
        return;
      }
      if (isPointInButton(this.titleHowToPlayButton, x, y)) {
        playClick();
        this.titleHowToPlayButton.onClick();
        return;
      }
    }

    if (this.screen === 'tutorial') {
      for (const btn of this.tutorialButtons) {
        if (isPointInButton(btn, x, y)) {
          playClick();
          btn.onClick();
          return;
        }
      }
    }

    if (this.screen === 'levelSelect') {
      if (isPointInButton(this.levelSelectBackButton, x, y)) {
        playClick();
        this.levelSelectBackButton.onClick();
        return;
      }
      for (const btn of this.levelSelectButtons) {
        if (
          x >= btn.x &&
          x <= btn.x + btn.size &&
          y >= btn.y &&
          y <= btn.y + btn.size
        ) {
          const progress = this.saveData.levels[btn.id];
          if (progress?.unlocked) {
            playClick();
            this.startLevel(btn.id);
          }
          return;
        }
      }
    }

    if (this.screen === 'playing') {
      // Check HUD buttons
      for (const btn of this.hudButtons) {
        if (isPointInButton(btn, x, y)) {
          playClick();
          btn.onClick();
          return;
        }
      }

      // Place gravity well (only if not clicking on an existing well)
      if (!this.particle.launched && y > 50) {
        // Check if clicking near existing well first
        for (const well of this.wells) {
          if (distanceBetween({ x, y }, well.position) < 20) {
            return; // Clicked on existing well, don't place new one
          }
        }

        if (this.wells.length < this.currentLevel.maxWells) {
          const distToStart = distanceBetween({ x, y }, this.currentLevel.start);
          const distToTarget = distanceBetween({ x, y }, {
            x: this.currentLevel.target.x,
            y: this.currentLevel.target.y,
          });

          if (distToStart > 25 && distToTarget > 25) {
            this.wells.push({
              position: { x, y },
              type: 'attractor',
              strength: 1,
              radius: 80,
            });
            playPlace();
          }
        }
      }
    }

    if (this.screen === 'victory') {
      for (const btn of this.victoryButtons) {
        if (isPointInButton(btn, x, y)) {
          playClick();
          btn.onClick();
          return;
        }
      }
    }

    if (this.screen === 'fail') {
      for (const btn of this.failButtons) {
        if (isPointInButton(btn, x, y)) {
          playClick();
          btn.onClick();
          return;
        }
      }
    }
  }

  private handleRightClick(x: number, y: number): void {
    if (this.screen === 'playing' && !this.particle.launched) {
      let closestIdx = -1;
      let closestDist = Infinity;

      for (let i = 0; i < this.wells.length; i++) {
        const dist = distanceBetween({ x, y }, this.wells[i].position);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
        }
      }

      if (closestIdx >= 0 && closestDist < 30) {
        // Toggle type
        this.wells[closestIdx].type =
          this.wells[closestIdx].type === 'attractor' ? 'repeller' : 'attractor';
        playToggle();
      }
    }
  }

  private handleMiddleClick(x: number, y: number): void {
    if (this.screen === 'playing' && !this.particle.launched) {
      for (let i = 0; i < this.wells.length; i++) {
        const dist = distanceBetween({ x, y }, this.wells[i].position);
        if (dist < 30) {
          this.wells.splice(i, 1);
          this.hoveredWellIdx = -1;
          playRemove();
          return;
        }
      }
    }
  }

  private handleWheel(deltaY: number, shiftKey: boolean): void {
    if (this.hoveredWellIdx < 0) return;
    const well = this.wells[this.hoveredWellIdx];
    const direction = deltaY < 0 ? 1 : -1;

    if (shiftKey) {
      // Adjust strength: 0.5 to 3.0, step 0.25
      well.strength = Math.max(0.5, Math.min(3.0, well.strength + direction * 0.25));
    } else {
      // Adjust radius: 40 to 160, step 10
      well.radius = Math.max(40, Math.min(160, well.radius + direction * 10));
    }
  }

  private handleSpace(): void {
    if (this.screen === 'playing' && !this.particle.launched) {
      this.hintActive = false;
      this.hintTrajectory = [];
      this.particle.launched = true;
      launchParticle(
        this.particle,
        this.currentLevel.launchAngle,
        this.currentLevel.launchSpeed
      );
      playLaunch();
    }
  }

  // ----- NAVIGATION -----

  private goToTitle(): void {
    this.screen = 'title';
  }

  private goToTutorial(): void {
    this.tutorialPage = 0;
    this.screen = 'tutorial';
    this.buildTutorialButtons();
  }

  private buildTutorialButtons(): void {
    const isFirst = this.tutorialPage === 0;
    const isLast = this.tutorialPage === TUTORIAL_PAGE_COUNT - 1;

    this.tutorialButtons = [];

    // Back button (always)
    this.tutorialButtons.push(
      createButton(20, GAME_HEIGHT - 55, 80, 34, 'Back', () => {
        if (isFirst) {
          this.goToTitle();
        } else {
          this.tutorialPage--;
          this.buildTutorialButtons();
        }
      })
    );

    // Next / Play button
    if (isLast) {
      this.tutorialButtons.push(
        createButton(GAME_WIDTH - 120, GAME_HEIGHT - 55, 100, 34, 'Play \u2192', () => this.goToLevelSelect(), COLORS.green)
      );
    } else {
      this.tutorialButtons.push(
        createButton(GAME_WIDTH - 100, GAME_HEIGHT - 55, 80, 34, 'Next \u2192', () => {
          this.tutorialPage++;
          this.buildTutorialButtons();
        }, COLORS.cyan)
      );
    }
  }

  private goToLevelSelect(): void {
    this.screen = 'levelSelect';
    this.saveData = loadProgress();
  }

  private startLevel(levelId: number): void {
    const level = LEVELS[levelId - 1];
    if (!level) return;

    this.currentLevel = level;
    this.wells = [];
    this.particle = createParticle(level.start);
    this.screen = 'playing';
    this.overlayProgress = 0;
    this.hintActive = false;
    this.hintTrajectory = [];
    this.hoveredWellIdx = -1;
    clearExplosions();

    const hasHint = level.solution && level.solution.length > 0;
    this.hudButtons = [
      ...(hasHint ? [
        createButton(GAME_WIDTH - 420, 8, 70, 34, 'Hint', () => this.toggleHint(), COLORS.violet),
        createButton(GAME_WIDTH - 340, 8, 80, 34, 'Apply', () => this.applyHint(), COLORS.green),
      ] : []),
      createButton(GAME_WIDTH - 220, 8, 90, 34, 'Reset (R)', () => this.resetLevel()),
      createButton(GAME_WIDTH - 120, 8, 100, 34, 'Launch ⎵', () => this.handleSpace(), COLORS.amber),
    ];
  }

  private resetLevel(): void {
    this.wells = [];
    this.particle = createParticle(this.currentLevel.start);
    this.overlayProgress = 0;
    this.screen = 'playing';
    this.hintActive = false;
    this.hintTrajectory = [];
    this.hoveredWellIdx = -1;
    clearExplosions();
  }

  private toggleHint(): void {
    this.hintActive = !this.hintActive;
    if (this.hintActive) {
      this.computeHintTrajectory();
    } else {
      this.hintTrajectory = [];
    }
  }

  private computeHintTrajectory(): void {
    const solution = this.currentLevel.solution;
    if (!solution || solution.length === 0) {
      this.hintTrajectory = [];
      this.hintReachesTarget = false;
      return;
    }

    const target = this.currentLevel.target;
    let bestPoints: Vec2[] = [];
    let bestDist = Infinity;

    // With GRAVITY_CONSTANT=40000, real strength wells have meaningful effect.
    // Try small boosts to find best trajectory match.
    const boosts = [1, 1.5, 2, 3, 5, 8];
    for (const boost of boosts) {
      const boostedWells = solution.map(w => ({
        ...w,
        strength: w.strength * boost,
      }));
      const points = simulateTrajectory(
        this.currentLevel.start,
        this.currentLevel.launchAngle,
        this.currentLevel.launchSpeed,
        boostedWells,
        this.currentLevel.obstacles,
        this.currentLevel.target
      );
      if (points.length > 0) {
        const last = points[points.length - 1];
        const dx = last.x - target.x;
        const dy = last.y - target.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bestDist) {
          bestDist = dist;
          bestPoints = points;
        }
        if (dist < target.radius + 4) break;
      }
    }

    this.hintTrajectory = bestPoints;
    this.hintReachesTarget = bestDist < target.radius + 10;
  }

  private applyHint(): void {
    const solution = this.currentLevel.solution;
    if (!solution || solution.length === 0) return;

    // Replace current wells with the solution wells
    this.wells = solution.map(w => ({
      position: { x: w.position.x, y: w.position.y },
      type: w.type,
      strength: w.strength,
      radius: w.radius,
    }));
    this.hintActive = false;
    this.hintTrajectory = [];
    playPlace();
  }

  private onVictory(): void {
    this.screen = 'victory';
    this.overlayProgress = 0;
    this.resultStars = calculateStars(this.wells.length, this.currentLevel.par);
    this.saveData = completeLevelAndSave(
      this.saveData,
      this.currentLevel.id,
      this.resultStars
    );

    spawnExplosion(this.currentLevel.target.x, this.currentLevel.target.y, 40, COLORS.green, 250);
    spawnExplosion(this.currentLevel.target.x, this.currentLevel.target.y, 20, COLORS.amber, 150);
    playVictory();

    const hasNext = this.currentLevel.id < 20;
    this.victoryButtons = [
      createButton(GAME_WIDTH / 2 - 170, GAME_HEIGHT * 0.6, 140, 42, 'Retry', () => this.startLevel(this.currentLevel.id)),
      createButton(GAME_WIDTH / 2 - 10, GAME_HEIGHT * 0.6, 140, 42, 'Levels', () => this.goToLevelSelect()),
    ];

    if (hasNext) {
      this.victoryButtons.push(
        createButton(GAME_WIDTH / 2 + 150, GAME_HEIGHT * 0.6, 140, 42, 'Next \u2192', () => this.startLevel(this.currentLevel.id + 1), COLORS.green)
      );
      this.victoryButtons[0].x = GAME_WIDTH / 2 - 230;
      this.victoryButtons[1].x = GAME_WIDTH / 2 - 70;
      this.victoryButtons[2].x = GAME_WIDTH / 2 + 90;
    }
  }

  private onFail(): void {
    this.screen = 'fail';
    this.overlayProgress = 0;

    spawnExplosion(this.particle.position.x, this.particle.position.y, 25, `rgba(${COLORS.redRgb}, 0.8)`, 180);
    playFail();

    this.failButtons = [
      createButton(GAME_WIDTH / 2 - 150, GAME_HEIGHT * 0.55, 130, 42, 'Retry', () => this.resetLevel(), COLORS.amber),
      createButton(GAME_WIDTH / 2 + 20, GAME_HEIGHT * 0.55, 130, 42, 'Levels', () => this.goToLevelSelect()),
    ];
  }

  // ----- GAME LOOP -----

  start(): void {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private loop = (timestamp: number): void => {
    const rawDt = (timestamp - this.lastTime) / 1000;
    const dt = Math.min(rawDt, 0.05);
    this.lastTime = timestamp;
    this.time += dt;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    updateBackground(dt);
    updateExplosions(dt);

    if (this.screen === 'playing') {
      if (this.particle.launched && this.particle.alive) {
        const steps = 3;
        const subDt = dt / steps;
        for (let i = 0; i < steps; i++) {
          updateParticle(this.particle, this.wells, subDt);

          if (checkTargetReached(this.particle, this.currentLevel.target)) {
            this.particle.alive = false;
            this.onVictory();
            return;
          }

          if (checkObstacleCollision(this.particle, this.currentLevel.obstacles)) {
            this.particle.alive = false;
            this.onFail();
            return;
          }

          if (checkOutOfBounds(this.particle)) {
            this.particle.alive = false;
            this.onFail();
            return;
          }
        }
      }
    }

    if (this.screen === 'victory' || this.screen === 'fail') {
      this.overlayProgress = Math.min(this.overlayProgress + dt * 0.8, 1.2);
    }
  }

  private render(): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.scale(this.scaleX, this.scaleY);

    switch (this.screen) {
      case 'title':
        renderTitleScreen(ctx, this.time, this.titlePlayButton, this.titleHowToPlayButton);
        break;

      case 'tutorial':
        renderTutorial(ctx, this.time, this.tutorialPage, this.tutorialButtons);
        break;

      case 'levelSelect':
        renderLevelSelect(ctx, this.time, this.saveData, this.levelSelectButtons, this.levelSelectBackButton);
        break;

      case 'playing':
        renderPlayingState(
          ctx,
          this.currentLevel,
          this.wells,
          this.particle,
          this.time,
          this.hoveredWellIdx,
          this.hintActive ? this.currentLevel.solution : undefined,
          this.hintActive ? this.hintTrajectory : undefined,
          this.hintActive ? this.hintReachesTarget : undefined
        );
        renderHUD(
          ctx,
          this.currentLevel,
          this.wells.length,
          this.particle.launched,
          this.time,
          this.hudButtons,
          this.hoveredWellIdx >= 0 ? this.wells[this.hoveredWellIdx] : undefined
        );
        break;

      case 'victory':
        renderPlayingState(ctx, this.currentLevel, this.wells, this.particle, this.time, -1);
        renderHUD(ctx, this.currentLevel, this.wells.length, this.particle.launched, this.time, []);
        renderVictoryOverlay(ctx, this.resultStars, this.time, this.overlayProgress, this.victoryButtons);
        break;

      case 'fail':
        renderPlayingState(ctx, this.currentLevel, this.wells, this.particle, this.time, -1);
        renderHUD(ctx, this.currentLevel, this.wells.length, this.particle.launched, this.time, []);
        renderFailOverlay(ctx, this.time, this.overlayProgress, this.failButtons);
        break;
    }

    ctx.restore();
  }
}
