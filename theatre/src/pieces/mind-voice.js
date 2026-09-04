// mind-voice.js — the scripted intelligence behind mind.js. No model, no network.
//
// Two jobs the written script could not do on its own:
//
//   1. THE VISITOR'S ANSWER HAS TO MATTER. The visitor types one sentence. `stanceOf()` reads it
//      for one of ten plain stances (a thing begun and unfinished, a decision, a person, work, a
//      loss, a wait, tiredness, a fear, a joke, nothing). Each stance has one sentence per card
//      position — about the visitor, never about the card — that stands next to the card's own
//      line. The card sentence says what is in the picture; the tie says what is in front of him.
//      When no stance matches, the card says its two lines and he stops. That is the whole rule:
//      no stance, no tie, no horoscope.
//
//   2. THE FOLLOW-UP. One question, in the visitor's own words, at the end. `followupScript()`
//      answers it with the three cards actually on the table. Nine shapes, and a card is named in
//      every one of them. He commits; he never predicts.
//
// A card has six written lines (two per position) and a reading spends two of them. The follow-up
// answers with one of the four he did not use — the sentence he held back.
import { SCRIPT, linesFor, positionKey, reply as scriptReply } from './script.js';

// ---------------------------------------------------------------------------------------------
// small tools
// ---------------------------------------------------------------------------------------------
const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
};

const sentencesOf = (text) =>
  String(text ?? '')
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

const firstSentence = (text) => sentencesOf(text)[0] ?? String(text ?? '').trim();
const firstTwo = (text) => sentencesOf(text).slice(0, 2).join(' ') || String(text ?? '').trim();

// three or four of their own words, for the quotation
function fewWords(text, n = 4) {
  const words = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  const take = words.slice(0, Math.max(3, Math.min(n, words.length)));
  return take.join(' ').replace(/[.,;:!?…]+$/, '');
}

// ---------------------------------------------------------------------------------------------
// The stances. Order is specificity: the first that matches wins.
// ---------------------------------------------------------------------------------------------
const RELATION =
  /\bmy (mother|mum|mom|father|dad|sister|brother|wife|husband|partner|girlfriend|boyfriend|ex|son|daughter|child|kid|friend|boss|therapist|landlord|neighbour|neighbor|grandmother|grandfather|granny|aunt|uncle|cousin|flatmate|roommate)\b/;

const SHE = /^(mother|mum|mom|sister|wife|girlfriend|daughter|grandmother|granny|aunt)$/;
const HE = /^(father|dad|brother|husband|boyfriend|son|grandfather|uncle)$/;

const TESTS = [
  ['nothing', /^(nothing|nothing much|not much|no idea|dunno|i dunno|idk|no comment|pass)\.?$/],
  ['joke', /^(hi|hello|hey|yo|sup|test|testing|lol|lmao|haha+|ha|ok|okay|k|nope|yep|yes|no|blah|meh|hmm+|frog|pepe|feels good man|asdf+|qwerty|[^a-z\s]+)\.?$/],
  ['joke', /^[bcdfghjklmnpqrstvwxz]{5,}$/],
  ['loss', /\b(died|dying|dead|death|passed away|funeral|grief|grieving|mourning|buried|hospice|terminal|widow|widowed|miscarriage|suicide|broke up|breakup|divorce|divorced|separated|left me|dumped me|it ended|ended it)\b/],
  ['decision', /\b(should i|i should|shall i|whether|decide|deciding|decision|choose|choosing|choice|torn|or not|either way|can'?t decide|can'?t choose|two (jobs|offers|options|people|places)|leave (him|her|them|my))\b/],
  ['unfinished', /\b(start(ing|ed)? (things|stuff|something|projects)|never finish|not finish(ing)?|don'?t finish|unfinished|half (done|finished|way)|halfway|abandon|gave up|give up|procrastinat|put(ting)? (it|things) off)\b/],
  ['person', RELATION],
  ['person', /\b(he|him|his|she|her|hers|someone|somebody)\b/],
  ['stuck', /\b(stuck|nothing changes|nothing has changed|no progress|going nowhere|limbo|treading water|stagnant|plateau|the same (thing|way|as)|still (here|there|waiting)|for years|years now|waiting)\b/],
  ['work', /\b(job|jobs|work|working|career|boss|office|company|business|startup|client|clients|promotion|fired|redundan|quit|colleague|salary|money|rent|freelance|deadline|the firm)\b/],
  ['tired', /\b(tired|exhaust|burn(t|ed) out|burnout|no energy|worn out|can'?t sleep|insomnia|drained|knackered|wiped)\b/],
  ['fear', /\b(afraid|scared|scary|frightened|terrified|worried|worry|worrying|anxious|anxiety|nervous|dread|panic|fear)\b/],
  ['question', /\?\s*$/],
];

// → {key, subject, they, them, Cap} or {key:null}
export function stanceOf(raw) {
  const text = norm(raw);
  const out = { key: null, subject: null, they: 'they', them: 'them', Cap: 'They' };
  const rel = text.match(RELATION);
  if (rel) {
    out.subject = `your ${rel[1]}`;
    if (SHE.test(rel[1])) Object.assign(out, { they: 'she', them: 'her', Cap: 'She' });
    else if (HE.test(rel[1])) Object.assign(out, { they: 'he', them: 'him', Cap: 'He' });
  } else if (/\b(she|her|hers)\b/.test(text)) Object.assign(out, { they: 'she', them: 'her', Cap: 'She' });
  else if (/\b(he|him|his)\b/.test(text)) Object.assign(out, { they: 'he', them: 'him', Cap: 'He' });

  if (!text) return { ...out, key: 'nothing' };
  // "lost my job" is work, not a bereavement
  if (/\b(lost|losing|quit|fired|laid off|made redundant)\b/.test(text) && /\b(job|work|role|position|company|contract)\b/.test(text)) {
    return { ...out, key: 'work' };
  }
  for (const [key, re] of TESTS) if (re.test(text)) return { ...out, key };
  return out;
}

// ---------------------------------------------------------------------------------------------
// The ties. One per stance per position, about the visitor and not about the card.
// Positions 0 and 1: the card's picture first, then this. Position 2: this first, then the card's
// instruction, so the turn ends on the thing they can do with their hands.
// A line with {it} is only used when a subject was actually named.
// ---------------------------------------------------------------------------------------------
const TIES = {
  unfinished: [
    ['You said you start things. You started this one by sitting down; that is one.'],
    ['The trouble is never the first day. It is the third, when it stops being new.'],
    ['You will want to do all of it at once. That is the same as doing none of it.'],
  ],
  decision: [
    ['You brought a choice, and you have carried it as though it might decide itself.'],
    ['You have already chosen. What is left is saying it out loud to somebody.'],
    ['You will ask one more person first. They will say what you have just said.'],
  ],
  person: [
    ['You brought {it}. {Cap} did not come; what you brought is a very accurate copy.', 'You brought a person. They stayed outside. That is the usual arrangement.'],
    ['The card is about you. You have made it about {it}, which is easier.', 'The card is about you. You have made it about somebody else, which is easier.'],
    ['You have drafted something to {them} more than once. The drafts were never the problem.', 'You have drafted something to them more than once. The drafts were never the problem.'],
  ],
  work: [
    ['You brought work into a room with a candle in it. That is how much room it takes.'],
    ['The work is not the difficulty. The difficulty is that nobody has said whether it counts.'],
    ['You will do this on a Sunday and tell nobody that you did it.'],
  ],
  loss: [
    ['You brought a thing that has already happened. Those are the heavy ones; they do not move.'],
    ['Nothing here mends it. It gets further away, which is not the same as smaller.'],
    ['Somebody will tell you to move on. None of them have a date in mind.'],
  ],
  stuck: [
    ['You brought a long wait, folded small so it would come through the door.'],
    ['Nothing is stopping you. That is worse than something, and you knew it in the hall.'],
    ['You have had this answer since before the door shut behind you.'],
  ],
  tired: [
    ['You brought tiredness, which is not a subject. It is the weather the sentence was said in.'],
    ['You are not lazy. You have been doing two things and calling it one.'],
    ['You will not rest until it is finished. It is not going to be finished.'],
  ],
  fear: [
    ['You brought a fear and you have kept it beautifully. It is in excellent condition.'],
    ['The thing you are afraid of and the thing that is happening are not the same size.'],
    ['You will read this as a warning. It is not. It is a Tuesday with a task in it.'],
  ],
  joke: [
    ['You gave me nothing to work with. I shall manage; it is not the first time.'],
    ['The card is being more forthcoming than you were.'],
    ['You may do none of this. The card does not check.'],
  ],
  question: [
    ['You asked me something instead of answering me. It has been noted.'],
    ['You would rather ask than say. It is a way of standing near the thing.'],
    ['You will have another question in a moment. You are allowed one.'],
  ],
  nothing: [
    ['You said nothing, so the card is doing all of the work. It does not mind.'],
    ['Silence is not neutral. It was chosen, at the door, by you.'],
    ['You will not say what it was. That is permitted. The instruction is the same.'],
  ],
};

const POS_INDEX = { brought: 0, going: 1, do: 2 };

export function fill(line, stance) {
  if (!stance) return line.replace(/\{it\}/g, 'them').replace(/\{Cap\}/g, 'They').replace(/\{they\}/g, 'they').replace(/\{them\}/g, 'them');
  return line
    .replace(/\{it\}/g, stance.subject ?? '')
    .replace(/\{Cap\}/g, stance.Cap)
    .replace(/\{they\}/g, stance.they)
    .replace(/\{them\}/g, stance.them);
}

// The one sentence that ties this card's position to what the visitor said. null when nothing matched.
export function tieFor(stance, position) {
  if (!stance?.key) return null;
  const rows = TIES[stance.key];
  if (!rows) return null;
  const variants = rows[POS_INDEX[positionKey(position)] ?? 0] ?? [];
  const usable = variants.filter((v) => !/\{it\}/.test(v) || stance.subject);
  if (!usable.length) return null;
  const pick = usable[hash(stance.subject ?? stance.key) % usable.length];
  return fill(pick, stance).replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------------------------
// A reading. The card's picture and, if a stance matched, the visitor beside it.
// ---------------------------------------------------------------------------------------------
export function readingScript(slug, position, stance) {
  const lines = linesFor(slug, position);
  const tie = tieFor(stance, position);
  if (!tie) return lines.join(' ');
  return positionKey(position) === 'do' ? `${tie} ${lines[0]}` : `${lines[0]} ${tie}`;
}

// Which of the card's written lines the reading actually spent.
function spentAt(slug, position, stance) {
  const lines = linesFor(slug, position);
  return tieFor(stance, position) ? [lines[0]] : lines;
}

// The sentence he held back: a line of this card he did not say. Preferring the "what is actually
// going on" lines, which describe the picture rather than the position.
function heldBack(card, stance) {
  const spent = new Set(spentAt(card.slug, card.position, stance));
  const going = linesFor(card.slug, 'going');
  const brought = linesFor(card.slug, 'brought');
  const doing = linesFor(card.slug, 'do');
  const pool = [going[0], going[1], brought[1], doing[1], brought[0], doing[0]];
  return pool.find((l) => l && !spent.has(l)) ?? going[1] ?? going[0];
}

// ---------------------------------------------------------------------------------------------
// The follow-up: one question, in the visitor's own words, answered with the cards on the table.
// ---------------------------------------------------------------------------------------------
const ALIASES = {
  tower: 'the-house-of-god',
  'the tower': 'the-house-of-god',
  magician: 'the-juggler',
  'the magician': 'the-juggler',
  'high priestess': 'the-popess',
  hierophant: 'the-pope',
  'wheel of fortune': 'wheel-of-fortune',
  'hanged man': 'the-hanged-man',
};

// Which card are they asking about? A name, an alias, or a place on the table. null if unstated.
function namedCard(text, drawn) {
  if (!drawn.length) return null;
  const t = norm(text);
  for (const [alias, slug] of Object.entries(ALIASES)) {
    if (t.includes(alias)) {
      const c = drawn.find((d) => d.slug === slug);
      if (c) return c;
    }
  }
  for (const c of drawn) {
    const n = norm(c.name);
    if (t.includes(n) || t.includes(n.replace(/^the /, ''))) return c;
  }
  if (/\b(first|1st|left|leftmost|one on the left)\b/.test(t)) return drawn[0] ?? null;
  if (/\b(second|2nd|middle|centre|center)\b/.test(t)) return drawn[1] ?? drawn[0] ?? null;
  if (/\b(third|3rd|last|right|rightmost|final)\b/.test(t)) return drawn[drawn.length - 1] ?? null;
  return null;
}

// The shape a real question takes at this table.
export function questionShape(text) {
  const t = norm(text);
  if (!t) return 'none';
  if (/\b(another card|one more card|a fourth|fourth card|more cards|draw again|deal again|one more)\b/.test(t)) return 'more';
  if (/\b(are you|were you|do you (believe|mind|remember|live|like)|how long have you|what are you|who are you|are frogs)\b/.test(t)) return 'pepe';
  if (/\b(what (should|do|can) i do|what now|what next|where do i start|how do i start|so what do i)\b/.test(t)) return 'do';
  if (/\bwhich\b|\bmost important\b|\bthe important one\b|\bmatters most\b|\bwhich one counts\b/.test(t)) return 'which';
  // "is that bad" is about the table; "am I a bad person" is not
  const table = /\b(that|it|this|these|they|card|cards|deck|spread|the (first|second|third|middle|last))\b/;
  if (/\bshould i be worr/.test(t)) return 'bad';
  if (/\b(bad|worse|worst|ominous|awful|terrible|frightening|bad news)\b/.test(t) && table.test(t)) return 'bad';
  if (/\b(good|fine|okay|ok|alright|good news)\b/.test(t) && table.test(t)) return 'good';
  if (/\b(will i|am i|will (she|he|they|it)|is (she|he|they) going to|when will|how long until|do i (ever|still)|going to be (ok|okay|alright|fine))\b/.test(t)) return 'self';
  if (/\b(what does|what do|meaning|means|mean|explain|tell me (more )?about|what is (the|that)|what about)\b/.test(t)) return 'meaning';
  return 'plain';
}

// The one moment the visitor asks something of their own. Every answer names a card that is
// actually lying there; none of them predicts anything.
export function followupScript(question, spread = [], stance = null) {
  const drawn = spread.filter(Boolean);
  const said = String(question ?? '').trim();
  if (!drawn.length) {
    return said
      ? scriptReply(/\?\s*$/.test(said) ? said : `${said}?`)
      : 'No question. The cards are on the table; you may look at them for as long as you like.';
  }
  const mid = drawn[1] ?? drawn[0];
  const last = drawn[drawn.length - 1];
  const target = namedCard(said, drawn) ?? mid;
  const shape = questionShape(said);

  switch (shape) {
    case 'none':
      return 'No question. The cards are on the table; you may look at them for as long as you like.';

    case 'more':
      return 'No. Three is the method. A fourth card is what people ask for when they do not like the third.';

    case 'pepe':
      return 'A frog. I read cards in a rented room and I have done it a long time. The cards are the more interesting half of the table.';

    case 'do':
      return `${firstTwo(linesFor(last.slug, 'do')[0])} That was the third card. It has not improved in the last minute.`;

    case 'which':
      return drawn.length > 2
        ? `The second. ${mid.name}. You brought the first one in with you, so you knew it already; the third is the one you have to do.`
        : `${mid.name}. You brought the other one in with you, so you knew it already.`;

    case 'bad':
      return `No. There are no bad cards. There are cards you were hoping not to see, and ${target.name} is one of those.`;

    case 'good':
      return `It is not a competition. ${target.name} says what it says, and the third card is still the one with work in it.`;

    case 'self':
      return `I cannot tell you that. The cards are lying on a table; they have no news from Thursday. What is true tonight is ${mid.name}.`;

    case 'meaning':
      return `${heldBack(target, stance)} That is what it means. Pictures do not keep a second meaning in reserve.`;

    default:
      return `“${fewWords(said)}.” Look at ${target.name} again. ${firstSentence(heldBack(target, stance))}`;
  }
}

// ---------------------------------------------------------------------------------------------
// The answer beat: the visitor's sentence, folded back. The script does this well; two stances
// deserve a line of their own rather than a hash of the length.
// ---------------------------------------------------------------------------------------------
export function answerScript(said, stance) {
  const text = String(said ?? '').trim();
  if (!text) return scriptReply(text);
  if (stance?.key === 'loss') return SCRIPT.answer[2].replace('{answer}', text.replace(/[.]*$/, '.'));
  if (stance?.key === 'joke') return `“${text}” Very well. That is what we shall read three cards about.`;
  return scriptReply(text);
}

// ---------------------------------------------------------------------------------------------
// The beats with no card in them. The script has more good lines per beat than the fallback used
// to reach for; these are the ones that belong in the frame.
// ---------------------------------------------------------------------------------------------
const BEATS = {
  greeting: (s) => [s.greeting[0], s.greeting[1]],
  question: (s) => [s.question[0]],
  shuffle: (s) => [s.shuffle[0], s.shuffle[1]],
  fan: (s) => [s.draw[0], s.draw[1]],
  draw: (s) => [s.draw[0], s.draw[1]],
  farewell: (s) => [s.farewell[0]],
};

export function beatText(beat) {
  const make = BEATS[beat];
  if (make) return make(SCRIPT).filter(Boolean).join(' ');
  const lines = SCRIPT[beat];
  return (Array.isArray(lines) ? lines : SCRIPT.greeting)[0];
}
