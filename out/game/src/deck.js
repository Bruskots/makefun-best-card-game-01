// Ember & Tide — the draw pile, the discard pile and the hand. When the draw
// pile runs out it is rebuilt from the discard pile and shuffled, so a long
// duel never stalls.

import { buildDeck, cardById } from './config.js';
import { shuffle } from './random.js';

export function makeDeckState(random) {
  const drawPile = shuffle(buildDeck(), random);
  return { drawPile, discardPile: [], hand: [] };
}

export function drawCards(deckState, count, random, maxHand) {
  const drawn = [];
  for (let n = 0; n < count; n += 1) {
    if (deckState.hand.length + drawn.length >= maxHand) break;
    if (deckState.drawPile.length === 0) {
      if (deckState.discardPile.length === 0) break;
      deckState.drawPile = shuffle(deckState.discardPile.splice(0), random);
    }
    drawn.push(deckState.drawPile.pop());
  }
  for (const id of drawn) deckState.hand.push(id);
  return drawn;
}

// Remove one copy of `cardId` from the hand (by index) and discard it.
export function discardFromHand(deckState, index) {
  const removed = deckState.hand.splice(index, 1);
  if (removed.length > 0) deckState.discardPile.push(removed[0]);
  return removed[0] ?? null;
}

export function handCards(deckState) {
  return deckState.hand.map((id) => cardById(id));
}
