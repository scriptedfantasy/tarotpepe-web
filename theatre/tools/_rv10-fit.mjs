#!/usr/bin/env node
// reveal round 10: THE NARROWEST SPREAD FOR A PORTRAIT WINDOW. Round 8's sweep (_rv8-fit4) took the
// bows as wide as the reading row would let them and nested for width; on a phone the plate is
// bound by the spread's WIDTH alone (camera round 9: "the subject's depth never binds below aspect
// ~1.15"), so every millimetre off |x| is a millimetre the lens spends making the cards bigger, and
// the depth it costs is depth the frame was wasting.
//
// So this sweep adds the one degree of freedom round 8 never used: a CAP ON |x| tighter than the
// row's own limit. A capped bow is a shorter bow, so the 78 cards need more bows, which is the
// "deeper" half of the same change.
//   node tools/_rv10-fit.mjs [minPitch mm] [minStep mm] [minRim mm]
const CARD = { w: 0.13, h: 0.2275 };
const ROWX = 0.29, CLEAR = 0.004, ROWZ = 0.256;
const TOTAL = 78;
const RIM = 0.62;
const corners = (r, a) => {
  const s = Math.sin(a), c = Math.cos(a), out = [];
  for (const A of [-1, 1]) for (const B of [-1, 1]) out.push([r * s + (A * CARD.h * s + B * CARD.w * c) / 2, r * c + (A * CARD.h * c - B * CARD.w * s) / 2]);
  return out;
};
// how far a bow may run: the reading row on the inside, the cap X on the outside, the rim always
function reach(r, X) {
  let lo = 0, hi = 1.35;
  for (let i = 0; i < 44; i++) {
    const m = (lo + hi) / 2, cs = corners(r, m);
    const ok = cs.every((c) => !(Math.abs(c[0]) <= ROWX + CARD.w / 2 && c[1] < ROWZ + CLEAR)) && cs.every((c) => Math.abs(c[0]) <= X && Math.hypot(c[0], c[1]) <= 0.60);
    if (ok) lo = m; else hi = m;
  }
  return lo;
}
function shareOdd(arcs) {
  const sum = arcs.reduce((a, b) => a + b, 0);
  let n = arcs.map((L) => Math.max(5, Math.round((TOTAL * L) / sum)));
  n = n.map((v) => (v % 2 ? v : v + 1));
  let d = TOTAL - n.reduce((a, b) => a + b, 0);
  const byArc = n.map((_, i) => i).sort((a, b) => arcs[b] - arcs[a]);
  let k = 0, g = 0;
  while (d !== 0 && g++ < 400) {
    const i = byArc[k++ % byArc.length];
    if (d >= 2) { n[i] += 2; d -= 2; }
    else if (d <= -2 && n[i] > 7) { n[i] -= 2; d += 2; }
    else break;
  }
  return d === 0 ? n : null;
}
const MINP = +(process.argv[2] ?? 22) / 1000;
const MINSPX = +(process.argv[3] ?? 8); // the sliver each inner bow shows, IN SCREEN PIXELS on a phone
const MINRIM = +(process.argv[4] ?? 36) / 1000;
const W = 390, H = 760;
const outs = [];
for (let k = 4; k <= 11; k++)
  for (let step = 0.0090; step <= 0.020001; step += 0.0005)
    for (let rIn = 0.378; rIn <= 0.432; rIn += 0.001)
      for (let X = 0.17; X <= 0.330001; X += 0.002) {
        const rs = Array.from({ length: k }, (_, i) => rIn + (k - 1 - i) * step);
        if (RIM - Math.hypot(rs[0] + CARD.h / 2, CARD.w / 2) < MINRIM) continue;
        const phis = rs.map((r) => reach(r, X));
        if (phis.some((p) => p < 0.05)) continue;
        const arcs = rs.map((r, i) => 2 * phis[i] * r);
        const ns = shareOdd(arcs);
        if (!ns) continue;
        const pitch = ns.map((n, i) => arcs[i] / (n - 1));
        if (Math.min(...pitch) < MINP) continue;

        let maxR = 0, maxX = 0, minZ = 9, maxZ = 0, slotClear = 9;
        for (let i = 0; i < k; i++)
          for (let j = 0; j < ns[i]; j++) {
            const a = -phis[i] + (j * 2 * phis[i]) / (ns[i] - 1);
            for (const c of corners(rs[i], a)) {
              maxR = Math.max(maxR, Math.hypot(c[0], c[1]));
              maxX = Math.max(maxX, Math.abs(c[0]));
              minZ = Math.min(minZ, c[1]); maxZ = Math.max(maxZ, c[1]);
              if (Math.abs(c[0]) <= ROWX + CARD.w / 2) slotClear = Math.min(slotClear, c[1] - ROWZ);
            }
          }
        if (slotClear < 0.004) continue;
        // what a portrait plate can give the cards: it holds the spread's width with the margin the
        // round-9 fan plate keeps (measured live: 0.696 m of cloth across a 0.634 m spread)
        const MARGIN = 0.696 / 0.634;
        const boxW = 2 * maxX * MARGIN, boxH = maxZ - minZ + 0.030;
        const pxPerM = Math.min(W / boxW, H / boxH);
        if (step * pxPerM < MINSPX) continue;
        outs.push({ k, step, rs, phis, ns, pitch, maxR, maxX, minZ, maxZ, slotClear, minPitch: Math.min(...pitch), pxPerM, cardPx: pxPerM * CARD.w, rim: RIM - maxR });
      }
outs.sort((a, b) => b.pxPerM - a.pxPerM);
const seen = new Set();
let printed = 0;
for (const d of outs) {
  const key = `${d.ns.join('-')}|${(d.step * 1000).toFixed(1)}`;
  if (seen.has(key)) continue;
  seen.add(key);
  console.log(
    `k${d.k} step ${(d.step * 1000).toFixed(1)}  rIn ${d.rs[d.rs.length - 1].toFixed(3)}  n ${d.ns.join('/')}  pitch ${d.pitch.map((p) => (p * 1000).toFixed(0)).join('/')}  rim+${(d.rim * 1000).toFixed(0)}mm sliver ${(d.step * d.pxPerM).toFixed(1)}px  slot+${(d.slotClear * 1000).toFixed(1)}mm  |x|${d.maxX.toFixed(3)}  z ${d.minZ.toFixed(3)}..${d.maxZ.toFixed(3)}  phone ${d.pxPerM.toFixed(0)}px/m card ${d.cardPx.toFixed(0)}px`,
  );
  if (++printed >= 14) break;
}
console.log(`(${outs.length} candidates; pitch>=${MINP * 1000}mm sliver>=${MINSPX}px rim>=${MINRIM * 1000}mm)`);
