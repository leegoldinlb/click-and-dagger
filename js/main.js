'use strict';

// Game state, input, combat, enemy AI, and the main loop.
const Game = (() => {
  const canvas = document.getElementById('view');
  Engine.init(canvas);

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
    golden:   { name: 'GOLDEN GUN',    spr: 'gunGolden',   dmg: [999, 999], cd: 0.6, maxAmmo: 1, auto: false },
  };
  const WEAPON_ORDER = ['walther', 'sterling', 'ar7', 'laser', 'golden'];

  const G = {
    player: { x: World.spawn.x, y: World.spawn.y, a: World.spawn.a, hp: 100, hurtT: 0,
              eyeZ: World.floorZAt(World.spawn.x, World.spawn.y) + 0.5, pitch: 0, vz: 0 },
    combat: false,
    started: false,
    over: false,
    bobT: 0, bobAmt: 0, fireT: 0,
    kills: 0, civKills: 0, t0: 0,
    blown: World.startBlown,          // Cover status: false = Undercover (hostiles ignore you), true = Blown (one-way door for the level)
    weapon: 'walther',                 // currently equipped weapon kind
    owned: { walther: true, sterling: false, ar7: false, laser: false, golden: false },
    ammo: { walther: 24, sterling: 0, ar7: 0, laser: 0, golden: 0 },
    gunSprite: 'gun',                  // read by Engine.paintOverlays for the HUD viewmodel — kept in sync by switchWeapon
  };
  // Per-kind combat stats for hostile entities. `ranged` kinds hold position and fire
  // once in rangedRange (with LOS), only closing distance to get there; everyone else
  // rushes to meleeRange. aggroR is how close (with LOS) wakes them from idle.
  const HOSTILE = {
    goon:   { speed: 1.7, meleeRange: 0.85, meleeDmg: [7, 13],  aggroR: 9, atkCd: 0.95 },
    brute:  { speed: 1.3, meleeRange: 1.0,  meleeDmg: [12, 20], aggroR: 7, atkCd: 1.1 },
    sniper: { speed: 1.4, meleeRange: 0.85, meleeDmg: [7, 13],  aggroR: 10, atkCd: 1.3,
              ranged: true, rangedRange: 7, rangedDmg: [10, 16] },
    // 005 isn't hostile until "The Truth" is used on him — at that instant shoot()
    // rewrites his kind from 'agent005' to 'boss005', which is what actually pulls
    // him into this table (and out of NO_DAMAGE) — no separate aggro/AI code needed.
    boss005: { speed: 1.3, meleeRange: 1.0, meleeDmg: [10, 18], aggroR: 14, atkCd: 0.45,
               ranged: true, rangedRange: 8, rangedDmg: [9, 16] },
  };
  const CIVILIAN_KINDS = new Set(['civilianM', 'civilianF', 'vendor', 'waiter', 'tourist', 'officer', 'fisherman', 'flowergirl', 'carlotta', 'drz', 'defector', 'matron', 'streetartist', 'laundrylady', 'double', 'patsy']);
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
    'agent005', 'ciphermachine', 'bomb', 'microfichemachine']);

  const keys = {};
  const mouse = { x: -1, y: -1 };            // internal canvas coords
  let mouseDown = false;                     // held for full-auto weapons
  let ctrlDown = false;                      // Ctrl is an alternate fire key, held for full-auto weapons — kept
                                              // separate from mouseDown so releasing one doesn't cut off the other

  const hpEl = document.getElementById('hp');
  const ammoEl = document.getElementById('ammo');
  const coverEl = document.getElementById('cover');
  const weaponEl = document.getElementById('weapon');
  const drawgunEl = document.getElementById('drawgun');
  const modeEl = document.getElementById('modeline');
  const hoverEl = document.getElementById('hoverlabel');
  const overlay = document.getElementById('overlay');

  function switchWeapon(kind) {
    if (!G.owned[kind]) { Adventure.msg('You don’t have that yet.', 1.5); return; }
    const wasDrawn = G.combat;
    if (!G.combat) requestCombat();         // picking a weapon pulls it — no separate "draw" step needed
    if (G.weapon === kind) { if (!wasDrawn) Adventure.msg(WEAPONS[kind].name + ' READY.', 1.5); return; }
    G.weapon = kind;
    G.gunSprite = WEAPONS[kind].spr;
    G.fireT = 0;
    Adventure.msg(WEAPONS[kind].name + ' READY.', 1.5);
  }

  // ---------------------------------------------------------------- modes --
  function requestCombat() {
    const p = canvas.requestPointerLock && canvas.requestPointerLock();
    if (p && p.catch) p.catch(() => {});
  }
  function syncMode() {
    G.combat = document.pointerLockElement === canvas;
    document.body.classList.toggle('adventure', !G.combat);
    modeEl.textContent = G.combat
      ? 'COMBAT MODE — F (or right-click) to holster & point-and-click'
      : 'ADVENTURE MODE — pick a verb, click the world · F (or right-click) to draw your gun';
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
    if (G.combat) document.exitPointerLock();
    else requestCombat();
  }
  document.addEventListener('contextmenu', e => { e.preventDefault(); toggleMode(); });
  document.getElementById('drawgun').addEventListener('click', requestCombat);

  // ---------------------------------------------------------------- input --
  const WEAPON_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'];
  document.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    if (G.started && !G.over) {
      const wi = WEAPON_KEYS.indexOf(e.code);
      if (wi >= 0) switchWeapon(WEAPON_ORDER[wi]);
      if (e.code === 'KeyF' && !e.repeat) toggleMode();   // faster than right-click for switching combat <-> adventure
      if ((e.code === 'ControlLeft' || e.code === 'ControlRight') && G.combat) { ctrlDown = true; if (!e.repeat) shoot(); }
    }
  });
  document.addEventListener('keyup', e => {
    keys[e.code] = false;
    if (e.code === 'ControlLeft' || e.code === 'ControlRight') ctrlDown = false;
  });

  document.addEventListener('mousemove', e => {
    if (G.combat) {
      G.player.a += e.movementX * 0.0022;
      G.player.pitch = Math.max(-70, Math.min(70, G.player.pitch - e.movementY * 0.35));
    } else {
      const r = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) * Engine.W / r.width;
      mouse.y = (e.clientY - r.top) * Engine.H / r.height;
      mouse.cx = e.clientX - r.left;
      mouse.cy = e.clientY - r.top;
    }
  });

  canvas.addEventListener('mousedown', e => {
    if (!G.started || G.over || e.button !== 0) return;
    if (G.combat) { mouseDown = true; shoot(); }
    else if (mouse.x >= 0) {
      const t = Adventure.resolveAt(mouse.x, mouse.y);
      if (t && t.dist <= 3.2) Adventure.clickAt(mouse.x, mouse.y);   // something to LOOK/TAKE/USE — normal adventure click
      else requestCombat();                                          // nothing there — draw your weapon instead
    }
  });
  window.addEventListener('mouseup', () => { mouseDown = false; });

  // --------------------------------------------------------------- combat --
  function shoot() {
    const wpn = WEAPONS[G.weapon];
    if (G.fireT > 0) return;
    if (G.ammo[G.weapon] <= 0) { Sfx.dry(); Adventure.msg('Click. The magazine is empty.'); return; }
    G.ammo[G.weapon]--;
    G.fireT = wpn.cd;
    Sfx.shoot();
    if (blowCover()) Adventure.msg('The shot cracks across the square. Cover’s blown.', 4);

    const p = G.player;
    const dx = Math.cos(p.a), dy = Math.sin(p.a);
    const wallDist = Engine.colHit[Engine.W >> 1] ? Engine.colHit[Engine.W >> 1].dist : 64;
    let best = null, bestDepth = 1e9;
    for (const e of World.ents) {
      if (e.dead || e.hp == null || NO_DAMAGE.has(e.kind)) continue;   // everything with hp is fair game
      const rx = e.x - p.x, ry = e.y - p.y;
      const depth = rx * dx + ry * dy;
      if (depth < 0.2 || depth > wallDist + 0.4) continue;
      const lateral = rx * -dy + ry * dx;
      if (Math.abs(lateral) > 0.42) continue;
      if (depth < bestDepth) { bestDepth = depth; best = e; }
    }
    if (!best) return;
    best.hp -= wpn.dmg[0] + Math.random() * (wpn.dmg[1] - wpn.dmg[0]);
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
    } else {
      World.spawnFx(best.x, best.y);                       // a plain prop, wrecked — burst + vanish, no lingering corpse
      World.removeEnt(best);
      Sfx.impDie();
    }
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
    for (const e of World.ents) {
      if (e === o || !e.solid || e.dead) continue;
      const er = (e.scale || 0.5) * 0.4, min = r + er;
      const dx = o.x - e.x, dy = o.y - e.y, d = Math.hypot(dx, dy);
      if (d < min && d > 1e-4) { o.x = e.x + (dx / d) * min; o.y = e.y + (dy / d) * min; }
    }
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
          const [lo, hi] = st.meleeDmg;
          p.hp -= lo + Math.random() * (hi - lo);
          p.hurtT = 0.35;
          Sfx.hurt();
          if (p.hp <= 0) { p.hp = 0; die(); }
        }
      } else if (st.ranged && d <= st.rangedRange) {
        if (e.atkT <= 0 && los(e.x, e.y, p.x, p.y)) {         // holds position and fires — doesn't close in
          e.atkT = st.atkCd;
          const [lo, hi] = st.rangedDmg;
          p.hp -= lo + Math.random() * (hi - lo);
          p.hurtT = 0.35;
          Sfx.shoot();
          if (p.hp <= 0) { p.hp = 0; die(); }
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
          Adventure.msg('A disguise kit. You already look like nobody in particular.');
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
    if (cs >= 0 && geo.sectors[cs].win) win();
  }

  // ------------------------------------------------------------------ hud --
  function updateHud() {
    hpEl.textContent = Math.ceil(G.player.hp);
    hpEl.classList.toggle('low', G.player.hp < 30);
    ammoEl.textContent = G.ammo[G.weapon];
    weaponEl.textContent = WEAPONS[G.weapon].name;
    drawgunEl.textContent = '✦ DRAW ' + WEAPONS[G.weapon].name;
    coverEl.textContent = G.blown ? 'BLOWN' : 'UNDERCOVER';
    coverEl.classList.toggle('low', G.blown);

    if (!G.combat && G.started && !G.over && mouse.x >= 0) {
      const name = Adventure.nameAt(mouse.x, mouse.y);
      if (name) {
        hoverEl.textContent = name;
        hoverEl.style.left = (mouse.cx + 16) + 'px';
        hoverEl.style.top = (mouse.cy - 8) + 'px';
        hoverEl.classList.add('on');
      } else {
        hoverEl.classList.remove('on');
      }
    } else {
      hoverEl.classList.remove('on');
    }
  }

  // ------------------------------------------------------------- end game --
  function endOverlay(title, cls, body, btn) {
    overlay.innerHTML =
      '<h1 class="' + cls + '">' + title + '</h1>' +
      '<p class="story">' + body + '</p>' +
      '<button id="againbtn">' + btn + '</button>';
    overlay.classList.remove('hidden');
    document.getElementById('againbtn').onclick = () => location.reload();
  }

  function die() {
    if (G.over) return;
    G.over = true;
    document.exitPointerLock();
    Music.stop();
    endOverlay('MISSION FAILED', '',
      'Volkov’s men stand over you in the plaza while a trio plays on, unbothered.',
      '[ INSERT NEXT AGENT ]');
  }

  function dieCivilians() {
    if (G.over) return;
    G.over = true;
    document.exitPointerLock();
    Music.stop();
    endOverlay('MISSION FAILED', '',
      'Three bodies in the plaza that were never on Volkov’s payroll. London does not send its regards.',
      '[ INSERT NEXT AGENT ]');
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

  function dieBomb() {
    if (G.over) return;
    G.over = true;
    document.exitPointerLock();
    Music.stop();
    endOverlay('MISSION FAILED', '',
      'Wrong wire. Dr. Z never got his prize, and neither did you.',
      '[ INSERT NEXT AGENT ]');
  }

  function win() {
    if (G.over) return;
    G.over = true;
    document.exitPointerLock();
    Sfx.win();
    Music.stop();
    const secs = Math.round((performance.now() - G.t0) / 1000);
    endOverlay('MISSION COMPLETE', 'win',
      'The launch pulls away from the dock into Havana bay. On the malecón, Volkov screams into a red telephone.<br><br>' +
      'ENEMIES NEUTRALIZED: ' + G.kills + ' / ' + totalHostiles + ' &nbsp;·&nbsp; TIME: ' + secs + 's<br>' +
      'London sends its regards.',
      '[ NEXT MISSION (IDENTICAL) ]');
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

  document.getElementById('startbtn').addEventListener('click', () => {
    Sfx.unlock();
    Music.unlock();
    Music.setTracks(World.musicUndercover, World.musicCoverBlown);
    Music.setBlown(G.blown);
    G.started = true;
    G.t0 = performance.now();
    overlay.classList.add('hidden');
    // start holstered — drawing happens automatically: pick a weapon (1-5) or fire on empty ground
    Adventure.msg('Reach the DOCK. The harbour gate will not open politely.', 6);
  });

  if (World.isCustom) document.getElementById('customtag').style.display = 'block';
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
