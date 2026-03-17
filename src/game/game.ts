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
  isMobileDevice,
  needsRotation,
  renderRotationScreen,
  renderMobileToolbar,
  renderMobileHUD,
  renderWellPanel,
  renderMobileWellSelection,
  hitTestToolbar,
  hitTestPanel,
  isInToolbar,
  isInPanel,
  getSliderValue,
  createMobileState,
  MobileState,
  PANEL_WIDTH,
} from '../ui/mobile';
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

  // Mobile
  private isMobile: boolean = false;
  private mobile: MobileState = createMobileState();

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

    this.isMobile = isMobileDevice();
    this.setupInput();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    if (this.isMobile) {
      this.setupTouchInput();
    }
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

  private setupTouchInput(): void {
    let lastTapTime = 0;
    let lastTapX = 0;
    let lastTapY = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let longPressTimer = 0;
    let isDragging = false;

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const pos = this.screenToGame(t.clientX, t.clientY);
      touchStartX = pos.x;
      touchStartY = pos.y;
      touchStartTime = performance.now();

      // Start long-press timer for dragging wells
      if (this.screen === 'playing' && !this.particle.launched) {
        const wellIdx = this.findWellAt(pos.x, pos.y);
        if (wellIdx >= 0) {
          longPressTimer = window.setTimeout(() => {
            isDragging = true;
            this.mobile.draggingWellIdx = wellIdx;
            if (navigator.vibrate) navigator.vibrate(15);
          }, 400);
        }
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const pos = this.screenToGame(t.clientX, t.clientY);

      // Cancel long-press if moved too much
      const dx = pos.x - touchStartX;
      const dy = pos.y - touchStartY;
      if (Math.sqrt(dx * dx + dy * dy) > 8 && !isDragging) {
        clearTimeout(longPressTimer);
      }

      // Handle slider dragging
      if (this.mobile.draggingSlider && this.mobile.selectedWellIdx >= 0) {
        const well = this.wells[this.mobile.selectedWellIdx];
        const val = getSliderValue(pos.x, this.mobile, PANEL_WIDTH);
        if (this.mobile.draggingSlider === 'radius') {
          well.radius = Math.round(40 + val * 120);
        } else {
          well.strength = Math.round((0.5 + val * 2.5) * 10) / 10;
        }
        return;
      }

      // Handle well dragging
      if (isDragging && this.mobile.draggingWellIdx >= 0) {
        const well = this.wells[this.mobile.draggingWellIdx];
        well.position.x = pos.x;
        well.position.y = Math.max(50, pos.y - 16); // Offset above finger
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      clearTimeout(longPressTimer);

      const pos = { x: touchStartX, y: touchStartY };
      if (e.changedTouches.length > 0) {
        const t = e.changedTouches[0];
        const endPos = this.screenToGame(t.clientX, t.clientY);
        pos.x = endPos.x;
        pos.y = endPos.y;
      }

      const duration = performance.now() - touchStartTime;
      const moved = Math.sqrt(
        (pos.x - touchStartX) ** 2 + (pos.y - touchStartY) ** 2
      );

      // End slider drag
      if (this.mobile.draggingSlider) {
        this.mobile.draggingSlider = null;
        return;
      }

      // End well drag
      if (isDragging) {
        isDragging = false;
        this.mobile.draggingWellIdx = -1;
        this.mobile.selectedWellIdx = this.findWellAt(pos.x, pos.y);
        this.mobile.showPanel = this.mobile.selectedWellIdx >= 0;
        return;
      }

      // Detect tap (short duration, small movement)
      if (duration < 300 && moved < 15) {
        const now = performance.now();
        const timeSinceLastTap = now - lastTapTime;
        const distFromLastTap = Math.sqrt(
          (touchStartX - lastTapX) ** 2 + (touchStartY - lastTapY) ** 2
        );

        // Double-tap detection: toggle well type
        if (timeSinceLastTap < 350 && distFromLastTap < 30) {
          lastTapTime = 0;
          this.handleMobileDoubleTap(touchStartX, touchStartY);
          return;
        }

        lastTapTime = now;
        lastTapX = touchStartX;
        lastTapY = touchStartY;

        this.handleMobileTap(touchStartX, touchStartY);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      clearTimeout(longPressTimer);
      isDragging = false;
      this.mobile.draggingWellIdx = -1;
      this.mobile.draggingSlider = null;
    }, { passive: false });
  }

  private findWellAt(x: number, y: number): number {
    for (let i = 0; i < this.wells.length; i++) {
      const dist = distanceBetween({ x, y }, this.wells[i].position);
      if (dist < Math.max(30, this.wells[i].radius * 0.3)) return i;
    }
    return -1;
  }

  private handleMobileTap(x: number, y: number): void {
    // Check toolbar buttons first
    if (this.screen === 'playing') {
      const btnId = hitTestToolbar(x, y, this.mobile);
      if (btnId) {
        playClick();
        if (btnId === 'launch') this.handleSpace();
        else if (btnId === 'reset') this.resetLevel();
        else if (btnId === 'hint') this.toggleHint();
        else if (btnId === 'apply') this.applyHint();
        else if (btnId === 'delete') {
          this.mobile.deleteMode = !this.mobile.deleteMode;
        }
        else if (btnId === 'place') {
          // Could toggle default well type in future
        }
        return;
      }

      // Check panel if visible
      if (this.mobile.showPanel && this.mobile.selectedWellIdx >= 0) {
        const hit = hitTestPanel(x, y, this.mobile, PANEL_WIDTH);
        if (hit.area === 'close') {
          this.mobile.selectedWellIdx = -1;
          this.mobile.showPanel = false;
          return;
        }
        if (hit.area === 'radius-slider') {
          this.mobile.draggingSlider = 'radius';
          const val = getSliderValue(x, this.mobile, PANEL_WIDTH);
          this.wells[this.mobile.selectedWellIdx].radius = Math.round(40 + val * 120);
          return;
        }
        if (hit.area === 'strength-slider') {
          this.mobile.draggingSlider = 'strength';
          const val = getSliderValue(x, this.mobile, PANEL_WIDTH);
          this.wells[this.mobile.selectedWellIdx].strength = Math.round((0.5 + val * 2.5) * 10) / 10;
          return;
        }
        if (hit.area === 'toggle') {
          const well = this.wells[this.mobile.selectedWellIdx];
          well.type = well.type === 'attractor' ? 'repeller' : 'attractor';
          playToggle();
          return;
        }
        if (hit.area === 'delete') {
          this.wells.splice(this.mobile.selectedWellIdx, 1);
          this.mobile.selectedWellIdx = -1;
          this.mobile.showPanel = false;
          playRemove();
          return;
        }
        if (isInPanel(x, y, this.mobile)) return; // Consumed by panel
      }

      // Skip toolbar/panel area
      if (isInToolbar(y)) return;
    }

    // Handle tap on game area (all screens)
    this.handleClick(x, y);

    // Mobile-specific: playing screen tap logic
    if (this.screen === 'playing' && !this.particle.launched) {
      const wellIdx = this.findWellAt(x, y);

      if (wellIdx >= 0) {
        if (this.mobile.deleteMode) {
          // Delete mode: tap to delete
          this.wells.splice(wellIdx, 1);
          this.mobile.deleteMode = false;
          this.mobile.selectedWellIdx = -1;
          this.mobile.showPanel = false;
          playRemove();
        } else {
          // Select well
          this.mobile.selectedWellIdx = wellIdx;
          this.mobile.showPanel = true;
          if (navigator.vibrate) navigator.vibrate(10);
        }
      } else if (y > 50 && !isInToolbar(y)) {
        // Deselect if tapping empty space (well placement handled by handleClick)
        this.mobile.selectedWellIdx = -1;
        this.mobile.showPanel = false;
        this.mobile.deleteMode = false;
      }
    }
  }

  private handleMobileDoubleTap(x: number, y: number): void {
    if (this.screen !== 'playing' || this.particle.launched) return;
    const wellIdx = this.findWellAt(x, y);
    if (wellIdx >= 0) {
      this.wells[wellIdx].type =
        this.wells[wellIdx].type === 'attractor' ? 'repeller' : 'attractor';
      playToggle();
      if (navigator.vibrate) navigator.vibrate([15, 30, 15]);
    }
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

    // Show rotation screen on mobile portrait
    if (this.isMobile && needsRotation()) {
      renderRotationScreen(ctx, this.time);
      ctx.restore();
      return;
    }

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

      case 'playing': {
        const selIdx = this.isMobile ? this.mobile.selectedWellIdx : this.hoveredWellIdx;
        renderPlayingState(
          ctx,
          this.currentLevel,
          this.wells,
          this.particle,
          this.time,
          selIdx,
          this.hintActive ? this.currentLevel.solution : undefined,
          this.hintActive ? this.hintTrajectory : undefined,
          this.hintActive ? this.hintReachesTarget : undefined
        );

        // Mobile: HUD + selected well highlight + panel + toolbar
        if (this.isMobile) {
          renderMobileHUD(
            ctx,
            this.currentLevel.id,
            this.currentLevel.name,
            this.wells.length,
            this.currentLevel.maxWells,
            this.currentLevel.par
          );
          if (this.mobile.selectedWellIdx >= 0 && this.mobile.selectedWellIdx < this.wells.length) {
            renderMobileWellSelection(ctx, this.wells[this.mobile.selectedWellIdx], this.time);
          }
          if (this.mobile.showPanel && this.mobile.selectedWellIdx >= 0 && this.mobile.selectedWellIdx < this.wells.length) {
            renderWellPanel(ctx, this.wells[this.mobile.selectedWellIdx], this.mobile, this.time);
          }
          const hasHint = !!(this.currentLevel.solution && this.currentLevel.solution.length > 0);
          renderMobileToolbar(
            ctx, this.mobile,
            this.wells.length, this.currentLevel.maxWells,
            this.particle.launched, hasHint, this.hintActive, this.time
          );
        } else {
          renderHUD(
            ctx,
            this.currentLevel,
            this.wells.length,
            this.particle.launched,
            this.time,
            this.hudButtons,
            this.hoveredWellIdx >= 0 ? this.wells[this.hoveredWellIdx] : undefined
          );
        }
        break;
      }

      case 'victory':
        renderPlayingState(ctx, this.currentLevel, this.wells, this.particle, this.time, -1);
        if (!this.isMobile) {
          renderHUD(ctx, this.currentLevel, this.wells.length, this.particle.launched, this.time, []);
        }
        renderVictoryOverlay(ctx, this.resultStars, this.time, this.overlayProgress, this.victoryButtons);
        break;

      case 'fail':
        renderPlayingState(ctx, this.currentLevel, this.wells, this.particle, this.time, -1);
        if (!this.isMobile) {
          renderHUD(ctx, this.currentLevel, this.wells.length, this.particle.launched, this.time, []);
        }
        renderFailOverlay(ctx, this.time, this.overlayProgress, this.failButtons);
        break;
    }

    ctx.restore();
  }
}
