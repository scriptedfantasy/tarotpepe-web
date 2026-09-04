#!/usr/bin/env node
// Sweep one ink parameter and report the critic's tone numbers for each value.
//   node tools/_ink-sweep.mjs lineBase 0.235 0.28 0.32 0.36
//   node tools/_ink-sweep.mjs --state lines-only --view ink lineBase 0.28 0.32
// Extra fixed params: --set name=value (repeatable).
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
const dir = '/tmp/ink-r4';
mkdirSync(dir, { recursive: true });
const files = [];
for (const v of values) {
  const u = new URL('http://127.0.0.1:5173/');
  u.searchParams.set('view', view);
  u.searchParams.set('state', state);
  for (const f of fixed) { const [k, val] = f.split('='); u.searchParams.set(`ink.${k}`, val); }
  if (name) u.searchParams.set(`ink.${name}`, v);
  u.searchParams.set('shot', '1');
  const out = `${dir}/sw-${name}-${String(v).replace(/[^\w.-]/g, '_')}.png`;
  execFileSync('node', [new URL('./shot.mjs', import.meta.url).pathname, '--url', u.toString(), '--out', out], { stdio: ['ignore', 'ignore', 'inherit'] });
  files.push(out);
}
execFileSync('node', [new URL('./_ink-tone.mjs', import.meta.url).pathname, ...files], { stdio: 'inherit' });
