import sharp from 'sharp';
const files = process.argv.slice(2);
for (const f of files) {
  const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const N = info.width * info.height;
  let ink = 0, paper = 0, mid = 0, colour = 0;
  const lum = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    lum[i] = l;
    if (mx - mn > 26) { colour++; continue; }
    if (l < 60) ink++;
    else if (l > 225) paper++;
    else mid++;
  }
  // speckle: isolated dark pixels whose 4 neighbours are all light
  let speck = 0, darkTotal = 0;
  const W = info.width, H = info.height;
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (lum[i] > 90) continue;
      darkTotal++;
      const n = [lum[i - 1], lum[i + 1], lum[i - W], lum[i + W]];
      if (n.every((v) => v > 160)) speck++;
    }
  console.log(
    f.split('/').pop().padEnd(34),
    'ink', (100 * ink / N).toFixed(1) + '%',
    'mid', (100 * mid / N).toFixed(1) + '%',
    'paper', (100 * paper / N).toFixed(1) + '%',
    'colour', (100 * colour / N).toFixed(1) + '%',
    '| isolated-dark-pixels', (100 * speck / Math.max(1, darkTotal)).toFixed(1) + '% of all dark px',
  );
}
