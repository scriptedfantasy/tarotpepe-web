// throwaway (camera round 9): why did the camera not answer the card landing?
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e)));
page.on('console', (m) => console.log('C:', m.text()));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/?view=reveal&state=fan&shot=1', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });
await page.waitForTimeout(1500);
console.log(await page.evaluate(() => {
  const T = window.__theatre, R = T.pieces.reveal;
  return {
    hasEntries: Array.isArray(R?._fan?.entries), n: R?._fan?.entries?.length,
    slots: R?.slots?.length, picks: R?.picks?.length,
    drawn: T.pieces.cards?.drawn?.children?.length,
    camFov: T.camera.fov, current: T.pieces.camera.current,
    fanFov: T.pieces.camera.shots.fan.fov,
  };
}));
await page.evaluate(() => {
  const R = window.__theatre.pieces.reveal, f = R._fan;
  f.fakePicks([f.keystoneIndex]);
  R.picks.push({ index: f.keystoneIndex, ordinal: 1, slug: 'x', slot: 0, mesh: null });
});
await page.waitForTimeout(6000);
console.log(await page.evaluate(() => {
  const T = window.__theatre, R = T.pieces.reveal;
  return {
    removed: (R?._fan?.entries ?? []).filter((e) => e.removed).length,
    picks: R?.picks?.length, drawn: T.pieces.cards?.drawn?.children?.length,
    camFov: T.camera.fov, camZ: T.camera.position.z, fanFov: T.pieces.camera.shots.fan.fov,
  };
}));
await browser.close();
