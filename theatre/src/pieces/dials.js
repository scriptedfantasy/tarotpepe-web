// dials — a tuning panel for the pen, off unless asked for.
//
// The look of the ink is a dozen numbers (nib width, the soft shoulder, wobble, overshoot, how fast
// the line boils) and nobody can pick them by reasoning: they have to be pushed about while looking
// at the room. This puts them on screen behind `?dials=1`, so the user tunes by eye instead of
// asking for a number to be nudged and waiting for a build.
//
//   http://127.0.0.1:5173/?dials=1              the room, with the panel
//   http://127.0.0.1:5173/?dials=1&view=camera&state=home
//
// It is deliberately generic: it reflects over `ctx.pieces.ink.params` and builds a control for
// whatever it finds, so a round that adds a tunable gets a dial for free and one that renames a
// tunable does not break the panel.
//
// Two ways the values reach the shader. If ink publishes `params.apply()`, the panel calls it and
// the frame changes as the slider moves. If it does not, the panel falls back to reloading with the
// values as URL parameters, which ink already reads at build time — slower, but it always works.
// COPY writes the current setting to the clipboard in both forms: a JSON block to paste into
// ink.js as the new defaults, and a URL to send to someone else.
export const meta = {
  name: 'dials',
  judge: { shot: 'home', states: ['default'] },
  files: ['src/pieces/dials.js'],
};

const HIDE = new Set(['debug']); // not numbers, or not worth a slider

// A sensible range for a tunable we know nothing about except what it currently is.
function rangeFor(v) {
  const a = Math.abs(v);
  if (a === 0) return { min: 0, max: 1, step: 0.01 };
  if (a < 0.02) return { min: 0, max: a * 8, step: a / 50 };
  if (a < 0.2) return { min: 0, max: a * 5, step: 0.001 };
  if (a < 2) return { min: 0, max: Math.max(2, a * 3), step: 0.01 };
  if (a < 20) return { min: 0, max: a * 3, step: 0.05 };
  return { min: 0, max: a * 3, step: 1 };
}

const CSS = `
.dials{position:fixed;top:8px;right:8px;width:290px;max-height:calc(100vh - 16px);overflow-y:auto;
  z-index:60;background:#f8f9f4;border:1px solid #0d0e0d;padding:8px 10px 10px;
  font:11px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;color:#0d0e0d}
.dials.min{width:auto;padding:4px 8px}
.dials h4{margin:0 0 6px;font:600 11px/1.2 ui-monospace,monospace;letter-spacing:.09em;
  display:flex;justify-content:space-between;align-items:center;gap:8px}
.dials .row{margin:0 0 5px}
.dials .lab{display:flex;justify-content:space-between;gap:6px}
.dials .lab b{font-weight:400;opacity:.62}
.dials input[type=range]{width:100%;height:14px;margin:1px 0 0;accent-color:#0d0e0d}
.dials input[type=checkbox]{accent-color:#0d0e0d}
.dials button{font:inherit;background:#f8f9f4;border:1px solid #0d0e0d;padding:1px 7px;cursor:pointer}
.dials button:hover{background:#0d0e0d;color:#f8f9f4}
.dials .btns{display:flex;gap:5px;margin-top:8px}
.dials .note{margin-top:7px;opacity:.6;font-size:10px}
.dials .chg{font-weight:700}
`;

export async function build(ctx) {
  const on = ctx.params?.get?.('dials') === '1';
  const ink = ctx.pieces?.ink;
  if (!on || !ink?.params) return { update() {}, setState() {} };

  const P = ink.params;
  const keys = Object.keys(P)
    .filter((k) => !HIDE.has(k) && (typeof P[k] === 'number' || typeof P[k] === 'boolean'))
    .sort();
  const initial = Object.fromEntries(keys.map((k) => [k, P[k]]));

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const el = document.createElement('div');
  el.className = 'dials';
  document.body.appendChild(el);

  const head = document.createElement('h4');
  head.innerHTML = '<span>THE PEN</span>';
  const min = document.createElement('button');
  min.textContent = '–';
  min.title = 'fold the panel away';
  head.appendChild(min);
  el.appendChild(head);

  const body = document.createElement('div');
  el.appendChild(body);
  min.onclick = () => {
    const folded = el.classList.toggle('min');
    body.hidden = folded;
    min.textContent = folded ? '+' : '–';
  };

  // Every key this page-load has actually touched. It is NOT "everything that differs from
  // initial": after a reload `initial` holds the values the URL just set, so comparing against it
  // makes every earlier change look untouched — and the first version of this deleted those from
  // the URL, which reset them to the shipped defaults. One dial at a time was all that survived.
  // Keys already in the URL are left exactly as they are unless they are touched again.
  const touched = new Set();

  // Live if ink can take it, a reload if it cannot. The reload is debounced so dragging a slider
  // does not queue twenty of them.
  let pending = null;
  const push = (key) => {
    if (key) touched.add(key);
    if (typeof P.apply === 'function') {
      P.apply();
      return;
    }
    clearTimeout(pending);
    pending = setTimeout(() => {
      const u = new URL(location.href);
      // booleans go over as 1/0: ink coerces every value with `+v`, and +"true" is NaN
      for (const k of touched) u.searchParams.set(`ink.${k}`, typeof P[k] === 'boolean' ? (P[k] ? '1' : '0') : String(P[k]));
      location.replace(u);
    }, 700);
  };

  const readouts = [];
  for (const k of keys) {
    const row = document.createElement('div');
    row.className = 'row';
    const lab = document.createElement('div');
    lab.className = 'lab';
    const name = document.createElement('span');
    name.textContent = k;
    const val = document.createElement('b');
    lab.append(name, val);
    row.appendChild(lab);

    if (typeof P[k] === 'boolean') {
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = P[k];
      box.onchange = () => {
        P[k] = box.checked;
        paint();
        push(k);
      };
      lab.insertBefore(box, val);
      readouts.push(() => {
        val.textContent = P[k] ? 'on' : 'off';
        name.classList.toggle('chg', P[k] !== initial[k]);
      });
    } else {
      const r = rangeFor(initial[k]);
      const sl = document.createElement('input');
      sl.type = 'range';
      sl.min = r.min;
      sl.max = r.max;
      sl.step = r.step;
      sl.value = P[k];
      sl.oninput = () => {
        P[k] = +sl.value;
        paint();
        push(k);
      };
      row.appendChild(sl);
      readouts.push(() => {
        sl.value = P[k];
        val.textContent = (+P[k]).toFixed(r.step < 0.01 ? 4 : r.step < 0.1 ? 3 : 2);
        name.classList.toggle('chg', P[k] !== initial[k]);
      });
    }
    body.appendChild(row);
  }

  const btns = document.createElement('div');
  btns.className = 'btns';
  const copy = document.createElement('button');
  copy.textContent = 'COPY';
  copy.title = 'the changed values, as JSON and as a URL';
  const reset = document.createElement('button');
  reset.textContent = 'RESET';
  btns.append(copy, reset);
  body.appendChild(btns);

  const note = document.createElement('div');
  note.className = 'note';
  note.textContent = typeof P.apply === 'function' ? 'live' : 'reloads on change';
  body.appendChild(note);

  copy.onclick = async () => {
    // What is actually set right now: whatever the URL already carried into this page load, plus
    // anything touched since. Reading it back off the URL keeps this honest across reloads.
    const u = new URL(location.href);
    for (const k of touched) u.searchParams.set(`ink.${k}`, typeof P[k] === 'boolean' ? (P[k] ? '1' : '0') : String(P[k]));
    const changed = [...u.searchParams.keys()].filter((k) => k.startsWith('ink.')).map((k) => k.slice(4));
    const text = changed.length
      ? `${changed.map((k) => `  ${k}: ${P[k]},`).join('\n')}\n\n${u.href}`
      : 'nothing changed';
    try {
      await navigator.clipboard.writeText(text);
      note.textContent = `copied ${changed.length} value${changed.length === 1 ? '' : 's'}`;
    } catch {
      note.textContent = text; // clipboard refused (no gesture, no permission) — show it instead
    }
  };

  // Back to what ships: every override comes off the URL, not just the ones touched here.
  reset.onclick = () => {
    const u = new URL(location.href);
    for (const k of [...u.searchParams.keys()]) if (k.startsWith('ink.')) u.searchParams.delete(k);
    if (typeof P.apply === 'function') {
      for (const k of keys) P[k] = initial[k];
      touched.clear();
      paint();
      P.apply();
      history.replaceState(null, '', u);
      return;
    }
    location.replace(u);
  };

  function paint() {
    for (const r of readouts) r();
  }
  paint();

  return {
    update() {},
    setState() {},
    el,
  };
}
