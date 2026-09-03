// Run tools/shot.mjs sequentially for several states (software GL is slow; parallel runs time out),
// retrying when the page reloaded mid-capture (black frame) or the run failed.
//   node public/progress/_shots.mjs <view> <state1,state2,...> [suffix] [tries]
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
const root = new URL('../../', import.meta.url).pathname;
const [view, states, suffix = 'wip', triesArg = '3'] = process.argv.slice(2);
for (const state of states.split(',')) {
  const out = `${root}public/progress/shots/${view}-r1-${state}-${suffix}.png`;
  for (let t = 1; t <= +triesArg; t++) {
    const r = spawnSync('node', [`${root}tools/shot.mjs`, '--view', view, '--state', state, '--wait', '45000', '--out', out], { encoding: 'utf8' });
    let mean = -1;
    try {
      const st = await sharp(out).stats();
      mean = st.channels.slice(0, 3).reduce((a, c) => a + c.mean, 0) / 3;
    } catch {}
    const black = mean >= 0 && mean < 30;
    console.log(`[${state}] try ${t} exit=${r.status} mean=${mean.toFixed(1)}${black ? ' BLACK' : ''}`);
    if (r.stderr && r.stderr.includes('PAGE ERRORS')) console.log(r.stderr.trim().slice(0, 2000));
    if (r.status === 0 && !black) break;
  }
}
