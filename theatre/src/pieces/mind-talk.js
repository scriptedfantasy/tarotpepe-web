// mind-talk.js — the conversation. Tarot Pepe is talked to, not stepped through.
//
// Two things live here, and neither of them needs a model or a network:
//
//   intentOf(text, state) → 'talk' | 'draw' | 'farewell'
//       What the visitor just asked FOR, read from free text. 'draw' is the only thing that puts
//       cards on the table, and it is only ever returned because the visitor asked for cards, in
//       their own words, or said yes to an offer he had just made. "not yet", "just talking",
//       "no thanks" are 'talk' and they also cancel the standing offer.
//
//   talkScript(text, state) → { text, offered, asked }
//       What he says back when there is no live voice. He answers what was asked, says he does not
//       know when he does not, asks one thing back, and every so often offers a reading. He never
//       restarts a speech: `state.used` remembers every line he has spent this visit.
//
// The house style is in script.js and the persona in server/pepe.mjs; this file is the part of him
// that has to work with the electricity off.
import { SCRIPT, reply as scriptReply } from './script.js';
import { stanceOf, followupScript, questionShape, fill } from './mind-voice.js';

const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
};

// three or four of their own words, verbatim, never running past their first full stop
function fewWords(text, n = 4) {
  const first = String(text ?? '').trim().split(/(?<=[.!?…])\s+/)[0] ?? '';
  const words = first.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  return words.slice(0, Math.min(n, words.length)).join(' ').replace(/[.,;:!?…"'”’]+$/, '');
}

// A line he has not spent yet this visit; if he has spent them all, the least recently minted one.
// Lines needing a named person are dropped when nobody was named.
function unused(list, used, salt = '', stance = null) {
  let ok = list.filter((l) => l && (!/\{it\}/.test(l) || stance?.subject));
  // if they named somebody, he uses their name for them
  if (stance?.subject && ok.some((l) => /\{it\}/.test(l))) ok = ok.filter((l) => /\{it\}/.test(l));
  const fresh = ok.filter((l) => !used.has(l));
  const pool = fresh.length ? fresh : ok;
  if (!pool.length) return null;
  const line = pool[hash(salt + pool.length) % pool.length];
  used.add(line);
  return fill(line, stance);
}

// ---------------------------------------------------------------------------------------------
// What did they just ask for?
// ---------------------------------------------------------------------------------------------
const FAREWELL =
  /\b(goodbye|good ?bye|good ?night|bye now|bye bye|^bye$|i (should|have to|must|will|need to) go|i'?m off|im off|that'?s (all|it|enough)|thats (all|it|enough)|that will do|i'?m done|im done|we'?re done|nothing else|see you|farewell|ill leave|i'?ll leave|leaving now)\b/;

const DECLINE =
  /\b(not yet|not now|not tonight|no thanks|no thank you|maybe later|in a minute|in a moment|hold on|just talk|just talking|only talking|no cards|not ready|rather not|don'?t want|dont want|no reading|later maybe|another time)\b/;

const DRAW =
  /\b(read (my|the|me|us) (cards?|fortune)|read for me|reading please|a reading|do a reading|my reading|the cards? please|cards? please|draw (a|the|some|three|3)? ?cards?|deal (me |the )?(cards?|three|3)|pull (a|some|three|3)? ?cards?|do a spread|a spread|three cards|3 cards|show me (the )?cards?|lay (them|the cards) out|turn (them|the cards) over|shuffle|let'?s do (it|this)|i want a reading|i'?d like a reading|id like a reading|can you read|will you read|would you read|tell my fortune|do your thing|go on then)\b/;

const YES = /^(yes|yeah|yep|yup|sure|ok|okay|k|alright|all right|fine|go on|go ahead|please|please do|do it|why not|very well|i suppose|if you like|mhm|uh huh|absolutely|definitely|lets|let's)\b/;

const NO_BARE = /^(no|nope|nah|not really|no thanks)\b/;

// text → 'talk' | 'draw' | 'farewell'. `offered` is true when his last turn put a reading on offer.
export function intentOf(text, { offered = false } = {}) {
  const t = norm(text);
  if (!t) return 'talk';
  if (FAREWELL.test(t)) return 'farewell';
  if (DECLINE.test(t) || NO_BARE.test(t)) return 'talk';
  if (DRAW.test(t)) return 'draw';
  if (offered && YES.test(t)) return 'draw';
  return 'talk';
}

// ---------------------------------------------------------------------------------------------
// Things he is asked directly, and what he says. Checked before anything else.
// ---------------------------------------------------------------------------------------------
const DIRECT = [
  [/^(hi|hello|hey|yo|good evening|good afternoon|evening|hallo|howdy)\b/, ['Good evening. Please sit. The chair is low; it was made for a frog.', 'Good evening. You are already sitting down, which saves us both a sentence.']],
  [
    /\b(who are you|what are you|your name|whats your name|what'?s your name|are you a frog|are you real|are you a person|are you human|are you an ai|are you a bot|are you a robot|are you alive)\b/,
    ['Tarot Pepe. A frog. I read cards in a rented room; that is the whole of the biography.', 'A frog with a deck of cards and a lease. There is not a longer answer.'],
  ],
  [
    /\b(how does (this|it) work|how do you do this|what happens (here|now)|what do you do|what is this|whats this|how do we start|what are the rules)\b/,
    ['Three cards. What you brought, what is actually going on, what to do about it. I did not invent it and I have not improved it.', 'You talk. I listen. If you ask for cards there are three of them, and not four.'],
  ],
  [/\b(how much|what does it cost|do i pay|is it free|the price|how many euros|how many dollars)\b/, ['Nothing. The room is rented by the month whether you sit in it or not.']],
  [/\b(how are you|how are things|how'?s it going|hows it going|you alright|are you ok|are you well)\b/, ['The same. The candle is shorter than it was this morning. And you?']],
  [/\b(thank you|thanks|cheers|much appreciated|appreciate it)\b/, ['You are welcome. Sit as long as you like; the bench does not mind.', 'Noted. People thank me at the beginning and mean it at the end.']],
  [/\b(sorry|apologies|apologise|apologize|my bad)\b/, ['There is nothing to apologise for. People arrive here in worse condition than this.']],
  [
    /\b(see the future|tell (me )?the future|predict|will you know|do you know what will happen|whats going to happen|what will happen)\b/,
    ['No. I look at a picture on a piece of card and at the person opposite. Thursday is not consulted.'],
  ],
  [/\b(is (this|it) real|does (this|it) (actually )?work|is it magic|magic|do you believe (in )?(this|it)|is it true)\b/, ['It is card and ink. What works is that somebody says one true sentence out loud in a small room.']],
  [/\b(where am i|where is this|what is this place|whose room|what city|what town)\b/, ['A parlour. Bottles on the shelf, a radio that is off, one chair for visitors. You are in it.']],
  [/\b(are you (busy|alone|lonely)|do you get many|many visitors|who else comes|do people come)\b/, ['Enough. They come in the evening, mostly, and they all sit down the same way.']],
  [/\b(can i (smoke|drink|stay|sit)|is it ok if i)\b/, ['Yes. The ashtray is on the table and the glass is clean.']],
];

// ---------------------------------------------------------------------------------------------
// What he makes of a plain statement, by stance. Two sentences, about the visitor.
// ---------------------------------------------------------------------------------------------
const ACK = {
  unfinished: ['You start things. Starting is the part you are good at, and you said it first, which is honest.', 'Begun and not finished. That is a large club and the meetings are badly attended.'],
  decision: ['A choice, then. You have been carrying it about as though it might decide itself.', 'Two things want you. That is flattering, and it is also arithmetic.'],
  person: ['So it is {it}. {Cap} did not come; what you brought is a very accurate copy.', 'A person, then. The chair opposite holds one, and you are in it.'],
  work: ['Work. You have brought it into a room with a candle in it; that is how much room it takes.', 'The job, then. It follows people down the street and sits on the table like a hat.'],
  loss: ['I am sorry. That has already happened, and the ones that have already happened do not move.', 'That is the heavy sort. I will not tell you it is small and I will not tell you it is unusual.'],
  stuck: ['A wait, then. Folded small so it would come through the door.', 'Nothing has changed. That is a kind of news, and nobody prints it.'],
  tired: ['Tiredness is not a subject; it is the weather the sentence was said in. I have noted it anyway.', 'You are not lazy. You have been doing two things and calling it one.'],
  fear: ['A fear, and very well kept. It is in excellent condition.', 'You are frightened of something you can describe. That is further along than most people get.'],
  joke: ['Very well. That is what we have to work with.', 'I have written it down. It looks worse written down.'],
  nothing: ['Silence is the most common thing brought here, and the heaviest.', 'Nothing. Permitted. The cards have been read for less.'],
};

// One thing back. This is what makes it a conversation and not a recital.
const ASK = {
  unfinished: ['How many are open at the moment?', 'Which one did you get furthest with?'],
  decision: ['Which would you take if nobody ever found out?', 'How long has it been two things?'],
  person: ['When did you last speak to {them}?', 'Does {they} know that you are sitting here?'],
  work: ['Does anybody there say when a thing is finished?', 'Is it the work, or the people the work is for?'],
  loss: ['How long ago?', 'Who else in your house is not talking about it?'],
  stuck: ['What would have to move first?', 'And what have you been telling people meanwhile?'],
  tired: ['When did you last sleep through the night?', 'What is the first thing you do in the morning?'],
  fear: ['And if it happened?', 'Who told you it would?'],
  joke: ['Try it again in one sentence, and mean it.', 'And underneath that?'],
  nothing: ['Shall I ask you something instead?', 'Would you rather sit for a moment?'],
};

const ASK_ANY = [
  'Since when?',
  'Who else knows?',
  'And what does that cost you?',
  'How long has that been true?',
  'Is that the whole of it, or the part you rehearsed?',
  'What would you like to be different by Friday?',
  'Say the next sentence. It is usually the first one again, only louder.',
];

// What he notices when a sentence has no stance in it and the conversation is already running.
// Each is only said when the thing it names is actually there, so it is never a horoscope.
const NOTICE = [
  [/\bbut\b/, 'Everything before the "but" was the polite half.'],
  [/\b(just|only)\b/, 'You said "just". People put that word in front of the thing that is not just.'],
  [/\b(always|never)\b/, 'You said "always". Nothing is always. It is often, and often is the worse word.'],
  [/\b(i think|maybe|perhaps|probably|sort of|kind of|i guess|i suppose)\b/, 'You hedged. You may say it flat in here; the room is rented.'],
  [/\b(january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/, 'You gave me a date. That is the most useful thing anybody has said tonight.'],
  [/\b\d+\b|\b(one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty)\b/, 'A number. People do not usually bring numbers in here.'],
  [/\b(everyone|everybody|people|they all|nobody|no one)\b/, 'You have brought a crowd into a room with one spare chair.'],
  [/\b(fine|okay|ok|alright|no big deal|whatever)\b/, 'You said it was fine. Nobody sits down in here about a thing that is fine.'],
];

const PLAIN_ACK = [
  '“{words}.” I see. Go on.',
  'Yes. Say the next part.',
  '“{words}.” Noted. It is on the table now, next to the ashtray.',
  'Very well. That is on the record, such as the record is.',
];

const UNKNOWN = [
  'I do not know. I am a frog with a deck of cards; the range is narrow.',
  'I have no idea. Nobody in this room does, and the room is not large.',
  'That one is outside my line of work. I will not invent an answer for it.',
];

// A question about cards, and no cards on the table.
const NO_CARDS = [
  'There is nothing to look at yet. The deck is face down and it stays that way until you ask.',
  'I cannot answer that from an empty table. Ask me for the cards and there will be three of them.',
];

// After he has answered something about himself, he hands it back.
const RETURN = ['Now. You were saying.', 'That is me. You were the subject.', 'Enough about the frog. Go on.'];

// The door has just shut and they have said hello, or asked what this is.
const OPENER = ['What brings you in tonight?', 'What are you carrying?', 'And you? What is it tonight?'];

const OFFER = [
  'Shall I read the cards? Three of them. You may say no; people do.',
  'There are three cards in this, if you want them. Say so and I will shuffle.',
  'I could turn three cards on that. Only if you ask. I do not deal at people.',
  'The deck is on the table, face down. It stays there until you ask it not to.',
];

const DECLINED = [
  'Very well. The deck will keep. Talk as long as you like.',
  'No cards, then. That is the more sensible half of the evening anyway.',
];

const FAREWELL_LINES = SCRIPT.farewell;
// nobody asked for cards: he does not send them out on a reading that did not happen
const FAREWELL_NO_CARDS = [
  'No cards tonight, then. That is permitted, and rarer than you would think. Mind the step; it is lower than it looks.',
  'You may go. The bench does not mind either way, and the deck will keep. Good night.',
];

// ---------------------------------------------------------------------------------------------
// One scripted turn.
//
// state: { turns, used:Set, offered, declined, spread, stance }  (owned by mind.js, mutated here)
// → { text, offered, asked }
// ---------------------------------------------------------------------------------------------
export function talkScript(raw, state) {
  const said = String(raw ?? '').trim();
  const t = norm(said);
  const used = state.used ?? (state.used = new Set());
  const spread = (state.spread ?? []).filter(Boolean);
  const stance = stanceOf(said);
  if (stance.key && stance.key !== 'question' && stance.key !== 'joke') state.stance = stance;

  const parts = [];
  let asked = false;
  const isQuestion = /\?\s*$/.test(said);

  // they turned the reading down: acknowledge it and stop offering for a while
  if (DECLINE.test(t) || NO_BARE.test(t)) {
    parts.push(unused(DECLINED, used, t));
    // and straight back to what they were actually talking about
    const back = state.stance?.key && ASK[state.stance.key] ? ASK[state.stance.key] : ASK_ANY;
    parts.push(unused(back, used, t + 'q', state.stance));
    return { text: parts.filter(Boolean).join(' '), offered: false, asked: true };
  }

  // the cards are on the table: a question is about them
  if (spread.length && isQuestion) {
    return { text: followupScript(said, spread, state.stance), offered: false, asked: false };
  }

  // something asked straight out
  const direct = DIRECT.find(([re]) => re.test(t));
  if (direct) {
    parts.push(unused(direct[1], used, t));
    // he does not linger on himself: back to them, and at the door he simply opens the floor
    parts.push(state.turns > 1 ? unused(RETURN, used, t + 'r') : unused(OPENER, used, t + 'o'));
    return { text: parts.filter(Boolean).join(' '), offered: false, asked: state.turns <= 1 };
  } else if (isQuestion && ['which', 'meaning', 'bad', 'good', 'do', 'more'].includes(questionShape(said))) {
    // they want the cards to answer and there are none
    parts.push(unused(NO_CARDS, used, t));
    return { text: parts.filter(Boolean).join(' '), offered: true, asked: true };
  } else if (isQuestion) {
    parts.push(unused(UNKNOWN, used, t));
  } else if (!t) {
    parts.push(unused(ACK.nothing, used, 'empty'));
  } else if (stance.key && ACK[stance.key]) {
    parts.push(unused(ACK[stance.key], used, t, stance));
  } else if (state.turns <= 1) {
    // the first thing they say is folded back to them whole; after that he only notices
    parts.push(scriptReply(said));
  } else {
    const seen = NOTICE.find(([re, line]) => re.test(t) && !used.has(line));
    if (seen) {
      used.add(seen[1]);
      parts.push(seen[1]);
    } else parts.push((unused(PLAIN_ACK, used, t) ?? '').replace(/\{words\}/g, fewWords(said)));
  }

  // Every third turn, the offer. Never while one is already standing, never once cards are down,
  // and never in the same breath as a question of his own.
  const heard = state.turns >= 2 || (stance.key && stance.key !== 'joke' && stance.key !== 'nothing');
  if (heard && !state.offered && !spread.length && state.turns % 3 === 2) {
    parts.push(unused(OFFER, used, t + state.turns));
    return { text: parts.filter(Boolean).join(' '), offered: true, asked: true };
  }

  // otherwise one thing back
  const bank = stance.key && ASK[stance.key] ? ASK[stance.key] : ASK_ANY;
  const q = unused(bank, used, t + 'q', stance);
  if (q) {
    parts.push(q);
    asked = true;
  }

  return { text: parts.filter(Boolean).join(' '), offered: false, asked };
}

// The last thing he says. Not a summary.
export function farewellScript(state) {
  const used = state?.used ?? new Set();
  const dealt = (state?.spread ?? []).filter(Boolean).length;
  const bank = dealt ? FAREWELL_LINES : FAREWELL_NO_CARDS;
  return unused(bank, used, 'bye') ?? bank[0];
}

// He put a reading on offer just now: true when his own words end in a question about cards.
export function looksLikeOffer(text) {
  const t = norm(text);
  return /\?/.test(t) && /\b(cards?|shuffle|deck|spread|read|turn three|three of them)\b/.test(t);
}

export { fewWords };
