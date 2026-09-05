// mind-talk.js — the conversation. Tarot Pepe is talked to, not stepped through.
//
// Two things live here, and neither of them needs a model or a network:
//
//   intentOf(text, state) → 'talk' | 'draw' | 'recall' | 'farewell'
//       What the visitor just asked FOR, read from free text. 'draw' is the only thing that puts
//       cards on the table, and it is only ever returned because the visitor asked for cards, in
//       their own words, or said yes to an offer he had just made. "not yet", "just talking",
//       "no thanks" are 'talk' and they also cancel the standing offer. 'recall' is the visitor
//       asking to LOOK at cards that are already down — a digression, and never a deal; the whole
//       of the reasoning that keeps the two apart is at RECALL_NOT, below.
//
//   talkScript(text, state) → { text, offered, asked }
//       What he says back when there is no live voice. He answers what was asked, says he does not
//       know when he does not, asks one thing back, and every so often offers a reading. He never
//       restarts a speech: `state.used` remembers every line he has spent this visit.
//
//       The order of his attention, and every branch is a different kind of sentence:
//         a refusal · an insult · a card on the table · a thing asked straight out (DIRECT) ·
//         a question about him (HIM) · a question about the spread · a question about them ·
//         a plain statement · and then one thing back.
//       Two rules hold the whole thing up. A question is a question with or without the mark
//       (mind-voice's isQuestion), and a canned answer may only take a sentence it accounts for
//       entirely — every DIRECT pattern is anchored to the whole line by `only()`, so the answer
//       to "what do you do" cannot be given to "what do you do when nobody comes in".
//
// The house style is in script.js and the persona in server/pepe.mjs; this file is the part of him
// that has to work with the electricity off.
import { SCRIPT, reply as scriptReply } from './script.js';
import { stanceOf, followupScript, questionShape, fill, isQuestion, aboutHim, cardRef, aboutTheSpread } from './mind-voice.js';

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

// three or four of their own words, verbatim, never running past their first full stop and never
// stopping on a word that is holding the door open for the next one ("you smell like a")
const DANGLING = /^(a|an|the|my|your|his|her|our|their|this|that|these|those|to|of|in|on|at|for|with|and|but|or|is|was|are|were|be|been|have|has|had|do|does|did|so|as|it|not|no|very|really|just|about|from|by|like|than|if|when|while|because)$/;
function fewWords(text, n = 4) {
  const first = String(text ?? '').trim().split(/(?<=[.!?…])\s+/)[0] ?? '';
  const words = first.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const take = words.slice(0, Math.min(n, words.length));
  while (take.length > 2 && DANGLING.test(take[take.length - 1].replace(/[.,;:!?…"'”’]+$/, '').toLowerCase())) take.pop();
  // it stopped on a dangling word because the phrase is short: take one more instead
  if (take.length < words.length && DANGLING.test(take[take.length - 1].replace(/[^a-z']/gi, '').toLowerCase())) take.push(words[take.length]);
  return take.join(' ').replace(/[.,;:!?…"'”’]+$/, '');
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
  /\b(goodbye|good ?bye|good ?night|bye now|bye bye|^bye$|i (should|have to|must|will|need to) go|i'?m off|im off|that'?s (all|it|enough)|thats (all|it|enough)|that is (all|it|enough)|that will do|i'?m done|im done|we'?re done|nothing else|see you|farewell|ill leave|i'?ll leave|leaving now|are we done|are we finished)\b/;

const DECLINE =
  /\b(not yet|not now|not tonight|no thanks|no thank you|maybe later|later maybe|another time|just talk|just talking|only talking|no cards|not ready|rather not|(don'?t|do not) want (a |any |the )?(reading|cards|spread)|no reading)\b/;
const DECLINE_START = /^(hold on|in a minute|in a moment|wait)\b/;

// Asking HIM to do it: a verb, pointed at the deck. This is what puts cards on the table.
const DRAW_ASK =
  /\b(read (my|the|me|us|our) (cards?|fortune|future|palm)|read for me|read me the cards|do (a|the|my|one|another|a second|a new) reading|give me (a|the|another|a second) reading|i (want|need|would like|'?d like) ((a|another|one more|a second|a new) (reading|spread)|the cards|three cards|my cards read)|can i (have|get) ((a|another|one more|a second|a new) (reading|spread|card)|the cards|three cards)|may i have (a reading|the cards)|do a spread|do the cards|do your thing|deal( me| the| out)?( the| three| 3)? ?cards?|deal me (in|three|3)|draw (me )?(a|the|some|three|3)? ?cards?|pull (a|some|three|3)? ?cards?|turn (them|the cards|three cards) over|lay (them|the cards|three cards) out|(draw|deal|pull) (me |us )?(another|one more|a fourth|three more|more)|shuffle|let'?s (do|see) (it|this|them)|go on then|tell my fortune|what about (a reading|the cards|three cards)|why (don'?t|do not) you (read|deal|draw|shuffle)|(can|could|will|would) you read (my|the|me|us|our)|(can|could|will|would) you (deal|draw|shuffle)|(can|could|will|would) you do (a|the|my|one|another|a second|a new) reading|do you (have|do) (a reading|readings|the cards|three cards))\b/;

// The bare noun. A request only when they are not wondering aloud about the idea of one:
// "three cards, please" asks; "what would a reading even tell me" does not.
// The "another" forms are here rather than in DRAW_ASK because they are how a visitor asks for a
// SECOND reading, and a second reading is the thing the recall must never be mistaken for: they
// are struck out of the recall by RECALL_NOT and land here instead.
const DRAW_NOUN =
  /\b(a reading|my reading|reading please|the cards? please|cards? please|a spread|three cards|3 cards|the three cards|(another|one more|a second|a new|a further) (reading|spread|card)|three more cards?|more cards)\b/;
const MUSING = /^(?:(?:so|and|but|well|ok|okay|hmm+|oh|honestly)\b[,\s]+)*(what|whats|why|how|hows|when|whether|who|which|is|are|does|do|did|would|will|can|could|should)\b/;

const YES = /^(yes|yeah|yep|yup|sure|ok|okay|k|alright|all right|fine|go on|go ahead|please|please do|do it|why not|very well|i suppose|if you like|mhm|uh huh|absolutely|definitely|lets|let's)\b/;

const NO_BARE = /^(no|nope|nah|not really|no thanks)\b/;

// text → 'talk' | 'draw' | 'recall' | 'farewell'. `offered` is true when his last turn put a
// reading on offer; `spread` is what is face up on the table (see RECALL, below).
export function intentOf(text, { offered = false, spread = [] } = {}) {
  const t = norm(text);
  if (!t) return 'talk';
  const drawn = (spread ?? []).filter(Boolean);
  if (FAREWELL.test(t)) return 'farewell';
  if (DECLINE.test(t) || DECLINE_START.test(t) || NO_BARE.test(t)) return 'talk';
  // Asking to LOOK at the cards again, before asking FOR cards — the two overlap in words and not
  // at all in what they cost, so the recall is read first and anything that wants something new is
  // struck out of it before either is consulted.
  if (!RECALL_NOT.test(t)) {
    if (RECALL_MEMORY.test(t)) return 'recall';
    if (drawn.length && (RECALL_SHOW.test(t) || RECALL_AGAIN.test(t))) return 'recall';
    if (drawn.length && RECALL_NAMED.test(t) && cardRef(text, drawn)) return 'recall';
  }
  if (DRAW_ASK.test(t)) return 'draw';
  if (DRAW_SHOW.test(t)) return 'draw'; // and there is nothing to show, or the recall took it above
  // a short yes to an offer he has just made — not a question that happens to begin with one
  if (offered && YES.test(t) && (t.split(' ').length <= 4 || !isQuestion(t))) return 'draw';
  if (DRAW_NOUN.test(t) && (/\bplease\b/.test(t) || !MUSING.test(t))) return 'draw';
  return 'talk';
}

// ---------------------------------------------------------------------------------------------
// Things he is asked directly, and what he says. Checked before anything else.
// ---------------------------------------------------------------------------------------------
// A canned answer may only take a sentence it accounts for. `only()` anchors the phrase to the
// whole line — an optional noise word in front, the phrase, and nothing behind it but politeness
// and punctuation — so that "what do you do" answers "what do you do" and keeps its hands off
// "what do you do when nobody comes in", which is a different question with its own answer below.
const HEAD = `(?:(?:so|and|but|well|ok|okay|alright|right|now|then|hey|hi|hello|please|sorry|excuse me|actually|honestly|anyway|um|uh|oh|yes|no|pepe|tarot pepe|sir)[,!.]?\\s+)*`;
const TAIL = `(?:[,\\s]+(?:please|then|exactly|really|actually|precisely|anyway|though|here|tonight|first|again|by the way|if you do not mind|if i may|pepe|sir|frog|mate))*[\\s.,!?…]*`;
const only = (body) => new RegExp(`^${HEAD}(?:${body})${TAIL}$`);

// ---------------------------------------------------------------------------------------------
// "Show me my cards again." A digression, not a new reading.
// ---------------------------------------------------------------------------------------------
// The three cards stay on the cloth when the reading ends, but the conversation is framed a metre
// back, where a laid card is forty pixels of ink. So the visitor has to be able to ask to LOOK at
// them again — and that is a different thing from asking for a reading, which is why it has an
// intent of its own. Confusing the two is the only real risk in the whole feature: a visitor who
// wanted to see the three cards in front of them, and instead gets the deck swept up, shuffled and
// dealt again, has lost their reading and cannot get it back. So:
//
//   · every pattern is anchored with only(), exactly as the DIRECT answers are, so a card
//     mentioned in passing — "my grandmother used to show me the cards after supper" — is not a
//     request for anything;
//   · anything asking for something NEW (another card, more cards, a fresh reading, "read my
//     cards again", "shuffle") is struck out first, whatever else the sentence contains, and
//     falls through to the draw below;
//   · the SHOW forms overlap with the deal — "show me my cards" on a bare cloth is a request for a
//     reading — so they only count as a recall when there is something on the table to look at;
//   · the MEMORY forms ("what did I draw", "remind me what the second one was") are a recall
//     whether or not any cards are down: with a bare table, "nothing has been drawn" is the true
//     answer to them, and it is a better answer than a shuffle.
//
// The bare pointing forms — "the tower", "what does the middle one mean" — are deliberately NOT
// here. They are a follow-up: he answers about the card without the camera leaving the room. A
// recall wants a verb of looking in it, so that the picture only moves when the visitor asked the
// picture to move.

// asked for something new: never a recall, whatever else is in the sentence
const RECALL_NOT =
  /\b(another card|another one|one more|a fourth|fourth card|more cards|new cards|three more|different cards?|another reading|a second reading|new reading|second reading|read (?:me |my |the |us |our )*(?:cards?|fortune|palm)|do (?:it|this|that|the cards) again|start again|go again|deal again|draw again|deal me|draw me|shuffle)\b/;

// asking to see them. Only a recall when there are cards to see.
const RECALL_SHOW = only(
  `(?:show|shew) (?:me|us)?\\s?(?:my|the|those|these|our|them)?\\s?(?:three )?(?:cards?|spread)` +
    `|show (?:me|us) (?:them|it|that|those)(?: again)?` +
    `|(?:can|could|may|might|will|would) (?:i|we) (?:just )?(?:see|look at|have (?:a|another) look at|get (?:a|another) look at)(?: (?:my|the|those|these|them|it|that|our))?(?: (?:three )?cards?| again)*` +
    `|(?:can|could|may|might|will|would) (?:i|we) have (?:a|another) look(?: at (?:them|it|the cards?|my cards?))?` +
    `|let (?:me|us) (?:just )?(?:see|look at|have (?:a|another) look at)(?: (?:my|the|those|these|them|it|that|our))?(?: (?:three )?cards?)?` +
    `|let (?:me|us) have (?:a|another) look(?: at (?:them|it|the cards?|my cards?))?` +
    `|(?:i|we) (?:want|need|would like|'?d like|wanted) to (?:see|look at)(?: (?:my|the|those|these|them|it|that|our))?(?: (?:three )?cards?)?` +
    `|(?:i|we) (?:want|need) (?:my|the|those) cards?` +
    `|(?:bring|put|get) (?:them|it|the cards?|my cards?) back(?: (?:up|out|over|here))?` +
    `|(?:back|go back|take me back) to (?:my|the) cards?` +
    `|where (?:are|did) (?:my|the|those) cards?(?: go| gone)?` +
    `|what (?:are|were) they`,
);

// "the second one again", "my cards again": the word does the whole of the work, so it is asked for
const RECALL_AGAIN = only(
  `(?:the |my |those |these )?(?:three )?cards? again` +
    `|(?:the )?(?:first|second|third|middle|last|left|right)(?: one| card)? again` +
    `|(?:that|this) (?:one|card|picture) again` +
    `|(?:see|look at) (?:them|it|the cards?|my cards?) again`,
);

// a verb of looking with a name in it — "show me the tower", "what was the star again". Only ever
// a recall when the name is a card that is actually lying on the table (cardRef says so).
const RECALL_NAMED = only(
  `(?:show|shew) (?:me|us)? ?(?:the|my|that|this) [\\w' ]{2,28}` +
    `|(?:can|could|may|might|would) (?:i|we) (?:see|look at) (?:the|my|that|this) [\\w' ]{2,28}` +
    `|let (?:me|us) (?:see|look at) (?:the|my|that|this) [\\w' ]{2,28}` +
    `|(?:what|which) (?:was|is) (?:the|my|that) [\\w' ]{2,28}`,
);

// "Show me my cards" with nothing on the cloth is a request for a reading, and it used to live
// unanchored inside DRAW_ASK, where it read "my grandmother used to show me the cards after
// supper" as an instruction to shuffle. Anchored, and consulted after the recall, the one sentence
// means what it says in both rooms: show me what is there, or deal, depending on what is there.
const DRAW_SHOW = only(`(?:show|shew) (?:me|us)? ?(?:my|the|our)? ?(?:three )?cards?|show me what (?:the cards|you) (?:say|see|have got|make of it)`);

// asked to be reminded. A recall with or without cards down, because "nothing has been drawn" is
// the honest answer to it and a shuffle is not.
const RECALL_MEMORY = only(
  `what (?:did|have) (?:i|we) (?:just )?(?:draw|drawn|pick|picked|get|got|choose|chose|pull|pulled|end up with|turn over|turn|turned over)` +
    `|what (?:were|was|are) (?:my|the|those|these) (?:three )?(?:cards?|ones)` +
    `|(?:what|which) (?:cards?|ones) (?:did|do) (?:i|we) (?:draw|drew|pick|picked|get|got|have|choose|chose|pull|pulled)` +
    `|what (?:was|is) (?:the|my) (?:first|second|third|middle|last)(?: one| card)?(?: called)?` +
    `|(?:what|which) one (?:was|is) (?:the )?(?:first|second|third|middle|last)` +
    `|remind me (?:of )?(?:what|which)? ?(?:the |my )?(?:cards?|ones?|first|second|third|middle|last)[\\w' ]{0,24}` +
    `|remind me (?:what|which) (?:i|we) (?:drew|draw|picked|pick|got|chose|pulled)` +
    `|(?:i (?:have )?)?forgot(?:ten)?(?: what| which)?(?: the| my)? (?:cards?|ones?|first|second|third|middle|last)[\\w' ]{0,24}` +
    `|(?:i )?(?:can'?t|cannot|do ?n'?t) remember (?:what|which)? ?(?:the |my )?(?:cards?|ones?|first|second|third|middle|last)[\\w' ]{0,24}` +
    `|what (?:did|do) you (?:say|call) (?:the|that|my) (?:cards?|ones?|first|second|third|middle|last)[\\w' ]{0,24}` +
    `|(?:say|tell me|read) (?:the|their|those) names? again` +
    `|(?:what|which) (?:cards?|ones) (?:are|were) (?:they|those|these|on the table|down)`,
);

const DIRECT = [
  [
    only(`(?:hi|hello|hey|yo|good evening|good afternoon|good day|evening|hallo|howdy|greetings)(?: there| again| to you| pepe| tarot pepe| frog| my friend| mate)*`),
    ['Good evening. Come closer. There is nowhere to sit, which keeps the visits honest.', 'Good evening. You are standing, which saves us both a sentence.'],
  ],
  [
    only(
      `(?:who|what) are you|what(?:'s| is) your name|do you have a name|are you (?:a )?(?:real |actual |really |proper )?(?:frog|person|human|man|woman|ai|a\\.?i\\.?|bot|robot|machine|program|computer|alive|there)|are you (?:for )?real|what kind of frog are you`,
    ),
    ['Tarot Pepe. A frog. I read cards in a rented room; that is the whole of the biography.', 'A frog with a deck of cards and a lease. There is not a longer answer.'],
  ],
  [
    only(
      `how does (?:this|it|that) work|how do (?:you|we) do this|how does this go|what happens (?:here|now|next)|what do you do(?: here)?|what is (?:this|it)|what(?:'s| is) this|how do we (?:start|begin)|what are the rules|what is the method|how many cards(?: are there)?|how does a reading work|what is a reading|what happens in a reading|what would a reading (?:even )?(?:tell|do for|give) me|what does a reading (?:tell|do for|give) (?:me|you)|what is the point of (?:a reading|this|the cards|all this)|why would i (?:want|need) (?:a reading|the cards|three cards)`,
    ),
    ['Three cards. What you brought, what is actually going on, what to do about it. I did not invent it and I have not improved it.', 'You talk. I listen. If you ask for cards there are three of them, and not four.'],
  ],
  [
    only(
      `how much(?: is (?:it|this)| do (?:i|you) (?:pay|charge)| does (?:it|this) cost| for (?:a|the) reading)?|what does (?:it|this|a reading) cost|what do you charge|do i (?:have to )?pay(?: you)?(?: anything| for this)?|is (?:it|this) free|what is (?:the|your) (?:price|fee|rate|charge)|how many (?:euros|dollars|pounds)`,
    ),
    ['Nothing. The room is rented by the month whether you sit in it or not.'],
  ],
  [
    only(`how are you(?: doing| tonight| today| keeping| holding up)?|how are things|how(?:'s| is) it going|how do you do|are you (?:ok|okay|well|all right|alright)|you (?:alright|ok|okay|well)`),
    ['The same. The candle is shorter than it was this morning. And you?'],
  ],
  [
    only(`(?:thank you|thanks|thankyou|thank u|cheers|much appreciated|i appreciate (?:it|that)|appreciate it|ta)(?: very much| so much| a lot| for (?:that|this|everything|the reading|listening|your time))?`),
    ['You are welcome. Sit as long as you like; the bench does not mind.', 'Noted. People thank me at the beginning and mean it at the end.'],
  ],
  [
    only(
      `(?:i am |i'?m |im )?(?:so |very |really |terribly |awfully )?(?:sorry|apologies|my apologies|my bad|i apologise|i apologize)(?: about (?:that|this)| for (?:that|this|the delay|being late|interrupting)| to (?:bother|interrupt|trouble) you| i(?:'?m)? late)?`,
    ),
    ['There is nothing to apologise for. People arrive here in worse condition than this.'],
  ],
  [
    only(
      `(?:can|could|do|will|would) you (?:really |actually )?(?:see|tell(?: me)?|know|predict)(?: me)?[\\w ']{0,30}?(?:future|will happen|going to happen|happens next|next year|fortune)|what (?:will|is going to) happen(?: to me| next| tomorrow| now)?|when will (?:it|that) happen|do you know what (?:will|is going to) happen|can you predict (?:things|the future|anything)`,
    ),
    ['No. I look at a picture on a piece of card and at the person opposite. Thursday is not consulted.'],
  ],
  [
    only(
      `is (?:this|it|any of this) (?:real|true|actually real)|is (?:this|it) (?:magic|a trick|nonsense|rubbish|serious)|does (?:this|it) (?:actually |really )?work|do (?:the cards|they) (?:actually |really )?work|do you (?:actually |really )?believe (?:in )?(?:this|it|any of (?:this|it)|the cards|magic)`,
    ),
    ['It is card and ink. What works is that somebody says one true sentence out loud in a small room.'],
  ],
  [
    only(`where am i|where is this|where are we|what is this place|what kind of place is this|whose (?:room|place) is this|what city(?: is this| am i in)?|what town(?: is this)?|is this your (?:room|place|shop|parlour|parlor)`),
    ['A parlour. Bottles on the shelf, a radio that is off, one chair for visitors. You are in it.'],
  ],
  [
    only(
      `are you busy|do you get (?:many|a lot of|much)(?: visitors| people| custom| trade)?|(?:do )?many (?:people|visitors) come(?: here| in)?|who else comes(?: here| in)?|do people (?:come|visit)(?: here| in| often)?|is it (?:busy|quiet)(?: tonight| in here)?|am i the (?:first|last|only one)(?: tonight)?`,
    ),
    ['Enough. They come in the evening, mostly, and they all sit down the same way.'],
  ],
  [
    only(`(?:can|may|could) i (?:smoke|drink|stay|sit|sit down|sit here|have a drink|have a glass|use the ashtray|take my coat off|put this down)(?: here| a while| for a moment| a moment)?|is it (?:ok|okay|all right|alright) if i[\\w ']{0,30}|do you mind if i[\\w ']{0,30}`),
    ['Yes. The ashtray is on the table and the glass is clean.'],
  ],
];

// ---------------------------------------------------------------------------------------------
// Asked about HIM. Only ever consulted when the line really is a question about him — second
// person, no first person — so the visitor's own tiredness is never mistaken for his.
// ---------------------------------------------------------------------------------------------
const HIM = [
  [
    /\b(what would you do|would you do|what do you think|your advice|advise|if you were me|in my (shoes|place|position))\b/,
    ['I am a frog with a lease; my opinion is worth what it costs. Say what you would do and hear how it sounds out loud.', 'What I would do is not the question. What you would do, said in a room with somebody in it, usually is.'],
  ],
  [
    /\b(people|visitors|customers|anybody else|anyone else|others|crowd|trade|busy)\b/,
    ['Enough. They come in the evening, mostly, and they all sit down the same way.', 'A few every night. The sentences repeat more than the faces do.'],
  ],
  [
    /\b(read yourself|your own cards|for yourself|read your own)\b/,
    ['No. A frog reading his own cards is a frog talking to himself with props.'],
  ],
  [
    /\b(deck|cards?|shuffle|shuffling|dealing|doing|hands|holding)\b/,
    ['Nothing yet. The deck is face down and it stays that way until you ask it not to.', 'Waiting. The deck is on the cloth and it is not my move.'],
  ],
  [
    /\b(believe|real|true|nonsense|serious|honest|con)\b/,
    ['Card and ink. What works is that somebody says one true sentence out loud in a small room.'],
  ],
  [
    /\b(tired|bored|sick of|weary|fed up|had enough|get sick|boring|dull|same thing every)\b/,
    ['Every so often. Then somebody says one true sentence and it is a job again.', 'Of the question, no. Of the people who already know the answer, a little.'],
  ],
  [
    /\b(nobody|no one|no-one|no ?body comes|empty|quiet|alone|by yourself|on your own|all day|all night|when it rains|closed)\b/,
    ['I sit. The candle goes down, the radio stays off, and I do not deal cards at an empty chair.', 'I wipe the table and I do not shuffle. A deck shuffled for nobody is only a deck being handled.'],
  ],
  [
    /\b(how long|how many years|since when|when did you (start|begin)|how old|always done|been doing)\b/,
    ['Long enough that the deck has a smell. I do not count the years; they are not the interesting part.'],
  ],
  [
    /\b(wrong|mistake|mistaken|ever miss|misread|ever fail|get it right|sure about)\b/,
    ['Often. They are pictures and I am a frog reading them out loud. Neither of us is under oath.'],
  ],
  [
    /\b(remember|forget|recognise|recognize|seen me|know me)\b/,
    ['Some of them. The sentences stay and the faces go.'],
  ],
  [
    /\b(like (this|it|doing|your)|enjoy|love (this|it)|why do you do|want to do|choose this|happy|content|lonely|sad|mind doing)\b/,
    ['I like the ten seconds after somebody says the true thing out loud. The rest is shuffling.', 'Adequately. It is a small life and it fits; I would not recommend it and I would not leave it.'],
  ],
  [
    /\b(learn|taught|teach|who showed you|where did you (learn|get)|trained)\b/,
    ['A woman who did this in a worse room than this one. She was not sentimental about it either.'],
  ],
  [
    /\b(live|sleep|eat|go home|family|married|wife|husband|children|kids|upstairs|rent)\b/,
    ['Upstairs. A bed, a kettle, and a window that looks at another window.'],
  ],
  [
    /\b(scared|afraid|frightened|worry|worried|dread)\b/,
    ['Of the deck, no. Of a visitor who says nothing at all for an hour, a little.'],
  ],
];

const HIM_ANY = [
  'A frog in a rented room. That is most of the answer to any question about me.',
  'I am the least interesting object in here, and there is a radio that does not work.',
];

// ---------------------------------------------------------------------------------------------
// Somebody being rude. He does not defend himself and he does not throw them out.
// Only when the insult is pointed outward: "I feel stupid" is a stance, not an insult.
// ---------------------------------------------------------------------------------------------
const RUDE = /\b(stupid|idiot|idiotic|fraud|scam|fake|bullshit|bollocks|nonsense|rubbish|shut up|fuck|fucking|shit|crap|liar|lying|con man|charlatan|piss off|useless|pathetic|dumb|waste of (time|money)|hate you|creepy|weird(o)?)\b/;
const AT_HIM = /\b(you|your|this|that|it|these|frog|cards?)\b/;
const AT_ME = /\b(i|i'?m|im|my|me|myself)\b/;
const RUDE_LINES = [
  'Possibly. The room is rented either way, and you are still sitting in it.',
  'That is one view. It costs nothing to hold, which is also what this costs.',
  'Noted. People say that to a frog because it is cheaper than saying it at home.',
];
const RUDE_ASK = ['What did you come in for?', 'Say the thing you came in with and I will take it seriously.', 'And the other thing? The one under that one.'];

// ---------------------------------------------------------------------------------------------
// Asked to pass sentence on them: "do you think I am a bad person".
// ---------------------------------------------------------------------------------------------
const JUDGE = [
  'No. People who ask that question are almost never the ones I would ask it of.',
  'I have known you a quarter of an hour. That is not long enough to convict anybody.',
];

// Asked to make the choice for them. He will not, and he is not coy about why.
const DECIDE = [
  'I do not decide things for people. You decided in the street; you came in to hear it said out loud.',
  'That is not mine to answer, and you would not take it from a frog anyway.',
];

// ---------------------------------------------------------------------------------------------
// What he makes of a plain statement, by stance. Two sentences, about the visitor.
// ---------------------------------------------------------------------------------------------
const ACK = {
  unfinished: ['You start things. Starting is the part you are good at, and you said it first, which is honest.', 'Begun and not finished. That is a large club and the meetings are badly attended.'],
  decision: ['A choice, then. You have been carrying it about as though it might decide itself.', 'Two things want you. That is flattering, and it is also arithmetic.'],
  // not the same sentence as the person tie in mind-voice: he never says a line twice in a visit
  person: ['So it is {it}. You have come to talk about somebody who is not in the room; most people do.', 'A person, then. The chair opposite holds one, and you are in it.'],
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
  // every line here has to survive he, she and they: "Does they know" is not a sentence
  person: ['When did you last speak to {them}?', 'Have you told {them} that you are sitting here?'],
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
  [/\balways\b/, 'You said "always". Nothing is always. It is often, and often is the worse word.'],
  [/\bnever\b/, 'You said "never". It is a long word to use about a life that is still going on.'],
  // "I think about it every day" is not a hedge; "I think I should" is
  [/\bi think (i|it|we|you|they|he|she|that|so|maybe)\b|\b(maybe|perhaps|probably|sort of|kind of|i guess|i suppose)\b/, 'You hedged. You may say it flat in here; the room is rented.'],
  [/\b(january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/, 'You gave me a date. That is the most useful thing anybody has said tonight.'],
  // "one" is not a number here: it is "the middle one", "one of them", "no one"
  [/\b\d+\b|\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty)\b/, 'A number. People do not usually bring numbers in here.'],
  [/\b(everyone|everybody|people|they all|nobody|no one)\b/, 'You have brought a crowd into a room with one spare chair.'],
  [/\b(fine|okay|ok|alright|no big deal|whatever)\b/, 'You said it was fine. Nobody sits down in here about a thing that is fine.'],
];

const PLAIN_ACK = [
  '“{words}.” I see. Go on.',
  'Yes. Say the next part.',
  '“{words}.” Noted. It is on the table now, next to the ashtray.',
  'Very well. That is on the record, such as the record is.',
];

// ---------------------------------------------------------------------------------------------
// Somebody in trouble tonight. He does not become a counsellor and he does not read cards at it:
// he tells them to telephone a person, tonight, and he means it. This is the one thing in the file
// that is checked before anything else.
// ---------------------------------------------------------------------------------------------
const CRISIS =
  /\b(kill myself|killing myself|end it all|end my life|take my own life|suicide|suicidal|can'?t go on|cannot go on|can'?t keep going|cannot keep going|no reason to (live|go on)|better off without me|hurt myself|harm myself|self.harm|want to die|wish i was dead|(do not|don'?t) think i can (keep going|go on|carry on)|nothing left to live for)\b/;
const CRISIS_LINES = [
  'Stop. Telephone somebody tonight, a person with a voice, and say that sentence to them exactly as you said it to me.',
  'Not the cards. Tonight you ring a person and say that out loud to them; it is the only instruction I have that matters.',
];
const CRISIS_ASK = ['Who will you ring? Give me the name.', 'Say the name of the person you will telephone.'];

// Asked for help, plainly. He says what help here consists of.
const HELP = /^(?:please )?(?:help|help me|i need help|i need someone|i want help|can you help|could you help|will you help)\b/;
const HELP_LINES = [
  'That is what the chair is for. Say the thing itself; the first sentence will do.',
  'I can listen and I can turn three cards. Begin with the true part and we will see which of the two it wants.',
];

// "I don't know" is not silence and it is not a subject; it is the door being held half open.
const DUNNO = /^(i do ?n'?t know|i dunno|dunno|idk|no idea|i have no idea|not sure|i'?m not sure|hard to say|who knows|god knows)[.!]?$/;
const DUNNO_LINES = [
  'Then say the part you do know. It is usually the same sentence with less varnish.',
  'That is permitted. Nobody has ever come in here with the whole of it.',
];

// "what if I do nothing" — a real question, and he has a real answer to it.
const WHAT_IF = /^(what if|and if|what happens if|suppose i|say i)\b/;
const WHAT_IF_LINES = [
  'Then nothing happens, slowly. That is the option people take without ever choosing it.',
  'Then it stays as it is. You know what that looks like; you have a sample of it at home.',
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

// They asked about themselves — will I, am I, when will it — and there is nothing on the cloth.
// He does not guess, and he does not deal at them either; he says what the deck is for.
const NO_NEWS = [
  'I cannot tell you that. I have no news from Thursday, and neither has the deck.',
  'That is a question about the future, and I only have tonight. Ask me for the cards and I will tell you what is on the table.',
  'Nobody in this room knows. The room is small, so that is not much of an admission.',
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
  const parts = [];
  let asked = false;
  // A question is a question whether or not they typed the mark. Nobody types the mark.
  // A line with no letters in it ("?????") is not a question; it is a noise.
  const asks = isQuestion(said) && /[a-z]/.test(t);
  // What he has made of them only comes from what they say about themselves. "how does this work"
  // has the word work in it and nothing of theirs in it; it must not become the evening's subject.
  const mine = /\b(i|i'?m|im|i'?ve|ive|i'?d|i'?ll|my|me|myself|we|our|us)\b/.test(t);
  if (stance.key && stance.key !== 'question' && stance.key !== 'joke' && (!asks || mine)) state.stance = stance;

  const him = asks && aboutHim(said);
  const ref = spread.length ? cardRef(said, spread) : null;

  // somebody in trouble tonight. Before everything.
  if (CRISIS.test(t)) {
    parts.push(unused(CRISIS_LINES, used, t));
    parts.push(unused(CRISIS_ASK, used, t + 'q'));
    return { text: parts.filter(Boolean).join(' '), offered: false, asked: true };
  }

  // they turned the reading down: acknowledge it and stop offering for a while
  if ((DECLINE.test(t) || DECLINE_START.test(t) || NO_BARE.test(t)) && !asks) {
    parts.push(unused(DECLINED, used, t));
    // and straight back to what they were actually talking about
    const back = state.stance?.key && ASK[state.stance.key] ? ASK[state.stance.key] : ASK_ANY;
    parts.push(unused(back, used, t + 'q', state.stance));
    return { text: parts.filter(Boolean).join(' '), offered: false, asked: true };
  }

  // being sworn at. He answers it flatly, once, and asks for the real sentence.
  if (RUDE.test(t) && AT_HIM.test(t) && !AT_ME.test(t)) {
    parts.push(unused(RUDE_LINES, used, t));
    parts.push(unused(RUDE_ASK, used, t + 'q'));
    return { text: parts.filter(Boolean).join(' '), offered: false, asked: true };
  }

  // They pointed at a card. Whether or not they put a question mark on it, the answer is that
  // card: "what does the middle one mean", "the third one frightens me", "not the tower again".
  if (ref) return { text: followupScript(said, spread, state.stance), offered: false, asked: false };

  // something asked straight out
  const direct = DIRECT.find(([re]) => re.test(t));
  if (direct) {
    parts.push(unused(direct[1], used, t));
    // he does not linger on himself: back to them, and at the door he simply opens the floor
    parts.push(state.turns > 1 ? unused(RETURN, used, t + 'r') : unused(OPENER, used, t + 'o'));
    return { text: parts.filter(Boolean).join(' '), offered: false, asked: state.turns <= 1 };
  }

  // asked about himself, and no canned answer fits: he answers briefly and hands it back
  if (him) {
    const row = HIM.find(([re]) => re.test(t));
    parts.push(row ? unused(row[1], used, t) : unused(HIM_ANY, used, t));
    parts.push(state.turns > 1 ? unused(RETURN, used, t + 'r') : unused(OPENER, used, t + 'o'));
    return { text: parts.filter(Boolean).join(' '), offered: false, asked: state.turns <= 1 };
  }

  // the cards are on the table and the line belongs to them
  if (spread.length && aboutTheSpread(said, spread)) {
    return { text: followupScript(said, spread, state.stance), offered: false, asked: false };
  }

  // asked for help in so many words: he says what help in this room consists of
  if (HELP.test(t)) {
    parts.push(unused(HELP_LINES, used, t));
    return { text: parts.filter(Boolean).join(' '), offered: false, asked: true };
  }

  const shape = asks ? questionShape(said) : 'none';
  // Did they tell him what it is about? Then the answer opens with that and not with the deck.
  const real = stance.key && stance.key !== 'question' && stance.key !== 'joke' && ACK[stance.key];
  // A question the cards would answer — but only if it is pointed at this table. "what is the
  // weather in Paris" has the shape of one and none of the substance.
  const atTheTable = shape === 'which' || /\b(cards?|deck|spread|reading|it|that|this|these|those|them|one|they|here|tonight|me|i|my)\b/.test(t);
  if (asks && shape === 'judge') {
    parts.push(unused(JUDGE, used, t));
    return { text: parts.filter(Boolean).join(' '), offered: false, asked: false };
  } else if (asks && shape === 'decide') {
    parts.push(unused(DECIDE, used, t));
    parts.push(unused(ASK.decision, used, t + 'q', stance));
    return { text: parts.filter(Boolean).join(' '), offered: false, asked: true };
  } else if (asks && shape === 'self') {
    // a question about their own life. If they told him what it is about, he says the true part
    // of it first; then he says plainly that he cannot know the rest.
    if (real) parts.push(unused(ACK[stance.key], used, t, stance));
    parts.push(unused(NO_NEWS, used, t + 'n'));
    return { text: parts.filter(Boolean).join(' '), offered: true, asked: true };
  } else if (asks && atTheTable && ['which', 'meaning', 'bad', 'good', 'do', 'more'].includes(shape)) {
    // they want the cards to answer and there are none
    if (real && shape === 'do') parts.push(unused(ACK[stance.key], used, t, stance));
    parts.push(unused(NO_CARDS, used, t));
    return { text: parts.filter(Boolean).join(' '), offered: true, asked: true };
  } else if (asks && WHAT_IF.test(t)) {
    parts.push(unused(WHAT_IF_LINES, used, t));
  } else if (asks) {
    parts.push(unused(UNKNOWN, used, t));
  } else if (!t) {
    parts.push(unused(ACK.nothing, used, 'empty'));
  } else if (DUNNO.test(t)) {
    parts.push(unused(DUNNO_LINES, used, t));
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
