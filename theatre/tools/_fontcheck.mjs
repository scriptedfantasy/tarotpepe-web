// throwaway: which serif/typewriter faces exist in the judging browser
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('about:blank');
const names = [
  'American Typewriter', 'Courier New', 'Courier', 'Rockwell', 'Georgia', 'Times New Roman',
  'Baskerville', 'Palatino', 'Hoefler Text', 'Didot', 'Bodoni 72', 'Iowan Old Style',
  'Charter', 'Superclarendon', 'Chalkboard', 'Optima', 'Futura', 'Jost', 'Menlo', 'Monaco',
  'Nimbus Roman', 'Liberation Serif', 'DejaVu Serif', 'Times', 'Marker Felt', 'Noteworthy',
];
const res = await page.evaluate((names) => {
  const c = document.createElement('canvas').getContext('2d');
  const base = ['monospace', 'sans-serif', 'serif'];
  const text = 'MWQ@ithe quick 1234';
  const widths = {};
  for (const b of base) { c.font = `48px ${b}`; widths[b] = c.measureText(text).width; }
  const out = {};
  for (const n of names) {
    out[n] = base.some((b) => { c.font = `48px "${n}", ${b}`; return Math.abs(c.measureText(text).width - widths[b]) > 0.5; });
  }
  return out;
}, names);
console.log(JSON.stringify(res, null, 1));
await browser.close();
