// PIECE: titles — the typography layer: the opening title, chapter cards, the closing card.
// Futura, centred, generous tracking, on flat colour. Timing is stepped: a card cuts in, holds,
// cuts out. API: title({kicker,title,sub}), chapter(n, name), hide(). setState for judging.
export const meta = {
  name: 'titles',
  judge: { shot: 'home', states: ['title', 'chapter', 'closing', 'hidden'], dom: true },
  files: ['src/pieces/titles.js'],
};

export async function build(ctx) {
  const root = ctx.dom.titles;
  const style = document.createElement('style');
  style.textContent = `
    #titles .card { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; text-align: center; font-family: var(--futura); }
    #titles .card.title { background: #e0a526; color: #2b1d17; }
    #titles .card.chapter { background: #7a2e2a; color: #f3e7c9; }
    #titles .kicker { font-size: 18px; letter-spacing: 0.35em; text-transform: uppercase; font-weight: 500; }
    #titles h1 { font-size: 72px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; margin: 0; }
    #titles .sub { font-size: 20px; letter-spacing: 0.2em; text-transform: uppercase; font-weight: 500; }
  `;
  document.head.appendChild(style);
  function show(cls, html) {
    root.innerHTML = `<div class="card ${cls}">${html}</div>`;
  }
  const api = {
    title({ kicker = 'A reading, in miniature', title = 'Tarot Pepe', sub = 'in three cards' } = {}) {
      show('title', `<div class="kicker">${kicker}</div><h1>${title}</h1><div class="sub">${sub}</div>`);
    },
    chapter(n, name) {
      show('chapter', `<div class="kicker">Chapter ${n}</div><h1>${name}</h1>`);
    },
    hide() {
      root.innerHTML = '';
    },
    setState(name) {
      if (name === 'title') api.title();
      else if (name === 'chapter') api.chapter('One', 'The Question');
      else if (name === 'closing') show('title', `<div class="kicker">The End</div><h1>Tarot Pepe</h1><div class="sub">thanks you for your visit</div>`);
      else api.hide();
    },
  };
  return api;
}
