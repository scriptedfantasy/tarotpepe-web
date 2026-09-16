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
// THE SHAPE OF IT. Eighty-seven ENTRIES, and each of them starts on a leaf of its own:
//   1   the title page
//   1   the contents, which is a list and is set by walk-book.js off its own pagination
//   2   what the cards are (two entries)
//   22  the trumps, one to an entry, in the order of the deck (src/core/deck.js MAJORS)
//   4   the four suits: what the suit is, one entry each
//   56  the fifty-six minors — ace to ten and page, knight, queen, king, in the deck's own order
//   1   the last page
// The user, this round: "the tarot pepe book actually needs an index page — so the user can jump
// straight where they want, and also jump back to the index page — we also need every single card
// explained, even in the 4 suits." So every one of the seventy-eight cards now has its own entry
// with its own plate, and the four suit pages are the openers to fourteen cards each rather than a
// summary standing in for them.
//
// An entry is not always one LEAF, because a leaf is however much paper the window has. walk-book.js
// sets one cap for the whole book and spills an entry that will not fit onto the leaf after it,
// which is what a book does; tools/_book-proof.mjs turns every leaf and counts them.
//
// A page is { head, num, lines }. `head` is the running head, `num` its numeral where it has one,
// and `lines` are paragraphs — the renderer wraps them to the measure it has and sets the leading.
// `kind: 'title'` is the one page set differently: centred, with no running head. `kind: 'index'` is
// not written here at all: it is a slot, and walk-book.js letters the list into it from the leaf
// numbers its own walk produced, because a folio depends on the window and nothing about it could
// honestly be typed into this file.

const P = (head, num, ...lines) => ({ head, num, lines });
// …and an entry WITH A CARD ON IT. `slug` is the deck's own name for the plate (src/core/deck.js),
// which is also the file on disk: public/cards/<slug>.webp, 1024 x 1792, the same sheet the deck
// lays out on the cloth and the same one the ? card's third face puts up (help-cards.js). The book
// does not redraw a card and never will — there is one drawing of each of the seventy-eight in this
// film and this is it.
const C = (head, num, slug, ...lines) => ({ head, num, slug, lines });
// …and a card of a SUIT, which is the same entry with no numeral on it and a mark that puts it
// under its suit in the contents rather than level with it. The slug is built the way the deck
// builds it (src/core/deck.js: `<rank>-of-<suit>`, lowercased), so a name that is not a card in the
// deck is a file that is not on disk and the proof says so on the first turn of the page.
const M = (head, slug, ...lines) => ({ head, num: null, slug, minor: true, lines });

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

    // THE CONTENTS, and there is nothing in it here. walk-book.js lays as many leaves of list as the
    // lines need and letters them off the folios its own walk produced: every entry after this one,
    // in the order it is printed, with the page it starts on. Turning a line's page is clicking it.
    { kind: 'index', head: 'what is in it', num: null, lines: [] },

    P('what the cards are', null,
      'anon. you have taken a book off a shelf in a room above a post office, so let me save you the first forty pages.',
      'the deck is the marseille. it was cut on wood in the south of france by people who could not read, for people who could not read, which is why everything that matters in it is in the picture and not in the words. seventy-eight cards. twenty-two trumps and four suits of fourteen. every figure on every card is a frog, because that is the deck i learnt on and i have never seen a reason to draw them otherwise.',
      'i learnt to read from jodorowsky. what he gave me was not a set of meanings. it was an order of operations: look at the picture first. what is the figure looking at. what is it holding, and in which hand. which way is it facing. what has it turned its back on. what is it standing on. only then, and only if you have done the looking honestly, what is that in the person across the table.',
      'do that and you will be right more often than the people who memorised a list. do the list first and you will spend the evening arguing with the card.'),

    // the second opening page carries its own running head rather than a second 'what the cards
    // are': two lines reading the same in a contents is a printer's mistake, and this is what the
    // page is actually about
    P('a card is a mirror', null,
      'a card is a mirror held up. it is not a message and it is nobody telling you anything. the deck was shuffled by a person who wanted an answer and cut by a person who wanted an answer, and what comes up is a picture that the two of you now have to look at together. the work is what you see in it. that is not a trick and it is not a small thing — most people go years without anybody holding anything up at all.',
      'so: no fortunes here. i do not tell people what will happen, because i do not know what will happen and neither does a piece of card. anyone who says otherwise is selling you the one thing you cannot buy. what a reading does is put the thing you came in with next to the thing that is actually going on, and those are almost never the same thing. what someone says they came in for is the surface of it.',
      'nothing in this deck is reversed. the marseille does not do it, i do not do it, and a card upside down on my cloth is a card i have laid badly.',
      'what follows is the twenty-two, one to a page, and then the four suits with their fourteen each, which is all seventy-eight of them and took me rather longer than i expected. the card is printed on the left and what i have to say about it on the right: what is in the picture, and what that is in a person. the list at the front will take you straight to any of them, and the corner of every page is turned down to bring you back to it.',
      'if you find yourself reaching for this book in the middle of a reading, put it down and look at the card.'),

    // ---- the trumps, in the deck's own order ----------------------------------------------------
    C('the fool', '0', 'the-fool',
      'a frog walking, with everything it owns over one shoulder in a bundle, and a small animal at its heel with its claws in the back of its leg. it is not looking where it is going. it is not looking anywhere in particular.',
      'he is the only one in the deck with no number, which means he is not in the sequence and he is not going to be. he can stand anywhere. he does not know what the other twenty-one know and that is exactly what he is for.',
      'in the person in front of me: something in you is already leaving and has not told the rest of you. the animal at the heel is not a warning, it is the thing at home that will be hurt. you can go anyway. most people who get this card have already gone and are looking for permission they do not need.'),

    C('the juggler', 'I', 'the-juggler',
      'a young frog behind a small table, everything laid out on it — a cup, a coin, a blade, a stick — one hand up and one hand down. the table has three legs you can see and one you cannot.',
      'the whole deck is on that table and none of it is committed. he is at the start of everything and good at all of it, which is a very particular kind of trouble.',
      'in the person: you have the materials. you have had the materials for some time. the card is not asking whether you are capable, it has already granted that, and it is the granting that makes it uncomfortable. ask instead what the fourth leg of your table is standing on.'),

    C('the popess', 'II', 'the-popess',
      'a seated frog with a book half open on her lap and a veil behind her. the book is open but she is not reading it, and she is not showing it to you either.',
      'she is the first one in the deck who knows something and is not saying. patience drawn as a person.',
      'in the person: you already know. you have known for a while and you have been very busy not putting it into words, because the moment it is in words you will have to do something. she is not telling you to speak. she is telling you that the not-speaking is a decision and that you are the one making it.'),

    C('the empress', 'III', 'the-empress',
      'a frog seated with a shield and a sceptre, wings at the back of the chair, and she is turned slightly towards you rather than square on. the shield rests, it is not raised.',
      'she is what happens when something is allowed to grow. not effort — conditions.',
      'in the person: there is something of yours that would come along fine if you stopped working on it and started feeding it. the difference between the two is the whole card. also: she is comfortable, and comfort in this deck is never an accusation.'),

    C('the emperor', 'IV', 'the-emperor',
      'a frog in profile, one leg crossed over the other, sitting on very little and holding a sceptre. he is side-on. you get half of him.',
      'structure, and the price of it. the crossed leg is the thing everybody misses: he is not braced, he is settled, and a man in profile is a man showing you one side on purpose.',
      'in the person: you have built something and now you have to hold it, and holding it is a different job from building it, and nobody warned you. or the reverse — someone is holding a shape around you that you have outgrown. the card does not say which. the crossed leg does: look at how much of your weight is on the thing.'),

    C('the pope', 'V', 'the-pope',
      'a frog with a hand raised over two smaller frogs whose backs are to us. we see their shoulders. we do not see their faces.',
      'transmission. someone is being told how it is done, and the card is drawn from behind the ones being told, which is the whole editorial position.',
      'in the person: you are taking somebody else\'s word for something. that is not a fault — nobody works anything out from first principles, we would all still be rubbing sticks — but the two below him have their backs to us because we cannot see what they look like while they agree. is it a teacher or is it a habit with a robe on.'),

    C('the lovers', 'VI', 'the-lovers',
      'three figures standing, and a fourth above with a bow. the young frog in the middle is not looking at either of the two beside him. he is looking off, past them.',
      'this card is not about romance and it never was. it is a choice, drawn at the exact moment before it is made.',
      'in the person: you have two things and you are pretending you have to keep both. you do not. and the thing that looks like a decision about somebody else is a decision about which of two lives you are going to have. the arrow above is already loosed. the card is only telling you the room you are standing in is small.'),

    C('the chariot', 'VII', 'the-chariot',
      'a frog standing in a small carriage under a canopy, two animals harnessed in front, one looking left and one looking right. he holds no reins. there are no reins in the picture.',
      'he is going somewhere and the two things pulling him do not agree. and he is winning anyway, which is the joke.',
      'in the person: momentum is carrying you and you have mistaken it for control. that is fine for a while — a great deal gets done that way. but the card puts the absence of reins right in the middle of the picture, and the two beasts are yours, both of them. it is worth knowing which one you have been feeding.'),

    C('justice', 'VIII', 'justice',
      'a frog seated square to you, scales in one hand, a sword upright in the other. she faces front. almost nobody in this deck faces front.',
      'the sword is up, not down. the weighing has been done.',
      'in the person: you are asking me whether it was fair. it was not, or it was, and either way the card is pointing at the part of it that was yours. this is the least comfortable trump in the deck for exactly one reason: it looks at you instead of past you, and everybody else in the pack has the decency to look away.'),

    C('the hermit', 'IX', 'the-hermit',
      'an old frog walking with a lamp, hooded, the lamp held out to the side and low — not up. it lights the ground in front of his own feet and nothing else.',
      'he is not searching for anything. he is going slowly with just enough light.',
      'in the person: you want the whole road lit and you are not going to get it. the lamp is the size it is. what he is actually doing is walking, which is the only part of this that is under your control. and the hood: he is not lonely, he is undisturbed, and those look identical from outside.'),

    C('wheel of fortune', 'X', 'wheel-of-fortune',
      'a wheel with a crank on it, three animals on the rim: one climbing, one at the top wearing a crown, one going down head first. no hand on the crank.',
      'nobody is turning it. that is the card.',
      'in the person: you are trying to work out what you did to deserve this, and for this one the answer is nothing, and that is worse. the one at the top is not better than the one going down, it is earlier. what the wheel asks of a person is the only thing it can ask: what you are like at each of the three positions, because you will hold all three.'),

    C('strength', 'XI', 'strength',
      'a frog holding a lion\'s jaws — closing them, not opening them — and she is doing it with her bare hands and no visible effort. her hat is the juggler\'s hat.',
      'it is the same hat because it is the same power, older, and with the hands changed.',
      'in the person: the thing you are frightened of in yourself is not going anywhere, and killing it was never offered. the card shows a woman with her hands in the mouth of the animal, calm, and the calm is not bravery, it is familiarity. you have done this before. do it again.'),

    C('the hanged man', 'XII', 'the-hanged-man',
      'a frog suspended by one foot from a beam, the other leg crossed behind, hands behind the back, and the face is not in pain. the hair hangs down. small coins are falling out of the pockets, or they are not, depending on the printing.',
      'he is upside down and he is fine. that is the whole information.',
      'in the person: you are stuck and you have decided that stuck is the same as wasted. it is not. this is the only card in the deck that shows somebody doing nothing on purpose, and the crossed leg says he arranged it. something is turning over. let it. the coins were never the point and you will be relieved when they have finished falling out.'),

    C('death', 'XIII', 'death',
      'a skeleton frog with a scythe, working. heads and hands and feet in the ground round it, some of them crowned. the scythe is mid-swing. and the card has no name printed on it.',
      'the unnamed card, which the old printers did on purpose, and the only one in the deck that is actually working while you look at it.',
      'in the person: nobody dies. something ends and you have been holding the door for it. the crowned head on the ground is the part you were proudest of, and that is why it is drawn crowned. the scythe clears a field. a field is not a grave. if you came in hoping i would tell you this card was about something else — it is not, and you are already relieved.'),

    C('temperance', 'XIV', 'temperance',
      'a winged frog pouring from one vessel into another, standing up, and the two vessels are level with each other. nothing is spilling. nothing is being measured.',
      'this comes directly after the skeleton, which is not an accident. after something ends, somebody has to move what is left from one container to another.',
      'in the person: you want a rule for how much. there is no rule, there is only the pouring, and you have to stand there while it happens. the wings mean it is not hard work. it is just slow, and slow is the part you keep trying to skip.'),

    C('the devil', 'XV', 'the-devil',
      'a horned frog standing on a block with two smaller figures chained at its foot, and the chains are loose. the collars are wide. they could step out.',
      'look at the chains before you look at the face. everybody looks at the face.',
      'in the person: you are getting something out of it. that is the part nobody says out loud, and until it is said the arrangement cannot move. this card is not evil and it is not a warning, it is an inventory: what does the thing you complain about pay you. answer honestly and the collar is already off.'),

    C('the house of god', 'XVI', 'the-house-of-god',
      'a tower with its crown coming off, struck, and two frogs falling out head first. the falling ones are drawn with their eyes open.',
      'it is called the house of god and it is the one card people are frightened of by name.',
      'in the person: the thing you built to keep the weather out was also keeping you in. it came down at once, without notice, and there was nothing to be done — and the card draws the falling figures wide awake, which is the kindest thing in it. you are going to see this clearly while it happens. that is not a mercy at the time. it is later.'),

    C('the star', 'XVII', 'the-star',
      'a frog kneeling by water, pouring from two jugs, one into the river and one onto the ground. stars over her, a bird in the tree. she has nothing on and she is not hiding.',
      'after the tower, someone unclothed and calm by the water. the order matters.',
      'in the person: something has been taken off you and you have not needed to replace it yet. it is not hope — hope is a word for wanting, and nobody in this picture is wanting anything. it is being seen without having arranged yourself first. take the rest of the evening with it, anon. it does not last long and it is not supposed to.'),

    C('the moon', 'XVIII', 'the-moon',
      'two dogs baying at a moon with a face, a pool below, a crab in the pool, and two towers at the back. everything in this card is either reflected, doubled or underwater.',
      'the moon has a face and the face is looking sideways. nothing here is looking at you.',
      'in the person: you cannot tell at the moment which of the things you feel are yours. that is the honest reading and it is a bad night for decisions. the crab climbs out of the pool every time somebody draws this card; nobody knows whether it gets anywhere. what the card asks is that you stop trying to see in this light and wait for a different one.'),

    C('the sun', 'XIX', 'the-sun',
      'two frogs under a sun with a face, standing close, one with a hand on the other\'s shoulder, a low wall behind them. the sun drops what look like coins.',
      'the plainest card in the deck. two of them, out of doors, in the light, with a wall at their backs.',
      'in the person: something is uncomplicated and you are suspicious of it. this is the card people argue with hardest, because it does not come with a lesson attached. there is no work to do here. the wall behind them is low and there is somebody next to you. that is the reading, and if it seems thin it is because we are all very trained to distrust it.'),

    C('judgement', 'XX', 'judgement',
      'an angel with a horn over three frogs — two standing with their backs to us, one rising up out of the ground between them.',
      'the one coming up is drawn from behind as well. you do not get a face in this card. you get a summons.',
      'in the person: something is calling you by a name you had stopped using. the card is old and it is about the dead getting up, and in a small room across a table it is about the part of you that you decided was finished. it is not finished, it has been called, and the two standing either side are people who will have to watch you change.'),

    C('the world', 'XXI', 'the-world',
      'a figure inside a wreath, one leg crossed behind the other, and at the four corners an eagle, a bull, a lion and a man.',
      'the crossed leg is the hanged man\'s leg, the right way up. the last card in the sequence is the twelfth card turned over.',
      'in the person: you have finished something. not everything — the fool has no number and he is still walking around outside the wreath, waiting to be dealt somewhere else. this is one whole thing, closed, with the four corners holding it. let it be that. the deck starts again at zero and so, shortly, will you.'),

    // ---- the four suits, and every card in each of them --------------------------------------------
    // A SUIT PAGE IS NOW AN OPENING AND NOT A SUMMARY. It used to carry the ace's plate and stand in
    // for the whole fourteen; the ace has its own leaf now, so these four say what the suit IS — the
    // stuff it is made of, what the numbers do as they climb, and what the four court cards are for —
    // and the fourteen that follow do the work. The order inside a suit is the deck's own
    // (src/core/deck.js RANKS): ace to ten, then page, knight, queen, king.
    P('cups', null,
      'fourteen cards, and what they hold is water, which is to say nothing you can grip.',
      'cups are what passes between people and what pools inside one. love, yes, but also grief, drink, memory, friendship and everything you have felt about somebody and not said. the suit is drawn as vessels because the question is never the water, it is what you have put it in and whether the thing holds.',
      'the numbers climb the way feeling climbs: one cup you are already sitting in, two agreed, three celebrated, four gone stale, and then the long middle where it costs something. the four court cards are four ways of carrying water about — and what to watch is which of them is looking into the cup and which is looking over the top of it at somebody else.',
      'at the table, a run of cups means the question was never about the job. it never is.'),

    // the fourteen cups
    M('ace of cups', 'ace-of-cups',
      'one enormous engraved cup standing in a lake of lilies, and sitting in it, up to the mouth in the water, a frog looking straight out of the card. doves coming in from all four corners. nobody is holding the cup and there is no hand anywhere in the picture.',
      'every other ace is offered to you. this one you are already in.',
      'in the person: you are further into a feeling than you have admitted, and the admitting is the only part left to do. the card is not asking whether you want it. it has drawn you sat in it to the chin, with the birds coming down, looking out at me with an expression i see across this table about twice a year.'),

    M('two of cups', 'two-of-cups',
      'two frogs sitting facing each other over the water, one hooded in blue and one in white, touching their cups together. below them two snakes wound round each other, and a lotus open on the surface between the two. a sun with a face behind.',
      'two, in a suit of water, is the exact moment a thing becomes mutual — not before, not after.',
      'in the person: an agreement is being made and it is being made in a look rather than in words. this is not only romance; it is any two people deciding at the same instant that they are in the same thing. the two cups are level and the two snakes are the same size. that is the whole test, and you already know whether it passes.'),

    M('three of cups', 'three-of-cups',
      'three frogs each sitting in a great cup of their own, up to the arms in it, raising a smaller cup to the middle. one of them is pink. all three are laughing and none of them is looking at the others\' cups.',
      'three is where a thing stops being private. the pair told somebody, and now it is real in the world.',
      'in the person: you are being celebrated, or you are refusing to be. what the picture gets right is that each of them is in their own cup — this is not a merger, it is three separate lives touching glasses. you did not get here alone, and the card is not going to let you say you did.'),

    M('four of cups', 'four-of-cups',
      'a frog under a tree with its chin on its fist, four cups in a row on the ground in front of it, and a white hand reaching out of the branches with nothing in it. a sun with a face on one side of the sky, moons on the other. the frog is looking at none of it.',
      'four is a square, and a square is stable, and stable is exactly what has gone wrong here.',
      'in the person: you have enough and it has stopped tasting of anything. that is not ingratitude, it is saturation. look at the hand out of the tree: it is empty, because what is being offered has not been named yet, and you have decided in advance that it is nothing. the cups on the ground are all full.'),

    M('five of cups', 'five-of-cups',
      'a frog standing under a night sky between two cups on their sides pouring into the water at its feet and three still upright, one of them behind it. it is looking at neither. a bridge goes off to the left and there is a long arcaded building on the bank to the right.',
      'five is where a suit meets the world and loses something. the printer put the spill in the foreground and what is left in the corners, which is how loss is actually laid out.',
      'in the person: you are counting the two and not the three. i am not going to tell you the two do not matter — they went over and the water is in the ground. but there is a bridge in this card, drawn as plainly as the spill, and at some point tonight or next year you will turn round and notice what is still standing behind you.'),

    M('six of cups', 'six-of-cups',
      'two frogs in white robes handing a cup of flowers between them across five more standing on the grass, a garden full of pansies and roses round their feet, a sun with a face overhead and a tiny white town on the horizon between them.',
      'six is the suit at rest. after the five, somebody is kind to you, and the kindness in this picture is being passed from one hand to the other rather than given.',
      'in the person: you are drawing on something old — a childhood, a town, a person who was decent to you before you had anything to give back. that is a real supply and you are allowed it. the town on the horizon is very small and very far away, and both of them have their backs to it.'),

    M('seven of cups', 'seven-of-cups',
      'a frog crouched in cloud with seven cups round it in the air: a light with an eye in it, a tower with a lit window, a snake, a heap of jewels, a crowd of small figures, a face. above them all a hooded white figure with nothing inside the hood, arms out. the frog has its hands together and has taken none of them.',
      'seven is the number where a suit goes to the head. not one of these cups is standing on anything.',
      'in the person: you have too many futures and you are enjoying them more than you would enjoy any one of them. that is a pleasant condition and it eats years. the empty hood is the honest part of the picture: what is running the display has no face, because it is not a future, it is the pleasure of not choosing.'),

    M('eight of cups', 'eight-of-cups',
      'a cloaked frog walking out of the card with a stick and one cup in its hand, and eight more left standing stacked on the rock behind it. a huge moon over the mountains. its face is turned back over its shoulder, and it is going anyway.',
      'eight is a suit that has been counted and found to be one short. nothing here is broken. that is the difficult part.',
      'in the person: you are leaving something that works. nobody wronged you, every cup is upright, and you are going because you have found out it is not the thing. note what it takes: one. you do not get to leave with the set and you do not get to leave with nothing.'),

    M('nine of cups', 'nine-of-cups',
      'a frog sat at a long table with nine cups standing on it in two rows, both hands flat on the boards, a carved arch behind him. everything he owns is laid out where he can see it and where you can see it.',
      'nine is a suit satisfied, and a table is a place you put things for other people to look at.',
      'in the person: you got what you wanted. take the evening — i mean that, there is no trick in this card. it is only worth knowing that the cups have been set out in rows, that his hands are on the table rather than on a cup, and that a man alone does not arrange anything.'),

    M('ten of cups', 'ten-of-cups',
      'a rainbow going up out of the ground as a road, a frog standing on it in a white robe holding a cup, five more cups arched overhead, five more frogs in white standing along the path, a sun with a face, and a small house down at the left edge.',
      'ten is the suit finished. half the cups are in the sky and out of everybody\'s reach, which the old printers did on purpose.',
      'in the person: this is the picture you have of the life you are supposed to end up with, and it is a good picture and not a fraud. but the road is a rainbow, the cups overhead cannot be taken down, and the actual house is the small one at the edge with nobody standing in it. either go and live in that or stop measuring your tuesdays against the sky.'),

    M('page of cups', 'page-of-cups',
      'a young frog in a painted coat holding a cup up at eye level with something small and alive standing in it, splashing. at his elbow, watching the cup, a plain pale frog with its mouth open. the moon full behind them both.',
      'the page is the suit as a beginner, and a beginner in water is somebody who has not learnt yet to hide what he feels.',
      'in the person: something surprising has come up out of you and your first instinct is to be embarrassed. do not be. the page is the only figure in this deck who would show you what was in his drink rather than quietly put it down, and the plain frog beside him — the part of you with no coat on — is the one actually looking.'),

    M('knight of cups', 'knight-of-cups',
      'a frog in full armour on a white horse at a walk, the cup held up beside his head, a great engraved disc in the sky behind him. the horse is on level ground and going nowhere in particular.',
      'the knight is the suit in motion, and water in motion is charm on its way somewhere.',
      'in the person: somebody is making an offer beautifully — possibly you. the card does not say the offer is false. it says the man is in armour, the cup is held up where it can be seen, and the horse has not broken out of a walk in either direction. a feeling carried towards you is not yet a feeling arrived.'),

    M('queen of cups', 'queen-of-cups',
      'a crowned frog on a stone throne set at the tide line, holding an open cup up and away from her, looking out past it. the surf breaking over the step, and down in the water at her feet several small round-eyed heads and empty vessels floating.',
      'the queen is the suit understood from the inside. she holds the cup at arm\'s length because she knows exactly what is in it.',
      'in the person: you feel what other people feel, accurately, before they say it, and you have been treating that as a service you owe. look where she has put her chair: at the line, not in the water. and look at what is floating round it — every one of those is somebody who came to her. she is still dry. that is not coldness, it is the only way the work is survivable.'),

    M('king of cups', 'king-of-cups',
      'a frog on a great stone throne standing in the open sea, robed in red and blue, the cup held up in one hand, a bird on the gable behind him and two creatures rolling in the swell at the corners. his feet are on the plinth and the plinth is in deep water.',
      'the king is the suit governed. not dry — governed. a throne out there is a very odd thing to have built and he built it.',
      'in the person: you are the one who stays level while other people come apart, and you have begun to think that is your character rather than a thing you do at some cost. the sea in this picture is not calm. he is calm. the card is careful to draw both, and it puts nothing at all between him and the water except stone he carried out there himself.'),

    P('pentacles', null,
      'fourteen cards of coins, and they are the flattest and most honest suit in the deck.',
      'money, yes, but only because money is the thing people will talk about when they cannot talk about the rest. pentacles are what is countable: what you have, what you make, what is owed, what a day\'s work is worth, what your body is doing while you think about something else. the suit is drawn as discs because a disc has two faces and you only ever see one.',
      'the numbers are a trade being learnt: one coin given, two juggled, three shown to somebody who can judge it, and on up to ten, which is a family and a wall and a lot of arithmetic. the court cards are four different relationships to having.',
      'a run of them is rarely about wealth. it is about whether the thing you do every day adds up to anything you would recognise written down. that is a spiritual question and it arrives in a suit of coins because that is how it arrives in life.'),

    // the fourteen pentacles
    M('ace of pentacles', 'ace-of-pentacles',
      'a hand out of a cloud holding one great coin over a green valley with a river down the middle of it, cypresses, flowers, and a frog sitting on the ground with one arm up towards the coin. it is a good way above his fingers.',
      'the ace is the suit before anything has been done with it: one thing of value, held out, in a country that is already fertile without it.',
      'in the person: something real is on offer — money, a place, an afternoon, a body that works. what the picture is honest about is the gap: the hand is high, he is sitting down, and he has put an arm up rather than stood. everything in that valley grows whether he reaches or not. it is the coin that has to be taken.'),

    M('two of pentacles', 'two-of-pentacles',
      'a frog in white robes standing out on a running sea with a coin held up in each hand and a disc turning between them in the sky. a ship at either edge of the card, both of them small and both of them a long way off.',
      'two, in a suit of weight, is the first moment you have more than one thing to hold.',
      'in the person: you are managing, and you are good at it, and the being good at it is the problem. look at what he is standing on. the sea is doing exactly what the coins are doing and he has not once looked down. juggling is not a life, it is a way of not choosing, and it works right up until one of those ships arrives.'),

    M('three of pentacles', 'three-of-pentacles',
      'three frogs in a vaulted stone hall round a bench: one with a scroll, one with a drawing, and one in the middle with a tool in his hand, talking with his other hand open. three coins carved into the panel of the bench under the work.',
      'three is where the private thing is shown to people who can tell whether it is any good.',
      'in the person: you have done enough alone and the next part needs somebody who will say the wall is out of true. this is the least romantic card in the deck and the most useful. note the building they are standing in: it is not finished, and it will still be here when all three of them are gone.'),

    M('four of pentacles', 'four-of-pentacles',
      'a frog on a carved chair with a coin gripped against his chest in both hands, a big coin standing on the ground either side of him, more scattered at his feet, a moon with a face on one side and a tower on the other. he is barefoot and he is not moving.',
      'four is a square, and this one has been built out of the suit itself. everything he owns is being used to hold him in place.',
      'in the person: you are holding on, it is working, and you cannot move. this is not greed — it is the exact moment security stopped being a means to anything. ask what would have to happen for you to put the one at your chest down. if there is no answer at all, that is the reading, and the moon in the picture has a face on it because something is watching you do this.'),

    M('five of pentacles', 'five-of-pentacles',
      'two frogs in hooded cloaks out in deep snow at night, one with a stick, standing facing each other. a cottage at the right with all its windows lit. and not one coin anywhere in the picture — every one of the five is out in the border, outside the scene.',
      'five is the suit out in the weather. the printer put the money in the frame and left the two of them in the cold, which is the most accurate thing in the card.',
      'in the person: you are going through it and you have stopped asking, and the not-asking has become the point. the house is warm and it is four steps away. what the picture gives you that most people miss is the other figure: you are not out there alone, you are out there with somebody, and neither of you has said anything yet.'),

    M('six of pentacles', 'six-of-pentacles',
      'a robed frog standing with a pair of scales held out level in one hand, two smaller frogs crouched on the ground either side with a coin each, and coins scattered all over the floor between them.',
      'six is balance restored, and the printer drew who is standing and who is on the floor.',
      'in the person: there is an exchange in your life with a giver and a receiver in it, and you know perfectly well which one you are. the scales say it is measured. measured is not the same as equal. if you are the standing one, work out what you are buying. if you are the crouching one, work out what the arrangement costs on top of the coin.'),

    M('seven of pentacles', 'seven-of-pentacles',
      'a frog in working clothes sat on a bench with his chin on his fist and a hoe across his knee, looking at a young tree with coins hanging in it like fruit. a ploughed field behind, one coin fallen in the dirt by his rake.',
      'seven is the number where the suit waits. nothing in this picture is happening and everything in it is growing.',
      'in the person: you put the work in and you want to know now whether it comes to anything. it is too early, and you know it is too early, which is why you are sitting down instead of digging. the only real question in the card is whether this is assessment or nerve going. the crop does not care which and will take the same number of weeks either way.'),

    M('eight of pentacles', 'eight-of-pentacles',
      'a frog at a plank bench with a graver in one hand, working the face of a coin, seven more lying finished on the boards in front of him. a lamp at his elbow. his whole head is down over the work.',
      'eight is the suit as craft: the same act, done again, and got better at.',
      'in the person: this is the card of the thing you are doing well and quietly, and it carries the only advice in the deck that is simply do more of that. the seven on the table are not the point — he is not looking at them, and neither should you. the one under the tool is the point.'),

    M('nine of pentacles', 'nine-of-pentacles',
      'a frog in a heavy embroidered coat standing alone in the middle of a vineyard in full leaf, rows of vines going away to the horizon, the sun coming up behind. on a post at her elbow, one small tethered thing you have to look twice to see.',
      'nine is the suit enjoyed by the person who grew it. she is by herself and it is not a sad card.',
      'in the person: you built something that supports you and you can stand in the middle of it without an audience. that is rarer than money. the tethered thing is the one sharp note in an otherwise generous picture: something wild of yours, kept, hooded and brought out when it is useful. you made that trade knowingly. every so often let it off the post.'),

    M('ten of pentacles', 'ten-of-pentacles',
      'a whole family of frogs in one frame — old ones at the back, a couple in the middle, small ones on the ground with the dogs, a pale face or two behind them that is not a frog at all — under a sun with a face. every one of the ten coins is out in the border. there is no money in the picture.',
      'ten is the suit at the end, and what it turns out to be is not a fortune. it is a household with three generations standing in it.',
      'in the person: the question has stopped being yours alone. what you decide now runs backwards to people who are finished and forwards to people who have not started. inheritance is never only money — the printer proved that by putting all the coins in the frame and filling the picture with relatives.'),

    M('page of pentacles', 'page-of-pentacles',
      'a young frog standing in the reeds at the edge of the water holding a tall staff with a single coin fixed at the top of it, like a standard. the sun straight behind his head. he has not moved and the water at his feet is flat.',
      'the page is the suit as a student, and this one has mounted the thing he is learning on a pole where he can keep looking at it.',
      'in the person: you are learning something practical, slowly, and you are not embarrassed about being a beginner. keep it up where you can see it. the ground he is standing on is marsh, which is what a beginning is actually made of, and the only figure in this suit who can afford to stand in it is the one carrying nothing but the idea.'),

    M('knight of pentacles', 'knight-of-pentacles',
      'a frog in armour on a white horse standing perfectly still in a field, reins gathered, both of them facing out of the card. a coin up in the sky and another on a post out in the grass. there is no coin in his hands.',
      'the knight is the suit moving, and this suit moves at the speed of a plough. he is the only knight in the deck whose horse has all four feet on the ground.',
      'in the person: you are doing it properly, it is taking forever, and everyone else appears to be going faster. they are not going anywhere. what is worth noticing is that he is not carrying the coin: it is out in the field, at the far edge, and he is riding towards it at a walk, which is the only honest picture of a long job anybody ever drew.'),

    M('queen of pentacles', 'queen-of-pentacles',
      'a frog on a stone throne set down at the edge of a ploughed field, holding a coin up in one hand and looking straight out of the card. briars and roses grown up the throne, flowers along the bottom, and a small creature sitting in the grass by her foot looking up at her.',
      'the queen is the suit as care. she is not counting the coin, she is holding it up the way you hold something you intend to hand over.',
      'in the person: you keep the practical facts of other people\'s lives in order — the food, the money, the appointment nobody else remembered — and nobody has asked lately who does it for you. the throne is out in the field rather than in a hall, and it has flowers growing over it, which is what happens to a chair somebody is always working beside instead of sitting in.'),

    M('king of pentacles', 'king-of-pentacles',
      'a crowned frog on a heavy stone throne holding a coin up between two fingers, a castle across the water behind him, stacks of coin standing on the ground either side of the chair and a bird going across the sky.',
      'the king is the suit owned outright. he is the only figure in the deck who looks as though he has stopped needing anything.',
      'in the person: you built it and it holds, and the danger is not losing it. the danger is the coin between the fingers — held up, at arm\'s length, the way a man looks at a thing he has seen ten thousand of. ask what you would be if the castle went. he has not asked himself in years and the stacks by the chair are the reason.'),

    P('swords', null,
      'fourteen cards of blades, and this is the suit people flinch at and the one i trust most.',
      'swords are thought. they cut both ways and they are the only tool in the deck that is sharp on the side facing the person holding it. the suit runs cleanly from a single blade held up to a figure lying under ten of them, and the argument of the whole run is that a mind will keep going long after the situation has stopped.',
      'the numbers are the shape of a thought as it takes hold: one clean, two stalled, three said out loud, and then the middle, which is where the mind starts doing it to itself without help. the court cards are four ways of being clever at somebody.',
      'when a table fills with swords, the person in front of me has usually been thinking about one thing for a very long time, alone, at night. the cards are not the disaster. the thinking is not the disaster either. the loneliness of it is what i read.'),

    // the fourteen swords
    M('ace of swords', 'ace-of-swords',
      'a frog\'s head in cloud with one great sword standing straight up through the picture in front of his face, a laurel sprig behind it, and his own green hand round the grip. nothing else at all: no ground, no country, no weather.',
      'the ace is the suit before it has been used on anybody. one clear idea, held up, and he is holding it himself.',
      'in the person: you have seen the thing plainly and the seeing was a relief. say it now, while it is still one sentence. everything that follows in this suit is what a mind does to clarity it cannot leave alone, and there is nothing under this card to stand on — that is not a threat, it is what a clean thought actually feels like.'),

    M('two of swords', 'two-of-swords',
      'a frog blindfolded with a strip of cloth, two swords crossed over its chest, sitting on a stone block at the water\'s edge with the moon coming up behind. the feet are bare and flat on the stone.',
      'two is a stall. the blades are equal, the arms are crossed, and the blindfold was tied on by somebody — but it is being kept on by the one wearing it.',
      'in the person: you are refusing to look at a choice you have already half made and calling the refusal fairness. i am not unkind about it; the water behind is dark and there was a reason to sit down. but nothing gets weighed with the eyes shut. you are not balancing, you are waiting for the thing to expire so that it will not have been your doing.'),

    M('three of swords', 'three-of-swords',
      'a heart filling the whole card with three swords driven through it, rain coming down in straight lines, a small moon behind the cloud — and the heart has a face on it. his face, looking out at you, not enjoying it.',
      'three is the thought said out loud. the printer gave the heart the face so that there is nobody else in the picture to blame.',
      'in the person: it hurt, it was clear, and it was probably true. that is the whole card and i am not going to dress it as a lesson. what is worth noticing is that the face is not screaming. it is the expression of somebody who has understood the sentence and cannot unhear it, and the rain in that picture does stop.'),

    M('four of swords', 'four-of-swords',
      'a frog lying flat along a stone slab in a vaulted crypt with its cheek on its hand, four swords standing point-down against the side of the tomb, one barred window with daylight in it high up at the back.',
      'four is rest, and in this suit rest has to be drawn in a crypt because the mind will not otherwise lie down.',
      'in the person: you are not finished, you are tired, and you have confused the two. every blade in the picture is out of his hands and stood against the stone, which is the instruction. this is the one card in the suit that asks nothing of you at all. take the week before your body picks the week for you.'),

    M('five of swords', 'five-of-swords',
      'a frog in armour with a sword up in one hand and another under his arm, smiling, and behind him two more: one turning away at the edge of the frame, one standing off in the field with his back half turned. two swords lie flat in the grass.',
      'five is the suit winning. the printer put the smile in the middle and the cost at the edges, which is exactly how it is arranged at the time.',
      'in the person: you won the argument. you were right, you said the sharp true thing, and the room went quiet. the card does not say you were wrong. it points at the two and asks what the rightness bought — and note that he has collected their swords as well as his own, which is the detail that tells you whether this was a disagreement or a hobby.'),

    M('six of swords', 'six-of-swords',
      'a frog sitting in a flat boat with six swords standing upright in the boards in front of it, working the oars itself. the water astern is broken and the water ahead is smooth. a small tower on the far shore.',
      'six is passage, and the swords come with you — nobody in this picture got to leave anything on the bank.',
      'in the person: you are getting out of it, and it is not a rescue. there is no ferryman in this card: you are rowing, with your back to where you are going, which is the only way anybody has ever done it. you will arrive with the same six things stuck in the floor of the boat. the water is flatter ahead. do not ask it to be a new life.'),

    M('seven of swords', 'seven-of-swords',
      'a frog in a long cloak going off into the dark with an armful of swords, hilts under his chin, looking back over his shoulder at a lit camp with a lamp burning outside the tents.',
      'seven is the suit gone sly. he is taking them and he is checking whether anybody is watching, which tells you exactly what he thinks of it.',
      'in the person: you are getting away with something — a small dishonesty, a plan you have not mentioned, an exit you are quietly preparing. this is not a scolding. it is the backward look: whatever you are doing, some part of you is keeping an eye on the camp, and that part is the one worth having a conversation with.'),

    M('eight of swords', 'eight-of-swords',
      'a frog bound round the arms and body with cloth, crouched in wet ground, eight swords standing in the mud around it in a loose ring. the moon out, the ground open in front — and it is not blindfolded. its eyes are wide open and looking up.',
      'eight is the suit as a cage, and the printer left the ring open on purpose.',
      'in the person: you are stuck in something you have stopped testing. the binding is real, i am not saying you imagined it. but this figure can see. the gap in front of it is in plain view, which means the reason you are still there is not that you cannot see the way out — it is that going through it makes the next part yours.'),

    M('nine of swords', 'nine-of-swords',
      'a frog sitting on the edge of a bed at night with a hand over its face, nine swords ranged along the wall behind it, a small sun with a face set in among them, a table beside the bed and the floorboards bare.',
      'nine is the suit at four in the morning. nothing in this card is happening. every sword is on the wall.',
      'in the person: this is the thinking you do at night and it is not information. the blades are behind you where you cannot see them, which is why they are that size. i am not going to tell you it is nothing — it is the worst hour in the deck. i am telling you that nothing decided in this card has ever been any good in daylight, and that there is a sun on that wall among the swords.'),

    M('ten of swords', 'ten-of-swords',
      'a frog lying face down over a low stone table with ten swords standing up out of the ground behind it, one hand still gripping a blade laid flat in front. a black sun in the sky with a ring of light round it.',
      'ten is the end of the suit and it is deliberately overdone. nobody needs ten. the joke and the mercy are in the same picture.',
      'in the person: it is over, it was thorough, and there is nothing left to defend. that is the relief in this card and people are always surprised to find one here. the mind has finished doing what it does. note the hand: still holding one. that is the only thing left to put down and you will know when.'),

    M('page of swords', 'page-of-swords',
      'a young frog standing in long grass in a slashed doublet, one hand on his hip, the other holding a sword point-down in front of him. wind in everything, and a sun with a face watching from the left.',
      'the page is the suit as a beginner, and a beginner with a blade is somebody who has just found out that words do things.',
      'in the person: you are quick, you are pleased with yourself, and the hand on the hip is the whole card. the sword is held point down — nothing is being defended and nothing is being attacked, it is simply out, in a field, in the wind. that is the stage at which a sharp mind is most likely to cut something by accident.'),

    M('knight of swords', 'knight-of-swords',
      'a frog in armour at full gallop with the sword up and back over his shoulder, the horse\'s feet off the ground, cloak torn out behind him, and a sun with a face looking on from the corner.',
      'the knight is the suit charging, and this is the fastest card in the deck. nobody in it is looking at the ground.',
      'in the person: you have decided and you are going, and the thing you are riding at will not know what hit it. the card does not say stop. it says the blade is up and behind — it has not been aimed yet — and that the only face in the picture with any expression on it is the one in the sky, watching, from a considerable distance.'),

    M('queen of swords', 'queen-of-swords',
      'a frog on a high-backed throne in open cloud, an ornate sword held straight up beside her with the blade running down past her knee, the other hand resting on the arm of the chair. she is turned slightly and looking out past you.',
      'the queen is the suit as judgement — and she is the only figure in the deck sitting in nothing but cloud. there is no ground under this chair at all.',
      'in the person: you see through things, including people you love, and you have paid for it. the hand on the chair arm is not doing anything, which is the part i would want you to see: the blade is up, the mind is working, and the rest of her is completely still. that stillness is a skill. it is also a long way up, with nobody standing anywhere near.'),

    M('king of swords', 'king-of-swords',
      'a crowned frog on a throne set on a round stone dais above the water, facing square out of the card, the sword straight up in one hand and the other on the arm of the chair. a small sun off to the left and cloud behind.',
      'the king is the suit as authority: thought that has become the rule other people get measured by.',
      'in the person: you decide things, and you are right often enough that the deciding stopped being examined some time ago. he faces front, like justice, and he is asking justice\'s question from a different chair — is this a judgement, or a habit you have been enforcing since before the facts changed. the dais is round and it is not large.'),

    P('wands', null,
      'fourteen cards of batons, cut green, with the leaves still on them.',
      'the leaves are the whole suit. a wand is a piece of living wood, so this is work that is still growing while you do it: making, starting, building, quarrelling, wanting. it is the loudest suit and the least subtle, and after an evening of cups it is a relief.',
      'the numbers are a fire taking: one stick rooted and climbed, two looked out from, three watched from a height, and then the middle, where other people turn up and want some. the court cards are four temperatures of the same heat.',
      'wands ask one thing: is the thing in your hands alive or has it gone dry. a dry stick is still a stick and you can still hit somebody with it. it is worth knowing which one you have been carrying about.'),

    // the fourteen wands
    M('ace of wands', 'ace-of-wands',
      'a single green stem going straight up out of the ground with leaves and buds along it, and a frog climbing it — one arm round it, one hand at the top, a foot braced. the roots are drawn where they go into the earth. no hand from a cloud. nobody gave him this.',
      'every other ace in the deck is offered. this one is growing, and he is already up it.',
      'in the person: you want to make something and the wanting is genuine. what the picture is honest about is that the thing is rooted at one end and unfinished at the other, and that the only way to find out how tall it goes is to be on it while it grows. start it badly this week rather than properly next season.'),

    M('two of wands', 'two-of-wands',
      'a frog in a plain robe standing between two tall ornamental staves set in the ground like gateposts, a small wire globe balanced on his open palm, and behind him a country of grey hills going out to the sea.',
      'two is the suit having a look. he is standing between the two posts and he has not gone through.',
      'in the person: you have built something that works and you are holding the whole world on one hand like a paperweight. the globe is small and the country behind it is large, and that is the exact proportion of the mistake. the card is the minute before a decision to go, and its only question is whether you want the other place or just the going.'),

    M('three of wands', 'three-of-wands',
      'a frog seen from behind on a rise, looking out over water with a few small boats a long way off. three tall staves planted in the ground at his right hand. and sitting on the ground to his left, watching him rather than the sea, an ordinary frog with no clothes on at all.',
      'three is the suit committed. the boats have gone; the deciding happened on the last page.',
      'in the person: it is done, it has left, and now there is the waiting, which nobody warns you about. his back is turned to us because this card has stopped being about him. and there is somebody at his elbow, not looking at the horizon, plainly waiting for him to come back into the room. that is the part of the card people miss.'),

    M('four of wands', 'four-of-wands',
      'four tall posts carrying a canopy hung with garlands and lamps, standing out in an open field, and one frog underneath it dancing — arms out, coat flying, entirely by himself.',
      'four is the suit stable, and in fire the stable thing is a celebration. it is the only four in the deck that is any fun.',
      'in the person: something has come far enough to be marked and you are inclined to skip the marking and get on. do not. and look who is under the canopy: one. a threshold is meant to be walked through with people present, and the invitations are yours to send.'),

    M('five of wands', 'five-of-wands',
      'five frogs in an open space swinging staves, four of them lunging in from the edges and one standing straight up in the middle with a hand on his hip, holding his own stave across his body. nobody has hit anybody.',
      'five is the suit meeting other people. the printer drew it as a scrum, which is what competition looks like from inside it.',
      'in the person: you are in a mess of a fight with several parties and none of them is the enemy. it is noisy, it is not fatal, and the one standing upright in the middle with his hand on his hip is enjoying himself. be honest about whether there is a prize here or whether five of you are in a yard with sticks.'),

    M('six of wands', 'six-of-wands',
      'a frog on a horse with a laurel wreath drawn round his head like a halo, a staff held up in one hand, and five hooded frogs walking either side of him with the other five staves.',
      'six is the suit at the parade, and the five carrying the sticks are the whole card.',
      'in the person: you won, publicly, and it is pleasant — take it, there is no trick in this one either. the horse puts him one head above everybody, which is exactly the height at which a person stops hearing what the crowd is actually saying. a win carried by five other people is still a win. it is simply not a solo.'),

    M('seven of wands', 'seven-of-wands',
      'a frog on a rock holding a stave, and below him three more coming up the slope with staves pointed at him. they are the same frog. same face, same green, same mouth, looking up at him out of the dark.',
      'seven is the suit defending. he is winning and he is not going to be able to put the stick down.',
      'in the person: you have been holding a position a long time and the high ground is real — it is why you are still up there. but look at the faces coming up at you. the printer gave the attackers your face, and if you have ever wondered why the fight never ends no matter how many you see off, that is the answer and it took him one drawing.'),

    M('eight of wands', 'eight-of-wands',
      'eight staves coming down across the sky in a fan, all of them travelling the same way, and at the bottom of the card a frog sitting on the ground in a cloak with its knees up, watching them arrive.',
      'eight is the suit as pure movement — nobody threw these and nobody is catching them.',
      'in the person: things are arriving at once, fast, and the deciding part is over. what i would point at is the figure: he is sitting down. the eight are in the air whatever he does now, so this is not a card about effort. answer the message, take the news, and stop trying to steer what has already been let go.'),

    M('nine of wands', 'nine-of-wands',
      'a frog in a heavy cloak standing with one stave in his hand and eight more stood up in the rocks around him like a fence. bones on the ground at his feet, a small animal watching from the stones, the sun with a face behind. he is looking sideways, out of the frame.',
      'nine is the suit that has been in it too long and is still standing.',
      'in the person: you have been hit and you got up and now you are guarding a line you may no longer need to guard. you put those eight there yourself. the vigilance kept you alive and it is also why you cannot sit down — and the thing to notice is that he is looking off the edge of the card, at something none of us can see.'),

    M('ten of wands', 'ten-of-wands',
      'a frog carrying all ten staves in a bundle against one shoulder, bent forward under them, walking a track across empty ground. a full moon over the hills. no house, no town, nothing at the end of the road in this picture at all.',
      'ten is the suit finished, drawn as somebody who cannot see past his own load.',
      'in the person: you took on all of it and the reason you cannot put any down is that you wanted it in the first place. the other tens in this deck give you a family, a rainbow, an end. this one gives you a road and no destination drawn on it, which means nobody is going to tell you when you have done enough. you have to say it.'),

    M('page of wands', 'page-of-wands',
      'a young frog in a plain tunic standing in a desert of long dunes, one hand loose at his side, the other holding a tall ornamented staff upright beside him. the sun has a face and is looking right at him.',
      'the page is the suit as a beginner. the staff is a head taller than he is and he is holding it perfectly straight.',
      'in the person: you have an idea bigger than your competence and you are standing up next to it anyway. that is a good hour and it does not last. everything round him is sand — no work started, nothing growing — which is what a beginning actually looks like, and it is why it is worth doing before you tell anybody.'),

    M('knight of wands', 'knight-of-wands',
      'a frog in armour on a black horse coming up off its forefeet, an ornate staff held high in one hand, the other arm flung back, a crescent moon behind and dunes running away in every direction.',
      'the knight is the suit at a gallop, drawn in the instant before the landing.',
      'in the person: you are all in and enjoying it. the energy is real and the courage is real and neither has anything to say about direction. he starts things magnificently. what is at the far end of that desert is not in the picture, and he has not asked.'),

    M('queen of wands', 'queen-of-wands',
      'a frog on a throne in a field of sunflowers, a staff with a sunflower at its head in one hand, the other on the arm of the chair. a lion lying on the tiles at her left, and at her right a black and white cat sitting up, looking straight out of the card at you.',
      'the queen is the suit as warmth that people come to. the lion is hers and it is asleep; the cat is hers and it is not.',
      'in the person: you are the one people bring things to and you do not experience it as a burden, which makes you rare. the sunflowers all face the same way and the cat faces the room. something in you keeps watch while the rest of you is generous, and this card does not think that is a contradiction.'),

    M('king of wands', 'king-of-wands',
      'a frog on a carved throne holding a staff upright with a burning white head on it, an ermine cloak, mountains and a lake behind. a lion sitting against the throne at his right, another one out in the distance at his left, and one small insect going across the sky.',
      'the king is the suit as a life\'s work. the light at the top of that staff is the brightest thing in the card and he is holding it out away from himself.',
      'in the person: you have carried something for years and it has not gone dry, which is not luck. two lions: one at the chair, one out on the far shore. whatever it is you tamed, there is another of it still out there, and you know that, and it is the reason you have not put the staff down. a fire that size warms a room and will also take one. the people round you feel the temperature before you do.'),

    P('the last page', null,
      'that is the book. it is shorter than the ones next to it on this shelf because most of what is in those is a list, and a list is the thing that stands between a person and a picture.',
      'if you take one thing away: look at the card before you look it up. what is the figure looking at, what does it hold, what has it turned from. you will get it wrong sometimes. so do i, and the ones i get wrong are the ones i remember, which is the only reason i am any good at this.',
      'and put it back on the shelf when you are done, anon. the bay is at chest height, second from the left, next to the bottle.'),
  ],
};

// ---- THREE OTHER BOOKS, WRITTEN AND NOT IN USE ---------------------------------------------------
// These three spines opened for one round. The user, once TAROT BY PEPE had his cards in it: "for
// now it should be the only clickable one, we'll think of other books as we go along." So they are
// books on a shelf again — not switches, no cursor, nothing on the case saying which one opens —
// and they are NOT in `BOOKS` below, which is what the room can actually put in front of a visitor.
//
// The writing is kept rather than deleted because keeping it costs a kilobyte and it is already
// done: three titles the case already carries (props-objects.js deals them out of TITLES; all three
// stand in the two bays the `case` shot holds, at 0.52 and 0.97 m), one page each, in the same hand,
// each a book HE would have on that shelf — what it is, and what he thinks of it. Nothing in them is
// a second essay about tarot. Put a key back into `BOOKS` and its spine is a switch again.
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

// EVERY BOOK THE CASE OPENS, by the title cut on its spine — and there is one. This object is the
// single source of truth for it: walk-book.js registers a switch for each key in `SPINES` that it
// can find on the shelf and refuses to open anything that is not in here, so adding a book is
// adding it to both and nothing else.
export const BOOKS = {
  TAROT: TAROT_BY_PEPE,
};
