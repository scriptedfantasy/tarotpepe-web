// scratch: run shot.mjs until the frame is not black (other builders' saves reload the page mid-build)
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const out = args[outIdx + 1];
const shot = new URL('./shot.mjs', import.meta.url).pathname;
import { unlinkSync } from 'node:fs';
for (let attempt = 1; attempt <= 6; attempt++) {
  try {
    unlinkSync(out);
  } catch {}
  const r = spawnSync('node', [shot, ...args, '--wait', '4000'], { encoding: 'utf8' });
  process.stdout.write(r.stdout ?? '');
  process.stderr.write(r.stderr ?? '');
  if (r.status === 2) {
    console.log('page errors; stopping');
    process.exit(2);
  }
  try {
    const st = await sharp(out).stats();
    const mean = st.channels.reduce((a, c) => a + c.mean, 0) / st.channels.length;
    console.log(`attempt ${attempt}: mean brightness ${mean.toFixed(1)}`);
    if (mean > 60) process.exit(0);
  } catch (e) {
    console.log('no image', e.message);
  }
}
console.log('gave up: frame still black');
process.exit(3);
