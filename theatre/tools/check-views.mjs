#!/usr/bin/env node
// Screenshot every judging state of every piece and report page errors and build times.
//   node tools/check-views.mjs            # all pieces
//   node tools/check-views.mjs room cards # some
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const VIEWS = {
  ink: ['default', 'lines-only', 'tone-only'],
  room: ['default'],
  props: ['default'],
  table: ['default'],
  pepe: ['default'],
  pepeAnim: ['idle', 'talk', 'gesture', 'consider'],
  cards: ['default', 'back', 'deck', 'three'],
  reveal: ['dealt', 'turning', 'revealed', 'fan', 'shuffle', 'fanning', 'pick', 'gather', 'deal', 'turn'],
  lighting: ['default', 'evening', 'lamp'],
  camera: ['home', 'wide', 'pepe', 'table', 'spread', 'door', 'fan'],
  titles: ['title', 'chapter', 'closing', 'hidden'],
  dialogue: ['greeting', 'question', 'reading', 'farewell'],
  flow: ['title', 'greeting', 'question', 'shuffle', 'fan', 'dealt', 'reading', 'farewell'],
  mind: ['greeting', 'question', 'reading', 'transcript'],
};
const only = process.argv.slice(2);
const outDir = process.env.CHECK_OUT ?? '/tmp/theatre-check';
mkdirSync(outDir, { recursive: true });
let failures = 0;
for (const [view, states] of Object.entries(VIEWS)) {
  if (only.length && !only.includes(view)) continue;
  for (const state of states) {
    const out = `${outDir}/${view}-${state}.png`;
    const r = spawnSync('node', ['tools/shot.mjs', '--view', view, '--state', state, '--out', out, '--wait', '1200'], { encoding: 'utf8' });
    const text = (r.stdout + '\n' + r.stderr).split('\n').filter((l) => l && !l.includes('GL Driver'));
    const ready = text.find((l) => l.startsWith('ready in')) ?? '';
    const slow = text.find((l) => l.startsWith('SLOW BUILDS')) ?? '';
    if (r.status !== 0) {
      failures++;
      console.log(`✗ ${view}/${state}\n  ${text.filter((l) => !l.startsWith('ready in')).join('\n  ')}`);
    } else console.log(`✓ ${view}/${state}  ${ready}${slow ? '  ' + slow : ''}`);
  }
}
console.log(failures ? `${failures} failing view(s)` : 'all views render without errors');
process.exit(failures ? 1 : 0);
