// mind-voice.js — the scripted intelligence behind mind.js. No model, no network.
//
// Three jobs the written script could not do on its own:
//
//   0. READING THE SENTENCE. `isQuestion()`, `aboutHim()`, `cardRef()`, `aboutTheSpread()`. A
//      question is a question whether or not the visitor typed the mark, and almost nobody types
//      it: "what does the middle one mean" is a question, "have a good night" is not. A question
//      about HIM is not a report on them — "do you ever get tired of this" is his tiredness, not
//      theirs, and it must not become the evening's subject. And when cards are down, a line that
//      points at one — by name, by place, or with a finger — is answered with THAT card.
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

// ---------------------------------------------------------------------------------------------
// Reading a sentence. Three things have to be true of this before anything else works.
//
//   isQuestion()   A question is a question whether or not the visitor typed the mark. Nobody
//                  types the mark. "what does the middle one mean" is a question; "have a good
//                  night" and "do not tell me the future" are not, though they open with the
//                  same words.
//   aboutHim()     A question about HIM is not the visitor reporting on themselves. "do you ever
//                  get tired of this" is not a tired visitor, and must not be answered as one.
//   cardRef()      Which card on the table they mean, by name, by place, or by pointing.
// ---------------------------------------------------------------------------------------------

// the noises people put in front of the sentence they actually mean
const LEAD =
  /^(?:(?:so|and|but|well|ok|okay|alright|all right|right|now|then|hey|hi|hello|please|sorry|excuse me|actually|honestly|anyway|um|uh|erm|hmm+|oh|yeah|yes|no|nah|pepe|tarot pepe|sir)\b[,.!\s]+)+/;

// the words a question opens with
const OPENS =
  /^(what|whats|why|how|hows|who|whos|whose|whom|when|where|which|do|does|did|can|could|will|would|shall|should|are|is|am|was|were|have|has|had|may|might|must)\b/;
// ... except when it opens a refusal or an instruction: "do not ask me", "will not happen"
const NOT_ASKING = /^(?:do|does|did|will|would|can|could|should|shall|may|might|must|have|has|had|is|are|was|were|am)\s+(?:not|never)\b/;
// "have a good night", "have a look" — an imperative, not "have you"
const IMPERATIVE = /^(?:have|has|had)\s+(?!(?:i|you|we|they|he|she|it|any|anyone|anybody|there|that|this|the)\b)/;
// "what a night", "how strange" — an exclamation wearing a question's hat
const EXCLAIM = /^(?:what (?:a|an) \w+|how (?:strange|odd|nice|funny|sad|awful|lovely|curious|interesting|kind|rude|convenient|very))\b/;
// a contraction only asks when a subject follows it: "don't you think" asks, "don't tell me" does not
const CONTRACTED =
  /^(?:don'?t|doesn'?t|didn'?t|can'?t|won'?t|wouldn'?t|couldn'?t|shouldn'?t|isn'?t|aren'?t|ain'?t|haven'?t|hasn'?t|weren'?t|wasn'?t)\s+(?:i|you|we|they|he|she|it|that|this|there)\b/;
// a question buried in a request: "tell me what you do", "I wonder why he left"
const ASKS_INSIDE =
  /\b(?:tell me|i wonder|i want to know|i would like to know|i'd like to know|do you know|any idea|no idea)\b[ ,]+(?:what|whats|why|how|who|when|where|which|whether|if|about)\b/;

// Is this a question? The mark if it is there, otherwise the shape of the first or the last
// sentence — a visitor types one line and the question is at one end of it or the other.
export function isQuestion(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return false;
  if (/\?/.test(text)) return true;
  const parts = sentencesOf(text);
  // the first sentence, the last sentence, and the last clause of it: people put the question at
  // the end of a line and hold it on with a comma — "I am so tired, what am I supposed to do"
  const tail = parts[parts.length - 1] ?? '';
  const clauses = tail.split(/[,;–—]+/);
  for (const part of [parts[0], tail, clauses[clauses.length - 1]]) {
    if (!part) continue;
    const t = norm(part).replace(LEAD, '');
    if (!t) continue;
    if (ASKS_INSIDE.test(t) || CONTRACTED.test(t)) return true;
    if (NOT_ASKING.test(t) || IMPERATIVE.test(t) || EXCLAIM.test(t)) continue;
    if (OPENS.test(t)) return true;
  }
  return false;
}

const SECOND = /\b(you|your|yours|yourself|frog|frogs)\b/;
const FIRST = /\b(i|i'm|im|i've|ive|i'd|i'll|me|my|mine|myself|we|us|our|ours|we're)\b/;
// "what do you make of that" is about the thing on the table, not about the frog. It only counts
// when the pointing is the end of the sentence; "how much of this do you believe" is about him.
const OF_A_THING = /\b(?:of|about) (?:that|it|this|these|those|them|the card|the cards|the spread)\s*[?.!]*$/;

// A question about him: second person, no first person, not pointed at a thing on the table.
// "tell me what you do all day" and "do you get many people like me" are still questions about
// him: the visitor is in the sentence, but only as the one doing the asking or the comparing.
const ASIDE =
  /^(?:tell me|i wonder|i want to know|i would like to know|i'd like to know|do you know|any idea)\b[ ,]*|\b(?:like|about|of|for|with|to|from) (?:me|us)\b|\b(?:remember|recognise|recognize|know|see|hear|understand|believe|like|mind|judge|charge) (?:me|us)\b/g;

export function aboutHim(raw) {
  const t = norm(raw);
  if (!t || !SECOND.test(t)) return false;
  if (FIRST.test(t.replace(ASIDE, ' ')) || OF_A_THING.test(t)) return false;
  return isQuestion(t);
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
  ['joke', /\b(walks? into a bar|knock knock|why did the (chicken|frog|man)|a (man|frog|priest|horse) walks into|that is the joke|thats the joke|just kidding|only joking|ribbit)\b/],
  [
    'loss',
    /\b(died|dying|dead|death|passed away|funeral|grief|grieving|mourning|buried|hospice|terminal|widow|widowed|miscarriage|miscarried|stillborn|suicide|broke up|breakup|divorce|divorced|separated|left me|dumped me|it ended|ended it|lost (my|the|our) (baby|child|son|daughter|mother|mum|mom|father|dad|brother|sister|wife|husband|partner|friend|dog|cat))\b/,
  ],
  ['decision', /\b(should i|i should|shall i|whether|decide|deciding|decision|choose|choosing|choice|torn|or not|either way|can'?t decide|can'?t choose|two (jobs|offers|options|people|places)|leave (him|her|them|my))\b/],
  ['unfinished', /\b(start(ing|ed)? (things|stuff|something|projects)|never finish|not finish(ing)?|don'?t finish|unfinished|half (done|finished|way)|halfway|abandon|gave up|give up|procrastinat|put(ting)? (it|things) off)\b/],
  ['person', RELATION],
  ['person', /\b(he|him|his|she|her|hers|someone|somebody)\b/],
  ['stuck', /\b(stuck|nothing changes|nothing has changed|no progress|going nowhere|limbo|treading water|stagnant|plateau|the same (thing|way|as)|still (here|there|waiting)|for years|years now|waiting)\b/],
  ['work', /\b(job|jobs|work|working|career|boss|office|company|business|startup|client|clients|promotion|fired|redundan|quit|colleague|salary|money|rent|freelance|deadline|the firm)\b/],
  ['tired', /\b(tired|exhaust|burn(t|ed) out|burnout|no energy|worn out|can'?t sleep|insomnia|drained|knackered|wiped)\b/],
  ['fear', /\b(afraid|scared|scary|frightened|terrified|worried|worry|worrying|anxious|anxiety|nervous|dread|panic|fear)\b/],
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
  // A question about him is not a report on them: "do you ever get tired of this" is his
  // tiredness, not theirs, and it must never become the visitor's stance for the evening.
  if (aboutHim(text)) return { ...out, key: 'question' };
  // "lost my job" is work, not a bereavement
  if (/\b(lost|losing|quit|fired|laid off|made redundant)\b/.test(text) && /\b(job|work|role|position|company|contract)\b/.test(text)) {
    return { ...out, key: 'work' };
  }
  for (const [key, re] of TESTS) if (re.test(text)) return { ...out, key };
  return isQuestion(text) ? { ...out, key: 'question' } : out;
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
  let usable = variants.filter((v) => !/\{it\}/.test(v) || stance.subject);
  // they named somebody: he uses the name, not "a person"
  if (stance.subject && usable.some((v) => /\{it\}|\{them\}/.test(v))) usable = usable.filter((v) => /\{it\}|\{them\}/.test(v));
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
  'house of god': 'the-house-of-god',
  magician: 'the-juggler',
  'high priestess': 'the-popess',
  priestess: 'the-popess',
  hierophant: 'the-pope',
  wheel: 'wheel-of-fortune',
  'wheel of fortune': 'wheel-of-fortune',
  'hanged man': 'the-hanged-man',
  'hanged frog': 'the-hanged-man',
  'last judgement': 'judgement',
  judgment: 'judgement',
  'the star card': 'the-star',
};

// Where on the table, in the words people actually use. "left" only counts as a place when it is
// wearing a determiner: "she left me" is not a card.
// An ordinal only counts with a determiner in front or a noun behind it, so that "first, I should
// say something" and "she left me" are not cards.
const PLACES = [
  [/\bthe (?:first|1st)\b|\b(?:first|1st) (?:one|card|picture)\b|\bnumber one\b|\bcard (?:one|1)\b|\bthe left(?:most| one| card| hand)?\b|\bleftmost\b|\bfar left\b|\bleft.hand (?:one|card)\b/, 0],
  [/\bthe (?:second|2nd)\b|\b(?:second|2nd) (?:one|card|picture)\b|\bnumber two\b|\bcard (?:two|2)\b|\bthe (?:middle|centre|center)\b|\b(?:middle|centre|center) (?:one|card|picture)\b/, 1],
  [
    /\bthe (?:third|3rd|last|final)\b|\b(?:third|3rd|last|final) (?:one|card|picture)\b|\bnumber three\b|\bcard (?:three|3)\b|\bthe right(?:most| one| card| hand)?\b|\brightmost\b|\bfar right\b|\bright.hand (?:one|card)\b/,
    2,
  ],
];

// pointing at one without naming it: "this one", "that card", "the one you turned"
const DEICTIC = /\b(?:this|that|the) (?:one|card|picture)\b|\bthe one (?:you|i) (?:just )?(?:turned|read|said|did)\b|\bthat picture\b/;
const SUITS = /\b(cups?|pentacles?|coins?|swords?|wands?|batons?|staves)\b/;
const SUIT_OF = { cup: 'cups', cups: 'cups', pentacle: 'pentacles', pentacles: 'pentacles', coin: 'pentacles', coins: 'pentacles', sword: 'swords', swords: 'swords', wand: 'wands', wands: 'wands', baton: 'wands', batons: 'wands', staves: 'wands' };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Which card are they pointing at? → {card, index, how} or null. `how` is 'name' | 'place' |
// 'suit' | 'point', which is also how sure he is allowed to sound about it.
export function cardRef(text, spread = []) {
  const drawn = (spread ?? []).filter(Boolean);
  if (!drawn.length) return null;
  const t = norm(text);
  const at = (card, how) => (card ? { card, index: drawn.indexOf(card), how } : null);

  for (const [alias, slug] of Object.entries(ALIASES)) {
    if (t.includes(alias)) {
      const c = drawn.find((d) => d.slug === slug);
      if (c) return at(c, 'name');
    }
  }
  for (const c of drawn) {
    const n = norm(c.name);
    const bare = n.replace(/^the /, '');
    if (t.includes(n) || new RegExp(`\\b${esc(bare)}\\b`).test(t)) return at(c, 'name');
  }
  for (const [re, i] of PLACES) if (re.test(t)) return at(drawn[Math.min(i, drawn.length - 1)], 'place');
  // one card of that suit is on the table and they said the suit: that is the one they mean
  const suit = t.match(SUITS);
  if (suit) {
    const want = SUIT_OF[suit[1]];
    const hits = drawn.filter((c) => norm(c.name).endsWith(want));
    if (hits.length === 1) return at(hits[0], 'suit');
  }
  if (DEICTIC.test(t)) return at(drawn[drawn.length - 1], 'point');
  return null;
}

// Is this line about the cards lying there at all? A named card, a place, the word itself, or a
// question of the kind the table answers.
export function aboutTheSpread(text, spread = []) {
  const drawn = (spread ?? []).filter(Boolean);
  if (!drawn.length) return false;
  if (aboutHim(text)) return false;
  if (cardRef(text, drawn)) return true;
  const t = norm(text);
  // "deal me another one" is not a question and is still about the table
  if (questionShape(t) === 'more') return true;
  // anything else that is not a question and does not point at a card is table talk, and table
  // talk is answered as talk: "I have never had my cards read before" wants no card in the answer.
  if (!isQuestion(text)) return false;
  // "reading" and "table" are words about the evening, not about a card: "what would a reading
  // even tell me" is talk. The cards themselves are not.
  if (/\b(cards?|deck|spread|picture|pictures|arcana)\b/.test(t)) return true;
  return ['which', 'meaning', 'bad', 'good', 'do', 'more', 'self', 'judge', 'decide'].includes(questionShape(text));
}

// What he calls the card's place at the table, in the visitor's own terms.
function placeOf(card, drawn) {
  const i = drawn.indexOf(card);
  if (i < 0 || drawn.length < 2) return 'That card';
  if (i === 0) return 'The first one';
  if (i === drawn.length - 1) return drawn.length > 2 ? 'The third one' : 'The second one';
  return 'The middle one';
}

// The shape a real question takes at this table.
export function questionShape(text) {
  // "I mean" is a noise, not the verb: "is it going to be all right, I mean really" is not a
  // question about what a card means.
  const t = norm(text).replace(/\bi mean\b[, ]*/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return 'none';
  if (/\b(another card|another one|one more card|a fourth|fourth card|more cards|draw again|deal again|turn another)\b/.test(t)) return 'more';
  if (aboutHim(t) || /\b(are you|were you|how long have you|what are you|who are you|are frogs)\b/.test(t)) return 'pepe';
  if (/\b(what (should|do|can) i do|what am i (supposed to do|to do)|what now|what next|now what|where do i (start|begin)|how do i (start|begin)|so what do i)\b/.test(t)) return 'do';
  if (/\bwhich\b|\bmost important\b|\bthe important one\b|\bmatters most\b|\bwhich one counts\b/.test(t)) return 'which';
  // "is that bad" is about the table; "am I a bad person" is not
  const table = /\b(that|it|this|these|they|card|cards|deck|spread|the (first|second|third|middle|last))\b/;
  // asking him to pass sentence on them: "do you think I am a bad person"
  if (/\b(do you think|would you say|do you reckon|am i|are we)\b/.test(t) && /\b(bad|good|terrible|awful|stupid|foolish|a fool|mad|crazy|wrong|selfish|weak|hopeless|a bad person|a good person|too old|too late)\b/.test(t)) return 'judge';
  if (/\bshould i be worr/.test(t)) return 'bad';
  // asking him to make the choice: he does not make it, and he says so
  if (/\b(should i|shall i|ought i|do you think i should|is it worth|do i (call|leave|stay|go|tell|say|forgive|wait))\b/.test(t)) return 'decide';
  if (/\b(bad|worse|worst|ominous|awful|terrible|frightening|bad news)\b/.test(t) && table.test(t)) return 'bad';
  if (/\b(good|fine|okay|ok|alright|good news)\b/.test(t) && table.test(t)) return 'good';
  if (/\b(will i|am i|will (she|he|they|it)|is (she|he|they) going to|when will|how long until|do i (ever|still)|going to be (ok|okay|alright|all right|fine)|be all right|work out in the end)\b/.test(t)) return 'self';
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
      ? scriptReply(isQuestion(said) && !/\?\s*$/.test(said) ? `${said}?` : said)
      : 'No question. The cards are on the table; you may look at them for as long as you like.';
  }
  const mid = drawn[1] ?? drawn[0];
  const last = drawn[drawn.length - 1];
  const ref = cardRef(said, drawn);
  // Nothing named: "that" after the last card was read means the last card.
  const target = ref?.card ?? (/\b(that|it|this)\b/.test(norm(said)) ? last : mid);
  const place = placeOf(target, drawn);
  const shape = questionShape(said);
  const asked = isQuestion(said);

  // "is that the tower?" — they have named it, and on this deck it is called something else.
  if (ref?.how === 'name' && /^(?:is|are|was|isn'?t|that'?s|this is)\b/.test(norm(said))) {
    return norm(said).includes(norm(target.name))
      ? `Yes. ${target.name}. ${firstSentence(heldBack(target, stance))}`
      : `It is called ${target.name} on this deck. The same picture, an older printer. ${firstSentence(heldBack(target, stance))}`;
  }

  // They pointed at a card and did not ask anything: he says what it is and stops.
  if (ref && !asked) {
    const said1 = firstSentence(heldBack(target, stance));
    const banks = [
      `${place} is ${target.name}. ${said1} It will not change while you look at it.`,
      `${target.name}, then. ${said1} Say what it is you see in it.`,
      `${target.name}. ${said1} That is the whole of that one.`,
    ];
    return banks[hash(said + target.slug) % banks.length];
  }

  switch (shape) {
    case 'none':
      return 'No question. The cards are on the table; you may look at them for as long as you like.';

    case 'more':
      return 'No. Three is the method. A fourth card is what people ask for when they do not like the third.';

    case 'pepe':
      return 'A frog. I read cards in a rented room and I have done it a long time. The cards are the more interesting half of the table.';

    case 'do':
      return `${firstTwo(linesFor(last.slug, 'do')[0])} That was ${last.name}, the third card. It has not improved in the last minute.`;

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

    case 'decide':
      return `I do not decide for people. ${last.name} is the third card and it is an instruction, not a suggestion.`;

    case 'judge':
      return `Not on the table, and not mine to say. ${mid.name} is on the table, and it has no opinion of your character.`;

    case 'meaning':
      return `${place} is ${target.name}. ${firstSentence(heldBack(target, stance))} Pictures do not keep a second meaning in reserve.`;

    default: {
      const head = `${place} is ${target.name}. ${firstSentence(heldBack(target, stance))}`;
      if (ref) return head;
      return asked ? `${head} If that is not what you asked, ask it again shorter.` : `${head} You may look at it as long as you like.`;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// The recall: they have asked to look at the cards again, and the camera is on them while he
// talks. So he does the one thing the picture cannot do — he names them — and then says something
// he did NOT say when he read them. `heldBack` is exactly that pool: the card's written lines the
// reading did not spend. Never a summary of the reading; they heard it ten seconds ago.
//
// `focus` is the card they meant (an index into the drawn cards) or null for all three.
// ---------------------------------------------------------------------------------------------
export function recallScript(said, spread = [], stance = null, focus = null) {
  const drawn = (spread ?? []).filter(Boolean);
  if (!drawn.length) return 'Nothing has been drawn. The deck is face down where it has been all evening. Ask, and there will be three of them.';
  const one = Number.isInteger(focus) && drawn[focus] ? drawn[focus] : (cardRef(said, drawn)?.card ?? null);
  const t = String(said ?? '');
  if (one) {
    const place = placeOf(one, drawn);
    const held = firstSentence(heldBack(one, stance));
    const banks = [
      `${place}: ${one.name}. ${held} It has not changed while we were talking.`,
      `${one.name}, ${place.toLowerCase()}. ${held}`,
      `That one is ${one.name}. ${held} Look at it as long as you like.`,
    ];
    return banks[hash(t + one.slug) % banks.length];
  }
  // He does NOT list the three here. The camera has just been on each card in turn with its
  // printed name on the placard beside it (flow.js → revisit), which is where a name is legible
  // and where the visitor is actually looking; three card names in one caption run to sixty
  // characters, and the placard cuts a long line into takes, so the third of them ends up alone on
  // a card of its own reading like half a sentence. The names are given; this is the remark over
  // the row afterwards.
  const banks = [
    'All three, where you left them. They have not moved and they are not going to.',
    'The same three cards. Cards do not improve overnight.',
    'There they are. Take your time over them; the deck is not waiting for anything.',
  ];
  return banks[hash(t + drawn.map((c) => c.slug).join()) % banks.length];
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
