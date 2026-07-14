'use strict';

// ---------------------------------------------------------------------------
// Sector renderer (Build-engine-lite), painter's-algorithm edition.
//
// Per screen column we DDA-march the grid and collect the run of open sectors
// until the first solid wall. Then we paint back-to-front (far → near):
//   1. parallax sky backdrop (for outdoor/sky sectors)
//   2. the terminating solid wall
//   3. each sector's floor and ceiling (perspective-correct textured spans)
//   4. the vertical "face" between neighbouring sectors wherever their floor
//      or ceiling heights differ — this is what draws steps up, drop-downs,
//      and the walls of sunken pits.
// Nearer surfaces overwrite farther ones, so occlusion (including looking
// across a pit to its far wall) falls out for free.  Horizon shear gives
// look-up / look-down (pitch).  Output is a 320x180 framebuffer scaled up.
// ---------------------------------------------------------------------------
const Engine = (() => {
  const W = 320, H = 180;
  const DW = 640, DH = 360;
  const MAXD = 44;

  let ctx = null, off = null, octx = null, img = null, buf = null;
  const zbuf = new Float64Array(W);        // nearest solid wall per column (adventure picking + hitscan)
  const depth = new Float32Array(W * H);   // per-pixel scene depth for sprite occlusion
  const pickBuf = new Int32Array(W * H);   // per-pixel surface id (editor 3D-mode picking)
  const colHit = new Array(W);
  let rects = [];
  let dbgOn = false, dbgTrace = null;   // temporary investigation hook: records drawSector calls for one frame
  let hl = null;                        // editor 3D-preview target highlight: {sec, kind:'floor'|'ceil'} or {sec, edge}
  function setHighlight(h) { hl = h; }
  function hlMix(c) {                   // blend a packed colour toward a bright cyan "selected" tint
    const r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255, a = (c >>> 24) & 255;
    const amt = 0.4;
    const nr = r + (70 - r) * amt, ng = g + (225 - g) * amt, nb = b + (255 - b) * amt;
    return (a << 24) | ((nb | 0) << 16) | ((ng | 0) << 8) | (nr | 0);
  }

  // encode/decode a picked surface: kind 0=floor 1=ceil 2=wall, plus cell (mx,my)
  const PICK = (kind, mx, my) => (kind << 16) | (my << 8) | mx;
  function pickAt(cx, cy) {
    cx |= 0; cy |= 0;
    if (cx < 0 || cy < 0 || cx >= W || cy >= H) return null;
    const v = pickBuf[cy * W + cx];
    if (v < 0) return null;
    return { kind: (v >> 16) & 3, mx: v & 255, my: (v >> 8) & 255 };
  }

  const texCache = new Map();
  function cacheOf(canvas) {
    let c = texCache.get(canvas);
    if (!c) {
      const t = document.createElement('canvas');
      t.width = canvas.width; t.height = canvas.height;
      t.getContext('2d').drawImage(canvas, 0, 0);
      const d = t.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
      c = { u32: new Uint32Array(d.data.buffer), w: canvas.width, h: canvas.height };
      texCache.set(canvas, c);
    }
    return c;
  }

  function init(canvas) {
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    off = document.createElement('canvas');
    off.width = W; off.height = H;
    octx = off.getContext('2d');
    octx.imageSmoothingEnabled = false;
    img = octx.createImageData(W, H);
    buf = new Uint32Array(img.data.buffer);
  }

  const FOG_R = 12, FOG_G = 11, FOG_B = 16;
  const FOG = ((255 << 24) | (FOG_B << 16) | (FOG_G << 8) | FOG_R) >>> 0;   // packed fill colour
  function shade(c, t) {
    const r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
    return (255 << 24) | ((b + (FOG_B - b) * t) << 16) | ((g + (FOG_G - g) * t) << 8) | (r + (FOG_R - r) * t);
  }
  const fogAt = d => d > MAXD ? 0.92 : Math.min(0.9, d * d * 0.0016);
  const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

  function render(g) {
    const p = g.player;
    const px = p.x, py = p.y;
    const dirx = Math.cos(p.a), diry = Math.sin(p.a);
    const planex = -diry * 0.66, planey = dirx * 0.66;
    const eyeZ = (p.eyeZ != null) ? p.eyeZ : World.floorZAt(px, py) + 0.5;
    const horizon = H * 0.5 + (p.pitch || 0);
    const yOf = (z, d) => horizon - (z - eyeZ) * H / d;

    const sky = cacheOf(World.SKY);
    const stepTex = cacheOf(World.TX.metal);
    const ventTex = cacheOf(World.TX.vent);
    const facadeTex = cacheOf(World.TX.stucco || World.TX.lair);   // building wall drawn above sky-adjacent openings
    const DEF = World.SURF['.'];

    buf.fill(FOG);      // clear to fog so any uncovered pixel reads as distance haze, never a stale frame
    depth.fill(MAXD);   // reset per-pixel depth
    const pk = !!g.pick;
    if (pk) pickBuf.fill(-1);   // only the editor's 3D preview needs surface picking

    for (let x = 0; x < W; x++) {
      const cam = 2 * x / W - 1;
      const rdx = dirx + planex * cam, rdy = diry + planey * cam;
      const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
      const stepX = rdx < 0 ? -1 : 1, stepY = rdy < 0 ? -1 : 1;
      let mapX = Math.floor(px), mapY = Math.floor(py);
      let sideX = (rdx < 0 ? px - mapX : mapX + 1 - px) * ddx;
      let sideY = (rdy < 0 ? py - mapY : mapY + 1 - py) * ddy;
      const ang = Math.atan2(rdy, rdx);
      const skyU = (((ang / (Math.PI * 2)) * sky.w * 2) % sky.w + sky.w) % sky.w | 0;

      // ----- collect the run of open sectors up to the first solid wall -----
      const segs = [];
      let wall = null;
      let cs = World.surfAt(mapX, mapY) || DEF;
      let dNear = 0;
      for (let guard = 0; guard < 96; guard++) {
        const side = sideX < sideY ? 0 : 1;
        const dFar = Math.min(side === 0 ? sideX : sideY, MAXD);
        let wx = side === 0 ? py + dFar * rdy : px + dFar * rdx;
        wx -= Math.floor(wx);
        let texX = (wx * 64) | 0;
        if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) texX = 63 - texX;
        segs.push({ f: cs.f, c: cs.c, ft: cs.ft, ct: cs.ct, sky: cs.sky, dNear, dFar, bTexX: texX, bSide: side, mx: mapX, my: mapY, fsx: cs.fsx, fsy: cs.fsy });
        if (side === 0) { sideX += ddx; mapX += stepX; } else { sideY += ddy; mapY += stepY; }
        const val = World.get(mapX, mapY);
        if (val > 0) {
          const ocx = side === 0 ? mapX - stepX : mapX, ocy = side === 1 ? mapY - stepY : mapY;
          const wbx = px + rdx * dFar, wby = py + rdy * dFar;
          const fBound = cs.f + cs.fsx * (wbx - (ocx + 0.5)) + cs.fsy * (wby - (ocy + 0.5));
          wall = { val, dist: dFar, texX, side, mapX, mapY, ceil: cs.c, floor: fBound };
          break;
        }
        if (dFar >= MAXD) break;
        cs = World.surfAt(mapX, mapY) || DEF;
        dNear = dFar;
      }

      // ----- paint far → near -----
      let anySky = false;
      for (let i = 0; i < segs.length; i++) if (segs[i].sky) { anySky = true; break; }
      if (anySky) {
        const hz = clamp(horizon, 0, H) | 0;
        for (let yy = 0; yy < hz; yy++) {
          const v = clamp(((yy - horizon + H * 0.5) / H) * sky.h, 0, sky.h - 1) | 0;
          buf[yy * W + x] = sky.u32[v * sky.w + skyU];
        }
      }
      // (uncovered pixels stay the fog clear colour — no stale-frame bleed)

      zbuf[x] = MAXD; colHit[x] = null;
      if (wall) {
        const yTop = yOf(wall.ceil, wall.dist), yBot = yOf(wall.floor, wall.dist);
        const wt = cacheOf(World.wallTex(wall.mapX, wall.mapY));
        const a = Math.max(0, Math.floor(yTop)), b = Math.min(H, Math.ceil(yBot));
        const sh = Math.min(0.9, fogAt(wall.dist) + (wall.side === 1 ? 0.18 : 0));
        for (let yy = a; yy < b; yy++) {
          const v = clamp(((yy - yTop) / (yBot - yTop)) * 64, 0, 63) | 0;
          const idx = yy * W + x;
          buf[idx] = shade(wt.u32[v * 64 + wall.texX], sh);
          depth[idx] = wall.dist;
          if (pk) pickBuf[idx] = PICK(2, wall.mapX, wall.mapY);
        }
        zbuf[x] = wall.dist;
        colHit[x] = { mx: wall.mapX, my: wall.mapY, val: wall.val, dist: wall.dist, y0: yTop, y1: yBot };
      }

      for (let i = segs.length - 1; i >= 0; i--) {
        const s = segs[i];
        const dN = Math.max(s.dNear, 0.02), dF = s.dFar;

        // ceiling (sky sectors already covered by the backdrop)
        if (!s.sky && s.ct) {
          const ct = cacheOf(World.TX[s.ct] || World.TX.ceiltile);
          const a = Math.max(0, Math.floor(yOf(s.c, dN))), b = Math.min(H, Math.ceil(yOf(s.c, dF)));
          for (let yy = a; yy < b; yy++) {
            const rd = (s.c - eyeZ) * H / (horizon - yy);
            if (rd > 0.02 && rd < MAXD) {
              const wx = px + rd * rdx, wy = py + rd * rdy;
              const sxi = (((wx - Math.floor(wx)) * ct.w) | 0) & (ct.w - 1);
              const syi = (((wy - Math.floor(wy)) * ct.h) | 0) & (ct.h - 1);
              const idx = yy * W + x;
              buf[idx] = shade(ct.u32[syi * ct.w + sxi], fogAt(rd));
              depth[idx] = rd;
              if (pk) pickBuf[idx] = PICK(1, s.mx, s.my);
            }
          }
        }
        // floor (a plane: height = s.f + fsx*(wx-cx) + fsy*(wy-cy)).
        // Ray/plane intersection gives rd = (eyeZ - base) / ((yy-horizon)/H + g).
        {
          const ft = cacheOf(World.TX[s.ft] || World.TX.carpet);
          const A = s.fsx, B = s.fsy;
          const base = s.f + A * (px - (s.mx + 0.5)) + B * (py - (s.my + 0.5));
          const g = A * rdx + B * rdy;
          const Hb = (eyeZ - base) * H;
          const yFar = horizon + Hb / dF - g * H, yNear = horizon + Hb / dN - g * H;
          const a = Math.max(0, Math.floor(Math.min(yFar, yNear)));
          const b = Math.min(H, Math.ceil(Math.max(yFar, yNear)));
          for (let yy = a; yy < b; yy++) {
            const denom = (yy - horizon) + g * H;
            if (denom <= 0.001) continue;
            const rd = Hb / denom;
            if (rd > 0.02 && rd < MAXD && rd >= dN - 0.02 && rd <= dF + 0.02) {
              const wx = px + rd * rdx, wy = py + rd * rdy;
              const sxi = (((wx - Math.floor(wx)) * ft.w) | 0) & (ft.w - 1);
              const syi = (((wy - Math.floor(wy)) * ft.h) | 0) & (ft.h - 1);
              const idx = yy * W + x;
              buf[idx] = shade(ft.u32[syi * ft.w + sxi], fogAt(rd));
              depth[idx] = rd;
              if (pk) pickBuf[idx] = PICK(0, s.mx, s.my);
            }
          }
        }
        // vertical face to the nearer neighbour (steps, drop-downs, pit walls)
        if (i > 0) {
          const nb = segs[i - 1];
          const dB = s.dNear, texX = nb.bTexX;
          const sh = Math.min(0.9, fogAt(dB) + (nb.bSide === 1 ? 0.18 : 0));
          // evaluate both sectors' floor planes at the shared boundary point
          const wbx = px + rdx * dB, wby = py + rdy * dB;
          const fCur = s.f + s.fsx * (wbx - (s.mx + 0.5)) + s.fsy * (wby - (s.my + 0.5));
          const fNb = nb.f + nb.fsx * (wbx - (nb.mx + 0.5)) + nb.fsy * (wby - (nb.my + 0.5));
          if (Math.abs(fCur - fNb) > 1e-3) {
            const yA = yOf(Math.max(fCur, fNb), dB), yB = yOf(Math.min(fCur, fNb), dB);
            const a = Math.max(0, Math.floor(yA)), b = Math.min(H, Math.ceil(yB));
            for (let yy = a; yy < b; yy++) {
              const v = clamp(((yy - yA) / (yB - yA)) * 64, 0, 63) | 0;
              const idx = yy * W + x;
              buf[idx] = shade(stepTex.u32[v * 64 + texX], sh);
              depth[idx] = dB;
            }
          }
          // upper wall between differing ceilings. When one side is open sky, this
          // is the building facade from the lower ceiling up to the roofline — it
          // MUST be drawn or the parallax sky bleeds down over the opening.
          if (Math.abs(s.c - nb.c) > 1e-3) {
            const hi = Math.max(s.c, nb.c), lo = Math.min(s.c, nb.c);
            const yA = yOf(hi, dB), yB = yOf(lo, dB);
            const ftx = (s.sky || nb.sky) ? facadeTex : ventTex;   // facade vs indoor soffit
            const a = Math.max(0, Math.floor(yA)), b = Math.min(H, Math.ceil(yB));
            for (let yy = a; yy < b; yy++) {
              const wz = hi - (hi - lo) * (yy - yA) / (yB - yA);   // world height at this row → tiled V
              const tv = ((((wz % 1) + 1) % 1) * 64 | 0) & 63;
              const idx = yy * W + x;
              buf[idx] = shade(ftx.u32[tv * 64 + texX], sh);
              depth[idx] = dB;
            }
          }
        }
      }
    }

    // ----- sprites: composited into the framebuffer, occluded per-pixel by depth -----
    rects = [];
    const invDet = 1 / (planex * diry - dirx * planey);
    const vis = [];
    for (const e of World.ents) {
      const rx = e.x - px, ry = e.y - py;
      const tx = invDet * (diry * rx - dirx * ry);
      const ty = invDet * (-planey * rx + planex * ry);
      if (ty > 0.2) vis.push({ e, tx, ty });
    }
    vis.sort((a, b) => b.ty - a.ty);
    for (const s of vis) {
      const e = s.e;
      const sx = (W / 2) * (1 + s.tx / s.ty);
      const sc = e.dead ? 0.3 : e.scale;
      const baseY = yOf(World.floorZAt(e.x, e.y), s.ty);
      const hgt = (H / s.ty) * sc, wdt = hgt, top = baseY - hgt, left = sx - wdt / 2;
      const x0 = Math.max(0, Math.ceil(left)), x1 = Math.min(W - 1, Math.floor(left + wdt));
      const y0i = Math.max(0, Math.ceil(top)), y1i = Math.min(H - 1, Math.floor(baseY));
      const tex = cacheOf(e.getTex());
      const fog = fogAt(s.ty);
      let drawn = false;
      for (let x = x0; x <= x1; x++) {
        const texX = clamp(((x - left) / wdt) * 64, 0, 63) | 0;
        for (let yy = y0i; yy <= y1i; yy++) {
          const idx = yy * W + x;
          if (s.ty > depth[idx] + 0.05) continue;          // hidden behind a nearer wall / floor / step
          const texY = clamp(((yy - top) / hgt) * 64, 0, 63) | 0;
          const c = tex.u32[texY * 64 + texX];
          if ((c >>> 24) < 128) continue;                  // transparent sprite pixel
          buf[idx] = shade(c, fog);
          drawn = true;
        }
      }
      if (drawn) rects.push({ ent: e, x0: left, x1: left + wdt, y0: top, y1: baseY, dist: s.ty });
    }

    octx.putImageData(img, 0, 0);
    paintOverlays(g);
    ctx.drawImage(off, 0, 0, W, H, 0, 0, DW, DH);
  }

  // weapon + holster letterbox + hurt flash — drawn on octx over either renderer
  function paintOverlays(g) {
    const p = g.player;
    if (g.combat && !g.over && !g.preview) {
      const bobX = Math.sin(g.bobT * 6) * 5 * g.bobAmt;
      const bobY = Math.abs(Math.cos(g.bobT * 6)) * 4 * g.bobAmt;
      const kick = g.fireT > 0 ? g.fireT * 22 : 0;
      const gw = 150, gx = W / 2 - gw / 2 + bobX, gy = H - 96 + bobY + kick;
      if (g.fireT > 0.2) {                                    // muzzle points away from camera → flash centred, near the top
        octx.fillStyle = 'rgba(255,233,168,0.8)';
        octx.beginPath(); octx.arc(W / 2 + bobX, gy + 10, 10, 0, 7); octx.fill();
        octx.fillStyle = 'rgba(200,200,210,0.5)';
        octx.beginPath(); octx.arc(W / 2 + bobX, gy + 6, 6, 0, 7); octx.fill();
      }
      octx.drawImage(World.SPR.gun, gx, gy, gw, gw);
    }
    if (!g.combat && !g.preview) {
      octx.fillStyle = 'rgba(40,60,120,0.06)'; octx.fillRect(0, 0, W, H);
      octx.fillStyle = '#000'; octx.fillRect(0, 0, W, 7); octx.fillRect(0, H - 7, W, 7);
    }
    if (p.hurtT > 0) {
      octx.fillStyle = 'rgba(200,20,10,' + Math.min(0.45, p.hurtT * 1.6).toFixed(2) + ')';
      octx.fillRect(0, 0, W, H);
    }
  }

  // =========================================================================
  // PORTAL RENDERER — draws the vector-sector geometry (verts + sectors) from
  // the DRAW editor. Classic Doom/Build flood: start in the camera's sector,
  // draw each wall (solid → occlude; portal → draw the step + recurse into the
  // neighbour within its screen span), tracking a per-column top/bottom clip.
  // =========================================================================
  function pInLoop(px, py, loop, verts) {
    let inside = false;
    for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
      const a = verts[loop[i]], b = verts[loop[j]];
      if (((a.y > py) !== (b.y > py)) && (px < (b.x - a.x) * (py - a.y) / (b.y - a.y) + a.x)) inside = !inside;
    }
    return inside;
  }
  function loopArea(loop, verts) {
    let s = 0;
    for (let i = 0; i < loop.length; i++) { const p = verts[loop[i]], q = verts[loop[(i + 1) % loop.length]]; s += p.x * q.y - q.x * p.y; }
    return Math.abs(s / 2);
  }
  function sectorAt(px, py, geo) {                 // innermost (smallest-area) sector containing the point
    let best = -1, ba = Infinity;
    for (let s = 0; s < geo.sectors.length; s++) {
      if (pInLoop(px, py, geo.sectors[s].loop, geo.verts)) {
        const a = loopArea(geo.sectors[s].loop, geo.verts);
        if (a < ba) { ba = a; best = s; }
      }
    }
    return best;
  }
  // build per-sector wall lists with neighbour links (portals)
  function buildGraph(geo) {
    const sw = geo.sectors.map(() => []);
    geo.sectors.forEach((sec, s) => {
      const L = sec.loop;
      for (let i = 0; i < L.length; i++) sw[s].push({
        v1: L[i], v2: L[(i + 1) % L.length], next: -1, sibling: null,
        tex: sec.wallTex ? sec.wallTex[i] : null,
        cell: sec.wallCell ? sec.wallCell[i] : null,
        door: sec.wallDoor ? (sec.wallDoor[i] || null) : null,   // door kind (string) or null
        texScale: sec.wallTexScale ? (sec.wallTexScale[i] || 1) : 1,  // wall tile size (>1 bigger, <1 smaller)
        open: false,
      });
    });
    const key = (a, b) => a + '_' + b, smap = new Map(), wmap = new Map();
    sw.forEach((walls, s) => walls.forEach(w => { smap.set(key(w.v1, w.v2), s); wmap.set(key(w.v1, w.v2), w); }));
    sw.forEach(walls => walls.forEach(w => {
      const rk = key(w.v2, w.v1);
      const rs = smap.get(rk); if (rs != null) w.next = rs;
      const rw = wmap.get(rk); if (rw) w.sibling = rw;                 // shared-edge twin (two-sided doors)
    }));
    sw.forEach(walls => walls.forEach(w => { if (w.door && w.sibling && !w.sibling.door) w.sibling.door = w.door; }));  // a door is two-sided
    geo.sectors.forEach((sec, t) => {              // sub-sectors: portal to parent, OR a solid column/pillar
      if (sec.parent >= 0) {
        const p = sec.parent, L = sec.loop, n = L.length;
        if (sec.solid) {
          // A solid "hole" (Build-engine convention: a shape drawn inside another
          // sector starts as a solid mass, not a room). It's never entered — no
          // portal — so drawSector never recurses into it and its own floor/ceiling
          // are simply never drawn. The PARENT gets genuinely solid boundary walls
          // around its footprint instead, textured from the hole's own per-edge
          // wallTex (reversed, since the parent sees the opposite face) so the
          // column reads correctly from inside the room around it.
          for (let i = 0; i < n; i++) sw[p].push({
            v1: L[(i + 1) % n], v2: L[i], next: -1, sibling: null,
            tex: sec.wallTex ? sec.wallTex[i] : null, cell: null, door: null,
            texScale: sec.wallTexScale ? (sec.wallTexScale[i] || 1) : 1, open: false,
          });
        } else {
          sw[t].forEach(w => { if (w.next < 0) w.next = p; });
          for (let i = 0; i < n; i++) sw[p].push({ v1: L[(i + 1) % n], v2: L[i], next: t, sibling: null, tex: null, cell: null, door: null, texScale: 1, open: false });
        }
      }
    });
    return sw;
  }
  // open a vector door wall (and its twin on the far side)
  function openDoor(wall) { if (!wall) return; wall.open = true; if (wall.sibling) wall.sibling.open = true; }

  const yTopA = new Int16Array(W), yBotA = new Int16Array(W);
  function renderPortal(g, geo, graph) {
    const p = g.player, a = p.a;
    const px = p.x, py = p.y;
    const cosA = Math.cos(a), sinA = Math.sin(a);
    const eyeZ = p.eyeZ != null ? p.eyeZ : 0.5;
    const horizon = H * 0.5 + (p.pitch || 0);
    const FX = (W / 2) / 0.66, NEAR = 0.04;
    const wt = cacheOf(World.TX.lair);
    const skyTex = cacheOf(World.SKY);
    const facadeTex = cacheOf(World.TX.stucco || World.TX.lair);   // building wall up to the sky roofline
    const stepDn = cacheOf(World.TX.metal);                         // riser of a step UP (neighbour floor higher)
    const stepUp = cacheOf(World.TX.vent);                          // soffit of a step DOWN (indoor lower ceiling)
    const TAU = Math.PI * 2;
    buf.fill(FOG);
    depth.fill(MAXD);
    for (let x = 0; x < W; x++) { yTopA[x] = 0; yBotA[x] = H - 1; zbuf[x] = MAXD; colHit[x] = null; }
    if (dbgOn) dbgTrace = [];

    function drawSector(sn, xL, xR, dep, from) {
      if (dep > 256 || xL > xR) return;                 // deep enough for per-cell compiled geometry
      const sec = geo.sectors[sn]; if (!sec) return;
      const fz = sec.floor, cz = sec.ceil, sky = !!sec.sky;
      const isc = 1 / (sec.texScale || 1);              // floor/ceiling tile size: >1 = bigger tiles, <1 = smaller
      const ftex = cacheOf(World.TX[sec.floorTex] || World.TX.carpet);
      const ctex = cacheOf(World.TX[sec.ceilTex] || World.TX.ceiltile);
      // project every visible wall, then sort near → far
      const vis = [];
      const through = [];                                            // open portals the eye sits ON → flood straight past
      const secFloorHL = !!(hl && hl.edge == null && hl.kind === 'floor' && hl.sec === sn);
      const secCeilHL = !!(hl && hl.edge == null && hl.kind === 'ceil' && hl.sec === sn);
      for (let wi = 0; wi < graph[sn].length; wi++) {
        const wall = graph[sn][wi];
        const A = geo.verts[wall.v1], B = geo.verts[wall.v2];
        let ad = (A.x - px) * cosA + (A.y - py) * sinA, as_ = (A.x - px) * -sinA + (A.y - py) * cosA;
        let bd = (B.x - px) * cosA + (B.y - py) * sinA, bs = (B.x - px) * -sinA + (B.y - py) * cosA;
        let ua = 0, ub = Math.hypot(B.x - A.x, B.y - A.y);
        if (Math.min(ad, bd) < NEAR) {                               // an endpoint is at/behind the eye plane
          const cp = closestOnSeg(px, py, A.x, A.y, B.x, B.y);       // if the eye is physically ON this wall the
          const ddx = px - cp.x, ddy = py - cp.y;                    // projection is degenerate — don't project it;
          if (ddx * ddx + ddy * ddy < NEAR * NEAR) {                 // pass open portals through so the room beyond shows
            if (wall.next >= 0 && !(wall.door && !wall.open) && wall.next !== from) through.push(wall.next);
            continue;
          }
        }
        if (ad < NEAR && bd < NEAR) continue;                        // wall wholly behind the eye → cull
        // true closest-approach distance from the eye to the wall SEGMENT (computed pre-clip,
        // from the ORIGINAL endpoints) — used only as the paint-order sort key. The old key,
        // Math.min(ad, bd), used the near-plane-CLIPPED endpoint depth: a wall with one vertex
        // behind the eye (common in non-convex single-sector rooms, e.g. a wall almost edge-on
        // to the view) gets that endpoint snapped to exactly NEAR, handing it an artificially
        // tiny sort key regardless of how far away its actually-visible portion is. Sorted
        // first, it then draws across most of the screen and CLOSES those columns (solid walls
        // set yTopA[x]=1/yBotA[x]=0) before the genuinely closer wall — later in sort order —
        // ever gets a turn; that wall finds its columns already closed and silently never
        // renders. Reads as "a background wall painted over the foreground." The true
        // closest-point-on-segment distance doesn't have this near-plane artifact.
        const cpS = closestOnSeg(px, py, A.x, A.y, B.x, B.y);
        const nearDist = Math.hypot(cpS.x - px, cpS.y - py);
        if (ad < NEAR) { const t = (NEAR - ad) / (bd - ad); ad = NEAR; as_ += (bs - as_) * t; ua += (ub - ua) * t; }
        else if (bd < NEAR) { const t = (NEAR - bd) / (ad - bd); bd = NEAR; bs += (as_ - bs) * t; ub += (ua - ub) * t; }
        const x1 = W / 2 + (as_ / ad) * FX, x2 = W / 2 + (bs / bd) * FX;
        if (x1 >= x2) continue;                                       // back-facing
        vis.push({ wall, wi, x1, x2, ad, bd, as_, bs, ua, ub, near: nearDist });
      }
      vis.sort((p, q) => p.near - q.near);                           // near first
      if (dbgOn) dbgTrace.push({ sn, xL, xR, dep, from, floorTex: sec.floorTex,
        vis: vis.map(w => ({ v1: w.wall.v1, v2: w.wall.v2, next: w.wall.next, x1: +w.x1.toFixed(1), x2: +w.x2.toFixed(1), near: +w.near.toFixed(3) })),
        through: through.slice() });
      // the eye is physically standing on these portals — they're the closest
      // possible geometry, so draw them FIRST. Drawing them after the normal
      // (necessarily farther) walls let a wide degenerate-doorway approximation
      // clobber correctly-drawn far content on every cell-boundary crossing —
      // visible as a texture "warp"/glitch on ANY level, not just sloped ones,
      // since per-cell compiled geometry puts the eye on a portal constantly.
      for (const t of through) drawSector(t, xL, xR, dep + 1, sn);

      for (const w of vis) {
        const wall = w.wall, ad = w.ad, bd = w.bd, x1 = w.x1, x2 = w.x2, span = x2 - x1;
        const wallHL = !!(hl && hl.edge != null && hl.sec === sn && hl.edge === w.wi);   // this exact wall targeted
        const wallTx = wall.tex ? cacheOf(World.TX[wall.tex] || World.TX.lair) : wt;
        const drawTx = wall.door ? cacheOf(World.TX[wall.door] || World.TX.lair) : wallTx;  // door/interactive wall texture
        const wisc = 1 / (wall.texScale || 1);                        // wall tile size (>1 bigger, <1 smaller)
        const yc1 = horizon - (cz - eyeZ) * H / ad, yc2 = horizon - (cz - eyeZ) * H / bd;
        const yf1 = horizon - (fz - eyeZ) * H / ad, yf2 = horizon - (fz - eyeZ) * H / bd;
        const iz1 = 1 / ad, iz2 = 1 / bd, uz1 = w.ua / ad, uz2 = w.ub / bd;
        const ns = (wall.next >= 0 && !(wall.door && !wall.open)) ? geo.sectors[wall.next] : null;  // closed door renders solid
        // step-down soffit: facade outdoors when EITHER side is sky (matches the grid
        // renderer's historic "wall of sky" fix) — checking only the current sector let
        // a farther sky sector's parallax backdrop bleed down over a nearer opening.
        const upTx = (sky || (ns && ns.sky)) ? facadeTex : stepUp;
        const nyc1 = ns ? horizon - (ns.ceil - eyeZ) * H / ad : 0, nyc2 = ns ? horizon - (ns.ceil - eyeZ) * H / bd : 0;
        const nyf1 = ns ? horizon - (ns.floor - eyeZ) * H / ad : 0, nyf2 = ns ? horizon - (ns.floor - eyeZ) * H / bd : 0;
        const xs = Math.max(xL, Math.ceil(x1)), xe = Math.min(xR, Math.floor(x2));
        let pX1 = 1e9, pX2 = -1e9;
        for (let x = xs; x <= xe; x++) {
          if (yTopA[x] > yBotA[x]) continue;
          const f = (x - x1) / span;
          const ycTrue = yc1 + (yc2 - yc1) * f, yfTrue = yf1 + (yf2 - yf1) * f;  // TRUE projected position —
          let yc = ycTrue, yf = yfTrue;                     // used for the wall's OWN texture V mapping below.
          if (yc < yTopA[x]) yc = yTopA[x]; if (yf > yBotA[x]) yf = yBotA[x];    // yc/yf get clamped to the
          // current per-column visible window for floor/ceiling occlusion purposes only — using the CLAMPED
          // value for the wall's texture V would shrink/shift the span whenever the true edge is off-screen
          // (routinely true up close or near the screen edges), stretching the texture unevenly column to
          // column: a straight horizontal band on the wall would render as a wave. Keep them separate.
          const ycI = yc | 0, yfI = yf | 0;
          const tan = (x - W / 2) / FX, rdx = cosA - sinA * tan, rdy = sinA + cosA * tan;
          if (sky) {                                                 // ceiling = parallax sky backdrop
            const ang = Math.atan2(rdy, rdx);
            const skyU = (((ang / TAU) * skyTex.w * 2) % skyTex.w + skyTex.w) % skyTex.w | 0;
            for (let y = yTopA[x]; y < ycI; y++) {
              const idx = y * W + x;
              const v = clamp(((y - horizon + H * 0.5) / H) * skyTex.h, 0, skyTex.h - 1) | 0;
              let cpx = skyTex.u32[v * skyTex.w + skyU];
              if (secCeilHL) cpx = hlMix(cpx);
              buf[idx] = cpx; depth[idx] = MAXD;
            }
          } else {                                                   // ceiling (this sector, textured)
            for (let y = yTopA[x]; y < ycI; y++) {
              const rd = (cz - eyeZ) * H / (horizon - y);
              if (rd > 0.02 && rd < 64) {
                const wx = (px + rdx * rd) * isc, wy = (py + rdy * rd) * isc, idx = y * W + x;
                let cpx = shade(ctex.u32[((((wy - Math.floor(wy)) * 64) | 0) & 63) * 64 + ((((wx - Math.floor(wx)) * 64) | 0) & 63)], fogAt(rd));
                if (secCeilHL) cpx = hlMix(cpx);
                buf[idx] = cpx;
                depth[idx] = rd;
              }
            }
          }
          for (let y = yfI + 1; y <= yBotA[x]; y++) {                // floor (this sector)
            const rd = (eyeZ - fz) * H / (y - horizon);
            if (rd > 0.02 && rd < 64) {
              const wx = (px + rdx * rd) * isc, wy = (py + rdy * rd) * isc, idx = y * W + x;
              let fpx = shade(ftex.u32[((((wy - Math.floor(wy)) * 64) | 0) & 63) * 64 + ((((wx - Math.floor(wx)) * 64) | 0) & 63)], fogAt(rd));
              if (secFloorHL) fpx = hlMix(fpx);
              buf[idx] = fpx;
              depth[idx] = rd;
            }
          }
          if (ycI > yTopA[x]) yTopA[x] = ycI;                        // ceiling/floor now filled to the wall
          if (yfI < yBotA[x]) yBotA[x] = yfI;
          const zdist = 1 / (iz1 + (iz2 - iz1) * f);
          const u = (uz1 + (uz2 - uz1) * f) * zdist * wisc;
          const texU = ((((u - Math.floor(u)) * 64) | 0) & 63);
          const wsh = Math.min(0.85, fogAt(zdist));
          if (!ns) {                                                 // solid wall (incl. closed door)
            for (let y = yTopA[x]; y <= yBotA[x]; y++) {
              const v = yfTrue > ycTrue ? (y - ycTrue) / (yfTrue - ycTrue) : 0;
              const tv = (((((cz - fz) * v * wisc) % 1) + 1) % 1 * 64 | 0) & 63;
              const idx = y * W + x;
              let wpx = shade(drawTx.u32[tv * 64 + texU], wsh);
              if (wallHL) wpx = hlMix(wpx);
              buf[idx] = wpx; depth[idx] = zdist;
            }
            if (zdist < zbuf[x]) {                                    // nearest solid wall for this column
              zbuf[x] = zdist;
              colHit[x] = wall.cell
                ? { mx: wall.cell.x, my: wall.cell.y, val: World.get(wall.cell.x, wall.cell.y), dist: zdist, y0: yc, y1: yf, wall }
                : { mx: -1, my: -1, val: 0, dist: zdist, y0: yc, y1: yf, wall };
            }
            yTopA[x] = 1; yBotA[x] = 0;                              // close column
          } else {                                                   // portal: upper/lower steps + opening
            const nycTrue = nyc1 + (nyc2 - nyc1) * f, nyfTrue = nyf1 + (nyf2 - nyf1) * f;  // true, unclamped
            let nyc = nycTrue, nyf = nyfTrue;
            if (nyc < yTopA[x]) nyc = yTopA[x]; if (nyc > yBotA[x]) nyc = yBotA[x];
            if (nyf > yBotA[x]) nyf = yBotA[x]; if (nyf < yTopA[x]) nyf = yTopA[x];
            for (let y = yTopA[x]; y < (nyc | 0); y++) {             // upper step (neighbour ceiling lower)
              const v = nycTrue > ycTrue ? (y - ycTrue) / (nycTrue - ycTrue) : 0;
              const tv = (((((cz - ns.ceil) * v * wisc) % 1) + 1) % 1 * 64 | 0) & 63;
              const idx = y * W + x;
              let upx = shade(upTx.u32[tv * 64 + texU], wsh);
              if (wallHL) upx = hlMix(upx);
              buf[idx] = upx; depth[idx] = zdist;
            }
            for (let y = (nyf | 0) + 1; y <= yBotA[x]; y++) {        // lower step (neighbour floor higher)
              const v = yfTrue > nyfTrue ? (y - nyfTrue) / (yfTrue - nyfTrue) : 0;
              const tv = (((((ns.floor - fz) * v * wisc) % 1) + 1) % 1 * 64 | 0) & 63;
              const idx = y * W + x;
              let dpx = shade(stepDn.u32[tv * 64 + texU], wsh);
              if (wallHL) dpx = hlMix(dpx);
              buf[idx] = dpx; depth[idx] = zdist;
            }
            yTopA[x] = nyc | 0; yBotA[x] = nyf | 0;                  // opening passes to the neighbour
            if (x < pX1) pX1 = x; if (x > pX2) pX2 = x;
          }
        }
        if (ns && pX2 >= pX1) drawSector(wall.next, pX1, pX2, dep + 1, sn);   // depth-first into the neighbour
      }
    }

    let start = sectorAt(px, py, geo);
    if (start < 0) start = 0;
    drawSector(start, 0, W - 1, 0, -1);

    // ----- sprites: billboarded, depth-occluded (same math as the grid renderer) -----
    rects = [];
    const vis2 = [];
    for (const e of World.ents) {
      const rx = e.x - px, ry = e.y - py;
      const d = rx * cosA + ry * sinA;
      if (d <= 0.2) continue;
      vis2.push({ e, d, side: rx * -sinA + ry * cosA });
    }
    vis2.sort((a, b) => b.d - a.d);
    for (const s of vis2) {
      const e = s.e, d = s.d;
      const sx = W / 2 + (s.side / d) * FX;
      const sc = e.dead ? 0.3 : e.scale;
      // Read the live vector sector's floor (geoFloorAtXY), not the grid's cached
      // World.floorZAt — a sector's floor can be edited directly (PgUp/PgDn in the
      // 3D preview mutates geo.sectors[s].floor in place) without ever touching the
      // grid, so the grid lookup goes stale and sprites stop tracking the terrain
      // they're standing on: the floor visibly moves under them, they don't.
      const baseY = horizon - (geoFloorAtXY(geo, graph, e.x, e.y, e.sector) - eyeZ) * H / d;
      const hgt = (H / d) * sc, wdt = hgt, top = baseY - hgt, left = sx - wdt / 2;
      const x0 = Math.max(0, Math.ceil(left)), x1 = Math.min(W - 1, Math.floor(left + wdt));
      const y0i = Math.max(0, Math.ceil(top)), y1i = Math.min(H - 1, Math.floor(baseY));
      const tex = cacheOf(e.getTex());
      const fog = fogAt(d);
      let drawn = false;
      for (let x = x0; x <= x1; x++) {
        const texX = clamp(((x - left) / wdt) * 64, 0, 63) | 0;
        for (let yy = y0i; yy <= y1i; yy++) {
          const idx = yy * W + x;
          if (d > depth[idx] + 0.05) continue;
          const texY = clamp(((yy - top) / hgt) * 64, 0, 63) | 0;
          const c = tex.u32[texY * 64 + texX];
          if ((c >>> 24) < 128) continue;
          buf[idx] = shade(c, fog); drawn = true;
        }
      }
      if (drawn) rects.push({ ent: e, x0: left, x1: left + wdt, y0: top, y1: baseY, dist: d });
    }

    octx.putImageData(img, 0, 0);
    paintOverlays(g);
    ctx.drawImage(off, 0, 0, W, H, 0, 0, DW, DH);
  }

  // =========================================================================
  // PORTAL PHYSICS — collision & line-of-sight against vector geometry.
  // Collide-and-slide against wall SEGMENTS (works at any wall angle, unlike
  // grid isSolid) with Build-style step-height gating across portals.
  // =========================================================================
  function closestOnSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
    let t = L2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / L2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return { x: ax + dx * t, y: ay + dy * t };
  }
  // sector containing (x,y), searching the cached sector + its neighbours first
  function localSector(geo, graph, x, y, from) {
    if (from != null && from >= 0 && from < geo.sectors.length && pInLoop(x, y, geo.sectors[from].loop, geo.verts)) return from;
    if (from != null && from >= 0 && graph[from]) {
      for (const w of graph[from]) if (w.next >= 0 && pInLoop(x, y, geo.sectors[w.next].loop, geo.verts)) return w.next;
    }
    return sectorAt(x, y, geo);
  }
  // floor height at a world point (flat per sector for now; slopes later)
  function geoFloorAtXY(geo, graph, x, y, from) {
    const s = localSector(geo, graph, x, y, from);
    return s >= 0 ? geo.sectors[s].floor : 0;
  }
  const _cwalls = [];
  function gatherWalls(geo, graph, cs) {
    _cwalls.length = 0;
    const seen = new Set([cs]);
    if (graph[cs]) {
      for (const w of graph[cs]) _cwalls.push(w);
      for (const w of graph[cs]) if (w.next >= 0 && !seen.has(w.next)) { seen.add(w.next); for (const w2 of graph[w.next]) _cwalls.push(w2); }
    }
    return _cwalls;
  }
  // move entity o toward (nx,ny) with radius r, climbing ledges up to `step`.
  // Mutates o.x/o.y and caches o.sector. Sweeps in sub-steps (≤ r/2) so it slides
  // along walls and never tunnels, whatever the move size / framerate.
  function moveGeo(geo, graph, o, nx, ny, r, step) {
    const dx = nx - o.x, dy = ny - o.y, dist = Math.hypot(dx, dy);
    const n = Math.max(1, Math.ceil(dist / (r * 0.5)));
    for (let i = 1; i <= n; i++) moveStep(geo, graph, o, o.x + dx / n, o.y + dy / n, r, step);
  }
  function moveStep(geo, graph, o, nx, ny, r, step) {
    const cs = localSector(geo, graph, o.x, o.y, o.sector);
    if (cs < 0) { o.x = nx; o.y = ny; o.sector = sectorAt(nx, ny, geo); return; }  // off the mesh → free
    const fromFloor = geo.sectors[cs].floor;
    const walls = gatherWalls(geo, graph, cs);
    let mx = nx, my = ny;
    for (let iter = 0; iter < 4; iter++) {
      let hit = false;
      for (const w of walls) {
        let block = w.next < 0;                                   // solid wall
        if (!block && w.door && !w.open) block = true;            // closed door
        if (!block && geo.sectors[w.next].floor - fromFloor > step) block = true;  // ledge too tall to climb
        if (!block) continue;
        const A = geo.verts[w.v1], B = geo.verts[w.v2];
        const cp = closestOnSeg(mx, my, A.x, A.y, B.x, B.y);
        let ex = mx - cp.x, ey = my - cp.y; const dist = Math.hypot(ex, ey);
        if (dist >= r) continue;
        if (dist > 1e-6) { ex /= dist; ey /= dist; }              // push straight out
        else { const wx = B.x - A.x, wy = B.y - A.y, L = Math.hypot(wx, wy) || 1; ex = -wy / L; ey = wx / L; }  // on the line → interior (left) normal
        const push = r - dist + 1e-4;
        mx += ex * push; my += ey * push; hit = true;
      }
      if (!hit) break;
    }
    const ds = localSector(geo, graph, mx, my, cs);
    if (ds < 0) return;                                           // slid into the void → reject
    if (geo.sectors[ds].floor - fromFloor > step) return;        // final ledge check
    o.x = mx; o.y = my; o.sector = ds;
  }
  const _cr = (ax, ay, bx, by, px, py) => (bx - ax) * (py - ay) - (by - ay) * (px - ax);
  function segsCross(ax, ay, bx, by, cx, cy, dx, dy) {
    const d1 = _cr(cx, cy, dx, dy, ax, ay), d2 = _cr(cx, cy, dx, dy, bx, by);
    const d3 = _cr(ax, ay, bx, by, cx, cy), d4 = _cr(ax, ay, bx, by, dx, dy);
    return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
  }
  // clear line of sight: does the segment cross any opaque wall (solid or closed door)?
  function losGeo(geo, graph, x0, y0, x1, y1) {
    for (let s = 0; s < graph.length; s++) for (const w of graph[s]) {
      if (w.next >= 0 && !(w.door && !w.open)) continue;         // open portal is transparent
      const A = geo.verts[w.v1], B = geo.verts[w.v2];
      if (segsCross(x0, y0, x1, y1, A.x, A.y, B.x, B.y)) return false;
    }
    return true;
  }

  return {
    W, H, init, render, zbuf, colHit, rects: () => rects, pickAt,
    buildGraph, sectorAt, renderPortal, openDoor,
    moveGeo, losGeo, geoFloorAtXY, localSector, depth,
    setDebugTrace: on => { dbgOn = on; }, get debugTrace() { return dbgTrace; },
    setHighlight,
  };
})();
