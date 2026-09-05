// The user asked for a reading with a plain, direct phrase and got prose instead of cards. This
// puts the obvious ways a person asks through intentOf, in the state they would actually be in: a
// bare cloth, nothing offered yet.  node tools/_draw-probe.mjs
import { intentOf } from '../src/pieces/mind-talk.js';

const ASKS = [
  'read my cards',
  'read my cards please',
  'draw me three cards',
  'draw three cards',
  'draw me a card',
  'draw the cards',
  'can you read my cards',
  'can you read my cards?',
  'i want a reading',
  'i would like a reading',
  'give me a reading',
  'do a reading',
  'read the cards',
  'read me',
  'lay the cards',
  'turn the cards',
  'deal the cards',
  'deal me three',
  'cards please',
  'yes please, the cards',
  'lets do the cards',
  "let's do the cards",
  'i am ready for the cards',
  'show me the cards',
  'pull three cards',
  'pull a card for me',
  'tell my fortune',
  'read my fortune',
  'do the tarot',
  'tarot please',
];

// Things that must NOT become a draw.
const NOT = [
  'i have never had my cards read before',
  'my grandmother used to read the cards',
  'what is tarot',
  'do you read cards here',
  'how much for a reading',
  'i am not sure i want a reading',
  'maybe later',
  'what do the cards say about my brother',
];

let bad = 0;
console.log('— asked for, on a bare cloth (want: draw) —');
for (const s of ASKS) {
  const got = intentOf(s, { offered: false, spread: [] });
  if (got !== 'draw') bad += 1;
  console.log(`${got === 'draw' ? '  ok  ' : ' MISS '} ${got.padEnd(8)} ${s}`);
}
console.log('\n— must not deal —');
for (const s of NOT) {
  const got = intentOf(s, { offered: false, spread: [] });
  if (got === 'draw') bad += 1;
  console.log(`${got === 'draw' ? ' WRONG' : '  ok  '} ${got.padEnd(8)} ${s}`);
}
console.log(`\n${bad} wrong of ${ASKS.length + NOT.length}`);
