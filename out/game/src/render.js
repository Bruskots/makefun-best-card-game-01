// Ember & Tide — everything the player sees: the felt table, the rival's hand
// and telegraphed intent, the player's hand, life totals, energy, and the
// title, victory and defeat screens. Cards slide, lift on hover, fly when
// played; damage floats up, big hits shake the table, victory rains embers.

import { VIEW_WIDTH, VIEW_HEIGHT, ELEMENTS, RIVAL_DAMAGE_BONUS, cardById } from './config.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_WIN, SCREEN_LOSS } from './state.js';

export const CARD_W = 150;
export const CARD_H = 208;
const HAND_Y = 486;
const HAND_SPACING = 118;

// ---------------------------------------------------------------------------
// Small drawing helpers
// ---------------------------------------------------------------------------

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, weight, align, font) {
  ctx.fillStyle = color;
  ctx.font = `${weight ?? 'normal'} ${size}px ${font ?? 'system-ui, sans-serif'}`;
  ctx.textAlign = align ?? 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

function wrapText(ctx, str, x, y, maxWidth, lineHeight, size, color) {
  ctx.fillStyle = color;
  ctx.font = `${size}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  const words = str.split(' ');
  let line = '';
  let cy = y;
  for (const word of words) {
    const trial = line === '' ? word : `${line} ${word}`;
    if (ctx.measureText(trial).width > maxWidth && line !== '') {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineHeight;
    } else {
      line = trial;
    }
  }
  if (line !== '') ctx.fillText(line, x, cy);
}

// Draw one element glyph (flame, drop, leaf, peak) centred at (x, y). Each
// shape is distinct on purpose: a leaning flame with an inner flick, a round
// drop, a veined leaf, a mountain peak — colour never carries the meaning.
export function drawGlyph(ctx, glyph, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  if (glyph === 'flame') {
    // A leaning flame: a sweeping outer curve with a flicked tip.
    ctx.moveTo(size * 0.18, -size);
    ctx.bezierCurveTo(size * 0.85, -size * 0.35, size * 0.75, size * 0.55, size * 0.1, size * 0.85);
    ctx.bezierCurveTo(-size * 0.25, size * 0.95, -size * 0.8, size * 0.6, -size * 0.55, size * 0.05);
    ctx.bezierCurveTo(-size * 0.4, -size * 0.3, -size * 0.15, -size * 0.6, size * 0.18, -size);
  } else if (glyph === 'drop') {
    ctx.moveTo(0, -size);
    ctx.bezierCurveTo(size * 0.8, -size * 0.1, size * 0.7, size * 0.8, 0, size * 0.8);
    ctx.bezierCurveTo(-size * 0.7, size * 0.8, -size * 0.8, -size * 0.1, 0, -size);
  } else if (glyph === 'leaf') {
    // A pointed leaf with a centre vein and a short stem.
    ctx.moveTo(0, -size);
    ctx.bezierCurveTo(size * 0.95, -size * 0.5, size * 0.8, size * 0.75, 0, size);
    ctx.bezierCurveTo(-size * 0.8, size * 0.75, -size * 0.95, -size * 0.5, 0, -size);
  } else {
    // peak: a mountain with a snow cap line
    ctx.moveTo(0, -size);
    ctx.lineTo(size, size * 0.8);
    ctx.lineTo(-size, size * 0.8);
    ctx.closePath();
  }
  ctx.fill();
  if (glyph === 'flame') {
    // Inner flick, in the element's light colour.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.moveTo(size * 0.05, -size * 0.25);
    ctx.bezierCurveTo(size * 0.4, size * 0.1, size * 0.3, size * 0.55, 0, size * 0.6);
    ctx.bezierCurveTo(-size * 0.3, size * 0.55, -size * 0.25, size * 0.05, size * 0.05, -size * 0.25);
    ctx.fill();
  }
  if (glyph === 'leaf') {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = Math.max(1, size * 0.09);
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.8);
    ctx.lineTo(0, size * 0.95);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Hand layout (shared with input hit-testing)
// ---------------------------------------------------------------------------

export function handLayout(game) {
  const cards = game.deck.hand;
  const n = cards.length;
  const total = n <= 1 ? CARD_W : CARD_W + (n - 1) * HAND_SPACING;
  const startX = (VIEW_WIDTH - total) / 2;
  return cards.map((id, i) => {
    const fan = n <= 1 ? 0 : (i - (n - 1) / 2) * 0.07;
    return {
      index: i,
      id,
      card: cardById(id),
      x: startX + i * HAND_SPACING,
      y: HAND_Y + Math.abs(i - (n - 1) / 2) * 6,
      angle: fan,
    };
  });
}

export const END_TURN_BUTTON = { x: 1120, y: 452, w: 132, h: 56 };

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

function drawCardFace(ctx, card, x, y, w, h, opts) {
  const element = ELEMENTS[card.element];
  const dimmed = opts?.dimmed ?? false;
  const hovered = opts?.hovered ?? false;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (opts?.angle) ctx.rotate(opts.angle);
  ctx.translate(-w / 2, -h / 2);
  if (hovered) {
    ctx.shadowColor = 'rgba(255, 215, 120, 0.9)';
    ctx.shadowBlur = 22;
  }
  roundRect(ctx, 0, 0, w, h, 12);
  ctx.fillStyle = dimmed ? '#3a3630' : '#f7f1e3';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = hovered ? 3 : 2;
  ctx.strokeStyle = dimmed ? '#6b655a' : element.color;
  ctx.stroke();
  // Element band.
  roundRect(ctx, 0, 0, w, 34, 12);
  ctx.fillStyle = element.color;
  ctx.fill();
  ctx.fillRect(0, 22, w, 12);
  drawGlyph(ctx, element.glyph, 20, 17, 9, '#fff');
  text(ctx, element.name.toUpperCase(), 34, 22, 12, '#fff', 'bold');
  // Cost orb.
  ctx.beginPath();
  ctx.arc(w - 20, 20, 14, 0, Math.PI * 2);
  ctx.fillStyle = '#20242e';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffd778';
  ctx.stroke();
  text(ctx, String(card.cost), w - 20, 25, 16, '#ffd778', 'bold', 'center');
  // Name.
  text(ctx, card.name, 10, 58, 15, dimmed ? '#8a8378' : '#241f18', 'bold');
  // Big value: damage, block or healing, with the element glyph.
  const value = card.damage ?? card.block ?? card.heal ?? 0;
  const valueLabel = card.damage ? 'DMG' : card.block ? 'BLOCK' : 'HEAL';
  drawGlyph(ctx, element.glyph, w / 2, 104, 26, element.color);
  text(ctx, String(value), w / 2, 148, 34, dimmed ? '#8a8378' : '#241f18', 'bold', 'center', 'Georgia, serif');
  text(ctx, valueLabel, w / 2, 166, 10, '#7a7264', 'bold', 'center');
  // Rules text.
  wrapText(ctx, card.text, 10, 184, w - 20, 13, 11, dimmed ? '#8a8378' : '#4a4238');
  ctx.restore();
}

function drawCardBack(ctx, x, y, w, h) {
  ctx.save();
  roundRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = '#5b2d4d';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffd778';
  ctx.stroke();
  roundRect(ctx, x + 8, y + 8, w - 16, h - 16, 7);
  ctx.strokeStyle = 'rgba(255, 215, 120, 0.6)';
  ctx.stroke();
  drawGlyph(ctx, 'flame', x + w / 2, y + h / 2, 18, '#ffd778');
  ctx.restore();
}

// ---------------------------------------------------------------------------
// View state (transient animation)
// ---------------------------------------------------------------------------

export function createView() {
  return {
    time: 0,
    floats: [],
    particles: [],
    shake: 0,
    playedCard: null,
    hover: -1,
    mouse: { x: -1, y: -1 },
  };
}

function addFloat(view, kind, target, amount, label) {
  const anchor = target === 'rival' ? { x: VIEW_WIDTH / 2, y: 66 } : { x: 210, y: 470 };
  const colors = { damage: '#ff5a4e', heal: '#5ad67a', block: '#7fb2ff', burn: '#ff8c3b', weak: '#c99aff', resonance: '#ffd778', info: '#e8e2d4', blocked: '#9db6d8' };
  view.floats.push({ x: anchor.x + (Math.random() - 0.5) * 60, y: anchor.y, life: 1, label, color: colors[kind] ?? '#fff' });
  if (kind === 'damage' && amount >= 7) view.shake = Math.max(view.shake, 7);
  if (kind === 'damage') burst(view, anchor.x, anchor.y, colors.damage, 10);
}

function burst(view, x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 140;
    view.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 40, life: 0.7 + Math.random() * 0.4, color, size: 2 + Math.random() * 3 });
  }
}

function drainEvents(view, game) {
  for (const event of game.events.splice(0)) {
    if (event.kind === 'played') {
      view.playedCard = { cardId: event.cardId, target: event.target, t: 0 };
    } else if (event.kind === 'win') {
      for (let i = 0; i < 90; i += 1) {
        burst(view, 200 + Math.random() * 880, 120 + Math.random() * 200, ['#ffd778', '#e2483d', '#2f7fe0', '#3da35d'][i % 4], 1);
      }
    } else {
      addFloat(view, event.kind, event.target, event.amount ?? 0, event.text);
    }
  }
}

export function updateView(view, game, dt) {
  view.time += dt;
  drainEvents(view, game);
  for (const f of view.floats) {
    f.y -= 46 * dt;
    f.life -= dt * 0.9;
  }
  view.floats = view.floats.filter((f) => f.life > 0);
  for (const p of view.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 220 * dt;
    p.life -= dt;
  }
  view.particles = view.particles.filter((p) => p.life > 0);
  view.shake = Math.max(0, view.shake - dt * 22);
  if (view.playedCard) {
    view.playedCard.t += dt;
    if (view.playedCard.t > 0.95) view.playedCard = null;
  }
}

// ---------------------------------------------------------------------------
// Pieces of the table
// ---------------------------------------------------------------------------

function drawHpBar(ctx, x, y, w, label, hp, maxHp, block, statuses) {
  text(ctx, label, x, y - 8, 13, '#e8e2d4', 'bold');
  roundRect(ctx, x, y, w, 20, 10);
  ctx.fillStyle = '#20242e';
  ctx.fill();
  const frac = Math.max(0, hp / maxHp);
  if (frac > 0) {
    roundRect(ctx, x + 2, y + 2, (w - 4) * frac, 16, 8);
    ctx.fillStyle = hp / maxHp > 0.33 ? '#c94f43' : '#e2483d';
    ctx.fill();
  }
  text(ctx, `${hp} / ${maxHp}`, x + w + 10, y + 16, 14, '#fff', 'bold');
  // Badges sit to the right of the life text, never over the bar.
  let bx = x + w + 78;
  if (block > 0) {
    roundRect(ctx, bx, y - 2, 66, 24, 8);
    ctx.fillStyle = '#2f5f8f';
    ctx.fill();
    text(ctx, `Block ${block}`, bx + 8, y + 15, 13, '#cfe4ff', 'bold');
    bx += 74;
  }
  for (const status of statuses) {
    roundRect(ctx, bx, y - 2, 74, 24, 8);
    ctx.fillStyle = status.color;
    ctx.fill();
    text(ctx, status.text, bx + 8, y + 15, 13, '#fff', 'bold');
    bx += 82;
  }
}

function drawTable(ctx, view, game) {
  // Felt with a vignette and a gold inner border.
  const grad = ctx.createRadialGradient(640, 360, 120, 640, 360, 760);
  grad.addColorStop(0, '#2e6b52');
  grad.addColorStop(1, '#173d2d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.strokeStyle = 'rgba(255, 215, 120, 0.35)';
  ctx.lineWidth = 3;
  roundRect(ctx, 14, 14, VIEW_WIDTH - 28, VIEW_HEIGHT - 28, 18);
  ctx.stroke();

  // Rival seat.
  text(ctx, 'TIDECALLER NARA', VIEW_WIDTH / 2, 40, 15, '#ffd778', 'bold', 'center');
  const rivalStatuses = [];
  if (game.rival.burn > 0) rivalStatuses.push({ text: `Burn ${game.rival.burn}`, color: '#c25a1e' });
  if (game.rival.weak > 0) rivalStatuses.push({ text: `Weak ${game.rival.weak}`, color: '#6b4fa1' });
  drawHpBar(ctx, VIEW_WIDTH / 2 - 170, 48, 340, '', game.rival.hp, game.rival.maxHp, game.rival.block, rivalStatuses);

  // Rival hand, face down.
  for (let i = 0; i < 5; i += 1) {
    drawCardBack(ctx, VIEW_WIDTH / 2 - 250 + i * 102, 86, 92, 128);
  }

  // Telegraphed intent.
  if (game.rivalIntent) {
    const intent = cardById(game.rivalIntent.cardId);
    const element = ELEMENTS[intent.element];
    roundRect(ctx, VIEW_WIDTH / 2 - 260, 226, 520, 44, 12);
    ctx.fillStyle = 'rgba(16, 20, 28, 0.82)';
    ctx.fill();
    ctx.strokeStyle = element.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    drawGlyph(ctx, element.glyph, VIEW_WIDTH / 2 - 232, 248, 12, element.color);
    text(ctx, 'Rival intends:', VIEW_WIDTH / 2 - 210, 252, 14, '#c9c2b2', 'bold');
    const effect = intent.damage ? `${intent.damage + RIVAL_DAMAGE_BONUS} damage` : intent.block ? `+${intent.block} block` : intent.heal ? `heal ${intent.heal}` : intent.text;
    text(ctx, `${intent.name} — ${effect}`, VIEW_WIDTH / 2 - 96, 252, 15, '#fff', 'bold');
  }

  // Player seat.
  const playerStatuses = [];
  if (game.player.weak > 0) playerStatuses.push({ text: `Weak ${game.player.weak}`, color: '#6b4fa1' });
  text(ctx, 'YOU — THE EMBERKEEPER', 36, 446, 14, '#ffd778', 'bold');
  drawHpBar(ctx, 36, 452, 300, '', game.player.hp, game.player.maxHp, game.player.block, playerStatuses);

  // Energy crystals, clear of the End Turn button.
  text(ctx, 'ENERGY', 880, 446, 13, '#e8e2d4', 'bold');
  for (let i = 0; i < 8; i += 1) {
    const cx = 892 + i * 24;
    ctx.beginPath();
    ctx.arc(cx, 468, 9, 0, Math.PI * 2);
    ctx.fillStyle = i < game.player.energy ? '#ffd778' : '#3a3f4a';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffd778';
    ctx.stroke();
  }

  // End turn button.
  const btn = END_TURN_BUTTON;
  const hovering = view.mouse.x >= btn.x && view.mouse.x <= btn.x + btn.w && view.mouse.y >= btn.y && view.mouse.y <= btn.y + btn.h;
  roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 12);
  ctx.fillStyle = hovering ? '#c9402f' : '#8f2a1e';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffd778';
  ctx.stroke();
  text(ctx, 'END TURN', btn.x + btn.w / 2, btn.y + 30, 15, '#fff', 'bold', 'center');
  text(ctx, 'Space', btn.x + btn.w / 2, btn.y + 48, 10, '#ffd9a8', 'normal', 'center');

  // Turn + resonance note.
  text(ctx, `Turn ${game.turn}`, VIEW_WIDTH - 36, 40, 15, '#e8e2d4', 'bold', 'right');
  if (game.lastElement) {
    const element = ELEMENTS[game.lastElement];
    text(ctx, `Resonance ready: play another ${element.name} card for +2`, VIEW_WIDTH / 2, 292, 13, element.light, 'normal', 'center');
  }

  // Log, truncated so it never runs under the hand.
  ctx.save();
  ctx.globalAlpha = 0.92;
  game.log.forEach((line, i) => {
    const shown = line.length > 34 ? `${line.slice(0, 33)}…` : line;
    text(ctx, shown, 36, 560 + i * 18, 12, i === game.log.length - 1 ? '#fff' : '#b9b2a2', 'normal');
  });
  ctx.restore();

  // Player hand.
  const layout = handLayout(game);
  for (const slot of layout) {
    const affordable = game.player.energy >= slot.card.cost;
    const hovered = view.hover === slot.index;
    const lift = hovered ? 26 : 0;
    drawCardFace(ctx, slot.card, slot.x, slot.y - lift, CARD_W, CARD_H, {
      angle: slot.angle,
      dimmed: !affordable,
      hovered,
    });
  }

  // Hint when the hand is empty.
  if (layout.length === 0) {
    text(ctx, 'No cards in hand — end the turn to draw.', VIEW_WIDTH / 2, 620, 15, '#e8e2d4', 'normal', 'center');
  }
}

function drawFloatsAndParticles(ctx, view) {
  for (const p of view.particles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  for (const f of view.floats) {
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
    text(ctx, f.label, f.x, f.y, 22, f.color, 'bold', 'center', 'Georgia, serif');
  }
  ctx.globalAlpha = 1;
}

function drawPlayedCard(ctx, view) {
  const played = view.playedCard;
  if (!played) return;
  const card = cardById(played.cardId);
  const t = played.t;
  const scale = t < 0.15 ? 0.7 + (t / 0.15) * 0.3 : 1;
  const alpha = t > 0.6 ? Math.max(0, 1 - (t - 0.6) / 0.35) : 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  const w = CARD_W * 1.15 * scale;
  const h = CARD_H * 1.15 * scale;
  const x = (played.target === 'rival' ? VIEW_WIDTH / 2 - w / 2 : VIEW_WIDTH / 2 - w / 2);
  const y = 300 - h / 2 + (played.target === 'rival' ? -40 : 40);
  ctx.shadowColor = 'rgba(255, 215, 120, 0.8)';
  ctx.shadowBlur = 30;
  drawCardFace(ctx, card, x, y, w, h, {});
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

function drawMiniCard(ctx, card, x, y, w, h, angle) {
  const element = ELEMENTS[card.element];
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(angle);
  ctx.translate(-w / 2, -h / 2);
  roundRect(ctx, 0, 0, w, h, 10);
  ctx.fillStyle = '#f7f1e3';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = element.color;
  ctx.stroke();
  roundRect(ctx, 0, 0, w, 26, 10);
  ctx.fillStyle = element.color;
  ctx.fill();
  ctx.fillRect(0, 16, w, 10);
  drawGlyph(ctx, element.glyph, 16, 13, 7, '#fff');
  text(ctx, element.name.toUpperCase(), 28, 17, 10, '#fff', 'bold');
  ctx.beginPath();
  ctx.arc(w - 16, 15, 11, 0, Math.PI * 2);
  ctx.fillStyle = '#20242e';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffd778';
  ctx.stroke();
  text(ctx, String(card.cost), w - 16, 19, 12, '#ffd778', 'bold', 'center');
  text(ctx, card.name, 8, 48, 13, '#241f18', 'bold');
  const value = card.damage ?? card.block ?? card.heal ?? 0;
  const valueLabel = card.damage ? 'DMG' : card.block ? 'BLOCK' : 'HEAL';
  drawGlyph(ctx, element.glyph, w / 2, 88, 20, element.color);
  text(ctx, String(value), w / 2, 126, 26, '#241f18', 'bold', 'center', 'Georgia, serif');
  text(ctx, valueLabel, w / 2, 142, 9, '#7a7264', 'bold', 'center');
  ctx.restore();
}

function drawTitle(ctx, view) {
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
  grad.addColorStop(0, '#1c2b4a');
  grad.addColorStop(0.55, '#173d2d');
  grad.addColorStop(1, '#241a10');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  // Ember and tide orbs drifting.
  for (let i = 0; i < 5; i += 1) {
    const x = 180 + i * 230;
    const y = 110 + Math.sin(view.time * 0.7 + i * 1.7) * 14;
    drawGlyph(ctx, i % 2 === 0 ? 'flame' : 'drop', x, y, 22, i % 2 === 0 ? 'rgba(226, 72, 61, 0.55)' : 'rgba(47, 127, 224, 0.55)');
  }
  text(ctx, 'EMBER & TIDE', VIEW_WIDTH / 2, 240, 84, '#f7f1e3', 'bold', 'center', 'Georgia, serif');
  text(ctx, 'A duel of the four currents', VIEW_WIDTH / 2, 288, 26, '#ffd778', 'normal', 'center', 'Georgia, serif');
  text(ctx, 'Outwit the Tidecaller. Chain one element to spark Resonance.', VIEW_WIDTH / 2, 330, 18, '#e8e2d4', 'normal', 'center');
  // Element legend.
  const names = Object.values(ELEMENTS);
  names.forEach((element, i) => {
    const x = VIEW_WIDTH / 2 - 270 + i * 180;
    drawGlyph(ctx, element.glyph, x, 382, 16, element.color);
    text(ctx, element.name, x + 26, 388, 16, '#fff', 'bold');
  });
  const pulse = 0.65 + Math.sin(view.time * 3) * 0.35;
  ctx.globalAlpha = pulse;
  text(ctx, 'Click or press Enter to play', VIEW_WIDTH / 2, 448, 22, '#fff', 'bold', 'center');
  ctx.globalAlpha = 1;
  text(ctx, 'Cards cost energy · 1–7 plays a card · Space ends your turn', VIEW_WIDTH / 2, 486, 15, '#c9c2b2', 'normal', 'center');
  text(ctx, 'You have 30 life. The Tidecaller has 50. First to zero loses.', VIEW_WIDTH / 2, 510, 15, '#c9c2b2', 'normal', 'center');
  text(ctx, 'Burn ticks for 2 · Weak cuts the next attack by 2 · Resonance: same element twice, +2', VIEW_WIDTH / 2, 534, 15, '#c9c2b2', 'normal', 'center');
  // A fan of sample cards, so the title already reads as a card game.
  const samples = [cardById('inferno'), cardById('tide-mend'), cardById('stone-guard')];
  samples.forEach((card, i) => {
    const offset = i - 1;
    drawMiniCard(ctx, card, VIEW_WIDTH / 2 - 55 + offset * 105, 540 + Math.abs(offset) * 8, 110, 154, offset * 0.12);
  });
}

function drawEnd(ctx, view, game) {
  const won = game.screen === SCREEN_WIN;
  ctx.fillStyle = 'rgba(12, 16, 24, 0.8)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  const title = won ? 'VICTORY!' : 'DEFEAT';
  const color = won ? '#ffd778' : '#ff8a7a';
  text(ctx, title, VIEW_WIDTH / 2, 300, 76, color, 'bold', 'center', 'Georgia, serif');
  text(
    ctx,
    won ? 'The Tidecaller yields. The currents are yours.' : 'The tide takes you… this time.',
    VIEW_WIDTH / 2, 348, 20, '#e8e2d4', 'normal', 'center',
  );
  const stats = game.stats;
  text(ctx, `Turns ${stats.turns}   ·   Damage dealt ${stats.damageDealt}   ·   Cards played ${stats.cardsPlayed}   ·   Resonance ×${game.resonanceCount}`, VIEW_WIDTH / 2, 410, 16, '#fff', 'normal', 'center');
  const pulse = 0.65 + Math.sin(view.time * 3) * 0.35;
  ctx.globalAlpha = pulse;
  text(ctx, 'Press R to play again', VIEW_WIDTH / 2, 480, 20, '#fff', 'bold', 'center');
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function draw(ctx, view, game) {
  ctx.save();
  if (view.shake > 0) {
    ctx.translate((Math.random() - 0.5) * view.shake, (Math.random() - 0.5) * view.shake);
  }
  if (game.screen === SCREEN_TITLE) {
    drawTitle(ctx, view);
  } else if (game.screen === SCREEN_WIN || game.screen === SCREEN_LOSS) {
    drawTable(ctx, view, game);
    drawEnd(ctx, view, game);
  } else {
    drawTable(ctx, view, game);
  }
  drawPlayedCard(ctx, view);
  drawFloatsAndParticles(ctx, view);
  ctx.restore();
}
