import { Game } from './game/game';
import './style.css';

const canvas = document.getElementById('game') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element #game not found');
}

const game = new Game(canvas);
game.start();

// Request fullscreen on first touch (mobile)
function requestFullscreen(): void {
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
  };
  if (el.requestFullscreen) {
    el.requestFullscreen().catch(() => {});
  } else if (el.webkitRequestFullscreen) {
    el.webkitRequestFullscreen().catch(() => {});
  }
  // Lock orientation to landscape if available
  try {
    const o = screen.orientation as any;
    if (o && typeof o.lock === 'function') {
      o.lock('landscape').catch(() => {});
    }
  } catch { /* not supported */ }
}

let fullscreenRequested = false;
document.addEventListener('touchstart', () => {
  if (!fullscreenRequested) {
    fullscreenRequested = true;
    requestFullscreen();
  }
}, { once: true });
