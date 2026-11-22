// Ember & Tide — the duel itself: turns, energy, block, burn and weak, the
// resonance combo, and the win/loss check. Rendering and input live elsewhere;
// this file only decides what happens when a card is played or a turn ends.

import {
  PLAYER_MAX_HP,
  RIVAL_MAX_HP,
  START_HAND,
  DRAW_PER_TURN,
  MAX_HAND,
  RESONANCE_BONUS,
  RIVAL_DAMAGE_BONUS,
  energyForTurn,
  cardById,
} from './config.js';
import { makeDeckState, drawCards, discardFromHand, handCards } from './deck.js';
import { chooseIntent } from './ai.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSS = 'loss';

export function newGame(random) {
  const game = {
    screen: SCREEN_TITLE,
    phase: 'player',
    turn: 0,
    random,
    player: { hp: PLAYER_MAX_HP, maxHp: PLAYER_MAX_HP, block: 0, energy: 0, weak: 0 },
    rival: { hp: RIVAL_MAX_HP, maxHp: RIVAL_MAX_HP, block: 0, burn: 0, weak: 0 },
    deck: makeDeckState(random),
    rivalIntent: null,
    lastElement: null,
    resonanceCount: 0,
    stats: { turns: 0, damageDealt: 0, damageTaken: 0, cardsPlayed: 0 },
    log: [],
    events: [],
  };
  return game;
}

export function startDuel(game) {
  game.screen = SCREEN_PLAY;
  game.phase = 'player';
  game.turn = 0;
  game.player.hp = PLAYER_MAX_HP;
  game.player.block = 0;
  game.player.weak = 0;
  game.rival.hp = RIVAL_MAX_HP;
  game.rival.block = 0;
  game.rival.burn = 0;
  game.rival.weak = 0;
  game.deck = makeDeckState(game.random);
  game.lastElement = null;
  game.resonanceCount = 0;
  game.stats = { turns: 0, damageDealt: 0, damageTaken: 0, cardsPlayed: 0 };
  game.log = ['The duel begins. Outplay the Tidecaller!'];
  game.events = [];
  drawCards(game.deck, START_HAND, game.random, MAX_HAND);
  beginPlayerTurn(game);
}

function say(game, line) {
  game.log.push(line);
  if (game.log.length > 4) game.log.shift();
}

function pushEvent(game, event) {
  game.events.push(event);
}

// Block soaks damage first; the rest hits life. Returns the life damage dealt.
// Burn bypasses block: it is the answer to a guard-heavy rival.
export function dealDamage(game, target, amount, source, bypassBlock = false) {
  const side = target === 'player' ? game.player : game.rival;
  const soaked = bypassBlock ? 0 : Math.min(side.block, amount);
  side.block -= soaked;
  const life = amount - soaked;
  side.hp = Math.max(0, side.hp - life);
  if (life > 0) {
    pushEvent(game, { kind: 'damage', target, amount: life, text: `-${life}` });
    if (target === 'rival') game.stats.damageDealt += life;
    else game.stats.damageTaken += life;
  }
  if (soaked > 0) pushEvent(game, { kind: 'blocked', target, amount: soaked, text: `Blocked ${soaked}` });
  if (source) say(game, source);
  return life;
}

function gainBlock(game, target, amount) {
  const side = target === 'player' ? game.player : game.rival;
  side.block += amount;
  pushEvent(game, { kind: 'block', target, amount, text: `+${amount} block` });
}

function heal(game, target, amount) {
  const side = target === 'player' ? game.player : game.rival;
  const healed = Math.min(amount, side.maxHp - side.hp);
  side.hp += healed;
  if (healed > 0) pushEvent(game, { kind: 'heal', target, amount: healed, text: `+${healed}` });
  return healed;
}

function beginPlayerTurn(game) {
  game.turn += 1;
  game.stats.turns = game.turn;
  game.phase = 'player';
  game.player.block = 0;
  game.player.energy = energyForTurn(game.turn);
  game.lastElement = null;
  drawCards(game.deck, DRAW_PER_TURN, game.random, MAX_HAND);
  game.rivalIntent = chooseIntent(game, game.random);
}

// Play the card at `handIndex`. Returns true when the card was played.
export function playCard(game, handIndex) {
  if (game.screen !== SCREEN_PLAY || game.phase !== 'player') return false;
  const cards = handCards(game.deck);
  const card = cards[handIndex];
  if (!card) return false;
  if (game.player.energy < card.cost) {
    pushEvent(game, { kind: 'info', target: 'player', text: 'Not enough energy' });
    return false;
  }

  // Resonance: a second card of the same element this turn is empowered.
  const resonant = game.lastElement !== null && game.lastElement === card.element;
  const bonus = resonant ? RESONANCE_BONUS : 0;
  if (resonant) {
    game.resonanceCount += 1;
    pushEvent(game, { kind: 'resonance', target: 'player', text: `Resonance! +${bonus}` });
  }

  game.player.energy -= card.cost;
  game.lastElement = card.element;
  game.stats.cardsPlayed += 1;
  discardFromHand(game.deck, handIndex);
  pushEvent(game, { kind: 'played', target: 'player', cardId: card.id, text: card.name });

  const weakCut = game.player.weak > 0 && card.damage ? 2 : 0;
  if (game.player.weak > 0 && card.damage) game.player.weak -= 1;
  const damage = Math.max(0, (card.damage ?? 0) + bonus - weakCut);
  if (damage > 0) {
    dealDamage(game, 'rival', damage, `You played ${card.name} — ${damage} damage.`);
  }
  if (card.block) gainBlock(game, 'player', card.block + bonus);
  if (card.heal) {
    const healed = heal(game, 'player', card.heal + bonus);
    if (healed > 0) say(game, `You played ${card.name} — restored ${healed}.`);
  }
  if (card.burn) {
    game.rival.burn += card.burn;
    pushEvent(game, { kind: 'burn', target: 'rival', amount: card.burn, text: `Burn ${card.burn}` });
    say(game, `You played ${card.name} — the rival burns.`);
  }
  if (card.weak) {
    game.rival.weak += card.weak;
    pushEvent(game, { kind: 'weak', target: 'rival', amount: card.weak, text: 'Weakened' });
  }
  if (card.draw) drawCards(game.deck, card.draw, game.random, MAX_HAND);
  if (!card.damage && !card.heal) say(game, `You played ${card.name}.`);

  checkEnd(game);
  return true;
}

// End the player's turn: burn ticks, the rival plays its telegraphed intent,
// then a new player turn begins.
export function endTurn(game) {
  if (game.screen !== SCREEN_PLAY || game.phase !== 'player') return;
  game.phase = 'rival';
  // The rival's old block expires as its new turn begins.
  game.rival.block = 0;

  if (game.rival.burn > 0) {
    const burnDamage = 2;
    game.rival.burn -= 1;
    dealDamage(game, 'rival', burnDamage, `Burn ticks — the rival takes ${burnDamage}.`, true);
    if (checkEnd(game)) return;
  }

  const intent = game.rivalIntent;
  if (intent) {
    const card = cardById(intent.cardId);
    pushEvent(game, { kind: 'played', target: 'rival', cardId: card.id, text: card.name });
    const weakCut = game.rival.weak > 0 && card.damage ? 2 : 0;
    if (game.rival.weak > 0 && card.damage) game.rival.weak -= 1;
    const damage = Math.max(0, (card.damage ?? 0) + RIVAL_DAMAGE_BONUS - weakCut);
    if (damage > 0) {
      dealDamage(game, 'player', damage, `The rival played ${card.name} — ${damage} damage.`);
    }
    if (card.block) {
      gainBlock(game, 'rival', card.block);
      say(game, `The rival played ${card.name} — gains ${card.block} block.`);
    }
    if (card.heal) {
      const healed = heal(game, 'rival', card.heal);
      if (healed > 0) say(game, `The rival played ${card.name} — restores ${healed}.`);
    }
    if (card.weak) {
      game.player.weak += card.weak;
      pushEvent(game, { kind: 'weak', target: 'player', amount: card.weak, text: 'Weakened' });
      say(game, `The rival played ${card.name} — you are weakened.`);
    }
    if (card.draw) say(game, `The rival played ${card.name}.`);
  }
  if (checkEnd(game)) return;
  beginPlayerTurn(game);
}

// Returns true when the duel is over.
export function checkEnd(game) {
  if (game.rival.hp <= 0) {
    game.screen = SCREEN_WIN;
    game.phase = 'over';
    pushEvent(game, { kind: 'win', target: 'rival', text: 'Victory!' });
    say(game, 'Victory! The Tidecaller yields.');
    return true;
  }
  if (game.player.hp <= 0) {
    game.screen = SCREEN_LOSS;
    game.phase = 'over';
    pushEvent(game, { kind: 'loss', target: 'player', text: 'Defeat' });
    say(game, 'Defeat. The tide takes you… this time.');
    return true;
  }
  return false;
}

export function handCardsOf(game) {
  return handCards(game.deck);
}
