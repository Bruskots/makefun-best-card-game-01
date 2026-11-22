// Ember & Tide — mouse and keyboard. Click a card to play it (or press 1–7),
// Space ends the turn, Enter starts the duel, R restarts after a win or a
// loss, M mutes the sound. Hover lifts a card so the hand stays readable.

import { VIEW_WIDTH, VIEW_HEIGHT } from './config.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_WIN, SCREEN_LOSS, playCard, endTurn, startDuel } from './state.js';
import { handLayout, END_TURN_BUTTON, CARD_W, CARD_H } from './render.js';

function toLogical(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (VIEW_WIDTH / rect.width),
    y: (clientY - rect.top) * (VIEW_HEIGHT / rect.height),
  };
}

function cardAt(game, view, x, y) {
  const layout = handLayout(game);
  for (let i = layout.length - 1; i >= 0; i -= 1) {
    const slot = layout[i];
    if (x >= slot.x && x <= slot.x + CARD_W && y >= slot.y - 26 && y <= slot.y + CARD_H) {
      return slot.index;
    }
  }
  return -1;
}

export function attachInput(canvas, game, view, sound) {
  canvas.addEventListener('mousemove', (event) => {
    const pos = toLogical(canvas, event.clientX, event.clientY);
    view.mouse = pos;
    if (game.screen === SCREEN_PLAY) {
      view.hover = cardAt(game, view, pos.x, pos.y);
    } else {
      view.hover = -1;
    }
  });

  canvas.addEventListener('mouseleave', () => {
    view.mouse = { x: -1, y: -1 };
    view.hover = -1;
  });

  canvas.addEventListener('click', (event) => {
    const pos = toLogical(canvas, event.clientX, event.clientY);
    if (game.screen === SCREEN_TITLE) {
      sound.unlock();
      sound.play('start');
      startDuel(game);
      return;
    }
    if (game.screen === SCREEN_WIN || game.screen === SCREEN_LOSS) {
      startDuel(game);
      return;
    }
    if (game.screen !== SCREEN_PLAY) return;
    const btn = END_TURN_BUTTON;
    if (pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) {
      sound.play('end');
      endTurn(game);
      return;
    }
    const index = cardAt(game, view, pos.x, pos.y);
    if (index >= 0) {
      const played = playCard(game, index);
      sound.play(played ? 'play' : 'error');
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key;
    if (game.screen === SCREEN_TITLE && (key === 'Enter' || key === ' ')) {
      event.preventDefault();
      sound.unlock();
      sound.play('start');
      startDuel(game);
      return;
    }
    if ((game.screen === SCREEN_WIN || game.screen === SCREEN_LOSS) && (key === 'r' || key === 'R' || key === 'Enter')) {
      startDuel(game);
      return;
    }
    if (game.screen !== SCREEN_PLAY) return;
    if (key === ' ') {
      event.preventDefault();
      sound.play('end');
      endTurn(game);
      return;
    }
    if (key >= '1' && key <= '8') {
      const index = Number(key) - 1;
      const played = playCard(game, index);
      sound.play(played ? 'play' : 'error');
      return;
    }
    if (key === 'm' || key === 'M') {
      sound.toggleMute();
    }
  });
}
