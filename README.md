# Ember & Tide

[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/Bruskots/makefun-best-card-game-01/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/Bruskots/makefun-best-card-game-01/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826)

An original turn-based duel card game, built for the [make.fun best card game bounty](https://make.fun/bounty/best-card-game-20261122-1826).

You are the Emberkeeper, duelling the Tidecaller Nara for the four currents.
You have 30 life; she has 50, and her blows land for +2. Each turn you gain energy, draw cards, and play them
against a rival whose next move is shown face-up — read the intent, then answer
it with damage, block or healing. Play two cards of the same element in one
turn to spark **Resonance** (+2). Burn ticks, Weak blunts attacks, and the first
to zero loses.

## The four elements

- **Ember** (red flame) — raw damage and burn
- **Tide** (blue drop) — healing, draw and weakening
- **Leaf** (green leaf) — mixed damage, block and draw
- **Stone** (amber peak) — heavy blows and solid block

## How to play

- Click a card (or press `1`–`7`) to play it; cards cost energy.
- `Space` ends your turn. The rival then plays its telegraphed card.
- `R` restarts after a win or a loss. `M` mutes the sound.
- Watch the intent banner: when the rival plans a Heavy Blow, guard first.

## Play it

Static files under `game/` — no build step, no network. Serve locally:

```sh
node serve.ts
# open http://localhost:8080
```

Hand the game in (writes `/output` with `dossier.json`):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).
