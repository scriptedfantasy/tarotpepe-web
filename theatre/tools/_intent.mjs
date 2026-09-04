// tools/_intent.mjs — the flow's backstop intent reader, over the lines a visitor actually types.
import { detectIntent } from '../src/pieces/flow-lines.js';

const CASES = [
  ['hello', 'talk'],
  ['good evening', 'talk'],
  ['I keep starting things and not finishing them', 'talk'],
  ['my brother has not called since March', 'talk'],
  ['what are you', 'talk'],
  ['can you read my cards', 'draw'],
  ['read my cards', 'draw'],
  ['would you do a reading', 'draw'],
  ['I want a reading', 'draw'],
  ['shuffle the deck', 'draw'],
  ['deal three cards', 'draw'],
  ['tell my fortune', 'draw'],
  ['one more reading', 'draw'],
  ['cards please', 'draw'],
  ['what does the middle one mean', 'talk'],
  ['what does the middle card mean', 'talk'],
  ['why the star', 'talk'],
  ['thank you for the reading, goodbye', 'farewell'],
  ['thank you, goodbye', 'farewell'],
  ['good night', 'farewell'],
  ['bye', 'farewell'],
  ['that is all, thank you', 'farewell'],
  ['I should go', 'farewell'],
  ['', 'talk'],
];
let bad = 0;
for (const [text, want] of CASES) {
  const got = detectIntent(text);
  if (got !== want) {
    bad++;
    console.log(`✗ "${text}" → ${got} (wanted ${want})`);
  }
}
console.log(bad ? `${bad} of ${CASES.length} wrong` : `all ${CASES.length} read correctly`);
process.exit(bad ? 1 : 0);
