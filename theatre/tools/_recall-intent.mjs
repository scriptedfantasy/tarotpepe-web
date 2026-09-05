#!/usr/bin/env node
// The recall intent, read straight out of mind-talk.js: every phrasing that must trigger it, every
// one that must not, with and without cards on the table.
import { intentOf } from '../src/pieces/mind-talk.js';
import { detectIntent } from '../src/pieces/flow-lines.js';

const SPREAD = [
  { position: 0, label: 'what you brought', slug: 'the-fool', name: 'The Fool', numeral: '' },
  { position: 1, label: 'what is actually going on', slug: 'the-star', name: 'The Star', numeral: 'XVII' },
  { position: 2, label: 'what to do about it', slug: 'the-house-of-god', name: 'The House of God', numeral: 'XVI' },
];

// [text, intent with cards down, intent with a bare table]
const CASES = [
  // --- must be a recall, cards down -----------------------------------------------------------
  ['show me my cards again', 'recall', null],
  ['show me my cards', 'recall', null],
  ['Show me the cards.', 'recall', null],
  ['can i see my cards again?', 'recall', null],
  ['can I see them again', 'recall', null],
  ['let me see the cards', 'recall', null],
  ['let me have another look', 'recall', null],
  ['i want to see my cards', 'recall', null],
  ['could i look at them again please', 'recall', null],
  ['bring them back', 'recall', null],
  ['where are my cards', 'recall', null],
  ['my cards again', 'recall', null],
  ['the second one again', 'recall', null],
  ['show me the second one', 'recall', null],
  ['show me the tower', 'recall', null],
  ['can i see the first card', 'recall', null],
  ['what was the tower again', 'recall', null],
  ['show me the middle card', 'recall', null],
  ['back to the cards', 'recall', null],
  // --- must be a recall whether or not anything is down ----------------------------------------
  ['what did i draw', 'recall', 'recall'],
  ['what did I draw?', 'recall', 'recall'],
  ['what were my cards', 'recall', 'recall'],
  ['which cards did i pick', 'recall', 'recall'],
  ['remind me what the second one was', 'recall', 'recall'],
  ['remind me what the cards were', 'recall', 'recall'],
  ['what was the second one', 'recall', 'recall'],
  ['i forgot what the third one was', 'recall', 'recall'],
  ['i cant remember the first one', 'recall', 'recall'],
  ['what did you say the middle one was', 'recall', 'recall'],
  ['what did i pick again', 'recall', 'recall'],
  // --- must be a DRAW, cards down or not: a new reading, never a second look -------------------
  ['read my cards', 'draw', 'draw'],
  ['read my cards again', 'draw', 'draw'],
  ['draw me another card', 'draw', 'draw'],
  ['deal me another one', 'draw', 'draw'],
  ['can i have another reading', 'draw', 'draw'],
  ['do another reading', 'draw', 'draw'],
  ['shuffle them again', 'draw', 'draw'],
  ['three more cards please', 'draw', 'draw'],
  ['show me my cards', null, 'draw'], // a bare table: they want a reading
  ['show me the cards', null, 'draw'],
  ['can you read my cards', 'draw', 'draw'],
  ['i would like a reading', 'draw', 'draw'],
  // --- must NOT be a recall: a passing mention, or talk --------------------------------------
  ['my grandmother used to show me the cards after supper', 'talk', 'talk'],
  ['i saw a tarot deck in a shop and did not buy it', 'talk', 'talk'],
  ['she showed me her holiday photographs for an hour', 'talk', 'talk'],
  ['i keep starting things and not finishing them', 'talk', 'talk'],
  ['what does the middle one mean', 'talk', 'talk'], // a follow-up: he answers, the camera stays
  ['the tower frightens me', 'talk', 'talk'],
  ['i forgot to call my brother', 'talk', 'talk'],
  ['i cannot remember his name', 'talk', 'talk'],
  ['do you ever get tired of being asked about the future', 'talk', 'talk'],
  ['what happens now', 'talk', 'talk'],
  ['thank you', 'talk', 'talk'],
  ['good night', 'farewell', 'farewell'],
];

let bad = 0;
for (const [text, withCards, without] of CASES) {
  if (withCards != null) {
    const got = intentOf(text, { spread: SPREAD });
    if (got !== withCards) {
      console.log(`  DOWN  "${text}"  →  ${got}   (wanted ${withCards})`);
      bad++;
    }
  }
  if (without != null) {
    const got = intentOf(text, { spread: [] });
    if (got !== without) {
      console.log(`  BARE  "${text}"  →  ${got}   (wanted ${without})`);
      bad++;
    }
  }
}
console.log(`mind-talk intentOf: ${CASES.length} lines, ${bad} wrong`);

// the flow's own backstop, used only when the mind never answered
let bad2 = 0;
for (const [text, withCards, without] of CASES) {
  if (withCards == null) continue; // a bare-table-only case; the backstop is asked with cards down
  const want = withCards;
  const got = detectIntent(text, { dealt: 3 });
  // the backstop is allowed to be shyer than the mind: talk is always a safe answer, and it has no
  // card names in it, so a named card ("show me the tower") is out of its reach. It may never turn
  // a recall into a draw, or a draw into a recall.
  const fatal = (want === 'recall' && got === 'draw') || (want === 'draw' && got === 'recall');
  if (fatal) {
    console.log(`  BACKSTOP "${text}"  →  ${got}   (the mind says ${want})`);
    bad2++;
  }
}
console.log(`flow-lines detectIntent: ${bad2} dangerous disagreements`);
process.exit(bad + bad2 ? 1 : 0);
