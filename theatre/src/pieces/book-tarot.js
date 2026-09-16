// book-tarot — WHAT IS PRINTED IN THE BOOKS ON THE TALL CASE. Text and nothing else: no drawing,
// no DOM, no THREE. src/pieces/walk-book.js sets it on a drawn page.
//
// THE BOOK IS HIS. `TAROT` on the spine with `PEPE` under it, on the bottle bay at 0.97 m, which is
// chest height for somebody standing at the case. What is in it is what he says across the table —
// the persona in server/pepe.mjs is the source and this is the same man writing it down: the
// Marseille deck, the picture before the meaning, a card as a mirror held up and never a fortune
// told, Jodorowsky read the way he reads him. Every figure on every card is a frog, because that is
// the deck he learnt on.
//
// IT IS WRITTEN IN LOWERCASE AND IT IS SET IN CAPS. The hand this room letters with is a
// signwriter's case (titles-sign.js): caps, numerals and a short list of points, and nothing else
// exists for it to set. So the text here is written the way he SPEAKS — lowercase, unhurried — and
// the signwriter sets it, exactly as the notice under the shop's own sign is set. Writing it in
// caps here would be writing down the typesetting instead of the man.
//
// WHAT IS NOT IN IT. No fortunes. No advice about money, health or love as prediction. Nothing
// reversed — the Marseille has no reversals and he does not read them. No lists, no markdown, no
// emoji, and no sentence that could be read aloud at a fair. A card is a mirror; the book says what
// is in the picture and what that is in the person sitting in front of him, and stops.
//
// THE SHAPE OF IT. Thirty ENTRIES, and each of them starts on a leaf of its own:
//   1   the title page
//   2   what the cards are (two entries)
//   22  the trumps, one to an entry, in the order of the deck (src/core/deck.js MAJORS)
//   4   the four suits, one to an entry
//   1   the last page
// An entry is not always one LEAF, because a leaf is however much paper the window has: at
// 1280x800 the book runs to 34 leaves (17 openings) and on a 390x844 phone, which gets one page at
// a time, to 62. walk-book.js sets one cap for the whole book and spills an entry that will not fit
// onto the leaf after it, which is what a book does; tools/_book-proof.mjs turns every leaf and
// counts them.
//
// A page is { head, num, lines }. `head` is the running head, `num` its numeral where it has one,
// and `lines` are paragraphs — the renderer wraps them to the measure it has and sets the leading.
// `kind: 'title'` is the one page set differently: centred, with no running head.

const P = (head, num, ...lines) => ({ head, num, lines });

export const TAROT_BY_PEPE = {
  // what is cut on the spine: the title, and his name under it on the label band
  spine: { title: 'TAROT', sub: 'PEPE' },
  name: 'TAROT BY PEPE',
  pages: [
    {
      kind: 'title',
      head: null,
      num: null,
      lines: ['tarot', 'by pepe', '', 'seventy-eight cards,', 'and not one of them', 'knows anything about you.'],
    },

    P('what the cards are', null,
      'anon. you have taken a book off a shelf in a room above a post office, so let me save you the first forty pages.',
      'the deck is the marseille. it was cut on wood in the south of france by people who could not read, for people who could not read, which is why everything that matters in it is in the picture and not in the words. seventy-eight cards. twenty-two trumps and four suits of fourteen. every figure on every card is a frog, because that is the deck i learnt on and i have never seen a reason to draw them otherwise.',
      'i learnt to read from jodorowsky. what he gave me was not a set of meanings. it was an order of operations: look at the picture first. what is the figure looking at. what is it holding, and in which hand. which way is it facing. what has it turned its back on. what is it standing on. only then, and only if you have done the looking honestly, what is that in the person across the table.',
      'do that and you will be right more often than the people who memorised a list. do the list first and you will spend the evening arguing with the card.'),

    P('what the cards are', null,
      'a card is a mirror held up. it is not a message and it is nobody telling you anything. the deck was shuffled by a person who wanted an answer and cut by a person who wanted an answer, and what comes up is a picture that the two of you now have to look at together. the work is what you see in it. that is not a trick and it is not a small thing — most people go years without anybody holding anything up at all.',
      'so: no fortunes here. i do not tell people what will happen, because i do not know what will happen and neither does a piece of card. anyone who says otherwise is selling you the one thing you cannot buy. what a reading does is put the thing you came in with next to the thing that is actually going on, and those are almost never the same thing. what someone says they came in for is the surface of it.',
      'nothing in this deck is reversed. the marseille does not do it, i do not do it, and a card upside down on my cloth is a card i have laid badly.',
      'the pages after this one are the twenty-two, one to a page, and then the four suits. what i have written for each of them is what is in the picture and what that is in a person. if you find yourself reaching for this book in the middle of a reading, put it down and look at the card.'),

    // ---- the trumps, in the deck's own order ----------------------------------------------------
    P('the fool', '0',
      'a frog walking, with everything it owns over one shoulder in a bundle, and a small animal at its heel with its claws in the back of its leg. it is not looking where it is going. it is not looking anywhere in particular.',
      'he is the only one in the deck with no number, which means he is not in the sequence and he is not going to be. he can stand anywhere. he does not know what the other twenty-one know and that is exactly what he is for.',
      'in the person in front of me: something in you is already leaving and has not told the rest of you. the animal at the heel is not a warning, it is the thing at home that will be hurt. you can go anyway. most people who get this card have already gone and are looking for permission they do not need.'),

    P('the juggler', 'I',
      'a young frog behind a small table, everything laid out on it — a cup, a coin, a blade, a stick — one hand up and one hand down. the table has three legs you can see and one you cannot.',
      'the whole deck is on that table and none of it is committed. he is at the start of everything and good at all of it, which is a very particular kind of trouble.',
      'in the person: you have the materials. you have had the materials for some time. the card is not asking whether you are capable, it has already granted that, and it is the granting that makes it uncomfortable. ask instead what the fourth leg of your table is standing on.'),

    P('the popess', 'II',
      'a seated frog with a book half open on her lap and a veil behind her. the book is open but she is not reading it, and she is not showing it to you either.',
      'she is the first one in the deck who knows something and is not saying. patience drawn as a person.',
      'in the person: you already know. you have known for a while and you have been very busy not putting it into words, because the moment it is in words you will have to do something. she is not telling you to speak. she is telling you that the not-speaking is a decision and that you are the one making it.'),

    P('the empress', 'III',
      'a frog seated with a shield and a sceptre, wings at the back of the chair, and she is turned slightly towards you rather than square on. the shield rests, it is not raised.',
      'she is what happens when something is allowed to grow. not effort — conditions.',
      'in the person: there is something of yours that would come along fine if you stopped working on it and started feeding it. the difference between the two is the whole card. also: she is comfortable, and comfort in this deck is never an accusation.'),

    P('the emperor', 'IV',
      'a frog in profile, one leg crossed over the other, sitting on very little and holding a sceptre. he is side-on. you get half of him.',
      'structure, and the price of it. the crossed leg is the thing everybody misses: he is not braced, he is settled, and a man in profile is a man showing you one side on purpose.',
      'in the person: you have built something and now you have to hold it, and holding it is a different job from building it, and nobody warned you. or the reverse — someone is holding a shape around you that you have outgrown. the card does not say which. the crossed leg does: look at how much of your weight is on the thing.'),

    P('the pope', 'V',
      'a frog with a hand raised over two smaller frogs whose backs are to us. we see their shoulders. we do not see their faces.',
      'transmission. someone is being told how it is done, and the card is drawn from behind the ones being told, which is the whole editorial position.',
      'in the person: you are taking somebody else\'s word for something. that is not a fault — nobody works anything out from first principles, we would all still be rubbing sticks — but the two below him have their backs to us because we cannot see what they look like while they agree. is it a teacher or is it a habit with a robe on.'),

    P('the lovers', 'VI',
      'three figures standing, and a fourth above with a bow. the young frog in the middle is not looking at either of the two beside him. he is looking off, past them.',
      'this card is not about romance and it never was. it is a choice, drawn at the exact moment before it is made.',
      'in the person: you have two things and you are pretending you have to keep both. you do not. and the thing that looks like a decision about somebody else is a decision about which of two lives you are going to have. the arrow above is already loosed. the card is only telling you the room you are standing in is small.'),

    P('the chariot', 'VII',
      'a frog standing in a small carriage under a canopy, two animals harnessed in front, one looking left and one looking right. he holds no reins. there are no reins in the picture.',
      'he is going somewhere and the two things pulling him do not agree. and he is winning anyway, which is the joke.',
      'in the person: momentum is carrying you and you have mistaken it for control. that is fine for a while — a great deal gets done that way. but the card puts the absence of reins right in the middle of the picture, and the two beasts are yours, both of them. it is worth knowing which one you have been feeding.'),

    P('justice', 'VIII',
      'a frog seated square to you, scales in one hand, a sword upright in the other. she faces front. almost nobody in this deck faces front.',
      'the sword is up, not down. the weighing has been done.',
      'in the person: you are asking me whether it was fair. it was not, or it was, and either way the card is pointing at the part of it that was yours. this is the least comfortable trump in the deck for exactly one reason: it looks at you instead of past you, and everybody else in the pack has the decency to look away.'),

    P('the hermit', 'IX',
      'an old frog walking with a lamp, hooded, the lamp held out to the side and low — not up. it lights the ground in front of his own feet and nothing else.',
      'he is not searching for anything. he is going slowly with just enough light.',
      'in the person: you want the whole road lit and you are not going to get it. the lamp is the size it is. what he is actually doing is walking, which is the only part of this that is under your control. and the hood: he is not lonely, he is undisturbed, and those look identical from outside.'),

    P('wheel of fortune', 'X',
      'a wheel with a crank on it, three animals on the rim: one climbing, one at the top wearing a crown, one going down head first. no hand on the crank.',
      'nobody is turning it. that is the card.',
      'in the person: you are trying to work out what you did to deserve this, and for this one the answer is nothing, and that is worse. the one at the top is not better than the one going down, it is earlier. what the wheel asks of a person is the only thing it can ask: what you are like at each of the three positions, because you will hold all three.'),

    P('strength', 'XI',
      'a frog holding a lion\'s jaws — closing them, not opening them — and she is doing it with her bare hands and no visible effort. her hat is the juggler\'s hat.',
      'it is the same hat because it is the same power, older, and with the hands changed.',
      'in the person: the thing you are frightened of in yourself is not going anywhere, and killing it was never offered. the card shows a woman with her hands in the mouth of the animal, calm, and the calm is not bravery, it is familiarity. you have done this before. do it again.'),

    P('the hanged man', 'XII',
      'a frog suspended by one foot from a beam, the other leg crossed behind, hands behind the back, and the face is not in pain. the hair hangs down. small coins are falling out of the pockets, or they are not, depending on the printing.',
      'he is upside down and he is fine. that is the whole information.',
      'in the person: you are stuck and you have decided that stuck is the same as wasted. it is not. this is the only card in the deck that shows somebody doing nothing on purpose, and the crossed leg says he arranged it. something is turning over. let it. the coins were never the point and you will be relieved when they have finished falling out.'),

    P('death', 'XIII',
      'a skeleton frog with a scythe, working. heads and hands and feet in the ground round it, some of them crowned. the scythe is mid-swing. and the card has no name printed on it.',
      'the unnamed card, which the old printers did on purpose, and the only one in the deck that is actually working while you look at it.',
      'in the person: nobody dies. something ends and you have been holding the door for it. the crowned head on the ground is the part you were proudest of, and that is why it is drawn crowned. the scythe clears a field. a field is not a grave. if you came in hoping i would tell you this card was about something else — it is not, and you are already relieved.'),

    P('temperance', 'XIV',
      'a winged frog pouring from one vessel into another, standing up, and the two vessels are level with each other. nothing is spilling. nothing is being measured.',
      'this comes directly after the skeleton, which is not an accident. after something ends, somebody has to move what is left from one container to another.',
      'in the person: you want a rule for how much. there is no rule, there is only the pouring, and you have to stand there while it happens. the wings mean it is not hard work. it is just slow, and slow is the part you keep trying to skip.'),

    P('the devil', 'XV',
      'a horned frog standing on a block with two smaller figures chained at its foot, and the chains are loose. the collars are wide. they could step out.',
      'look at the chains before you look at the face. everybody looks at the face.',
      'in the person: you are getting something out of it. that is the part nobody says out loud, and until it is said the arrangement cannot move. this card is not evil and it is not a warning, it is an inventory: what does the thing you complain about pay you. answer honestly and the collar is already off.'),

    P('the house of god', 'XVI',
      'a tower with its crown coming off, struck, and two frogs falling out head first. the falling ones are drawn with their eyes open.',
      'it is called the house of god and it is the one card people are frightened of by name.',
      'in the person: the thing you built to keep the weather out was also keeping you in. it came down at once, without notice, and there was nothing to be done — and the card draws the falling figures wide awake, which is the kindest thing in it. you are going to see this clearly while it happens. that is not a mercy at the time. it is later.'),

    P('the star', 'XVII',
      'a frog kneeling by water, pouring from two jugs, one into the river and one onto the ground. stars over her, a bird in the tree. she has nothing on and she is not hiding.',
      'after the tower, someone unclothed and calm by the water. the order matters.',
      'in the person: something has been taken off you and you have not needed to replace it yet. it is not hope — hope is a word for wanting, and nobody in this picture is wanting anything. it is being seen without having arranged yourself first. take the rest of the evening with it, anon. it does not last long and it is not supposed to.'),

    P('the moon', 'XVIII',
      'two dogs baying at a moon with a face, a pool below, a crab in the pool, and two towers at the back. everything in this card is either reflected, doubled or underwater.',
      'the moon has a face and the face is looking sideways. nothing here is looking at you.',
      'in the person: you cannot tell at the moment which of the things you feel are yours. that is the honest reading and it is a bad night for decisions. the crab climbs out of the pool every time somebody draws this card; nobody knows whether it gets anywhere. what the card asks is that you stop trying to see in this light and wait for a different one.'),

    P('the sun', 'XIX',
      'two frogs under a sun with a face, standing close, one with a hand on the other\'s shoulder, a low wall behind them. the sun drops what look like coins.',
      'the plainest card in the deck. two of them, out of doors, in the light, with a wall at their backs.',
      'in the person: something is uncomplicated and you are suspicious of it. this is the card people argue with hardest, because it does not come with a lesson attached. there is no work to do here. the wall behind them is low and there is somebody next to you. that is the reading, and if it seems thin it is because we are all very trained to distrust it.'),

    P('judgement', 'XX',
      'an angel with a horn over three frogs — two standing with their backs to us, one rising up out of the ground between them.',
      'the one coming up is drawn from behind as well. you do not get a face in this card. you get a summons.',
      'in the person: something is calling you by a name you had stopped using. the card is old and it is about the dead getting up, and in a small room across a table it is about the part of you that you decided was finished. it is not finished, it has been called, and the two standing either side are people who will have to watch you change.'),

    P('the world', 'XXI',
      'a figure inside a wreath, one leg crossed behind the other, and at the four corners an eagle, a bull, a lion and a man.',
      'the crossed leg is the hanged man\'s leg, the right way up. the last card in the sequence is the twelfth card turned over.',
      'in the person: you have finished something. not everything — the fool has no number and he is still walking around outside the wreath, waiting to be dealt somewhere else. this is one whole thing, closed, with the four corners holding it. let it be that. the deck starts again at zero and so, shortly, will you.'),

    // ---- the suits -------------------------------------------------------------------------------
    P('cups', null,
      'fourteen cards, and what they hold is water, which is to say nothing you can grip.',
      'cups are what passes between people and what pools inside one. the ace is a cup nobody is holding yet. the middle of the suit is the part everybody would rather skip: the five with three of the cups over and two standing, the eight where somebody walks away from a set that is nearly complete.',
      'at the table, a run of cups means the question was never about the job. it never is. what to watch for in the court cards is which of them is looking INTO the cup and which is looking over the top of it at somebody else.'),

    P('pentacles', null,
      'fourteen cards of coins, and they are the flattest and most honest suit in the deck.',
      'money, yes, but only because money is the thing people will talk about when they cannot talk about the rest. pentacles are what is countable: what you have, what you make, what is owed, what a day\'s work is worth. the suit is drawn as discs because a disc has two faces and you only ever see one.',
      'a run of them is rarely about wealth. it is about whether the thing you are doing every day adds up to anything you would recognise if you saw it written down. that is a spiritual question and it arrives in a suit of coins because that is how it arrives in life.'),

    P('swords', null,
      'fourteen cards of blades, and this is the suit people flinch at and the one i trust most.',
      'swords are thought. they cut both ways and they are the only tool in the deck that is sharp on the side facing the person holding it. the suit runs cleanly from a single blade held up to a figure lying under ten of them, and the argument of the whole run is that a mind will keep going long after the situation has stopped.',
      'when a table fills with swords, the person in front of me has usually been thinking about one thing for a very long time, alone, at night. the cards are not the disaster. the thinking is not the disaster either. the loneliness of it is what i read.'),

    P('wands', null,
      'fourteen cards of batons, cut green, with the leaves still on them.',
      'the leaves are the whole suit. a wand is a piece of living wood, so this is work that is still growing while you do it: making, starting, building, quarrelling, wanting. it is the loudest suit and the least subtle, and after an evening of cups it is a relief.',
      'wands ask one thing: is the thing in your hands alive or has it gone dry. a dry stick is still a stick and you can still hit somebody with it. that is the difference between the ace and the five, and it is worth knowing which one you have been carrying about.'),

    P('the last page', null,
      'that is the book. it is shorter than the ones next to it on this shelf because most of what is in those is a list, and a list is the thing that stands between a person and a picture.',
      'if you take one thing away: look at the card before you look it up. what is the figure looking at, what does it hold, what has it turned from. you will get it wrong sometimes. so do i, and the ones i get wrong are the ones i remember, which is the only reason i am any good at this.',
      'and put it back on the shelf when you are done, anon. the bay is at chest height, second from the left, next to the bottle.'),
  ],
};

// ---- THE THREE OTHER SPINES THAT OPEN ------------------------------------------------------------
// Chosen from the titles the case already carries (props-objects.js deals them out of TITLES; these
// three are all standing in the two bays the `case` shot holds, at 0.52 and 0.97 m). One page each,
// in the same hand, and each one is a book HE would have on that shelf: what it is, and what he
// thinks of it. Nothing here is a second essay about tarot.
export const OTHERS = {
  MARSEILLE: {
    name: 'MARSEILLE',
    pages: [
      P('marseille', null,
        'the town, not the deck. a port, and the cards took its name the way cards take a name — because that was where enough of them were printed that people stopped asking.',
        'nicolas conver cut a set of blocks there in seventeen sixty and every deck i have ever worked from is a descendant of those blocks, including the one on the table downstairs, including the frogs. the lines are thick because they were cut into wood by a hand, and they are in the wrong places because the block was re-cut by people copying a worn print of a copy. a great deal of what the card means now is an accident that somebody kept.',
        'this is not a mystical fact, it is a printing fact, and it is the one i would want if i were you. the deck is not a revelation. it is a photocopy that has been photocopied for three hundred years, and it still works, which tells you something about where the meaning actually lives.'),
    ],
  },
  'LE DESTIN': {
    name: 'LE DESTIN',
    pages: [
      P('le destin', null,
        'somebody gave me this and i have kept it on the shelf for the title, which is the only thing in it i believe.',
        'it is four hundred pages on fate written by a man who plainly thought the word meant a schedule. every chapter is a way of saying that the thing which is going to happen is already on its way, and the only question left is whether you find out early.',
        'the trouble with a schedule is that nobody in this room has ever asked me for one. they ask what is going on. those are different questions and only one of them has an answer you can do anything with.',
        'as nietzsche put it, one must still have chaos in oneself to give birth to a dancing star. he was not being encouraging. he meant that the tidy version of your life is the one where nothing happens.'),
    ],
  },
  CHIROMANCIE: {
    name: 'CHIROMANCIE',
    pages: [
      P('chiromancie', null,
        'palms. hands, read as maps. i am not going to be rude about it, because it is the same trade as mine done with a different object.',
        'the argument against it is the argument people make against the cards and it is the same argument: the lines were there before you sat down, so nothing about tonight could have changed them. that is true. it is also true of a card that was printed in seventeen sixty.',
        'what a palm has that a card has not is that it is attached to the person, so they cannot look at it and then look away. what a card has that a palm has not is that it was shuffled — by them, tonight, for a reason they have not said out loud. i will take the shuffle.',
        'i have read one hand in my life and it belonged to somebody who wanted very badly not to be looked in the face. that is the whole of what i learnt from this book and it took about four seconds.'),
    ],
  },
};

// every book the case opens, by the title cut on its spine
export const BOOKS = {
  TAROT: TAROT_BY_PEPE,
  ...OTHERS,
};
