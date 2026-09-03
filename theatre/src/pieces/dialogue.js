// PIECE: dialogue — what Tarot Pepe says and how it appears. The writing (script.js) and the
// presentation (subtitle-style lines under the frame, typed in on the 12fps clock, held, then cut).
// API: say(text, {hold}) → Promise, ask(prompt) → Promise<string>, clear(). Script in ./script.js.
import { SCRIPT } from './script.js';

export const meta = {
  name: 'dialogue',
  judge: { shot: 'pepe', states: ['greeting', 'question', 'reading', 'farewell'], dom: true },
  files: ['src/pieces/dialogue.js', 'src/pieces/script.js'],
};

export async function build(ctx) {
  const root = ctx.dom.dialogue;
  const style = document.createElement('style');
  style.textContent = `
    #dialogue .line { position: absolute; left: 50%; bottom: 9%; transform: translateX(-50%); max-width: 62%; text-align: center; font-family: var(--futura); font-weight: 500; font-size: 26px; letter-spacing: 0.02em; line-height: 1.35; color: #1c1a17; background: rgba(246,242,234,0.85); padding: 6px 18px; }
    #dialogue .who { display: block; font-size: 13px; letter-spacing: 0.3em; text-transform: uppercase; opacity: 0.7; margin-bottom: 4px; }
  `;
  document.head.appendChild(style);
  let typing = null;
  const api = {
    script: SCRIPT,
    say(text, { hold = 1.2, who = 'Tarot Pepe' } = {}) {
      root.innerHTML = `<div class="line"><span class="who">${who}</span><span class="text"></span></div>`;
      const el = root.querySelector('.text');
      const chars = [...text];
      const cps = 30; // characters per second, stepped
      const start = ctx.clock.t;
      ctx.pieces.pepeAnim?.say?.(text, chars.length / cps);
      return new Promise((res) => {
        typing = { el, chars, start, cps, hold, done: res };
      });
    },
    clear() {
      root.innerHTML = '';
      typing = null;
    },
    async ask() {
      return '';
    },
    setState(name) {
      const line = SCRIPT[name]?.[0] ?? SCRIPT.greeting[0];
      root.innerHTML = `<div class="line"><span class="who">Tarot Pepe</span><span class="text">${line}</span></div>`;
    },
    update(ctx) {
      if (!typing || !ctx.clock.stepped) return;
      const n = Math.min(typing.chars.length, Math.floor((ctx.clock.t - typing.start) * typing.cps));
      typing.el.textContent = typing.chars.slice(0, n).join('');
      if (n >= typing.chars.length && ctx.clock.t > typing.start + typing.chars.length / typing.cps + typing.hold) {
        const d = typing.done;
        typing = null;
        d();
      }
    },
  };
  return api;
}
