// flow-lines.js — what the flow itself says (the prompts around the visitor's input), the parser
// that turns "the third from the left" into a card, the sentence splitter, and the scripted lines
// the flow falls back on when the mind is silent for too long. All data and pure functions.

// Pepe's prompts at the fan and at the follow-up. The script (script.js) has no lines for the
// pick, so these are the flow's own; same voice: formal, brief, no winking.
export const PROMPTS = {
  pick: [
    'Choose a card. Click one, or say which: the third from the left, the one on the far right.',
    'A second. Any of them. They are all face down, which is the point.',
    'And the third. Take your time. Not too much of it.',
  ],
  pickAgain: ['I did not follow. Point at one, or count from the left.', 'Once more. A number, or left, right, middle.'],
  pickForYou: 'Very well. I will choose. People do not like it when I choose.',
  followup: 'You may ask one thing about the cards. One.',
  followupNone: 'No question. That is rarer than you would think.',
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
