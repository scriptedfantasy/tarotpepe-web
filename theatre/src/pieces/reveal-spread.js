// reveal-spread.js — RETIRED IN PLACE, round 12.
//
// This file held the geometry of the FAN: six nested bows concentric with the round table
// (19·17·15·13·9·5) at 16:9, eight capped bows on a portrait window, every bow odd so that a
// keystone lay whole on the frame's axis, and the pointer's nearest-cell mapping over that
// shingle. The user asked for the fan to go — "what if the users picks directly from the swoosh,
// with all cards layed out messily?" — so there is no arc, no nesting, no keystone and no bow, and
// none of that arithmetic is run by anything any more.
//
// WHERE IT WENT: reveal-wash.js. The seventy-eight now lie in a ragged BAND — the wash pushed out
// under both palms — and the same two questions are answered there: where each card lies
// (`WASH.poses`) and which card is drawn under a point (`indexAt`, the top card whose footprint
// covers it, which is what the eye does). reveal-fan.js, which drew the bows, is deleted;
// reveal-pick.js draws the mass and owns the visitor's pick.
//
// The file itself stays for one reason: the round-8 pointer probe, tools/_rv8-point.mjs, imports
// `indexAt` and `cardCorners` from this path and samples the cloth on a 2 mm grid to check that the
// card that stands up is the card a person would say is on top there. That measurement is the one
// this round must not regress, so the probe keeps working — pointed at the surface that is actually
// out. Nothing in src/ imports this.
export { indexAt, cardCorners, WASH as SPREAD, LIFT as lift } from './reveal-wash.js';

// The bows are gone; the camera's old round-7/8/9 probes read `SPREAD.tiers` and get an empty list,
// which is the truth. The plates are composed on `reveal.tableBounds` now (camera-shots.js →
// tableSubject reads it before anything else).
export const tiers = [];
