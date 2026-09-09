#!/usr/bin/env node
// Screenshot every judging state of every piece and report page errors and build times.
//   node tools/check-views.mjs            # all pieces
//   node tools/check-views.mjs room cards # some
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const VIEWS = {
  ink: ['default', 'lines-only', 'tone-only'],
  room: ['default'],
  props: ['default', 'cat-lit', 'switchboard-plugged', 'fuse-out', 'vortex-mid', 'wine-drunk', 'globe-spinning', 'insects-gathered', 'vase-empty', 'vase-leaf', 'rain', 'fine-burning', 'mirror-sad', 'mirror-smug', 'nakamoto-rain', 'peep-fallen', 'konami-house'],
  table: ['default'],
  pepe: ['default'],
  pepeAnim: ['idle', 'talk', 'gesture', 'consider'],
  cards: ['default', 'back', 'deck', 'three'],
  reveal: ['dealt', 'turning', 'revealed', 'fan', 'shuffle', 'fanning', 'pick', 'gather', 'deal', 'turn'],
  lighting: ['default', 'evening', 'lamp'],
  sound: ['default'],
  camera: ['home', 'wide', 'pepe', 'table', 'spread', 'door', 'fan'],
  entrance: ['closed', 'opening', 'open'],
  titles: ['title', 'chapter', 'closing', 'hidden'],
  dialogue: ['greeting', 'question', 'reading', 'farewell'],
  help: ['closed', 'hover', 'open'],
  // not a piece: what the notice DOES. ?view=keep draws page one of the sheet a visitor takes away
  // (src/pieces/help-keep.js) into the overlay, from a canned reading.
  keep: ['default'],
  flow: ['greeting', 'talk', 'shuffle', 'fan', 'dealt', 'reading', 'farewell'],
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
    // CHECK_READY_TIMEOUT lengthens shot.mjs's own wait for `window.__theatreReady`. Default
    // behaviour is unchanged (the flag is simply not passed): it is here because this machine is
    // shared with several builders' headless browsers and a page that takes 150 s to be ready under
    // a load average of two hundred has not thrown anything, it has been waiting for a CPU.
    const readyArg = process.env.CHECK_READY_TIMEOUT ? ['--ready-timeout', process.env.CHECK_READY_TIMEOUT] : [];
    const r = spawnSync('node', ['tools/shot.mjs', '--view', view, '--state', state, '--out', out, '--wait', '1200', ...readyArg], { encoding: 'utf8' });
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
