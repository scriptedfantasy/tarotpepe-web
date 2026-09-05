#!/usr/bin/env node
// round 8, part four: the NARROWEST spread that still shows a proper strip of every card. A
// narrower spread is the whole answer to "make them more central" on a phone: the portrait plate
// is limited by the spread's width, so every millimetre off |x| is a millimetre the lens can spend
// making the cards bigger.
const CARD = { w: 0.13, h: 0.2275 };
const ROWX = 0.29, CLEAR = 0.004, ROWZ = 0.256;
const TOTAL = 78;
const corners = (r, a) => {
  const s = Math.sin(a), c = Math.cos(a);
  const out = [];
  for (const A of [-1, 1]) for (const B of [-1, 1]) out.push([r * s + (A * CARD.h * s + B * CARD.w * c) / 2, r * c + (A * CARD.h * c - B * CARD.w * s) / 2]);
  return out;
};
function reach(r) {
  let lo = 0, hi = 1.35;
  for (let i = 0; i < 44; i++) {
    const m = (lo + hi) / 2, cs = corners(r, m);
    const ok = cs.every((c) => !(Math.abs(c[0]) <= ROWX + CARD.w / 2 && c[1] < ROWZ + CLEAR)) && cs.every((c) => Math.abs(c[0]) <= 0.425 && Math.hypot(c[0], c[1]) <= 0.60);
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
const MINP = +(process.argv[2] ?? 18) / 1000; // the along-bow pitch floor, mm
const MINS = +(process.argv[3] ?? 12) / 1000; // the sliver each inner bow shows, mm
const outs = [];
for (let k = 3; k <= 9; k++)
  for (let step = MINS; step <= 0.024001; step += 0.0005)
    for (let rIn = 0.372; rIn <= 0.430; rIn += 0.001) {
      const rs = Array.from({ length: k }, (_, i) => rIn + (k - 1 - i) * step);
      const phis = rs.map(reach);
      if (phis.some((p) => p < 0.05)) continue;
      const arcs = rs.map((r, i) => 2 * phis[i] * r);
      const ns = shareOdd(arcs);
      if (!ns) continue;
      const pitch = ns.map((n, i) => arcs[i] / (n - 1));
      if (Math.min(...pitch) < MINP) continue;
      let maxR = 0, maxX = 0, minZ = 9, maxZ = 0;
      for (let i = 0; i < k; i++)
        for (let j = 0; j < ns[i]; j++) {
          const a = -phis[i] + (j * 2 * phis[i]) / (ns[i] - 1);
          for (const c of corners(rs[i], a)) { maxR = Math.max(maxR, Math.hypot(c[0], c[1])); maxX = Math.max(maxX, Math.abs(c[0])); minZ = Math.min(minZ, c[1]); maxZ = Math.max(maxZ, c[1]); }
        }
      // what a 390x760 portrait plate can give the cards if it frames the spread + the reading row
      const boxW = 2 * maxX, boxH = maxZ - 0.02;
      const pxPerM = Math.min(390 / boxW, 760 / boxH);
      outs.push({ k, step, rs, phis, ns, pitch, maxR, maxX, minZ, maxZ, minPitch: Math.min(...pitch), pxPerM, cardPx: pxPerM * CARD.w });
    }
outs.sort((a, b) => b.pxPerM - a.pxPerM);
const seen = new Set();
let printed = 0;
for (const d of outs) {
  const key = d.ns.join('-');
  if (seen.has(key)) continue;
  seen.add(key);
  console.log(
    `k${d.k} step ${(d.step * 1000).toFixed(1)}  r ${d.rs.map((r) => r.toFixed(4)).join(' ')}  n ${d.ns.join('/')}  pitch ${d.pitch.map((p) => (p * 1000).toFixed(1)).join('/')}  rim+${((0.62 - d.maxR) * 1000).toFixed(0)}mm  |x|${d.maxX.toFixed(3)}  z ${d.minZ.toFixed(3)}..${d.maxZ.toFixed(3)}  phone ${d.pxPerM.toFixed(0)}px/m card ${d.cardPx.toFixed(0)}px`,
  );
  if (++printed >= 12) break;
}
