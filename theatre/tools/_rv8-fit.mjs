#!/usr/bin/env node
// round 8: how far IN the bows can come. Pure geometry, no browser. Sweeps the design (number of
// bows, inner radius, step, the row-clearance rule) and prints, for each: the reach of every bow,
// how many cards it carries at a given pitch, the furthest corner from the table's centre, the
// spread's footprint on the cloth, and the nearest approach to a reading slot.
const CARD = { w: 0.13, h: 0.2275 };
const ROWX = 0.29, ROWZ = 0.256, CLEAR = 0.004;
const TOTAL = 78;

function corners(r, a) {
  const s = Math.sin(a), c = Math.cos(a);
  const u = [s, c], tg = [c, -s];
  const out = [];
  for (const A of [-1, 1]) for (const B of [-1, 1]) out.push([r * s + (A * CARD.h * u[0] + B * CARD.w * tg[0]) / 2, r * c + (A * CARD.h * u[1] + B * CARD.w * tg[1]) / 2]);
  return out;
}
// margin: how much of a card's width is added to the row bar when testing a CORNER.
// round 7 used CARD.w/2, which double-counts (the corner already carries the width).
function clears(r, a, margin) {
  for (const c of corners(r, a)) if (Math.abs(c[0]) <= ROWX + margin && c[1] < ROWZ + CLEAR) return false;
  return true;
}
function reach(r, { margin, xmax, rmax }) {
  let lo = 0, hi = 1.35;
  for (let i = 0; i < 44; i++) {
    const m = (lo + hi) / 2;
    const cs = corners(r, m);
    const ok = clears(r, m, margin) && cs.every((c) => Math.abs(c[0]) <= xmax && Math.hypot(c[0], c[1]) <= rmax);
    if (ok) lo = m; else hi = m;
  }
  return lo;
}
function share(arcs) {
  const sum = arcs.reduce((a, b) => a + b, 0);
  const raw = arcs.map((L) => (TOTAL * L) / sum);
  const n = raw.map((v) => Math.max(6, Math.round(v)));
  let d = TOTAL - n.reduce((a, b) => a + b, 0);
  for (let i = 0; d !== 0; i = (i + 1) % n.length) { n[i] += Math.sign(d); d -= Math.sign(d); }
  return n;
}
// force every bow to an ODD count so each has a keystone card on the axis, keeping the total 78
function odd(ns) {
  const m = ns.slice();
  for (let i = 0; i < m.length; i++) if (m[i] % 2 === 0) m[i] += 1;
  let d = TOTAL - m.reduce((a, b) => a + b, 0);
  // move in twos so the parity survives; take from / give to the longest bows first
  const order = m.map((v, i) => i).sort((a, b) => m[b] - m[a]);
  let k = 0;
  while (d !== 0) {
    const i = order[k % order.length];
    if (d >= 2) { m[i] += 2; d -= 2; }
    else if (d <= -2 && m[i] > 7) { m[i] -= 2; d += 2; }
    else break;
    k++;
  }
  return { ns: m, off: d };
}

function design({ k, r0, step, margin = 0, xmax = 0.425, rmax = 0.60, label = '' }) {
  const rs = Array.from({ length: k }, (_, i) => r0 - i * step);
  const phis = rs.map((r) => reach(r, { margin, xmax, rmax }));
  const arcs = rs.map((r, i) => 2 * phis[i] * r);
  const base = share(arcs);
  const { ns, off } = odd(base);
  if (off !== 0) return null;
  const pitch = ns.map((n, i) => (n > 1 ? arcs[i] / (n - 1) : 0));
  let maxR = 0, maxX = 0, minZ = 9, maxZ = 0, slot = 9;
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < ns[i]; j++) {
      const a = ns[i] > 1 ? -phis[i] + (j * 2 * phis[i]) / (ns[i] - 1) : 0;
      for (const c of corners(rs[i], a)) {
        maxR = Math.max(maxR, Math.hypot(c[0], c[1]));
        maxX = Math.max(maxX, Math.abs(c[0]));
        minZ = Math.min(minZ, c[1]);
        maxZ = Math.max(maxZ, c[1]);
        // distance from this corner to the reading bar (|x|<=0.29, z<=0.256)
        const dx = Math.max(0, Math.abs(c[0]) - ROWX), dz = Math.max(0, c[1] - ROWZ);
        slot = Math.min(slot, Math.hypot(dx, dz));
      }
    }
  }
  // footprint on the cloth: the annular sector each bow sweeps, unioned (approximated on a grid)
  const G = 0.002;
  let area = 0;
  for (let x = -0.62; x <= 0.62; x += G)
    for (let z = -0.62; z <= 0.62; z += G) {
      const rr = Math.hypot(x, z), aa = Math.atan2(x, z);
      for (let i = 0; i < k; i++) {
        if (Math.abs(aa) > phis[i] + 0.28) continue;
        if (rr > rs[i] - CARD.h / 2 && rr < rs[i] + CARD.h / 2) { area += G * G; break; }
      }
    }
  return { label, k, rs, phis, ns, pitch, step, maxR, maxX, minZ, maxZ, slot, area };
}

const fmt = (d) => {
  if (!d) return `${d}`;
  return [
    `${d.label.padEnd(22)} bows ${d.ns.join('/')} `,
    `r ${d.rs.map((r) => r.toFixed(4)).join(' ')}`,
    `phi ${d.phis.map((p) => ((p * 180) / Math.PI).toFixed(1)).join(' ')}deg`,
    `pitch ${d.pitch.map((p) => (p * 1000).toFixed(1)).join('/')}mm  step ${(d.step * 1000).toFixed(1)}mm`,
    `maxCorner ${d.maxR.toFixed(4)} (rim margin ${((0.62 - d.maxR) * 1000).toFixed(0)}mm)  |x| ${d.maxX.toFixed(3)}  z ${d.minZ.toFixed(3)}..${d.maxZ.toFixed(3)}`,
    `slotGap ${(d.slot * 1000).toFixed(1)}mm  footprint ${(d.area * 1e4).toFixed(0)}cm2`,
  ].join('\n   ');
};

console.log('=== round 7, as built (corner margin = w/2) ===');
console.log(fmt(design({ k: 4, r0: 0.452, step: 0.0185, margin: CARD.w / 2, label: 'r7' })));
console.log('\n=== the corner test without the double-counted half-card ===');
for (const [k, r0, step] of [[4, 0.452, 0.0185], [4, 0.44, 0.0185], [4, 0.43, 0.0185], [4, 0.42, 0.0185], [5, 0.44, 0.0185], [5, 0.43, 0.017], [5, 0.425, 0.016], [6, 0.435, 0.0155], [6, 0.43, 0.015], [5, 0.42, 0.015], [6, 0.425, 0.014]]) {
  const d = design({ k, r0, step, margin: 0, label: `k${k} r0=${r0} s=${step}` });
  console.log(d ? fmt(d) : `k${k} r0=${r0} s=${step}  — cannot be shared into odd bows`);
}
