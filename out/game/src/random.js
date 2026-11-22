// Ember & Tide — a small seeded random source so a screenshot seed always
// stages the same frame, while a real game shuffles differently every time.

export function makeRandom(seed) {
  let state = seed >>> 0;
  if (state === 0) state = 0x9e3779b9;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle driven by `random`. Returns the array it was given.
export function shuffle(array, random) {
  for (let index = array.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    const held = array[index];
    array[index] = array[other];
    array[other] = held;
  }
  return array;
}

// Pick one entry of `weighted` (an array of [value, weight]) by `random`.
export function pickWeighted(weighted, random) {
  let total = 0;
  for (const entry of weighted) total += entry[1];
  let roll = random() * total;
  for (const entry of weighted) {
    roll -= entry[1];
    if (roll <= 0) return entry[0];
  }
  return weighted[weighted.length - 1][0];
}
