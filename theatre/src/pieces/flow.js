// PIECE: flow — the whole evening, beat by beat: title → the parlour → Pepe greets → the question
// → the shuffle → the deal → three turns, each read → the farewell → closing card.
// Drives the other pieces; owns nothing visual itself. API: start(ctx), setState(beat).
export const meta = {
  name: 'flow',
  judge: { shot: 'home', states: ['title', 'greeting', 'question', 'shuffle', 'dealt', 'reading', 'farewell'] },
  files: ['src/pieces/flow.js'],
};

const wait = (ctx, seconds) =>
  new Promise((res) => {
    const end = ctx.clock.raw + seconds;
    const tick = () => (ctx.clock.raw >= end ? res() : requestAnimationFrame(tick));
    tick();
  });

export async function build(ctx) {
  const P = ctx.pieces;
  const pick = () => ctx.rng.shuffle(P.cards.DECK).slice(0, 3).map((c) => c.slug);
  const api = {
    beat: 'idle',
    async start() {
      api.beat = 'title';
      P.camera.cut('home');
      P.titles.title();
      await wait(ctx, 2.5);
      P.titles.hide();
      api.beat = 'greeting';
      await P.dialogue.say(P.dialogue.script.greeting[0]);
      api.beat = 'question';
      await P.dialogue.say(P.dialogue.script.question[0]);
      api.beat = 'shuffle';
      await P.dialogue.say(P.dialogue.script.shuffle[0]);
      P.sound.play('riffle');
      api.beat = 'dealt';
      await P.dialogue.say(P.dialogue.script.draw[0]);
      await P.reveal.deal(pick());
      await wait(ctx, 2);
      api.beat = 'reading';
      for (let i = 0; i < 3; i++) {
        P.reveal.turn(i);
        P.sound.play('flip');
        await wait(ctx, 0.8);
        await P.dialogue.say(P.dialogue.script.reading[0]);
      }
      api.beat = 'farewell';
      await P.dialogue.say(P.dialogue.script.farewell[0]);
      P.dialogue.clear();
      P.titles.setState('closing');
    },
    async setState(name) {
      P.titles.hide();
      P.dialogue.clear();
      if (name === 'title') P.titles.title();
      else if (name === 'greeting') P.dialogue.setState('greeting');
      else if (name === 'question') P.dialogue.setState('question');
      else if (name === 'shuffle') P.dialogue.setState('shuffle');
      else if (name === 'dealt') await P.reveal.setState('dealt');
      else if (name === 'reading') {
        await P.reveal.setState('revealed');
        P.dialogue.setState('reading');
      } else if (name === 'farewell') {
        await P.reveal.setState('revealed');
        P.dialogue.setState('farewell');
      }
    },
  };
  return api;
}
