// Run tools/shot.mjs sequentially for several states (software GL is slow; parallel runs time out).
//   node public/progress/_shots.mjs <view> <state1,state2,...> [suffix]
import { spawnSync } from 'node:child_process';
const root = new URL('../../', import.meta.url).pathname;
const [view, states, suffix = 'wip'] = process.argv.slice(2);
for (const state of states.split(',')) {
  const out = `${root}public/progress/shots/${view}-r1-${state}-${suffix}.png`;
  const r = spawnSync('node', [`${root}tools/shot.mjs`, '--view', view, '--state', state, '--wait', '40000', '--out', out], { encoding: 'utf8' });
  console.log(`[${state}] exit=${r.status}`);
  if (r.stdout) console.log(r.stdout.trim());
  if (r.stderr) console.log(r.stderr.trim().slice(0, 2000));
}
