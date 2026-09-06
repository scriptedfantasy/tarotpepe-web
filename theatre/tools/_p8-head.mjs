// r8 scratch: the head box of each pose plate (the green mass above the collar), so the standing
// figure can be scaled to the head the seated cut-out already has, rather than to a guess.
import sharp from 'sharp';
const D = new URL('../public/', import.meta.url).pathname;
const files = ['pepe-walking-1', 'pepe-walking-2', 'pepe-walking-3', 'pepe-walking-4', 'pepe-standing', 'pepe-standing-2', 'pepe-standing-3', 'pepe-watering', 'pepe-standing-one-arm-forward', 'pepe-crouching'];
for (const f of files) {
  const { data, info } = await sharp(D + f + '.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  // green mask + ink box
  const green = new Uint8Array(W * H);
  let iy0 = H;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      const r = data[o], g = data[o + 1], b = data[o + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < 235 && y < iy0) iy0 = y;
      if (g > r + 16 && g > b + 16 && lum > 40) green[y * W + x] = 1;
    }
  // walk down from the crown: the head's green run per row. The neck is the row where the run
  // narrows to less than 45% of the widest run so far (the jaw ends and the collar begins).
  let widest = 0, neck = -1, hx0 = W, hx1 = -1, crown = -1;
  const rowRun = (y) => {
    let a = W, b = -1;
    for (let x = 0; x < W; x++) if (green[y * W + x]) { if (x < a) a = x; if (x > b) b = x; }
    return b < 0 ? null : [a, b];
  };
  for (let y = iy0; y < H; y++) {
    const r = rowRun(y);
    if (!r) continue;
    if (crown < 0) crown = y;
    const w = r[1] - r[0] + 1;
    if (w > widest) { widest = w; hx0 = r[0]; hx1 = r[1]; }
    if (widest > 80 && w < widest * 0.45) { neck = y; break; }
  }
  console.log(f.padEnd(32), `crown ${crown} neck ${neck} head ${widest}x${neck - crown} at x ${hx0}..${hx1} (mid ${((hx0 + hx1) / 2).toFixed(0)})`);
}
