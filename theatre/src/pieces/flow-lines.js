// flow-lines.js — what the flow itself says (the prompts around the visitor's input), the parser
// that turns "the third from the left" into a card, the reader of the visitor's intent when the
// mind does not report one, the sentence splitter, and the scripted lines the flow falls back on
// when the mind is silent for too long. All data and pure functions.

// Pepe's prompts around the visitor's block: at the fan, in a silence, when a reading is over.
// The script (script.js) has no lines for these, so they are the flow's own; same voice: formal,
// brief, no winking. Every one of them is a line said with the field open underneath it, so each
// has to be a thing a person can answer — never a dead end.
export const PROMPTS = {
  // Short, because at the fan the lettering stands on the band of cloth above the slot row and
  // that band is a sixth of the frame: three lines fit there, five sit on the cards.
  pick: [
    'Choose a card. Click one, or name it: third from the left.',
    'A second. They are all face down, which is the point.',
    'And the third. Take your time; not too much of it.',
  ],
  pickAgain: ['I did not follow. Point at one, or count from the left.', 'Once more. A number, or left, right, middle.'],
  pickForYou: 'Very well. I will choose. People do not like it when I choose.',
  followup: 'You may ask one thing about the cards. One.',
  followupNone: 'No question. That is rarer than you would think.',
  // the field is open and he has nothing to answer: the greeting was lost, or the mind said nothing
  opening: 'Good evening. Sit, and say what you like. The cards can wait.',
  // a silence, then another, then the last one: no timer runs after this, so the field simply stays
  quiet: [
    'Take your time. I have sat through longer silences than this one.',
    'Still nothing. That is an answer of a sort. A word will do.',
    'I will wait. When you want the cards, say so.',
  ],
  // the mind gave nothing back at all
  lost: 'Say that again. The radio was loud.',
  // the third card has been read and the evening goes on: the field opens under this
  afterReading: [
    'That is the three of them. Ask about one, or tell me something else.',
    'Three more. The same table, the same frog. Ask what you like.',
  ],
  farewellNone: 'Good night. The step by the door is lower than it looks.',
};

// The visitor's sample answer for the judging stills (the same one the mind's transcript uses).
export const SAMPLE_ANSWER = 'I keep starting things and not finishing them.';

// --- sentences ---------------------------------------------------------------------------------
const END = /[.!?…]+["”’')\]]*(?=\s)|\n+/g;
export function splitSentences(text) {
  const out = [];
  let rest = String(text ?? '');
  for (;;) {
    END.lastIndex = 0;
    const m = END.exec(rest);
    if (!m) break;
    const cut = m.index + m[0].length;
    const s = rest.slice(0, cut).trim();
    if (s) out.push(s);
    rest = rest.slice(cut);
  }
  const tail = rest.trim();
  if (tail) out.push(tail);
  return out;
}

// --- the scripted fallback (the same choices mind.js makes) --------------------------------------
export function scriptedLines(script, { beat, user = '', slug = null, position = 0, question = '' } = {}) {
  const said = String(user || question || '').trim();
  let text;
  switch (beat) {
    case 'reading':
      text = slug ? script.lineFor(slug, position ?? 0) : script.turn[Number(position) || 0];
      break;
    case 'answer':
      text = script.reply(said);
      break;
    case 'followup':
      // the mind answers this beat with the cards on the table; this fallback only runs if the mind
      // piece is missing entirely
      text = said ? script.reply(/\?\s*$/.test(said) ? said : said + '?') : script.interjections.question[1].replace('“{answer}” ', '');
      break;
    case 'fan':
      text = script.draw[0];
      break;
    default:
      text = (Array.isArray(script[beat]) ? script[beat] : script.greeting)[0];
  }
  return splitSentences(text);
}

// --- what the visitor is asking for ---------------------------------------------------------------
// The mind owns this: `mind.turn(text)` reports { sentences, intent }. This is the flow's backstop,
// used only when the mind returns no intent (an older mind, a failed call, the scripted voice), so
// that "read my cards" still brings the cards out and "goodbye" still ends the evening. It is
// deliberately shy: anything it is not sure of is talk, because talk is the safe answer — the worst
// it costs is that the visitor asks twice.
const NORM = (raw) =>
  String(raw ?? '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
// an outright request for the cards
const DRAW = /\b(read (me |my |us |the |our )*(cards?|fortune|palm|leaves)|read for (me|us)|(draw|pull|deal|turn over|lay out|lay down) (me |us )?(a |the |some |three |my |out )*cards?|shuffle|do (a|my|the) reading|(a|another|one more) reading|tell (me )?my fortune|(cards?|reading) (please|now))\b/;
// a wish, next to the word cards: "yes please, the cards", "I want a reading"
const WANT = /\b(can|could|would|will|may|please|want|wanted|need|ready|lets|let us|id like|i would like|show me|give me|go on|yes|okay|ok|sure)\b/;
const CARDS = /\b(cards?|reading|deck|fortune|spread)\b/;
// ... unless the sentence is plainly about the cards already on the table
const ABOUT = /\b(mean|means|meaning|why|which|middle|first|second|third|last|about|explain|said|says)\b/;
const BYE = /\b(goodbye|good bye|bye|goodnight|good night|farewell|see you|until next time|im done|i am done|im finished|thats all|that is all|nothing else|i should go|i must go|i have to go|i will go|im leaving|i am leaving|take care)\b/;

// text → 'draw' | 'farewell' | 'talk'
export function detectIntent(raw) {
  const t = NORM(raw);
  if (!t) return 'talk';
  const draw = DRAW.test(t) || (WANT.test(t) && CARDS.test(t) && !ABOUT.test(t));
  if (BYE.test(t) && !draw) return 'farewell';
  if (draw) return 'draw';
  return 'talk';
}

// --- "the third from the left" --------------------------------------------------------------------
const SMALL = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20 };
const ORD = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17, eighteenth: 18, nineteenth: 19, twentieth: 20 };
const RANDOM = /\b(you (choose|pick|decide)|any( one| of them)?|whichever|surprise me|random|dont care|dealers? choice|up to you|your (choice|call)|no idea|i dont know)\b/;

// text → { kind: 'ordinal', n } (1-based, from the left) | { kind: 'random' } | null (not understood)
export function parsePick(raw, count = 21) {
  const t = String(raw ?? '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return null;
  const N = Math.max(1, count | 0);
  const clamp = (n) => ({ kind: 'ordinal', n: Math.min(N, Math.max(1, n)) });
  if (RANDOM.test(t)) return { kind: 'random' };
  // "this one", "the one on the right": that "one" is not a count
  const s = t.replace(/\b(this|that|the|which|each|one) one\b/g, ' ').replace(/\s+/g, ' ').trim();

  let n = null;
  const dm = s.match(/\b(\d{1,2})(st|nd|rd|th)?\b/);
  if (dm) n = +dm[1];
  else {
    const wm = s.match(/\btwenty (one|two|three|four|five|six|seven|eight|nine|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth)\b/);
    if (wm) n = 20 + (SMALL[wm[1]] ?? ORD[wm[1]]);
    else
      for (const w of s.split(' ')) {
        if (ORD[w] != null) {
          n = ORD[w];
          break;
        }
        if (SMALL[w] != null) {
          n = SMALL[w];
          break;
        }
      }
  }
  const mentionsLeft = /\bleft\b/.test(t);
  const fromRight = /\b(right|end|last|back)\b/.test(t) && !mentionsLeft;
  if (n != null) return clamp(fromRight ? N + 1 - n : n);
  if (/\b(middle|centre|center|central|halfway)\b/.test(t)) return clamp(Math.ceil(N / 2));
  if (/\b(penultimate|next to last)\b/.test(t)) return clamp(N - 1);
  if (/\b(last|far right|rightmost|right most|right end|on the right|the right|right)\b/.test(t) && !mentionsLeft) return clamp(N);
  if (/\b(far left|leftmost|left most|left end|on the left|the left|left)\b/.test(t)) return clamp(1);
  return null;
}
