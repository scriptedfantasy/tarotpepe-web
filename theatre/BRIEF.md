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

## Interactive, and Pepe really speaks (the user's rule)

- **The pull is from the whole deck (the user's rule).** "tarot is pulled from all 78 cards, not a sub
  section" — so when he lays the cards out for the visitor to choose, all 78 are on the table, not a
  ribbon of 21. This is a staging problem, not a data one: 78 cards on a 0.62 m cloth overlap heavily
  and a phone cannot give each one a tap strip, so the interaction has to answer for that (a
  neighbourhood that opens under the cursor, a pass along the arc, something) — but the deck on the
  table is the whole deck.
- **A card lifts UP on hover, never down.** The user's words: "when i hover over the cards, they pop
  down, they should however pop up on hover (down feels weird because the screen is so crowded at the
  bottom)". Up means toward the top of the frame, in whatever the current shot's grammar is.
- **Nothing on the table passes through anything else.** The cards collided with the wine bottle
  during the shuffle. A puppet show has real objects in a real box; if a beat needs the space, the
  prop moves out of the way beforehand, in shot, as a piece of business.

- **Tarot Pepe talks to the visitor, powered by an LLM.** His lines come from the `mind` piece, which calls
  `POST /api/pepe` — a streaming proxy in `server/pepe.mjs` wired into the Vite dev server (Anthropic if
  `ANTHROPIC_API_KEY` is set, else OpenRouter if `OPENROUTER_API_KEY`; keys live in `theatre/.env.local`,
  gitignored, see `.env.example`). Without a key the scripted lines in `script.js` are used, so the show
  never stops. The model is given the persona (deadpan, precise, formal, brief, funny without winking, no
  mysticism, never an assistant), the beat (greeting · the question · reading position i of card X ·
  follow-up · farewell), what the visitor said, and the scripted line for that card as a hint of his voice.
  The mind yields SENTENCES; flow says them one at a time through `dialogue.say` (typed on twos, held, cut).
- **Captions sit on a drawn placard (the user's decision, not open to a critic).** A paper card with a wobbly
  ink rule, the speaker in small tracked caps above, the line beneath in the caption face. A critic once
  had it removed in favour of free-floating text on the drawing; the user asked for the card back and
  that settles it. Keep the drawn answer block, its ink caret and the microphone prop.
- **The caption card docks to the TOP for the picking beat, and only that beat (the user's
  exception).** 2026-09-05: "attach the caption card to the top during the card picking process".
  Bottom-centred it covered 89 px of a 170 px spread on a phone — 52% of the cards the visitor is
  being asked to choose from — and the camera cannot give it room: the plate is bound by
  disc-centring and the rug line, and the spread runs to within 5 cm of the rim. So while the fan is
  out and the visitor is choosing, the card sits at the top; the moment the three are taken it is
  back at the bottom. It is the SAME card, same size, same registers; only its anchor moves. This is
  an exception the user granted, not a licence to move the caption anywhere else.
- **Chat or voice.** The visitor answers by typing (`dialogue.ask`, a drawn input in the picture) or by voice
  (a mic button: the browser's SpeechRecognition; when voice is on, Pepe is also spoken by speechSynthesis).
  Chat is the default, voice a toggle; both must work in Chrome.
- **It is a conversation, not a script of beats (the user's rule).** The visitor talks to Pepe freely,
  by typing or by voice, and he answers; back and forth for as long as they like. He may offer a
  reading. He NEVER shuffles or deals on his own schedule: the cards come out only when the visitor
  asks for them, in whatever words they use. `mind` owns the conversation loop and detects that
  intent; `flow` waits for it before it touches `reveal`.
- **The visitor chooses the cards.** After the shuffle Pepe fans the deck face down across the table and the
  visitor picks three — click/tap a card in the fan, or say/type "the third from the left" — and each pick
  slides to its slot before it is turned. `reveal` owns `fan()`, `pick(i)`, `awaitPick()` (raycast + a
  2-frame hover lift); `flow` wires the choice to the conversation.
- The `mind` piece is judged on a transcript: `?view=mind&state=transcript` runs a canned visit (a fixed
  answer, three fixed cards) against the real endpoint and prints every line into a `#transcript` block on
  the page; the critic reads it as a scene.

## The world's rules (do not break these)

- **The entrance door is the benchmark for the pen — the user's own words.** "the ink lines that make
  up the front door at the first shot, are really good. we should have that aestetic in the room
  aswell". `src/pieces/entrance-door.js` draws with real polylines through `inkLine`/`hatch` at
  `pen = max(1.4, h/560)` — about 1.6 px on a 900 px frame — with wobble 0.3–1.0, alpha falling off
  along a stroke, and a `seed` that re-rolls the whole drawing. The room's contours are derived
  per-pixel by a shader at 3.7 px nominal extent, which is why they read fat and blurry beside it.
  Judge the room against the door, in the same frame, at 1:1 — not against a film still.
- **What is already right, and may not be broken to fix something else.** 2026-09-05, the user, on
  the current build: "pepe is great - the floor is great, the carpet is great. much of the rest is
  still blurry and needs thinning". All three of those get their marks from a drawing of their own —
  the floorboard dashes, the rug's hatch tiles, Pepe's cut sheet — while everything still called
  blurry takes its lines from the screen-space contour pass. That is the diagnosis: the tone passes
  are landing and the contour pass is not. Thin the contour; leave the floor, the rug and the puppet
  alone unless a measurement says they regressed.
- **The line boils.** The drawing is re-struck on every 12 fps step, so a held line is never the same
  line twice: it breathes. This is the film's most recognisable quality and it must be true while
  nothing is happening, not only during a move.

- **Ink on paper.** Everything is drawn: outlines with a hand's wobble, tone from hatching (vertical
  rain-strokes on walls, cross-hatch on dark masses, dash-strokes for floors), never a smooth gradient,
  never a photographic specular highlight, never a soft blurry shadow. Ink is near-black `#0d0e0d`,
  paper is `#f8f9f4` — both sampled from the folio scans (STYLE.md §1.1). Take them from
  `src/core/strokes.js` (INK, PAPER); never hard-code a different white or black.
- **"No grey" is a rule about TONE, not about rasterisation.** A mark is ink or it is paper — there
  is no grey WASH, no soft shading, no blurry shadow. But a drawn line, rasterised, has an
  anti-aliased edge, and the film's does: a contour is a 2.5–3 px stroke with round caps and a soft
  pixel at its boundary. Round 4 applied the tone rule to the pixels as well and produced 1 px
  stair-stepped contours with isolated speckle, which the round-3 critic ranked the film's single
  worst fault. Threshold the tone buffer; let the line buffer keep its anti-aliasing. Judge a line at
  1:1 against `reference/fd-anim-kitchen-table-cards-hires.jpg`, never at a glance.
- **The table is shot square.** STYLE §2.3 allows a dead plan view or straight-on at table height and
  nothing else. No casual three-quarter: the table's ellipse renders as a circle centred in frame, the
  row of slots runs parallel to the frame's edge, cards are square to it, and rug and floor stay out
  of a tabletop shot.
- **Every shot must survive a phone.** 390x760 portrait is a first-class frame, not an afterthought:
  the named subject fills at least 70% of the short axis, no card or box is clipped, and nothing is
  lettered below 13 px (10 px for a speaker's name).
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
| mind | the LLM conversation: persona, beats, streaming client, script fallback; plus server/pepe.mjs | pepe | greeting, question, reading, transcript |
| flow | the whole evening, interactive: ask → answer → shuffle → fan → the visitor picks three → turns + readings → follow-up → farewell | home | title, greeting, question, shuffle, fan, dealt, reading, farewell |

Piece API contract: `export const meta`, `export async function build(ctx)` returning an object that may have
`update(ctx)` (called every frame; check `ctx.clock.stepped` for 12fps work), `setState(name, ctx)` (show a
judging state; must be deterministic), plus whatever the piece offers others. `ctx.pieces.<name>` holds
earlier-built pieces (build order: lighting, room, props, table, cards, pepe, pepeAnim, reveal, camera, ink,
titles, dialogue, sound, mind, flow). If a build throws, main.js logs it and continues — but a broken piece
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
4. Keep it fast enough: the frame must render at 60fps on a laptop, and your piece must BUILD in under
   1500 ms in the headless screenshot browser (software WebGL, software canvas). shot.mjs prints
   `builds: <piece> <ms>` for every piece and flags SLOW BUILDS; main.js logs `[theatre] built <piece> in <ms>`.
   Generate canvas textures at modest sizes (512–1024 px, a few hundred strokes, not thousands), cache
   and reuse tiles, avoid per-vertex JS loops over huge geometries, and never load more than a handful
   of card textures up front (the deck is 78 × 500 KB; load faces on demand). A slow build is a black
   frame for every other piece's critic, so this is a hard rule.
   One caveat measured on this machine: the headless judging browser serves nothing a page requests
   for its first ~4 s, so whichever piece first awaits a file wears those seconds whatever it is
   doing. If your piece is the one wearing it, check with tools/shot.mjs whether the number moves to
   another piece when you stop awaiting (import small JSON instead of fetching it, and hang textures
   on their materials when they arrive); if it simply moves, the page total is what matters and it is
   not your bug.
5. Dense deterministic drawings are BAKED: wrap them in `bakedTexture` / `bakedLevels` / `bakedJSON` from
   `src/core/bake.js` (see cards.js, ink-tiles.js, pepe-head.js for the pattern) and run `node tools/bake.mjs`
   after changing the drawing code; the file name carries a hash of the drawing source, so a stale bake
   simply falls back to live drawing (slow) until you re-bake. Check the whole page with
   `node tools/check-views.mjs` (every judging state of every piece, errors and build times).
6. Before returning: screenshot every judging state of your piece with no page errors, save the main one
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
