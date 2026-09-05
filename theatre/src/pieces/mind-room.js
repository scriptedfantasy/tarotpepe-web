// mind-room.js — the ten things in this room that have something behind them, and the sixty-odd
// that do not. PROPS.md §4 is the source; §5 settles the register.
//
// THE WHOLE DESIGN IN FOUR SENTENCES.
//
//   1. He does not volunteer any of it. The room is full of objects and he is not a tour guide.
//      A story is what a visitor gets when they ask about that object, one object at a time.
//   2. The FACT is fixed and the TELLING is not. Every story carries three written tellings for
//      the scripted brain and one canon fact for the live one, so the visitor who asks twice gets
//      the same fact in different sentences and never a different biography.
//   3. The written lines are a SAMPLE OF VOICE, not a script, the same way a card's scripted line
//      is a hint and never the words. They are deliberately kept OUT of the persona in
//      server/pepe.mjs — the model is given `fact` (flat, third person, not his voice) and, only
//      for the object actually asked about, one `hint` wearing the same label the card hint wears.
//      Nothing he could recite is ever in the cached prefix.
//   4. Sixty-one objects have no story and still deserve an answer. He says plainly what the thing
//      is and whose it is, and most of it is not his: this was the town's manual telephone
//      exchange and he is the tenant. `Not everything in a room is a story` is a line he is
//      allowed to say and the rule the whole file is written to.
//
// RECOGNISING THE ASK. `objectAsk(text, {spread})` is anchored exactly as mind-talk.js's DIRECT
// and RECALL patterns are: a frame wrapped in only(), so the phrase has to account for the whole
// line. On top of that it resolves — a frame that fires but names nothing we know returns null and
// the line falls through to the conversation untouched. That is the property that keeps it from
// stealing turns: it can only take a sentence it can both parse AND identify.
//
// It never runs before intentOf(): a story is a 'talk' turn. Nothing is dealt, nothing is
// shuffled, the camera does not move, and the four intents are not touched.

// ---------------------------------------------------------------------------------------------
// the same anchor mind-talk.js uses. Kept local so this file imports nothing from it (mind-talk
// imports this one, and a cycle between two pattern files is not worth the cleverness).
// ---------------------------------------------------------------------------------------------
const HEAD = `(?:(?:so|and|but|well|ok|okay|alright|right|now|then|hey|hi|hello|please|sorry|excuse me|actually|honestly|anyway|um|uh|oh|yes|no|pepe|tarot pepe|sir)[,!.]?\\s+)*`;
const TAIL = `(?:[,\\s]+(?:please|then|exactly|really|actually|precisely|anyway|though|here|tonight|first|again|by the way|if you do not mind|if i may|pepe|sir|frog|mate))*[\\s.,!?…]*`;
const only = (body) => new RegExp(`^${HEAD}(?:${body})${TAIL}$`);

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

// ---------------------------------------------------------------------------------------------
// THE TEN. PROPS.md §4. `fact` is canon and goes to the model flat, in the third person, so that
// there is nothing in it to copy. `lines` are the house's tellings: the scripted brain says one of
// them, and the live voice is shown exactly one, labelled as a hint of voice and not as words.
// ---------------------------------------------------------------------------------------------
export const STORIES = [
  {
    id: 'globe',
    name: 'the globe',
    where: 'on top of the left bookcase, above his shoulder',
    fact: 'He built a satellite receiver at the age of four, out of a bicycle wheel, a fish kettle and wire taken off a fence. It reached a satellite for eleven minutes and then it rained. His mother put the kettle back in the kitchen. The globe is a child\'s object he kept; it is the only thing in the room that shows where the other end was.',
    keys: /\bglobe\b|\bball\b|\blittle world\b|^world$|\bworld on the (?:shelf|bookcase|top)\b/,
    lines: [
      'I built a receiver when I was four. A bicycle wheel, a fish kettle, and wire off a fence. It reached a satellite for eleven minutes and then it rained. My mother put the kettle back.',
      'It is a globe. I made a receiver at four and pointed it at a satellite. Eleven minutes, then weather. The fish kettle went back to the kitchen.',
      'A globe. It shows the far end of something I built at four out of a bicycle wheel. It worked until it rained on it.',
    ],
  },
  {
    id: 'photograph',
    name: 'the photograph',
    where: 'the left frame on the back wall, over the switchboard',
    fact: 'It was on the wall when he took the room; he did not hang it and has not taken it down. It shows a woman seated at this switchboard, who worked it for thirty years, and he does not know her name. His own mother was a systems operator at DARPA and rarely spoke about the work. Nobody photographed his mother. He never says the two facts are connected and they are the reason the room is what it is. Visitors assume the woman is his mother; she is not, and he corrects them flatly.',
    keys: /\bphotograph\b|\bphoto\b|\bportrait\b|\bwoman\b|\blady\b|\byour (?:mum|mom|mother)\b|^(?:mum|mom|mother)$|\bwho is she\b|\bwho'?s she\b/,
    lines: [
      'That was on the wall when I took the room. She worked this board for thirty years. I do not know her name. My mother did the same job in another country, and nobody took a picture of her.',
      'I did not hang it. It is an operator at this board and I never learned who. My mother sat at one like it, somewhere else. There is no photograph of my mother.',
      'A woman at the switchboard. She was here before me and the frame was already on the nail. My mother did that work in another country. That is why it is still up.',
    ],
  },
  {
    id: 'directory',
    name: 'the directory',
    where: 'a fat book on the shelf, lettered ANNUAIRE',
    fact: 'It is the town\'s telephone directory for 1971, forty years out of date, and he has marked names in it. The marked names are people he still telephones. About forty of them still answer. They are the network of lovers he now calls friends: connection, not conquest, is what he is actually after. He never says the last part.',
    keys: /\bdirector(?:y|ies)\b|\bannuaire\b|\bphone ?book\b|\btelephone book\b|\bfat book\b|\b1971\b|\bmarked names\b|\bnames you (?:have )?marked\b/,
    lines: [
      'That is the directory for 1971. The names I have marked are people I still telephone. Forty of them still answer. I am told that is unusual for a man who sits in one room.',
      'A telephone directory, forty years out of date. The marks are mine. Forty of those names still pick up when I ring. I do not ring to ask for anything.',
      'The 1971 directory. It is a list of who a person is permitted to telephone, and I have made my own inside it.',
    ],
  },
  {
    id: 'radio',
    name: 'the radio',
    where: 'on the test table under the window, dark',
    fact: 'It works and he does not switch it on. He was in a crypto cabal for a while and left it, disillusioned with how easily it could be corrupted: a room where everybody talked at once and had agreed by morning, and nothing said in it survived the week. The radio states that by being silent in the corner of every frame.',
    keys: /\bradio\b|\bradiola\b|\bwireless\b|^set$/,
    lines: [
      'It works. I have not switched it on in some years. I spent a while in a room where everybody talked at once and agreed by morning. Nothing said there survived the week.',
      'The radio is not broken. I sat for a time among people who talked all night and voted at breakfast, and then I left. I have not wanted another one of those in the corner.',
      'It has a valve and a plug and it would play. I was in a crypto cabal once. Everybody spoke and nobody listened, so the silence in here is deliberate.',
    ],
  },
  {
    id: 'candle',
    name: 'the candle',
    where: 'in a wine bottle, on the table in front of the visitor',
    fact: 'He became a digital alchemist during a winter at Carl Gustav Jung\'s retreat, in a house with no electricity, and came back with the habit of one light and one thing at a time. There are three working lamps in this room. The candle is redundant and he lights it anyway, after eight.',
    keys: /\bcandle\b|^wax$|\bcandle in (?:a|the) bottle\b/,
    lines: [
      'I spent a winter in a house with no electricity. You learn to do one thing at a time. I kept the habit. The light in here works and I do not use it after eight.',
      'There are three lamps in this room and I light the candle. A winter at a retreat with no current in the walls will do that. It stuck.',
      'A candle in a wine bottle. I passed a winter somewhere with nothing in the walls, and came back with the habit and not much else.',
    ],
  },
  {
    id: 'barometer',
    name: 'the barometer',
    where: 'the round frame on the stage-left wall',
    fact: 'He spent a year as a physicist at CERN and left because the particles were too predictable: everything they measured did exactly what was expected of it. The barometer claims to tell you what is coming and is wrong about twice a month, which is why he keeps it, hanging in a room where a man is paid to do the same thing.',
    keys: /\bbarometer\b|\bweather glass\b|\bround (?:frame|dial|thing|instrument)\b|\bdial on the wall\b/,
    lines: [
      'I worked for a year among physicists. Everything they measured did exactly what they expected of it. That barometer is wrong about twice a month, and that is why it is on the wall.',
      'A barometer. I was at CERN for a year and left; the particles were too obedient. This one is mistaken twice a month, which I find restful.',
      'It claims to know what is coming and it is frequently wrong. I spent a year somewhere nothing was. I prefer the barometer.',
    ],
  },
  {
    id: 'tin',
    name: 'the tin',
    where: 'by the door, lettered PRENEZ',
    fact: 'It is a poor box running backwards: there is money in it and the card under it says TAKE. He was an early bitcoin adopter and gave the whole of it away through a faucet, in small amounts, to strangers, having decided that wealth is in the flow and not the hoard. The tin is the rest of that, performed daily in centimes. It is the only object in the room a visitor can operate.',
    keys: /\btin\b|\bprenez\b|\bhonesty box\b|\bmoney ?box\b|\bbox by the door\b|^slot$|\bcollection box\b/,
    lines: [
      'The tin by the door has money in it. It is for taking, not for leaving. I had a great deal of it once and gave it away to strangers, in small amounts. The tin is the rest of that.',
      'It says PRENEZ, which is an instruction. I was early into bitcoin and gave the lot away through a faucet, a little at a time. The tin does the same thing in centimes.',
      'A tin with a slot, running backwards. Money leaves it. I have done this at a larger scale and it is better as a habit than as a fortune.',
    ],
  },
  {
    id: 'quarto',
    name: 'the black quarto with the blank spine',
    where: 'in the row of lettered spines on the right bookcase',
    fact: 'It is his psychology doctorate from Stanford, abandoned. A thesis is lettered when it is handed in and this one is bound and blank, which is a fact about the object and not a symbol. There were numerous affairs with faculty. They offered him a deanship afterwards and he declined it.',
    keys: /\bblank (?:spine|book|one)\b|\bbook,? (?:is )?blank\b|\bunlettered\b|\bquarto\b|\bblack book\b|\bbook with no (?:title|name|lettering|writing)\b|\bthesis\b|\bdissertation\b|\bdoctorate\b|\bph\.?d\b/,
    lines: [
      'That is a doctorate that was never finished. The spine is blank because you letter it when you hand it in. They offered me a deanship afterwards, which I thought was poor arithmetic.',
      'The black one with nothing on the spine. My thesis, at Stanford, unfinished. There were complications among the faculty and I did not hand in a page.',
      'An unlettered spine in a row of lettered ones. Psychology, abandoned. The book is bound and that is exactly as far as it went.',
    ],
  },
  {
    id: 'tape',
    name: 'the spool of punched tape',
    where: 'on the lower board of the test table, with the cord',
    fact: 'Half of the abandoned thesis is on it. He wrote that half in binary, in ones and zeros, and told the committee it was modern poetry. They asked him to read it aloud. He did, and it took an afternoon.',
    keys: /\btape\b|\bspool\b|\breel\b|\bthe holes\b|\bpunch(?:ed)? paper\b|\bticker\b/,
    lines: [
      'Half of that thesis is on the tape. I wrote it in ones and zeros and told the committee it was poetry. They asked me to read it aloud. I did, and it took an afternoon.',
      'Punched paper tape. Half a doctorate, in ones and zeros. I maintained it was modern poetry, which was not entirely a defence.',
      'A spool of holes. It is the binary half of the thesis. Nobody could prove it was not poetry in the time available.',
    ],
  },
  {
    id: 'menu',
    name: 'the framed menu card',
    where: 'the small frame on the stage-left wall, under the shelf',
    fact: 'At twelve he got into a hamburger company\'s networked menu board and left a single item on it for a morning. The framed card is that menu. He has never been asked what the item was, and he does not say. A man frames the first thing he ever published.',
    keys: /\bmenu\b|\bcanteen\b|\bmcdonald'?s?\b|\bhamburger\b|\bframed card\b|\bcard in the (?:frame|little frame)\b|\blittle frame\b/,
    lines: [
      'I was twelve. A hamburger company let a boy into its menu board and I left one item on it all morning. That is the card. I have never been asked what the item was.',
      'The framed card is a canteen menu. I was twelve and their board had no lock on it. One item, four hours. It is the first thing I published.',
      'A menu card in a frame. I altered it at twelve, from a bedroom, and it stood all morning. People frame the first thing they publish.',
    ],
  },
];

const STORY_BY_ID = Object.fromEntries(STORIES.map((s) => [s.id, s]));

// ---------------------------------------------------------------------------------------------
// THE OTHER SIXTY-ONE. No story, and an answer all the same: what the thing is, and whose it is.
// Almost none of it is his — this room was the town's manual exchange and he is the tenant — so
// most of these lines are a plain identification with the tenancy in them. No biography.
// ---------------------------------------------------------------------------------------------
const PLAIN = [
  [
    /\bswitchboard\b|\bboard\b|\bjacks?\b|\bjack field\b|\bkeyshelf\b|\bkeys\b|\bcord weights?\b|\bcords?\b|\bexchange\b|\bconsole\b|\bchest\b/,
    [
      'A switchboard, cut down. This was the town\'s exchange until the automatic one came and made it scrap. They took the tall part; I keep the lamp on what is left.',
      'That is the position the operators sat at. Two hundred jacks and nothing to plug them into. I use it as a sideboard.',
    ],
  ],
  [
    /\bwallpaper\b|\bpaper\b|\bsprigs?\b|\bpattern on the wall\b|\brectangle\b|\bclean (?:patch|square|rectangle)\b|\bmark on the wall\b/,
    [
      'The paper is older than the exchange; this was somebody\'s flat first. The clean rectangle is where something tall stood, and the paper behind it never faded.',
      'Wallpaper, from before the post office had the room. The pale square above the board is a shape that is not there any more.',
    ],
  ],
  [
    /\bduct\b|\bconduit\b|\bcleats?\b|\bterminal box\b|\bcables?\b|\bwires?\b|\btrough\b/,
    ['The cable duct. The town\'s calls ran along that wall in it. It is empty now, and it is still screwed to the plaster.'],
  ],
  [
    /\bclock\b|\bpendulum\b|\bseconds hand\b/,
    ['The exchange clock. It has a seconds hand because the women here were timed on every call. Nothing in this room is urgent any more.'],
  ],
  [/\bcat\b|\banimal\b/, ['The cat. It was here before I was and nobody has asked it to leave.', 'A cat asleep on a dead exchange. It is not mine and it does not know that.']],
  [/\brug\b|\bcarpet\b/, ['A rug. It is mine, and it is the only soft thing between me and a floor that was bolted down.']],
  [
    /\bradiator\b/,
    ['A radiator. It knocks at seven and again at eleven, and it came with the room.'],
  ],
  [
    /\bwindow\b|\bshutters?\b|\bsill\b/,
    ['A window and two shutters. The black cable outside it goes down the wall and stops at nothing.'],
  ],
  [
    /\bcurtains?\b/,
    ['Curtains. They are two inches short for that window and that is not my doing.'],
  ],
  [
    /\bdoor\b|\benamel plate\b|\bentr[ée]e interdite\b|\bletter ?plate\b|\bspyhole\b/,
    ['The door, with a plate on it that forbids entry. My own sign says walk-ins tolerated. Both are screwed on and neither is coming off.'],
  ],
  [/\bkey\b|\block\b/, ['The key stays in the lock. There is nothing in here worth turning it for.']],
  [
    /\bsign ?board\b|\bsign\b|\blettering\b/,
    ['My sign. It is hand-lettered on the back of a sheet of the post office\'s own board, through its old fixing holes.'],
  ],
  [
    /\bbookcases?\b|\bshelf\b|\bshelves\b|\bbooks\b|\bthose books\b|\bbook row\b|\bspines?\b/,
    [
      'Books. Six of them are about cards. The rest are the post office\'s manuals and the town\'s old directories.',
      'Two low bookcases and what was left in them. I brought perhaps five of those.',
    ],
  ],
  [
    /\bbottles?\b|\bdemijohn\b|\bcarboy\b|\bspares\b|\bpress\b|\bcabinet\b|\bmarc\b|\bacide?\b|\bfusibles?\b|\bfiches\b|\bressorts\b|\bpile\b/,
    ['Battery jars, fuses, cord tips, and one bottle of marc. It was the spares press. I have added exactly one thing to it.'],
  ],
  [
    /\bcart\b|\btrolley\b|\btest table\b|\bworkbench\b|\bbench under the window\b/,
    ['The test table. It has wheels, which is more than the rest of the furniture can say.'],
  ],
  [/\bsiphon\b|\bsoda\b/, ['A soda siphon on a workbench. I did not put it there and I have not moved it.']],
  [
    /\bnewspapers?\b|\ble soir\b|\bpaper on the\b|\bcourrier\b/,
    ['Newspapers. I keep them for the weather page, which is wrong about as often as the barometer is.'],
  ],
  [
    /\bhat ?stand\b|\bcoat\b|\bscarf\b|\bumbrella\b|\bcane\b|\bboater\b|\bhat\b|\bheadset\b|\bearpieces?\b/,
    ['A coat, a hat, an umbrella and an operator\'s headset. Three of those are mine.'],
  ],
  [
    /\bpendant\b|\bceiling light\b|\bfloor lamp\b|\blamps?\b|\bmushroom\b|\blight\b/,
    ['A lamp. There are three in this room and all three of them work, which is the joke about the candle.'],
  ],
  [
    /\bdoily\b|\blace\b/,
    ['A doily. Somebody laid it on a switchboard, and it was not me.'],
  ],
  [/\bvase\b|\bflowers\b|\bdried stems?\b/, ['Dried flowers in a vase, standing on a keyshelf. They were here.']],
  [/\bcandlestick\b/, ['A candlestick with no candle in it. The candle is on the table.']],
  [
    /\balbum\b|\bfamily album\b|\balbum de famille\b/,
    ['An album of somebody\'s family. It came with the room and I have never opened it.'],
  ],
  [
    /\bdiagram\b|\bcircuit\b|\bother frame\b|\bgrid\b/,
    ['A circuit diagram in a frame. It is a jack field drawn on paper. That one was here too.'],
  ],
  [
    /\bpicture\b|\bframes?\b|\bpaintings?\b/,
    ['Two frames and a small one. I hung none of them; the nails were already in the plaster.'],
  ],
  [/\bplant\b|\bpalm\b|\bpot\b/, ['A palm in a post office tin. It is doing better than it looks.']],
  [/\bstool\b/, ['A three-legged stool. The palm sits on it, and it has never been asked to do anything else.']],
  [/\bmouse ?hole\b|\bmouse\b/, ['A mouse hole. The mouse is not a story either.']],
  [/\bdoor ?mat\b|\bmat\b/, ['A mat. People wipe their feet on it, which surprises me every time.']],
  [
    /\bfloor ?boards?\b|\bfloor\b|\bboards\b|\bbolt scars?\b/,
    ['Floorboards, and four bolt scars in front of the board where the tall multiple stood. The floor remembers the furniture.'],
  ],
  [
    /\bceiling\b|\bcornice\b|\bfrieze\b|\bwainscot\b|\bdado\b|\bskirting\b|\bmoulding\b|\bplaster\b|\bwalls?\b/,
    ['Plaster and joinery. It was a flat before the post office rented it, and the room has never quite agreed to be either.'],
  ],
  [
    /\btable\b|\bcloth\b|\bfringe\b|\bpleats?\b/,
    ['The table is mine and the cloth has a burn in it. Neither is worth the story you are hoping for.'],
  ],
  [/\bmy bench\b|\bbench\b|\bbench\b|\bwhat you sit on\b|\bseat\b/, ['My bench. It is low, which is why I am.']],
  [/\bglass\b|\bwine\b/, ['One glass. I do not pour a second one during a reading.']],
  [/\bashtray\b|\bstubs?\b|\bash\b/, ['An ashtray, in use. Use it.']],
  [/\bmatch ?box\b|\bmatches\b|\ballumettes\b/, ['Matches. They are for the candle.']],
  [/\bpocket ?watch\b|\bwatch\b/, ['A pocket watch, four minutes fast. I have never corrected it and I always allow for it.']],
  [/\bletter\b|\benvelope\b/, ['A letter. It is mine, it has been answered, and it is not on the table for you.']],
  [/\bcoins?\b|\bfrancs?\b|\bmoney on the table\b/, ['Coins. They are for the tin by the door and not for me.']],
  [/\bplate\b|\bnapkin\b|\bolives?\b|\bstones?\b|\bcrumbs?\b|\bsupper\b|\bknife\b/, ['My supper. It was a small one and it was some time ago.']],
  [/\bespresso\b|\bcup\b|\bsaucer\b|\bcoffee\b|\bspoon\b|\bsugar\b/, ['Coffee. It has been cold since about six.']],
  [/\blight switch(?:es)?\b|\bswitch\b/, ['A light switch. There is another by the door and it does nothing at all.']],
  [/\btransom\b|\bfanlight\b|\bover the door\b/, ['The light over the door. It is the only clear pane in the room.']],
  [/\bcupboard\b|\bpress door\b|\bother door\b|\bside door\b/, ['The cable press. It has not been opened since before my lease and I have not tried.']],
  [/\bjars?\b|\bsucre\b|\banis\b|\bmiel\b/, ['Jars. Sugar and anis, both older than the tenancy.']],
];

// generic, and honest: not everything in a room is a story.
const PLAIN_ANY = [
  'It came with the room. I have moved almost nothing in here.',
  'That was here before me, and so was most of this.',
  'It is what it looks like. Not everything in a room is a story.',
];

// ---------------------------------------------------------------------------------------------
// Things a visitor asks for that are not in the room. Only a named list: anything we cannot place
// is left to the conversation rather than answered with an invention.
// ---------------------------------------------------------------------------------------------
const ABSENT = [
  [/\bchairs?\b|\bsomewhere to sit\b|\bseat for me\b/, ['There is no chair. People stand, and the visits are shorter and more honest for it.']],
  [/\btelephones?\b|\bthe phone\b|\ba phone\b/, ['There is no telephone. This was the exchange; they took every telephone with them when they went.']],
  [/\btelevision\b|\btv\b|\bscreens?\b|\bcomputers?\b|\bmonitor\b/, ['Nothing in this room has a screen in it. That is not a principle; it is the lease.']],
  [/\bmirrors?\b/, ['There is no mirror. Nobody has ever asked for one twice.']],
  [/\bfireplaces?\b|\bthe fire\b|\bstove\b/, ['No fireplace. There is a radiator, and it makes a noise instead of heat.']],
  [/\bpianos?\b|\bguitar\b|\bgramophone\b|\brecord player\b/, ['There is no piano. There is a radio that does not get switched on, which is quieter still.']],
  [/\bbed\b|\bkitchen\b|\bbathroom\b|\btoilet\b|\bthe lavatory\b/, ['Not in here. That is all upstairs, and it is a bed, a kettle and a window looking at another window.'],],
  [/\bwi.?fi\b|\binternet\b|\bsignal\b|\belectricity in here\b/, ['Nothing in this room is connected to anything. It used to be connected to the whole town.']],
  [/\bdogs?\b/, ['No dog. There is a cat, and it belongs to the building.']],
];

// bare deixis with nothing to point at: chat has no finger in it.
const POINT = [
  'You will have to be more particular. There are a great many things in here and most of them are not mine.',
  'Point at it and say a noun. The room is crowded and I am not going to guess.',
];

// ---------------------------------------------------------------------------------------------
// The frames. Every one is anchored with only(), and a frame that fires but names nothing we can
// place returns null, so the sentence goes back to the conversation exactly as it was.
// ---------------------------------------------------------------------------------------------
const NP = `([\\w' .,/-]{2,64})`;

// what is that globe · what's the tin for · what are those bottles · who is the woman in the frame
const NAMED = [
  only(`what(?:'?s| is| are| was| were) (?:that|this|those|these|the|your|a|an) ${NP}`),
  only(`who(?:'?s| is| was| are| were) (?:that|this|the|your) ${NP}`),
  only(`why (?:do|did|would|have) you (?:keep|have|got|own|hang|hung|need|still have|leave|use) (?:a|an|the|that|those|your|any )?${NP}`),
  only(`why (?:is|are|was|were) (?:the|that|this|those|these|there) ${NP}`),
  only(`(?:tell me|talk to me|say something|what can you tell me) about (?:the|that|this|your|a|an|those|these) ${NP}`),
  only(`(?:where did|how did|when did) you (?:get|find|come by|acquire) (?:the|that|this|your|a|an) ${NP}`),
  only(`(?:is|was) (?:that|this|the) ${NP}`),
  only(`what(?:'?s| is)? ?(?:in|inside|on|under|behind|about) (?:the|that|this|your) ${NP}`),
  only(`what (?:do|did|would) you (?:keep|have|put|store|hide) (?:in|inside|on|under|behind) (?:the|that|this|your|a|an) ${NP}`),
  only(`(?:do|have) you (?:have|got|own|keep) (?:a|an|any|the|your) ${NP}`),
  // interrogative order only: "is there a chair" asks, "there is a photograph of us" reports
  only(`is there (?:a|an|any|the) ${NP}`),
  only(`(?:where'?s|where is|where are|where do you keep) (?:the|that|those|your|a|an) ${NP}`),
  only(`(?:what|which) (?:one )?is (?:the|that) ${NP}`),
];

// a bare noun phrase, and only when the line is short enough to be a finger: "that ball?", "the tape"
const BARE = only(`(?:the|that|those|this|these|your) ${NP}`);

// "what's that" with nothing after it. Never when cards are on the table: there, "that" is a card
// and the table's own machinery owns it.
const DEIXIS = only(`what(?:'?s| is| was| are| were)? ?(?:that|those)`);
const WHO_BARE = only(`who(?:'?s| is| was)? ?(?:that|she|the woman|that woman)`);

// the deck is not set dressing: a line whose subject is the cards belongs to the table, always.
const DECKISH = /^(?:the |that |this |my |your |a |our )?(?:cards?|deck|spread|arcana|reading)\b/;

function resolve(phrase) {
  const p = norm(phrase);
  if (!p) return null;
  for (const s of STORIES) if (s.keys.test(p)) return { kind: 'story', ...s };
  if (DECKISH.test(p) || /\b(?:cards?|deck|spread|arcana)\b/.test(p)) return null;
  for (const [re, lines] of ABSENT) if (re.test(p)) return { kind: 'absent', id: 'absent', name: p, lines };
  for (const [re, lines] of PLAIN) if (re.test(p)) return { kind: 'plain', id: `plain:${re.source.slice(0, 18)}`, name: p, lines };
  return null;
}

// ---------------------------------------------------------------------------------------------
// Did they just ask about something in the room? → the object, or null.
//
// `spread` is what is face up on the table. A line that points at a card lying there is never an
// object question, whatever else is in it: that is the same guard the recall uses, and it is what
// keeps "the world" meaning the globe on a bare table and The World on a dealt one.
// ---------------------------------------------------------------------------------------------
export function objectAsk(text, { spread = [], cardRef = null } = {}) {
  const t = norm(text);
  if (!t) return null;
  const drawn = (spread ?? []).filter(Boolean);
  if (drawn.length && typeof cardRef === 'function' && cardRef(text, drawn)) return null;

  for (const re of NAMED) {
    const m = t.match(re);
    if (!m) continue;
    const found = resolve(m[1] ?? '');
    if (found) return { ...found, phrase: (m[1] ?? '').trim() };
  }
  // "the globe", "that ball?" — a finger, not a sentence. Short lines only.
  const words = t.split(' ').length;
  if (words <= 3 || (/\?/.test(String(text)) && words <= 6)) {
    const m = t.match(BARE);
    if (m) {
      const found = resolve(m[1] ?? '');
      if (found) return { ...found, phrase: (m[1] ?? '').trim() };
    }
  }
  if (WHO_BARE.test(t)) return { kind: 'story', ...STORY_BY_ID.photograph, phrase: t };
  if (!drawn.length && DEIXIS.test(t)) return { kind: 'point', id: 'point', name: 'it', lines: POINT, phrase: t };
  return null;
}

// ---------------------------------------------------------------------------------------------
// What he says. The fact is fixed; the sentences rotate, so asking twice gives the same fact in
// different words. `state.used` is the visit's memory of every line he has already spent — the
// same Set mind-talk.js uses, so a story never repeats itself in a visit either.
// ---------------------------------------------------------------------------------------------
function pick(list, used, salt) {
  const ok = (list ?? []).filter(Boolean);
  if (!ok.length) return null;
  const fresh = ok.filter((l) => !used.has(l));
  const pool = fresh.length ? fresh : ok;
  const line = pool[hash(salt + pool.length) % pool.length];
  used.add(line);
  return line;
}

export function objectScript(said, object, state = {}) {
  if (!object) return null;
  const used = state.used ?? (state.used = new Set());
  const salt = `${object.id}:${timesTold(object, state)}:${norm(said)}`;
  if (object.kind === 'plain') return pick(object.lines, used, salt) ?? pick(PLAIN_ANY, used, salt) ?? PLAIN_ANY[0];
  return pick(object.lines, used, salt) ?? PLAIN_ANY[0];
}

// How many times he has been asked about this one tonight, BEFORE this turn. The live voice is
// told the number, so that a second telling is not the first one again.
export function timesTold(object, state = {}) {
  if (!object) return 0;
  return state.told?.[object.id] ?? 0;
}

// Counted once per turn by whoever spoke it, live voice or script alike.
export function noteTold(object, state = {}) {
  if (!object) return 0;
  const told = state.told ?? (state.told = Object.create(null));
  told[object.id] = (told[object.id] ?? 0) + 1;
  return told[object.id];
}

// What rides to the model: the fact flat, and exactly one written line as a hint of voice. The
// hint is never the same one twice in a visit, and it is never in the persona.
export function objectBody(object, state = {}) {
  if (!object) return null;
  const told = timesTold(object, state);
  const lines = object.lines ?? [];
  return {
    kind: object.kind,
    id: object.id,
    name: object.name ?? null,
    where: object.where ?? null,
    fact: object.fact ?? null,
    hint: lines.length ? lines[hash(`${object.id}${told}`) % lines.length] : null,
    told,
  };
}

export { PLAIN_ANY, POINT };
