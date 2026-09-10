// flow-flip.js — THE READING, FLIPPED. The visitor reads for HIM.
//
// The user: "We have to be able to flip the reading so the user can pull a tarot for pepe."
//
// WHERE IT COMES FROM. Nowhere on the notice, and nothing in the room advertises it: it is found by
// offering. The visitor says it in their own words — "let me read for you", "your turn", "I'll read
// your cards", "pull a card for you" — and the server puts a third lever within his reach for that
// turn only (`let_them_read`, server/pepe.mjs, gated by offersToRead exactly as `deal_cards` is
// gated by asksForCards). The lever is HIS: he may take the offer or he may decline in words, and
// nothing in the room moves until he pulls it. `mind.turn` reports the intent `flip` when he does.
//
// WHAT THE ROOM DOES. Everything it does for an ordinary reading, up to the moment the first card
// is turned: the deck goes over under both palms, is washed round the cloth, and the visitor takes
// three straight out of the wash. That whole piece of business is flow.js's `drawing()` and it is
// not copied here — `drawing(token, nth, sentences, { flip: true })` runs the same wash, the same
// hand-over, the same three picks, and only the part after the gather is this file's.
//
// AND THEN IT IS THE OTHER WAY ROUND. Each card is turned by his hand and named by its own
// intertitle, as always. Instead of him reading it, the FIELD OPENS — under a line of his asking
// what it says — and the visitor writes the reading. He answers it as the querent: what lands,
// what he doubts. Three cards, and then he says what he takes from the three of them and hands the
// evening back.
//
// NOTHING IN IT IS SCRIPTED. Every line of his here is the mind's, written this evening, for these
// three cards and these three readings: the beats are `flip-ask`, `flip-hear` and `flip-close`
// (server/pepe.mjs, `situation`), and the written brain answers all three with silence on purpose.
// With no live voice the beats say nothing at all and the field simply opens under the card's own
// name, which is a frame that still works: a card, its title, and a place to write what you make
// of it.
//
// THE CARDS ARE HIS FROM THE MOMENT THE LEVER FIRES (`mind.flipped`), so the room's one sentence
// about the table — the only way he knows what is on the cloth — says whose they are for the rest
// of the evening: the readings back at him, a second look at them, the talk afterwards. The
// transcript and the sheet the visitor takes away carry the exchange exactly as it happened: their
// readings in ink, his answers in his green, because the two registers already work that way.
//
// The camera: the card's own insert for the intertitle and for the field under it, his plate for
// his answer to it, and `home` for the last line and the conversation that follows.

// How long the field stays open under one card. Longer than the conversation's own silence (90 s):
// writing a reading for somebody is a slower thing to do than answering a question, and a visitor
// looking at a card and thinking is not a visitor who has left. If nothing comes, that card goes
// unread — he does not fill the silence with a reading of his own, which would be the one thing
// this whole beat is not.
const FIELD_S = 120;

/**
 * The flipped half of the evening, built with flow's own machinery.
 *
 *   P        ctx.pieces
 *   api      flow's api (beat, intent, flips)
 *   alive    (token) → is this still the visit we started in
 *   wait, timeout, render, cut, closer   flow's own; see flow.js
 *
 * → flipReadings(token) → the line the conversation picks up on, said over the open field, or null
 *   when he wrote none (the field opens under whatever is standing, which is the third card's name).
 */
export function makeFlip({ P, api, alive, wait, timeout, render, cut, closer }) {
  return async function flipReadings(token) {
    const D = P.dialogue, R = P.reveal, M = P.mind;
    if (!D || !R) return null;
    for (let i = 0; i < 3 && alive(token); i++) {
      const pick = R?.picks?.[i];
      if (!pick) break;
      D.folio?.('reading');
      // his hand turns it on the table, his fingers are seen leaving it, and then the insert with
      // the card's title beside it — the same three drawings a reading of his own gets, because the
      // visitor has seen this grammar before and knows what an insert means.
      api.beat = 'reading';
      await timeout(R.turn(i), 6);
      await wait(0.9);
      cut(`card${i}`);
      await timeout(D.intertitle(pick.slug, i), 4);
      if (!alive(token)) return null;

      // HIS ASK. One line, written for this card, and the field opens under it. `keepLast` hands
      // back the last sentence unsaid, which is what a line said OVER an open field is; with
      // nothing written the field opens under the intertitle and the card's name is the whole of
      // the prompt.
      api.beat = 'flip';
      const ask = await render(M?.reply ? M.reply({ beat: 'flip-ask', slug: pick.slug, position: i }) : null, { hold: 1.2, keepLast: true, max: 2 });
      if (!alive(token)) return null;
      P.pepeAnim?.listen?.();
      const said = await D.ask(ask.held ?? null, { timeout: FIELD_S, hold: 0.35 });
      if (!alive(token)) return null;

      // THEIR READING, ANSWERED. On his plate, because a man being read to is a face and not a pair
      // of hands. Their words go on the wire as the visitor's turn (mind.reply records them in the
      // history, so the transcript and the sheet keep them), and he answers as the one whose card
      // it is.
      if (said) {
        api.beat = 'reply';
        cut('pepe');
        P.pepeAnim?.consider?.(3); // he thinks about it; the frame must not be dead while he does
        await render(M?.reply ? M.reply({ beat: 'flip-hear', user: said, slug: pick.slug, position: i }) : null, { hold: 1.4 });
        if (!alive(token)) return null;
      }
      // a silence at the field is a card that goes unread, and he says nothing about that either
      cut('turn');
      await wait(0.9);
    }
    if (!alive(token)) return null;

    // THE THREE OF THEM, AND THE EVENING HANDED BACK. Said where the conversation lives, with the
    // last sentence held for the field the visitor answers into.
    api.beat = 'reply';
    cut('home');
    await wait(0.5);
    const r = await render(M?.reply ? M.reply({ beat: 'flip-close' }) : null, { hold: 1.4, keepLast: true, each: closer });
    if (!alive(token)) return null;
    // a turn of one sentence is held back whole, which is right here: it is the line the field
    // opens under, and the conversation carries on from it
    return r.held ?? null;
  };
}
