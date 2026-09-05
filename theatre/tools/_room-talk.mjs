// tools/_room-talk.mjs — real conversations, not regexes.
//
// Drives talkScript() the way mind.js drives it (one `state` for the whole visit, so the lines he
// has spent are remembered) and prints the exchange, so it can be read as a scene. Then builds the
// stage direction the live voice would get for the same line, and checks the arrangement: the fact
// present, the written line present ONLY as a labelled hint, and no story in the persona at all.
import { talkScript } from '../src/pieces/mind-talk.js';
import { objectAsk, objectBody, noteTold, STORIES } from '../src/pieces/mind-room.js';
import { cardRef } from '../src/pieces/mind-voice.js';
import { SYSTEM, direction, buildMessages } from '../server/pepe.mjs';

const fresh = () => ({ turns: 0, used: new Set(), offered: false, stance: null, spread: [], told: Object.create(null) });
let bad = 0;
const fail = (m) => {
  bad++;
  console.log('  ✗ ' + m);
};

// ---- 1. a visit, read as a scene ----------------------------------------------------------------
const VISIT = [
  'I keep starting things and not finishing them.',
  "what's that",
  'what is the globe',
  'why do you keep a barometer',
  'who is the woman in the photograph',
  'is that your mother',
  "what's in the tin",
  'my grandmother had a barometer like that in her hall',
  'tell me about the globe',
  'what is the radiator',
  'is there a chair',
  'what is the punched tape',
];
console.log('A VISIT');
const state = fresh();
for (const said of VISIT) {
  state.turns++;
  const out = talkScript(said, state);
  console.log(`  VISITOR   ${said}`);
  console.log(`  PEPE      ${out.text}`);
}

// ---- 2. the same object, twice, in one visit ------------------------------------------------------
console.log('\nTHE SAME OBJECT, TWICE');
let twice = 0;
for (const s of STORIES) {
  const st = fresh();
  st.turns = 1;
  const a = talkScript(`what is ${s.name}`, st).text;
  st.turns = 2;
  const b = talkScript(`tell me about ${s.name}`, st).text;
  if (a === b) fail(`${s.id}: the same sentences twice`);
  else twice++;
  if (s.id === 'globe') {
    console.log(`  first     ${a}`);
    console.log(`  second    ${b}`);
  }
}
console.log(`  ${twice}/${STORIES.length} told differently the second time`);

// ---- 3. the stage direction the live voice would get -----------------------------------------------
console.log('\nTHE DIRECTION, AND WHAT IS IN IT');
const st2 = fresh();
const obj = objectAsk('why do you keep a barometer', { spread: [], cardRef });
const body = { beat: 'object', object: objectBody(obj, st2), history: [], user: 'why do you keep a barometer' };
const d = direction(body);
console.log('  ' + d.replace(/(.{140})/g, '$1\n  '));
if (!/CERN/.test(d)) fail('the direction does not carry the fact');
if (!/hint of your voice/.test(d)) fail('the written line is not labelled as a hint');
if (!/not to be copied/.test(d)) fail('the hint is not marked uncopyable');

// the persona must carry the FACTS and none of the SENTENCES
console.log('\nTHE PERSONA');
let leaked = 0;
for (const s of STORIES) for (const l of s.lines) if (SYSTEM.includes(l)) leaked++;
if (leaked) fail(`${leaked} written telling(s) are in the cached persona and could be recited`);
else console.log('  no written telling is in the persona (0 of ' + STORIES.reduce((n, s) => n + s.lines.length, 0) + ')');
for (const probe of ['bicycle wheel', 'DARPA', 'ANNUAIRE', 'crypto cabal', 'CERN', 'PRENEZ', 'blank spine', 'ones and zeros', 'hamburger company', 'Jung']) {
  if (!SYSTEM.includes(probe)) fail(`the persona is missing the canon word "${probe}"`);
}
if (!/never volunteer/i.test(SYSTEM)) fail('the persona does not forbid volunteering a story');
console.log('  all ten facts present, and volunteering is forbidden');

// the direction really does reach the model, in the last user turn
const msgs = buildMessages(body);
const last = msgs[msgs.length - 1];
if (last.role !== 'user' || !last.content.includes('CERN')) fail('the fact does not reach the last user turn');
else console.log('  the fact rides in the last user turn, after the visitor');

// ---- 4. the other two kinds -------------------------------------------------------------------------
console.log('\nPLAIN, ABSENT AND POINT, AS DIRECTIONS');
for (const line of ['what is the radiator', 'is there a piano', "what's that"]) {
  const o = objectAsk(line, { spread: [], cardRef });
  const dd = direction({ beat: 'object', object: objectBody(o, fresh()) });
  console.log(`  "${line}" → ${o?.kind}: ${dd.slice(0, 150)}…`);
  if (o?.kind === 'plain' && !/NO story/.test(dd)) fail('a plain object is not told it has no story');
  if (o?.kind === 'absent' && !/not in this room/.test(dd)) fail('an absent object is not told it is absent');
  if (o?.kind === 'point' && !/pointed at something/.test(dd)) fail('a bare point does not ask for a noun');
}

// ---- 5. told, on the second telling ------------------------------------------------------------------
const st3 = fresh();
const o1 = objectAsk('what is the globe', { spread: [], cardRef });
const b1 = objectBody(o1, st3);
noteTold(o1, st3);
const b2 = objectBody(o1, st3);
if (b1.told !== 0 || b2.told !== 1) fail(`told is ${b1.told}/${b2.told}, wanted 0/1`);
if (b1.hint === b2.hint) fail('the second telling is shown the same hint');
const d2 = direction({ beat: 'object', object: b2 });
if (!/already told them about this once tonight/.test(d2)) fail('the second telling is not told it is a second telling');
console.log('\nTHE SECOND TELLING');
console.log('  told 0 → hint: ' + b1.hint.slice(0, 70) + '…');
console.log('  told 1 → hint: ' + b2.hint.slice(0, 70) + '…');

console.log(bad ? `\n${bad} FAILURES` : '\nall correct');
process.exit(bad ? 1 : 0);
