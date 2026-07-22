'use strict';

// Background music: one loop for UNDERCOVER, one for COVER BLOWN, crossfaded
// whenever G.blown flips. Per-mission track choice lives in the level JSON
// (World.musicUndercover / World.musicCoverBlown, set in the editor's MUSIC
// panel) — MUSIC_TRACKS is the shared menu of what's available to pick from.
const MUSIC_TRACKS = {
  undercover: [
    { key: 'undercover', name: 'HAVANA' },
    { key: 'undercoverhk', name: 'HONG KONG' },
    { key: 'undercoverussr', name: 'USSR' },
    { key: 'undercoverny', name: 'NEW YORK' },
    { key: 'undercoverap', name: 'ALPS' },
    { key: 'undercoverme', name: 'MIDDLE EAST' },
    { key: 'undercoverparis', name: 'PARIS' },
  ],
  coverblown: [
    { key: 'coverblown', name: 'HAVANA' },
    { key: 'coverblown2', name: 'HAVANA (ALT)' },
    { key: 'coverblownny', name: 'NEW YORK' },
    { key: 'coverblownap', name: 'ALPS' },
    { key: 'coverblownme', name: 'MIDDLE EAST' },
    { key: 'coverblownussr', name: 'USSR' },
    { key: 'coverblownparis', name: 'PARIS' },
  ],
};

const Music = (() => {
  const VOL = 0.55, FADE_MS = 1400, STOP_MS = 600;
  const players = [new Audio(), new Audio()];
  players.forEach(p => { p.loop = true; p.volume = 0; p.preload = 'auto'; });
  let live = 0;                                   // index of the player currently fading in / audible
  let unlocked = false;
  let ucKey = 'undercover', cbKey = 'coverblown';
  let targetKey = null;
  let raf = null;

  function path(key) { return 'assets/music/' + key + '.mp3'; }

  function setTracks(undercoverKey, coverBlownKey) {
    ucKey = undercoverKey || 'undercover';
    cbKey = coverBlownKey || 'coverblown';
  }

  function crossfadeTo(key) {
    const incoming = players[1 - live], outgoing = players[live];
    const src = path(key);
    if (!incoming.src.endsWith(src)) { incoming.src = src; incoming.currentTime = 0; }
    if (unlocked) incoming.play().catch(() => {});
    live = 1 - live;
    cancelAnimationFrame(raf);
    const t0 = performance.now(), fromOut = outgoing.volume, fromIn = incoming.volume;
    (function step() {
      const t = Math.min(1, (performance.now() - t0) / FADE_MS);
      outgoing.volume = fromOut * (1 - t);
      incoming.volume = fromIn + (VOL - fromIn) * t;
      if (t < 1) raf = requestAnimationFrame(step);
      else { outgoing.pause(); outgoing.volume = 0; }
    })();
  }

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    const p = players[live];
    if (p.src) p.play().catch(() => {});
  }

  function setBlown(blown) {
    const key = blown ? cbKey : ucKey;
    if (key === targetKey) return;
    targetKey = key;
    crossfadeTo(key);
  }

  function stop() {
    cancelAnimationFrame(raf);
    targetKey = null;
    const t0 = performance.now(), startVols = players.map(p => p.volume);
    (function step() {
      const t = Math.min(1, (performance.now() - t0) / STOP_MS);
      players.forEach((p, i) => { p.volume = startVols[i] * (1 - t); });
      if (t < 1) raf = requestAnimationFrame(step);
      else players.forEach(p => { p.pause(); p.volume = 0; });
    })();
  }

  return { setTracks, unlock, setBlown, stop };
})();
