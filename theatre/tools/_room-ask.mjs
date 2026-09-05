// tools/_room-ask.mjs — the room's ten stories, asked for the way a visitor asks.
//
// Four things are tested, and the last two are the ones that matter:
//   HITS      each of the ten, by several names, resolves to the right object
//   PLAIN     an object with no story is identified and not given a biography
//   ABSENT    a thing that is not in the room is answered as not in the room
//   NEAR      a passing mention, a simile, a card, a farewell, a draw — none of them fire, and
//             none of the four existing intents is stolen
import { objectAsk, objectScript, STORIES } from '../src/pieces/mind-room.js';
import { intentOf } from '../src/pieces/mind-talk.js';
import { cardRef } from '../src/pieces/mind-voice.js';

const opts = (spread = []) => ({ spread, cardRef });
const ask = (t, spread = []) => objectAsk(t, opts(spread));

let bad = 0;
const fail = (msg) => {
  bad++;
  console.log('  ✗ ' + msg);
};

// ---- 1. the ten, by several names --------------------------------------------------------------
const HITS = [
  ['globe', ['the globe', 'that ball', "what's the globe for", 'what is that globe', 'tell me about the globe', 'why do you keep a globe', 'what is the world on the shelf']],
  [
    'photograph',
    ['who is the woman in the photograph', 'what is that photograph', 'is that your mother', 'who is she', 'tell me about the photo', 'the portrait', 'why do you keep a photograph'],
  ],
  ['directory', ['what is the directory', 'tell me about the annuaire', 'that fat book', 'why do you keep a phone book', 'what is that directory for']],
  ['radio', ['what is the radio', 'tell me about the radio', 'the radio', 'why do you have a radio', 'why is the radio off', 'what is that wireless']],
  ['candle', ['what is the candle for', 'why do you have a candle', 'the candle', 'tell me about that candle', 'why is there a candle']],
  ['barometer', ['what is that barometer', 'why do you keep a barometer', 'the barometer', 'tell me about the barometer', 'what is the round dial on the wall']],
  ['tin', ['what is the tin', "what's in the tin", 'why do you keep a tin', 'the tin', 'what is that box by the door', 'tell me about the tin']],
  ['quarto', ['what is the black book', 'why is that book blank', 'the blank spine', 'tell me about the black book', 'what is that quarto']],
  ['tape', ['what is that tape', 'tell me about the spool', 'the tape', 'why do you keep a spool of tape', 'what is the punched tape']],
  ['menu', ['what is that menu', 'tell me about the framed card', 'the menu', 'why do you keep a menu', 'what is that canteen menu']],
];
let hits = 0;
console.log('THE TEN, BY SEVERAL NAMES');
for (const [id, lines] of HITS) {
  for (const line of lines) {
    hits++;
    const got = ask(line);
    if (!got) fail(`"${line}" → nothing (wanted ${id})`);
    else if (got.id !== id) fail(`"${line}" → ${got.id} (wanted ${id})`);
    else if (got.kind !== 'story') fail(`"${line}" → kind ${got.kind}`);
  }
}
console.log(`  ${hits - bad}/${hits} of the ten resolved`);

// ---- 2. an object with no story -----------------------------------------------------------------
const PLAINS = ['what is the radiator', 'tell me about the cat', 'what is that switchboard', 'why do you keep a siphon', 'the rug', 'what is that clock', 'what is the wallpaper', 'tell me about the hat stand'];
let plainBad = 0;
console.log('\nAN OBJECT WITH NO STORY');
for (const line of PLAINS) {
  const got = ask(line);
  if (!got || got.kind !== 'plain') {
    plainBad++;
    fail(`"${line}" → ${got ? got.kind + '/' + got.id : 'nothing'} (wanted plain)`);
  }
}
console.log(`  ${PLAINS.length - plainBad}/${PLAINS.length} identified plainly`);

// ---- 3. not in the room --------------------------------------------------------------------------
const ABSENTS = ['is there a chair', 'do you have a telephone', 'where is the mirror', 'is that a television', 'do you have a piano', 'is there a fireplace'];
let absBad = 0;
console.log('\nNOT IN THE ROOM');
for (const line of ABSENTS) {
  const got = ask(line);
  if (!got || got.kind !== 'absent') {
    absBad++;
    fail(`"${line}" → ${got ? got.kind + '/' + got.id : 'nothing'} (wanted absent)`);
  }
}
console.log(`  ${ABSENTS.length - absBad}/${ABSENTS.length} answered as absent`);

// ---- 4. the near misses --------------------------------------------------------------------------
// Nothing here may become a story, and nothing here may change the intent it already had.
const NEAR = [
  // a passing mention mid-sentence
  ['my grandmother had a globe like that in her hall', 'talk'],
  ['I listen to the radio every morning', 'talk'],
  ['the radio in my kitchen has been broken for a year', 'talk'],
  ['I feel like a radio nobody switches on', 'talk'],
  ['that globe reminds me of my school', 'talk'],
  ['my father collected barometers', 'talk'],
  ['I have a tin of biscuits at home I cannot open', 'talk'],
  ['we lit a candle for her', 'talk'],
  ['I never finished my thesis either', 'talk'],
  ['my mother is not well', 'talk'],
  ['there is a photograph of us somewhere', 'talk'],
  // an exclamation, not a question
  ['what a lovely globe', 'talk'],
  // the four intents must survive untouched
  ['read my cards', 'draw'],
  ['can you read my cards', 'draw'],
  ['shuffle the deck', 'draw'],
  ['three cards please', 'draw'],
  ['show me my cards', 'draw'],
  ['what did I draw', 'recall'],
  ['good night', 'farewell'],
  ['thank you, I should go', 'farewell'],
  ['not yet, I would rather talk', 'talk'],
  // the conversation's own questions, which have their own answers already
  ['what is this', 'talk'],
  ['who are you', 'talk'],
  ['how does this work', 'talk'],
  ['what is this place', 'talk'],
  ['do you have a name', 'talk'],
  ['how much is it', 'talk'],
  ['do you ever get tired of this', 'talk'],
  ['where did you learn', 'talk'],
  ['what will happen to me', 'talk'],
  ['is this real', 'talk'],
];
let nearBad = 0;
console.log('\nTHE NEAR MISSES');
for (const [line, wantIntent] of NEAR) {
  const got = ask(line);
  if (got) {
    nearBad++;
    fail(`"${line}" → ${got.kind}/${got.id} (must not fire)`);
  }
  const i = intentOf(line, { offered: false, spread: [] });
  if (i !== wantIntent) {
    nearBad++;
    fail(`"${line}" → intent ${i} (wanted ${wantIntent})`);
  }
}
console.log(`  ${NEAR.length - nearBad}/${NEAR.length} left alone`);

// ---- 5. cards on the table win the pointing words ------------------------------------------------
const SPREAD = [
  { position: 0, label: 'What you brought', slug: 'the-world', name: 'The World', numeral: 'XXI' },
  { position: 1, label: 'What is actually going on', slug: 'the-star', name: 'The Star', numeral: 'XVII' },
  { position: 2, label: 'What to do about it', slug: 'the-moon', name: 'The Moon', numeral: 'XVIII' },
];
console.log('\nWITH CARDS ON THE TABLE');
let tableBad = 0;
for (const line of ['what is the world', "what's that", 'what is the middle one', 'what does that card mean']) {
  const got = ask(line, SPREAD);
  if (got) {
    tableBad++;
    fail(`"${line}" with cards down → ${got.kind}/${got.id} (the table owns it)`);
  }
}
// ... and on a bare table the same words are the room again
const bare = ask('what is the world');
if (!bare || bare.id !== 'globe') {
  tableBad++;
  fail(`"what is the world" on a bare table → ${bare ? bare.id : 'nothing'} (wanted globe)`);
}
const point = ask("what's that");
if (!point || point.kind !== 'point') {
  tableBad++;
  fail(`"what's that" on a bare table → ${point ? point.kind : 'nothing'} (wanted point)`);
}
console.log(`  ${5 - tableBad}/5 correct`);

// ---- 5b. the way people really put it ------------------------------------------------------------
const LONGHAND = [
  ['photograph', 'who is the woman in the picture on the left with the headband'],
  ['photograph', 'tell me about your mother'],
  ['photograph', 'is that a photograph of your mother'],
  ['tape', 'what is the spool of punched tape'],
  ['radio', 'why is the radio never on'],
  ['quarto', 'what is that black book with nothing on it'],
  ['tin', 'what do you keep in that tin'],
  ['barometer', 'where did you get the barometer'],
  ['menu', 'what is the little frame by the cupboard'],
  ['directory', 'why do you still have a directory from 1971'],
];
let longBad = 0;
console.log('\nTHE WAY PEOPLE REALLY PUT IT');
for (const [id, line] of LONGHAND) {
  const got = ask(line);
  if (got?.id !== id) {
    longBad++;
    fail(`"${line}" → ${got ? got.kind + '/' + got.id : 'nothing'} (wanted ${id})`);
  }
}
console.log(`  ${LONGHAND.length - longBad}/${LONGHAND.length} resolved`);

// ---- 6. the same fact, different sentences --------------------------------------------------------
console.log('\nASKED TWICE');
let twiceBad = 0;
for (const s of STORIES) {
  const state = { used: new Set() };
  const a = objectScript('x', ask(`what is ${s.name}`) ?? { ...s, kind: 'story' }, state);
  const b = objectScript('x', ask(`tell me about ${s.name}`) ?? { ...s, kind: 'story' }, state);
  if (!a || !b) {
    twiceBad++;
    fail(`${s.id}: no line`);
  } else if (a === b) {
    twiceBad++;
    fail(`${s.id}: said the same sentences twice`);
  }
}
console.log(`  ${STORIES.length - twiceBad}/${STORIES.length} told differently the second time`);

console.log(bad ? `\n${bad} FAILURES` : '\nall correct');
process.exit(bad ? 1 : 0);
