/*
 * EMBERWATCH — Night Keeper
 *
 * A lantern keeper rekindles an old building's braziers while shadows close in.
 * The browser game draws its own art and synthesizes its sound without external
 * assets. This Node 22 entrypoint packages the offline game and its screenshots
 * for the make.fun judge, then writes the dossier with the vendored builder.
 *
 * Sources come from game/ and screenshots/ beside this file. The submission goes
 * to MAKEFUN_OUTPUT_DIR when provided, otherwise /output. Required inputs are
 * checked before copying so a missing game or screenshot folder fails clearly.
 */

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

for (const required of ['game/index.html', 'screenshots/']) {
  const sourcePath = join(here, required);
  if (!existsSync(sourcePath)) {
    throw new Error(`Emberwatch submission is missing required path: ${sourcePath}`);
  }
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

console.log(`Emberwatch output directory: ${out}`);

// Preserve the judge's dossier and submission limits.
const dossierPath = join(out, 'dossier.json');
writeFileSync(
  dossierPath,
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`Emberwatch dossier written: ${dossierPath}`);
