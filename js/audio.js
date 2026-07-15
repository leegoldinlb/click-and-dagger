'use strict';

// Tiny WebAudio synth — all sound effects are generated, no assets.
const Sfx = (() => {
  let ac = null;
  const A = () => {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  };

  function tone(f0, f1, dur, type, vol, delay = 0) {
    const c = A(); if (!c) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(1, f0), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noise(dur, vol, fFrom, fTo, delay = 0) {
    const c = A(); if (!c) return;
    const t = c.currentTime + delay;
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(fFrom, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, fTo), t + dur);
    const g = c.createGain(); g.gain.value = vol;
    src.connect(f).connect(g).connect(c.destination);
    src.start(t);
  }

  return {
    unlock: A,
    shoot()  { noise(0.09, 0.32, 1100, 140); tone(110, 45, 0.09, 'sine', 0.26); },       // suppressed
    dry()    { tone(900, 500, 0.05, 'square', 0.12); },
    hurt()   { tone(220, 90, 0.25, 'sawtooth', 0.28); },
    impHit() { tone(300, 120, 0.12, 'square', 0.2); },
    impDie() { tone(260, 30, 0.5, 'sawtooth', 0.24); noise(0.3, 0.18, 700, 90); },
    growl()  { tone(520, 330, 0.13, 'square', 0.14); tone(440, 260, 0.15, 'square', 0.12, 0.14); },  // "hey! you!"
    pickup() { tone(500, 900, 0.09, 'square', 0.14); tone(900, 1400, 0.1, 'square', 0.11, 0.07); },
    door()   { noise(0.5, 0.32, 300, 80); tone(70, 45, 0.5, 'triangle', 0.18); },
    pick()   { tone(1300, 1200, 0.03, 'square', 0.1); tone(1500, 1400, 0.03, 'square', 0.1, 0.09);
               tone(700, 400, 0.08, 'square', 0.12, 0.2); },                             // tick, tick, clunk
    denied() { tone(140, 130, 0.18, 'square', 0.18); tone(120, 110, 0.2, 'square', 0.18, 0.2); },
    power()  { tone(55, 120, 0.6, 'sawtooth', 0.18); tone(400, 800, 0.3, 'sine', 0.11, 0.3); },
    win()    { [330, 392, 494, 659, 587].forEach((f, i) => tone(f, f, 0.24, 'square', 0.15, i * 0.13)); },  // minor spy sting
    land()   { noise(0.06, 0.16, 220, 60); tone(90, 55, 0.07, 'sine', 0.14); },            // jump touchdown thump
    alarm()  { tone(500, 900, 0.16, 'square', 0.18); tone(500, 900, 0.16, 'square', 0.18, 0.22); },  // cover blown — rising two-whoop klaxon
  };
})();
