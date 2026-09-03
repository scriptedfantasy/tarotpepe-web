// Sanity check for src/pieces/script.js: coverage of the 78 cards, voice rules, reply().
import { DECK } from '../src/core/deck.js';
import { SCRIPT, lineFor, reply } from '../src/pieces/script.js';

let bad = 0;
const all = [];
for (const c of DECK) {
  const card = SCRIPT.cards[c.slug];
  if (!card) {
    console.log('MISSING', c.slug);
    bad++;
    continue;
  }
  for (const k of ['brought', 'going', 'do']) {
    if (!Array.isArray(card[k]) || card[k].length !== 2) {
      console.log('BAD SHAPE', c.slug, k);
      bad++;
    } else all.push(...card[k].map((l) => [c.slug + '/' + k, l]));
  }
}
for (const k of ['greeting', 'question', 'shuffle', 'draw', 'turn', 'farewell', 'answer']) for (const l of SCRIPT[k]) all.push([k, l]);
for (const k in SCRIPT.interjections) for (const l of SCRIPT.interjections[k]) all.push(['interjections.' + k, l]);
for (const [where, l] of all) {
  if (/!/.test(l)) console.log('EXCLAMATION', where, l), bad++;
  if (/[\u{1F300}-\u{1FAFF}]/u.test(l)) console.log('EMOJI', where, l), bad++;
  if (/'/.test(l)) console.log('STRAIGHT QUOTE', where, l), bad++;
  if (l.length > 190) console.log('LONG', where, l.length, l);
}
const lens = all.map(([, l]) => l.length);
console.log('lines', all.length, 'avg len', (lens.reduce((a, b) => a + b, 0) / lens.length).toFixed(1), 'max', Math.max(...lens));
console.log('cards', Object.keys(SCRIPT.cards).length, 'bad', bad);
console.log(lineFor('the-moon', 1));
console.log(lineFor('the-moon', 'What to do about it'));
console.log(reply(''));
console.log(reply('my brother has not called since March'));
console.log(reply('Will I get the job?'));
console.log(reply('I lost my job in the spring. Then my flat. My mother says it is a phase. I am forty-one and I do not think so.'));
process.exit(bad ? 1 : 0);
