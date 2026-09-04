// throwaway (round 5): does a window that changes shape re-frame the shot it is holding?
import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
await p.goto('http://127.0.0.1:5173/?view=camera&state=fan&shot=1', { waitUntil: 'load' });
for (let i = 0; i < 200; i++) {
  if (await p.evaluate(() => window.__theatreReady === true).catch(() => 0)) break;
  await p.waitForTimeout(250);
}
const read = () =>
  p.evaluate(() => ({
    shot: window.__theatre.pieces.camera.current,
    fov: +window.__theatre.camera.fov.toFixed(1),
    y: +window.__theatre.camera.position.y.toFixed(2),
    offY: +(window.__theatre.camera.view?.offsetY ?? 0).toFixed(0),
    h: innerHeight,
    w: innerWidth,
    csize: window.__theatre.size,
  }));
console.log('1600x900 ', JSON.stringify(await read()));
await p.setViewportSize({ width: 390, height: 760 });
await p.waitForTimeout(1500);
console.log('390x760  ', JSON.stringify(await read()));
await p.setViewportSize({ width: 1200, height: 1100 });
await p.waitForTimeout(1500);
console.log('1200x1100', JSON.stringify(await read()));
console.log(errs.length ? 'PAGE ERRORS: ' + errs[0] : 'no page errors');
await b.close();
