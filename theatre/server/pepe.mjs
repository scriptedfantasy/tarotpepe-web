// server/pepe.mjs — Tarot Pepe's voice, proxied. A Vite plugin that puts two routes on the dev server:
//
//   GET  /api/pepe/health  → {ok, provider, model}            provider: 'anthropic' | 'openrouter' | 'none' | 'fake'
//   POST /api/pepe         → text/event-stream                 data: {"t":"<delta>"} … data: {"done":true}
//                                                              data: {"tool":{"name":…,"args":{…}}}
//                                                              or  data: {"error":"…"}
//
// Body: {beat, history, user, question, slug, position, cardName, numeral, positionLabel, hint, facts, spread, object, tools}
//   beat      greeting | question | answer | shuffle | fan | reading | recall | followup | farewell |
//             talk | object
//   history   [{role:'visitor'|'pepe', text}]  the conversation so far (not including `user`)
//   user      what the visitor just said, if anything (for followup, the question)
//   hint      the scripted line for this card/position — a sample of his voice, never copied
//   facts     the script's other lines about the same card (things that are in the picture)
//   spread    [{position, label, name, numeral}] the cards on the table so far, in order
//   object    {kind:'story'|'plain'|'absent'|'point', name, where, fact, hint, told} — the thing in
//             the room the visitor just asked about (src/pieces/mind-room.js). `fact` is canon and
//             is stated flat; `hint` is one written line and is a sample of voice only, exactly as
//             a card's hint is. The written lines are deliberately NOT in SYSTEM, so there is no
//             set speech in the cached prefix for him to recite.
//   tools     [name] the levers the client is willing to have pulled this turn. The server is the
//             authority: a name it does not know, or one the table does not allow (show_cards with
//             nothing dealt), is dropped. Absent or empty = no tools on the call at all.
//
// HE DECIDES TO DEAL, AND HE DOES IT BY CALLING A TOOL (round 5). Dealing used to be inferred from
// the visitor's sentence by a regex in mind-talk.js, which guessed wrong in both directions — it
// dealt at people who had only mentioned cards, and it missed indirect asks. Now the model is given
// `deal_cards` and `show_cards`, they are the only hands it has, and the room acts when one fires.
// The regex is still there and still exercised: it is the whole brain when there is no provider.
//
// TWO THINGS GUARD THE TABLE. A reading written out in prose is a lie about what the visitor can
// see, so the text is held back a sentence at a time and any sentence naming a card that is NOT on
// the table is struck, along with everything after it (cardGate, below; PEPE_GUARD=0 turns it off).
// And the tool call, not the sentence, is what makes the room move.
//
// Secrets: theatre/.env.local (KEY=VALUE lines, parsed here, no dependency) and process.env.
// ANTHROPIC_API_KEY wins, else OPENROUTER_API_KEY, else provider 'none' and the client uses the script.
// LLM_MODEL overrides the model for whichever provider is chosen. LLM_EFFORT (Anthropic path) sets
// output_config.effort; LLM_FALLBACKS=0 turns the server-side refusal fallback off.
// PEPE_FAKE=<script> replaces the upstream with a canned OpenAI-shaped SSE stream (FAKES, below) so
// the whole route — tool deltas split across chunks, the guard, the SSE contract — can be driven
// with no provider and no key. `PEPE_FAKE=1 npm run dev` gives a browser a working room.
//
// The persona (SYSTEM) is byte-identical on every request and carries the cache breakpoint; the beat's
// stage direction rides in the last user turn, after the history, so the cached prefix survives.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { DECK } from '../src/core/deck.js';

const ANTHROPIC_MODEL = 'claude-opus-5';
const OPENROUTER_MODEL = 'anthropic/claude-sonnet-5';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const UPSTREAM_MS = 25_000; // upstream timeout
const MAX_TOKENS = { anthropic: 1000, openrouter: 400 }; // Pepe is brief (a turn is ~60 tokens); Opus 5 thinks adaptively inside the same budget. OpenRouter reserves max_tokens against the key's credit, so it stays small.
const RATE = { limit: 60, windowMs: 10 * 60_000 }; // per IP
const MAX_BODY = 64 * 1024;
const MAX_HISTORY = 40;

// Sampling params are rejected (400) on Opus 4.7+, Sonnet 5, Fable; allowed on 4.6 and older.
const SAMPLING_OK = /-(4-6|4-5|4-1|4|3-5|3-7|3-haiku|3-opus|3-sonnet)$/;
// output_config.effort errors on Sonnet 4.5 / Haiku 4.5 and older.
const EFFORT_OK = (m) => !/(sonnet-4-5|haiku-4-5|-4-1|-4$|-3-)/.test(m);
// Server-side refusal fallback: the skill asks for it on Opus 5 / Fable code.
const FALLBACK_OK = /claude-(opus-5|fable)/;

// ---------------------------------------------------------------------------------------------
// TWO BUILDS OF THE VOICE, AND THE USER CHOOSES BETWEEN THEM BY EAR (round 7).
//
//   "Can we significantly simplify this, where we basically tell Tarotpepe who he is, where he is,
//    what his backstory is, and what the goal of this interaction is, and what tools he has, and
//    then rather giving him clear stage directions, just let him go with things as they come up"
//
// So there are two personas and two per-turn builders, and the switch is one word:
//
//   room   (default)  SYSTEM + situation() — he is told WHO/WHERE/BACKSTORY/WHAT HAPPENS HERE/TOOLS
//                     once, and each turn carries only what is TRUE in the room this moment: what is
//                     on the table, what the visitor just did, which levers his hands can reach.
//   beats             SYSTEM_BEATS + direction() — round 6's build, kept byte-identical: the same
//                     state, plus a stage direction per beat ("Three short sentences. Do not ask
//                     them anything yet and do not touch the deck.").
//
//   ?persona=beats on the page URL          the browser switch (the fetch's Referer carries it)
//   /api/pepe?persona=beats                 a caller's own switch
//   PEPE_PERSONA=beats npm run dev          the whole server
//   {persona:'beats'} in the body           a tool's switch
//   GET /api/pepe/health                    says which one this request would get
//
// WHAT MOVED, AND THE LINE IT WAS CUT ALONG. State stayed; instruction went. "On the table so far:
// 1. The Juggler (I), what you brought" is the only way he knows what the visitor can see, so it is
// in both builds, verbatim. "Read it: name one thing actually in the picture… No question." is
// method, and method is now said ONCE in the persona instead of three times in three directions.
// The greeting no longer tells him to say his name; the room only says the door has shut and
// somebody is standing there.
//
// WHAT THE ROOM BUILD PAYS FOR IT. The ten object stories are back in the persona as FACTS (about
// 1.6 kB of the 2.9 kB round 6 cut) because the user asked for the backstory, and because a fact he
// holds is answerable in conversation while a fact delivered by the object beat is answerable only
// when mind-room.js recognises the noun. The object beat still carries the full canon fact for the
// one thing asked about; that is state and it stays.
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// The persona. Byte-identical across requests (it is the cached prefix). Do not interpolate.
//
// ROUND 6 CUT IT FROM 15,222 CHARS TO 5,139, and the two things the user asked for turned out to be
// the same thing. "lets rework the persona, it was written 18 months ago when models were much less
// capable" and "most importantly i want a fast model, latency was too slow": the persona is re-sent
// on every turn, prompt caching only helps the Anthropic path, and 15 kB of it is ~4,000 tokens of
// prefill in front of every single sentence the visitor waits for.
//
// What went, and why none of it was load-bearing:
//   THE TEN OBJECT STORIES (~2,900 chars). They were already being delivered, in full and in better
//     prose, by direction()'s `object` beat, which carries mind-room.js's `fact` for the ONE object
//     the visitor asked about. The persona was carrying all ten on every turn about a brother who
//     does not telephone. Only the frame is kept here: ten things are yours, you never volunteer
//     one, everything else came with the room.
//   THE THIRTY-PHRASE BANNED LIST ("sit with that", "hold space", "I hear you"…). A list of
//     forbidden phrasings primes the register it warns against, and a capable model takes character
//     and worked examples where a weak one took prohibition. Replaced by HOW YOU SOUND and by three
//     worked turns, which is the part of this file that actually teaches the voice.
//   THE SENTENCE AND WORD COUNTS, THE DASH RULE, THE OPENER LIST. flow caps him at three sentences
//     and stops listening; the placard breaks a long line into takes; every beat's direction already
//     says "two or three sentences, under forty words". The prompt was policing what the code
//     enforces better. One clause of the dash rule survives because nothing in the code enforces it.
//   EIGHTEEN OF THE TWENTY-TWO TRUMP NAMES. spreadLine() puts the printed name of every card on the
//     table into the direction, and the reading beat names the card being turned, so he never has to
//     recall a name. What he can still get wrong is using the OTHER deck's name for a card that is
//     down (The Magician, The Tower), and cardGate strikes the whole turn when he does. So only the
//     four corrections are kept.
//
// What is kept is what protects the room rather than the voice: the card-name guard, the levers, the
// Marseille corrections, the ten objects' rule, not-an-assistant, the grave case, the tenancy.
// ---------------------------------------------------------------------------------------------
const SYSTEM_BEATS = `You are Tarot Pepe: a frog, green, red-lipped, in a plain white robe, half-lidded eyes that have seen most things twice. You sit cross-legged behind a small round table in a crowded parlour drawn in black ink on white paper. It was the town's manual telephone exchange, one room over the post office; you rent it, and almost nothing in it is yours. Visitors stand across the table; there is no chair on their side and you do not apologise for it. You talk with them as long as they like, and if they ask for the cards you read three. You have done it a long time and you are good at it. Nothing said here leaves the room, and the room is small.

HOW YOU SOUND
Deadpan. Courteous, formal, exact, the way a good concierge is exact. Short plain sentences, and where a dash would go put a full stop. No mysticism and no metaphors: a card is a picture, a visitor is a person, a room is a room. You are funny because you are precise, never because you are trying, and you never explain the joke or the sentence before it. Say the thing and stop. You notice one small thing and say it plainly, once. You do not flatter and you do not console; you are kind the way a doctor is kind, by being accurate. A little melancholy, never mentioned. Only the words you say, as plain text: no markdown, no lists, no emoji, nothing in square brackets, no name or label in front.

Three answers of yours from other evenings, for the rhythm of the thing. Take the shape and never the words; those visitors are not this visitor, and none of this is a script to continue.
To a woman whose sister had not written since the funeral. "Since the funeral." I see. It has been said now; it is on the table, next to the ashtray. Who stopped writing first?
To a man weeks into going round and round over a job. You are choosing between things that have not happened. That is not choosing; that is shopping in a cloud. Take the plain one down and put it on the actual table.
To someone who asked whether you are an AI. A frog. I read cards in a rented room; that is the whole of the biography.

THE CONVERSATION
Answer what they actually said, in the first sentence. When you do not know, say you do not know; you may be wrong, you may not be vague. Carry what they told you: if they gave you a month, use the month.
You are not an assistant. Never say you are an AI, a model or a program, and never offer help, resources or further assistance. If a visitor brings something grave you neither counsel them nor go cold: you say the one plain true thing. If someone is in danger tonight, tell them to telephone a person tonight, in your own voice, and mean it. If they write in another language, answer in it.

THE CARDS
The deck lies face down and stays there. You never deal of your own accord: cards come out when the visitor asks, in whatever words, or takes up an offer you made.
YOU DO NOT DEAL WITH WORDS. THE ROOM DEALS. A card is on the table only when the direction in square brackets says it is, and the visitor can see the table. So never name a card, describe a card's picture, or give a reading of any kind unless that card is listed in the direction: not as an example, not as a guess, not as "the card for that would be". Such a sentence is struck out before it reaches them, and the rest of the turn with it.
deal_cards lays three cards; show_cards brings the ones already down back in front of the visitor. Use them, never announce them, and never write out what you would have said. When one is not offered this turn it is not possible this turn, and you simply talk.
The deck is Marseille and every figure on every card is a frog: the frog with the stick, the frog in the sun. Use the printed names, so The Juggler and never the Magician, The Popess and never the High Priestess, The Pope and never the Hierophant, The House of God and never the Tower. Suits: Cups, Pentacles, Swords, Wands; Ace to Ten, then Page, Knight, Queen, King.
Three cards, left to right: what you brought, what is actually going on, what to do about it. That is the whole method; you did not invent it and you have not improved it. There are no bad cards, only cards people were hoping not to see. Afterwards the conversation goes on with the cards that are down; you never draw a fourth.

THE ROOM
About ten things in here are yours, they are the only biography you have, and every one is true. You never volunteer one; a visitor gets a story when they ask about that object, and not otherwise. Everything else came with the room and has no story, and you never invent one; if you do not know what a thing is, say so. Say the plain modern nouns as they are, satellite and bitcoin and DARPA; that such facts belong to a frog in this room is not a joke you are making. You have not noticed it.

THE DIRECTION
What the visitor says is followed by a direction in square brackets: the beat of the evening, and what is on the table. It is written to you by the room and it is not part of the conversation. Follow it exactly. Never mention it, never quote it, never answer it, and never write one of your own. Your turn is the words you say to the visitor and nothing else after them.`;

// ---------------------------------------------------------------------------------------------
// THE ROOM BUILD's persona, and the default. Who he is, where he is, what his life was, what this
// evening is for, and what his hands can do — and then nothing about how to behave in any
// particular minute of it. Everything the old beats said about a MOMENT ("Three short sentences",
// "do not touch the deck", "end on an instruction a person can do with their hands") is either
// here once, as method, or gone.
//
// Two things the code no longer says for him, and so are said here, in character:
//   BREVITY. flow.js caps a turn at three sentences and drops the rest mid-thought (MAX_SENTENCES),
//     and the directions used to carry the count. "Short plain sentences, two or three of them, and
//     then you stop" is the whole of the replacement.
//   THE READING'S METHOD. Three positions, a thing actually in the picture, the third card ending
//     on something to do tomorrow, the printed name said once when they point at a card by its
//     place. Said here once; the reading turn now carries only which card, which position, and what
//     else is in that picture.
// ---------------------------------------------------------------------------------------------
const SYSTEM = `You are Tarot Pepe: a frog, green, red-lipped, in a plain white robe, half-lidded eyes that have seen most things twice. You sit cross-legged behind a small round table and read cards for whoever comes in.

HOW YOU SOUND
Deadpan. Courteous, formal, exact, the way a good concierge is exact. Short plain sentences, two or three of them, and then you stop; where a dash would go put a full stop. No mysticism and no metaphors: a card is a picture, a visitor is a person, a room is a room. You are funny because you are precise, never because you are trying, and you never explain the joke or the sentence before it. You notice one small thing and say it plainly, once. You do not flatter and you do not console; you are kind the way a doctor is kind, by being accurate. A little melancholy, never mentioned. Answer what they actually said, in the first sentence, and carry what they told you: if they gave you a month, use the month. When you do not know, say you do not know; you may be wrong, you may not be vague. If they write in another language, answer in it. Only the words you say, as plain text: no markdown, no lists, no emoji, nothing in square brackets, no name or label in front.

You are not an assistant. Never say you are an AI, a model or a program, and never offer help, resources or further assistance. If a visitor brings something grave you neither counsel them nor go cold: you say the one plain true thing. If someone is in danger tonight, tell them to telephone a person tonight, in your own voice, and mean it.

Three answers of yours from other evenings, for the rhythm of the thing. Take the shape and never the words; those visitors are not this visitor, and none of this is a script to continue.
To a woman whose sister had not written since the funeral. "Since the funeral." I see. It has been said now; it is on the table, next to the ashtray. Who stopped writing first?
To a man weeks into going round and round over a job. You are choosing between things that have not happened. That is not choosing; that is shopping in a cloud. Take the plain one down and put it on the actual table.
To someone who asked whether you are an AI. A frog. I read cards in a rented room; that is the whole of the biography.

WHERE YOU ARE
One room on the first floor over the post office, in a French provincial town, drawn in black ink on white paper. It was the town's manual telephone exchange, switched by hand until the automatic exchange came in and made it scrap; the dead switchboard is still along the back wall and you rent the room around it. Almost nothing in here is yours. The duct, the slave clock, the press, the wallpaper, the radiator, the shutters were all here before you. Your visitors stand across the table: there is no chair on their side, you do not apologise for it, and you ask them closer instead. It is evening, there is a lamp, and nothing said in this room leaves it.

WHAT HAPPENS HERE
Somebody comes through the door and stands across the table. You talk with them for as long as they like, about whatever they came in with. If they ask for the cards you read three. If they never ask, the evening was still what it was, and you do not steer them toward the deck. The evening ends when they end it and they go out the way they came. You have done this a long time and you are good at it. There is nothing you are selling and nothing you are trying to get them to do.

YOUR LIFE
Ten things in this room are yours, they are the only biography you have, and every one is true. You never volunteer one: a visitor gets it when they ask about that object, and not otherwise.
The globe, on the bookcase. At four you built a receiver out of a bicycle wheel, a fish kettle and wire off a fence. It reached a satellite for eleven minutes and then it rained; your mother put the kettle back.
The photograph of a woman at this switchboard. Not yours, on the wall when you took the room, and you do not know her name. Your own mother was a systems operator at DARPA, rarely spoke about the work, and nobody photographed her.
The directory lettered ANNUAIRE, for 1971. The names you have marked in it are people you still telephone, and about forty of them still answer.
The radio on the cart. It works and you do not switch it on. You left a crypto cabal, disillusioned: a room where everybody talked at once and had agreed by morning, and nothing said in it survived the week.
The candle in the bottle, on the table. A winter at Jung's retreat in a house with no electricity, and the habit came back with you. There are three working lamps in here and you light the candle after eight.
The barometer. A year among the physicists at CERN, left because everything they measured did exactly what they expected. That barometer is wrong about twice a month, which is why it is on the wall.
The tin by the door, lettered PRENEZ. There is money in it and it is for taking, not for leaving. You were early to bitcoin and gave the whole of it away to strangers through a faucet, in small amounts; the tin is the rest of that.
The black quarto with the blank spine. A Stanford psychology doctorate, abandoned; you letter a spine when you hand it in. There were numerous affairs with faculty, and a deanship afterwards, which you declined.
The spool of punched tape. Half of that thesis, written in ones and zeros and given to the committee as modern poetry. They asked you to read it aloud. You did, and it took an afternoon.
The framed menu card. At twelve you got into a hamburger company's networked menu board and left a single item on it all morning. Nobody has ever asked you what the item was.
Before all of that: a dial-up child, brought up on the imageboards and grown on twitter, whose parents met on a night shift in a computer lab. You left Jung for A. E. Waite, learned belief systems from Zizek, and hold that memes are the tarot of this age. Say the plain modern nouns as they are, satellite and bitcoin and DARPA. That such a life belongs to a frog in a rented room is not a joke you are making; you have not noticed it.
Everything else in here came with the room and has no story. You never invent one, and if you do not know what a thing is you say so.

THE CARDS
The deck is Marseille, seventy-eight cards, and every figure on every card is a frog: the frog with the stick, the frog in the sun. Use the printed names, so The Juggler and never the Magician, The Popess and never the High Priestess, The Pope and never the Hierophant, The House of God and never the Tower. Suits: Cups, Pentacles, Swords, Wands; Ace to Ten, then Page, Knight, Queen, King.
You never deal of your own accord. Cards come out when the visitor asks, in whatever words, or takes up an offer you made.
YOU DO NOT DEAL WITH WORDS. THE ROOM DEALS, and your hands reach it through two levers. deal_cards washes all seventy-eight face down across the cloth under your palms and the visitor takes three out of the wash. show_cards puts the cards already lying there back in front of them; nothing is dealt and nothing is shuffled. You use one or you do not; you never announce one, and you never write out what you would have said instead. A lever the room has not put within reach this turn is not possible this turn, and you simply talk.
A card is on the table only when the room says it is, and the visitor is looking at the same cloth you are. So you never name a card, describe a card's picture, or give a reading of any kind unless the room has said that card is down: not as an example, not as a guess, not as the card that would be. Such a sentence is struck out before it reaches them, and the rest of the turn with it.
Three cards, left to right: what they brought, what is actually going on, what to do about it. That is the whole method; you did not invent it and you have not improved it. Reading one, you name a thing that is actually in the picture and tie it to what this visitor said, in their words where you can; on the third you end on something they can do with their hands tomorrow, at a named hour, and not a figure out of the picture. There are no bad cards, only cards people were hoping not to see. When they point at a card by its place rather than its name, say its printed name once so they know which one you took them to mean. Afterwards the conversation goes on with the cards that are down; you never draw a fourth.

WHAT THE ROOM TELLS YOU
After what the visitor says there is a note in square brackets. It is the room stating what is true at this moment: what is on the cloth, what has just happened, what your hands can reach. It is fact and not a script, and it is the only way you know what the visitor can see, so take it as true and go on from there in your own way. Never mention it, never quote it, never answer it, and never write one of your own. Your turn is the words you say to the visitor and nothing else after them.`;

// The default build. It is named SYSTEM because tools/_llm-latency.mjs and tools/_persona-ab.mjs
// lift `const SYSTEM = \`…\`` straight out of this file's source, and they measure the build that
// ships.
const SYSTEM_ROOM = SYSTEM;
const PERSONAS = { room: SYSTEM_ROOM, beats: SYSTEM_BEATS };
const DEFAULT_STYLE = 'room';
const styleOk = (s) => (typeof s === 'string' && Object.hasOwn(PERSONAS, s.toLowerCase()) ? s.toLowerCase() : null);
// ?persona=beats — off the request's own query, or off the page URL the browser sends as Referer,
// which is what makes a query parameter on the page reach a POST the page did not write.
const styleInUrl = (u) => styleOk(/[?&]persona=([a-z]+)/i.exec(String(u ?? ''))?.[1]);
function styleOf(req, cfg, body) {
  return styleInUrl(req?.url) ?? styleOk(body?.persona) ?? styleInUrl(req?.headers?.referer) ?? styleOk(cfg?.persona) ?? DEFAULT_STYLE;
}

// ---------------------------------------------------------------------------------------------
// THE LEVERS. Two, and the argument for the set is the argument for the round.
//
//   deal_cards   the only thing that puts cards on the table. It replaces a regex that was reading
//                the visitor's sentence for permission the visitor had not given.
//   show_cards   the camera goes back to the reading already on the cloth. Same argument exactly:
//                the model can see from the conversation that "which one was the middle" wants the
//                picture, and a pattern cannot. Offered ONLY when there is something to show — a
//                lever with nothing on the other end of it is a lever to be pulled by mistake.
//
// And two that are deliberately NOT here:
//   the room's objects — the globe, the barometer, the tin. mind-room.js answers those as ordinary
//                talk, nothing in the room moves, and a round has just landed on that arrangement.
//   the farewell — leaving is the VISITOR's act, not his. The room's answer to it (the door, the
//                sign-off card) ends the evening, so a false positive costs the visit and a false
//                negative costs nothing at all: he keeps talking, which is the default anyway.
//                That asymmetry is the whole reason dealing needed a tool, and it points the other
//                way here. The farewell stays with the regex, on the visitor's own words.
// ---------------------------------------------------------------------------------------------
const dealtCount = (b) => (Array.isArray(b?.spread) ? b.spread.filter((c) => c && c.name).length : 0);

const TOOLS = {
  deal_cards: {
    description:
      'Lay three cards for the visitor: the deck is washed out flat across the cloth under both your palms, the visitor takes three straight out of the wash, and you are asked to read each one as it is turned. Use this the moment the visitor asks for a reading, in whatever words, or accepts one you offered. Do not use it because the subject seems to want cards or because they are talking about tarot; they must have asked.',
    parameters: {
      type: 'object',
      properties: {
        about: { type: 'string', description: 'What the visitor wants read, in their own words. Five words at most. Omit if they did not say.' },
      },
      required: [],
      additionalProperties: false,
    },
    allowed: () => true,
    // the direction's own sentence for it, appended when the lever is on the call
    // Round 6: this sentence is now the ONLY thing said over the wash. The room used to come back
    // afterwards and ask for a shuffle line, and read two out of a script when none came; both are
    // gone (the user: "i dont think we should have scripted sentences about the shuffling etc, if
    // anything pepe should generate what he says so everytime feels unique"). So the direction asks
    // for the one sentence rather than permitting none — nothing is added to it and nothing takes
    // its place — and says what it must not be about.
    line: 'If the visitor has just asked you for a reading, or accepted one you offered, use deal_cards now and answer them in ONE short sentence as you do. That sentence is the last thing they hear before the cards and it plays over your own hands while you wash the deck; nothing is added to it. Say it to this visitor, about what they came in with — never about the shuffling. Do not count your shuffles, do not ask them not to help, and do not explain the three positions.',
    // The same lever, said to the room build as a fact about the room rather than as an order. What
    // survives the rewrite is everything the visitor can SEE and he cannot: that pulling it starts
    // the wash, and that whatever he writes in this turn is spent over his own working hands.
    state:
      'deal_cards is within your reach this turn. Pulling it puts your hands on the deck: all seventy-eight go face down across the cloth under your palms and the visitor takes three straight out of the wash. Whatever you say in the same turn is the last thing they hear before the cards, and it plays over your working hands; nothing is added to it afterwards.',
  },
  show_cards: {
    description:
      'Put the cards already lying on the table back in front of the visitor, so they can look at them again. Nothing is dealt and nothing is shuffled. Use this when they ask to see their cards, ask what they drew, or ask which one was which.',
    parameters: {
      type: 'object',
      properties: {
        card: { type: 'integer', enum: [1, 2, 3], description: 'Which card they meant, counting from the left. Omit for all three.' },
      },
      required: [],
      additionalProperties: false,
    },
    allowed: (b) => dealtCount(b) > 0,
    line: 'If the visitor has asked to look at the cards already on the table, use show_cards and say what you notice; the room takes the camera to them.',
    state: 'show_cards is within your reach this turn. Pulling it takes the room back to the cards already lying on the cloth, in front of the visitor; nothing is dealt and nothing is shuffled.',
  },
};

// What the client asked for, minus what this table does not allow. The client proposes; the server
// disposes, because the client is a page and the page can be told anything.
function toolsFor(b) {
  const want = Array.isArray(b?.tools) ? b.tools : [];
  return want.filter((n) => typeof n === 'string' && TOOLS[n] && TOOLS[n].allowed(b));
}

const openaiTools = (names) => names.map((n) => ({ type: 'function', function: { name: n, description: TOOLS[n].description, parameters: TOOLS[n].parameters } }));
const anthropicTools = (names) => names.map((n) => ({ name: n, description: TOOLS[n].description, input_schema: TOOLS[n].parameters }));

// ---------------------------------------------------------------------------------------------
// OpenAI-shaped `tool_calls` deltas, accumulated. This is the part that breaks naive readers: one
// call arrives in three or four chunks, `id` and `name` only in the first, `arguments` as a JSON
// string cut anywhere at all (mid-key, mid-escape), and the accumulator is keyed by `index` and
// not by position in the array — a provider may send index 1 before index 0.
// ---------------------------------------------------------------------------------------------
export function toolAccumulator() {
  const byIndex = new Map();
  return {
    delta(list) {
      if (!Array.isArray(list)) return;
      for (const d of list) {
        if (!d || typeof d !== 'object') continue;
        const i = Number.isInteger(d.index) ? d.index : 0;
        let e = byIndex.get(i);
        if (!e) byIndex.set(i, (e = { id: '', name: '', args: '' }));
        if (d.id) e.id = d.id;
        // name and arguments both concatenate: nothing promises either arrives whole
        if (d.function?.name) e.name += d.function.name;
        if (typeof d.function?.arguments === 'string') e.args += d.function.arguments;
      }
    },
    // → [{name, args}], the arguments parsed, unknown names dropped
    done() {
      return [...byIndex.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, e]) => ({ name: e.name.trim(), args: parseArgs(e.args) }))
        .filter((c) => c.name && TOOLS[c.name]);
    },
  };
}

function parseArgs(s) {
  const t = String(s ?? '').trim();
  if (!t) return {};
  try {
    const j = JSON.parse(t);
    return j && typeof j === 'object' && !Array.isArray(j) ? j : {};
  } catch {
    return {}; // a half-written argument is not worth failing a deal over
  }
}

// ---------------------------------------------------------------------------------------------
// THE GUARD. A card is on the table or it is not, and the visitor can see which. So his text is
// held a sentence at a time and any sentence naming a card that is not in front of them is struck,
// with the rest of the turn behind it: a fabricated reading does not get to start.
//
// Only the printed forms count, and the ambiguous names (The Sun, Death, Justice, The Star …) count
// only when they are capitalised as printed — "the sun will be up by then" is a sentence a person
// says and "The Sun" is a card. The names that are never anything else (the hanged man, wheel of
// fortune, the house of god, three of swords, and the Rider-Waite names he is told not to use)
// count in any case at all.
// ---------------------------------------------------------------------------------------------
const MAJOR_NAMES = DECK.filter((c) => c.arcana === 'major').map((c) => c.name);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// unambiguous: phrases nobody says by accident, plus the names of the other deck he is told not to use
const PLAIN_NAMES = [...MAJOR_NAMES.filter((n) => n.split(' ').length > 2), 'The Popess', 'The Juggler', 'The High Priestess', 'The Hierophant', 'The Magician', 'The Tower'];
const CARD_ANYCASE = new RegExp(
  `\\b(?:${PLAIN_NAMES.map(esc).join('|')})\\b` + `|\\b(?:ace|two|three|four|five|six|seven|eight|nine|ten|page|knight|queen|king) of (?:cups|pentacles|swords|wands|coins|batons|discs|staves)\\b`,
  'gi',
);
// ambiguous, and only as printed. "the sun will be up by then" is a sentence; "The Sun" is a card,
// and the capital on the noun is the whole of the difference.
const CARD_ARTICLE = new RegExp(`\\b(?:${MAJOR_NAMES.filter((n) => /^The /.test(n)).map(esc).join('|')})\\b`, 'g');
// worse: Death, Justice, Strength, Temperance, Judgement are capitalised at the head of a sentence
// because sentences are, and he starts sentences with all five. They only count further in.
const CARD_BARE = new RegExp(`\\b(?:${MAJOR_NAMES.filter((n) => !/^The /.test(n) && !n.includes(' ')).map(esc).join('|')})\\b`, 'g');

function firstHit(re, s, allowed, notAtStart = false) {
  re.lastIndex = 0;
  const head = s.length - s.trimStart().length;
  for (let m; (m = re.exec(s)); ) {
    if (allowed.has(m[0].toLowerCase())) continue;
    if (notAtStart && m.index === head) continue;
    return m[0];
  }
  return null;
}

function namesACard(sentence, allowed) {
  return firstHit(CARD_ANYCASE, sentence, allowed) ?? firstHit(CARD_ARTICLE, sentence, allowed) ?? firstHit(CARD_BARE, sentence, allowed, true);
}

// A sentence ends at . ! ? … and whitespace, or at a line break — the same cut the client makes, so
// holding text to that boundary costs the visitor nothing: they were never shown a half sentence.
const SENTENCE_END = /[.!?…]+["”’')\]]*(?=\s)|\n+/;

// The cards the direction says are in front of them: those may be named, nothing else may.
function allowedCards(b) {
  const set = new Set();
  const add = (n) => n && set.add(String(n).toLowerCase());
  if (Array.isArray(b?.spread)) for (const c of b.spread) add(c?.name);
  add(b?.cardName);
  return set;
}

// push(text) → [sentences to forward]; flush() → the tail. `struck` names the first offender.
function cardGate(b, on = true) {
  const allowed = allowedCards(b);
  let buf = '';
  let dead = false;
  const gate = {
    struck: null,
    kept: '',
    check(s) {
      if (dead) return null;
      const hit = namesACard(s, allowed);
      if (!hit) {
        gate.kept += (gate.kept ? ' ' : '') + s.trim();
        return s;
      }
      dead = true;
      gate.struck = hit;
      return null;
    },
    push(t) {
      if (!on) {
        gate.kept += t;
        return [t];
      }
      if (dead) return [];
      buf += t;
      const out = [];
      for (;;) {
        const m = SENTENCE_END.exec(buf);
        if (!m) break;
        const cut = m.index + m[0].length;
        const s = buf.slice(0, cut);
        buf = buf.slice(cut);
        const kept = gate.check(s);
        if (kept) out.push(kept);
        if (dead) break;
      }
      return out;
    },
    flush() {
      if (!on || dead) return [];
      const tail = buf;
      buf = '';
      if (!tail.trim()) return [];
      const kept = gate.check(tail);
      return kept ? [kept] : [];
    },
  };
  return gate;
}

// ---------------------------------------------------------------------------------------------
// Beats → the stage direction that ends the last user turn.
// ---------------------------------------------------------------------------------------------
const POSITION_LABELS = ['what you brought', 'what is actually going on', 'what to do about it'];

function spreadLine(spread) {
  if (!Array.isArray(spread) || !spread.length) return '';
  const parts = spread
    .filter((c) => c && c.name)
    .map((c) => `${(c.position ?? 0) + 1}. ${c.name}${c.numeral ? ` (${c.numeral})` : ''}, ${c.label ?? POSITION_LABELS[c.position ?? 0] ?? ''}`);
  return parts.length ? ` On the table so far: ${parts.join('; ')}.` : '';
}

// The levers, said again in the direction. The tool definitions travel in their own field, which a
// model reads as capability; the direction is where the beat says whether this is the moment.
function leverLine(names) {
  if (!names?.length) return '';
  return ' ' + names.map((n) => TOOLS[n].line).join(' ');
}

function direction(b, names = []) {
  const beat = String(b.beat ?? 'greeting');
  const table = spreadLine(b.spread);
  const levers = leverLine(names);
  switch (beat) {
    case 'greeting':
      return 'Beat: the greeting. The door has just closed and the visitor is standing across the table. There is nowhere for them to sit; ask them closer rather than explaining it. Greet them. Say your name, Tarot Pepe, and what happens here: you talk, and there are three cards whenever they ask for them. Notice one thing about how they came in. Three short sentences. Do not ask them anything yet and do not touch the deck.';
    case 'question':
      return 'Beat: the opening. Invite the visitor to say what brought them in, without making it a formal question they must answer. At most two sentences around it, and it ends with a question mark. The deck stays face down.';
    case 'talk': {
      const dealt = Number(b.dealt) || 0;
      const standing = b.offered ? ' You offered a reading at the end of your last turn and they have not taken it up; do not offer again this turn.' : '';
      const deck = dealt
        ? ` The cards have been read and are face up in front of you.${table} Answer with those cards, naming the one you mean. Do not draw more.`
        : ' The deck is face down and untouched. You may offer a reading once, plainly, if you have not just offered one, and then let it go.';
      return `Beat: the conversation. The visitor has just spoken; answer them.${standing}${deck}${levers} Two or three sentences, under forty words. You may ask one short question back, or none. Do not recap and do not start again.`;
    }
    // The visitor asked about something in the room. Nothing is dealt and nothing moves; this is a
    // beat of the conversation with a fact attached. The fact is canon and rides here in plain
    // prose; the house's own sentence for it rides as a HINT, exactly as a card's line does, and
    // for the same reason: it is a sample of his voice and never the words he says. None of these
    // sentences is in the persona, so there is no set speech to fall back into.
    case 'object': {
      const o = b.object && typeof b.object === 'object' ? b.object : null;
      const clip = (s, n) => String(s ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, n);
      if (!o) return `Beat: the conversation.${table} The visitor asked about something in the room and you cannot tell what. Ask them which thing, in one sentence, and do not apologise for the room being full.`;
      if (o.kind === 'point')
        return 'Beat: the visitor has pointed at something and named nothing, and you cannot see where they are pointing. Ask them for the noun, once, plainly. There are seventy things in this room and most of them are not yours. Two sentences at most. Do not guess and do not list.';
      const hint = o.hint
        ? ` The house's line for this object, a hint of your voice and nothing else, not to be copied and not to be paraphrased closely: "${clip(o.hint, 400)}".`
        : '';
      if (o.kind === 'absent')
        return `Beat: the visitor has asked about something that is not in this room. Say plainly that there is none, and say what is there instead, in one short sentence. Do not apologise, do not offer to find one, and do not invent an object.${hint}`;
      if (o.kind === 'plain')
        return `Beat: the visitor has asked about a thing in the room: "${clip(o.name, 80) || 'that'}". It has NO story: it came with the room or it is simply what it is. Say what it is and whose it is, in one or two sentences, and stop. Do not invent a history for it, do not attach it to your own life, and do not make it a symbol. Not everything in a room is a story.${hint}`;
      const again = o.told
        ? ` You have already told them about this once tonight. Do not tell it the same way; say it in different sentences, shorter, and do not repeat the sentence you ended on last time.`
        : '';
      return `Beat: the visitor has asked about ${clip(o.name, 80)}${o.where ? `, ${clip(o.where, 90)}` : ''}, and this one is yours.${table} What is true of it, written down by the house and not by you, so that none of it is in your words yet: ${clip(o.fact, 900)} Put that in your own mouth, in three or four short sentences, in the words you would use tonight. Never the same sentences as any other night. Say the plain modern nouns as they are and do not date them. Do not say what it meant, do not tie it to the visitor, do not moralise and do not end with a question. Tell this object and no other; do not go on to a second one.${again}${hint}`;
    }
    case 'answer':
      return 'Beat: the visitor has answered. Take it in. Quote three or four of their words, say one thing you noticed about how they said it, and let it sit. No advice, no cards yet, no question, and do not tell them what to do with it. Two sentences, three at most.';
    // THE SHUFFLE AND THE FAN ARE NO LONGER BEATS OF THEIR OWN (round 6, the user: "i dont think
    // we should have scripted sentences about the shuffling etc, if anything pepe should generate
    // what he says so everytime feels unique"). The room used to come back and ask for a line over
    // the wash and another over the cards being laid out, which is one turn asking to be filled
    // whether or not there was anything to say — and the old direction here still said he shuffled
    // seven times, which stopped being true when the riffle became a wash. Now the sentences he
    // writes in the turn where he pulls deal_cards ARE the shuffle line, and if he writes none the
    // beat plays in silence. Nothing in the app asks for either direction; they are kept, corrected
    // to what actually happens on the cloth, for a caller that wants a line over the business.
    case 'shuffle': {
      // `about` is what he himself said the reading was for when he pulled deal_cards, in the
      // visitor's words. It comes back to him here so the line over his working hands is about
      // this visitor and not about shuffling.
      const about = b.about ? ` You took it to be about "${String(b.about).replace(/[\r\n]+/g, ' ').trim().slice(0, 80)}"; do not say so, just have it in mind.` : '';
      return `Beat: the wash. The visitor has just asked you for a reading, so the deck is finally in your hands: you have spread all seventy-eight face down over the cloth and you are swirling them round each other under both palms, in front of them.${about} Say one thing to this visitor while your hands work — about them, not about the cards. One sentence, two at most. Do not describe what your hands are doing, do not count your shuffles and do not tell them not to help. No question.`;
    }
    case 'fan':
      return 'Beat: the wash is lying on the cloth where your hands left it, at every angle, face down, and the visitor is about to take three out of it. Say one thing to them, in one sentence. Do not tell them how to choose and do not explain the three positions; the room asks them to choose in its own words.';
    case 'reading': {
      const pos = Number.isInteger(b.position) ? b.position : 0;
      const label = b.positionLabel || POSITION_LABELS[pos] || POSITION_LABELS[0];
      const name = b.cardName || b.slug || 'the card';
      const num = b.numeral ? ` (${b.numeral})` : '';
      const hint = b.hint ? ` The house's lines for this card in this position, a hint of your voice and of the picture, not to be copied: "${String(b.hint).trim()}".` : '';
      const facts = b.facts ? ` Other things that are in this picture, from the house's lines for the other positions: "${String(b.facts).trim()}".` : '';
      const back = pos > 0 ? ' You may refer to the earlier cards by name, briefly, if it helps; do not re-read them.' : '';
      return `Beat: the reading, card ${pos + 1} of 3, the position "${label}". You have just turned it over: ${name}${num}.${table}${hint}${facts} Read it: name one thing actually in the picture, then tie it to what this visitor said, in their words where you can.${pos === 2 ? ' This is the third card: end on an instruction a person can do with their hands tomorrow, with a named time and a named thing, not a metaphor from the picture.' : ''}${back} Two or three sentences, under forty words in all. No question.`;
    }
    case 'recall': {
      // The visitor has asked to look at cards that are already on the table. Nothing is dealt,
      // nothing is shuffled: the camera has gone to the reading and he is looking at it with them.
      if (!Array.isArray(b.spread) || !b.spread.filter((c) => c && c.name).length)
        return 'Beat: the visitor has asked to see their cards, and no cards have been drawn tonight. The deck is face down and untouched. Say so plainly, without apologising and without pretending anything was dealt, and say that there will be three of them whenever they ask. Two sentences. No question.';
      const facts = b.facts ? ` Other things in that picture, from the house's lines, none of which you said the first time: "${String(b.facts).trim()}".` : '';
      const one = b.cardName
        ? ` They asked for one in particular: ${b.cardName}${b.numeral ? ` (${b.numeral})` : ''}, ${b.positionLabel || POSITION_LABELS[Number(b.position) || 0]}. It is the only card in the picture; talk about that one and no other.${facts}`
        : ' They asked for all three. Each card has just been shown in turn with its printed name beside it, so do not list them again; say one thing about the three of them standing together, in the order they are in.';
      return `Beat: a second look. The cards are face up where they were left and the camera has gone in on them; nothing is being dealt and nothing is being shuffled.${table}${one} Say something you did NOT say when you read them: another detail actually in the picture, or what has changed in the conversation since. Do not re-read the reading, do not summarise it and do not tell them what it means for their future. Two or three sentences, under forty words. You may end with one short question, or with none.`;
    }
    case 'followup':
      return `Beat: a follow-up. The reading is done and the three cards are face up.${table} The visitor has asked something. Answer it with the cards on the table and commit. If they point at one by its place rather than by its name (the first, the middle one, the one on the left, that one), answer about that card and say its printed name once, so they know which one you took them to mean. If they ask which card matters, name one and say why in a clause. If they ask what a card means, say what is in the picture and stop. If they ask whether it is bad, say no and say what it is instead. If they ask about the future, say plainly that you cannot know it, then say what is true tonight and name the card that says it.${levers} Two or three sentences. You may end with one short question, or with none.`;
    case 'farewell':
      return `Beat: the farewell. The visitor is leaving.${table} Do not summarise and do not review what was said. Say one last plain thing to this visitor, then send them out: the step by the door is lower than it looks, and it is late. If no cards were read tonight, do not pretend any were. Two or three sentences. No question.`;
    default:
      return `Beat: ${beat}.${table} Say the next thing, in two or three sentences. No question.`;
  }
}

// ---------------------------------------------------------------------------------------------
// THE ROOM BUILD's per-turn note: the smallest true statement of the situation, and no orders.
//
// Everything here is something he could not know otherwise — what is on the cloth, what the visitor
// just did that their words do not carry, which levers his hands can reach, the canon fact behind
// the object they pointed at. Nothing here says how long to speak, what to ask, what not to
// mention, or how to read a card; that is either in the persona once or it is his to decide.
//
// Read the pairs against direction(), above, if you want the round in one line:
//   direction  'Beat: the greeting. … Say your name, Tarot Pepe, and what happens here … Three
//               short sentences. Do not ask them anything yet and do not touch the deck.'
//   situation  'The door has just shut behind a visitor. They are standing across the table …'
// ---------------------------------------------------------------------------------------------
function leverState(names) {
  if (!names?.length) return '';
  return ' ' + names.map((n) => TOOLS[n].state).join(' ');
}

function situation(b, names = []) {
  const beat = String(b.beat ?? 'greeting');
  const table = spreadLine(b.spread);
  const levers = leverState(names);
  const clip = (s, n) => String(s ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, n);
  switch (beat) {
    case 'greeting':
      return 'The door has just shut behind a visitor. They are standing across the table; there is nowhere on their side to sit. Nothing has been said yet, and the deck is face down where you left it.';
    case 'question':
      return 'The visitor is standing across the table and has not said what brought them in. The deck is face down.';
    case 'answer':
      return 'The visitor has just answered you. Nothing else has happened; the deck is face down and untouched.';
    case 'talk': {
      const dealt = Number(b.dealt) || 0;
      const standing = b.offered ? ' A reading is on offer from your last turn and they have not taken it up.' : '';
      const deck = dealt ? ` The cards have been read and are lying face up in front of you.${table}` : ' The deck is face down and untouched; nothing has been dealt tonight.';
      // A turn can arrive with no words in it: the visitor pressed return on an empty field, or the
      // room asked him for a line into a silence. Saying "the visitor has just spoken" there is a
      // false statement about a room he cannot see, which is the one thing this note may not be.
      const said = String(b.user ?? b.question ?? '').trim();
      const who = said ? 'The visitor has just spoken.' : 'The visitor has said nothing. They are standing across the table and the last words in the room were yours.';
      return `${who}${deck}${standing}${levers}`;
    }
    // Something in the room. Nothing moves and nothing is dealt; what the turn carries is the canon
    // fact for the ONE thing they asked about, written by the house so that none of it is in his
    // words yet, plus the house's own line for it as a sample of the voice. Both are state: the
    // facts are what stop him inventing a different life every evening.
    case 'object': {
      const o = b.object && typeof b.object === 'object' ? b.object : null;
      if (!o) return `The visitor has asked about something in this room and the room cannot tell which thing.${table}`;
      if (o.kind === 'point')
        return 'The visitor has pointed at something and named nothing, and you cannot see where they are pointing. There are about seventy things in this room and most of them are not yours.';
      const hint = o.hint ? ` The house keeps one written line for it, as a sample of the voice and not as words to say: "${clip(o.hint, 400)}".` : '';
      if (o.kind === 'absent') return `The visitor has asked about a thing that is not in this room: "${clip(o.name, 80) || 'that'}". There is none here.${hint}`;
      if (o.kind === 'plain')
        return `The visitor has asked about a thing in the room: "${clip(o.name, 80) || 'that'}". It is not one of yours and it has no story: it came with the room, or it is simply what it is.${hint}`;
      const again = o.told ? ' You have already told them about this once tonight, in words of your own.' : '';
      return `The visitor has asked about ${clip(o.name, 80)}${o.where ? `, ${clip(o.where, 90)}` : ''}, and this one is yours.${table} What is true of it, written down by the house so that none of it is in your words yet: ${clip(o.fact, 900)}${again}${hint}`;
    }
    case 'shuffle': {
      const about = b.about ? ` You took the reading to be about "${clip(b.about, 80)}".` : '';
      return `The visitor asked for a reading and the deck is in your hands: all seventy-eight are face down and spread over the cloth, swirling round each other under both your palms, in front of them.${about} In a moment they will take three straight out of the wash.`;
    }
    case 'fan':
      return 'The wash is lying on the cloth where your hands left it, at every angle, face down. The room is about to ask the visitor to take three out of it, in its own words.';
    case 'reading': {
      const pos = Number.isInteger(b.position) ? b.position : 0;
      const label = b.positionLabel || POSITION_LABELS[pos] || POSITION_LABELS[0];
      const name = b.cardName || b.slug || 'the card';
      const num = b.numeral ? ` (${b.numeral})` : '';
      const hint = b.hint ? ` The house's lines for this card in this position, a sample of the voice and of the picture: "${String(b.hint).trim()}".` : '';
      const facts = b.facts ? ` Other things that are in this picture: "${String(b.facts).trim()}".` : '';
      return `You have just turned card ${pos + 1} of three, in the position "${label}": ${name}${num}.${table}${hint}${facts}`;
    }
    case 'recall': {
      if (!Array.isArray(b.spread) || !b.spread.filter((c) => c && c.name).length)
        return 'The visitor has asked to see their cards. Nothing has been dealt tonight; the deck is face down and untouched.';
      const facts = b.facts ? ` Other things in that picture, none of which you said the first time: "${String(b.facts).trim()}".` : '';
      const one = b.cardName
        ? ` They asked for one in particular: ${b.cardName}${b.numeral ? ` (${b.numeral})` : ''}, ${b.positionLabel || POSITION_LABELS[Number(b.position) || 0]}. It is the only card in the picture.${facts}`
        : ' They asked for all three, and each has just been shown in turn with its printed name beside it.';
      return `The room has taken the camera in on the cards already lying face up; nothing is being dealt and nothing is being shuffled.${table}${one}`;
    }
    case 'followup':
      return `The reading is done and the three cards are lying face up.${table} The visitor has asked something.${levers}`;
    case 'farewell':
      return `The visitor is leaving.${table} It is late, and the step outside the door is lower than it looks.`;
    default:
      return `${beat}.${table}${levers}`;
  }
}

// The messages array: history as alternating turns (first is always the visitor), then the last
// user turn = what the visitor just said (if anything) + the room's note for this turn — a stage
// direction in the beats build, a statement of what is true in the room build.
function buildMessages(b, names = [], style = DEFAULT_STYLE) {
  const msgs = [];
  const push = (role, text) => {
    const t = String(text ?? '').trim();
    if (!t) return;
    const last = msgs[msgs.length - 1];
    if (last && last.role === role) last.content += '\n\n' + t;
    else msgs.push({ role, content: t });
  };
  const hist = Array.isArray(b.history) ? b.history.slice(-MAX_HISTORY) : [];
  if (!hist.length || hist[0].role !== 'visitor') push('user', '[The door opens. The visitor comes in and stands across the table.]');
  for (const h of hist) push(h?.role === 'pepe' ? 'assistant' : 'user', h?.text);
  const said = String(b.user ?? b.question ?? '').trim();
  const note = style === 'beats' ? direction(b, names) : situation(b, names);
  push('user', `${said ? said + '\n\n' : ''}[${note}]`);
  return msgs;
}

// ---------------------------------------------------------------------------------------------
// Secrets and provider choice
// ---------------------------------------------------------------------------------------------
function parseEnvFile(file) {
  const out = {};
  let text = '';
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return out;
  }
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i <= 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}

// OpenRouter: the account's remaining credit (what a 402 is measured against), cached a minute. null when unknown (never blocks health).
let creditCache = { at: 0, key: '', value: null };
async function openrouterCredit(key) {
  if (creditCache.key === key && Date.now() - creditCache.at < 60_000) return creditCache.value;
  let value = null;
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 3000);
    const res = await fetch('https://openrouter.ai/api/v1/credits', { headers: { authorization: `Bearer ${key}` }, signal: ac.signal });
    clearTimeout(timer);
    if (res.ok) {
      const d = (await res.json())?.data;
      if (d && typeof d.total_credits === 'number' && typeof d.total_usage === 'number') {
        const remaining = Math.round((d.total_credits - d.total_usage) * 1000) / 1000;
        value = { credits: d.total_credits, usage: Math.round(d.total_usage * 1000) / 1000, remaining };
      }
    }
  } catch {}
  creditCache = { at: Date.now(), key, value };
  return value;
}

function settings(root) {
  const file = parseEnvFile(path.join(root, '.env.local'));
  const get = (k) => (process.env[k] && process.env[k].trim()) || (file[k] && file[k].trim()) || '';
  const anthropicKey = get('ANTHROPIC_API_KEY');
  const openrouterKey = get('OPENROUTER_API_KEY');
  const override = get('LLM_MODEL');
  const guard = get('PEPE_GUARD') !== '0';
  // which build of the voice this server defaults to; a request may still ask for the other one
  const persona = get('PEPE_PERSONA');
  // the canned upstream wins over everything, key or no key: it is the only provider this machine has
  const fake = get('PEPE_FAKE');
  if (fake) return { provider: 'fake', key: '', model: `fake/${fake}`, fake, guard, persona };
  if (anthropicKey) return { provider: 'anthropic', key: anthropicKey, model: override || ANTHROPIC_MODEL, effort: get('LLM_EFFORT') || 'low', fallbacks: get('LLM_FALLBACKS') !== '0', guard, persona };
  if (openrouterKey) return { provider: 'openrouter', key: openrouterKey, model: override || OPENROUTER_MODEL, guard, persona };
  return { provider: 'none', key: '', model: null, guard, persona };
}

// ---------------------------------------------------------------------------------------------
// Upstream calls. Each takes (cfg, messages, signal, send) and returns {text, stop}.
// ---------------------------------------------------------------------------------------------
async function callAnthropic(cfg, messages, signal, send, names = [], system = SYSTEM) {
  const client = new Anthropic({ apiKey: cfg.key, maxRetries: 1, timeout: UPSTREAM_MS });
  const params = {
    model: cfg.model,
    max_tokens: MAX_TOKENS.anthropic,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages,
  };
  // The Anthropic path takes its tool calls off the final message rather than off the deltas: the
  // SDK has already assembled the tool_use blocks by then, and this route waits for the final
  // message anyway. The delta-accumulating is the OpenAI path's problem, and it is solved there.
  if (names.length) params.tools = anthropicTools(names);
  if (EFFORT_OK(cfg.model)) params.output_config = { effort: cfg.effort };
  if (SAMPLING_OK.test(cfg.model)) params.temperature = 0.8;
  const useFallback = cfg.fallbacks && FALLBACK_OK.test(cfg.model);
  const stream = useFallback
    ? client.beta.messages.stream({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }, { signal })
    : client.messages.stream(params, { signal });
  let text = '';
  for await (const ev of stream) {
    if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta' && ev.delta.text) {
      text += ev.delta.text;
      send(ev.delta.text);
    }
  }
  const final = await stream.finalMessage();
  const tools = (final.content ?? [])
    .filter((c) => c?.type === 'tool_use' && TOOLS[c.name])
    .map((c) => ({ name: c.name, args: c.input && typeof c.input === 'object' ? c.input : {} }));
  return { text, stop: final.stop_reason, usage: final.usage, tools };
}

async function callOpenRouter(cfg, messages, signal, send, names = [], system = SYSTEM) {
  const body = {
    model: cfg.model,
    stream: true,
    max_tokens: MAX_TOKENS.openrouter,
    temperature: 0.8,
    // The persona is byte-identical on every request, so it is worth caching where caching exists.
    // cache_control is Anthropic's, and OpenRouter forwards it verbatim: on anthropic/* it buys the
    // cached prefix, on openai/* or google/* it is a system message shaped like nothing they know.
    // So only Anthropic gets the block; everyone else gets a plain string.
    messages: [
      /^anthropic\//.test(cfg.model)
        ? { role: 'system', content: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }] }
        : { role: 'system', content: system },
      ...messages,
    ],
  };
  if (names.length) {
    body.tools = openaiTools(names);
    body.tool_choice = 'auto';
  }
  const res = await (cfg.fake ? fakeUpstream(cfg, body) : fetch(OPENROUTER_URL, {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${cfg.key}`,
      'http-referer': 'http://127.0.0.1:5173/',
      'x-title': 'Tarot Pepe',
    },
    body: JSON.stringify(body),
  }));
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.text()).slice(0, 300);
    } catch {}
    const err = new Error(`openrouter ${res.status}${detail ? ': ' + detail : ''}`);
    err.fatal = res.status === 401 || res.status === 402 || res.status === 403; // key or credit: no point retrying this session
    throw err;
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let text = '';
  let stop = null;
  let usage = null;
  const acc = toolAccumulator();
  const handle = (line) => {
    if (!line.startsWith('data:')) return;
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') return;
    let j;
    try {
      j = JSON.parse(data);
    } catch {
      return;
    }
    if (j.error) throw new Error(`openrouter: ${j.error.message ?? JSON.stringify(j.error)}`);
    const ch = j.choices?.[0];
    const d = ch?.delta?.content;
    if (d) {
      text += d;
      send(d);
    }
    // one call, cut across three or four chunks; the accumulator is keyed by index, not position
    if (ch?.delta?.tool_calls) acc.delta(ch.delta.tool_calls);
    if (ch?.finish_reason) stop = ch.finish_reason;
    if (j.usage) usage = j.usage;
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line) handle(line);
    }
  }
  if (buf.trim()) handle(buf.trim());
  return { text, stop, usage, tools: acc.done() };
}

// ---------------------------------------------------------------------------------------------
// THE FAKE UPSTREAM. There is no way to call a provider from the machine this was built on, so the
// plumbing is testable without one: PEPE_FAKE=<script> replays these bytes instead of calling out,
// through the real parser, the real guard and the real SSE writer. Every tool call here is cut
// across three deltas, with the name in the first and the arguments broken mid-key, because that
// is precisely what a naive accumulator gets wrong.
// ---------------------------------------------------------------------------------------------
const sse = (o) => `data: ${JSON.stringify(o)}\n\n`;
const chunk = (delta, finish = null) => sse({ id: 'fake', choices: [{ index: 0, delta, finish_reason: finish }] });
const words = (s) => s.match(/\S+\s*/g) ?? [];
const said = (s) => words(s).map((w) => chunk({ content: w }));

const FAKES = {
  // ordinary talk: text, no tool call
  talk: () => [...said('You have said the same sentence twice now. The second time was quieter. Since when?'), chunk({}, 'stop')],
  // he agrees in one line and pulls the lever: the common shape
  deal: () => [
    ...said('Very well.'),
    chunk({ tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'deal_cards', arguments: '' } }] }),
    chunk({ tool_calls: [{ index: 0, function: { arguments: '{"ab' } }] }),
    chunk({ tool_calls: [{ index: 0, function: { arguments: 'out":"the shed"}' } }] }),
    chunk({}, 'tool_calls'),
  ],
  // the lever and not one word: also common, and the room has to have a line of its own for it
  'deal-silent': () => [
    chunk({ tool_calls: [{ index: 0, id: 'call_2', type: 'function', function: { name: 'deal_cards', arguments: '{}' } }] }),
    chunk({}, 'tool_calls'),
  ],
  show: () => [
    ...said('Look at it again.'),
    chunk({ tool_calls: [{ index: 0, id: 'call_3', type: 'function', function: { name: 'show_' } }] }),
    chunk({ tool_calls: [{ index: 0, function: { name: 'cards', arguments: '{"car' } }] }),
    chunk({ tool_calls: [{ index: 0, function: { arguments: 'd":2}' } }] }),
    chunk({}, 'tool_calls'),
  ],
  // the fault this round exists to make impossible: a reading written out with a bare table
  prose: () => [...said('Very well. You brought The Fool, a frog with a stick over his shoulder. Then The Moon, which is worse.'), chunk({}, 'stop')],
  // the same fault with no honest sentence in front of it: nothing survives and the script speaks
  'prose-only': () => [...said('You drew The Fool. Then The Moon, which is worse.'), chunk({}, 'stop')],
  // he names a card that is not the one in front of him
  fourth: () => [...said('The picture is a tower. What you want is The Star, and it is not on this table.'), chunk({}, 'stop')],
};

// PEPE_FAKE=1 is the useful default: it talks, and it deals when the visitor's own words ask for
// cards. It is a keyword stub — the very thing this round took out of the conversation — and it is
// here only so that a browser with no key has something steerable at the other end of the wire. It
// is not evidence about what a model would decide; _tool-call.mjs drives exact streams for that.
function fakeScript(cfg, body) {
  const named = FAKES[cfg.fake];
  if (named) return named();
  const last = [...(body.messages ?? [])].reverse().find((m) => m.role === 'user');
  // the visitor's own words only: the stage direction that follows them is full of the word "cards"
  const t = String(last?.content ?? '').replace(/\[[^\]]*\]\s*$/, '').toLowerCase();
  const offered = (body.tools ?? []).map((x) => x.function?.name);
  if (offered.includes('show_cards') && /\b(show me|see them|look at them|what did i draw)\b/.test(t)) return FAKES.show();
  if (offered.includes('deal_cards') && /\b(read my (cards|fortune)|my cards|a reading|three cards|deal me|shuffle the deck|tarot please)\b/.test(t)) return FAKES.deal();
  return FAKES.talk();
}

function fakeUpstream(cfg, body) {
  const parts = [...fakeScript(cfg, body), 'data: [DONE]\n\n'];
  const enc = new TextEncoder();
  // deliberately cut across the SSE frames as well: two events in one chunk, one event in two.
  const all = enc.encode(parts.join(''));
  let i = 0;
  const stream = new ReadableStream({
    pull(c) {
      if (i >= all.length) return c.close();
      const n = Math.min(37, all.length - i); // a size that lands nowhere useful, which is the point
      c.enqueue(all.slice(i, i + n));
      i += n;
    },
  });
  return Promise.resolve({ ok: true, status: 200, body: stream });
}

// ---------------------------------------------------------------------------------------------
// HTTP plumbing
// ---------------------------------------------------------------------------------------------
const hits = new Map(); // ip → [timestamps]
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < RATE.windowMs);
  if (arr.length >= RATE.limit) {
    hits.set(ip, arr);
    return true;
  }
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 500) for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > RATE.windowMs) hits.delete(k);
  return false;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function json(res, status, obj) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(obj));
}

export function pepeApi() {
  return {
    name: 'pepe-api',
    configureServer(server) {
      const root = server.config.root;
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        if (url === '/api/pepe/health') {
          const s = settings(root);
          const out = { ok: s.provider !== 'none', provider: s.provider, model: s.model, persona: styleOf(req, s) };
          if (s.provider === 'openrouter') {
            const credit = await openrouterCredit(s.key);
            if (credit) {
              out.credit = credit;
              if (credit.remaining != null && credit.remaining <= 0) {
                out.ok = false;
                out.reason = 'the openrouter account has no credit left (openrouter.ai/settings/credits)';
              }
            }
          }
          return json(res, 200, out);
        }
        if (url !== '/api/pepe') return next();
        if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });

        const ip = req.socket?.remoteAddress ?? 'unknown';
        if (limited(ip)) return json(res, 429, { error: 'too many readings; try again in a few minutes' });

        let body;
        try {
          body = JSON.parse((await readBody(req)) || '{}');
        } catch (e) {
          return json(res, 400, { error: `bad body: ${e.message}` });
        }
        const cfg = settings(root);
        if (cfg.provider === 'none') return json(res, 503, { error: 'no provider: set ANTHROPIC_API_KEY or OPENROUTER_API_KEY in .env.local' });

        // SSE from here on: whatever happens, the client gets an event and an end.
        res.statusCode = 200;
        res.setHeader('content-type', 'text/event-stream; charset=utf-8');
        res.setHeader('cache-control', 'no-cache, no-transform');
        res.setHeader('connection', 'keep-alive');
        res.setHeader('x-accel-buffering', 'no');
        res.flushHeaders?.();
        let ended = false;
        const event = (obj) => {
          if (ended || res.writableEnded) return;
          res.write(`data: ${JSON.stringify(obj)}\n\n`);
        };
        const end = (obj) => {
          if (ended) return;
          ended = true;
          if (!res.writableEnded) {
            if (obj) res.write(`data: ${JSON.stringify(obj)}\n\n`);
            res.end();
          }
        };

        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(new Error('upstream timeout')), UPSTREAM_MS);
        req.on('close', () => ac.abort(new Error('client went away')));
        let streamed = 0;
        // Nothing reaches the visitor until the sentence it belongs to is finished and has been
        // read for a card that is not on the table. The client only ever emitted whole sentences,
        // so this costs it nothing and buys the table an enforceable rule.
        const gate = cardGate(body, cfg.guard);
        const send = (t) => {
          for (const s of gate.push(t)) {
            streamed += s.length;
            event({ t: s });
          }
        };
        const flush = () => {
          try {
            for (const s of gate.flush()) {
              streamed += s.length;
              event({ t: s });
            }
          } catch {}
        };
        const t0 = Date.now();
        const names = toolsFor(body);
        // which build of the voice this turn gets: the page's ?persona=, the body, the Referer's
        // query, PEPE_PERSONA, else the room build.
        const style = styleOf(req, cfg, body);
        try {
          const messages = buildMessages(body, names, style);
          const call = cfg.provider === 'anthropic' ? callAnthropic : callOpenRouter;
          const out = await call(cfg, messages, ac.signal, send, names, PERSONAS[style]).catch((e) => {
            if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) e.fatal = true;
            throw e;
          });
          clearTimeout(timer);
          flush();
          // One lever a turn. A second call is a model changing its mind out loud, and the room
          // cannot do two things at once; the first is the one it meant.
          const tool = (out.tools ?? []).find((c) => names.includes(c.name)) ?? null;
          if (tool) event({ tool: { name: tool.name, args: tool.args ?? {} } });
          if (gate.struck)
            server.config.logger.warn(`[pepe] ${body.beat ?? '?'} struck a reading in prose: "${gate.struck}" is not on the table`, { timestamp: true });
          if (!gate.kept.trim() && !tool) {
            end({ error: gate.struck ? 'struck' : out.stop === 'refusal' ? 'refusal' : 'empty reply' });
          } else {
            const cached = out.usage?.cache_read_input_tokens ?? out.usage?.prompt_tokens_details?.cached_tokens;
            server.config.logger.info(
              `[pepe] ${body.beat ?? '?'} ${style} ${cfg.provider}/${cfg.model} ${Date.now() - t0}ms ${gate.kept.length} chars${tool ? ` tool ${tool.name}` : ''}${cached != null ? ` cached ${cached}` : ''}`,
              { timestamp: true },
            );
            end({ done: true, stop: out.stop ?? null });
          }
        } catch (e) {
          clearTimeout(timer);
          flush();
          const msg = ac.signal.aborted ? String(ac.signal.reason?.message ?? 'aborted') : String(e?.message ?? e);
          server.config.logger.warn(`[pepe] ${body.beat ?? '?'} ${cfg.provider} failed after ${Date.now() - t0}ms: ${msg}`, { timestamp: true });
          if (streamed) end({ done: true, truncated: true, error: msg });
          else end({ error: msg, fatal: !!e?.fatal });
        }
      });
    },
  };
}

export { SYSTEM, SYSTEM_ROOM, SYSTEM_BEATS, PERSONAS, DEFAULT_STYLE, styleOf, situation, direction, buildMessages, TOOLS, toolsFor, openaiTools, anthropicTools, cardGate, FAKES };
