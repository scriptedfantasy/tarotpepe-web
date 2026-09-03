#!/usr/bin/env node
// Append one event to the live progress log (served at /progress/ by the dev server).
//
//   node tools/progress.mjs '{"piece":"room","round":2,"role":"critic","verdict":"reference","scoreOurs":4,"scoreRef":9,"gap":"...","shot":"room-r2.png"}'
//   node tools/progress.mjs --piece room --round 2 --role builder --note "rebuilt wallpaper"
//
// Fields: piece, round, role (builder|critic|smoother|orchestrator), status (working|judged|done|plateau),
//         verdict (ours|reference|tie), scoreOurs, scoreRef, gap, note, shot (filename under public/progress/shots/)
import { appendFileSync, mkdirSync } from 'node:fs';

const file = new URL('../public/progress/log.jsonl', import.meta.url).pathname;
mkdirSync(new URL('../public/progress/shots/', import.meta.url).pathname, { recursive: true });
let ev;
const argv = process.argv.slice(2);
if (argv.length === 1 && argv[0].trim().startsWith('{')) {
  ev = JSON.parse(argv[0]);
} else {
  ev = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const k = argv[i].slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      ev[k] = isNaN(+v) || v === true ? v : +v;
    }
  }
}
ev.ts = new Date().toISOString();
appendFileSync(file, JSON.stringify(ev) + '\n');
console.log('logged', JSON.stringify(ev));
