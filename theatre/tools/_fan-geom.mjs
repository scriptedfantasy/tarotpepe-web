// Search the fan arc: pivot (0, zp), radius R, half-angle A, 21 cards; every corner on the cloth,
// clear of the deck's footprint and of the slot cards' near edge.
const N = 21, W = 0.13, H = 0.2275;
const TABLE_R = 0.62, MARGIN = 0.012;
const deck = { x0: 0.5 - 0.065 - 0.012, x1: 0.5 + 0.065 + 0.012, z0: 0.26 - 0.114 - 0.012, z1: 0.26 + 0.114 + 0.012 };
const slotNear = 0.14 + H / 2 + 0.012;
function corners(cx, cz, th) {
  const out = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = (sx * W) / 2, z = (sz * H) / 2;
    out.push([cx + x * Math.cos(th) + z * Math.sin(th), cz - x * Math.sin(th) + z * Math.cos(th)]);
  }
  return out;
}
function check(zp, R, A) {
  let span = 0, zmin = 9, ok = true, rmax = 0;
  for (let i = 0; i < N; i++) {
    const th = -A + (2 * A * i) / (N - 1);
    const cx = R * Math.sin(th), cz = zp + R * Math.cos(th);
    for (const [x, z] of corners(cx, cz, th)) {
      const r = Math.hypot(x, z);
      rmax = Math.max(rmax, r);
      if (r > TABLE_R - MARGIN) ok = false;
      if (x > deck.x0 && x < deck.x1 && z > deck.z0 && z < deck.z1) ok = false;
      if (z < slotNear) ok = false;
      span = Math.max(span, Math.abs(x));
      zmin = Math.min(zmin, z);
    }
  }
  return { ok, span, zmin, rmax, spacing: (R * 2 * A) / (N - 1) };
}
const best = [];
for (let zMid = 0.36; zMid <= 0.46; zMid += 0.01)
  for (let R = 0.3; R <= 3; R += 0.05)
    for (let A = 0.1; A <= 1.2; A += 0.01) {
      const zp = zMid - R;
      const c = check(zp, R, A);
      if (c.ok && c.spacing >= 0.018) best.push({ zMid: +zMid.toFixed(2), R: +R.toFixed(2), A: +A.toFixed(2), ...c });
    }
best.sort((a, b) => b.span - a.span);
for (const b of best.slice(0, 12)) console.log(JSON.stringify(b));
