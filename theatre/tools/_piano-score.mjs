#!/usr/bin/env node
// WHERE piano-song.js's TABLE CAME FROM, and how to get it again.
//
// Gymnopédie No. 1 is Satie's, 1888, and out of copyright everywhere. The transcription in
// src/pieces/piano-song.js is not typed from memory and it is not typed off a picture: it is
// PARSED, here, from the Mutopia Project's LilyPond engraving of the piece —
//
//   https://www.mutopiaproject.org/ftp/SatieE/gymnopedie_1/gymnopedie_1.ly   (5.6 kB)
//   https://www.mutopiaproject.org/ftp/SatieE/gymnopedie_1/gymnopedie_1.mid  (2.9 kB)
//
// — which carries `license = "Public Domain"`, `source = "Dover Edition"` (a reproduction of the
// original engraving) and `date = "1888"`, and whose three voices are the three things on the page:
// `top` the melody, `middle` the accompaniment's chords, `bottom` the bass.
//
// AND IT IS CHECKED AGAINST A SECOND RENDERING OF THE SAME SOURCE. LilyPond's own MIDI output of
// that file is downloaded too, and every note-on this parser produces — pitch and beat, all 282 of
// them over the 47 written bars — has to match LilyPond's, exactly, or this tool fails. Two
// different programs reading one public-domain engraving and agreeing on every onset is the only
// answer I can give to «is this really the piece».
//
// THE VOLTA. The engraving is 47 bars on the page: 31 bars of body, then a first ending of 8 and a
// second of 8. Played, that is body, first ending, body, second ending — 31 + 8 + 31 + 8 = 78 bars,
// which is the length the piece is always quoted at. (LilyPond's MIDI does NOT unfold it, which is
// why the check above is against the 47 written bars and the unfolding is done here.)
//
//   node tools/_piano-score.mjs              # fetch if needed, parse, check, print the table
//   node tools/_piano-score.mjs --diff       # …and diff the result against piano-song.js's NOTES
//   node tools/_piano-score.mjs --bars 1-16  # print those bars, note by note, for reading by eye
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const DIR = args.dir ?? '/tmp/piano';
const LY = path.join(DIR, 'gymnopedie_1.ly');
const MID = path.join(DIR, 'gymnopedie_1.mid');
const URL = 'https://www.mutopiaproject.org/ftp/SatieE/gymnopedie_1/';
fs.mkdirSync(DIR, { recursive: true });
for (const [f, u] of [[LY, URL + 'gymnopedie_1.ly'], [MID, URL + 'gymnopedie_1.mid']]) {
  if (fs.existsSync(f)) continue;
  console.log(`fetching ${u}`);
  execFileSync('curl', ['-sSf', '-m', '60', '-o', f, u]);
}

// ---- the LilyPond, read the way LilyPond reads it -----------------------------------------------
const SRC = fs.readFileSync(LY, 'utf8');

function block(name) {
  const i = SRC.indexOf(name + ' = ');
  if (i < 0) throw new Error('no voice named ' + name);
  const j = SRC.indexOf('{', i);
  let d = 0;
  for (let k = j; k < SRC.length; k++) {
    if (SRC[k] === '{') d++;
    else if (SRC[k] === '}') { d--; if (d === 0) return SRC.slice(j + 1, k); }
  }
  throw new Error('unbalanced braces in ' + name);
}

// Everything that is not a note: markup, engraver overrides, bar checks, staff changes, stems,
// dynamics, hairpins, slurs. A rest keeps its pitch (`e4\rest` is a rest DRAWN on the e line, and
// LilyPond's relative octaves count it), so \rest is kept as a marker and dealt with below.
function clean(t) {
  t = t.replace(/%.*$/gm, '');
  for (;;) {
    const i = t.indexOf('\\markup');
    if (i < 0) break;
    const j = t.indexOf('{', i);
    let d = 0, k = j;
    for (; k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}') { d--; if (!d) break; } }
    t = t.slice(0, i) + t.slice(k + 1);
  }
  t = t.replace(/\^|_(?=\\)/g, ' ');
  t = t.replace(/\\once\\override\s+\S+\s*=\s*\S+/g, ' ');
  t = t.replace(/\\override\s+\S+\s*=\s*\S+/g, ' ');
  t = t.replace(/\\barNumberCheck\s*#\d+/g, ' ');
  t = t.replace(/\\bar\s+"[^"]*"/g, ' ');
  t = t.replace(/\\change\s+Staff\s*=\s*\w+/g, ' ');
  t = t.replace(/\\context\s+\w+\s*=\s*"[^"]*"/g, ' ');
  t = t.replace(/\\(dynamicUp|stemUp|stemDown|slurUp|slurDown)\b/g, ' ');
  t = t.replace(/\\(ppp|pp|p|mp|mf|fff|ff|f)(?![a-zA-Z])/g, ' ');
  t = t.replace(/\\[<>!]/g, ' ');
  t = t.replace(/[()]/g, ' ');
  t = t.replace(/\\rest\b/g, '#REST#');
  t = t.replace(/</g, ' < ').replace(/>/g, ' > ');
  t = t.replace(/\s+<\s+<\s+/g, ' << ').replace(/\s+>\s+>\s+/g, ' >> ');
  return t.replace(/\{/g, ' { ').replace(/\}/g, ' } ');
}

const STEP = { c: 0, d: 1, e: 2, f: 3, g: 4, a: 5, b: 6 };
const SEMI = [0, 2, 4, 5, 7, 9, 11];
function pitch(tok) {
  const m = /^([a-g])((?:is|es)*)((?:[',]*))(.*)$/.exec(tok);
  if (!m) return null;
  let alt = 0;
  for (const a of m[2].match(/is|es/g) || []) alt += a === 'is' ? 1 : -1;
  let marks = 0;
  for (const c of m[3]) marks += c === "'" ? 1 : -1;
  return { step: STEP[m[1]], alt, marks, tail: m[4] };
}
// \relative: the octave is the one that puts the new note within a FOURTH of the one before it,
// and then the ' and , marks move it from there. (This is the rule that makes bar 13's `fis'` an
// octave above bar 12's `fis`, and it is why the melody's long F♯ is F♯4 and not F♯5.)
function relOct(ref, step, marks) {
  let oct = ref.oct, d = oct * 7 + step - (ref.oct * 7 + ref.step);
  while (d > 3) { oct--; d -= 7; }
  while (d < -3) { oct++; d += 7; }
  return oct + marks;
}
const midiOf = (oct, step, alt) => 12 * (oct + 1) + SEMI[step] + alt;
const durOf = (s) => {
  const m = /^(\d+)(\.*)/.exec(s);
  if (!m) return null;
  let beats = 4 / Number(m[1]), add = beats;
  for (let i = 0; i < m[2].length; i++) { add /= 2; beats += add; }
  return beats;
};

function parseVoice(text, relStart) {
  const toks = clean(text).split(/\s+/).filter(Boolean);
  const p0 = pitch(relStart);
  let ref = { oct: 3 + p0.marks, step: p0.step };
  const out = [];
  let t = 0, lastDur = 1, tie = false, chord = null, simul = null, i = 0;
  const stack = [];
  while (i < toks.length) {
    const tk = toks[i++];
    if (tk === '\\repeat') { i += 2; continue; }
    if (tk === '\\alternative' || tk === '|' || tk === '#REST#') continue;
    if (tk === '{') { stack.push(t); continue; }
    if (tk === '}') {
      stack.pop();
      if (simul && simul.depth === stack.length) { simul.ends.push(t); t = simul.start; }
      continue;
    }
    if (tk === '<<') { simul = { start: t, ends: [], depth: stack.length }; continue; }
    if (tk === '>>') { simul.ends.push(t); t = Math.max(...simul.ends); simul = null; continue; }
    if (tk === '<') { chord = { notes: [] }; continue; }
    if (tk === '>') {
      const d = durOf(toks[i] ?? '') ?? lastDur;
      if (durOf(toks[i] ?? '') != null) { lastDur = d; i++; }
      for (const n of chord.notes) out.push({ m: n, at: t, len: d });
      ref = chord.ref;
      t += d;
      chord = null;
      continue;
    }
    if (tk === '~') { tie = true; continue; }
    if (/^[Rrs](\d|$)/.test(tk)) { const d = durOf(tk.slice(1)) ?? lastDur; lastDur = d; t += d; continue; }
    const p = pitch(tk);
    if (!p) { if (tk.startsWith('\\')) continue; throw new Error('unparsed token: ' + tk); }
    const isRest = toks[i] === '#REST#' || p.tail.includes('#REST#');
    let d = durOf(p.tail.replace('#REST#', ''));
    if (d == null) d = lastDur; else lastDur = d;
    if (chord) {
      const base = chord.notes.length ? chord.last : ref;
      const oct = relOct(base, p.step, p.marks);
      chord.notes.push(midiOf(oct, p.step, p.alt));
      chord.last = { oct, step: p.step };
      if (chord.notes.length === 1) chord.ref = { oct, step: p.step };
      continue;
    }
    const oct = relOct(ref, p.step, p.marks);
    ref = { oct, step: p.step };
    if (isRest) { if (toks[i] === '#REST#') i++; t += d; continue; }
    const m = midiOf(oct, p.step, p.alt);
    if (tie) {
      const prev = [...out].reverse().find((n) => n.m === m && Math.abs(n.at + n.len - t) < 1e-9);
      if (!prev) throw new Error(`a tie at beat ${t} with nothing to tie to`);
      prev.len += d;
      tie = false;
    } else out.push({ m, at: t, len: d });
    t += d;
  }
  return out;
}

const voices = {
  melody: parseVoice(block('top'), "c''"),
  chords: parseVoice(block('middle'), "c'"),
  bass: parseVoice(block('bottom'), 'c'),
};

// ---- the check: every onset against LilyPond's own MIDI of the same file -------------------------
function midiNotes(file) {
  const buf = fs.readFileSync(file);
  let p = 0;
  const str = (n) => { const s = buf.toString('latin1', p, p + n); p += n; return s; };
  const u32 = () => { const v = buf.readUInt32BE(p); p += 4; return v; };
  const u16 = () => { const v = buf.readUInt16BE(p); p += 2; return v; };
  if (str(4) !== 'MThd') throw new Error('not a MIDI file');
  const hlen = u32(); u16(); const ntrk = u16(); const div = u16();
  p += hlen - 6;
  const ons = [];
  for (let t = 0; t < ntrk; t++) {
    if (str(4) !== 'MTrk') throw new Error('bad track');
    const len = u32(); // (read first: `p + u32()` would take p from before the read)
    const end = p + len;
    let tick = 0, running = 0;
    const vlq = () => { let v = 0, b; do { b = buf[p++]; v = (v << 7) | (b & 0x7f); } while (b & 0x80); return v; };
    while (p < end) {
      tick += vlq();
      let st = buf[p];
      if (st & 0x80) { p++; running = st; } else st = running;
      if (st === 0xff) { p++; const l = vlq(); p += l; continue; }
      if (st === 0xf0 || st === 0xf7) { const l = vlq(); p += l; continue; }
      const type = st & 0xf0;
      if (type === 0xc0 || type === 0xd0) { p++; continue; }
      const d1 = buf[p++], d2 = buf[p++];
      if (type === 0x90 && d2 > 0) ons.push({ m: d1, at: tick / div });
    }
    p = end;
  }
  return ons;
}
const key = (n) => `${n.at.toFixed(4)}:${n.m}`;
const ours = Object.values(voices).flat().map(key).sort();
const theirs = midiNotes(MID).map(key).sort();
const onlyOurs = ours.filter((x) => !theirs.includes(x));
const onlyTheirs = theirs.filter((x) => !ours.includes(x));
console.log(`onsets: ${ours.length} parsed, ${theirs.length} in LilyPond's MIDI, ${onlyOurs.length + onlyTheirs.length} disagreements`);
if (onlyOurs.length || onlyTheirs.length) {
  console.log('  only in the parse:', onlyOurs.slice(0, 12));
  console.log('  only in the MIDI :', onlyTheirs.slice(0, 12));
  process.exit(1);
}

// ---- the table, in the shape piano-song.js holds it ----------------------------------------------
// The accompaniment IS a pattern and the table says so: a bass on beat 1 that lasts the bar, and a
// chord on beat 2 that lasts two beats. Two bars of the 47 break it (the 37th, and the 45th, which
// is the same bar in the other ending), where the bass walks in quarters under a pair of quarter
// chords; those two are written out in full.
const BARS_WRITTEN = 47;
const bar = (n, b) => n.filter((x) => x.at >= b * 3 - 1e-9 && x.at < b * 3 + 3 - 1e-9);
const rel = (x, b) => +(x.at - b * 3).toFixed(3);
const tables = { BASS: [], CHORD: [], MELODY: [], ODD: {} };
for (let b = 0; b < BARS_WRITTEN; b++) {
  const bs = bar(voices.bass, b), ch = bar(voices.chords, b), me = bar(voices.melody, b);
  const plain =
    bs.every((x) => rel(x, b) === 0 && x.len === 3) &&
    ch.every((x) => rel(x, b) === 1 && x.len === 2);
  tables.BASS.push(plain ? bs.map((x) => x.m).sort((p, q) => p - q) : null);
  tables.CHORD.push(plain ? ch.map((x) => x.m).sort((p, q) => p - q) : null);
  if (!plain) tables.ODD[b + 1] = [...bs, ...ch].map((x) => [rel(x, b), x.len, x.m]).sort((p, q) => p[0] - q[0] || p[2] - q[2]);
  // the melody keeps its own shape: a bar of it is [beat, length, …pitches], and a length may run
  // past the bar line, which is how the ties are written down
  const groups = new Map();
  for (const x of me) {
    const k = `${rel(x, b)}:${x.len}`;
    if (!groups.has(k)) groups.set(k, [rel(x, b), x.len]);
    groups.get(k).push(x.m);
  }
  tables.MELODY.push([...groups.values()].sort((p, q) => p[0] - q[0]));
}

const fmt = (a) => JSON.stringify(a).replace(/,/g, ', ').replace(/\[ /g, '[');
const BODY = 31;
console.log('\n// ---- the table ------------------------------------------------------------------');
for (const [name, list] of [['BASS', tables.BASS], ['CHORD', tables.CHORD], ['MELODY', tables.MELODY]]) {
  console.log(`const ${name} = [`);
  for (let b = 0; b < BARS_WRITTEN; b++) {
    const where = b < BODY ? `${b + 1}` : b < BODY + 8 ? `${b + 1} (1st ending)` : `${b - BODY - 8 + 71} (2nd ending)`;
    console.log(`  ${fmt(list[b] ?? null)},`.padEnd(46) + `// ${where}`);
  }
  console.log('];');
}
console.log('const ODD = ' + JSON.stringify(tables.ODD) + ';');

// ---- what the table asks of a pair of hands ------------------------------------------------------
if (args.diff || args.bars) {
  const { NOTES, BARS, TEMPO, soundingAt } = await import('../src/pieces/piano-song.js');
  // every note of the piece, unfolded, against the parse unfolded the same way
  const unfold = (ns) => {
    const out = [];
    const body = ns.filter((n) => n.at < BODY * 3 - 1e-9);
    const a1 = ns.filter((n) => n.at >= BODY * 3 - 1e-9 && n.at < (BODY + 8) * 3 - 1e-9);
    const a2 = ns.filter((n) => n.at >= (BODY + 8) * 3 - 1e-9);
    for (const n of body) out.push({ ...n });
    for (const n of a1) out.push({ ...n });
    for (const n of body) out.push({ ...n, at: n.at + (BODY + 8) * 3 });
    for (const n of a2) out.push({ ...n, at: n.at + BODY * 3 });
    return out;
  };
  const want = unfold(Object.values(voices).flat()).map((n) => `${n.at}:${n.m}:${n.len}`).sort();
  const got = NOTES.map((n) => `${n.at}:${n.m}:${n.len}`).sort();
  const missing = want.filter((x) => !got.includes(x));
  const extra = got.filter((x) => !want.includes(x));
  // The piece drops exactly one kind of note and says so in its header: the top of the
  // accompanying chord where it is the same key the other hand is already holding. In the
  // engraving that is the F♯4 at the top of the chord in bars 9–12, under the melody's tied F♯4,
  // and the same four bars again on the repeat — eight notes, and no others.
  const DOUBLED = [25, 28, 31, 34, 142, 145, 148, 151].map((b) => `${b}:66:2`);
  const unexplained = missing.filter((x) => !DOUBLED.includes(x));
  console.log(`\npiano-song.js: ${NOTES.length} notes over ${BARS} bars at ♩=${TEMPO}`);
  console.log(`  against this parse: ${missing.length} missing (${missing.filter((x) => DOUBLED.includes(x)).length} of them the F♯ doublings the piece drops), ${extra.length} extra`);
  if (unexplained.length) console.log('  MISSING AND NOT EXPLAINED:', unexplained.slice(0, 10));
  if (extra.length) console.log('  extra  :', extra.slice(0, 10));
  // and what the hands are asked for, drawing by drawing
  let mostL = 0, mostR = 0, widest = { L: 0, R: 0 };
  const white = (m) => { const o = Math.floor(m / 12), s = m % 12; return o * 7 + [0, 0.5, 1, 1.5, 2, 3, 3.5, 4, 4.5, 5, 5.5, 6][s]; };
  for (let b = 0; b < BARS * 3; b += 0.25) {
    const s = soundingAt(b);
    for (const side of ['L', 'R']) {
      const ms = s[side];
      if (!ms.length) continue;
      if (ms.length > (side === 'L' ? mostL : mostR)) { if (side === 'L') mostL = ms.length; else mostR = ms.length; }
      const w = Math.max(...ms.map(white)) - Math.min(...ms.map(white));
      if (w > widest[side]) widest[side] = w;
    }
  }
  console.log(`  the hands: at most ${mostL} keys under the left and ${mostR} under the right;`);
  console.log(`  the widest reach is ${(widest.L * 23.5).toFixed(0)} mm left, ${(widest.R * 23.5).toFixed(0)} mm right (the drawing reaches 180)`);
  const shortest = Math.min(...NOTES.map((n) => n.len));
  console.log(`  the shortest note in the piece is ${shortest} beat = ${(shortest * (60 / TEMPO)).toFixed(3)} s = ${(shortest * (60 / TEMPO) * 12).toFixed(1)} drawings at twelve a second`);
}

if (args.bars) {
  const [from, to] = String(args.bars).split('-').map(Number);
  const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];
  const nm = (m) => NAMES[m % 12] + (Math.floor(m / 12) - 1);
  console.log(`\n// bars ${from}–${to ?? from} as parsed, for reading against the engraving:`);
  for (let b = from; b <= (to ?? from); b++) {
    const line = [];
    for (const [k, v] of Object.entries(voices)) {
      const ns = bar(v, b - 1);
      if (ns.length) line.push(`${k}: ${ns.map((n) => `${nm(n.m)}@${rel(n, b - 1) + 1}×${n.len}`).join(' ')}`);
    }
    console.log(`  ${String(b).padStart(2)}  ${line.join('   |   ')}`);
  }
}
