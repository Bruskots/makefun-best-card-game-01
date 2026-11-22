// Ember & Tide — the rival's mind. The rival picks one card at the start of
// the player's turn and shows it face-up as its intent, so the player can read
// the coming blow and answer it with block, healing or a faster kill. The
// choice itself is simple and legible: hurt when the player is weak, defend
// when its own life is low, otherwise a weighted mix.

import { pickWeighted } from './random.js';

// The rival's own small card pool: attacks, one guard and one mend. No draws,
// no burn — those stay the player's tools.
const INTENT_POOL = [
  { cardId: 'ember-strike', weight: 3 },
  { cardId: 'heavy-blow', weight: 2 },
  { cardId: 'frostbite', weight: 1 },
  { cardId: 'stone-guard', weight: 1.5 },
  { cardId: 'tide-mend', weight: 1 },
];

export function chooseIntent(game, random) {
  const rival = game.rival;
  const player = game.player;

  const pool = INTENT_POOL.map((entry) => ({ ...entry }));
  if (rival.hp <= 10) {
    // Low life: much more likely to guard or mend.
    for (const entry of pool) {
      if (entry.cardId === 'stone-guard') entry.weight *= 3;
      if (entry.cardId === 'tide-mend') entry.weight *= 3;
    }
  }
  if (player.hp <= 7) {
    // The kill is near: press the attack.
    for (const entry of pool) {
      if (entry.cardId === 'heavy-blow') entry.weight *= 2;
      if (entry.cardId === 'ember-strike') entry.weight *= 1.5;
      if (entry.cardId === 'tide-mend') entry.weight *= 0.2;
    }
  }
  if (rival.hp >= rival.maxHp) {
    // Full life: no reason to mend.
    for (const entry of pool) {
      if (entry.cardId === 'tide-mend') entry.weight = 0;
    }
  }

  const live = pool.filter((entry) => entry.weight > 0);
  const cardId = pickWeighted(live.map((entry) => [entry.cardId, entry.weight]), random);
  return { cardId };
}
