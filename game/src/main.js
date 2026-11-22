// Ember & Tide — boot and the game loop. The canvas is a fixed 1280×720
// stage scaled by CSS to fit the window; the game itself is pure canvas, no
// network, no libraries. With ?shot=title|play|win|loss the page stages one
// scene and draws it once, so a headless browser can screenshot the real game.

import { VIEW_WIDTH, VIEW_HEIGHT } from './config.js';
import { makeRandom } from './random.js';
import { newGame } from './state.js';
import { createView, updateView, draw } from './render.js';
import { attachInput } from './input.js';
import { createSound } from './sound.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW_WIDTH, window.innerHeight / VIEW_HEIGHT);
  canvas.style.width = `${Math.floor(VIEW_WIDTH * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW_HEIGHT * scale)}px`;
}

function readParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    shot: params.get('shot') ?? '',
    seed: Number(params.get('seed') ?? '') || 1,
  };
}

const { shot, seed } = readParams();
const random = makeRandom(shot ? seed : (Date.now() % 2147483647));
const game = newGame(random);
const view = createView();
const sound = createSound();
// A read-only handle for debugging and automated playtests.
window.__emberTide = { game, view };

fitCanvas();
window.addEventListener('resize', fitCanvas);

if (shot) {
  stageShot(shot, game);
  draw(ctx, view, game);
  // Keep the frame alive for the screenshot tool and mark readiness.
  window.__emberTideReady = true;
  document.title = `Ember & Tide — ${shot}`;
} else {
  attachInput(canvas, game, view, sound);
  let last = performance.now();
  let previousScreen = game.screen;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    updateView(view, game, dt);
    draw(ctx, view, game);
    if (game.screen !== previousScreen) {
      if (game.screen === 'win') sound.play('win');
      if (game.screen === 'loss') sound.play('loss');
      previousScreen = game.screen;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
