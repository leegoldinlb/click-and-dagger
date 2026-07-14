'use strict';

// Game state, input, combat, enemy AI, and the main loop.
const Game = (() => {
  const canvas = document.getElementById('view');
  Engine.init(canvas);

  const G = {
    player: { x: World.spawn.x, y: World.spawn.y, a: World.spawn.a, hp: 100, ammo: 24, hurtT: 0,
              eyeZ: World.floorZAt(World.spawn.x, World.spawn.y) + 0.5, pitch: 0, vz: 0 },
    combat: false,
    started: false,
    over: false,
    bobT: 0, bobAmt: 0, fireT: 0,
    kills: 0, civKills: 0, t0: 0,
  };
  // Per-kind combat stats for hostile entities. `ranged` kinds hold position and fire
  // once in rangedRange (with LOS), only closing distance to get there; everyone else
  // rushes to meleeRange. aggroR is how close (with LOS) wakes them from idle.
  const HOSTILE = {
    goon:   { speed: 1.7, meleeRange: 0.85, meleeDmg: [7, 13],  aggroR: 9, atkCd: 0.95 },
    brute:  { speed: 1.3, meleeRange: 1.0,  meleeDmg: [12, 20], aggroR: 7, atkCd: 1.1 },
    sniper: { speed: 1.4, meleeRange: 0.85, meleeDmg: [7, 13],  aggroR: 10, atkCd: 1.3,
              ranged: true, rangedRange: 7, rangedDmg: [10, 16] },
  };
  const CIVILIAN_KINDS = new Set(['civilianM', 'civilianF']);
  const totalHostiles = World.ents.filter(e => HOSTILE[e.kind]).length;
  // Quest-critical kinds never take damage — destroying 004's body, the vacuum
  // tube, or Volkov's desk could strand the puzzle chain with no way to recover.
  // Every other entity with an `hp` field (every plain prop, via World.js's
  // `prop()` factory) is fair game — "make all sprites destructible."
  const NO_DAMAGE = new Set(['agent', 'tube', 'desk']);

  const keys = {};
  const mouse = { x: -1, y: -1 };            // internal canvas coords

  const hpEl = document.getElementById('hp');
  const ammoEl = document.getElementById('ammo');
  const modeEl = document.getElementById('modeline');
  const hoverEl = document.getElementById('hoverlabel');
  const overlay = document.getElementById('overlay');

  // ---------------------------------------------------------------- modes --
  function requestCombat() {
    const p = canvas.requestPointerLock && canvas.requestPointerLock();
    if (p && p.catch) p.catch(() => {});
  }
  function syncMode() {
    G.combat = document.pointerLockElement === canvas;
    document.body.classList.toggle('adventure', !G.combat);
    modeEl.textContent = G.combat
      ? 'COMBAT MODE — right-click to holster & point-and-click'
      : 'ADVENTURE MODE — pick a verb, click the world · right-click to draw your gun';
  }
  document.addEventListener('pointerlockchange', syncMode);
  document.addEventListener('pointerlockerror', syncMode);

  document.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (!G.started || G.over) return;
    if (G.combat) document.exitPointerLock();
    else requestCombat();
  });
  document.getElementById('drawgun').addEventListener('click', requestCombat);

  // ---------------------------------------------------------------- input --
  document.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  });
  document.addEventListener('keyup', e => { keys[e.code] = false; });

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
    if (G.combat) shoot();
    else if (mouse.x >= 0) Adventure.clickAt(mouse.x, mouse.y);
  });

  // --------------------------------------------------------------- combat --
  function shoot() {
    if (G.fireT > 0) return;
    if (G.player.ammo <= 0) { Sfx.dry(); Adventure.msg('Click. The magazine is empty.'); return; }
    G.player.ammo--;
    G.fireT = 0.28;
    Sfx.shoot();

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
    best.hp -= 16 + Math.random() * 10;
    best.flash = 0.12;
    if (best.hp > 0) {
      if (HOSTILE[best.kind]) { best.aggro = true; Sfx.impHit(); }
      else Sfx.impHit();
      return;
    }
    best.dead = true;
    best.solid = false;
    if (CIVILIAN_KINDS.has(best.kind)) {
      G.civKills++;
      Sfx.hurt();
      if (G.civKills >= 3) { dieCivilians(); return; }
      Adventure.msg('A local goes down. Word will spread — two more and this mission is over.', 3.5);
    } else if (HOSTILE[best.kind]) {
      G.kills++;
      Sfx.impDie();
    } else {
      Sfx.impDie();                                        // a plain prop, wrecked — no kill/casualty counter
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
  function tryMove(o, nx, ny, r) { Engine.moveGeo(geo, graph, o, nx, ny, r, STEP); }

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

    // enemies move at a crawl while you're pointing and clicking
    const edt = G.combat ? dt : dt * 0.25;
    for (const e of World.ents) {
      const st = HOSTILE[e.kind];
      if (!st || e.dead) continue;
      e.flash = Math.max(0, e.flash - dt);
      e.atkT = Math.max(0, e.atkT - edt);
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      if (!e.aggro && d < st.aggroR && los(e.x, e.y, p.x, p.y)) {
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

    // walk-over pickups
    for (const e of [...World.ents]) {
      if (!e.pickup || e.dead) continue;                    // shot-up supplies can't be scavenged afterward
      if (Math.hypot(p.x - e.x, p.y - e.y) > 0.65) continue;
      if (e.pickup === 'med') {
        if (p.hp >= 100) continue;
        p.hp = Math.min(100, p.hp + 25);
        Adventure.msg('+25 HP. Field dressing, agent grade.');
      } else {
        p.ammo = Math.min(99, p.ammo + 10);
        Adventure.msg('+10 rounds for the Walther. A love language.');
      }
      World.removeEnt(e);
      Sfx.pickup();
    }

    const cs = Engine.localSector(geo, graph, p.x, p.y, p.sector);
    if (cs >= 0 && geo.sectors[cs].win) win();
  }

  // ------------------------------------------------------------------ hud --
  function updateHud() {
    hpEl.textContent = Math.ceil(G.player.hp);
    hpEl.classList.toggle('low', G.player.hp < 30);
    ammoEl.textContent = G.player.ammo;

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
    endOverlay('MISSION FAILED', '',
      'Volkov’s men stand over you in the plaza while a trio plays on, unbothered.',
      '[ INSERT NEXT AGENT ]');
  }

  function dieCivilians() {
    if (G.over) return;
    G.over = true;
    document.exitPointerLock();
    endOverlay('MISSION FAILED', '',
      'Three bodies in the plaza that were never on Volkov’s payroll. London does not send its regards.',
      '[ INSERT NEXT AGENT ]');
  }

  function win() {
    if (G.over) return;
    G.over = true;
    document.exitPointerLock();
    Sfx.win();
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
    G.started = true;
    G.t0 = performance.now();
    overlay.classList.add('hidden');
    requestCombat();
    Adventure.msg('Reach the DOCK. The harbour gate will not open politely.', 6);
  });

  if (World.isCustom) document.getElementById('customtag').style.display = 'block';

  syncMode();
  requestAnimationFrame(loop);

  // debug: drive one frame deterministically (used to verify logic when the
  // preview tab has rAF paused). Harmless in normal play.
  G.__step = (dt = 1 / 60) => { if (!G.started) return; ensureGeo(); if (!G.over) update(dt); Engine.renderPortal(G, geo, graph); };

  return G;
})();

// Debug handle
window.GAME = { G: Game, world: World, adv: Adventure, engine: Engine };
