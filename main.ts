// Vice Nights, a make.fun gta6-cover-art-01 entry (Node 22, standard library
// only). The entry itself is the offline web app in app/: plain static files
// a desktop browser loads with no network request (app/index.html and its ES
// modules, no library), turning the user's photos and caption into a
// multi-panel GTA-style poster cover, exported as a PNG in 1080 x 1080,
// 1080 x 1350 or 1920 x 1080. This program hands it in: it copies app/ and
// screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, using the vendored
// make.fun library.
//
// Run the app locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the rest refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of
// app files, in all, or a path under app/ over 1000 bytes: app/ counts
// beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

// A short human-readable summary of what was handed in, so a bad run is
// obvious at a glance: the app's file count, the screenshots present, and
// the dossier's size against its 1.5 MiB cap.
const appFiles = readdirSync(join(out, 'app'), { recursive: true }).length;
const shotFiles = readdirSync(join(out, 'screenshots'))
  .filter((name) => statSync(join(out, 'screenshots', name)).isFile())
  .sort();
const dossierBytes = statSync(join(out, 'dossier.json')).size;
console.log(`Vice Nights handed in: ${appFiles} app entries, screenshots: ${shotFiles.join(', ') || 'none'}, dossier ${dossierBytes} bytes`);
if (shotFiles.length < 3 || shotFiles.length > 4) {
  console.warn(`Warning: expected 3 or 4 screenshots, found ${shotFiles.length}.`);
}
if (dossierBytes > 1572864) {
  console.warn(`Warning: dossier is ${dossierBytes} bytes, over the 1.5 MiB cap.`);
}
