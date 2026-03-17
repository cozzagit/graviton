import { Game } from './game/game';
import './style.css';

const canvas = document.getElementById('game') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element #game not found');
}

const game = new Game(canvas);
game.start();
