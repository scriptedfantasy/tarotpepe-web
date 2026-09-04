// _mind-lines.mjs — read the mind's written brain without a browser.
//   node tools/_mind-lines.mjs            a dozen visitors, a dozen questions, one whole visit
//   node tools/_mind-lines.mjs "text"     one line: the intent and what he says back
import { intentOf, talkScript, farewellScript } from '../src/pieces/mind-talk.js';
import { stanceOf, followupScript, readingScript, beatText } from '../src/pieces/mind-voice.js';

const SPREAD = [
  { position: 0, label: 'What you brought', slug: 'the-fool', name: 'The Fool' },
  { position: 1, label: 'What is actually going on', slug: 'the-house-of-god', name: 'The House of God' },
  { position: 2, label: 'What to do about it', slug: 'the-star', name: 'The Star' },
];

const fresh = () => ({ turns: 0, used: new Set(), offered: false, stance: null, spread: [] });

function say(state, text) {
  state.turns++;
  const out = talkScript(text, state);
  state.offered = out.offered;
  return out.text;
}

const ANSWERS = [
  'I keep starting things and not finishing them.',
  'I do not know if I should leave him.',
  'My mother is not well.',
  'My father died in February.',
  'Work. It is always work, and there is no end to it.',
  'Nothing has changed in four years.',
  'I am so tired I cannot think straight.',
  'I am scared I have wasted the whole thing.',
  'hello',
  'test',
  '',
  'Do you think I am a bad person?',
];

const QUESTIONS = [
  'Which one is the important one?',
  'What does the tower mean?',
  'Is that bad?',
  'Is that good?',
  'What should I do?',
  'Will I be all right?',
  'Will she come back?',
  'Can I have another card?',
  'Are you a real frog?',
  'What is the second one again?',
  'Tell me about the star.',
  'I do not know what to make of that.',
];

const INTENTS = [
  ['read my cards', false],
  ['can you do a spread', false],
  ['show me the cards', false],
  ["I'd like three cards please", false],
  ['yes please', true],
  ['yes please', false],
  ['go on then', false],
  ['not yet', true],
  ['just talking for now', true],
  ['no thanks', true],
  ['I should go', false],
  ['thank you, that is all', false],
  ['what are you', false],
  ['I keep starting things', false],
];

const one = process.argv[2];
if (one) {
  const s = fresh();
  s.offered = process.argv[3] === 'offered';
  console.log(`intent: ${intentOf(one, { offered: s.offered })}   stance: ${stanceOf(one).key ?? '—'}`);
  console.log(`PEPE  : ${say(s, one)}`);
  process.exit(0);
}

console.log('=== INTENT ==========================================================');
for (const [text, offered] of INTENTS) {
  console.log(`  ${intentOf(text, { offered }).padEnd(9)} ${offered ? '(offer standing) ' : '                 '}${text}`);
}

console.log('\n=== ONE THING SAID, ONE THING BACK ==================================');
for (const a of ANSWERS) {
  const s = fresh();
  console.log(`\n  VISITOR  ${a === '' ? '(nothing)' : a}`);
  console.log(`  stance   ${stanceOf(a).key ?? '—'}`);
  console.log(`  PEPE     ${say(s, a)}`);
}

console.log('\n=== A QUESTION, WITH THREE CARDS ON THE TABLE ========================');
const stance = stanceOf(ANSWERS[0]);
for (const q of QUESTIONS) {
  console.log(`\n  VISITOR  ${q}`);
  console.log(`  PEPE     ${followupScript(q, SPREAD, stance)}`);
}

console.log('\n=== THE WHOLE EVENING ================================================\n');
const s = fresh();
const lines = ['I keep starting things and not finishing them.', 'Four or five. There is a shed I began in March.', 'Not yet. I would rather talk.', 'What are you, exactly?', 'All right. Read my cards.'];
console.log(`  PEPE     ${beatText('greeting')}`);
console.log(`  PEPE     ${beatText('question')}`);
for (const l of lines) {
  const intent = intentOf(l, { offered: s.offered });
  console.log(`\n  VISITOR  ${l}   [${intent}]`);
  if (intent === 'draw') {
    console.log(`  PEPE     ${beatText('shuffle')}`);
    console.log('           ( the fan; the visitor picks three )');
    break;
  }
  console.log(`  PEPE     ${say(s, l)}`);
}
s.spread = SPREAD;
for (let i = 0; i < 3; i++) console.log(`  PEPE     [${SPREAD[i].name}] ${readingScript(SPREAD[i].slug, i, s.stance)}`);
console.log(`\n  VISITOR  Which one is the important one?   [${intentOf('Which one is the important one?', { offered: s.offered })}]`);
console.log(`  PEPE     ${say(s, 'Which one is the important one?')}`);
console.log(`\n  VISITOR  Thank you. I should go.   [${intentOf('Thank you. I should go.', { offered: s.offered })}]`);
console.log(`  PEPE     ${farewellScript(s)}`);
console.log('');
