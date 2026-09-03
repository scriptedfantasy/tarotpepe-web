# Tarot Pepe — a reading, in miniature. Project brief for every builder and critic.

Read this whole file before doing anything. Then read `reference/STYLE.md` and `reference/INDEX.md`,
and LOOK (Read tool) at the reference frames named for your piece. If STYLE.md is missing, look at every
`reference/fd-anim-*.png` frame instead.

## What this is

A browser tarot reading, in Three.js, that looks and moves like the hand-drawn animated sequence in
Wes Anderson's *The French Dispatch* (the ink-line chase: black pen on white paper, tone built from
hatching strokes, flat selective colour, planimetric frontal staging) with the staging and timing
sensibility of his stop-motion films (*Fantastic Mr. Fox*, *Isle of Dogs*: symmetry, holds, motion on
twos, miniature tabletop particularity, deadpan). Tarot Pepe — the supplied character in `public/pepe/pepe-meditation.webp` (LOOK AT IT: classic Pepe,
green skin, calm half-lidded eyes, red lips, a plain white long-sleeved robe, sitting cross-legged,
palms open) — is the only coloured figure in the drawing. He sits cross-legged on a low bench behind a
small round table in a crowded parlour and reads three cards for the visitor. The card faces are the
other splash of colour. The card ART is the supplied deck in `public/cards/`, used as-is, never redrawn;
the cards piece designs the physical object around it (back, edges, deck, wear), not the pictures.

The bar is "utterly perfect". A critic will put our frame next to a real frame from the film, blind,
and say which is the better-crafted frame. We keep going until ours wins or ties.

## The world's rules (do not break these)

- **Ink on paper.** Everything is drawn: outlines with a hand's wobble, tone from hatching (vertical
  rain-strokes on walls, cross-hatch on dark masses, dash-strokes for floors), never a smooth gradient,
  never a photographic specular highlight, never a soft blurry shadow. Ink is near-black `#1c1a17`,
  paper is `#f6f2ea`.
- **Selective colour.** Only Pepe (his green skin `#5dbb63`-ish, his red lips; his robe is paper-white
  with ink) and the faces of the tarot cards carry colour. One single mustard accent in the set is
  allowed (the smoother decides which object). Colour is a flat fill with hatching drawn over it.
  Everything else is paper-white with ink. Materials flag this via `userData.ink.colorful` (see
  `src/core/strokes.js` → `inkMaterial`).
- **Frontal, symmetrical, particular.** Camera square to the back wall, subject dead centre, things
  arranged in rows. Dense, specific set dressing (bottles, shutters, signage with hand lettering,
  balusters, a radio) — crowded but ordered.
- **Motion on twos.** Puppet/card/prop animation reads `ctx.clock.t` / `ctx.clock.frame` (12 fps
  stepped). Long holds, snap transitions, no easing curves that glide. The camera may move smoothly
  (`ctx.clock.raw`), on rails: lateral tracks, straight push-ins, whip pans, cuts.
- **Deadpan.** Words are precise, formal, brief, funny without winking.

## Where things are

```
theatre/
  index.html            DOM layers: #stage (canvas) + #overlay > #letterbox #titles #dialogue #ui
  src/main.js           boot; builds pieces in order; URL params ?view= &state= &t= &seed= &shot=1
  src/core/layout.js    the stage layout + named camera shots (the contract; do not edit)
  src/core/clock.js     12fps stepped clock; step(), snapEase()
  src/core/rng.js       seeded rng; boil(frame, salt, amp) hand-drawn jitter
  src/core/strokes.js   pen helpers for canvas textures: inkLine, hatch, crossHatch, dashes, letter, paper, inkMaterial
  src/core/deck.js      the 78 cards (slug → /cards/<slug>.webp)
  src/core/assets.js    tracked loaders: ctx.assets.texture(url), .gltf(url), .cardUrl(slug), .settle()
  src/pieces/<name>.js  one file per piece. export meta {name, judge:{shot, states}, files} and build(ctx) → api
  public/cards/*.webp   79 card images (1024x1792); public/pepe/head-lowpoly.glb (+ highpoly) the supplied head
  public/fonts          Jost (Futura fallback). CSS var --futura. On this Mac the real Futura is used.
  public/progress/      the live progress page (/progress/) — log.jsonl + shots/
  reference/            reference frames + STYLE.md + INDEX.md (gitignored)
  tools/shot.mjs        screenshot the dev server (see below)
  tools/compare.mjs     blind side-by-side composite
  tools/progress.mjs    append a progress event
```

Pieces and their judging views (`http://127.0.0.1:5173/?view=<piece>&state=<state>&shot=1`):

| piece | owns | judged from shot | states |
|---|---|---|---|
| ink | the render pipeline: outlines, hatching, paper, selective colour, boil, letterbox | home | default, lines-only, tone-only |
| room | floor, walls, wallpaper, ceiling, window+shutters, door, mouldings | wide | default |
| props | set dressing: shelves, bottles, lamp, radio, plant, pictures, signage, rug, curtains | wide | default |
| table | the round table, cloth, glass, ashtray, candle | table | default |
| pepe | Pepe's body, suit, hands, chair; the supplied head mounted and dressed | pepe | default |
| pepeAnim | how Pepe moves (holds, blinks, mouth, gestures) | pepe | idle, talk, gesture, consider (motion) |
| cards | the card object: front art, ink back, edges; the deck | card1 | default, back, deck, three |
| reveal | shuffle, deal, turn, settle choreography | table | dealt, turning, revealed (motion) |
| lighting | the tone design: key/fill/practicals that drive hatching | home | default, evening, lamp |
| camera | staging: shots and moves | home | home, wide, pepe, table, spread, door |
| titles | title + chapter + closing cards (DOM) | home | title, chapter, closing, hidden |
| dialogue | the script (`script.js`) + how lines appear (DOM) | pepe | greeting, question, reading, farewell |
| sound | procedural WebAudio | home | default |
| flow | the whole evening, beat by beat | home | title, greeting, question, shuffle, dealt, reading, farewell |

Piece API contract: `export const meta`, `export async function build(ctx)` returning an object that may have
`update(ctx)` (called every frame; check `ctx.clock.stepped` for 12fps work), `setState(name, ctx)` (show a
judging state; must be deterministic), plus whatever the piece offers others. `ctx.pieces.<name>` holds
earlier-built pieces (build order: lighting, room, props, table, cards, pepe, pepeAnim, reveal, camera, ink,
titles, dialogue, sound, flow). If a build throws, main.js logs it and continues — but a broken piece
breaks the composite everyone is judged on, so **never leave the page with console errors**.

## Tools (run from the theatre directory; the dev server is already running on 127.0.0.1:5173)

```
node tools/shot.mjs --view <piece> --state <state> --out <abs path>.png            # one frame
node tools/shot.mjs --view <piece> --state <state> --t 2.5 --out ...               # frozen at t=2.5s (deterministic)
node tools/shot.mjs --view reveal --state turning --frames 8 --interval 170 --out ... # contact sheet (motion)
node tools/compare.mjs --ours <ours.png> --ref <reference.jpg> --seed <n> --out <abs>.png   # blind A/B + .key.json
node tools/progress.mjs '{"piece":"room","round":2,"role":"builder","status":"working","note":"...","shot":"room-r2.png"}'
```
`shot.mjs` exits with code 2 and prints PAGE ERRORS if the page threw. Fix them. `--width 1600 --height 900`
is the default frame. Screenshots that should show on the progress page go in
`public/progress/shots/<piece>-r<round>[-suffix].png` and are referenced by filename in the `shot` field.

**Bash sandbox note:** this session refuses complex shell commands (loops over variables, `cd x && y` chains,
subshells). Use plain single commands with absolute paths, one per call. For anything multi-step, write a
small `node` script with the Write tool and run it.

## Rules for builders

1. Edit only the files your piece owns (its `meta.files`, plus new files you create named
   `src/pieces/<piece>-*.js`). Never edit `main.js`, `layout.js`, `index.html` or another piece's file. If you
   need a contract change, say so in your return value; do not make it.
2. Look at the reference frames for your piece before you start, and again before you finish. Take your own
   screenshots (shot.mjs), Read them, and compare against the reference yourself. Do at least three
   look–fix cycles before you return. You are not done when the code runs; you are done when the frame
   would not embarrass the film.
3. Everything must be drawn by hand: procedural canvas textures via `strokes.js`, not photos, not gradients.
   Detail is the whole game — the reference is dense with specific, particular things. Division of labour:
   a surface texture is the PATTERN of what a thing is made of (wallpaper motif, floorboards, tiles, a
   label); the ink pass adds TONE (hatching where the light is not) and OUTLINES. Do not bake shading
   into textures, and do not draw outlines into textures except for pattern lines.
4. Keep it fast enough: the frame must render at 60fps on a laptop. No 4K textures on tiny objects.
5. Before returning: screenshot every judging state of your piece with no page errors, save the main one
   as `public/progress/shots/<piece>-r<round>.png`, and log a builder event with that filename.

## Rules for critics

1. You start with fresh eyes. Never read or trust the builder's summary. Take your own screenshots with
   shot.mjs of every judging state; if the page has errors, that is an automatic loss with the gap "page errors".
2. Pick the reference frame(s) INDEX.md names for the piece. Compose a blind pair with compare.mjs, Read the
   composite, and decide — before reading the key — which of A/B is the better-crafted frame of a
   hand-drawn Wes Anderson animated film, and score both 0–10 on craft. Then read the `.key.json`.
3. Judge the piece's own domain (the table critic judges the table, not Pepe), but note anything broken.
4. Be harsh and specific. Name the single biggest gap between ours and the reference, then give fix
   instructions a builder can act on without seeing what you saw: what it should look like, in drawing terms.
5. "Wowed" means: in the blind pair you preferred ours or could not choose, and ours scored ≥ 9.
6. Log a critic event with verdict, scores, gap and the composite's filename.
