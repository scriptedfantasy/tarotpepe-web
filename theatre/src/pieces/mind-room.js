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
    // RETIRED (round 10): the photograph came off the wall when the left frame became the
    keys: /$^/,
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
    where: 'on the middle board of the tall case against the wall stage left, dark',
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
    where: 'the small frame on the stage-left wall',
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
  // THE SPINET, squeezed in under the wide window between the chimney breast and the corner. It is
  // PLAIN and not a story: it came with the room, like the wallpaper and the duct, and he does not
  // have a life in it. What he has is the one true thing about it — it is not his and he plays it —
  // which is the register everything in this room that is not one of his ten objects is answered in.
  [
    /\bpianos?\b|\bspinets?\b|\bkeyboards?\b|\bupright\b|\bkeys? of the piano\b/,
    [
      'The spinet was here when I took the room. The post office had it from a chapel that closed and nobody ever came for it, so it stays under the window with the lid down.',
      'It is not mine. It came with the room, out of a chapel down the hill, and it is half a tone flat in the bass and has been since before I arrived.',
      'A spinet, under the window. I play one piece on it and I play it badly, and there is nobody up here to mind.',
    ],
  ],
  // THE PICTURE OF THIS ROOM (src/pieces/egg-droste.js), AND IT IS NOT ON THE WALL ANY MORE. The
  // user moved it: "the room image instead should be in a photo frame where the cat now stands." So
  // it is a small framed photograph standing on the right-hand bookcase top, and the lines say that
  // and nothing else. It is a photograph of the parlour, standing in the parlour, and in it is the
  // same photograph again — all of which is true and none of which he explains. If the visitor has
  // not scrolled into it yet, nothing here tells them they can; if they have, the line is the plain
  // description of what they were just inside.
  //
  // `picture beside the clock` is kept in the keys because it is what a visitor who remembers the
  // wall will type, and the honest answer to that is this answer.
  [
    /\bphotograph of (?:the|this|your) room\b|\bpicture of (?:the|this|your) room\b|\bpainting\b|\bpicture in the picture\b|\broom in the picture\b|\b(?:picture|frame) beside the clock\b|\bframed (?:picture|photograph|photo)\b|\bphoto frame\b/,
    [
      'A photograph of this room. It stands in this room, so the room is in it, and so is the photograph. It goes down as far as the paper does.',
      'That is the room. The one you are standing in. It was in the drawer when I took the place and I have never worked out who stood where to make it.',
      'A photograph of the parlour, on the bookcase in the parlour. Look closely and it is in there too.',
    ],
  ],
  // THE WALL TO HIS LEFT, AND IT STANDS BEFORE THE WINDOW'S OWN LINE ON PURPOSE: PLAIN is walked
  // in order and a visitor who asks about "the left-hand wall" means the thing that fills it, which
  // is now the wide window. A switchboard hung on that plaster, and a framed circuit diagram that
  // was also a cabinet door with a conspiracy board behind it; the user had both taken out ("let's
  // remove both of these, they don't make sense anymore. add a wide window instead", and "pepe
  // silvia doesnt work on the side, so you can remove it"). `pepe silvia` stays in the keys because
  // somebody will type the name, and the answer to that is the answer to all of it: it is not here.
  [
    /\bdiagram\b|\bcircuit\b|\bgrid\b|\bpicture on the left\b|\bframe on the left\b|\bleft(?:[- ]hand)? wall\b|\bpepe silvia\b|\bsilvia\b/,
    ['The wall to my left is mostly window. There was a board on it and a framed diagram, and both went the same week; I have not put anything back.'],
  ],
  [
    /\bclock\b|\bpendulum\b|\bseconds hand\b/,
    [
      'The exchange clock. It kept the time the women here were paid by, to the minute. It still keeps it; nothing in this room is urgent any more.',
      'The clock, over my head. It is the only thing on that wall and it is the only thing in this room that is still doing its job.',
    ],
  ],
  // THE CAT is in the tall case now and not on the bookcase top: the user moved it to make room for
  // the photograph ("you can put the cat in the book shelf on the left"). Both lines are his own and
  // neither of them ever said where it was; the second one did, and it has been re-aimed at the bay.
  [/\bcat\b|\banimal\b/, ['The cat. It was here before I was and nobody has asked it to leave.', 'A cat sitting in a bookcase, on the left. It is not mine and it does not know that.']],
  [/\brug\b|\bcarpet\b/, ['A rug. It is mine, and it is the only soft thing between me and a floor that was bolted down.']],
  [
    // THE TALL CASE, and it stands HERE because PLAIN is walked in order: it is before the low
    // cases' line, because a visitor who says "the bookshelf" or
    // "the tall case" means the thing that fills the wall stage left and not the two knee-high ones
    // beside him. The low cases keep every other word — bookcase, shelf, shelves, books, spines —
    // and are answered on all of them further down. The register is the one the other sixty objects
    // get: what it is, whose it is, and no biography.
    /\btall case\b|\bbook ?shelf\b|\bbook ?case by the (?:cart|trolley)\b|\bbig shelf\b|\bshelving\b|\bcase over the radiator\b|\bcase on the left\b/,
    [
      'The tall case. It stands on the floor, it came with the room, and the books in it are mine.',
      'That case was the exchange\'s and it was empty when I got here. What is in it now I carried up the stairs.',
    ],
  ],
  // THE RADIATOR is not in this list any more. It stood on the plaster under the tall case and it
  // went out of the room when that case came down onto the floor in front of it (props.js, room.js).
  // A visitor who asks after it is answered by ABSENT at the foot of this file, which is where
  // everything this room has not got is answered.
  [
    // THE FIREPLACE. The user: "Put a fireplace on the left wall." It is room.js's joinery and it is
    // also the switch the fire egg hangs off (src/pieces/egg-fine.js) — and this line gives none of
    // that away, exactly as the frame that was a cabinet door gave none of itself away: he says what
    // is standing there and stops. `the fire` and `the grate` are in the keys because that is what a
    // visitor who has just clicked it will type, and the answer to that is the same answer.
    /\bfire ?places?\b|\bchimney\b|\bhearth\b|\bgrate\b|\bmantel ?(?:piece)?\b|\bthe fire\b|\bstove\b/,
    [
      'A fireplace. It is swept, it is laid, and I have not lit it since the second winter.',
      'The fireplace. The chimney is the only thing in this building that still goes all the way out.',
    ],
  ],
  [
    // HE HAS TWO WINDOWS AGAIN, AND NEITHER IS THE ONE BEHIND HIM. The back wall's casement was
    // taken out and has not come back; what has come is a WIDE one on the stage-left wall, where
    // the switchboard and the wall shelf were. The cable is still outside the stage-right one —
    // room.js drives the lead-in through that window's head — so that clause is the clause it
    // always was, and he is still not describing the wall he is sitting in front of.
    /\bwindow\b|\bshutters?\b|\bsill\b/,
    [
      'Two windows. The wide one on my left, and a tall one on the right with two shutters on it. The black cable outside that one goes down the wall and stops at nothing.',
      'The wide one to my left is three lights across and has no shutters — there is no wall left either side to fold them onto. The other is on the right and does.',
    ],
  ],
  [
    // Curtains: there are none. There were, on the window that has gone, and they were two inches
    // short. He does not volunteer the history; he answers what is in the room.
    /\bcurtains?\b/,
    ['No curtains. The shutters do it, and they do it badly.'],
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
      'Two low cases and a tall one, and what was left in them. I brought perhaps five of those.',
    ],
  ],
  [
    /\bbottles?\b|\bdemijohn\b|\bcarboy\b|\bspares\b|\bpress\b|\bcabinet\b|\bmarc\b|\bacide?\b|\bfusibles?\b|\bfiches\b|\bressorts\b|\bpile\b/,
    ['Battery jars, fuses, cord tips, and one bottle of marc. It was the spares press. I have added exactly one thing to it.'],
  ],
  [/\bsiphon\b|\bsoda\b/, ['A soda siphon, on the bottom shelf. I did not put it in this room and I have not moved it.']],
  [
    /\bnewspapers?\b|\ble soir\b|\bpaper on the\b|\bcourrier\b/,
    ['Newspapers. I keep them for the weather page, which is wrong about as often as I am.'],
  ],
  // THE HEADSET, on the case's middle board. The hat stand's words used to share this line, from
  // the rounds when the headset hung on it; the stand is gone and those words are ABSENT's now.
  [
    /\bheadset\b|\bearpieces?\b/,
    ['An operator\'s headset, on the shelf beside the radio. It is the exchange\'s and it still works, which is two things it has over me.'],
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
    /\bpicture\b|\bframes?\b|\bpaintings?\b/,
    ['Two frames and a small one. I hung none of them; the nails were already in the plaster.'],
  ],
  // THE READING TABLE, where the palm and its stool stood until the user asked for one: "where we
  // have the flower pot right now, we should have a little reading table with a chair and a book on
  // the table." PLAIN, like the rest of the furniture that came with the room; what is on it is
  // his, and he is short about it because a man does not introduce his own book.
  [
    /\breading table\b|\blittle table\b|\bside table\b|\bthat table\b|\bchair\b/,
    [
      'A table and a chair by the window. I read there in the afternoons, when nobody is on the stairs.',
      'The table came up with the room. The chair did not match it then either.',
    ],
  ],
  [
    /\bbook on the table\b|\byour book\b|\bthe book\b/,
    [
      'That is mine. I wrote it down because people kept asking me the same eleven questions and I am not patient. You can open it; it is not a secret.',
      'A book I wrote about the deck. It is shorter than the ones on the shelf, which is the only thing I will say for it.',
    ],
  ],
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
  // THE CROSS ON THE FRIEZE (src/pieces/egg-cross.js), and it goes BEFORE the transom because the
  // transom's own pattern catches "over the door" and would answer a question about the cross with a
  // sentence about a pane of glass. It is not his and it has no story: it was over that door when he
  // took the lease and he has never had a reason to take it down. Nothing here says what it does
  // when it is clicked — nothing announces an egg — and nothing here says anything about a cellar
  // either, for the same reason.
  [/\bcross\b|\bcrucifix\b|\bcrucifixion\b/, ['The cross over the door. It came with the room and I have left it where the last tenant had it.']],
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
  // THE FIREPLACE is not here any more: there IS one, and it is answered in PLAIN above. What is
  // left absent on this subject is the radiator, which came out of the room with the tall case's
  // legs and was replaced by nothing until the chimney breast went up.
  [/\bradiators?\b|\bheating\b|\bheater\b/, ['There is no radiator. There was, under the case, and it knocked at seven and again at eleven. There is a fireplace instead, which is older and quieter and no warmer.']],
  // THE PIANO WAS ON THIS LIST FOR NINE ROUNDS AND IT IS IN THE ROOM NOW (src/pieces/props-piano.js).
  // The user: "can we squeeze a piano between the fireplace and the wall under the window?" So the
  // instrument has an entry of its own in PLAIN above, and what is left absent here is everything
  // else somebody might ask for music with.
  // THE PALM WENT OUT with the round that put a reading table where it stood. There is nowhere else
  // on that wall for it, so it is absent rather than moved, and he says so plainly.
  [/\bplant\b|\bpalm\b|\bflower ?pot\b|\bpot plant\b|\bfern\b/, ['There is no plant in here any more. There was a palm on a stool by the window and a table stands where it did; the palm went down to the sorting office, where there is a window that opens.']],
  [/\bguitar\b|\bgramophone\b|\brecord player\b|\bviolin\b|\baccordion\b/, ['No. There is a spinet under the window and a radio that does not get switched on, and between them that is as much music as this room has.']],
  [/\bbed\b|\bkitchen\b|\bbathroom\b|\btoilet\b|\bthe lavatory\b/, ['Not in here. That is all upstairs, and it is a bed, a kettle and a window looking at another window.'],],
  [/\bwi.?fi\b|\binternet\b|\bsignal\b|\belectricity in here\b/, ['Nothing in this room is connected to anything. It used to be connected to the whole town.']],
  [/\bdogs?\b/, ['No dog. There is a cat, and it belongs to the building.']],
  // THE HAT STAND. It stood by the door in the early rounds with a coat, a scarf, an umbrella, a
  // cane and a boater on it, and it was taken out; the headset that hung on it is on the case now.
  // Until this round a visitor asking about a coat was handed the headset's line.
  [
    /\bhat ?stand\b|\bcoats?\b|\bscar(?:f|ves)\b|\bumbrellas?\b|\bcanes?\b|\bboaters?\b|\bhats?\b/,
    ['There is no hat stand and nothing to hang on one. The operators took their coats when they went, and I have never owned one.'],
  ],
  // THE TEST TABLE. It stood under the window, then in front of the case, and the user had it taken
  // out ("remove the thing in front of the bookshelf"); everything that was on it is on the shelves
  // now. He is not going to be caught describing a trolley that is not in the room, and a visitor
  // who remembers it — or who is looking at an old still — gets the plain truth instead.
  [
    /\bcart\b|\btrolley\b|\btest table\b|\bworkbench\b|\bbench under the window\b/,
    ['There is no trolley in here any more. What was on it is on the shelves, which do not have wheels and are the better for it.'],
  ],
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
