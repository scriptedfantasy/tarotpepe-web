// r8 scratch: read the walk cycle off the user's drawings. For each plate, find the feet (green
// blobs low on the page), the figure's ink box, and a body centre — so the travel per drawing can
// be set to what the DRAWING says the stride is, rather than to a number that looks about right.
import sharp from 'sharp';

const D = new URL('../public/', import.meta.url).pathname;
const files = process.argv.slice(2).length ? process.argv.slice(2) : ['pepe-walking-1', 'pepe-walking-2', 'pepe-walking-3', 'pepe-walking-4', 'pepe-standing', 'pepe-standing-2', 'pepe-watering', 'pepe-standing-one-arm-forward', 'pepe-crouching'];

for (const f of files) {
  const { data, info } = await sharp(D + f + '.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const green = new Uint8Array(W * H);
  let ix0 = W, ix1 = -1, iy0 = H, iy1 = -1;
  // the head: green above the collar. the feet: green below 0.8 of the figure.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      const r = data[o], g = data[o + 1], b = data[o + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < 235) { if (x < ix0) ix0 = x; if (x > ix1) ix1 = x; if (y < iy0) iy0 = y; if (y > iy1) iy1 = y; }
      if (g > r + 16 && g > b + 16 && lum > 40) green[y * W + x] = 1;
    }
  // flood the green into blobs, keeping only those in the bottom fifth of the figure
  const yCut = Math.round(iy0 + (iy1 - iy0) * 0.82);
  const seen = new Uint8Array(W * H);
  const blobs = [];
  for (let y = yCut; y <= iy1; y++)
    for (let x = 0; x < W; x++) {
      const k = y * W + x;
      if (!green[k] || seen[k]) continue;
      const st = [x, y];
      seen[k] = 1;
      let bx0 = x, bx1 = x, by0 = y, by1 = y, n = 0, sx = 0;
      while (st.length) {
        const cy = st.pop(), cx = st.pop();
        n++;
        sx += cx;
        if (cx < bx0) bx0 = cx; if (cx > bx1) bx1 = cx;
        if (cy < by0) by0 = cy; if (cy > by1) by1 = cy;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const q = ny * W + nx;
          if (green[q] && !seen[q]) { seen[q] = 1; st.push(nx, ny); }
        }
      }
      if (n > 900) blobs.push({ x0: bx0, x1: bx1, y0: by0, y1: by1, n, cx: Math.round(sx / n) });
    }
  blobs.sort((a, b) => a.cx - b.cx);
  // the head's centre: mid of the green run on the row a tenth down the figure
  const hy = Math.round(iy0 + (iy1 - iy0) * 0.08);
  let hx0 = W, hx1 = -1;
  for (let x = 0; x < W; x++) if (green[hy * W + x]) { if (x < hx0) hx0 = x; if (x > hx1) hx1 = x; }
  console.log(
    f.padEnd(32),
    `ink ${ix0},${iy0} ${ix1 - ix0 + 1}x${iy1 - iy0 + 1} base ${iy1}`,
    `head ${((hx0 + hx1) / 2).toFixed(0)}`,
    'feet:',
    blobs.map((b) => `[${b.x0}-${b.x1} c${b.cx} bot${b.y1}]`).join(' '),
  );
}
