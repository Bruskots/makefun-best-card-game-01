// Ember & Tide — the screenshot scenes behind ?shot=title|play|win|loss.
// Each scene plays the real rules forward from a fresh duel for a fixed
// number of turns, steered by a simple autopilot, so the frame is what a
// real game looks like and the same seed always gives the same frame.

import { SCREEN_PLAY, startDuel, playCard, endTurn, handCardsOf } from './state.js';

// Score one playable card for the autopilot. Aggressive mode values damage
// above all; balanced mode values block, healing and draw too. A card of the
// same element as the last one played earns its resonance bonus in the score.
function scoreCard(game, card, aggressive) {
  let score = (card.damage ?? 0) * (aggressive ? 3 : 2);
  score += (card.block ?? 0) * (aggressive ? 0.4 : 1);
  score += (card.heal ?? 0) * (aggressive ? 0.5 : 1.5);
  score += (card.draw ?? 0) * 1.5;
  if (card.burn) score += 3;
  if (card.weak) score += 2;
  score /= card.cost;
  if (game.lastElement !== null && game.lastElement === card.element) score += 3;
  return score;
}

function autoTurn(game, aggressive) {
  let guard = 0;
  while (guard++ < 20 && game.screen === SCREEN_PLAY && game.phase === 'player') {
    const cards = handCardsOf(game);
    let best = -1;
    let bestScore = -1;
    for (let i = 0; i < cards.length; i += 1) {
      const card = cards[i];
      if (card.cost > game.player.energy) continue;
      const score = scoreCard(game, card, aggressive);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    if (best < 0) break;
    playCard(game, best);
  }
  if (game.screen === SCREEN_PLAY && game.phase === 'player') endTurn(game);
}

// Set `game` to the named scene (title, play, win or loss; any other name is
// the title) and return the screen to draw.
export function stageShot(name, game) {
  if (name !== 'play' && name !== 'win' && name !== 'loss') {
    return game.screen;
  }
  startDuel(game);
  if (name === 'play') {
    for (let turn = 0; turn < 3 && game.screen === SCREEN_PLAY; turn += 1) {
      autoTurn(game, false);
    }
    return game.screen;
  }
  if (name === 'win') {
    for (let turn = 0; turn < 60 && game.screen === SCREEN_PLAY; turn += 1) {
      autoTurn(game, true);
    }
    return game.screen;
  }
  // loss: a hurried player who never plays a card
  for (let turn = 0; turn < 60 && game.screen === SCREEN_PLAY; turn += 1) {
    endTurn(game);
  }
  return game.screen;
}
