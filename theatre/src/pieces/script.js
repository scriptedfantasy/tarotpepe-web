// The script. Everything Tarot Pepe says, as data the flow can drive.
//
// Voice: formal, exact, short sentences. No mysticism, no exclamation marks. The humour is in
// the precision and the pauses. He is courteous the way a concierge is courteous; he notices
// small things about the visitor and says them plainly; he is a little melancholy and does not
// mention it.
//
// Shape:
//   SCRIPT.greeting / question / shuffle / draw / turn / farewell   arrays of lines, said in order
//   SCRIPT.answer                                                  templates; {answer} is the visitor's text, verbatim
//   SCRIPT.interjections.{empty,long,question}                     when the visitor types nothing / a lot / a question
//   SCRIPT.cards[slug][brought|going|do]                          two lines per card per position (78 × 3 × 2)
//   lineFor(slug, position) → 'line one. line two.'                position: 0..2 | 'brought'|'going'|'do' | the label
//   linesFor(slug, position) → [line, line]
//   reply(answer) → the line that folds the visitor's answer back

export const SPEAKER = 'Tarot Pepe';
export const POSITIONS = ['What you brought', 'What is actually going on', 'What to do about it'];
export const POSITION_KEYS = ['brought', 'going', 'do'];

// ---------------------------------------------------------------------------------------------
// The evening, beat by beat
// ---------------------------------------------------------------------------------------------
const greeting = [
  'Good evening. Please sit. The chair is low; it was made for a frog, and I apologise on its behalf.',
  'I am Tarot Pepe. I read three cards. I do not read palms, leaves or faces, though I will look at yours.',
  'Nothing said here leaves the room. The room is small, so that is not saying much.',
];

const question = ['Tell me what you are carrying. One sentence. The second is usually the first one again, louder.'];

// The visitor's sentence, folded back verbatim. {answer} is replaced by reply().
const answer = [
  '“{answer}” I see. It has been said now. It is on the table, next to the ashtray.',
  '“{answer}” Thank you. You said it plainly. Most people bring it in wrapped.',
  '“{answer}” Yes. That is the kind of thing people bring here. I will not pretend it is unusual, and I will not pretend it is small.',
];

const interjections = {
  empty: [
    'Nothing. Very well. Silence is the most common thing brought here, and the heaviest.',
    'You typed nothing. That is permitted. The cards have been read for less.',
  ],
  long: [
    'That was several sentences. I asked for one. We will take the first, “{first}”, and let the others wait in the hall.',
    'That is a paragraph. I have read it. We will proceed with “{first}”; the rest can stand by the door.',
  ],
  question: [
    '“{answer}” You have ended with a question mark. I noticed. The cards do not answer questions; they change them. We will proceed on that basis.',
    '“{answer}” A question. Fair. I will answer it with three pictures, which is what I have.',
  ],
  again: ['You have said that already. It is not less true the second time. It is also not more.'],
};

const shuffle = ['I shuffle seven times. Not for luck; seven is where it stops being the same deck.', 'Please do not help.'];

const draw = [
  'Three cards. Left to right: what you brought, what is actually going on, what to do about it.',
  'That is the whole method. I did not invent it, and I have not improved it.',
];

// Said as each card is turned, before its two lines.
const turn = ['The first card. What you brought.', 'The second. What is actually going on.', 'The third. What to do about it.'];

const farewell = [
  'That is all the cards have. It is, I find, usually enough. Mind the step; it is lower than it looks.',
  'That is the reading. Take what fits and leave the rest on the table; I will put it back in the deck. Good night.',
  'We are finished. You may go, or you may sit a moment; the bench does not mind. Good night, either way.',
];

// ---------------------------------------------------------------------------------------------
// The cards. Two lines per position, each about the picture on the card and the person at the
// table. Keys: brought (what you brought), going (what is actually going on), do (what to do).
// ---------------------------------------------------------------------------------------------
const CARDS = {
  // ---- Major arcana -------------------------------------------------------------------------
  'the-fool': {
    brought: [
      'The Fool. You came in with a stick over your shoulder and a bottle you have not opened.',
      'The dog is looking up at you. It has noticed the edge. You have not.',
    ],
    going: [
      'Nothing has gone wrong yet. That is the whole situation, and it is making you nervous.',
      'The sun in this picture has a face. It is watching, and it is not worried.',
    ],
    do: ['Take the step. Take it in the shoes you have on.', 'Feed the dog first. It came with you; that was not nothing.'],
  },
  'the-juggler': {
    brought: [
      'You brought everything. Cup, coin, blade, scales, a ball for some reason. It is all on the table.',
      'You have laid it out very neatly. Neatness is what people do instead of starting.',
    ],
    going: [
      'You have the tools. You have had them for some time.',
      'The figure is wearing a bow tie. He has dressed for a performance that has not been scheduled.',
    ],
    do: ['Pick one object up. Not the ball.', 'Then do the thing with it, in front of someone. That is the whole trick; there is no other part.'],
  },
  'the-popess': {
    brought: [
      'You brought a book you have already read, held open at the page you already know.',
      'You came for confirmation. I regret that I do only readings.',
    ],
    going: [
      'You know the answer. You have known it since the hall.',
      'The moon in this picture has a face, and it is keeping quiet. So is the book. So, I suspect, are you.',
    ],
    do: ['Say the thing you know out loud, once, to one person.', 'Then close the book. It will still be there; that is what books are for.'],
  },
  'the-empress': {
    brought: [
      'You brought a garden. Wheat, sunflowers, and one small frog near the hem who is not in the official picture.',
      'You are tired in the way of people who have been growing things for others.',
    ],
    going: [
      'Everything you planted is coming up. That is why you cannot see the ground.',
      'It is abundance. Abundance is also a great deal of work, and nobody says so.',
    ],
    do: ['Sit on the throne. It was drawn for sitting.', 'Let one thing ripen without checking it. Start with the frog.'],
  },
  'the-emperor': {
    brought: [
      'You brought a chair, a sceptre and a set of rules, and you brought them somewhere they were not asked for.',
      'There are two spare orbs on the floor. You are carrying more authority than the situation holds.',
    ],
    going: [
      'Someone has to be in charge, and you have decided it is you. You may be right.',
      'Behind the throne there are mountains, and they are not moving. Neither are you. It is a standoff with geology.',
    ],
    do: ['Give one order, clearly, and then stop giving orders.', 'Put one orb down. You will not miss it; nobody counts orbs.'],
  },
  'the-pope': {
    brought: [
      'You brought a question about the proper way to do something, and two people kneeling who already agree with you.',
      'You are wearing the tall hat. I am not sure who gave it to you.',
    ],
    going: [
      'There is a right way, and you know it, and it is old, and it works.',
      'The trouble is that it is dull, and you were hoping I would excuse you. I do not have that hat.',
    ],
    do: [
      'Do it the established way, this once, all the way through.',
      'If the established way is wrong, you will know by Thursday, which is faster than arguing.',
    ],
  },
  'the-lovers': {
    brought: [
      'You brought a choice, and you have dressed it as a romance so that it will be harder to refuse.',
      'There are two figures holding hands and one angel above them who has not been introduced.',
    ],
    going: [
      'Two things want you. That is flattering, and it is also arithmetic.',
      'The card is misprinted at the bottom; it says a word that is not a word. The choice is real, whatever it is called.',
    ],
    do: ['Choose the one you would choose if nobody would ever find out.', 'Then tell them. Whichever one. The angel will manage.'],
  },
  'the-chariot': {
    brought: [
      'You brought speed. Armour, a cart, and two animals facing different directions.',
      'There is only one wheel in this picture. You have been going quite fast on it.',
    ],
    going: [
      'You are winning, in the sense of moving. The animals disagree about where.',
      'The armour is good. It was fitted for a fight that is not the one you are in.',
    ],
    do: [
      'Hold the reins, not the animals. That is the difference between a driver and a passenger with opinions.',
      'Choose one direction for a week. The other will keep.',
    ],
  },
  justice: {
    brought: [
      'You brought a case. You have prepared it well; there are two sets of scales in this picture, and you brought the spare.',
      'You would like a verdict. You would like it to be the one you have already reached.',
    ],
    going: [
      'It is fair. That is the news, and it is not the news you wanted.',
      'There is no sword in this version of the card. The cutting is up to you.',
    ],
    do: [
      'Weigh it once more, honestly, with the small scales.',
      'Then accept the number. Do not weigh it a third time; the third time is not weighing, it is hoping.',
    ],
  },
  'the-hermit': {
    brought: [
      'You brought a lantern and a rock to sit on. You have been sitting on it a while; the mountains have grown.',
      'You came alone and you are proud of that, and you are also here, which is company.',
    ],
    going: [
      'You went quiet to think, and the thinking has finished, and you have kept the quiet out of habit.',
      'There are two moons in this sky. Even the hermit has doubled something.',
    ],
    do: [
      'Come down with the lamp. It was for the road, not the rock.',
      'Speak to one person before the week ends. A short sentence is enough; you have had practice.',
    ],
  },
  'wheel-of-fortune': {
    brought: [
      'You brought a run of luck, and you have not decided whether it is good or bad, because it has not stopped.',
      'There are cards on the ground under the wheel. Somebody was reading them when it turned. It happens here too.',
    ],
    going: [
      'The wheel is moving. You are not at the top and you are not at the bottom; you are at the part that is hard to see.',
      'The figure at the side is reading a book while it turns. That is one method. It is not a bad one.',
    ],
    do: [
      'Do not push the wheel. Pushing only shows the wheel where your hands are.',
      'Write down what is on top today. In a month you will not believe it.',
    ],
  },
  strength: {
    brought: [
      'You brought a lion. You have your hand on its head, quite gently, and you are pretending that is normal.',
      'The lion is content. You are the one who looks tired.',
    ],
    going: [
      'You are holding something large very quietly. Nobody has noticed, which was the point.',
      'It is going well. That is the difficulty; there is no one to tell.',
    ],
    do: ['Keep the hand where it is. Soft.', 'Do not show the lion to anyone to prove you have one. That is how people lose lions.'],
  },
  'the-hanged-man': {
    brought: [
      'You brought a pause, and you brought it upside down so it would look like an accident.',
      'Your hands are open. You are not holding on to anything; you are being held. There is a difference, and you have felt it.',
    ],
    going: [
      'Nothing is happening, on purpose. The rope is around your waist, not your neck; this is a wait, not a sentence.',
      'From there the room is upside down, and you have started to prefer it.',
    ],
    do: [
      'Stay a little longer than is comfortable. Not much.',
      'Then untie the knot yourself. It is at the waist; you can reach it. You have always been able to reach it.',
    ],
  },
  death: {
    brought: [
      'You brought an ending, and you brought it on a white horse, so it has arrived quite calmly.',
      'You were expecting this card to be worse. It is a rider with a flag, and the flag has a flower on it.',
    ],
    going: [
      'Something is over. It was over before you sat down; the horse is already in the picture.',
      'The people kneeling are not being punished. They are getting out of the way, which is polite.',
    ],
    do: [
      'Let it end. Do not organise a second ending for it later; one is sufficient.',
      'Then look at the river behind the horse. It is still going somewhere. That was always the other half of the card.',
    ],
  },
  temperance: {
    brought: [
      'You brought two cups, and you are pouring both, and you have your feet in the river while you do it.',
      'You have wings in this picture. You are not using them. You are standing very still with the water and the cups.',
    ],
    going: [
      'You are mixing two things that do not want to mix, patiently, and it is working, slowly, and nobody is watching.',
      'The sun is going down behind you. This is evening work; it does not look like much.',
    ],
    do: ['Pour slower. That is the whole instruction; I would pad it if I could.', 'Keep the feet in the water. The cold is part of the measure.'],
  },
  'the-devil': {
    brought: [
      'You brought a chain, and two small hooded frogs on the end of it who could leave and have not.',
      'You are holding a torch. You brought your own light to the thing you are ashamed of, which is unusual.',
    ],
    going: [
      'The chain is loose. It is loose on everybody in this picture, including the one on the throne.',
      'It is a habit, dressed as a devil. Habits like to be drawn with horns; it flatters them.',
    ],
    do: [
      'Lift one foot. Notice the shackle comes with it. That is the whole discovery.',
      'Then walk out slowly. Leave the torch; the room can keep it.',
    ],
  },
  'the-house-of-god': {
    brought: [
      'You brought a building that is on fire, and you would like to discuss the roof.',
      'There is a face in the sun watching the tower go. It is a frog. It looks as though it has seen this before.',
    ],
    going: [
      'It has fallen. The lightning was not the problem; the lightning found the problem.',
      'Two people are falling in this picture, and they are both you. One of them looks relieved.',
    ],
    do: [
      'Do not rebuild it on the same rock. Not this week.',
      'Stand where you landed and count what is still yours. It will be a short list and a true one.',
    ],
  },
  'the-star': {
    brought: [
      'You brought two jugs, and you are pouring one back into the pool it came from. That is not waste; that is where the water goes.',
      'You came in quietly. Under all those stars you are the only one kneeling, and it does not look like defeat.',
    ],
    going: [
      'The worst part has passed. You have not noticed, because the worst part left no card.',
      'There are eight stars here and one of them is very large. It is the first thing to be certain of in some time.',
    ],
    do: ['Keep pouring. Both jugs. Do not measure it.', 'Look up once. The big one is still there. Then get on with the jugs.'],
  },
  'the-moon': {
    brought: [
      'You brought a night. Two towers, a dog, a crab, and a figure in a white robe whose head has gone somewhere behind the moon.',
      'That figure is you. You have been walking without your head for a while; the crab noticed.',
    ],
    going: [
      'You cannot see it clearly, and you have decided that means it is bad. It means it is dark.',
      'The moon has a face in this picture. It is mine. I mention it only so that you know who is looking.',
    ],
    do: ['Do nothing decisive at night. Write it down and read it at breakfast.', 'Follow the dog. The crab has its own plans.'],
  },
  'the-sun': {
    brought: [
      'You brought a horse, a banner, a field of sunflowers and a sun with a very large face. You brought a good day, and you are suspicious of it.',
      'You are sitting on the horse without a saddle. You are that comfortable, and it worries you.',
    ],
    going: [
      'It is going well. I have checked the card twice; it is still going well.',
      'The sun is smiling. It is not a trick. Suns are not clever enough for tricks.',
    ],
    do: ['Enjoy it in public. Privately enjoyed good fortune goes off, like milk.', 'Let the horse choose the pace. It knows the field.'],
  },
  judgement: {
    brought: [
      'You brought a trumpet, and several people who have been lying down for some time, and you are about to wake them.',
      'You have a call to make. You have been holding it near your mouth for a while now.',
    ],
    going: [
      'Something old has stood up and is looking at you. It is not angry. It is waiting to be counted.',
      'This is not the end. It is the register being taken.',
    ],
    do: [
      'Answer to your name. Out loud, the first time it is called.',
      'Then stand with the others. They have been up a while; they know where the coats are.',
    ],
  },
  'the-world': {
    brought: [
      'You brought a wreath and you sat in it. Four creatures at the corners watched you do it. They approve.',
      'You have finished something. You brought the finished thing in and set it on the table, quite carefully.',
    ],
    going: [
      'It is complete. That is the whole of it, and it is rarer than the other cards would have you believe.',
      'You are holding two wands and there is nothing to do with them yet. That is what finished feels like; people mistake it for boredom.',
    ],
    do: [
      'Take the applause of the bull, the lion, the eagle and the one with wings. That is the audience; it is enough.',
      'Then step out of the wreath. The next one is drawn on a different card.',
    ],
  },

  // ---- Cups ---------------------------------------------------------------------------------
  'ace-of-cups': {
    brought: [
      'You brought a cup so large you are sitting in it. Your head is above the rim; that is all that is above the rim.',
      'There are doves. Nobody asked for doves. They come with the cup.',
    ],
    going: [
      'Something has started that you did not arrange. It is warm. You are in it up to the neck.',
      'You look calm in the cup. I have seen calm before. It is usually surprise that has run out of moves.',
    ],
    do: ['Stay in. Do not get out to check the water; you are the water.', 'Let the doves do the announcing. They are drawn for it.'],
  },
  'two-of-cups': {
    brought: [
      'You brought another person. They are in the picture, in a different hood, touching a cup to yours.',
      'The snakes at the bottom are coiled and calm. You checked; I saw you look.',
    ],
    going: [
      'There are two of you and it is level. That is the rarest thing in the deck, and it looks like a small drink.',
      'Nobody is winning. That is the point. You keep looking for the score.',
    ],
    do: ['Raise the cup to the same height as theirs. Not higher; you will spill.', 'Say what the drink is for. Once. They will remember the once.'],
  },
  'three-of-cups': {
    brought: [
      'You brought two friends, and the three of you are standing in your cups, which I would not normally allow.',
      'One of you is pink. Nobody has explained this. Nobody needs to.',
    ],
    going: [
      'It is a celebration, and you have not decided what for, and that is the best kind.',
      'Everyone in the picture is laughing with their mouth open. You were drawn last; your laugh is a little late.',
    ],
    do: ['Go. Wear the shoes that are not sensible.', 'Do not organise the evening. It has three people in it; it will organise itself.'],
  },
  'four-of-cups': {
    brought: [
      'You brought a good coat and a bad mood, and you sat under a tree to wear both.',
      'A hand is coming out of the tree to offer you a cup, and the hand is empty. You have noticed. You have decided it is typical.',
    ],
    going: [
      'Three cups are in front of you and you are looking at none of them. It is not sadness; it is a small refusal, well maintained.',
      'The sky has several moons. You have been there long enough to see the extra ones.',
    ],
    do: [
      'Drink one of the three. Any one. I will not tell you which; that is the trick you are waiting for, and there is none.',
      'Then look at the tree. The hand was offering the cup. The cup was the tree.',
    ],
  },
  'five-of-cups': {
    brought: [
      'You brought a black cloak and two spilled cups, and you brought them at night, so the spill would look worse.',
      'There are cups still standing behind you. You have not turned around. It is a long cloak; turning is effort.',
    ],
    going: [
      'Something was lost. Something was also not lost. You are counting only the first pile, which I understand.',
      'There is a bridge in the picture. It goes over the river to the house. It has been there the entire time.',
    ],
    do: [
      'Look at the cups that are standing. Count them out loud; three is a number you know.',
      'Then cross the bridge. Wear the cloak; it is a good cloak. The spill is not on it.',
    ],
  },
  'six-of-cups': {
    brought: [
      'You brought a memory in a cup, with flowers in it, and you are handing it to a smaller version of yourself.',
      'It is a village. It is your village. The cups on the ground are full of the same flowers; nobody has picked those.',
    ],
    going: [
      'Something from before has come to the door, and it is kind, and it is asking for nothing, and you do not trust it.',
      'You are giving the cup, not receiving it. Note which way your hands are drawn.',
    ],
    do: ['Accept the thing from before. Do not check its motive; it was a child.', 'Then pick one of the cups off the ground. Flowers do not care whose they were.'],
  },
  'seven-of-cups': {
    brought: [
      'You brought seven cups, all in a cloud, and one of them contains a snake. You have your hands folded under your chin as if that helps.',
      'There is a castle in one cup and a shrouded figure in another. You have wanted both. That is the difficulty.',
    ],
    going: [
      'You are choosing between things that have not happened. That is not choosing; that is shopping in a cloud.',
      'One of the cups is glowing. It is the plain one. It is always the plain one.',
    ],
    do: [
      'Take the plain one down from the cloud. Set it on the actual table.',
      'Leave the snake where it is. That one comes to you regardless; you need not go to it.',
    ],
  },
  'eight-of-cups': {
    brought: [
      'You brought eight cups, arranged, and then you left them and walked toward the mountains without shoes.',
      'One cup stands apart from the others. You put it there. You did not take it with you.',
    ],
    going: [
      'You have already left. Your body is in the parlour; the rest of you is on the road with a stick.',
      'The moon is watching you go. It has no opinion. It is a moon.',
    ],
    do: [
      'Keep walking. You have got as far as the middle of the card; the hard part was the first step, and you have taken it.',
      'Do not go back for the one cup. You know which one. It is the one you would go back for.',
    ],
  },
  'nine-of-cups': {
    brought: [
      'You brought nine cups and a good tunic, and you sat down behind them with your arm on the table like someone who has counted.',
      'You look pleased. You have been pleased for about a minute, and you would like it to last, and you have come to ask how.',
    ],
    going: [
      'You have what you asked for. That is what this card is. It comes with a table.',
      'The sun in the medallion above you is smiling. It is embroidered; it will not stop.',
    ],
    do: ['Drink from one. Do not display the nine; a display is for people who are not thirsty.', 'Then invite one person to the table. Nine cups is a lot for one arm.'],
  },
  'ten-of-cups': {
    brought: [
      'You brought a household. Five small ones, walking on a rainbow, and a house on the left with the door drawn open.',
      'You are holding one cup up to the rainbow. The rainbow has ten. You have done the sums and you are not sure it is fair.',
    ],
    going: [
      'It is a good life. It is happening now, in the picture, while you sit with a fortune teller asking whether it will.',
      'The small ones are on the rainbow, not under it. You worry about that. They are fine; it is drawn to hold them.',
    ],
    do: ['Go home. That is the reading. The house is on the left; the door is open.', 'Do not count the cups again. Ten is the number. It was ten when you came in.'],
  },
  'page-of-cups': {
    brought: [
      'You brought a cup with a small bird in it. You are looking at the bird. The bird is looking at you. A grey frog is looking at both of you.',
      'You have long hair in this picture, and a ruff. You have dressed for a feeling.',
    ],
    going: [
      'Something small and alive has turned up in a place meant for drink. It is not a problem; it is news.',
      'You are young in the card, whatever you are at the table. That is not an insult. It is the card’s opinion.',
    ],
    do: ['Let the bird out. Then keep the cup; it is a good cup.', 'Tell somebody about the bird today. Tomorrow it is a story; today it is a bird.'],
  },
  'knight-of-cups': {
    brought: [
      'You brought an offer. You brought it on a horse, in armour, and you brought the horse up onto a plinth so the offer would be higher.',
      'The horse is standing still. You have arrived; you are simply not sure at whose door.',
    ],
    going: [
      'You are being romantic about something practical, or practical about something romantic. The armour makes it hard to tell which.',
      'The moon is up. Knights of this suit travel by it. They do not always arrive by it.',
    ],
    do: ['Get down off the plinth and hand the cup over at ordinary height.', 'Say what is in it. Plainly. The horse will wait; it is a very patient horse.'],
  },
  'queen-of-cups': {
    brought: [
      'You brought a throne to the beach and sat on it with a cup, and small round creatures came to look at you, which they do.',
      'You are listening. You have been listening a long time. You brought the listening in with you; it has weight.',
    ],
    going: [
      'Someone needs you to feel something on their behalf. You are doing it. It is why the cup is full and you look tired.',
      'The sea is behind you. You have not gone in. You are the one who stays on the sand with the towels.',
    ],
    do: [
      'Put the cup down on the arm of the throne. It has an arm. That is what it is for.',
      'Feel one thing that is yours. It will feel unfamiliar; that is how you will know.',
    ],
  },
  'king-of-cups': {
    brought: [
      'You brought a throne on a rock in the sea, and you are sitting on it very steadily while everything around you moves.',
      'Two creatures are in the water beside you. You have not looked at them. You know they are there; that is enough for a king.',
    ],
    going: [
      'You are being calm for other people. It is working. It is also costing you, and you have not sent the bill.',
      'The cup is raised. Not drunk from. Raised. That is how this king holds things: up, and not for long.',
    ],
    do: ['Drink from the cup. Yours, not the household’s.', 'Let one wave reach the rock. Get the hem wet. Nobody is watching the hem.'],
  },

  // ---- Pentacles ----------------------------------------------------------------------------
  'ace-of-pentacles': {
    brought: [
      'You brought an offer of money, or of something that behaves like money, from a hand that comes out of a cloud.',
      'You are reaching for it from a sitting position. You are not standing up for it. Interesting.',
    ],
    going: [
      'Something solid is available. It is being held out. Hands in clouds do not hold things out for long.',
      'There is a second, smaller coin near the ground. You have not noticed it. That one is already yours.',
    ],
    do: [
      'Stand up and take the coin. Say thank you to the cloud; it costs nothing.',
      'Then put it in the ground. It is that kind of coin. The river will do the rest.',
    ],
  },
  'two-of-pentacles': {
    brought: [
      'You brought two coins, and you are holding one in each hand at exactly the same height, which is very tiring.',
      'Behind you there are ships. They manage the sea by moving with it. You are managing two coins by not moving at all.',
    ],
    going: [
      'You are keeping two things going and calling it balance. It is a hold. It has been a hold for months.',
      'The figure of eight behind your hands is the sign for forever. Do not be flattered; it means the juggling has no scheduled end.',
    ],
    do: ['Put one coin in your pocket. You have a pocket; I checked the robe.', 'Move like the ships. Slightly. The sea does not mind.'],
  },
  'three-of-pentacles': {
    brought: [
      'You brought a plan on a piece of paper, and two other people who have opinions about the plan.',
      'The three of you are in a church. Somebody is pointing at the arch. It is a very good arch. It is also not finished.',
    ],
    going: [
      'The work is good and it needs the others. You wanted it to need only you. It does not, and it is better for it.',
      'You are the one holding the drawing. The other two are looking at the wall. That is the correct arrangement, for now.',
    ],
    do: ['Let the person with the stick point. Then do what they point at.', 'Sign the drawing with all three names. It is a bigger arch that way.'],
  },
  'four-of-pentacles': {
    brought: [
      'You brought one coin, held against your chest with both hands, into a room with two more on the floor that you have not picked up.',
      'You are barefoot on a stone floor, holding money. You are cold. You have decided the money is worth the cold.',
    ],
    going: [
      'You are keeping it safe. It is safe. So safe that it has stopped being money and become a thing you hold.',
      'The moon has a face in this picture. It has seen you count. It is not impressed; it is a moon, it counts by itself.',
    ],
    do: [
      'Spend one. Not a big one. The small one at your feet.',
      'Then unfold your arms. You will find the coin is still there. It was the arms that were tired.',
    ],
  },
  'five-of-pentacles': {
    brought: [
      'You brought the snow with you. Two of you, in thin cloaks, one with a stick, walking past a house where the lamps are lit.',
      'You did not knock. Nobody came to the window either. It was a draw; you counted it as a loss.',
    ],
    going: [
      'It is hard right now. It is also passing a lit house. Both are in the picture, and you are only looking at one.',
      'The other one in the snow is walking with you. You have not said much to them. You are saving the warmth.',
    ],
    do: [
      'Knock. If nobody answers, knock on the next one. The card shows only the first house; that is a limit of the card, not of the street.',
      'Share the cloak. It is thin. Two thin cloaks together are a thick one; that is arithmetic, not comfort.',
    ],
  },
  'six-of-pentacles': {
    brought: [
      'You brought a set of scales and a handful of coins, and two people kneeling to receive them, which they did not ask to do.',
      'You are giving. You are also weighing while you give. The two hands are doing different jobs, and the kneeling ones can see both.',
    ],
    going: [
      'Money is moving from one hand to another and everyone is being very polite about it. That is the problem, not the money.',
      'You may be the one standing or one of the ones kneeling; the card does not say. Whichever you are, you are keeping count.',
    ],
    do: [
      'Put the scales down and give with the free hand. Or receive with it; the hand does both.',
      'Do not remember the number afterwards. If you must remember something, remember the coat.',
    ],
  },
  'seven-of-pentacles': {
    brought: [
      'You brought a hoe, a stool, and a field you have already dug, and you brought the sitting down that follows.',
      'The plant has seven coins on it, and you are looking at it as if it owes you the eighth.',
    ],
    going: [
      'It is growing. Slowly, as things that are real grow. You are impatient in a manner the plant does not recognise.',
      'The wheelbarrow is empty. That is not failure; that is the part of the season where the barrow is empty.',
    ],
    do: [
      'Sit on the stool for the rest of the day. That is the instruction. It is harder than the digging.',
      'Do not pull the plant up to check the roots. People do. Then they have a plant in their hand, and a hole.',
    ],
  },
  'eight-of-pentacles': {
    brought: [
      'You brought a chisel and a bench and eight coins in various states of finished, and you brought the candle, because you work late.',
      'You are on the eighth. It looks like the first. That is the point of the eighth, and you know it, and you are a little tired of knowing it.',
    ],
    going: [
      'It is practice. It is not glamorous and it is not supposed to be; it is what glamorous is made of, later, by other people.',
      'One of the coins on the bench is black. You made that one earlier. You keep it in view. Good.',
    ],
    do: [
      'Do the next one. Not better; the same. Better comes from the same, done again, on a Tuesday.',
      'Trim the candle. You have been working in bad light for a while and calling it focus.',
    ],
  },
  'nine-of-pentacles': {
    brought: [
      'You brought a good robe and a vineyard, and a small bird that sits on your hand because you asked it to.',
      'You are alone in the rows. You made it that way, carefully, and now you are checking whether it was a mistake.',
    ],
    going: [
      'You have enough. Enough is a strange amount; it feels like waiting. It is not waiting. It is enough.',
      'The bird stays because the hand is still. That is the whole of the arrangement, and it is a good one.',
    ],
    do: [
      'Walk the rows once, slowly, without picking anything.',
      'Let the bird go if it wants. It will come back or it will not, and the vineyard is unchanged either way.',
    ],
  },
  'ten-of-pentacles': {
    brought: [
      'You brought your whole family. They are all here; they are all in the card; two of them are dogs.',
      'There is an old one sitting to the side, holding a small animal. You are looking at that one. You know what it means; you have known for years.',
    ],
    going: [
      'It is the long thing: the house, the name, the money that came from somebody’s grandfather. It goes on with or without you, and mostly with.',
      'Everyone in the picture is looking in a different direction. That is what a family is. The card is accurate.',
    ],
    do: [
      'Sit with the old one for a while. Not to say anything. To be counted in the picture.',
      'Then do your part of the long thing, which is small, and which nobody else can do.',
    ],
  },
  'page-of-pentacles': {
    brought: [
      'You brought one coin on a stick, and you are holding it up to look at it, in a field, by a river, alone.',
      'There is a second coin lying in the water near your feet. You have not seen it. You are busy with the one on the stick.',
    ],
    going: [
      'You have found the beginning of something practical, and you are studying it before it is a thing. That is the right order.',
      'The reeds are tall around you. You are not lost; you are simply at the height where reeds are tall.',
    ],
    do: ['Learn the thing on the stick properly. Not the idea of it. The thing.', 'Then pick the other coin out of the river. It is cold, and it is yours.'],
  },
  'knight-of-pentacles': {
    brought: [
      'You brought a horse and you have not moved it. It is standing in the field with you on it, looking at a coin on a pole.',
      'You are in full armour for a job that involves standing still. That is thorough.',
    ],
    going: [
      'Nothing is wrong. Nothing is fast either. You are doing the slow, correct thing, and it looks like nothing from the road.',
      'The horse is patient. You chose that horse. You know why.',
    ],
    do: ['Stay on the horse. Move one field over before the light goes.', 'Do not look at the coin on the pole again; you have seen it. Look at the furrow.'],
  },
  'queen-of-pentacles': {
    brought: [
      'You brought a throne to a field, and you brought the field indoors, and small creatures came to sit at your feet because you feed them.',
      'You are holding the coin on a stick the way one holds a mirror. You have been checking it for the others, not for yourself.',
    ],
    going: [
      'Everything you keep is alive, and it is all fed, and the feeding is the whole day, and you have not eaten.',
      'The sun above you has a face, and it is looking down at the throne rather kindly. It has seen the work.',
    ],
    do: [
      'Eat first. Then feed the creatures. The order matters more than you think; they will wait; they have.',
      'Turn the coin around and look at your own side of it once.',
    ],
  },
  'king-of-pentacles': {
    brought: [
      'You brought a crown, a castle, a stack of coins by the chair, and bare feet, which I notice you have not explained.',
      'You are holding one coin up to the light and turning it. You know what it is worth. You are checking that it knows.',
    ],
    going: [
      'It is done, the building of it. The castle is behind you; the coins are counted; the bird is going somewhere else.',
      'You are the person other people mean when they say they will ask someone. That is a heavy chair, and it has no cushion.',
    ],
    do: [
      'Give one coin to someone who cannot return it. It is the only kind of spending left to you that is interesting.',
      'Put your shoes on. The floor of a throne room is stone; a king with cold feet makes cold decisions.',
    ],
  },

  // ---- Swords -------------------------------------------------------------------------------
  'ace-of-swords': {
    brought: [
      'You brought a sword out of a cloud, point up, with a wreath around it, and you are holding it very still because it is sharp.',
      'You have had a clear thought. It is in your hand. It has frightened you slightly.',
    ],
    going: [
      'You know exactly what is true. It is the knowing that has changed, not the truth; the truth has been sitting there.',
      'The wreath on the blade is for a victory that has not been fought yet. Swords arrive early.',
    ],
    do: [
      'Say the true thing in one sentence. Then stop. The second sentence is where the cutting starts.',
      'Hold it by the handle. This will sound obvious; it is the most common mistake in the suit.',
    ],
  },
  'two-of-swords': {
    brought: [
      'You brought two swords and a blindfold, and you sat on a rock with the sea behind you and crossed the swords over your chest.',
      'You could put either sword down. You have not. Your arms are tired; you are calling it balance.',
    ],
    going: [
      'You have decided not to decide, and it is working, in the sense that nothing has happened.',
      'The blindfold is a good one. You tied it yourself. That is how it stays on.',
    ],
    do: ['Take off the blindfold. Not the swords. The blindfold.', 'Then look at the sea for a moment before you choose. That is what it is behind you for.'],
  },
  'three-of-swords': {
    brought: [
      'You brought a heart with three swords in it. You are sitting on top of it, in the rain, and you have not taken the swords out because it hurts less that way.',
      'The card is misprinted at the top. It says a word that is nearly another word. That is also how this feels; you keep almost naming it.',
    ],
    going: [
      'It hurts. It is meant to. This is the one card in the deck that is not a metaphor.',
      'There is rain and lightning behind you, and a moon. The weather is not about you. That is the small, hard comfort.',
    ],
    do: [
      'Take one sword out. Any one. Keep the other two for the moment; three at once is surgery.',
      'Then let it rain on it. That is what the drops are drawn for. Do not wipe them.',
    ],
  },
  'four-of-swords': {
    brought: [
      'You brought a stone bed, in a stone room, with four swords lined up in front of it, and you have lain down on it with your chin in your hand.',
      'You are not asleep. You are lying down with your eyes open, which is the tiring kind.',
    ],
    going: [
      'You need rest, and you have set the room up for it, and now you are watching the door.',
      'The swords point down. Nothing in this room is coming for you. It is the safest place in the deck, and it looks like a tomb, which is unfortunate.',
    ],
    do: ['Close your eyes on the stone. It will hold you; that is what stone does.', 'Leave the swords where they are. Standing up. They are a fence, not a threat.'],
  },
  'five-of-swords': {
    brought: [
      'You brought a victory, and two swords that were not yours, and a look on your face that says you know that.',
      'There are two others in the picture. One is walking away. One is looking at you from the edge, and I would not turn my back on the edge.',
    ],
    going: [
      'You have won, and it has cost you the people you won it in front of. That is the exchange rate in this suit.',
      'The swords on the ground are the ones nobody wanted to carry home. There are always some.',
    ],
    do: [
      'Give one sword back. Not as an apology; as a weight you do not need.',
      'Then leave the field. Fields where you won are not good places to stay. The grass remembers.',
    ],
  },
  'six-of-swords': {
    brought: [
      'You brought a boat, and six swords standing up in it, and you brought yourself as the ferryman, since nobody else was drawn.',
      'You are rowing. You are not looking back at the shore. You are looking at me, which is a way of not looking back.',
    ],
    going: [
      'You are leaving somewhere quietly, and it is going well, and you are taking the swords with you because pulling them out would let the water in.',
      'There is a lighthouse ahead. It is small in the picture. It gets bigger.',
    ],
    do: [
      'Keep rowing. Even strokes. Do not count them.',
      'When you land, leave the swords in the boat. They kept the water out; that was their job, and it is done.',
    ],
  },
  'seven-of-swords': {
    brought: [
      'You brought five swords in your arms, and you left two standing in the field behind you, and you are looking over your shoulder.',
      'It is night. There are tents. There is a candle on a stand that somebody left lit. You are being very quiet.',
    ],
    going: [
      'You are getting away with something. You are also carrying five swords, which is not getting away with much.',
      'The two you left behind are the honest ones. You knew which ones to leave.',
    ],
    do: [
      'Put the swords down. Not all of them; the ones that are not yours. It will be most of them.',
      'Then walk back past the candle. Slowly, so the tents can see. That is the whole of the repair.',
    ],
  },
  'eight-of-swords': {
    brought: [
      'You brought a set of bindings, already tied, and you brought your eyes shut, which was your own addition.',
      'There are eight swords around you and none of them is touching you. There is a gap on the left. There has always been a gap on the left.',
    ],
    going: [
      'You are stuck in a way that is mostly cloth. Cloth is not stone. You know this, and it is not helping, because the eyes are shut.',
      'The moon is full and there are stars on it. Someone drew you a good night to be stuck in.',
    ],
    do: [
      'Open your eyes. Just that. Do not stand up yet; you will fall.',
      'Then turn left. Then walk. The swords do not move; that is the thing about swords stuck in sand.',
    ],
  },
  'nine-of-swords': {
    brought: [
      'You brought a bed, and you sat up in it at three in the morning with your hand over your face and nine swords on the wall.',
      'There is a small bottle on the table beside the bed. You have not opened it. You have moved it closer, twice.',
    ],
    going: [
      'Nothing has happened. That is why you are awake; the swords are on the wall, not in the bed.',
      'There is a sun with a face among the swords. It is drawn in the middle of them. Morning is in the picture; it is simply not next.',
    ],
    do: [
      'Lie down. You will not sleep, but lying down is a different kind of not sleeping, and it is better.',
      'In the morning, count the swords. There will be nine. Nine is fewer than it felt.',
    ],
  },
  'ten-of-swords': {
    brought: [
      'You brought a body with ten swords in it, face down, under a black sun. It is the worst-drawn card in the deck, and you are, I notice, sitting up.',
      'Ten is more than necessary. One does it. Whoever did this wanted to be sure, and they were, and it is over.',
    ],
    going: [
      'It has ended as badly as it could, and the fact that you are at this table is the whole of the good news, and it is a great deal.',
      'The sun is black. That is a picture of a night. Nights are the ones that end.',
    ],
    do: [
      'Do nothing. Lie there. This is the one card where lying there is the instruction.',
      'Tomorrow, remove one sword and keep it. You will want to describe this later, and a sword is a good description.',
    ],
  },
  'page-of-swords': {
    brought: [
      'You brought a sword, a ruff, a hand on your hip and a great deal of wind. The hair is not yours; it came with the card.',
      'You are standing up straight with the point in the grass. You are ready. Nobody has told you what for.',
    ],
    going: [
      'You have something to say, and you are looking around for the person to say it to. The sun is watching. The sun is not the person.',
      'The clouds behind you are moving fast. You are moving faster. It is not a race, and you are winning it.',
    ],
    do: [
      'Say it to the right person, once, without the hand on the hip.',
      'Keep the point in the ground until then. A raised sword is a question; a planted one is a fact.',
    ],
  },
  'knight-of-swords': {
    brought: [
      'You brought a horse at full speed, and a sword in the air, and a cape that is going the other way.',
      'You have a plan. You did not bring it. It is somewhere behind the horse.',
    ],
    going: [
      'You are charging. Charging is right about a third of the time, and you have used two of the thirds this month.',
      'The sun has a face, and it is watching the horse, not you. That is the first sign.',
    ],
    do: ['Lower the sword to the horizontal. Keep the speed.', 'Look where the horse’s front feet will land. That is not cowardice. That is riding.'],
  },
  'queen-of-swords': {
    brought: [
      'You brought a clear head and a sceptre with spikes on it, and you sat down inside a card that is inside another card, so there would be a border between you and the weather.',
      'You are not holding a sword. You are holding a thing that looks like a snowflake and would hurt. You have thought about that.',
    ],
    going: [
      'You see it plainly. Plainly is cold, and people have told you so, and they were right, and so were you.',
      'The clouds are outside your frame. You put the frame there. It is good work; it is also a frame.',
    ],
    do: [
      'Say the plain thing in the fewest words that are still kind. You can count them; I have seen you count.',
      'Then let one cloud in. One. On purpose. The collar is fur; you will manage.',
    ],
  },
  'king-of-swords': {
    brought: [
      'You brought a crown and a sword and a small coin, and the coin is on the floor, and you have decided it is beneath the sword’s notice.',
      'The card says KING at the top, in case there was doubt. There was not. You brought the doubt anyway, in the other hand.',
    ],
    going: [
      'You are being asked to decide something for other people, and you are right, and being right is what has made you lonely.',
      'The sword is straight up. You do not point it at anyone; you hold it where everyone can see. That is the job, and it is tiring on the arm.',
    ],
    do: [
      'Decide it. Say the decision in one sentence, then the reason in one more. Then no more sentences.',
      'Pick up the coin. Small things on the floor of a throne room are how kings are judged, later, by the ones who sweep.',
    ],
  },

  // ---- Wands --------------------------------------------------------------------------------
  'ace-of-wands': {
    brought: [
      'You brought a sapling, roots and all, and you are holding it up with one hand while the other holds the stem, as if it might leave.',
      'You are not wearing much in this picture. An idea does that. It arrives before the clothes.',
    ],
    going: [
      'Something new is in your hand and it has roots. It came out of the ground; it is not a wish. The roots are the proof.',
      'The clouds are on both sides and the light is in the middle. That is not weather; that is a beginning, drawn honestly.',
    ],
    do: ['Plant it today. Not on the good spot; on the spot you have.', 'Then let go of the stem. It will stand. That is what roots are.'],
  },
  'two-of-wands': {
    brought: [
      'You brought the world, in a small wire version, and you are holding it in one hand between two posts, looking at it as if it might be for sale.',
      'You have already done the first thing. You are standing between two posts; the posts were the first thing.',
    ],
    going: [
      'You are choosing where next, and you have the whole globe for it, and it is smaller than you thought, and heavier.',
      'The sea behind you is calm. Calm seas are for looking at maps. You know that; you are doing it.',
    ],
    do: [
      'Put a finger on the globe. Anywhere. Then go there, or send a letter there, which is the same thing done slowly.',
      'Leave one post behind. You cannot take both; that is what posts are for.',
    ],
  },
  'three-of-wands': {
    brought: [
      'You brought a view of the sea with ships on it, and three wands in a row, and a small frog at your feet who is looking at you rather than the ships.',
      'You have your back to me. You have your back to the frog. You are looking at boats that have already left.',
    ],
    going: [
      'Something you sent is on its way back. It is not here. The card is the part where it is not here.',
      'There are two moons in the sky, a full one and a thin one. You have been waiting long enough to see both.',
    ],
    do: [
      'Turn around. The frog has been trying to say something for a while. It is short; frogs are.',
      'Then go back to the view. Waiting is work; do it with the wands, not against them.',
    ],
  },
  'four-of-wands': {
    brought: [
      'You brought an arch with garlands on it, and you are standing under it with your arms out, smiling in a way the rest of the deck does not.',
      'This is the one card where you look pleased. I looked twice. It held.',
    ],
    going: [
      'Something is being celebrated, and it is yours, and you are checking the garlands instead of standing under them.',
      'The four posts are solid. They were put in properly. Somebody did that; perhaps it was you.',
    ],
    do: ['Stand under it. The whole song.', 'Invite the people who put the posts in. They know where the food is.'],
  },
  'five-of-wands': {
    brought: [
      'You brought four other people with sticks, and all of them are talking, and you are in the middle with your stick held sideways, quiet.',
      'It is not a fight. It is a meeting that has sticks. Those are different, and you can tell by the faces.',
    ],
    going: [
      'Everyone wants the thing done their way, and the thing is not being done, and the sticks are all in the air.',
      'You are the only one with your mouth shut. That is not wisdom; that is timing. It will do.',
    ],
    do: [
      'Lower your stick first. Just yours. Watch what the others do with theirs.',
      'Then say the one sentence that ends the meeting. You have had it ready for some time.',
    ],
  },
  'six-of-wands': {
    brought: [
      'You brought a wreath, a horse, and four people holding wands who have come to look at you on the horse.',
      'You are pointing your wand at the sky. The others are pointing theirs at nothing. It is a parade, and you are the reason for it, and you look uneasy.',
    ],
    going: [
      'You have won, and it is public. Public is the difficult part. Anybody can win in a room.',
      'The people around the horse are pleased. Look at their faces; the card drew them pleased. Believe the card.',
    ],
    do: [
      'Ride the length of the street. Do not get off early to be modest; that insults the people with wands.',
      'Then take the wreath off yourself, indoors, and put it somewhere you will see it on bad days.',
    ],
  },
  'seven-of-wands': {
    brought: [
      'You brought a rock to stand on and a wand to hold, and six other wands are coming up from below, and two of the people holding them are frogs, which I do not say lightly.',
      'You are above them. You are also outnumbered, and you are one, and you have noticed the arithmetic.',
    ],
    going: [
      'You are defending something, and it is worth it, and it is exhausting, and both of those are true at once.',
      'The light is behind you. That is the advantage of the rock; they cannot see your face. Keep it that way.',
    ],
    do: [
      'Hold the rock. Do not come down to argue; the rock is for not arguing.',
      'Rest the end of the wand on the stone. Nobody said you had to hold it in the air the entire time.',
    ],
  },
  'eight-of-wands': {
    brought: [
      'You brought eight wands coming through the air all at once, and you brought yourself crouching in the grass, looking up at them.',
      'You are not running. You have decided to see where they land. That is either brave, or the field is very flat.',
    ],
    going: [
      'Everything is arriving at the same time. Nothing is late, which is worse than late, because there is no gap.',
      'There is a star at the top of the picture. It is not moving. Everything else is.',
    ],
    do: [
      'Do not catch them. Let them land. Then pick them up in the order they lie.',
      'Answer the first one today. The rest were sent by the same hand; they will wait in the grass.',
    ],
  },
  'nine-of-wands': {
    brought: [
      'You brought a wand, and behind you eight more standing in the ground, and you brought a skull on the left that you have not mentioned.',
      'You are holding the ninth upright and leaning on it slightly. You have been standing guard a long time. The cloak is heavy.',
    ],
    going: [
      'You have nearly finished, and it has cost you, and the last part looks exactly like the first part, only you are more tired.',
      'There is a small creature on the right watching you. It is not an enemy. It has come to see whether you sit down.',
    ],
    do: [
      'Do not sit down yet. One more. Then sit for a long time; the fence will hold.',
      'Move the skull. Not far. Just out of the picture, where you keep looking at it.',
    ],
  },
  'ten-of-wands': {
    brought: [
      'You brought ten wands, all at once, over one shoulder, up the hill, barefoot, and you did not ask for help, and I can see that from here.',
      'You are looking at me from under the bundle. It is a look I know. It says the bundle is fine.',
    ],
    going: [
      'You are carrying everything, and you are carrying it well, and that is why nobody has offered to take any.',
      'The moon is up. You have been walking since before it was. The hill has not got shorter.',
    ],
    do: [
      'Put two down. Here, by the table. I will keep them; I have a shelf.',
      'Then carry eight. Eight is still a lot. It is also a number you can count in one look.',
    ],
  },
  'page-of-wands': {
    brought: [
      'You brought a wand, upright, and a desert to stand in, and a sun with a face that is watching you hold the wand.',
      'You are looking at the top of the wand. Something is growing on it. You have not decided whether you are allowed to be pleased.',
    ],
    going: [
      'You have a message, and it is small, and it is yours, and you are standing in a large empty place with it, which makes it feel larger.',
      'The sun in this picture is not looking at the desert. It is looking at the wand. So is everyone.',
    ],
    do: ['Deliver it. Go the way the sand is flat.', 'Do not improve the message on the road. The road is where messages get improved into nothing.'],
  },
  'knight-of-wands': {
    brought: [
      'You brought a black horse on its back legs, a wand in the air, and a plan that was made on the horse.',
      'The moon is a crescent. You left early. You leave early; the card knows.',
    ],
    going: [
      'You are going somewhere with enthusiasm, and the horse has not been told where, which the horse has noticed.',
      'The sand is moving under the hooves. That is not a warning; that is sand. Sand does that. You are fine.',
    ],
    do: [
      'Go. But set the horse down on four feet first; the picture is nice, but four feet is faster.',
      'Tell one person where you are going. Not for permission. For the horse.',
    ],
  },
  'queen-of-wands': {
    brought: [
      'You brought a sunflower on a stick, and a lion, and a black cat, and they are both lying down, and you are the reason they are lying down.',
      'You have crossed your legs on the throne. It is your throne. You had it made to cross your legs on.',
    ],
    going: [
      'People are drawn to you, and you are drawn to be worth it, and the second is more work than the first, and you do it before breakfast.',
      'The cat on the right is watching the door. It is your cat. It watches so that you do not have to.',
    ],
    do: [
      'Hold the sunflower higher. That is not vanity; it is a flower, and flowers are for pointing.',
      'Let the lion sleep. You do not need it awake to be who you are.',
    ],
  },
  'king-of-wands': {
    brought: [
      'You brought a wand with a crown on the end of it, which is a lot of crown, and two lions, one of which is a cub, which is a lot of lion.',
      'The mountains behind you are the ones you came over. The cub has not seen them. You are deciding whether to tell it.',
    ],
    going: [
      'You are in charge of the fire, and you have been for some time, and the fire has begun to assume you will always be there.',
      'There is a creature flying at the top of the picture. Small. Leaving. You have seen it. You have let it.',
    ],
    do: [
      'Give the small lion something to guard. Something small. It will grow into the guarding.',
      'Then sit back in the chair. It has a back. You have been sitting on the edge of it for years.',
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------
export function positionKey(position) {
  if (typeof position === 'number') return POSITION_KEYS[position] ?? 'brought';
  if (POSITION_KEYS.includes(position)) return position;
  const i = POSITIONS.indexOf(position);
  return i >= 0 ? POSITION_KEYS[i] : 'brought';
}

export function linesFor(slug, position) {
  const card = CARDS[slug];
  const key = positionKey(position);
  if (!card) return [`I do not have a line for that card. It is called ${slug}.`, 'That has never happened before. I am noting it.'];
  return card[key].slice();
}

export function lineFor(slug, position) {
  return linesFor(slug, position).join(' ');
}

const TERMINAL = /[.!?…]$/;
function quoteVerbatim(text) {
  const t = text.trim().replace(/\s+/g, ' ');
  return TERMINAL.test(t) ? t : t + '.';
}
function firstSentence(text) {
  const m = text.trim().match(/^[^.!?…]*[.!?…]?/);
  return (m ? m[0] : text).trim();
}
const pick = (arr, n) => arr[Math.abs(n) % arr.length];

// The line that folds the visitor's answer back at them, or an interjection when they typed
// nothing, a paragraph, or a question. Deterministic for a given answer.
export function reply(raw) {
  const text = (raw ?? '').trim().replace(/\s+/g, ' ');
  const n = text.length;
  if (n === 0) return pick(interjections.empty, 0);
  const sentences = text.split(/[.!?…]+\s+/).filter((s) => s.trim().length > 0).length;
  if (n > 140 || sentences > 2) {
    const first = quoteVerbatim(firstSentence(text)).replace(/[.]$/, '');
    return pick(interjections.long, n).replace('{first}', first);
  }
  if (/\?$/.test(text)) return pick(interjections.question, n).replace('{answer}', text);
  return pick(answer, n).replace('{answer}', quoteVerbatim(text));
}

export const SCRIPT = {
  speaker: SPEAKER,
  positions: POSITIONS,
  positionKeys: POSITION_KEYS,
  greeting,
  question,
  answer,
  interjections,
  shuffle,
  draw,
  turn,
  reading: turn, // alias: the line said as each card is turned; the card's own lines come from lineFor()
  farewell,
  cards: CARDS,
  lineFor,
  linesFor,
  reply,
};
