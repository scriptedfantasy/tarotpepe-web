#!/usr/bin/env node
// Sweep ink params at the home shot and print, for each, the four numbers of round 7 plus the
// stroke's cross-section — the one measurement that is compared against the entrance door's own
// line rather than against a folio.
//   node tools/_ink-r7-sweep.mjs lineBase 0.75 0.85 1.0
//   node tools/_ink-r7-sweep.mjs --set lineSoft=1.5 lineBase 0.8
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const argv = process.argv.slice(2);
let view = 'camera', state = 'home';
const fixed = [];
const rest = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--view') view = argv[++i];
  else if (argv[i] === '--state') state = argv[++i];
  else if (argv[i] === '--set') fixed.push(argv[++i]);
  else rest.push(argv[i]);
}
const [name, ...values] = rest;
const dir = '/tmp/ink-r7';
mkdirSync(dir, { recursive: true });
const here = new URL('.', import.meta.url).pathname;
const files = [];
for (const v of values.length ? values : ['-']) {
  const u = new URL('http://127.0.0.1:5173/');
  u.searchParams.set('view', view);
  u.searchParams.set('state', state);
  for (const f of fixed) { const [k, val] = f.split('='); u.searchParams.set(`ink.${k}`, val); }
  if (name && v !== '-') u.searchParams.set(`ink.${name}`, v);
  u.searchParams.set('shot', '1');
  const out = `${dir}/${name}-${String(v).replace(/[^\w.-]/g, '_')}.png`;
  execFileSync('node', [here + 'shot.mjs', '--url', u.toString(), '--out', out], { stdio: ['ignore', 'ignore', 'inherit'] });
  files.push(out);
}
execFileSync('node', [here + '_ink-r5.mjs', ...files], { stdio: 'inherit' });
execFileSync('node', [here + '_ink-r6-runs.mjs', ...files], { stdio: 'inherit' });
for (const f of files) {
  console.log('--- ' + f.split('/').pop());
  execFileSync('node', [here + '_ink-r5-xsect.mjs', f, '120', '800', '5'], { stdio: 'inherit' });
}
