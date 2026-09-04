// Search the fan arc again, for round 4: the ribbon has to COMPOSE inside the overhead frame
// (a wide 16:9 in which the slot row sits a third of the way down and the fan two thirds), not
// merely fit on the cloth. So the objective changed: spread as WIDE as the slot row while keeping
// the near edge off the table's rim, and rake the cards harder than the arc so it reads as a fan
// and not as a flat row.
//
//   node tools/_fan-geom2.mjs [zNearMax]
const N = 21, W = 0.13, H = 0.2275;
const TABLE_R = 0.62, MARGIN = 0.016;
const slotNear = 0.14 + H / 2 + 0.010; // the near edge of a card in a slot, plus a hair
const HOVER = 0.026; // the hovered card slides this far toward the visitor
const zNearMax = +(process.argv[2] ?? 0.575);

function corners(cx, cz, yaw) {
  const out = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = (sx * W) / 2, z = (sz * H) / 2;
    out.push([cx + x * Math.cos(yaw) + z * Math.sin(yaw), cz - x * Math.sin(yaw) + z * Math.cos(yaw)]);
  }
  return out;
}
function check(zMid, R, A, rake) {
  const zp = zMid - R;
  let span = 0, zmin = 9, zmax = -9, ok = true, rmax = 0;
  for (let i = 0; i < N; i++) {
    const th = -A + (2 * A * i) / (N - 1);
    const cx = R * Math.sin(th), cz = zp + R * Math.cos(th);
    // the hover slides a card out along the arc's radius: allow for it on every card
    for (const s of [0, HOVER]) {
      for (const [x, z] of corners(cx + s * Math.sin(th), cz + s * Math.cos(th), th * rake)) {
        const r = Math.hypot(x, z);
        rmax = Math.max(rmax, r);
        if (r > TABLE_R - MARGIN) ok = false;
        if (z < slotNear) ok = false;
        span = Math.max(span, Math.abs(x));
        zmin = Math.min(zmin, z);
        zmax = Math.max(zmax, z);
      }
    }
  }
  return { ok, span, zmin, zmax, rmax, spacing: (R * 2 * A) / (N - 1), endRake: A * rake };
}
const best = [];
for (let zMid = 0.34; zMid <= 0.48; zMid += 0.005)
  for (let R = 0.4; R <= 3.2; R += 0.02)
    for (let A = 0.08; A <= 1.0; A += 0.01)
      for (const rake of [1.0, 1.3, 1.6, 1.9, 2.2]) {
        const c = check(zMid, R, A, rake);
        if (!c.ok || c.spacing < 0.019 || c.zmax > zNearMax) continue;
        if (c.endRake < 0.42 || c.endRake > 0.72) continue; // it must read as a fan, not a flat row
        best.push({ zMid: +zMid.toFixed(3), R: +R.toFixed(2), A: +A.toFixed(2), rake, span: +c.span.toFixed(3), z: [+c.zmin.toFixed(3), +c.zmax.toFixed(3)], depth: +(c.zmax - c.zmin).toFixed(3), rmax: +c.rmax.toFixed(3), sp: +c.spacing.toFixed(4), rake_end: +c.endRake.toFixed(2) });
      }
best.sort((a, b) => b.span - a.span || a.depth - b.depth);
console.log(`zNearMax ${zNearMax} — ${best.length} candidates`);
for (const b of best.slice(0, 14)) console.log(JSON.stringify(b));
