// Ember & Tide — configuration: table size, the four elements and the card list.
// Every card is original to this game: four elements, each told apart by colour
// AND by shape, so the table reads at a glance and at thumbnail size.

export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;

export const PLAYER_MAX_HP = 30;
export const RIVAL_MAX_HP = 50;
export const START_HAND = 4;
export const DRAW_PER_TURN = 2;
export const MAX_HAND = 8;
export const MAX_ENERGY = 6;

// The Tidecaller's blows land harder than the same card in your hand: the
// intent banner always shows the true number, so the threat stays readable.
export const RIVAL_DAMAGE_BONUS = 2;

// Energy on turn n (1-based): 3, 3, 4, 4, 5, 5, 6, 6, ... — a slow ramp, so
// the opening turns are tight and the late duel opens up.
export function energyForTurn(turn) {
  return Math.min(3 + Math.floor((turn - 1) / 2), MAX_ENERGY);
}

// The four elements. `glyph` names the shape render.js draws for the element;
// colour alone never carries the meaning.
export const ELEMENTS = {
  ember: { name: 'Ember', color: '#e2483d', dark: '#8f1d16', light: '#ffb199', glyph: 'flame' },
  tide: { name: 'Tide', color: '#2f7fe0', dark: '#174a8f', light: '#a8d0ff', glyph: 'drop' },
  leaf: { name: 'Leaf', color: '#3da35d', dark: '#1d5c31', light: '#b5e8c3', glyph: 'leaf' },
  stone: { name: 'Stone', color: '#b07a2a', dark: '#6b4a17', light: '#f2d5a0', glyph: 'peak' },
};

// Resonance: playing two cards of the same element in one turn empowers the
// second card by this much (damage, block or healing, whichever it has).
export const RESONANCE_BONUS = 2;

// A card definition. `kind` is 'attack' | 'guard' | 'heal' | 'mixed'.
// `burn` ticks at the start of the rival's turn; `weak` makes the rival's next
// attack weaker. `draw` draws cards after the card resolves.
export const CARDS = [
  { id: 'ember-strike', name: 'Ember Strike', element: 'ember', cost: 1, kind: 'attack', damage: 3, text: 'Deal 3 damage.' },
  { id: 'ember-burn', name: 'Cinder Hex', element: 'ember', cost: 2, kind: 'attack', damage: 3, burn: 2, text: 'Deal 3. Burn 2.' },
  { id: 'inferno', name: 'Inferno', element: 'ember', cost: 3, kind: 'attack', damage: 8, text: 'Deal 8 damage.' },
  { id: 'tide-mend', name: 'Tide Mend', element: 'tide', cost: 2, kind: 'heal', heal: 6, draw: 1, text: 'Heal 6. Draw 1.' },
  { id: 'tide-surge', name: 'Tide Surge', element: 'tide', cost: 3, kind: 'mixed', damage: 4, draw: 1, text: 'Deal 4. Draw 1.' },
  { id: 'frostbite', name: 'Frostbite', element: 'tide', cost: 1, kind: 'attack', damage: 2, weak: 1, text: 'Deal 2. Weaken the rival.' },
  { id: 'thorn-lash', name: 'Thorn Lash', element: 'leaf', cost: 1, kind: 'mixed', damage: 2, block: 2, text: 'Deal 2. Gain 2 block.' },
  { id: 'bloom', name: 'Bloom', element: 'leaf', cost: 2, kind: 'heal', heal: 4, block: 3, text: 'Heal 4. Gain 3 block.' },
  { id: 'cyclone', name: 'Cyclone', element: 'leaf', cost: 3, kind: 'mixed', damage: 3, draw: 2, text: 'Deal 3. Draw 2.' },
  { id: 'stone-guard', name: 'Stone Guard', element: 'stone', cost: 1, kind: 'guard', block: 6, text: 'Gain 6 block.' },
  { id: 'heavy-blow', name: 'Heavy Blow', element: 'stone', cost: 2, kind: 'attack', damage: 6, text: 'Deal 6 damage.' },
  { id: 'quake', name: 'Quake', element: 'stone', cost: 3, kind: 'mixed', damage: 5, block: 4, text: 'Deal 5. Gain 4 block.' },
];

// Two copies of each card make the 24-card deck.
export function buildDeck() {
  const deck = [];
  for (const card of CARDS) deck.push(card.id, card.id);
  return deck;
}

export function cardById(id) {
  return CARDS.find((card) => card.id === id);
}
