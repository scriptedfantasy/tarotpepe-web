#!/usr/bin/env node
// The smoosh's HANDS, drawing by drawing: every drawing of the shuffle take rendered on a frozen
// clock, tiled into a contact sheet per viewport, and the rig read out per drawing — wrist, hand
// heading, forearm heading at the cuff, the bend between them, the reach back to his own wrist, and
// whether the two hands / two arms cross or lie on each other.
//
//   timeout 240 node tools/_shuffle-hands.mjs --out /abs/dir --tag before [--every 1] [--sizes laptop,phone] [--states shuffle,pick,deal,turn,gather]
//
// `shuffle` is driven through the take's own drawings; the other beats are reveal's looping judging
// states, driven by taking the 12 fps clock by hand (one drawing per step) and sheeted only where a
// hand is on the cloth. Every drawing also reports how much of the drawn hand lies UNDER a card.
//
// Writes <out>/<tag>-<size>.png (the sheet) and <out>/<tag>-<size>.json (the readout), and prints
// the drawings whose pose is outside the limits below. Exit code 1 if any is.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const OUT = args.out ?? '/tmp/shuffle-hands';
const TAG = args.tag ?? 'probe';
const EVERY = Number(args.every ?? 1);
const SIZES = { laptop: [1280, 800, ''], phone: [390, 844, '1'], phoneland: [844, 390, '1'] };
const T0 = Date.now();
const pick = (args.sizes ?? 'laptop,phone').split(',');
mkdirSync(OUT, { recursive: true });

// the limits a pose is judged by (degrees / metres)
const LIM = { bend: 30, reach: 1.35, gap: 0.155, under: 0.1 };
const STATES = (args.states ?? 'shuffle').split(',');
const STEPS = { pick: 48, deal: 48, turn: 60, gather: 48 };

const browser = await chromium.launch({
  headless: true,
  // --gpu: the machine's own GPU (much faster on a Mac); default is swiftshader, like the other proofs
  args: args.gpu ? ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-webgl'] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
let bad = 0;
for (const label of pick) for (const state of STATES) {
  const [width, height, phone] = SIZES[label];
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log(`${label} ERR ${e}`));
  await page.route('**/@vite/client', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data: {} }; }
export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){ return u; } export class ErrorOverlay {}`,
    }),
  );
  // --before: the committed hand/take modules, served in place of the working ones (they must have
  // been written out beside them as src/pieces/__before-<name>.js), so a before sheet can be shot
  // after the fix without touching the files the dev server is serving
  if (args.before)
    await page.route(/\/src\/pieces\/(reveal|reveal-hand|reveal-pick|reveal-shuffle)\.js(\?.*)?$/, (route) => {
      const url = route.request().url().replace(/\/(reveal[a-z-]*)\.js/, '/__before-$1.js');
      return route.continue({ url });
    });
  const u = new URL('http://127.0.0.1:5173/');
  u.searchParams.set('view', 'reveal');
  u.searchParams.set('state', state);
  u.searchParams.set('t', '0');
  u.searchParams.set('shot', '1');
  if (phone) u.searchParams.set('phone', '1');
  await page.goto(u.toString(), { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });
  await page.waitForTimeout(600);
  // the silhouettes of the two plates, for the under-a-card test
  await page.evaluate(async () => {
    const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
    window.__plates = {};
    for (const k of ['splay', 'pinch']) {
      const im = await load(`/pepe/hand-${k}.png`);
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      const g = c.getContext('2d');
      g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, im.width, im.height).data, pts = [];
      for (let y = 4; y < im.height; y += 12) for (let x = 4; x < im.width; x += 12) if (d[(y * im.width + x) * 4 + 3] > 128) pts.push([x / im.width, y / im.height]);
      window.__plates[k] = pts;
    }
    if (window.__theatre.pieces.reveal._shuffle && !window.__stepClock) return;
  });
  const shuffle = state === 'shuffle';
  if (!shuffle)
    await page.evaluate(() => {
      // the clock, by hand: one drawing per step, and the room's own update draws it
      const c = window.__theatre.clock;
      window.__t = 0;
      c.frozen = false;
      c.tick = () => {
        const f = Math.round(window.__t * 12);
        c.raw = window.__t;
        c.stepped = f !== c.frame;
        c.dt = c.stepped ? (f - c.frame) / 12 : 0;
        c.frame = f;
        c.t = f / 12;
      };
    });
  const n = shuffle ? await page.evaluate(() => window.__theatre.pieces.reveal._shuffle.frames.length) : STEPS[state];
  console.log(`${label} ${state} ready at ${((Date.now() - T0) / 1000).toFixed(1)} s, ${n} drawings`);
  const dir = `${OUT}/${TAG}-${state}-${label}-tiles`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const rows = [];
  const tiles = [];
  for (let k = 0; k < n; k++) {
    const r = await page.evaluate(
      async ([k, draw, shuffle]) => {
        const R = window.__theatre.pieces.reveal;
        const H = R.hand;
        if (shuffle) {
          H.begin();
          R._shuffle.frames[k]();
          H.end();
        } else {
          window.__t = k / 12;
          await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
        }
        if (!draw) return null;
        if (!shuffle && !H.shown) return { k, none: true };
        // the rig, read out
        const out = { k };
        const segs = {};
        for (const s of ['L', 'R']) {
          const rig = H.rigs[s];
          if (!rig.shown) continue;
          const g = rig.group;
          g.updateMatrixWorld(true);
          const arm = g.getObjectByName('reveal-hand-sleeve');
          const P = arm.geometry.attributes.position.array;
          const n = P.length / 6;
          const V = new g.position.constructor();
          const spine = [];
          for (let i = 0; i < n; i++) {
            V.set((P[i * 6] + P[i * 6 + 3]) / 2, (P[i * 6 + 1] + P[i * 6 + 4]) / 2, (P[i * 6 + 2] + P[i * 6 + 5]) / 2).applyMatrix4(g.matrixWorld);
            spine.push([V.x, V.y, V.z]);
          }
          const yaw = g.rotation.y;
          const hand = [Math.sin(yaw), Math.cos(yaw)]; // wrist → fingers, in plan
          // the forearm's heading AT THE CUFF: from a few stations up the arm down to the wrist
          const a = spine[4], b = spine[0];
          const fa = [b[0] - a[0], b[2] - a[2]];
          const fl = Math.hypot(...fa);
          const bend = (Math.atan2(fa[0] * hand[1] - fa[1] * hand[0], fa[0] * hand[0] + fa[1] * hand[1]) * 180) / Math.PI;
          const last = spine[n - 1];
          const reach = Math.hypot(g.position.x - last[0], g.position.z - last[2]);
          // the elbow: the station furthest from the straight line wrist → far end
          let el = 0, ed = 0;
          for (let i = 0; i < n; i++) {
            const p = spine[i];
            const dx = last[0] - b[0], dz = last[2] - b[2];
            const d = Math.abs((p[0] - b[0]) * dz - (p[2] - b[2]) * dx) / (Math.hypot(dx, dz) || 1);
            if (d > ed) (ed = d), (el = i);
          }
          out[s] = {
            wrist: [+g.position.x.toFixed(3), +g.position.y.toFixed(3), +g.position.z.toFixed(3)],
            yaw: +((yaw * 180) / Math.PI).toFixed(1),
            forearm: +((Math.atan2(fa[0] / fl, fa[1] / fl) * 180) / Math.PI).toFixed(1),
            bend: +bend.toFixed(1),
            reach: +reach.toFixed(3),
            elbow: spine[el].map((v) => +v.toFixed(3)),
            elbowBow: +ed.toFixed(3),
          };
          segs[s] = spine;
          // HOW MUCH OF THE DRAWN HAND IS UNDER A CARD: its silhouette, sampled, put through the
          // visible pose's own transform, and tested against every card-shaped mesh lying over it
          const pose = ['splay', 'point', 'pinch'].map((p) => g.getObjectByName('reveal-hand-' + p)).find((m) => m?.visible);
          if (pose) {
            pose.geometry.computeBoundingBox();
            const bb = pose.geometry.boundingBox, pw = bb.max.x - bb.min.x, pl = bb.max.z - bb.min.z;
            const pts = window.__plates[pose.name.endsWith('pinch') ? 'pinch' : 'splay'];
            const cards = [];
            window.__theatre.scene.traverse((o) => {
              if (!o.isMesh || !o.geometry) return;
              let v = o;
              while (v) { if (!v.visible) return; v = v.parent; }
              o.geometry.boundingBox || o.geometry.computeBoundingBox();
              const b = o.geometry.boundingBox, sx = b.max.x - b.min.x, sy = b.max.y - b.min.y, sz = b.max.z - b.min.z;
              if (Math.abs(sx - 0.13) < 0.01 && Math.abs(sz - 0.2275) < 0.012 && sy < 0.05) cards.push({ o, b, inv: o.matrixWorld.clone().invert() });
            });
            let under = 0, deep = 0, who = '';
            for (const [u, v] of pts) {
              V.set(bb.min.x + u * pw, 0, bb.min.z + (1 - v) * pl).applyMatrix4(pose.matrixWorld);
              const wy = V.y;
              for (const c of cards) {
                const L = V.clone().applyMatrix4(c.inv);
                if (L.x < c.b.min.x || L.x > c.b.max.x || L.z < c.b.min.z || L.z > c.b.max.z) continue;
                // the card's top face at that spot, in world height
                const top = new V.constructor(L.x, c.b.max.y, L.z).applyMatrix4(c.o.matrixWorld).y;
                // a card lying ON the hand: near flat, and within 25 mm of it. A card in the air over
                // the fingers (the turn tips one over them, and lets one fall past them) is not one.
                const tilt = (Math.acos(Math.min(1, Math.abs(c.o.matrixWorld.elements[5] / (Math.hypot(c.o.matrixWorld.elements[4], c.o.matrixWorld.elements[5], c.o.matrixWorld.elements[6]) || 1)))) * 180) / Math.PI;
                if (top > wy + 0.0005 && top < wy + 0.025 && tilt < 30) {
                  under++;
                  if (top - wy > deep) (deep = top - wy), (who = `${c.o.name || c.o.parent?.name || '?'} tilt ${((Math.acos(Math.min(1, Math.abs(c.o.matrixWorld.elements[5]))) * 180) / Math.PI).toFixed(0)}°`);
                  break;
                }
              }
            }
            out[s].under = +(under / pts.length).toFixed(3);
            if (under) out[s].underBy = `${(deep * 1000).toFixed(1)} mm, ${who}`;
          }
        }
        // do the two arms' plan spines cross? do the two palms lie on each other?
        if (segs.L && segs.R) {
          const X = (p, q, r, s) => {
            const d = (q[0] - p[0]) * (s[2] - r[2]) - (q[2] - p[2]) * (s[0] - r[0]);
            if (!d) return false;
            const t = ((r[0] - p[0]) * (s[2] - r[2]) - (r[2] - p[2]) * (s[0] - r[0])) / d;
            const v = ((r[0] - p[0]) * (q[2] - p[2]) - (r[2] - p[2]) * (q[0] - p[0])) / d;
            return t >= 0 && t <= 1 && v >= 0 && v <= 1;
          };
          let cross = false;
          for (let i = 0; i < segs.L.length - 1 && !cross; i++) for (let j = 0; j < segs.R.length - 1 && !cross; j++) cross = X(segs.L[i], segs.L[i + 1], segs.R[j], segs.R[j + 1]);
          out.armsCross = cross;
          // palm to palm: the two wrists' plan distance, and the hands' inner edges
          out.wristGap = +Math.hypot(out.L.wrist[0] - out.R.wrist[0], out.L.wrist[2] - out.R.wrist[2]).toFixed(3);
          out.handsSwapped = out.L.wrist[0] > out.R.wrist[0];
        }
        return out;
      },
      [k, k % EVERY === 0, shuffle],
    );
    if (!r) continue;
    if (r.none) continue;
    await page.evaluate(() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))));
    await page.waitForTimeout(120);
    const f = `${dir}/${String(k).padStart(2, '0')}.png`;
    await page.screenshot({ path: f, timeout: 30000 });
    tiles.push(f);
    rows.push(r);
    const why = [];
    for (const s of ['L', 'R']) {
      if (!r[s]) continue;
      if (Math.abs(r[s].bend) > LIM.bend) why.push(`${s} wrist bent ${r[s].bend}°`);
      if (r[s].reach > LIM.reach) why.push(`${s} reach ${r[s].reach} m`);
    }
    for (const s of ['L', 'R']) if (r[s]?.under > LIM.under) why.push(`${s} hand ${Math.round(r[s].under * 100)}% under a card (${r[s].underBy})`);
    if (r.armsCross) why.push('arms cross');
    if (r.handsSwapped) why.push('hands swapped sides');
    if (r.wristGap != null && r.wristGap < LIM.gap) why.push(`wrists ${r.wristGap} m apart (hands lie on each other)`);
    if (why.length) bad++;
    console.log(`${label} ${state} d${String(k).padStart(2, '0')}  L bend ${r.L?.bend ?? '-'} R bend ${r.R?.bend ?? '-'}  reach ${r.L?.reach ?? '-'}/${r.R?.reach ?? '-'}  under ${r.L?.under ?? '-'}/${r.R?.under ?? '-'}  gap ${r.wristGap ?? '-'}${why.length ? '   ✗ ' + why.join('; ') : ''}`);
  }
  writeFileSync(`${OUT}/${TAG}-${shuffle ? '' : state + '-'}${label}.json`, JSON.stringify(rows, null, 1));
  // the sheet: every drawing, labelled by its number
  if (!tiles.length) { console.log(`${label} ${state}: no hand on the cloth`); await page.close(); continue; }
  const tw = label === 'laptop' ? 400 : label === 'phone' ? 180 : 330;
  const cols = label === 'phone' ? 10 : 6;
  execFileSync('montage', [...tiles.flatMap((t) => ['-label', 'd' + t.slice(-6, -4), t]), '-tile', `${cols}x`, '-geometry', `${tw}x+4+4`, '-pointsize', '14', `${OUT}/${TAG}-${shuffle ? '' : state + '-'}${label}.png`]);
  console.log('wrote', `${OUT}/${TAG}-${shuffle ? '' : state + '-'}${label}.png`);
  await page.close();
}
await browser.close();
console.log(bad ? `${bad} drawings outside the limits` : 'all drawings inside the limits');
process.exit(bad ? 1 : 0);
