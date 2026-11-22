// Ember & Tide — make.fun best card game entry.
// Node 22, standard library only. This program hands the game in: it copies
// the static game/ folder and the screenshots/ folder from beside this file
// into /output, then writes /output/dossier.json, the summary the judge reads,
// using the vendored make.fun library. No network, no build step.
//
// Run locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the game itself with `node serve.ts` (http://localhost:8080).

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });

const shotsDir = join(outputDir, 'screenshots');
mkdirSync(shotsDir, { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), shotsDir, { recursive: true });
}

// Caps mirror the scorer's gate: at most 4 screenshots, each at most 256 KiB;
// game/ at most 993 files and 48 MiB in all, no path over 1000 bytes.
// text_max_bytes caps the dossier's source text at 160 KiB.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`Ember & Tide handed in: ${outputDir}`);
