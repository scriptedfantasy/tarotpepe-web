// throwaway (camera round 8): does ?shot=1 solve a different plate from the live app?
// Opens the SAME named shot at the same viewport with and without shot=1 and dumps what the
// camera actually holds: the solved shot, the live camera, and what the reveal piece told it.
//   node tools/_cam-r8-div.mjs [w h shot...]
import { chromium } from 'playwright';

const SIZES = [[1600, 900], [390, 760]];
const SHOTS = ['fan', 'turn', 'home', 'wide'];

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});

async function probe(w, h, shotFlag) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export function createHotContext(){return{accept(){},acceptExports(){},dispose(){},prune(){},decline(){},invalidate(){},on(){},off(){},send(){},data:{}};}\nexport function updateStyle(){}\nexport function removeStyle(){}\nexport function injectQuery(u){return u;}\nexport class ErrorOverlay {}' }));
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  const url = `http://127.0.0.1:5173/${process.env.Q ?? "?view=camera&state=fan"}${shotFlag ? "&shot=1" : ""}`;
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  const t0 = Date.now();
  while (Date.now() - t0 < 150000) {
    if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(600);
  const out = await page.evaluate((names) => {
    const T = window.__theatre;
    const C = T.pieces.camera, R = T.pieces.reveal;
    const r4 = (v) => (typeof v === 'number' ? +v.toFixed(4) : v);
    const shot = (n) => {
      const s = C.shots[n];
      if (!s) return null;
      return { pos: s.pos.map(r4), look: s.look.map(r4), up: (s.up ?? [0, 1, 0]).map(r4), fov: r4(s.fov), shift: (s.shift ?? [0, 0]).map(r4) };
    };
    const o = {};
    for (const n of names) o[n] = shot(n);
    return {
      size: { w: T.size.w, h: T.size.h, iw: window.innerWidth, ih: window.innerHeight, aspect: r4(T.size.w / T.size.h) },
      current: C.current,
      cam: { pos: T.camera.position.toArray().map(r4), fov: r4(T.camera.fov), aspect: r4(T.camera.aspect), view: T.camera.view?.enabled ? [r4(T.camera.view.offsetX), r4(T.camera.view.offsetY)] : null },
      revealSlots: R?.slots?.map((s) => s.map(r4)) ?? null,
      revealFan: R?._fan?.SPREAD ? { tiers: R._fan.SPREAD.tiers.map((t) => ({ r: r4(t.r), phi: r4(t.phi), n: t.n })), card: R._fan.SPREAD.card, lift: R._fan.SPREAD.lift } : null,
      shots: o,
    };
  }, SHOTS);
  out.errs = errs;
  await page.close();
  return out;
}

for (const [w, h] of SIZES) {
  const live = await probe(w, h, false);
  const shot = await probe(w, h, true);
  console.log(`\n#### ${w}x${h}`);
  console.log(`  live  size ${JSON.stringify(live.size)} current=${live.current}`);
  console.log(`  shot1 size ${JSON.stringify(shot.size)} current=${shot.current}`);
  console.log(`  live  cam ${JSON.stringify(live.cam)}`);
  console.log(`  shot1 cam ${JSON.stringify(shot.cam)}`);
  console.log(`  slots same: ${JSON.stringify(live.revealSlots) === JSON.stringify(shot.revealSlots)}  ${JSON.stringify(live.revealSlots)}`);
  console.log(`  fan   same: ${JSON.stringify(live.revealFan) === JSON.stringify(shot.revealFan)}`);
  if (JSON.stringify(live.revealFan) !== JSON.stringify(shot.revealFan)) {
    console.log(`    live  ${JSON.stringify(live.revealFan)}`);
    console.log(`    shot1 ${JSON.stringify(shot.revealFan)}`);
  }
  for (const n of SHOTS) {
    const a = JSON.stringify(live.shots[n]), b = JSON.stringify(shot.shots[n]);
    console.log(`  ${n.padEnd(5)} ${a === b ? 'IDENTICAL' : 'DIFFERENT'}`);
    if (a !== b) {
      console.log(`      live  ${a}`);
      console.log(`      shot1 ${b}`);
    }
  }
  if (live.errs.length) console.log('  live errors:', live.errs.slice(0, 3));
  if (shot.errs.length) console.log('  shot1 errors:', shot.errs.slice(0, 3));
}
await browser.close();
