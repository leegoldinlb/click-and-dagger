'use strict';

// Game state, input, combat, enemy AI, and the main loop.
const Game = (() => {
  const canvas = document.getElementById('view');
  // Touch devices keep the original 640x360 raycast resolution (software
  // per-column raycasting scales with pixel count — this is the budget the
  // mobile touch-control work was tuned against). Desktop/laptop gets a
  // sharper internal render for free, no toggle needed, since it's the same
  // detection the touch-control layer already uses. ?touch=1 forces the
  // touch layer (and this lower resolution) on a mouse-driven browser too —
  // handy for testing without a real touch device.
  const isTouch = matchMedia('(pointer: coarse)').matches || new URLSearchParams(location.search).get('touch') === '1';
  // Marks the desktop app (see the fullscreen section below for why it exists
  // at all). This has to happen BEFORE the Engine.resize() a few lines down:
  // the class is what widens the canvas's CSS box to the whole screen, and
  // resize() sizes the backing store off that box — set it afterwards and the
  // backing store keeps the narrower windowed shape while the box is already
  // full-screen, which silently stretches the picture instead of filling it.
  if (window.CLICKDAGGER_DESKTOP) document.body.classList.add('desktop');
  Engine.init(canvas, isTouch ? null : { renderW: 1280, renderH: 720 });
  // Sizes the on-screen canvas's own backing store to its actual displayed
  // CSS size × devicePixelRatio, so the final upscale from the raycast
  // buffer lands on exact physical pixels instead of the browser stretching
  // a small backing store to an arbitrary fractional size. Kept opt-in on
  // Engine's side (see engine.js) — the editor's own preview canvas doesn't
  // call this and keeps its old fixed-size behavior.
  Engine.resize();

  // The arsenal: one hardcoded Walther becomes a real weapon table. Each entry is
  // per-weapon ammo (Lee's call — different guns for different jobs, not one shared
  // pool), a fire-rate cooldown, a damage range, and the HUD viewmodel sprite name.
  // `auto: true` (Sterling) fires continuously while LMB is held, gated by the same
  // cooldown as every other weapon — see the mousedown-hold loop in update().
  const WEAPONS = {
    walther:  { name: 'WALTHER PPK',   spr: 'gun',         dmg: [16, 26], cd: 0.28, maxAmmo: 99, auto: false },
    sterling: { name: 'STERLING SMG',  spr: 'gunSterling', dmg: [8, 14],  cd: 0.11, maxAmmo: 90, auto: true },
    ar7:      { name: 'AR-7',          spr: 'gunAR7',      dmg: [32, 46], cd: 0.55, maxAmmo: 30, auto: false },
    laser:    { name: 'LASER',         spr: 'gunLaser',    dmg: [55, 75], cd: 0.9,  maxAmmo: 12, auto: false },
    golden:   { name: 'GOLDEN GUN',    spr: 'gunGolden',   dmg: [999, 999], cd: 0.6, maxAmmo: 99, auto: false },
    // unarmed melee, selected with 0 — no viewmodel sprite yet (spr stays null: the
    // renderer just skips drawing one), no ammo to track. `melee: true` gates the
    // separate short-range/no-ammo handling in shoot() and the HUD's ammo readout.
    fists:    { name: 'FISTS', spr: 'judochop', dmg: [12, 20], cd: 0.6, melee: true, range: 1.2 },
  };
  const WEAPON_ORDER = ['walther', 'sterling', 'ar7', 'laser', 'golden'];

  // Pitch (vertical look) is a raw pixel offset added to the horizon line in
  // engine.js's render(), so its clamp has to scale with Engine.H — a fixed
  // pixel cap here would give desktop (720 internal render height) half the
  // proportional look range of touch (360), which is exactly what made
  // looking down at floor items feel so restrictive on desktop.
  const pitchLimit = () => Engine.H * 0.3;

  const G = {
    player: { x: World.spawn.x, y: World.spawn.y, a: World.spawn.a, hp: 100, hurtT: 0,
              eyeZ: World.floorZAt(World.spawn.x, World.spawn.y) + 0.5, pitch: 0, vz: 0 },
    combat: false,               // gun drawn (shooting mode) vs holstered — both are pointer-locked now
    locked: false,                // pointer-lock engaged at all (drawn or holstered) — replaces the old free-cursor adventure mode
    reticule: null,               // 'look' | 'use' | 'take' | null — what the crosshair shows while holstered
    started: false,
    over: false,
    bobT: 0, bobAmt: 0, fireT: 0,
    warpLock: -1,                      // sector a warp just dropped us into — see warpPlayer()
    kills: 0, civKills: 0, t0: 0,
    blown: World.startBlown,          // Cover status: false = Undercover (hostiles ignore you), true = Blown (one-way door for the level)
    invuln: false,                     // MOM cheat — hostile melee/ranged hits are gated out in update(), no other damage source exists
    weapon: 'walther',                 // currently equipped weapon kind
    owned: { walther: true, sterling: false, ar7: false, laser: false, golden: false, fists: true },
    ammo: { walther: 24, sterling: 0, ar7: 0, laser: 0, golden: 0 },
    gunSprite: 'gun',                  // read by Engine.paintOverlays for the HUD viewmodel — kept in sync by switchWeapon
    meleeWeapon: false,                // true for fists — hides the viewmodel at rest, animates it as a slash instead
    meleeSwingCd: 0,                   // wpn.cd at the moment a punch was thrown — normalizes the slash's progress
  };
  // Per-kind combat stats for hostile entities. `ranged` kinds hold position and fire
  // once in rangedRange (with LOS), only closing distance to get there; everyone else
  // rushes to meleeRange. aggroR is how close (with LOS) wakes them from idle.
  const HOSTILE = {
    // --- sci-fi hostiles ---
    saurianbrute: { speed: 1.3, meleeRange: 1.0,  meleeDmg: [12, 20], aggroR: 7,  atkCd: 1.1 },
    saurianmarksman: { speed: 1.4, meleeRange: 0.85, meleeDmg: [7, 13],  aggroR: 10, atkCd: 1.3,
                       ranged: true, rangedRange: 7, rangedDmg: [10, 16] },
    saurianstealth: { speed: 2.0, meleeRange: 0.85, meleeDmg: [9, 15],  aggroR: 8,  atkCd: 0.8 },
    scavenger: { speed: 1.8, meleeRange: 0.8,  meleeDmg: [5, 9],   aggroR: 8,  atkCd: 0.8 },
    saboteur: { speed: 1.8, meleeRange: 0.8,  meleeDmg: [6, 11],  aggroR: 8,  atkCd: 0.85 },
    swarmdrone: { speed: 2.1, meleeRange: 0.75, meleeDmg: [4, 8],   aggroR: 9,  atkCd: 0.7 },
    alienwarlord: { speed: 1.3, meleeRange: 1.0,  meleeDmg: [10, 18], aggroR: 14, atkCd: 0.45,
                       ranged: true, rangedRange: 8, rangedDmg: [9, 16] },
    goon:   { speed: 1.7, meleeRange: 0.85, meleeDmg: [7, 13],  aggroR: 9, atkCd: 0.95 },
    gunman: { speed: 1.7, meleeRange: 0.85, meleeDmg: [7, 13],  aggroR: 9, atkCd: 0.95 },
    brute:  { speed: 1.3, meleeRange: 1.0,  meleeDmg: [12, 20], aggroR: 7, atkCd: 1.1 },
    sniper: { speed: 1.4, meleeRange: 0.85, meleeDmg: [7, 13],  aggroR: 10, atkCd: 1.3,
              ranged: true, rangedRange: 7, rangedDmg: [10, 16] },
    // gameplay-identical reskins of goon/brute/sniper — same numbers, different uniform
    blackbelt: { speed: 1.3, meleeRange: 1.0,  meleeDmg: [12, 20], aggroR: 7, atkCd: 1.1 },
    soviet:    { speed: 1.7, meleeRange: 0.85, meleeDmg: [7, 13],  aggroR: 9, atkCd: 0.95 },
    spy:       { speed: 1.4, meleeRange: 0.85, meleeDmg: [7, 13],  aggroR: 10, atkCd: 1.3,
                 ranged: true, rangedRange: 7, rangedDmg: [10, 16] },
    // 005 isn't hostile until "The Truth" is used on him — at that instant shoot()
    // rewrites his kind from 'agent005' to 'boss005', which is what actually pulls
    // him into this table (and out of NO_DAMAGE) — no separate aggro/AI code needed.
    boss005: { speed: 1.3, meleeRange: 1.0, meleeDmg: [10, 18], aggroR: 14, atkCd: 0.45,
               ranged: true, rangedRange: 8, rangedDmg: [9, 16] },
    // reskins/new regulars — same melee-rifle-henchman shape as goon/soviet
    iransoldier: { speed: 1.7, meleeRange: 0.85, meleeDmg: [7, 13], aggroR: 9, atkCd: 0.95 },
    officer:     { speed: 1.7, meleeRange: 0.85, meleeDmg: [7, 13], aggroR: 9, atkCd: 0.95 },
    nyofficer:   { speed: 1.7, meleeRange: 0.85, meleeDmg: [7, 13], aggroR: 9, atkCd: 0.95 },
    // sidearm-drawn ranged henchman, same shape as spy/sniper
    hkcop: { speed: 1.4, meleeRange: 0.85, meleeDmg: [7, 13], aggroR: 10, atkCd: 1.3,
             ranged: true, rangedRange: 7, rangedDmg: [10, 16] },
    // El Presidente: a boss — hits harder and closes faster than a regular henchman
    elpresidente: { speed: 1.4, meleeRange: 1.1, meleeDmg: [16, 26], aggroR: 12, atkCd: 0.75 },
  };
  const CIVILIAN_KINDS = new Set(['crewcommand', 'crewscience', 'crewengineer', 'crewsecurity', 'crewmedic', 'crewtech', 'crewmember', 'crewalien', 'crewops', 'civilianM', 'civilianF', 'vendor', 'waiter', 'tourist', 'fisherman', 'flowergirl', 'carlotta', 'drz', 'defector', 'matron', 'streetartist', 'laundrylady', 'double', 'patsy', 'lao', 'baldini', 'wilson', 'hkgangster', 'nyfirefighter', 'nyconstruction', 'nybeatnik', 'nybusinessman', 'nysocialite', 'nypainter', 'nyoldtimer', 'meprofessor', 'mestudent', 'meelder', 'memother', 'mejournalist', 'mesocialite', 'meantiquedealer', 'meteacher', 'memusician', 'londonmod', 'londonmodgirl', 'londongangster', 'londonpensioner', 'londonartist', 'militiaman', 'havanaofficial', 'havanafarmer', 'havanacanecutter', 'havanawriter', 'cosmonaut', 'sovietofficial', 'sovietcitizen', 'sovietshopper', 'sovietscientist']);
  const totalHostiles = World.ents.filter(e => HOSTILE[e.kind]).length;
  // Quest-critical kinds never take damage — destroying 004's body, the vacuum
  // tube, or Volkov's desk could strand the puzzle chain with no way to recover.
  // Weapon pickups are similarly protected: a stray shot near a case (especially
  // the one-per-mission Golden Gun) shouldn't be able to destroy it before it's found.
  // Same logic for the new puzzle devices (defusing/deciphering must go through
  // their own tool-based interactions, not a stray bullet) and Agent 005 pre-reveal.
  // Every other entity with an `hp` field (every plain prop, via World.js's
  // `prop()` factory) is fair game — "make all sprites destructible."
  const NO_DAMAGE = new Set(['agent', 'tube', 'desk', 'wpn_sterling', 'wpn_ar7', 'wpn_laser', 'wpn_golden',
    'agent005', 'ciphermachine', 'bomb', 'microfichemachine', 'parisphantom',
    'fiona',    // this ain't that kind of game — Fiona the dog can never be hurt
    'memother']);  // nor children — the mother/daughter pair (one sprite) is always off-limits

  const keys = {};
  let mouseDown = false;                     // held for full-auto weapons
  let ctrlDown = false;                      // Ctrl is an alternate fire key, held for full-auto weapons — kept
                                              // separate from mouseDown so releasing one doesn't cut off the other

  const hpEl = document.getElementById('hp');
  const ammoEl = document.getElementById('ammo');
  const coverEl = document.getElementById('cover');
  const weaponEl = document.getElementById('weapon');
  const tModeEl = document.getElementById('tMode');
  const modeEl = document.getElementById('modeline');
  const overlay = document.getElementById('overlay');

  // Touch devices get an on-screen control layer instead of mouse+keyboard —
  // see the #touchlook/#touchdpad/#touchkit/#touchactions wiring near the
  // bottom of this file. Every one of those controls calls the exact same
  // function a keyboard/mouse action already calls; nothing here is a
  // separate mobile code path for game logic, just a different input source.
  // (isTouch itself is declared up top, before Engine.init, since the
  // render-resolution choice needs it too.)
  if (isTouch) document.body.classList.add('touch');

  function switchWeapon(kind) {
    if (!G.owned[kind]) { Adventure.msg('You don’t have that yet.', 1.5); return; }
    const wasDrawn = G.combat;
    G.combat = true;                        // picking a weapon draws it — no separate "draw" step needed
    if (!G.locked) requestLock();
    if (G.weapon === kind) { if (!wasDrawn) Adventure.msg(WEAPONS[kind].name + ' READY.', 1.5); return; }
    G.weapon = kind;
    G.gunSprite = WEAPONS[kind].spr;
    G.meleeWeapon = !!WEAPONS[kind].melee;
    G.fireT = 0;
    Adventure.msg(WEAPONS[kind].name + ' READY.', 1.5);
  }
  // Touch has no 1-5/0 weapon-select keys, so the kit-cycle arrows (repurposed
  // now that autoEquip picks the right inventory item automatically — see
  // Adventure.autoEquip — so manual item cycling is rarely needed) step
  // through owned weapons instead, wrapping and skipping anything not owned.
  const CYCLE_WEAPONS = [...WEAPON_ORDER, 'fists'];
  function cycleWeapon(dir) {
    const owned = CYCLE_WEAPONS.filter(k => G.owned[k]);
    if (!owned.length) return;
    const i = owned.indexOf(G.weapon);
    const next = owned[(i < 0 ? 0 : i + dir + owned.length) % owned.length];
    switchWeapon(next);
  }

  // ---------------------------------------------------------------- modes --
  // The view stays pointer-locked throughout play, whether the gun is drawn
  // (G.combat) or holstered — holstering no longer drops back to a free
  // cursor, it just switches what a left-click on the crosshair's target does
  // (shoot vs. LOOK/USE/TAKE). Losing the lock (e.g. the browser's own Esc)
  // always falls back to holstered; the canvas re-requests it on next click.
  // Touch has no Pointer Lock API worth relying on (spotty/absent on mobile
  // Safari, and there's no mouse cursor to hide anyway) — "locked" is just a
  // flag we set directly and leave true for the whole mission.
  function requestLock() {
    if (isTouch) { G.locked = true; syncMode(); return; }
    const p = canvas.requestPointerLock && canvas.requestPointerLock();
    if (p && p.catch) p.catch(() => {});
  }
  function syncMode() {
    if (!isTouch) G.locked = document.pointerLockElement === canvas;
    if (!G.locked) G.combat = false;
    document.body.classList.toggle('adventure', !G.combat);
    if (!G.locked) {
      modeEl.textContent = 'CURSOR FREE — click the game to resume';
    } else {
      modeEl.textContent = G.combat
        ? 'COMBAT MODE — TAB or F to holster · right-click to LOOK'
        : 'HOLSTERED — click to USE/TAKE, right-click to LOOK · Q/E or [ ] cycle kit, ENTER/R select · TAB or F to draw';
    }
  }
  document.addEventListener('pointerlockchange', syncMode);
  document.addEventListener('pointerlockerror', syncMode);

  // ------------------------------------------------------------- cover status --
  // Undercover → Blown is a one-way door for the level: hostiles ignore the
  // player entirely while undercover (see the aggro gate in update()), no matter
  // the sightline. Returns true only on the actual Undercover→Blown transition,
  // so callers can show a one-time message instead of spamming on every shot.
  function blowCover() {
    if (G.blown) return false;
    G.blown = true;
    Sfx.alarm();
    Music.setBlown(true);
    return true;
  }

  function toggleMode() {
    if (!G.started || G.over) return;
    if (!G.locked) { requestLock(); return; }     // lost the lock (e.g. Esc) — re-engage it, holstered
    G.combat = !G.combat;
    syncMode();
  }
  // Right-click is no longer the draw/holster toggle (TAB/F/the draw button
  // cover that) — it's always LOOK on the crosshair's target, holstered or
  // not. That's the escape hatch for anything both takeable/usable AND worth
  // reading the flavor text on (the passive hover label is just a name tag).
  // contextmenu is still suppressed so it doesn't pop the native menu.
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('mousedown', e => {
    if (e.button !== 2 || !G.started || G.over) return;
    if (!G.locked) { requestLock(); return; }
    Adventure.lookAt(Engine.W / 2, Engine.H / 2);
  });
  // -------------------------------------------------------------- cheats --
  // typed anywhere during a mission, like a classic arcade cheat code — no
  // console, just type the letters and release. Reuses the exact same pickup
  // logic as the real items/weapons so a cheat can't leave state inconsistent
  // with a legitimately-collected one (e.g. LEE resets aggro exactly like the
  // disguise kit does; GUY caps ammo at the same maxAmmo the HUD assumes).
  const CHEATS = {
    GUY: () => {                                            // all guns, full ammo
      for (const wk of WEAPON_ORDER) { G.owned[wk] = true; G.ammo[wk] = WEAPONS[wk].maxAmmo; }
      Adventure.msg('CHEAT: full arsenal, fully loaded.', 3);
    },
    LEE: () => {                                            // clear cover-blown status
      if (!G.blown) { Adventure.msg('CHEAT: already undercover.', 3); return; }
      G.blown = false;
      for (const h of World.ents) { if (HOSTILE[h.kind] && !h.dead) { h.aggro = false; h.atkT = 0; } }
      Music.setBlown(false);
      Adventure.msg('CHEAT: cover regained.', 3);
    },
    MAX: () => {                                            // collect every currently-takeable item
      const n = Adventure.cheatCollectAll();
      Adventure.msg('CHEAT: collected ' + n + ' item' + (n === 1 ? '' : 's') + '.', 3);
    },
    MOM: () => {                                            // full heal + invulnerable (toggle)
      G.player.hp = 100;
      G.invuln = !G.invuln;
      Adventure.msg(G.invuln ? 'CHEAT: full HP, nothing can touch you now.' : 'CHEAT: full HP, invulnerability off.', 3);
    },
  };
  let cheatBuf = '';

  // ---------------------------------------------------------------- input --
  const WEAPON_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'];
  document.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    if (G.started && !G.over) {
      const wi = WEAPON_KEYS.indexOf(e.code);
      if (wi >= 0) switchWeapon(WEAPON_ORDER[wi]);
      if (e.code === 'Tab' || e.code === 'KeyF') { e.preventDefault(); if (!e.repeat) toggleMode(); }   // faster than right-click for switching combat <-> adventure
      if (e.code === 'Digit0' && !e.repeat) { e.preventDefault(); switchWeapon('fists'); }                 // 0: fists — bare-handed melee, same slot mechanics as any gun
      if ((e.code === 'ControlLeft' || e.code === 'ControlRight') && G.combat) { ctrlDown = true; if (!e.repeat) shoot(); }
      // [ / ] cycle the field kit (ENTER selects/deselects for USE); Q/E mirror
      // them on the left hand so the mouse never has to leave aiming for it
      if ((e.code === 'BracketLeft' || e.code === 'KeyQ') && !e.repeat) { e.preventDefault(); Adventure.cycleInv(-1); }
      if ((e.code === 'BracketRight' || e.code === 'KeyE') && !e.repeat) { e.preventDefault(); Adventure.cycleInv(1); }
      if ((e.code === 'Enter' || e.code === 'KeyR') && !e.repeat) { e.preventDefault(); Adventure.confirmInv(); }   // R mirrors ENTER — left hand can do Q/E/R without leaving WASD
      if (e.key && e.key.length === 1 && /[a-zA-Z]/.test(e.key) && !e.repeat) {
        cheatBuf = (cheatBuf + e.key.toUpperCase()).slice(-3);
        if (CHEATS[cheatBuf]) { CHEATS[cheatBuf](); cheatBuf = ''; }
      }
    }
  });
  document.addEventListener('keyup', e => {
    keys[e.code] = false;
    if (e.code === 'ControlLeft' || e.code === 'ControlRight') ctrlDown = false;
  });

  // Mouse-look always drives the view once locked, drawn or holstered alike —
  // holstering no longer frees the cursor, it just changes what a left-click
  // on the crosshair's target does (see mousedown below).
  document.addEventListener('mousemove', e => {
    if (!G.locked) return;
    G.player.a += e.movementX * 0.0022;
    const pLim = pitchLimit();
    G.player.pitch = Math.max(-pLim, Math.min(pLim, G.player.pitch - e.movementY * 0.35));
  });

  canvas.addEventListener('mousedown', e => {
    if (!G.started || G.over || e.button !== 0) return;
    if (!G.locked) { requestLock(); return; }
    if (G.combat) { mouseDown = true; shoot(); }
    else Adventure.clickAt(Engine.W / 2, Engine.H / 2);   // crosshair-center hit test — LOOK/TAKE/USE, context-sensitive
  });
  window.addEventListener('mouseup', () => { mouseDown = false; });

  // ---------------------------------------------------------------- touch --
  // Pointer Events unify mouse/touch/pen in one listener, which also means
  // this is exercisable with a plain mouse in a desktop browser for testing —
  // every handler below just calls the exact same function its keyboard/mouse
  // equivalent calls (shoot/clickAt/toggleMode/cycleInv/confirmInv), so there
  // is no separate mobile game-logic path, only a different input source.
  if (isTouch) {
    // Belt-and-suspenders on top of the CSS touch-action/overscroll-behavior
    // lockdown (style.css) — some mobile browsers still sneak in a bounce or
    // pinch-zoom from a raw touchmove/gesturestart if nothing calls
    // preventDefault on it directly.
    document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    document.addEventListener('gesturestart', e => e.preventDefault());

    const touchLookEl = document.getElementById('touchlook');
    let lookPid = -1, lookX = 0, lookY = 0;
    touchLookEl.addEventListener('pointerdown', e => {
      if (!G.started || G.over) { requestLock(); return; }
      lookPid = e.pointerId; lookX = e.clientX; lookY = e.clientY;
      touchLookEl.setPointerCapture(e.pointerId);
    });
    touchLookEl.addEventListener('pointermove', e => {
      if (e.pointerId !== lookPid || !G.locked) return;
      const dx = e.clientX - lookX, dy = e.clientY - lookY;
      lookX = e.clientX; lookY = e.clientY;
      G.player.a += dx * 0.006;
      const pLim = pitchLimit();
      G.player.pitch = Math.max(-pLim, Math.min(pLim, G.player.pitch - dy * 0.6));
    });
    const endLook = e => { if (e.pointerId === lookPid) lookPid = -1; };
    touchLookEl.addEventListener('pointerup', endLook);
    touchLookEl.addEventListener('pointercancel', endLook);

    // d-pad: hold-to-move, reusing the exact same `keys` state update()
    // already reads for WASD — releasing (pointerup/cancel/leave, so a finger
    // sliding off the button doesn't leave it stuck "held") clears it again.
    const dpadKey = { tdUp: 'KeyW', tdDown: 'KeyS', tdLeft: 'KeyA', tdRight: 'KeyD' };
    for (const id in dpadKey) {
      const el = document.getElementById(id), code = dpadKey[id];
      el.addEventListener('pointerdown', e => { e.preventDefault(); keys[code] = true; el.setPointerCapture(e.pointerId); });
      const release = () => { keys[code] = false; };
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);
      el.addEventListener('pointerleave', release);
    }

    document.getElementById('tKitPrev').addEventListener('pointerdown', e => { e.preventDefault(); cycleWeapon(-1); });
    document.getElementById('tKitNext').addEventListener('pointerdown', e => { e.preventDefault(); cycleWeapon(1); });
    document.getElementById('tKitOk').addEventListener('pointerdown', e => { e.preventDefault(); Adventure.confirmInv(); });

    document.getElementById('tMode').addEventListener('pointerdown', e => { e.preventDefault(); toggleMode(); });
    document.getElementById('tLook').addEventListener('pointerdown', e => {
      e.preventDefault();
      if (!G.started || G.over || !G.locked) return;
      Adventure.lookAt(Engine.W / 2, Engine.H / 2);
    });
    const fireEl = document.getElementById('tFire');
    fireEl.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (!G.started || G.over) return;
      if (!G.locked) { requestLock(); return; }
      if (G.combat) { mouseDown = true; shoot(); }
      else Adventure.clickAt(Engine.W / 2, Engine.H / 2);
    });
    const fireRelease = () => { mouseDown = false; };
    fireEl.addEventListener('pointerup', fireRelease);
    fireEl.addEventListener('pointercancel', fireRelease);
    fireEl.addEventListener('pointerleave', fireRelease);
  }

  // --------------------------------------------------------------- combat --
  // shared by every shoot() outcome (gun or fists): apply [lo,hi] damage to an
  // already-picked target and resolve the hit/kill outcome the same way
  // regardless of what dealt it.
  function applyHit(best, lo, hi) {
    best.hp -= lo + Math.random() * (hi - lo);
    best.flash = 0.12;
    if (best.hp > 0) {
      if (HOSTILE[best.kind]) { best.aggro = true; Sfx.impHit(); }
      else Sfx.impHit();
      return;
    }
    if (CIVILIAN_KINDS.has(best.kind)) {
      best.dead = true;
      best.solid = false;
      G.civKills++;
      Sfx.hurt();
      if (G.civKills >= 3) { dieCivilians(); return; }
      Adventure.msg('A local goes down. Word will spread — two more and this mission is over.', 3.5);
    } else if (HOSTILE[best.kind]) {
      best.dead = true;
      best.solid = false;
      G.kills++;
      Sfx.impDie();
      if (best.kind === 'boss005') {
        Adventure.addItem('keys', 'KEYS');
        Adventure.msg('005 falls. A set of keys spills from his jacket.', 4);
      }
      checkAllHostilesDead();
    } else {
      World.spawnFx(best.x, best.y);                       // a plain prop, wrecked — burst + vanish, no lingering corpse
      World.removeEnt(best);
      Sfx.impDie();
    }
  }

  function shoot() {
    const wpn = WEAPONS[G.weapon];
    if (G.fireT > 0) return;
    if (!wpn.melee) {
      if (G.ammo[G.weapon] <= 0) { Sfx.dry(); Adventure.msg('Click. The magazine is empty.'); return; }
      G.ammo[G.weapon]--;
    }
    G.fireT = wpn.cd;
    if (wpn.melee) G.meleeSwingCd = wpn.cd;   // lets the renderer normalize the slash animation's progress (0..1)
    if (wpn.melee) Sfx.punch();
    else Sfx.shoot();
    // a gunshot is loud regardless of whether it connects — cover blows the instant
    // you fire. A punch is silent unless it actually lands on someone; thrown at
    // empty air it blows nothing (checked again below, only once a target is found).
    if (!wpn.melee && blowCover()) Adventure.msg('The shot cracks across the square. Cover’s blown.', 4);
    if (wpn.melee) Adventure.msg('JUDO CHOP!', 1.5);

    const p = G.player;
    const dx = Math.cos(p.a), dy = Math.sin(p.a);
    const wallDist = Engine.colHit[Engine.W >> 1] ? Engine.colHit[Engine.W >> 1].dist : 64;
    const maxDepth = Math.min(wpn.melee ? wpn.range : Infinity, wallDist + 0.4);
    let best = null, bestDepth = 1e9;
    for (const e of World.ents) {
      if (e.dead || e.hp == null || NO_DAMAGE.has(e.kind)) continue;   // everything with hp is fair game
      const rx = e.x - p.x, ry = e.y - p.y;
      const depth = rx * dx + ry * dy;
      if (depth < 0.2 || depth > maxDepth) continue;
      const lateral = rx * -dy + ry * dx;
      if (Math.abs(lateral) > 0.42) continue;
      if (depth < bestDepth) { bestDepth = depth; best = e; }
    }
    if (!best) return;
    if (wpn.melee && blowCover()) Adventure.msg('Cover’s blown.', 4);
    applyHit(best, wpn.dmg[0], wpn.dmg[1]);
  }

  // ------------------------------------------------------- vector runtime --
  // The game runs on the portal/Build engine: the grid level is compiled to
  // vector geometry (geo) and rebuilt whenever a door changes it. Rendering,
  // collision, LOS and eye-height all read the geo, not the grid.
  let geo = null, graph = null, geoRev = -1;
  function ensureGeo() {
    if (World.geoRev === geoRev) return;
    geo = World.getGeo();               // authored vector geo if present, else compiled from grid
    graph = Engine.buildGraph(geo);
    geoRev = World.geoRev;
    for (const e of World.ents) e.sector = undefined;   // sector indices shift on recompile
    G.player.sector = undefined;
  }

  let winBlockT = 0;                    // last time the "you can't leave yet" nudge was shown (see the win-sector gate)
  const STEP = 0.5;                     // highest ledge you can climb in one move
  const JUMP_V = 5.2, GRAVITY = 15.5, HEAD_CLR = 0.12;   // jump takeoff speed, gravity, headroom before a ceiling bonk
  function los(x0, y0, x1, y1) { return Engine.losGeo(geo, graph, x0, y0, x1, y1); }
  // Engine.moveGeo only ever collided against WALL geometry — `solid` on an
  // entity (every FACT prop sets one, e.g. desk/hedge/sedan default true) was
  // never actually consulted anywhere, so solid props have silently let every
  // mover (player, hostiles, civilians) walk straight through them since the
  // portal engine went in. Push the mover back out of any solid entity's
  // rough footprint AFTER the wall-collided position is resolved — simple
  // radial correction, not a full sweep/slide (props are static, so this is
  // enough to stop you walking into one; it doesn't need wall-quality sliding).
  function tryMove(o, nx, ny, r) {
    Engine.moveGeo(geo, graph, o, nx, ny, r, STEP);
    let pushed = false;
    for (const e of World.ents) {
      if (e === o || !e.solid || e.dead) continue;
      const er = (e.scale || 0.5) * 0.4, min = r + er;
      const dx = o.x - e.x, dy = o.y - e.y, d = Math.hypot(dx, dy);
      if (d < min && d > 1e-4) { o.x = e.x + (dx / d) * min; o.y = e.y + (dy / d) * min; pushed = true; }
    }
    // The push-out above writes o.x/o.y directly, AFTER moveGeo already resolved
    // and cached o.sector for the pre-push position. Even a small shove can carry
    // the mover across a portal edge, leaving o.sector naming a sector that no
    // longer contains it. The renderer's "is my cached sector still valid?" check
    // then fails and it re-roots the whole portal walk at a fresh sectorAt() — a
    // different sector than physics believes — which reads as a flash while
    // squeezing past a solid prop near a sector boundary (and also makes the
    // eye-height lookup on the next line read the wrong sector's floor).
    // Re-derive from the final position with the same continuity-preserving
    // lookup physics itself uses, so render and physics stay in agreement.
    if (pushed) o.sector = Engine.localSector(geo, graph, o.x, o.y, o.sector);
  }

  // --------------------------------------------------------------- update --
  function update(dt) {
    const p = G.player;

    // turning (arrow keys as fallback to mouse-look)
    const turn = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
    p.a += turn * 2.6 * dt;

    // movement
    const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    const s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    const dx = Math.cos(p.a), dy = Math.sin(p.a);
    const len = Math.hypot(f, s);
    if (len > 0) {
      const sp = 3.4 * dt / len;
      tryMove(p, p.x + (dx * f - dy * s) * sp, p.y + (dy * f + dx * s) * sp, 0.26);
      G.bobT += dt * 1.6;
      G.bobAmt = Math.min(1, G.bobAmt + dt * 6);
    } else {
      G.bobAmt = Math.max(0, G.bobAmt - dt * 6);
    }

    // eye height: eases toward the floor you're standing on (steps, platforms) while
    // grounded; a jump takes over as a real vz/gravity arc until it lands again.
    const floorZ = Engine.geoFloorAtXY(geo, graph, p.x, p.y, p.sector);
    const targetEye = floorZ + 0.5;
    const grounded = p.vz === 0 && p.eyeZ <= targetEye + 0.02;
    if (grounded && keys.Space) { p.vz = JUMP_V; }
    if (p.vz !== 0 || p.eyeZ > targetEye + 0.02) {
      p.vz -= GRAVITY * dt;
      p.eyeZ += p.vz * dt;
      const cs = Engine.localSector(geo, graph, p.x, p.y, p.sector);
      const ceilZ = cs >= 0 ? geo.sectors[cs].ceil : Infinity;
      if (p.eyeZ + HEAD_CLR > ceilZ) { p.eyeZ = ceilZ - HEAD_CLR; if (p.vz > 0) p.vz = 0; }  // head bonk
      if (p.eyeZ <= targetEye) { p.eyeZ = targetEye; p.vz = 0; Sfx.land(); }                 // touchdown
    } else {
      p.eyeZ += (targetEye - p.eyeZ) * Math.min(1, dt * 10);
    }

    G.fireT = Math.max(0, G.fireT - dt);
    p.hurtT = Math.max(0, p.hurtT - dt);
    if ((mouseDown || ctrlDown) && G.combat && WEAPONS[G.weapon].auto) shoot();   // full-auto: hold LMB or Ctrl, gated by the same cooldown as any other shot

    // enemies move at a crawl while you're pointing and clicking
    const edt = G.combat ? dt : dt * 0.25;
    for (const e of World.ents) {
      const st = HOSTILE[e.kind];
      if (!st || e.dead) continue;
      e.flash = Math.max(0, e.flash - dt);
      e.atkT = Math.max(0, e.atkT - edt);
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      // Undercover: hostiles never notice the player, however close or in view —
      // this is the whole stealth layer. Once Cover is Blown, normal aggro rules.
      if (G.blown && !e.aggro && d < st.aggroR && los(e.x, e.y, p.x, p.y)) {
        e.aggro = true;
        Sfx.growl();
      }
      if (!e.aggro) continue;
      if (d <= st.meleeRange) {
        if (e.atkT <= 0) {
          e.atkT = st.atkCd;
          if (!G.invuln) {
            const [lo, hi] = st.meleeDmg;
            p.hp -= lo + Math.random() * (hi - lo);
            p.hurtT = 0.35;
            Sfx.hurt();
            if (p.hp <= 0) { p.hp = 0; die(); }
          }
        }
      } else if (st.ranged && d <= st.rangedRange) {
        if (e.atkT <= 0 && los(e.x, e.y, p.x, p.y)) {         // holds position and fires — doesn't close in
          e.atkT = st.atkCd;
          if (!G.invuln) {
            const [lo, hi] = st.rangedDmg;
            p.hp -= lo + Math.random() * (hi - lo);
            p.hurtT = 0.35;
            Sfx.shoot();
            if (p.hp <= 0) { p.hp = 0; die(); }
          }
        }
      } else {
        const sp = st.speed * edt / d;
        tryMove(e, e.x + (p.x - e.x) * sp, e.y + (p.y - e.y) * sp, 0.3);
      }
    }

    // civilians: wander near their spawn point, or stand still — never fight
    for (const e of World.ents) {
      if (!CIVILIAN_KINDS.has(e.kind) || e.dead) continue;
      if (e.behavior !== 'wander') continue;
      e.wanderT -= dt;
      if (e.wanderT <= 0) {
        const a2 = Math.random() * Math.PI * 2, r = 1 + Math.random() * 2.5;
        e.wx = e.anchorX + Math.cos(a2) * r; e.wy = e.anchorY + Math.sin(a2) * r;
        e.wanderT = 2.5 + Math.random() * 3.5;
      }
      const wd = Math.hypot(e.wx - e.x, e.wy - e.y);
      if (wd > 0.15) tryMove(e, e.x + (e.wx - e.x) * Math.min(1, 0.6 * dt / wd), e.y + (e.wy - e.y) * Math.min(1, 0.6 * dt / wd), 0.25);
    }

    // the defector escort: once flagged following (watch handed over), he tags
    // along at a short distance. Dying along the way ends the mission — he only
    // dies from the player's own fire (hostiles never target anyone but the
    // player in this engine), but that's still a real, felt risk of friendly fire.
    if (Adventure.flags.defectorFollowing && !Adventure.flags.defectorLost) {
      const def = World.ents.find(e => e.kind === 'defector');
      if (!def || def.dead) {
        Adventure.flags.defectorLost = true;
        dieDefector();
      } else {
        const dd = Math.hypot(p.x - def.x, p.y - def.y);
        if (dd > 1.4) tryMove(def, def.x + (p.x - def.x) * Math.min(1, 2.2 * dt / dd), def.y + (p.y - def.y) * Math.min(1, 2.2 * dt / dd), 0.3);
      }
    }

    // Tehran escort: once Rostam is flagged following (see adventure.js), he tags
    // along at a short distance, same as the Havana defector. Dying en route ends
    // the mission — again, only from the player's own fire.
    if (Adventure.flags.rostamFollowing && !Adventure.flags.rostamLost) {
      const ros = World.ents.find(e => e.kind === 'rostam');
      if (!ros || ros.dead) {
        Adventure.flags.rostamLost = true;
        dieRostam();
      } else {
        const rd = Math.hypot(p.x - ros.x, p.y - ros.y);
        if (rd > 1.4) tryMove(ros, ros.x + (p.x - ros.x) * Math.min(1, 2.2 * dt / rd), ros.y + (p.y - ros.y) * Math.min(1, 2.2 * dt / rd), 0.3);
      }
    }

    // Dealey Plaza: once the double is suited and masked he tags along to the
    // extraction point, same shape as the Havana/Tehran escorts. Losing him
    // ends the mission — the whole plan is him being seen leaving.
    if (Adventure.flags.doubleFollowing && !Adventure.flags.doubleLost) {
      const dbl = World.ents.find(e => e.kind === 'double');
      if (!dbl || dbl.dead) {
        Adventure.flags.doubleLost = true;
        dieDouble();
      } else {
        const bd = Math.hypot(p.x - dbl.x, p.y - dbl.y);
        if (bd > 1.4) tryMove(dbl, dbl.x + (p.x - dbl.x) * Math.min(1, 2.2 * dt / bd), dbl.y + (p.y - dbl.y) * Math.min(1, 2.2 * dt / bd), 0.3);
      }
    }

    // transient fx (explosion bursts from destroyed props): age out and remove
    for (const e of [...World.ents]) {
      if (e.kind !== 'fx') continue;
      e.t += dt;
      if (e.t > World.FX_LIFE) World.removeEnt(e);
    }

    // walk-over pickups
    for (const e of [...World.ents]) {
      if (!e.pickup || e.dead) continue;                    // shot-up supplies can't be scavenged afterward
      if (Math.hypot(p.x - e.x, p.y - e.y) > 0.65) continue;
      if (e.pickup === 'med') {
        if (p.hp >= 100) continue;
        p.hp = Math.min(100, p.hp + 25);
        Adventure.msg('+25 HP. Field dressing, agent grade.');
      } else if (e.pickup === 'weapon') {
        const wk = e.weaponKind, wpn = WEAPONS[wk], wasOwned = G.owned[wk];
        G.owned[wk] = true;
        G.ammo[wk] = Math.min(wpn.maxAmmo, G.ammo[wk] + e.grantAmmo);
        if (wasOwned) {
          Adventure.msg('+' + e.grantAmmo + ' rounds for the ' + wpn.name + '.');
        } else {
          switchWeapon(wk);
          Adventure.msg('Acquired: ' + wpn.name + '. Press ' + (WEAPON_ORDER.indexOf(wk) + 1) + ' to switch to it.', 4);
        }
      } else if (e.pickup === 'disguise') {
        if (G.blown) {
          G.blown = false;
          // Regaining cover has to actually make hostiles forget you — merely
          // flipping G.blown left every already-aggroed enemy's `aggro` flag
          // stuck true forever (aggro is sticky per-entity, not re-checked once
          // set), so they kept attacking right through the "Cover regained"
          // message. Reset the lot so the stealth gate is meaningful again.
          for (const h of World.ents) {
            if (HOSTILE[h.kind] && !h.dead) { h.aggro = false; h.atkT = 0; }
          }
          Music.setBlown(false);
          Adventure.msg('Glasses, nose, moustache, a tilted fedora — you become nobody in particular. Cover regained.', 4);
        } else {
          continue;                                          // undercover already — leave the kit for when it's actually needed
        }
      } else {
        G.ammo.walther = Math.min(WEAPONS.walther.maxAmmo, G.ammo.walther + 10);
        Adventure.msg('+10 rounds for the Walther. A love language.');
      }
      World.removeEnt(e);
      Sfx.pickup();
    }

    const cs = Engine.localSector(geo, graph, p.x, p.y, p.sector);
    if (cs >= 0 && geo.sectors[cs].hostile && blowCover()) Adventure.msg('You’ve wandered into hostile territory. Cover’s blown.', 4);
    // A win sector is the extraction point — it only counts once the mission's
    // objective is actually done (escort delivered, prize in hand). Without this
    // gate you could walk straight to the exit and skip the whole puzzle.
    if (cs >= 0 && geo.sectors[cs].win) {
      const block = Adventure.winSectorBlock();
      if (!block) win();
      else if (performance.now() - winBlockT > 4000) { winBlockT = performance.now(); Adventure.msg(block, 3.5); }  // throttled: this runs every frame you stand there
    }
    if (cs >= 0 && geo.sectors[cs].missionLink && !G.transitioning) enterGate(geo.sectors[cs].missionLink);
    // Warp sectors come in linked pairs, so the sector you land in points right
    // back at the one you left — firing again on the very next frame would
    // ping-pong you forever. Latch the sector we arrived in and stay quiet until
    // the player actually walks out of it.
    if (cs !== G.warpLock) {
      G.warpLock = -1;
      if (cs >= 0 && geo.sectors[cs].warpTo != null && !G.transitioning) warpPlayer(cs, geo.sectors[cs].warpTo);
    }
  }

  // ---- sector warp: a linked pair of sectors behaves as one place in two
  // spots — step into either and you come out of the other. Built for faking
  // elevators (two identical rooms on "different floors"), but works for any
  // portal-style shortcut.
  function sectorCentre(s) {
    const L = geo.sectors[s].loop;
    let x = 0, y = 0;
    for (const vi of L) { x += geo.verts[vi].x; y += geo.verts[vi].y; }
    return { x: x / L.length, y: y / L.length };
  }
  // A point guaranteed to be inside sector s. The vertex average is inside any
  // convex room, but an L-shaped one can put its own average outside itself —
  // fall back to creeping in from a corner toward that average.
  function safePointIn(s) {
    const c = sectorCentre(s);
    if (Engine.sectorAt(c.x, c.y, geo) === s) return c;
    for (const vi of geo.sectors[s].loop) {
      const v = geo.verts[vi];
      for (const t of [0.25, 0.5, 0.75]) {
        const q = { x: v.x + (c.x - v.x) * t, y: v.y + (c.y - v.y) * t };
        if (Engine.sectorAt(q.x, q.y, geo) === s) return q;
      }
    }
    return c;
  }
  function warpPlayer(from, to) {
    if (!geo.sectors[to]) return;
    const p = G.player, a = sectorCentre(from), b = sectorCentre(to);
    // Carry the player's offset from the centre across, so a matched pair of
    // rooms reads as the room having moved rather than the player being flung
    // into the middle of it. Differently-shaped rooms may not fit that offset —
    // drop to a known-inside point when it lands outside the destination.
    let nx = b.x + (p.x - a.x), ny = b.y + (p.y - a.y);
    if (Engine.sectorAt(nx, ny, geo) !== to) { const q = safePointIn(to); nx = q.x; ny = q.y; }
    p.x = nx; p.y = ny;
    p.sector = to;                                              // localSector caches the last sector — hand it the new one
    p.eyeZ = Engine.geoFloorAtXY(geo, graph, nx, ny, to) + 0.5;  // arrive standing, rather than falling in
    p.vz = 0;
    G.warpLock = to;
    Sfx.power();
  }

  // Hub airport: walking into a gate sector either boots that city's shipped
  // mission or, if it hasn't been authored yet, just says so and lets you
  // keep browsing — see missions/*.json + js/missions.js.
  function enterGate(city) {
    if (World.hasMission(city)) {
      G.transitioning = true;
      location.href = 'index.html?mission=' + city;
    } else {
      Adventure.msg(city.toUpperCase() + ' — MISSION COMING SOON.', 3);
    }
  }

  // ------------------------------------------------------------------ hud --
  function updateHud() {
    hpEl.textContent = Math.ceil(G.player.hp);
    hpEl.classList.toggle('low', G.player.hp < 30);
    ammoEl.textContent = WEAPONS[G.weapon].melee ? '—' : G.ammo[G.weapon];
    weaponEl.textContent = WEAPONS[G.weapon].name;
    tModeEl.textContent = G.combat ? 'HOLSTER' : 'DRAW';
    coverEl.textContent = G.blown ? 'BLOWN' : 'UNDERCOVER';
    coverEl.classList.toggle('low', G.blown);

    // Holstered: hit-test dead-center every frame — the name is the automatic
    // "LOOK" (drawn on the canvas reticule, see Engine.paintOverlays), and
    // `verb` (use/take/null) is what the reticule icon shows and what a
    // left-click will do (see Adventure.clickAt in mousedown).
    if (!G.combat && G.started && !G.over) {
      const hit = Adventure.hudAt(Engine.W / 2, Engine.H / 2);
      G.reticuleName = hit.name;
      G.reticule = hit.verb;
      G.invSelectedName = Adventure.selectedName;
    } else {
      G.reticuleName = null;
      G.reticule = null;
      G.invSelectedName = null;
    }
  }

  // ------------------------------------------------------------- end game --
  // Per-mission "MISSION ACCOMPLISHED" banner art — already carries its own
  // title/episode-name lettering, so when one's shown the plain text <h1> is
  // skipped entirely rather than duplicating the title underneath it.
  const WIN_BANNERS = {
    cuba: 'Havanasuccess.png', dallas: 'dallassuccess.png', newyork: 'nycsuccess.png',
    tehran: 'tehransuccess.png', hongkong: 'hongkongsuccess.png', paris: 'Parissuccess.png',
    moscow: 'moscowsuccess.png',
  };
  function endOverlay(title, cls, body, btn, onClick, img) {
    overlay.innerHTML =
      (img ? '<img class="endart" src="assets/ui/' + img + '?v=1" alt="' + title + '">' : '<h1 class="' + cls + '">' + title + '</h1>') +
      '<p class="story">' + body + '</p>' +
      '<button id="againbtn">' + btn + '</button>';
    overlay.classList.remove('hidden');
    // reloading the same URL re-runs the exact same boot logic (world.js), so it's
    // also the correct "retry" for a failed episode level — only win() overrides this
    document.getElementById('againbtn').onclick = onClick || (() => location.reload());
  }

  function die() {
    if (G.over) return;
    G.over = true;
    document.exitPointerLock();
    Music.stop();
    endOverlay('MISSION FAILED', '',
      'Someone was always going to be waiting. This time, it was them.',
      '[ INSERT NEXT AGENT ]', undefined, 'Dead.png');
  }

  function dieCivilians() {
    if (G.over) return;
    G.over = true;
    document.exitPointerLock();
    Music.stop();
    endOverlay('MISSION FAILED', '',
      'Three bodies that were never supposed to be part of this. London does not send its regards.',
      '[ INSERT NEXT AGENT ]', undefined, 'imprisoned.png');
  }

  function dieDefector() {
    if (G.over) return;
    G.over = true;
    document.exitPointerLock();
    Music.stop();
    endOverlay('MISSION FAILED', '',
      'The defector never made it out. Whatever he knew, it dies with him — and so does London’s trust in you.',
      '[ INSERT NEXT AGENT ]');
  }

  function dieDouble() {
    if (G.over) return;
    G.over = true;
    document.exitPointerLock();
    Music.stop();
    endOverlay('MISSION FAILED', '',
      'The double never made it out of the plaza. There is no second man in the window now — only you, and a very good photograph of you.',
      '[ INSERT NEXT AGENT ]');
  }

  function dieRostam() {
    if (G.over) return;
    G.over = true;
    document.exitPointerLock();
    Music.stop();
    endOverlay('MISSION FAILED', '',
      'Rostam never made it out. Maheen will wait for a husband who is not coming home.',
      '[ INSERT NEXT AGENT ]');
  }

  function dieBomb() {
    if (G.over) return;
    G.over = true;
    document.exitPointerLock();
    Music.stop();
    endOverlay('MISSION FAILED', '',
      'Wrong wire. Dr. Z never got his prize, and neither did you.',
      '[ INSERT NEXT AGENT ]');
  }

  // Default win condition for every level, on top of whatever a mission
  // scripts on its own (win sectors, mission-link gates, puzzle payoffs like
  // Hong Kong's boss buyoff or Moscow's "The Truth"): clearing every hostile
  // wins the level outright. Checks World.ents live rather than comparing
  // G.kills to the totalHostiles count taken at load, since a kind can turn
  // hostile mid-mission (agent005 → boss005) without ever having been
  // counted as one of the original hostiles.
  function checkAllHostilesDead() {
    if (G.over || totalHostiles === 0) return;
    if (!World.ents.some(e => HOSTILE[e.kind] && !e.dead)) win();
  }
  function win() {
    if (G.over) return;
    G.over = true;
    document.exitPointerLock();
    Sfx.win();
    Music.stop();
    const secs = Math.round((performance.now() - G.t0) / 1000);
    const stats = 'ENEMIES NEUTRALIZED: ' + G.kills + ' / ' + totalHostiles + ' &nbsp;·&nbsp; TIME: ' + secs + 's<br>';
    const banner = WIN_BANNERS[World.currentMission];
    if (World.isEpisode) {
      const next = World.episodeSlot + 1;
      if (World.episodeHasNext) {
        endOverlay('MISSION COMPLETE', 'win',
          stats + 'London sends its regards. The next assignment is already waiting.',
          '[ NEXT MISSION: ' + next + ' OF ' + World.episodeTotal + ' ▶ ]',
          () => { location.href = 'index.html?episode=' + next; }, banner);
      } else {
        endOverlay('EPISODE COMPLETE', 'win',
          stats + 'The last gate closes behind you. London sends its regards — the episode is over.',
          '[ BACK TO START ]',
          () => { location.href = 'index.html'; }, banner);
      }
      return;
    }
    if (World.hasMission('hub') && World.currentMission !== 'hub') {
      endOverlay('MISSION COMPLETE', 'win',
        'The extraction goes clean. Somewhere, the people who sent you exhale.<br><br>' +
        stats + 'London sends its regards.',
        '[ BACK TO THE AIRPORT ]',
        () => { location.href = 'index.html?mission=hub'; }, banner);
    } else {
      endOverlay('MISSION COMPLETE', 'win',
        'The extraction goes clean. Somewhere, the people who sent you exhale.<br><br>' +
        stats + 'London sends its regards.',
        '[ PLAY AGAIN ]', undefined, banner);
    }
  }

  // ----------------------------------------------------------------- loop --
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (G.started) ensureGeo();
    if (G.started && !G.over) update(dt);
    if (G.started) Engine.renderPortal(G, geo, graph);
    updateHud();
    requestAnimationFrame(loop);
  }

  function beginMission() {
    Sfx.unlock();
    Music.unlock();
    Music.setTracks(World.musicUndercover, World.musicCoverBlown);
    Music.setBlown(G.blown);
    G.started = true;
    G.t0 = performance.now();
    overlay.classList.add('hidden');
    requestLock();   // start holstered but pointer-locked — drawing happens on picking a weapon (1-5), TAB/F, or right-click
    Adventure.msg('Eyes open. Cover’s thin and the clock is already running.', 5);
  }
  document.getElementById('startbtn').addEventListener('click', beginMission);

  // Jump into LAIR ARCHITECT with the level currently being played already
  // loaded — same localStorage key/shape the editor's own "SAVE TO BROWSER"
  // uses, so it lands exactly like reopening a saved local level. Uses the
  // level as it was BOOTED (World.bootLevel), not the live in-session state
  // (opened doors, moved civilians, etc.) — this is for editing the design,
  // not resuming a playthrough.
  document.getElementById('editlink').addEventListener('click', () => {
    try { localStorage.setItem('cloakclick.custom', JSON.stringify(World.bootLevel)); }
    catch (e) { console.warn('Could not hand the level to the editor:', e); }
  });

  // ------------------------------------------------------------ fullscreen --
  // Fullscreens #game (not <html>) so the overlay/HUD/mode line — everything
  // already nested inside it — come along; #game's own width: min(92vw,
  // 1400px, 150vh) formula then just resolves against the bigger viewport,
  // no separate scaling logic needed. Safari (incl. iOS-adjacent desktop
  // builds) still wants the -webkit- prefixed calls.
  const gameEl = document.getElementById('game');
  const fsBtn = document.getElementById('fullscreenbtn');
  // The desktop app's own window is already OS-fullscreen and stays that way
  // for the whole session, so the browser Fullscreen API buys nothing there —
  // and actively hurt: every scene change (menu → mission → hub) is a real
  // page navigation, and document fullscreen does not survive one, so the
  // picture dropped back to the windowed letterbox and had to be re-entered
  // by hand each time. On desktop we skip the API entirely and let CSS render
  // the fill-the-screen layout unconditionally, which no navigation can undo.
  function isFullscreen() {
    if (window.CLICKDAGGER_DESKTOP) return true;
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }
  function toggleFullscreen() {
    if (window.CLICKDAGGER_DESKTOP) return;   // always fullscreen — nothing to toggle
    if (!isFullscreen()) {
      const req = gameEl.requestFullscreen || gameEl.webkitRequestFullscreen;
      if (req) { const p = req.call(gameEl); if (p && p.catch) p.catch(() => {}); }
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document);
    }
  }
  function syncFullscreenBtn() {
    fsBtn.textContent = isFullscreen() ? '⛶ EXIT FULLSCREEN' : '⛶ FULLSCREEN';
    requestAnimationFrame(Engine.resize);   // canvas's displayed CSS size just changed — rAF so layout's settled first
  }
  fsBtn.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', syncFullscreenBtn);
  document.addEventListener('webkitfullscreenchange', syncFullscreenBtn);
  document.addEventListener('keydown', e => {
    if (e.code === 'KeyV' && !e.repeat && !e.target.matches('input, textarea')) toggleFullscreen();
  });
  // Ordinary window resizing (not just fullscreen) also changes the canvas's
  // displayed CSS size, so its backing store needs to follow — rAF-throttled
  // so a drag-resize doesn't call it dozens of times per second.
  let resizeQueued = false;
  window.addEventListener('resize', () => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => { resizeQueued = false; Engine.resize(); });
  });

  if (World.isEpisode) {
    const tag = document.getElementById('episodetag');
    tag.textContent = '▶ MISSION ' + World.episodeSlot + ' OF ' + World.episodeTotal + ' ◀';
    tag.style.display = 'block';
  } else if (World.isCustom && !World.currentMission) {   // shipped city/hub missions aren't "custom" — only a local editor level is
    document.getElementById('customtag').style.display = 'block';
  }
  Adventure.setWinTrigger(win);   // lets a puzzle payoff (e.g. the sports car + keys) end the mission directly
  Adventure.setLoseTrigger(dieBomb);   // cutting the wrong wire on the bomb ends it too
  Adventure.setBlowTrigger(blowCover);   // getting caught red-handed (e.g. lifting the Fabergé egg) blows cover directly

  syncMode();
  requestAnimationFrame(loop);

  // debug: drive one frame deterministically (used to verify logic when the
  // preview tab has rAF paused). Harmless in normal play.
  G.__step = (dt = 1 / 60) => { if (!G.started) return; ensureGeo(); if (!G.over) update(dt); Engine.renderPortal(G, geo, graph); };

  return G;
})();

// Debug handle
window.GAME = { G: Game, world: World, adv: Adventure, engine: Engine };
