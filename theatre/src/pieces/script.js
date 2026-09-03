// The script. Everything Tarot Pepe says, as data the flow can drive.
//
// Voice: formal, exact, short sentences. No mysticism, no exclamation marks. The humour is in
// the precision and the pauses. He is courteous the way a concierge is courteous; he notices
// small things about the visitor and says them plainly; he is a little melancholy and does not
// mention it. A caption is one breath: never more than twenty words.
//
// Shape:
//   SCRIPT.greeting / question / shuffle / draw / turn / farewell   arrays of captions, said in order
//   SCRIPT.answer                                                  templates; {answer} is the visitor's text, verbatim
//   SCRIPT.interjections.{empty,long,question,again}               when the visitor types nothing / a lot / a question
//   SCRIPT.cards[slug][brought|going|do]                          two captions per card per position (78 × 3 × 2)
//   lineFor(slug, position) → 'caption one. caption two.'          position: 0..2 | 'brought'|'going'|'do' | the label
//   linesFor(slug, position) → [caption, caption]
//   reply(answer) → the caption that folds the visitor's answer back

export const SPEAKER = 'Tarot Pepe';
export const POSITIONS = ['What you brought', 'What is actually going on', 'What to do about it'];
export const POSITION_KEYS = ['brought', 'going', 'do'];

// ---------------------------------------------------------------------------------------------
// The evening, beat by beat
// ---------------------------------------------------------------------------------------------
const greeting = [
  'Good evening. Please sit. The chair is low; it was made for a frog.',
  'I am Tarot Pepe. I read three cards. Not palms, not leaves, not faces, though I will look at yours.',
  'Nothing said here leaves the room. The room is small, so that is not saying much.',
];

const question = ['Tell me what you are carrying. One sentence. The second is usually the first one again, louder.'];

// The visitor's sentence, folded back verbatim. {answer} is replaced by reply().
const answer = [
  '“{answer}” I see. It has been said now. It is on the table, next to the ashtray.',
  '“{answer}” Thank you. You said it plainly. Most people bring it in wrapped.',
  '“{answer}” Yes. People bring that here. I will not pretend it is unusual, or small.',
];

const interjections = {
  empty: [
    'Nothing. Very well. Silence is the most common thing brought here, and the heaviest.',
    'You typed nothing. That is permitted. The cards have been read for less.',
  ],
  long: [
    'That was several sentences. I asked for one. We will take “{first}” and let the others wait in the hall.',
    'That is a paragraph. I have read it. We will proceed with “{first}”; the rest can stand by the door.',
  ],
  question: [
    '“{answer}” That ends in a question mark. The cards do not answer questions; they change them.',
    '“{answer}” A question. Fair. I will answer it with three pictures, which is what I have.',
  ],
  again: ['You have said that already. It is not less true the second time.'],
};

const shuffle = ['I shuffle seven times. Not for luck; seven is where it stops being the same deck.', 'Please do not help.'];

const draw = [
  'Three cards. Left to right: what you brought, what is actually going on, what to do about it.',
  'That is the whole method. I did not invent it, and I have not improved it.',
];

// Said as each card is turned, before its intertitle.
const turn = ['The first card. What you brought.', 'The second. What is actually going on.', 'The third. What to do about it.'];

const farewell = [
  'That is all the cards have. It is usually enough. Mind the step; it is lower than it looks.',
  'That is the reading. Take what fits and leave the rest on the table. Good night.',
  'We are finished. You may go, or sit a moment; the bench does not mind. Good night, either way.',
];

// ---------------------------------------------------------------------------------------------
// The cards. Two captions per position, each about the picture on the card and the person at
// the table. Keys: brought (what you brought), going (what is actually going on), do (what to do).
// ---------------------------------------------------------------------------------------------
const CARDS = {
  // ---- Major arcana -------------------------------------------------------------------------
  'the-fool': {
    brought: [
      'You came in with a stick over your shoulder and a bottle you have not opened.',
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
      'The figure wears a bow tie. He has dressed for a performance nobody has scheduled.',
    ],
    do: ['Pick one object up. Not the ball.', 'Then do the thing with it, in front of someone. There is no other part to the trick.'],
  },
  'the-popess': {
    brought: [
      'You brought a book you have already read, open at the page you already know.',
      'You came for confirmation. I regret that I do only readings.',
    ],
    going: [
      'You know the answer. You have known it since the hall.',
      'The moon in this picture is keeping quiet. So is the book. So, I suspect, are you.',
    ],
    do: ['Say the thing you know out loud, once, to one person.', 'Then close the book. It will still be there; that is what books are for.'],
  },
  'the-empress': {
    brought: [
      'You brought a garden. Wheat, sunflowers, and one small frog near the hem.',
      'You are tired in the way of people who grow things for others.',
    ],
    going: [
      'Everything you planted is coming up. That is why you cannot see the ground.',
      'It is abundance. Abundance is also a great deal of work, and nobody says so.',
    ],
    do: ['Sit on the throne. It was drawn for sitting.', 'Let one thing ripen without checking it. Start with the frog.'],
  },
  'the-emperor': {
    brought: [
      'You brought a chair, a sceptre and a set of rules to a place that had not asked for them.',
      'There are two spare orbs on the floor. You carry more authority than the situation holds.',
    ],
    going: [
      'Someone has to be in charge, and you have decided it is you. You may be right.',
      'Behind the throne are mountains, and they are not moving. Neither are you. It is a standoff with geology.',
    ],
    do: ['Give one order, clearly. Then stop giving orders.', 'Put one orb down. You will not miss it; nobody counts orbs.'],
  },
  'the-pope': {
    brought: [
      'You brought a question about the proper way to do something, and two people kneeling who already agree.',
      'You are wearing the tall hat. I am not sure who gave it to you.',
    ],
    going: [
      'There is a right way. You know it. It is old, and it works.',
      'It is also dull, and you were hoping I would excuse you. I do not have that hat.',
    ],
    do: [
      'Do it the established way, this once, all the way through.',
      'If the established way is wrong, you will know by Thursday. That is faster than arguing.',
    ],
  },
  'the-lovers': {
    brought: [
      'You brought a choice, dressed as a romance so it would be harder to refuse.',
      'Two figures holding hands, and an angel above them who has not been introduced.',
    ],
    going: [
      'Two things want you. That is flattering. It is also arithmetic.',
      'The card is misprinted at the bottom. The choice is real, whatever it is called.',
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
      'You brought a case. There are two sets of scales in this picture; you brought the spare.',
      'You would like a verdict. You would like it to be the one you have already reached.',
    ],
    going: [
      'It is fair. That is the news, and it is not the news you wanted.',
      'There is no sword in this version of the card. The cutting is up to you.',
    ],
    do: ['Weigh it once more, honestly, with the small scales.', 'Then accept the number. Do not weigh it a third time; the third time is hoping.'],
  },
  'the-hermit': {
    brought: [
      'You brought a lantern and a rock to sit on. You have sat a while; the mountains have grown.',
      'You came alone and you are proud of that. You are also here, which is company.',
    ],
    going: [
      'You went quiet to think. The thinking has finished. You kept the quiet out of habit.',
      'There are two moons in this sky. Even the hermit has doubled something.',
    ],
    do: [
      'Come down with the lamp. It was for the road, not the rock.',
      'Speak to one person before the week ends. A short sentence will do; you have had practice.',
    ],
  },
  'wheel-of-fortune': {
    brought: [
      'You brought a run of luck. Good or bad is not decided; it has not stopped.',
      'There are cards on the ground under the wheel. Somebody was reading them when it turned.',
    ],
    going: [
      'The wheel is turning. You are neither at the top nor the bottom. You are on the hard-to-see part.',
      'The figure at the side reads a book while it turns. That is one method, and not a bad one.',
    ],
    do: ['Do not push the wheel. Pushing only shows the wheel where your hands are.', 'Write down what is on top today. In a month you will not believe it.'],
  },
  strength: {
    brought: [
      'You brought a lion. Your hand is on its head, quite gently, and you are pretending that is normal.',
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
      'You brought a pause, upside down, so it would look like an accident.',
      'Your hands are open. You are not holding on; you are being held. There is a difference.',
    ],
    going: [
      'Nothing is happening, on purpose. The rope is at the waist, not the neck; a wait, not a sentence.',
      'From there the room is upside down, and you have started to prefer it.',
    ],
    do: ['Stay a little longer than is comfortable. Not much.', 'Then untie the knot yourself. It is at the waist. You have always been able to reach it.'],
  },
  death: {
    brought: [
      'You brought an ending, on a white horse, so it has arrived quite calmly.',
      'You expected worse. It is a rider with a flag, and the flag has a flower on it.',
    ],
    going: [
      'Something is over. It was over before you sat down; the horse is already in the picture.',
      'The people kneeling are not being punished. They are getting out of the way, which is polite.',
    ],
    do: [
      'Let it end. Do not organise a second ending for it later; one is sufficient.',
      'Then look at the river behind the horse. It is still going somewhere. That was always the other half.',
    ],
  },
  temperance: {
    brought: [
      'You brought two cups, and you are pouring both, with your feet in the river.',
      'You have wings in this picture. You are not using them. You are standing very still with the cups.',
    ],
    going: [
      'You are mixing two things that do not want to mix, patiently, and nobody is watching.',
      'The sun is going down behind you. This is evening work; it does not look like much.',
    ],
    do: ['Pour slower. That is the whole instruction; I would pad it if I could.', 'Keep the feet in the water. The cold is part of the measure.'],
  },
  'the-devil': {
    brought: [
      'You brought a chain, and two small hooded frogs on the end of it who could leave and have not.',
      'You are holding a torch. You brought your own light to the thing you are ashamed of.',
    ],
    going: [
      'The chain is loose. It is loose on everybody in this picture, including the one on the throne.',
      'It is a habit, dressed as a devil. Habits like to be drawn with horns; it flatters them.',
    ],
    do: ['Lift one foot. Notice the shackle comes with it. That is the whole discovery.', 'Then walk out slowly. Leave the torch; the room can keep it.'],
  },
  'the-house-of-god': {
    brought: [
      'You brought a building that is on fire, and you would like to discuss the roof.',
      'There is a frog in the sun watching the tower go. It looks as though it has seen this before.',
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
      'You brought two jugs, and you are pouring one back into the pool it came from.',
      'Under all those stars you are the only one kneeling, and it does not look like defeat.',
    ],
    going: [
      'The worst part has passed. You have not noticed, because the worst part left no card.',
      'There are eight stars here and one is very large. It is the first certain thing in some time.',
    ],
    do: ['Keep pouring. Both jugs. Do not measure it.', 'Look up once. The big one is still there. Then get on with the jugs.'],
  },
  'the-moon': {
    brought: [
      'You brought a night. Two towers, a dog, a crab, and a figure whose head has gone behind the moon.',
      'That figure is you. You have been walking without your head for a while; the crab noticed.',
    ],
    going: [
      'You cannot see it clearly, and you have decided that means it is bad. It means it is dark.',
      'The moon in this picture has a face. It is looking at you. So is the dog.',
    ],
    do: ['Do nothing decisive at night. Write it down and read it at breakfast.', 'Follow the dog. The crab has its own plans.'],
  },
  'the-sun': {
    brought: [
      'You brought a horse, a banner, a field of sunflowers, and a sun with a very large face.',
      'You are sitting on the horse without a saddle. You are that comfortable, and it worries you.',
    ],
    going: [
      'It is going well. That is what the card says. It does not say it often.',
      'The sun is smiling. It is not a trick. Suns are not clever enough for tricks.',
    ],
    do: ['Enjoy it in public. Privately enjoyed good fortune goes off, like milk.', 'Let the horse choose the pace. It knows the field.'],
  },
  judgement: {
    brought: [
      'You brought a trumpet, and several people who have been lying down for some time.',
      'You have a call to make. You have been holding it near your mouth for a while now.',
    ],
    going: [
      'Something old has stood up and is looking at you. It is not angry. It is waiting to be counted.',
      'This is not the end. It is the register being taken.',
    ],
    do: ['Answer to your name. Out loud, the first time it is called.', 'Then stand with the others. They have been up a while; they know where the coats are.'],
  },
  'the-world': {
    brought: [
      'You brought a wreath and sat in it. Four creatures at the corners watched you do it. They approve.',
      'You have finished something. You set the finished thing on the table, quite carefully.',
    ],
    going: [
      'It is complete. That is rarer than the other cards would have you believe.',
      'You hold two wands and there is nothing to do with them yet. That is what finished feels like.',
    ],
    do: [
      'Take the applause of the bull, the lion, the eagle and the one with wings. That is the audience.',
      'Then step out of the wreath. The next one is drawn on a different card.',
    ],
  },

  // ---- Cups ---------------------------------------------------------------------------------
  'ace-of-cups': {
    brought: [
      'You brought a cup so large you are sitting in it. Only your head is above the rim.',
      'There are doves. Nobody asked for doves. They come with the cup.',
    ],
    going: [
      'Something has started that you did not arrange. It is warm. You are in it up to the neck.',
      'You look calm in the cup. Calm is usually surprise that has run out of moves.',
    ],
    do: ['Stay in. Do not get out to check the water; you are the water.', 'Let the doves do the announcing. They are drawn for it.'],
  },
  'two-of-cups': {
    brought: [
      'You brought another person. They are in the picture, in a different hood, touching a cup to yours.',
      'The snakes at the bottom are coiled and calm. You checked; I saw you look.',
    ],
    going: [
      'There are two of you and it is level. That is the rarest thing in the deck.',
      'Nobody is winning. That is the point. You keep looking for the score.',
    ],
    do: ['Raise the cup to the same height as theirs. Not higher; you will spill.', 'Say what the drink is for. Once. They will remember the once.'],
  },
  'three-of-cups': {
    brought: [
      'You brought two friends, and the three of you are standing in your cups.',
      'One of you is pink. Nobody has explained this. Nobody needs to.',
    ],
    going: [
      'It is a celebration, and you have not decided what for. That is the best kind.',
      'Everyone in the picture is laughing with their mouth open. Yours is a little late.',
    ],
    do: ['Go. Wear the shoes that are not sensible.', 'Do not organise the evening. It has three people in it; it will organise itself.'],
  },
  'four-of-cups': {
    brought: [
      'You brought a good coat and a bad mood, and sat under a tree to wear both.',
      'A hand comes out of the tree to offer you a cup. You have decided it is typical.',
    ],
    going: [
      'Three cups in front of you, and you are looking at none of them. A small refusal, well maintained.',
      'The sky has several moons. You have sat there long enough to see the extra ones.',
    ],
    do: ['Drink one of the three. Any one. There is no trick to which.', 'Then look at the tree. The hand was offering the cup. The cup was the tree.'],
  },
  'five-of-cups': {
    brought: [
      'You brought a black cloak and two spilled cups, at night, so the spill would look worse.',
      'There are cups still standing behind you. You have not turned around. It is a long cloak.',
    ],
    going: [
      'Something was lost. Something was also not lost. You are counting only the first pile.',
      'There is a bridge in the picture, over the river, to the house. It has been there the whole time.',
    ],
    do: ['Look at the cups that are standing. Count them out loud; three is a number you know.', 'Then cross the bridge. Wear the cloak; the spill is not on it.'],
  },
  'six-of-cups': {
    brought: [
      'You brought a memory in a cup, with flowers in it, and you are handing it to a smaller you.',
      'It is a village. It is your village. The cups on the ground are full of the same flowers.',
    ],
    going: [
      'Something from before is at the door. It is kind, it asks for nothing, and you do not trust it.',
      'You are giving the cup, not receiving it. Note which way your hands are drawn.',
    ],
    do: ['Accept the thing from before. Do not check its motive; it was a child.', 'Then pick one of the cups off the ground. Flowers do not care whose they were.'],
  },
  'seven-of-cups': {
    brought: [
      'Seven cups in a cloud, one with a snake in it, and your hands folded under your chin.',
      'There is a castle in one cup and a shrouded figure in another. You have wanted both.',
    ],
    going: [
      'You are choosing between things that have not happened. That is not choosing; that is shopping in a cloud.',
      'One of the cups is glowing. It is the plain one. It is always the plain one.',
    ],
    do: ['Take the plain one down from the cloud. Set it on the actual table.', 'Leave the snake where it is. That one comes to you regardless.'],
  },
  'eight-of-cups': {
    brought: [
      'You brought eight cups, arranged them, and walked toward the mountains without shoes.',
      'One cup stands apart from the others. You put it there. You did not take it with you.',
    ],
    going: [
      'You have already left. The body is in the parlour; the rest is on the road with a stick.',
      'The moon is watching you go. It has no opinion. It is a moon.',
    ],
    do: ['Keep walking. You have got as far as the middle of the card; the hard part was the first step.', 'Do not go back for the one cup. You know which one.'],
  },
  'nine-of-cups': {
    brought: [
      'You brought nine cups and a good tunic, and sat behind them with your arm on the table.',
      'You look pleased. You have been pleased for about a minute, and you want to know how to keep it.',
    ],
    going: [
      'You have what you asked for. That is what this card is. It comes with a table.',
      'The sun in the medallion above you is smiling. It is embroidered; it will not stop.',
    ],
    do: ['Drink from one. Do not display the nine; a display is for people who are not thirsty.', 'Then invite one person to the table. Nine cups is a lot for one arm.'],
  },
  'ten-of-cups': {
    brought: [
      'You brought a household. Five small ones walking on a rainbow, and a house with the door drawn open.',
      'You are holding one cup up to the rainbow. The rainbow has ten. You have done the sums.',
    ],
    going: [
      'It is a good life. It is happening now, while you sit with a fortune teller asking whether it will.',
      'The small ones are on the rainbow, not under it. They are fine; it is drawn to hold them.',
    ],
    do: ['Go home. That is the reading. The house is on the left; the door is open.', 'Do not count the cups again. Ten is the number. It was ten when you came in.'],
  },
  'page-of-cups': {
    brought: [
      'You brought a cup with a bird in it. You watch the bird. A grey frog watches you both.',
      'You have long hair in this picture, and a ruff. You have dressed for a feeling.',
    ],
    going: [
      'Something small and alive has turned up where the drink should be. It is not a problem; it is news.',
      'You are young in the card, whatever you are at the table. That is the card’s opinion, not an insult.',
    ],
    do: ['Let the bird out. Then keep the cup; it is a good cup.', 'Tell somebody about the bird today. Tomorrow it is a story; today it is a bird.'],
  },
  'knight-of-cups': {
    brought: [
      'You brought an offer on a horse, in armour, up on a plinth, so the offer would be higher.',
      'The horse is standing still. You have arrived; you are simply not sure at whose door.',
    ],
    going: [
      'You are being romantic about something practical, or practical about something romantic. The armour makes it hard to tell.',
      'The moon is up. Knights of this suit travel by it. They do not always arrive by it.',
    ],
    do: ['Get down off the plinth and hand the cup over at ordinary height.', 'Say what is in it. Plainly. The horse will wait; it is a very patient horse.'],
  },
  'queen-of-cups': {
    brought: [
      'You brought a throne to the beach and sat on it with a cup. Small round creatures came to look.',
      'You are listening. You have been listening a long time. It has weight.',
    ],
    going: [
      'Someone needs you to feel something on their behalf. That is why the cup is full and you look tired.',
      'The sea is behind you. You have not gone in. You are the one who stays with the towels.',
    ],
    do: ['Put the cup down on the arm of the throne. It has an arm. That is what it is for.', 'Feel one thing that is yours. It will feel unfamiliar; that is how you will know.'],
  },
  'king-of-cups': {
    brought: [
      'You brought a throne on a rock in the sea, and you sit on it very steadily while everything moves.',
      'Two creatures are in the water beside you. You have not looked at them. You know they are there.',
    ],
    going: [
      'You are being calm for other people. It works. It costs you, and you have not sent the bill.',
      'The cup is raised. Not drunk from. Raised. That is how this king holds things: up, and not for long.',
    ],
    do: ['Drink from the cup. Yours, not the household’s.', 'Let one wave reach the rock. Get the hem wet. Nobody is watching the hem.'],
  },

  // ---- Pentacles ----------------------------------------------------------------------------
  'ace-of-pentacles': {
    brought: [
      'You brought an offer of money, or of something that behaves like money, from a hand in a cloud.',
      'You are reaching for it from a sitting position. You are not standing up for it.',
    ],
    going: [
      'Something solid is available. It is being held out. Hands in clouds do not hold things out for long.',
      'There is a second, smaller coin near the ground. You have not noticed it. That one is already yours.',
    ],
    do: ['Stand up and take the coin. Say thank you to the cloud; it costs nothing.', 'Then put it in the ground. It is that kind of coin. The river will do the rest.'],
  },
  'two-of-pentacles': {
    brought: [
      'You brought two coins, one in each hand, at exactly the same height, which is very tiring.',
      'Behind you there are ships. They manage the sea by moving with it. You manage two coins by not moving.',
    ],
    going: [
      'You are keeping two things going and calling it balance. It is a hold. It has been for months.',
      'The figure of eight behind your hands is the sign for forever. It means the juggling has no scheduled end.',
    ],
    do: ['Put one coin in your pocket. You have a pocket; I checked the robe.', 'Move like the ships. Slightly. The sea does not mind.'],
  },
  'three-of-pentacles': {
    brought: [
      'You brought a plan on a piece of paper, and two other people with opinions about the plan.',
      'The three of you are in a church, pointing at the arch. A very good arch. Not finished.',
    ],
    going: [
      'The work is good and it needs the others. You wanted it to need only you. It is better so.',
      'You hold the drawing. The other two look at the wall. That is the correct arrangement, for now.',
    ],
    do: ['Let the person with the stick point. Then do what they point at.', 'Sign the drawing with all three names. It is a bigger arch that way.'],
  },
  'four-of-pentacles': {
    brought: [
      'You brought one coin, held against your chest with both hands, past two more on the floor.',
      'You are barefoot on a stone floor, holding money. You have decided the money is worth the cold.',
    ],
    going: [
      'You are keeping it safe. It is so safe it has stopped being money and become a thing you hold.',
      'The moon in this picture has seen you count. It is not impressed; moons count by themselves.',
    ],
    do: ['Spend one. Not a big one. The small one at your feet.', 'Then unfold your arms. The coin will still be there. It was the arms that were tired.'],
  },
  'five-of-pentacles': {
    brought: [
      'You brought the snow. Two of you in thin cloaks, walking past a house where the lamps are lit.',
      'You did not knock. Nobody came to the window either. It was a draw; you counted it as a loss.',
    ],
    going: [
      'It is hard right now. It is also passing a lit house. You are only looking at one of those.',
      'The other one in the snow is walking with you. You have not said much. You are saving the warmth.',
    ],
    do: ['Knock. If nobody answers, knock on the next one. The card shows only the first house.', 'Share the cloak. Two thin cloaks together are a thick one; that is arithmetic, not comfort.'],
  },
  'six-of-pentacles': {
    brought: [
      'You brought a set of scales and a handful of coins, and two people kneeling to receive them.',
      'You are giving. You are also weighing while you give. The kneeling ones can see both hands.',
    ],
    going: [
      'Money is moving from one hand to another and everyone is being very polite about it. That is the problem.',
      'Standing or kneeling, the card does not say which you are. Either way, you are keeping count.',
    ],
    do: ['Put the scales down and give with the free hand. Or receive with it; the hand does both.', 'Do not remember the number afterwards. If you must remember something, remember the coat.'],
  },
  'seven-of-pentacles': {
    brought: [
      'You brought a hoe, a stool, a field you have already dug, and the sitting down that follows.',
      'The plant has seven coins on it. You are looking at it as if it owes you the eighth.',
    ],
    going: [
      'It is growing. Slowly, as real things grow. You are impatient in a manner the plant does not recognise.',
      'The wheelbarrow is empty. That is not failure; that is the part of the season where the barrow is empty.',
    ],
    do: ['Sit on the stool for the rest of the day. That is harder than the digging.', 'Do not pull the plant up to check the roots. That leaves a plant in your hand, and a hole.'],
  },
  'eight-of-pentacles': {
    brought: [
      'You brought a chisel, a bench, eight coins in various states of finished, and a candle, because you work late.',
      'You are on the eighth. It looks like the first. That is the point; you are tired of knowing it.',
    ],
    going: [
      'It is practice. It is not glamorous. It is what glamorous is made of, later, by other people.',
      'One of the coins on the bench is black. You made that one earlier. You keep it in view. Good.',
    ],
    do: ['Do the next one. Not better; the same. Better comes from the same, done again, on a Tuesday.', 'Trim the candle. You have been working in bad light for a while and calling it focus.'],
  },
  'nine-of-pentacles': {
    brought: [
      'You brought a good robe and a vineyard, and a small bird that sits on your hand because you asked.',
      'You are alone in the rows. You arranged that, carefully. Now you are checking whether it was a mistake.',
    ],
    going: [
      'You have enough. Enough is a strange amount; it feels like waiting. It is not waiting.',
      'The bird stays because the hand is still. That is the whole arrangement, and it is a good one.',
    ],
    do: ['Walk the rows once, slowly, without picking anything.', 'Let the bird go if it wants. The vineyard is unchanged either way.'],
  },
  'ten-of-pentacles': {
    brought: [
      'You brought your whole family. They are all in the card; two of them are dogs.',
      'There is an old one sitting to the side, holding a small animal. You are looking at that one.',
    ],
    going: [
      'It is the long thing: the house, the name, somebody’s grandfather’s money. It goes on with or without you.',
      'Everyone in the picture is looking in a different direction. That is what a family is. The card is accurate.',
    ],
    do: ['Sit with the old one for a while. Not to say anything. To be counted in the picture.', 'Then do your part of the long thing, which is small, and which nobody else can do.'],
  },
  'page-of-pentacles': {
    brought: [
      'You brought one coin on a stick and are holding it up to the light, in a field, alone.',
      'A second coin lies in the water by your feet. You missed it; you were busy with the stick.',
    ],
    going: [
      'You have found the start of something practical. You are studying it before it is a thing. Correct order.',
      'The reeds are tall around you. You are not lost; you are at the height where reeds are tall.',
    ],
    do: ['Learn the thing on the stick properly. Not the idea of it. The thing.', 'Then pick the other coin out of the river. It is cold, and it is yours.'],
  },
  'knight-of-pentacles': {
    brought: [
      'You brought a horse you have not moved. You sit in a field, looking at a coin on a pole.',
      'You are in full armour for a job that involves standing still. That is thorough.',
    ],
    going: [
      'Nothing is wrong. Nothing is fast either. The slow, correct thing looks like nothing from the road.',
      'The horse is patient. You chose that horse. You know why.',
    ],
    do: ['Stay on the horse. Move one field over before the light goes.', 'Do not look at the coin on the pole again; you have seen it. Look at the furrow.'],
  },
  'queen-of-pentacles': {
    brought: [
      'You brought a throne to a field, and small creatures came to sit at your feet because you feed them.',
      'You hold the coin on its stick like a mirror. You have been checking it for the others, not yourself.',
    ],
    going: [
      'Everything you keep is alive and fed, and the feeding is the whole day, and you have not eaten.',
      'The sun above you is looking down at the throne rather kindly. It has seen the work.',
    ],
    do: ['Eat first. Then feed the creatures. The order matters more than you think; they will wait.', 'Turn the coin around and look at your own side of it once.'],
  },
  'king-of-pentacles': {
    brought: [
      'You brought a crown, a castle, a stack of coins by the chair, and bare feet.',
      'You hold one coin to the light and turn it. You know its worth. You are checking that it knows.',
    ],
    going: [
      'It is done, the building of it. The castle is behind you; the coins are counted; the bird is leaving.',
      'You are who people mean when they say they will ask someone. That is a heavy chair, with no cushion.',
    ],
    do: ['Give one coin to someone who cannot return it. It is the only spending left to you that is interesting.', 'Put your shoes on. The floor is stone; a king with cold feet makes cold decisions.'],
  },

  // ---- Swords -------------------------------------------------------------------------------
  'ace-of-swords': {
    brought: [
      'You brought a sword out of a cloud, point up, wreathed. You hold it very still because it is sharp.',
      'You have had a clear thought. It is in your hand. It has frightened you slightly.',
    ],
    going: [
      'You know exactly what is true. The knowing is what changed, not the truth; the truth has been sitting there.',
      'The wreath on the blade is for a victory that has not been fought yet. Swords arrive early.',
    ],
    do: ['Say the true thing in one sentence. Then stop. The second sentence is where the cutting starts.', 'Hold it by the handle. This sounds obvious; it is the most common mistake in the suit.'],
  },
  'two-of-swords': {
    brought: [
      'You brought two swords and a blindfold, and sat on a rock with the sea behind you, swords crossed.',
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
      'You brought a heart with three swords in it, and you sit on top of it, in the rain.',
      'The card is misprinted at the top. The word is nearly another word. You keep almost naming yours too.',
    ],
    going: [
      'It hurts. It is meant to. This is the one card in the deck that is not a metaphor.',
      'Rain and lightning behind you, and a moon. The weather is not about you. That is the small, hard comfort.',
    ],
    do: ['Take one sword out. Any one. Keep the other two for the moment; three at once is surgery.', 'Then let it rain on it. That is what the drops are drawn for. Do not wipe them.'],
  },
  'four-of-swords': {
    brought: [
      'A stone bed in a stone room, four swords lined up before it, and you on it, chin in hand.',
      'You are not asleep. You are lying down with your eyes open, which is the tiring kind.',
    ],
    going: [
      'You need rest, and you have set the room up for it, and now you are watching the door.',
      'The swords point down. Nothing in this room is coming for you. It is the safest place in the deck.',
    ],
    do: ['Close your eyes on the stone. It will hold you; that is what stone does.', 'Leave the swords where they are. Standing up. They are a fence, not a threat.'],
  },
  'five-of-swords': {
    brought: [
      'You brought a victory, and two swords that were not yours, and a look that says you know that.',
      'There are two others in the picture. One is walking away. One is watching you from the edge.',
    ],
    going: [
      'You won, and it cost you the people you won in front of. That is the exchange rate here.',
      'The swords on the ground are the ones nobody wanted to carry home. There are always some.',
    ],
    do: ['Give one sword back. Not as an apology; as a weight you do not need.', 'Then leave the field. Fields where you won are not good places to stay. The grass remembers.'],
  },
  'six-of-swords': {
    brought: [
      'You brought a boat with six swords standing in it, and yourself as ferryman, since nobody else was drawn.',
      'You are rowing without looking back. You look at me instead, which is a way of not looking back.',
    ],
    going: [
      'You are leaving quietly, and it is going well. The swords stay in; pulling them out lets the water in.',
      'There is a lighthouse ahead. It is small in the picture. It gets bigger.',
    ],
    do: ['Keep rowing. Even strokes. Do not count them.', 'When you land, leave the swords in the boat. They kept the water out; that job is done.'],
  },
  'seven-of-swords': {
    brought: [
      'Five swords in your arms, two left standing in the field behind you, and you are looking over your shoulder.',
      'It is night. There are tents. There is a candle somebody left lit. You are being very quiet.',
    ],
    going: [
      'You are getting away with something. You are also carrying five swords, which is not getting away with much.',
      'The two you left behind are the honest ones. You knew which ones to leave.',
    ],
    do: ['Put the swords down. Not all of them; the ones that are not yours. It will be most of them.', 'Then walk back past the candle. Slowly, so the tents can see. That is the whole of the repair.'],
  },
  'eight-of-swords': {
    brought: [
      'You brought a set of bindings, already tied, and your eyes shut, which was your own addition.',
      'Eight swords around you and none of them touching you. There is a gap on the left. There always was.',
    ],
    going: [
      'You are stuck in a way that is mostly cloth. Cloth is not stone. You know; your eyes are shut.',
      'The moon is full and there are stars on it. Someone drew you a good night to be stuck in.',
    ],
    do: ['Open your eyes. Just that. Do not stand up yet; you will fall.', 'Then turn left. Then walk. The swords do not move; that is the thing about swords stuck in sand.'],
  },
  'nine-of-swords': {
    brought: [
      'A bed, three in the morning, your hand over your face, nine swords on the wall. You brought it all.',
      'There is a small bottle by the bed. You have not opened it. You have moved it closer, twice.',
    ],
    going: [
      'Nothing has happened. That is why you are awake; the swords are on the wall, not in the bed.',
      'There is a sun with a face among the swords. Morning is in the picture; it is simply not next.',
    ],
    do: ['Lie down. You will not sleep, but lying down is a different kind of not sleeping, and it is better.', 'In the morning, count the swords. There will be nine. Nine is fewer than it felt.'],
  },
  'ten-of-swords': {
    brought: [
      'You brought a body with ten swords in it, face down, under a black sun. You are sitting up.',
      'Ten is more than necessary. One does it. Whoever did this wanted to be sure, and it is over.',
    ],
    going: [
      'It ended as badly as it could. You are at this table. That is the good news; it is plenty.',
      'The sun is black. That is a picture of a night. Nights are the ones that end.',
    ],
    do: ['Do nothing. Lie there. This is the one card where lying there is the instruction.', 'Tomorrow, remove one sword and keep it. You will want to describe this later; a sword is a good description.'],
  },
  'page-of-swords': {
    brought: [
      'A sword, a ruff, one hand on the hip, a great deal of wind. The hair came with the card.',
      'You are standing up straight with the point in the grass. You are ready. Nobody has told you what for.',
    ],
    going: [
      'You have something to say and are looking for someone to say it to. The sun is not the someone.',
      'The clouds behind you move fast. You move faster. It is not a race, and you are winning it.',
    ],
    do: ['Say it to the right person, once, without the hand on the hip.', 'Keep the point in the ground until then. A raised sword is a question; a planted one is a fact.'],
  },
  'knight-of-swords': {
    brought: [
      'You brought a horse at full speed, a sword in the air, and a cape going the other way.',
      'You have a plan. You did not bring it. It is somewhere behind the horse.',
    ],
    going: [
      'You are charging. Charging is right about a third of the time, and you have used two thirds this month.',
      'The sun has a face, and it is watching the horse, not you. That is the first sign.',
    ],
    do: ['Lower the sword to the horizontal. Keep the speed.', 'Look where the horse’s front feet will land. That is not cowardice. That is riding.'],
  },
  'queen-of-swords': {
    brought: [
      'You brought a clear head and a sceptre with spikes on it, and a border between you and the weather.',
      'You hold no sword. You hold a thing like a snowflake that would hurt. You have thought about that.',
    ],
    going: [
      'You see it plainly. Plainly is cold. People have told you so; they were right, and so were you.',
      'The clouds are outside your frame. You put the frame there. It is good work; it is also a frame.',
    ],
    do: ['Say the plain thing in the fewest words that are still kind. You can count them.', 'Then let one cloud in. One. On purpose. The collar is fur; you will manage.'],
  },
  'king-of-swords': {
    brought: [
      'You brought a crown, a sword and a small coin. The coin is on the floor, beneath the sword’s notice.',
      'The card says KING at the top, in case there was doubt. There was not. You brought the doubt anyway.',
    ],
    going: [
      'You are being asked to decide for other people, and you are right, and being right has made you lonely.',
      'The sword is straight up, pointed at nobody, where everyone can see. That is the job; it tires the arm.',
    ],
    do: ['Decide it. Say the decision in one sentence, then the reason in one more. Then no more sentences.', 'Pick up the coin. Small things on the floor are how kings are judged, later, by the ones who sweep.'],
  },

  // ---- Wands --------------------------------------------------------------------------------
  'ace-of-wands': {
    brought: [
      'You brought a sapling, roots and all, and you hold the stem with both hands as if it might leave.',
      'You are not wearing much in this picture. An idea does that. It arrives before the clothes.',
    ],
    going: [
      'Something new is in your hand and it has roots. It came from the ground; it is not a wish.',
      'Clouds on both sides and the light in the middle. That is not weather; that is a beginning, drawn honestly.',
    ],
    do: ['Plant it today. Not on the good spot; on the spot you have.', 'Then let go of the stem. It will stand. That is what roots are.'],
  },
  'two-of-wands': {
    brought: [
      'You brought the world, a small wire one, and hold it between two posts as if it were for sale.',
      'You have already done the first thing. You are standing between two posts; the posts were the first thing.',
    ],
    going: [
      'You are choosing where next, with the whole globe to choose from. It is smaller than you thought, and heavier.',
      'The sea behind you is calm. Calm seas are for looking at maps. You know that; you are doing it.',
    ],
    do: ['Put a finger on the globe. Anywhere. Then go there, or write there, which is going, done slowly.', 'Leave one post behind. You cannot take both; that is what posts are for.'],
  },
  'three-of-wands': {
    brought: [
      'A view of the sea with ships on it, three wands in a row, a small frog at your feet.',
      'Your back is to me. Your back is to the frog. You are looking at boats that have already left.',
    ],
    going: [
      'Something you sent is on its way back. The card is the part where it is not here yet.',
      'Two moons in the sky, one full and one thin. You have been waiting long enough to see both.',
    ],
    do: ['Turn around. The frog has been trying to say something for a while. It is short; frogs are.', 'Then go back to the view. Waiting is work; do it with the wands, not against them.'],
  },
  'four-of-wands': {
    brought: [
      'You brought an arch with garlands on it, and you stand under it with your arms out, smiling.',
      'This is the one card in the deck where you look pleased. It suits you.',
    ],
    going: [
      'Something is being celebrated, and it is yours, and you are checking the garlands instead of standing under them.',
      'The four posts are solid. They were put in properly. Somebody did that; perhaps it was you.',
    ],
    do: ['Stand under it. The whole song.', 'Invite the people who put the posts in. They know where the food is.'],
  },
  'five-of-wands': {
    brought: [
      'You brought four other people with sticks, all talking, and you in the middle holding yours sideways, quiet.',
      'It is not a fight. It is a meeting that has sticks. You can tell by the faces.',
    ],
    going: [
      'Everyone wants it done their way, so it is not being done, and the sticks are all in the air.',
      'You are the only one with your mouth shut. That is not wisdom; that is timing. It will do.',
    ],
    do: ['Lower your stick first. Just yours. Watch what the others do with theirs.', 'Then say the one sentence that ends the meeting. You have had it ready for some time.'],
  },
  'six-of-wands': {
    brought: [
      'You brought a wreath, a horse, and four people with wands who came to look at you on the horse.',
      'You point your wand at the sky. The others point theirs at nothing. It is a parade; you look uneasy.',
    ],
    going: [
      'You have won, and it is public. Public is the difficult part. Anybody can win in a room.',
      'The people around the horse are pleased. The card drew them pleased. Believe the card.',
    ],
    do: ['Ride the length of the street. Do not get off early to be modest; that insults the people with wands.', 'Then take the wreath off yourself, indoors, and put it somewhere you will see it on bad days.'],
  },
  'seven-of-wands': {
    brought: [
      'A rock to stand on, a wand to hold, six wands coming up from below, two held by frogs.',
      'You are above them. You are also outnumbered, and you have noticed the arithmetic.',
    ],
    going: [
      'You are defending something. It is worth it, and it is exhausting, and both of those are true at once.',
      'The light is behind you. That is the rock’s advantage; they cannot see your face. Keep it that way.',
    ],
    do: ['Hold the rock. Do not come down to argue; the rock is for not arguing.', 'Rest the end of the wand on the stone. Nobody said you had to hold it up the entire time.'],
  },
  'eight-of-wands': {
    brought: [
      'You brought eight wands coming through the air all at once, and yourself crouching in the grass, looking up.',
      'You are not running. You have decided to see where they land. Brave, or the field is very flat.',
    ],
    going: [
      'Everything is arriving at the same time. Nothing is late, which is worse than late, because there is no gap.',
      'There is a star at the top of the picture. It is not moving. Everything else is.',
    ],
    do: ['Do not catch them. Let them land. Then pick them up in the order they lie.', 'Answer the first one today. The rest were sent by the same hand; they will wait in the grass.'],
  },
  'nine-of-wands': {
    brought: [
      'A wand, eight more standing in the ground behind you, and a skull on the left you have not mentioned.',
      'You lean on the ninth a little. You have stood guard a long time. The cloak is heavy.',
    ],
    going: [
      'You have nearly finished, and it has cost you. The last part looks like the first; you are more tired.',
      'A small creature on the right watches you. Not an enemy. It has come to see whether you sit down.',
    ],
    do: ['Do not sit down yet. One more. Then sit for a long time; the fence will hold.', 'Move the skull. Not far. Just out of the picture, where you keep looking at it.'],
  },
  'ten-of-wands': {
    brought: [
      'Ten wands, all at once, over one shoulder, up the hill, barefoot, and you did not ask for help.',
      'You look at me from under the bundle. It is a look I know. It says the bundle is fine.',
    ],
    going: [
      'You are carrying everything, and carrying it well, and that is why nobody has offered to take any.',
      'The moon is up. You have been walking since before it was. The hill has not got shorter.',
    ],
    do: ['Put two down. Here, by the table. I will keep them; I have a shelf.', 'Then carry eight. Eight is still a lot. It is also a number you can count in one look.'],
  },
  'page-of-wands': {
    brought: [
      'A wand, upright, a desert to stand in, and a sun with a face watching you hold the wand.',
      'Something is growing at the top of the wand. You have not decided whether you are allowed to be pleased.',
    ],
    going: [
      'You have a message. It is small, it is yours, and you stand in a large empty place with it.',
      'The sun in this picture is not looking at the desert. It is looking at the wand. So is everyone.',
    ],
    do: ['Deliver it. Go the way the sand is flat.', 'Do not improve the message on the road. The road is where messages get improved into nothing.'],
  },
  'knight-of-wands': {
    brought: [
      'A black horse on its back legs, a wand in the air, and a plan made on the horse.',
      'The moon is a crescent. You left early. You leave early; the card knows.',
    ],
    going: [
      'You are going somewhere with enthusiasm, and the horse has not been told where, which the horse has noticed.',
      'The sand is moving under the hooves. That is not a warning; that is sand. You are fine.',
    ],
    do: ['Go. But set the horse down on four feet first; four feet is faster.', 'Tell one person where you are going. Not for permission. For the horse.'],
  },
  'queen-of-wands': {
    brought: [
      'A sunflower on a stick, a lion, and a black cat. Both animals lie down, and you are the reason.',
      'You have crossed your legs on the throne. It is your throne. You had it made for crossing legs on.',
    ],
    going: [
      'People are drawn to you, and you work to be worth it. That is harder; you do it before breakfast.',
      'The cat on the right watches the door. It is your cat. It watches so you do not have to.',
    ],
    do: ['Hold the sunflower higher. That is not vanity; it is a flower, and flowers are for pointing.', 'Let the lion sleep. You do not need it awake to be who you are.'],
  },
  'king-of-wands': {
    brought: [
      'A wand with a crown on the end, which is a lot of crown, and two lions, one a cub.',
      'The mountains behind you are the ones you came over. The cub has not seen them yet.',
    ],
    going: [
      'You have been in charge of the fire for some time. The fire assumes you will always be there.',
      'A creature is flying at the top of the picture. Small. Leaving. You have seen it, and let it.',
    ],
    do: ['Give the small lion something to guard. Something small. It will grow into the guarding.', 'Then sit back in the chair. It has a back. You have sat on the edge of it for years.'],
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

// The caption that folds the visitor's answer back at them, or an interjection when they typed
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
  reading: turn, // alias: the caption said as each card is turned; the card's own captions come from linesFor()
  farewell,
  cards: CARDS,
  lineFor,
  linesFor,
  reply,
};
