// PIECE: sound — procedural WebAudio: room tone, the deck riffle, the card snap on the table,
// the turn of a card, a clock, a small musical figure for the title. Nothing until the first
// user gesture (browsers require it). API: play(name), start(), setState.
export const meta = {
  name: 'sound',
  judge: { shot: 'home', states: ['default'], audio: true },
  files: ['src/pieces/sound.js'],
};

export async function build(ctx) {
  let ac = null;
  function ensure() {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function click(freq = 1800, dur = 0.05, gain = 0.15) {
    const a = ensure();
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = 'triangle';
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g).connect(a.destination);
    o.start();
    o.stop(a.currentTime + dur);
  }
  const api = {
    start() {
      if (ctx.shotMode) return;
      ensure();
    },
    play(name) {
      if (ctx.shotMode) return;
      try {
        if (name === 'snap') click(900, 0.04, 0.2);
        else if (name === 'flip') click(1400, 0.06, 0.12);
        else if (name === 'riffle') for (let i = 0; i < 12; i++) setTimeout(() => click(2000 + i * 60, 0.02, 0.06), i * 35);
        else click();
      } catch (e) {
        /* audio is optional */
      }
    },
    setState() {},
  };
  window.addEventListener('pointerdown', () => api.start(), { once: true });
  return api;
}
