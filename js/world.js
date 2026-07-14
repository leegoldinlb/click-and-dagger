'use strict';

// ---------------------------------------------------------------------------
// World: textures, sprites, and level state. Levels are plain data
// ({v, w, h, map, spawn, ents}) so the editor can build them too.
//
// SOLID walls (block the ray):  # teak paneling  % lair concrete
//   C radio door  E blast door  F mainframe  P poster
// FLOOR sectors (walkable, each with its own floor/ceiling height + textures):
//   . room floor      r raised platform   l low-ceiling corridor
//   o outdoor ground (open sky)   w helipad win-zone (raised, open sky)
// ---------------------------------------------------------------------------
const World = (() => {
  const T = { NONE: 0, TEAK: 1, LAIR: 2, EXIT: 3, RADIO: 4, MAINFRAME: 5, POSTER: 6 };
  const CH = { '#': 1, '%': 2, 'E': 3, 'C': 4, 'F': 5, 'P': 6,
               '.': 0, 'w': 0, 'o': 0, 'r': 0, 'l': 0, 'p': 0 };

  // Sector definitions per floor char. f/c are floor/ceiling height in world
  // units (default room is floor 0 → ceiling 1; the eye sits 0.5 above floor).
  const SURF = {
    '.': { f: 0.0,  c: 1.0,  ft: 'carpet',   ct: 'ceiltile', sky: false, win: false },
    'r': { f: 0.4,  c: 1.0,  ft: 'metal',    ct: 'ceiltile', sky: false, win: false },
    'p': { f: -0.5, c: 1.0,  ft: 'lounge',   ct: 'ceiltile', sky: false, win: false },
    'l': { f: 0.0,  c: 0.55, ft: 'carpet',   ct: 'vent',     sky: false, win: false },
    'o': { f: 0.0,  c: 3.2,  ft: 'ground',   ct: null,       sky: true,  win: false },
    'w': { f: 0.18, c: 3.2,  ft: 'helipad',  ct: null,       sky: true,  win: true  },
  };

  // -------------------------------------------------------------------------
  // Default level: PLAZA VIEJA — a little square in Havana, 1962. Showcases the
  // outdoor sky, sloped ramp, raised bandstand, sunken fountain, low-ceiling
  // arcade, and mixed textures. The re-themed puzzle (picks → radio store → tube
  // → mainframe → gate → getaway dock) is placed around the plaza.
  // -------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // PLAZA VIEJA — the default mission, hand-authored as VECTOR sectors (no grid
  // compile). Built to exercise everything the Build engine does: non-rectangular
  // portal-linked rooms, nested sub-sectors (fountain, stage), Build-style pillar
  // "teeth" (solid mass carved between two sectors so both faces render their own
  // wall texture), varied sky rooflines, per-wall textures & tile scales, tagged
  // door walls (radio/blast/mainframe/poster) driving the whole puzzle chain, an
  // open cantina storefront under a lintel, and a harbour you can fall into.
  // ---------------------------------------------------------------------------
  const DEFAULT = (() => {
    const verts = [], vmap = new Map();
    const V = (x, y) => { const k = x + ',' + y; if (!vmap.has(k)) { vmap.set(k, verts.length); verts.push({ x, y }); } return vmap.get(k); };
    const sectors = [];
    // add a sector from a coordinate list; winding normalised to positive shoelace
    // (same convention as the editor's closeSector) so front faces render.
    const S = (coords, p) => {
      let loop = coords.map(([x, y]) => V(x, y));
      let area = 0;
      for (let i = 0; i < loop.length; i++) { const a = verts[loop[i]], b = verts[loop[(i + 1) % loop.length]]; area += a.x * b.y - b.x * a.y; }
      if (area < 0) loop = loop.slice().reverse();
      const n = loop.length;
      sectors.push(Object.assign({
        loop, floor: 0, ceil: 3.6, floorTex: 'tile', ceilTex: 'ceiltile', sky: false, win: false, texScale: 1,
        wallTex: new Array(n).fill(null), wallDoor: new Array(n).fill(null), wallTexScale: new Array(n).fill(1), parent: -1,
      }, p));
      return sectors.length - 1;
    };
    // paint/tag a wall by its ENDPOINTS (immune to winding direction/index shifts)
    const wall = (si, ax, ay, bx, by, o) => {
      const sec = sectors[si], a = V(ax, ay), b = V(bx, by), L = sec.loop;
      for (let i = 0; i < L.length; i++) {
        const p = L[i], q = L[(i + 1) % L.length];
        if ((p === a && q === b) || (p === b && q === a)) {
          if (o.tex !== undefined) sec.wallTex[i] = o.tex;
          if (o.door !== undefined) sec.wallDoor[i] = o.door;
          if (o.scale !== undefined) sec.wallTexScale[i] = o.scale;
          return;
        }
      }
      throw new Error('DEFAULT map: no wall (' + ax + ',' + ay + ')-(' + bx + ',' + by + ') in sector ' + si);
    };
    const fillTex = (si, tex) => sectors[si].wallTex.fill(tex);

    // ---- 0: THE PLAZA — big open sky square; ceramic tile, pastel facades ----
    const PLAZA = S([
      [4, 4], [10, 4], [12, 4], [17.5, 4], [18.4, 4], [19, 4],                       // north facade (blast gate, alley mouth)
      [19, 9.5], [19, 10.5], [19, 12], [19, 13.5], [19, 14],                          // east facade (radio-shop front)
      [16.5, 14], [16, 14], [14, 14], [13.5, 14], [11.5, 14], [11, 14], [9, 14], [8.5, 14], [6.5, 14], [6, 14], [4, 14],  // arcade colonnade line
      [4, 11], [4, 5],                                                               // west (café terrace opening)
    ], { sky: true, ceil: 3.6, floorTex: 'tile', texScale: 2 });
    fillTex(PLAZA, 'stucco');
    wall(PLAZA, 4, 4, 10, 4, { tex: 'stuccop' });                                     // pastel row along the north
    wall(PLAZA, 12, 4, 17.5, 4, { tex: 'stuccob' });
    wall(PLAZA, 18.4, 4, 19, 4, { tex: 'mural' });                                    // revolution mural by the alley
    wall(PLAZA, 19, 4, 19, 9.5, { tex: 'brick' });
    wall(PLAZA, 19, 9.5, 19, 10.5, { tex: 'radio' });                                 // shopfront flanks
    wall(PLAZA, 19, 12, 19, 13.5, { tex: 'radio' });
    for (const [a, b] of [[16.5, 16], [14, 13.5], [11.5, 11], [9, 8.5], [6.5, 6]])    // colonnade pillars, plaza face
      wall(PLAZA, a, 14, b, 14, { tex: 'limestone' });

    // ---- 1: FOUNTAIN — sunken octagonal basin, nested in the plaza ----
    S([[10, 7], [13, 7], [14, 8], [14, 9], [13, 10], [10, 10], [9, 9], [9, 8]],
      { parent: PLAZA, sky: true, ceil: 3.6, floor: -0.4, floorTex: 'water' });

    // ---- 2: STAGE — low tobacco-crate bandstand, nested in the plaza ----
    const STAGE = S([[15.5, 5.5], [17.5, 5.5], [17.5, 7], [15.5, 7]],
      { parent: PLAZA, sky: true, ceil: 3.6, floor: 0.5, floorTex: 'wood' });
    fillTex(STAGE, 'wood');

    // ---- 3: CAFÉ TERRACE — raised deck under a striped awning ----
    const TERR = S([[1.2, 5], [4, 5], [4, 11], [1.2, 11]],
      { sky: true, ceil: 3.6, floor: 0.35, floorTex: 'wood' });
    fillTex(TERR, 'stuccop');
    wall(TERR, 1.2, 5, 4, 5, { tex: 'awning' });                                      // café canopy on the short face

    // ---- 4: CANTINA — roofed corner bar, open storefronts to terrace & plaza ----
    const CANT = S([[1.2, 11], [4, 11], [4, 14], [1.2, 14]],
      { floor: 0.35, ceil: 1.9, floorTex: 'azulejo', ceilTex: 'wood' });
    fillTex(CANT, 'teak');

    // ---- 5: ARCADE — covered colonnade; its side of the pillars dips south ----
    const ARC = S([
      [4, 14], [6, 14], [6, 14.3], [6.5, 14.3], [6.5, 14],
      [8.5, 14], [8.5, 14.3], [9, 14.3], [9, 14],
      [11, 14], [11, 14.3], [11.5, 14.3], [11.5, 14],
      [13.5, 14], [13.5, 14.3], [14, 14.3], [14, 14],
      [16, 14], [16, 14.3], [16.5, 14.3], [16.5, 14],
      [19, 14], [19, 16.6],
      [12, 16.6], [11, 16.6], [9.6, 16.6], [8.4, 16.6], [4, 16.6],
    ], { floor: 0, ceil: 1.5, floorTex: 'limestone', ceilTex: 'wood' });
    fillTex(ARC, 'brick');
    for (const [a, b] of [[6, 6.5], [8.5, 9], [11, 11.5], [13.5, 14], [16, 16.5]]) {  // pillar flanks, arcade side
      wall(ARC, a, 14, a, 14.3, { tex: 'limestone' });
      wall(ARC, a, 14.3, b, 14.3, { tex: 'limestone' });
      wall(ARC, b, 14.3, b, 14, { tex: 'limestone' });
    }
    wall(ARC, 12, 16.6, 11, 16.6, { door: 'poster' });                                // 004's hint hangs mid-arcade

    // ---- 6: STUDY — Volkov's back office, tucked behind the arcade ----
    const STUDY = S([[7.6, 16.6], [8.4, 16.6], [9.6, 16.6], [10.4, 16.6], [10.4, 19], [7.6, 19]],
      { floor: 0, ceil: 1.4, floorTex: 'carpet', ceilTex: 'ceiltile' });
    fillTex(STUDY, 'teak');
    wall(STUDY, 10.4, 16.6, 10.4, 19, { tex: 'cork' });                               // the conspiracy wall

    // ---- 7: RADIO SHOP — locked; the mainframe hums against the back wall ----
    const SHOP = S([
      [19, 10.5], [19, 12], [19.2, 12], [19.2, 13.5], [23.5, 13.5],
      [23.5, 12.2], [23.5, 10.8], [23.5, 9.5], [19.2, 9.5], [19.2, 10.5],
    ], { floor: 0, ceil: 1.6, floorTex: 'wood', ceilTex: 'ceiltile' });
    fillTex(SHOP, 'panel');
    wall(SHOP, 19, 10.5, 19, 12, { door: 'radio' });                                  // the locked shopfront
    wall(SHOP, 23.5, 10.8, 23.5, 12.2, { door: 'mainframe' });                        // sabotaged mainframe
    wall(SHOP, 19.2, 9.5, 23.5, 9.5, { tex: 'cork' });

    // ---- 8: DOCK — behind the harbour gate; corrugated sheds, morning sea air ----
    const DOCK = S([
      [3, 1.2], [17.5, 1.2], [17.5, 4], [14.7, 4], [12, 4], [10, 4], [3, 4],
      [3, 2.8], [3, 1.4],
    ], { sky: true, ceil: 3.0, floor: 0.05, floorTex: 'wood' });
    fillTex(DOCK, 'corrugated');
    wall(DOCK, 3, 4, 10, 4, { tex: 'rope', scale: 2 });                               // coiled lines on the shed wall

    // ---- 9: HARBOUR — open water off the dock edge; you can fall in ----
    const WATER = S([[3, 0.2], [17.5, 0.2], [17.5, 1.2], [3, 1.2]],
      { sky: true, ceil: 3.0, floor: -0.45, floorTex: 'water' });
    fillTex(WATER, 'limestone');

    // ---- 10: ALLEY — crooked service cut between plaza and dock ----
    const ALLEY = S([[17.5, 1.2], [19, 1.2], [19, 2.6], [18.4, 2.6], [18.4, 4], [17.5, 4]],
      { sky: true, ceil: 2.7, floor: 0.15, floorTex: 'cobble' });
    fillTex(ALLEY, 'corrugated');
    wall(ALLEY, 19, 1.2, 19, 2.6, { tex: 'mural' });
    wall(ALLEY, 18.4, 2.6, 18.4, 4, { tex: 'sandbag' });

    // ---- 11: THE BOAT — moored at the dock's west end; the way home ----
    const BOAT = S([[1.4, 1.4], [3, 1.4], [3, 2.8], [1.4, 2.8]],
      { sky: true, ceil: 3.0, floor: 0.1, floorTex: 'wood', win: true });
    fillTex(BOAT, 'wood');

    // door tags live on one side; buildGraph mirrors them onto the twin wall
    wall(PLAZA, 10, 4, 12, 4, { door: 'blast' });                                     // the harbour gate

    const ents = [
      // the fallen contact, the tools, the goal
      { kind: 'agent', x: 5.2, y: 15.5 },          // 004, under the colonnade
      { kind: 'desk', x: 9, y: 18.2 },             // Volkov's desk (punch card)
      { kind: 'tube', x: 22.6, y: 10.2 },          // the missing tube, locked in the shop
      // the opposition
      { kind: 'goon', x: 14.8, y: 11.2 }, { kind: 'goon', x: 16.4, y: 8.2 },
      { kind: 'goon', x: 15, y: 15.4 }, { kind: 'goon', x: 2.4, y: 12.6 },
      { kind: 'goon', x: 8, y: 2.6 },
      { kind: 'goon', x: 14.5, y: 2.4 }, { kind: 'goon', x: 21, y: 12.6 },
      { kind: 'brute', x: 11, y: 6 },              // posted at the harbour gate
      { kind: 'sniper', x: 18.7, y: 2.3 },         // covers the gate from the alley
      // the living square: locals who want no part of this
      { kind: 'civilianF', x: 12.5, y: 9, behavior: 'wander' },
      { kind: 'civilianM', x: 3, y: 7.5, behavior: 'wander' },
      { kind: 'civilianM', x: 2.5, y: 13, behavior: 'stationary' },
      // supplies
      { kind: 'medkit', x: 1.9, y: 13.4 }, { kind: 'medkit', x: 8, y: 17.2 },
      { kind: 'medkit', x: 16.5, y: 3.3 }, { kind: 'medkit', x: 4.8, y: 4.8 },
      { kind: 'ammo', x: 11.8, y: 15.6 }, { kind: 'ammo', x: 16.5, y: 6.2 },
      { kind: 'ammo', x: 4, y: 3.4 }, { kind: 'ammo', x: 20, y: 10 },
      // the living square
      { kind: 'plant', x: 4.7, y: 5.6 }, { kind: 'plant', x: 18.2, y: 13.2 },
      { kind: 'plant', x: 1.8, y: 5.8 }, { kind: 'plant', x: 18.5, y: 15.8 },
      { kind: 'streetlamp', x: 8.5, y: 5 }, { kind: 'streetlamp', x: 14.5, y: 12.5 },
      { kind: 'streetlamp', x: 6.5, y: 2 },
      { kind: 'bar', x: 2, y: 6.8 }, { kind: 'umbrella', x: 3.2, y: 11.9 },
      { kind: 'wallclock', x: 2.2, y: 11.5 }, { kind: 'cigarcrate', x: 2.2, y: 9.8 },
      { kind: 'cigarcrate', x: 5, y: 1.9 }, { kind: 'cigarcrate', x: 15.8, y: 1.8 },
      // the shop's working clutter
      { kind: 'deskfan', x: 20, y: 13 }, { kind: 'typewriter', x: 21.5, y: 9.9 },
      { kind: 'filecab', x: 19.8, y: 10 }, { kind: 'safe', x: 23, y: 13 },
      // the study's secrets
      { kind: 'camera', x: 10, y: 18.4 }, { kind: 'globe', x: 8, y: 18.3 },
      { kind: 'briefcase', x: 10.1, y: 17.1 },
    ];

    return {
      v: 5, w: 26, h: 20,
      map: Array.from({ length: 20 }, () => '.'.repeat(26)),
      spawn: { x: 5.2, y: 12.6, a: 0 },
      ents,
      geo: { verts, sectors },
    };
  })();

  // ---- level state ----
  let MW = 0, MH = 0;
  let grid = [];                                  // grid[y][x] holds the map char
  let fgrid = null, cgrid = null;                 // per-cell floor/ceil height overrides (NaN = material default)
  let stexg = null, ctexg = null;                 // per-cell surface/wall + ceiling texture overrides (null = default)
  let fsxg = null, fsyg = null;                   // per-cell floor slope gradient (height units per world unit; 0 = flat)
  const winCells = new Set();
  const ents = [];
  const spawn = { x: 2.5, y: 2.5, a: 0 };
  let isCustom = false;
  let authoredGeo = null;                          // vector geo authored in the editor (source of truth when present)

  const charAt = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH) ? '%' : grid[y][x];
  const get = (x, y) => CH[charAt(x, y)] || 0;    // numeric wall id (0 = walkable floor)
  let geoRev = 0;                                 // bumps whenever grid solidity changes (doors) → recompile geo
  const set = (x, y, v) => { if (v === 0 && grid[y] && grid[y][x] !== '.') { grid[y][x] = '.'; geoRev++; } };  // adventure opens doors → floor
  const isSolid = (x, y) => get(Math.floor(x), Math.floor(y)) > 0;
  const winAt = (x, y) => winCells.has(Math.floor(x) + ',' + Math.floor(y));

  // A sector's material (texture/sky/solidity) comes from its char; its floor &
  // ceiling heights come from per-cell overrides if set, else the char default.
  // surfAt reuses one scratch object — callers read its fields immediately.
  // _s.f is the floor height at the CELL CENTRE; _s.fsx/_s.fsy are the floor
  // plane's gradient (dz per world unit). The true floor height at a point is
  // f + fsx*(x - cellCentreX) + fsy*(y - cellCentreY).
  const _s = { f: 0, c: 1, ft: 'carpet', ct: 'ceiltile', sky: false, win: false, fsx: 0, fsy: 0 };
  const surfAt = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const c = charAt(xi, yi);
    if ((CH[c] || 0) > 0) return null;
    const base = SURF[c] || SURF['.'];
    _s.ft = base.ft; _s.ct = base.ct; _s.sky = base.sky; _s.win = base.win;
    const i = yi * MW + xi;
    const fo = fgrid ? fgrid[i] : NaN, co = cgrid ? cgrid[i] : NaN;
    _s.f = fo === fo ? fo : base.f;               // NaN-safe: NaN !== NaN
    _s.c = co === co ? co : base.c;
    _s.fsx = fsxg ? fsxg[i] : 0;
    _s.fsy = fsyg ? fsyg[i] : 0;
    if (stexg && stexg[i]) _s.ft = stexg[i];      // per-cell texture overrides
    if (ctexg && ctexg[i]) _s.ct = ctexg[i];
    return _s;
  };
  // floor height at an exact world point, following the cell's slope plane
  const floorZAt = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const s = surfAt(x, y);
    if (!s) return 0;
    return s.f + s.fsx * (x - (xi + 0.5)) + s.fsy * (y - (yi + 0.5));
  };
  // live per-cell setters (used by the editor's 3D-mode sector editing)
  const setFloorZ = (x, y, z) => { const i = Math.floor(y) * MW + Math.floor(x); if (fgrid && i >= 0 && i < MW * MH) fgrid[i] = z; };
  const setCeilZ = (x, y, z) => { const i = Math.floor(y) * MW + Math.floor(x); if (cgrid && i >= 0 && i < MW * MH) cgrid[i] = z; };
  const setFloorSlope = (x, y, sx, sy) => { const i = Math.floor(y) * MW + Math.floor(x); if (fsxg && i >= 0 && i < MW * MH) { fsxg[i] = sx; fsyg[i] = sy; } };
  const setSurfTex = (x, y, name) => { const i = Math.floor(y) * MW + Math.floor(x); if (stexg && i >= 0 && i < MW * MH) stexg[i] = name || null; };
  const setCeilTex = (x, y, name) => { const i = Math.floor(y) * MW + Math.floor(x); if (ctexg && i >= 0 && i < MW * MH) ctexg[i] = name || null; };

  // -------------------------------------------------------------------------
  // GRID -> VECTOR compiler.  Turns the currently-loaded grid level into portal
  // `geo` (verts + sectors) for the Build-style renderer & physics.
  //
  // Adjacent open cells that share identical floor/ceiling height, textures,
  // sky, win-flag and slope are merged into ONE rectangular sector (classic
  // Build-engine "rooms"), instead of one sector per 1x1 cell. A big open area
  // like Plaza Vieja's plaza (~400 cells) collapses to a handful of real rooms.
  // This matters: with one sector per cell, a single glancing sight-line across
  // an open room could recurse the portal renderer 15-20+ levels deep (chaining
  // through dozens of tiny cell corners), and at that depth, ordering/precision
  // instability between near-tied neighbours was visible as texture flicker —
  // independent of any slope. Fewer, bigger sectors means shallow recursion.
  //
  // Cells that DIFFER even slightly (each step of a ramp has its own floor
  // height) simply don't share a merge key and stay their own 1-cell sector,
  // unaffected — merging never changes what a ramp looks like, only how many
  // sectors the FLAT surrounding floor gets split into.
  //
  // Each rectangle's boundary is still built from UNIT-length edges (one per
  // grid-cell-width along each side), not simplified — so buildGraph's
  // vertex-pair portal matching keeps working against ANY neighbour, merged
  // or not, with the exact same per-cell wall-texture/door granularity as
  // before (no T-junctions).
  // -------------------------------------------------------------------------
  function compileGeo() {
    const verts = [], vmap = new Map();
    const vi = (x, y) => { const k = x + '_' + y; let i = vmap.get(k); if (i === undefined) { i = verts.length; verts.push({ x, y }); vmap.set(k, i); } return i; };

    // ---- merge-key per open cell (null = solid, excluded) ----
    const key = new Array(MH);
    for (let y = 0; y < MH; y++) {
      key[y] = new Array(MW).fill(null);
      for (let x = 0; x < MW; x++) {
        const s = surfAt(x + 0.5, y + 0.5);
        if (s) key[y][x] = s.f + '|' + s.c + '|' + s.ft + '|' + s.ct + '|' + (s.sky ? 1 : 0) + '|' + (s.win ? 1 : 0) + '|' + s.fsx + '|' + s.fsy;
      }
    }
    // ---- greedy rectangle merge: grow each unclaimed cell as wide as it
    // matches, then extend that whole horizontal run down as far as it matches ----
    const used = new Array(MH);
    for (let y = 0; y < MH; y++) used[y] = new Array(MW).fill(false);
    const rects = [];                                     // {x0,y0,x1,y1} inclusive cell coords, one shared key
    for (let y = 0; y < MH; y++) {
      for (let x = 0; x < MW; x++) {
        if (used[y][x] || key[y][x] == null) continue;
        const k = key[y][x];
        let x1 = x;
        while (x1 + 1 < MW && !used[y][x1 + 1] && key[y][x1 + 1] === k) x1++;
        let y1 = y;
        rowloop:
        while (y1 + 1 < MH) {
          for (let xx = x; xx <= x1; xx++) if (used[y1 + 1][xx] || key[y1 + 1][xx] !== k) break rowloop;
          y1++;
        }
        for (let yy = y; yy <= y1; yy++) for (let xx = x; xx <= x1; xx++) used[yy][xx] = true;
        rects.push({ x0: x, y0: y, x1, y1 });
      }
    }

    // ---- one sector per rectangle. Each SIDE's run of unit segments is built
    // then collapsed: consecutive SOLID edges of the identical wall (same char
    // id + same resolved texture, so interaction semantics stay exact) merge
    // into ONE longer edge. Portal edges stay unit-length (safe: no risk of
    // breaking vertex-pair matching against a neighbour sector). This matters
    // for RENDERING, not just sector count: a long flat facade split into many
    // 1-unit edges gives each tiny segment its OWN independent, heavily-
    // foreshortened projection at grazing angles instead of one smooth
    // perspective-correct span end to end — visible as wall texture
    // stretching/smearing, worst at the edge of the FOV or up close. ----
    function buildSide(pts, nbs) {                        // pts/nbs: parallel arrays, one per unit edge on this side
      const outPts = [], outTex = [], outCell = [];
      let i = 0;
      while (i < pts.length) {
        const [nx, ny] = nbs[i];
        const val = get(nx, ny);
        if (val <= 0) { outPts.push(pts[i]); outTex.push(null); outCell.push(null); i++; continue; }
        const tex = wallTexName(nx, ny);
        let j = i;
        while (j + 1 < pts.length) {
          const [nx2, ny2] = nbs[j + 1];
          if (get(nx2, ny2) !== val || wallTexName(nx2, ny2) !== tex) break;
          j++;
        }
        outPts.push(pts[i]); outTex.push(tex); outCell.push({ x: nx, y: ny });
        i = j + 1;
      }
      return { pts: outPts, tex: outTex, cell: outCell };
    }
    const sectors = [];
    const cellSector = new Int32Array(MW * MH).fill(-1);
    for (const r of rects) {
      const s = surfAt(r.x0 + 0.5, r.y0 + 0.5);
      const northPts = [], northNb = [], eastPts = [], eastNb = [], southPts = [], southNb = [], westPts = [], westNb = [];
      for (let x = r.x0; x <= r.x1; x++) { northPts.push({ x, y: r.y0 }); northNb.push([x, r.y0 - 1]); }
      for (let y = r.y0; y <= r.y1; y++) { eastPts.push({ x: r.x1 + 1, y }); eastNb.push([r.x1 + 1, y]); }
      for (let x = r.x1; x >= r.x0; x--) { southPts.push({ x: x + 1, y: r.y1 + 1 }); southNb.push([x, r.y1 + 1]); }
      for (let y = r.y1; y >= r.y0; y--) { westPts.push({ x: r.x0, y: y + 1 }); westNb.push([r.x0 - 1, y]); }
      const sides = [buildSide(northPts, northNb), buildSide(eastPts, eastNb), buildSide(southPts, southNb), buildSide(westPts, westNb)];
      const loop = [], wallTex = [], wallCell = [];
      for (const side of sides) for (let k = 0; k < side.pts.length; k++) {
        loop.push(vi(side.pts[k].x, side.pts[k].y)); wallTex.push(side.tex[k]); wallCell.push(side.cell[k]);
      }
      const si = sectors.length;
      sectors.push({
        loop, floor: s.f, ceil: s.c, floorTex: s.ft, ceilTex: s.ct,
        sky: s.sky, win: s.win, fsx: s.fsx, fsy: s.fsy,
        wallTex, wallCell, parent: -1,
      });
      for (let yy = r.y0; yy <= r.y1; yy++) for (let xx = r.x0; xx <= r.x1; xx++) cellSector[yy * MW + xx] = si;
    }
    return { verts, sectors, cellSector, w: MW, h: MH };
  }

  // The runtime geometry: an authored vector geo when the level carries one
  // (editor "vector-first" levels), else compiled from the grid.
  function getGeo() { return authoredGeo || compileGeo(); }

  // -------------------------------------------------------------------------
  // Procedural 64x64 textures (walls) and sprites — no image assets.
  // -------------------------------------------------------------------------
  function cnv(fn, w = 64, h = 64) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    fn(g);
    return c;
  }

  // ---- pixel-art helpers for a grungier, higher-detail Build look ----
  function speck(g, n, color, w = 64, h = 64) {          // scattered 1px grime/highlights
    g.fillStyle = color;
    for (let i = 0; i < n; i++) g.fillRect((Math.random() * w) | 0, (Math.random() * h) | 0, 1, 1);
  }
  function bevel(g, x, y, w, h, light, dark) {           // 1px lit top/left, shadowed bottom/right
    g.fillStyle = light; g.fillRect(x, y, w, 1); g.fillRect(x, y, 1, h);
    g.fillStyle = dark; g.fillRect(x, y + h - 1, w, 1); g.fillRect(x + w - 1, y, 1, h);
  }
  function vgrad(g, x, y, w, h, top, bot) {              // vertical gradient (soft top-light)
    const gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, top); gr.addColorStop(1, bot);
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  }
  function stains(g, n, cols) {                          // soft weathering blotches
    for (let i = 0; i < n; i++) {
      g.globalAlpha = 0.05 + Math.random() * 0.10;
      g.fillStyle = cols[(Math.random() * cols.length) | 0];
      g.beginPath(); g.ellipse((Math.random() * 64) | 0, (Math.random() * 64) | 0, 3 + Math.random() * 8, 2 + Math.random() * 6, Math.random() * 3, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
  }

  // teak lounge wall: cream stucco above a brass rail, grained walnut panels below
  function teakBase(g) {
    g.fillStyle = '#b3a486'; g.fillRect(0, 0, 64, 25);                 // stucco
    g.fillStyle = '#a2926e'; for (let i = 0; i < 70; i++) g.fillRect((Math.random() * 64) | 0, (Math.random() * 23) | 0, 2, 1);
    speck(g, 36, 'rgba(255,255,255,0.07)', 64, 24);
    g.fillStyle = 'rgba(0,0,0,0.20)'; g.fillRect(0, 23, 64, 2);
    g.fillStyle = '#c8a53a'; g.fillRect(0, 25, 64, 4);                 // brass rail
    g.fillStyle = '#e8d182'; g.fillRect(0, 25, 64, 1);
    g.fillStyle = '#7c5f18'; g.fillRect(0, 28, 64, 1);
    for (let i = 0; i < 4; i++) {                                      // walnut planks
      const x = i * 16;
      g.fillStyle = '#4a3018'; g.fillRect(x, 29, 16, 35);
      g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = 1;
      for (let k = 0; k < 3; k++) {
        g.beginPath(); g.moveTo(x + 4 + k * 4, 30);
        g.bezierCurveTo(x + 3 + k * 4, 42, x + 6 + k * 4, 50, x + 4 + k * 4, 63); g.stroke();
      }
      bevel(g, x, 29, 16, 35, 'rgba(255,224,180,0.10)', 'rgba(0,0,0,0.38)');
    }
  }

  // lair service corridor: riveted concrete panels + orange hazard band
  function lairBase(g) {
    g.fillStyle = '#484c53'; g.fillRect(0, 0, 64, 64);
    speck(g, 130, 'rgba(0,0,0,0.10)'); speck(g, 60, 'rgba(255,255,255,0.05)');
    [[2, 2, 60, 23], [2, 39, 60, 23]].forEach(([x, y, w, h]) => {     // panels
      g.fillStyle = '#51565d'; g.fillRect(x, y, w, h);
      bevel(g, x, y, w, h, 'rgba(255,255,255,0.10)', 'rgba(0,0,0,0.42)');
    });
    g.fillStyle = '#c85f24'; g.fillRect(0, 28, 64, 9);                 // hazard band
    g.fillStyle = '#e17c35'; g.fillRect(0, 28, 64, 2);
    g.fillStyle = '#8a3d16'; g.fillRect(0, 35, 64, 2);
    speck(g, 34, 'rgba(0,0,0,0.16)');
    g.fillStyle = '#242629'; g.fillRect(0, 27, 64, 1); g.fillRect(0, 37, 64, 1);
    [8, 20, 44, 56].forEach(y => [8, 56].forEach(x => {               // bolts
      g.fillStyle = '#33363b'; g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill();
      g.fillStyle = '#767b83'; g.beginPath(); g.arc(x - 0.6, y - 0.6, 1, 0, 7); g.fill();
    }));
  }

  const TEX = {};
  TEX[T.TEAK] = cnv(teakBase);
  TEX[T.LAIR] = cnv(lairBase);

  TEX[T.POSTER] = cnv(g => {
    teakBase(g);
    g.fillStyle = '#e8dfc8'; g.fillRect(12, 4, 40, 56);          // travel poster
    g.fillStyle = '#2a7ab0'; g.fillRect(15, 22, 34, 20);         // sea
    g.fillStyle = '#7ac0e0'; g.fillRect(15, 7, 34, 15);          // sky
    g.fillStyle = '#ffd75e';
    g.beginPath(); g.arc(42, 14, 5, 0, 7); g.fill();             // sun
    g.fillStyle = '#e8dfc8';
    g.beginPath(); g.moveTo(22, 42); g.lineTo(28, 26); g.lineTo(30, 42); g.fill();  // sail
    g.fillStyle = '#333';
    g.font = 'bold 8px monospace'; g.textAlign = 'center';
    g.fillText('HAVANA', 32, 53);
    g.fillStyle = '#a02020'; g.font = 'bold 6px monospace';
    g.save(); g.translate(32, 46); g.rotate(-0.08); g.fillText('picks open all -004', 0, -26); g.restore();
  });

  TEX[T.RADIO] = cnv(g => {
    g.fillStyle = '#5a6068'; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = '#3a3e44'; g.lineWidth = 3; g.strokeRect(4, 2, 56, 60);
    g.fillStyle = '#3a3e44'; g.fillRect(8, 8, 48, 14);
    g.fillStyle = '#d8d2b8'; g.font = 'bold 9px monospace'; g.textAlign = 'center';
    g.fillText('RADIO', 32, 18);
    g.fillStyle = '#2c2e33'; g.fillRect(42, 34, 14, 18);         // lock plate
    g.fillStyle = '#c9a227';
    g.beginPath(); g.arc(49, 40, 3, 0, 7); g.fill();             // keyhole
    g.fillRect(48, 41, 2, 7);
    g.fillStyle = '#4a4e55'; g.fillRect(10, 30, 24, 3); g.fillRect(10, 44, 24, 3);
  });

  function blastDoor(powered) {
    return cnv(g => {
      g.fillStyle = '#565c66'; g.fillRect(0, 0, 64, 64);
      g.strokeStyle = '#31363e'; g.lineWidth = 3; g.strokeRect(3, 3, 58, 58);
      // hazard chevrons
      g.fillStyle = '#c9a227';
      for (let i = -1; i < 5; i++) {
        g.beginPath();
        g.moveTo(i * 14, 6); g.lineTo(i * 14 + 7, 6);
        g.lineTo(i * 14 + 15, 16); g.lineTo(i * 14 + 8, 16);
        g.closePath(); g.fill();
      }
      g.fillStyle = '#2c2e33'; g.fillRect(10, 24, 44, 12);
      g.fillStyle = powered ? '#ff8a3a' : '#7a5a4a';
      g.font = 'bold 8px monospace'; g.textAlign = 'center';
      g.fillText('HARBOUR', 32, 33);
      // card reader with slot
      g.fillStyle = '#1c2026'; g.fillRect(42, 42, 14, 16);
      g.fillStyle = '#0a0a0a'; g.fillRect(45, 50, 8, 2);
      g.fillStyle = powered ? '#4dff6a' : '#1a1a1a'; g.fillRect(45, 45, 8, 3);
    });
  }
  TEX[T.EXIT] = blastDoor(false);

  function mainframe(powered) {
    return cnv(g => {
      lairBase(g);
      g.fillStyle = '#2e3138'; g.fillRect(6, 4, 52, 56);          // cabinet
      g.strokeStyle = '#1c1e22'; g.strokeRect(6, 4, 52, 56);
      // tape reels
      g.fillStyle = '#15161a';
      g.beginPath(); g.arc(20, 16, 8, 0, 7); g.arc(44, 16, 8, 0, 7); g.fill();
      g.fillStyle = '#8a8f98';
      g.beginPath(); g.arc(20, 16, 3, 0, 7); g.arc(44, 16, 3, 0, 7); g.fill();
      // blinkenlights
      const cols = ['#ff5544', '#ffd75e', '#4dff6a', '#4a9aff'];
      for (let i = 0; i < 16; i++) {
        g.fillStyle = powered || Math.random() < 0.3 ? cols[i % 4] : '#3a3d44';
        g.fillRect(10 + (i % 8) * 6, 30 + ((i / 8) | 0) * 6, 3, 3);
      }
      // tube socket
      g.fillStyle = '#15161a'; g.fillRect(24, 44, 16, 12);
      if (powered) {
        g.fillStyle = '#ff9a3a'; g.fillRect(28, 46, 8, 8);
        g.fillStyle = '#ffe9a8'; g.fillRect(30, 48, 4, 4);
      } else {
        g.fillStyle = '#000'; g.fillRect(28, 46, 8, 8);
      }
    });
  }
  TEX[T.MAINFRAME] = mainframe(false);

  function setPowered() {
    TEX[T.EXIT] = blastDoor(true); TEX[T.MAINFRAME] = mainframe(true);
    TX.blast = TEX[T.EXIT]; TX.mainframe = TEX[T.MAINFRAME];   // keep the registry in sync
  }

  // ---- floor / ceiling / surface textures (sampled per-pixel by the renderer) ----
  const FLOOR = {};

  FLOOR.carpet = cnv(g => {                          // villain-lair red carpet, woven
    g.fillStyle = '#3f1b15'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = 'rgba(120,40,30,0.35)';            // weave weft
    for (let y = 0; y < 64; y += 2) g.fillRect(0, y, 64, 1);
    g.fillStyle = 'rgba(0,0,0,0.22)';
    for (let x = 0; x < 64; x += 2) g.fillRect(x, 0, 1, 64);
    speck(g, 200, 'rgba(230,150,120,0.06)'); speck(g, 120, 'rgba(0,0,0,0.10)');
    g.strokeStyle = 'rgba(201,162,39,0.18)'; g.lineWidth = 1; g.strokeRect(1, 1, 62, 62);   // border thread
  });

  FLOOR.ceiltile = cnv(g => {                        // dark acoustic ceiling, bevelled
    g.fillStyle = '#1c1915'; g.fillRect(0, 0, 64, 64);
    for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) {
      const x = tx * 32, y = ty * 32;
      g.fillStyle = '#211d18'; g.fillRect(x + 1, y + 1, 30, 30);
      bevel(g, x + 1, y + 1, 30, 30, 'rgba(255,255,255,0.05)', 'rgba(0,0,0,0.55)');
    }
    speck(g, 110, 'rgba(255,255,255,0.02)'); speck(g, 90, 'rgba(0,0,0,0.20)');
  });

  FLOOR.vent = cnv(g => {                             // metal grate (low-corridor ceiling)
    g.fillStyle = '#25272b'; g.fillRect(0, 0, 64, 64);
    for (let i = 2; i < 64; i += 8) {
      g.fillStyle = '#3d4046'; g.fillRect(i, 0, 4, 64);
      g.fillStyle = '#4c5057'; g.fillRect(i, 0, 1, 64);
      g.fillStyle = '#15161a'; g.fillRect(i + 3, 0, 1, 64);
    }
    g.fillStyle = '#101114'; for (let i = 0; i < 64; i += 16) g.fillRect(0, i, 64, 2);
    speck(g, 40, 'rgba(0,0,0,0.2)');
  });

  FLOOR.metal = cnv(g => {                            // diamond tread-plate
    g.fillStyle = '#565b62'; g.fillRect(0, 0, 64, 64);
    speck(g, 80, 'rgba(0,0,0,0.14)'); speck(g, 50, 'rgba(255,255,255,0.06)');
    for (let y = 0; y < 64; y += 16) for (let x = 0; x < 64; x += 16) {
      const ox = ((y / 16) % 2) * 8;
      g.strokeStyle = '#787d85'; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x + ox - 3, y + 5); g.lineTo(x + ox + 3, y + 11); g.stroke();
      g.beginPath(); g.moveTo(x + ox + 3, y + 5); g.lineTo(x + ox - 3, y + 11); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x + ox - 3, y + 6); g.lineTo(x + ox + 3, y + 12); g.stroke();
    }
  });

  FLOOR.ground = cnv(g => {                           // alpine rock & snow
    g.fillStyle = '#565a60'; g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 30; i++) {                    // rock clumps with shading
      const x = (Math.random() * 60) | 0, y = (Math.random() * 60) | 0, s = 3 + Math.random() * 6;
      g.fillStyle = ['#484c52', '#5f646b', '#42464c'][i % 3]; g.fillRect(x, y, s, s);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, y + s - 1, s, 1);
    }
    g.fillStyle = '#dfe4e9'; for (let i = 0; i < 55; i++) g.fillRect((Math.random() * 64) | 0, (Math.random() * 64) | 0, 2, 2);
    speck(g, 60, 'rgba(0,0,0,0.18)');
  });

  FLOOR.lounge = cnv(g => {                           // 60s conversation-pit checker
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      g.fillStyle = ((x + y) & 1) ? '#1f736e' : '#2a2420'; g.fillRect(x * 8, y * 8, 8, 8);
      bevel(g, x * 8, y * 8, 8, 8, 'rgba(255,255,255,0.06)', 'rgba(0,0,0,0.30)');
    }
    g.fillStyle = '#c9a227'; for (let i = 0; i < 8; i++) g.fillRect(i * 8 + 3, ((i * 3) % 8) * 8 + 3, 2, 2);
    speck(g, 70, 'rgba(255,255,255,0.05)');
  });

  FLOOR.helipad = cnv(g => {                          // asphalt landing pad
    g.fillStyle = '#26282c'; g.fillRect(0, 0, 64, 64);
    speck(g, 150, 'rgba(255,255,255,0.03)'); speck(g, 90, 'rgba(0,0,0,0.25)');
    g.fillStyle = '#e8c23a'; g.fillRect(18, 12, 6, 40); g.fillRect(40, 12, 6, 40); g.fillRect(24, 29, 16, 6);
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(18, 48, 6, 4); g.fillRect(40, 48, 6, 4);  // scuff
    g.strokeStyle = '#e8c23a'; g.lineWidth = 2; g.strokeRect(6, 6, 52, 52);
  });

  // ---- extra library textures (assignable to any surface in the editor) ----
  FLOOR.brick = cnv(g => {                            // weathered terracotta brick
    g.fillStyle = '#4a3428'; g.fillRect(0, 0, 64, 64);                // warm mortar
    const pal = ['#9c4a30', '#b05a38', '#8a3c26', '#a5502e', '#7e3624'];
    for (let row = 0; row < 8; row++) {
      const off = (row % 2) * 16;
      for (let b = -1; b < 5; b++) {
        const x = b * 32 + off + 1, y = row * 8 + 1;
        g.fillStyle = pal[(b * 3 + row * 2) % pal.length]; g.fillRect(x, y, 30, 6);
        g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x, y + 4, 30, 2);
        bevel(g, x, y, 30, 6, 'rgba(255,200,160,0.16)', 'rgba(0,0,0,0.30)');
      }
    }
    stains(g, 10, ['#2e3a24', '#1c140e']);                            // moss / grime
    speck(g, 120, 'rgba(0,0,0,0.10)'); speck(g, 60, 'rgba(255,220,190,0.06)');
  });

  FLOOR.panel = cnv(g => {                            // riveted tech panel
    g.fillStyle = '#3b4048'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#454b54'; g.fillRect(4, 4, 56, 56);
    bevel(g, 4, 4, 56, 56, 'rgba(255,255,255,0.10)', 'rgba(0,0,0,0.45)');
    g.fillStyle = '#2a2e34'; g.fillRect(30, 4, 4, 56); g.fillRect(4, 30, 56, 4);   // seams
    g.fillStyle = '#5a6069'; [10, 54].forEach(x => [10, 54].forEach(y => { g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); }));
    g.fillStyle = '#8ad0e0'; g.fillRect(42, 44, 12, 3);                            // indicator
    speck(g, 50, 'rgba(0,0,0,0.15)');
  });

  FLOOR.tile = cnv(g => {                             // Havana colonial floor tile (worn talavera)
    vgrad(g, 0, 0, 64, 64, '#cbbb9c', '#b6a582');
    for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 4; tx++) {
      const x = tx * 16, y = ty * 16, warm = (tx + ty) & 1;
      g.fillStyle = warm ? '#cbb488' : '#b0855a'; g.fillRect(x + 1, y + 1, 14, 14);   // cream / terracotta
      g.fillStyle = warm ? '#a88a54' : '#98652f';                                     // diamond motif
      g.beginPath(); g.moveTo(x + 8, y + 3); g.lineTo(x + 13, y + 8); g.lineTo(x + 8, y + 13); g.lineTo(x + 3, y + 8); g.closePath(); g.fill();
      g.fillStyle = warm ? '#dccaa0' : '#cf9c68'; g.fillRect(x + 7, y + 7, 2, 2);
      bevel(g, x + 1, y + 1, 14, 14, 'rgba(255,248,230,0.30)', 'rgba(0,0,0,0.30)');
    }
    g.fillStyle = '#8a7658'; for (let i = 0; i <= 64; i += 16) { g.fillRect(i, 0, 1, 64); g.fillRect(0, i, 64, 1); }  // grout
    stains(g, 8, ['#6a5238', '#3a2c1e']); speck(g, 40, 'rgba(0,0,0,0.06)');
  });

  FLOOR.wood = cnv(g => {                             // warm hardwood planks
    const tones = ['#8a5e30', '#7a5228', '#966636', '#815a2e'];
    for (let i = 0; i < 4; i++) {
      const y = i * 16;
      vgrad(g, 0, y, 64, 16, tones[i], 'rgba(40,26,12,0.5)');
      g.globalAlpha = 0.55; g.fillStyle = tones[i]; g.fillRect(0, y, 64, 12); g.globalAlpha = 1;
      g.strokeStyle = 'rgba(60,38,18,0.5)'; g.lineWidth = 1;
      for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(0, y + 3 + k * 4); g.bezierCurveTo(20, y + 2 + k * 4, 44, y + 5 + k * 4, 64, y + 3 + k * 4); g.stroke(); }
      g.fillStyle = 'rgba(255,220,170,0.10)'; g.fillRect(0, y + 1, 64, 1);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y + 15, 64, 1);
      g.fillStyle = '#2a1c0e'; g.fillRect((i * 21 + 8) % 64, y, 2, 16);
    }
    speck(g, 50, 'rgba(255,220,180,0.05)');
  });

  FLOOR.marble = cnv(g => {                           // polished veined marble
    vgrad(g, 0, 0, 64, 64, '#e8e4dc', '#cec8bc');
    speck(g, 240, 'rgba(150,145,135,0.20)');
    g.strokeStyle = 'rgba(118,108,98,0.35)'; g.lineWidth = 1.5;
    for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(Math.random() * 64, 0); g.bezierCurveTo(Math.random() * 64, 22, Math.random() * 64, 42, Math.random() * 64, 64); g.stroke(); }
    g.strokeStyle = 'rgba(90,82,74,0.45)'; g.lineWidth = 0.7;
    for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(0, Math.random() * 64); g.bezierCurveTo(20, Math.random() * 64, 44, Math.random() * 64, 64, Math.random() * 64); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, 0, 64, 3);
    bevel(g, 0, 0, 64, 64, 'rgba(255,255,255,0.30)', 'rgba(0,0,0,0.18)');
  });

  FLOOR.concrete = cnv(g => {                         // poured concrete
    g.fillStyle = '#6b6d70'; g.fillRect(0, 0, 64, 64);
    speck(g, 260, 'rgba(0,0,0,0.10)'); speck(g, 120, 'rgba(255,255,255,0.06)');
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, 21); g.lineTo(64, 21); g.moveTo(0, 43); g.lineTo(64, 43); g.stroke();   // control joints
    g.beginPath(); g.moveTo(8, 21); g.lineTo(14, 43); g.stroke();
  });

  // ---- Havana pastel stucco facades ----
  function stuccoTex(streak, hi, lo) {
    return cnv(g => {
      vgrad(g, 0, 0, 64, 64, hi, lo);
      stains(g, 14, [streak, '#5a4a38', '#8a7a68']);                 // damp weather streaks
      for (let i = 0; i < 7; i++) { g.strokeStyle = 'rgba(0,0,0,0.10)'; g.lineWidth = 1; g.beginPath(); const cx = (Math.random() * 64) | 0; g.moveTo(cx, 0); g.bezierCurveTo(cx + 4, 20, cx - 3, 44, cx + 2, 64); g.stroke(); }   // hairline cracks
      speck(g, 90, 'rgba(0,0,0,0.05)'); speck(g, 50, 'rgba(255,255,255,0.06)');
      g.fillStyle = 'rgba(0,0,0,0.14)'; g.fillRect(0, 59, 64, 5);    // grimy base
    });
  }
  FLOOR.stucco = stuccoTex('#c9a85e', '#efd79a', '#d6bb78');         // ochre / yellow
  FLOOR.stuccob = stuccoTex('#6f9aa2', '#a9cdd4', '#7ba5ad');        // faded turquoise
  FLOOR.stuccop = stuccoTex('#c07a72', '#e6b0aa', '#c78882');        // coral / rose

  FLOOR.water = cnv(g => {                            // fountain water
    vgrad(g, 0, 0, 64, 64, '#2f6f8e', '#184c6a');
    g.strokeStyle = 'rgba(180,230,255,0.28)'; g.lineWidth = 1;
    for (let k = 0; k < 8; k++) { const y = 4 + k * 8; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 64; x += 8) g.lineTo(x, y + Math.sin(x * 0.4 + k) * 2); g.stroke(); }
    g.fillStyle = 'rgba(120,200,230,0.14)'; for (let i = 0; i < 10; i++) { g.beginPath(); g.arc((Math.random() * 64) | 0, (Math.random() * 64) | 0, 3 + Math.random() * 4, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,0.25)'; for (let i = 0; i < 34; i++) g.fillRect((Math.random() * 64) | 0, (Math.random() * 64) | 0, 2, 1);  // sparkle
  });

  FLOOR.cobble = cnv(g => {                           // worn cobblestone street
    g.fillStyle = '#453f38'; g.fillRect(0, 0, 64, 64);               // grout
    for (let ty = 0; ty < 5; ty++) for (let tx = 0; tx < 5; tx++) {
      const off = (ty % 2) * 6, x = tx * 13 + off - 4, y = ty * 13, r = 5 + Math.random() * 2;
      g.fillStyle = ['#7a746a', '#6a655c', '#847d72', '#5f5a52'][(tx + ty) % 4];
      g.beginPath(); g.ellipse(x + 6, y + 6, r, r * 0.85, Math.random(), 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.10)'; g.beginPath(); g.ellipse(x + 5, y + 5, r * 0.5, r * 0.4, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x + 7, y + 8, r * 0.6, r * 0.3, 0, 0, 7); g.fill();
    }
    speck(g, 80, 'rgba(0,0,0,0.12)');
  });

  FLOOR.rattan = cnv(g => {                           // woven wicker/cane lounge furniture
    vgrad(g, 0, 0, 64, 64, '#c69a5c', '#a97c3e');
    g.strokeStyle = 'rgba(90,58,20,0.55)'; g.lineWidth = 3;
    for (let x = -8; x < 72; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 20, 64); g.stroke(); }
    g.strokeStyle = 'rgba(255,222,170,0.30)'; g.lineWidth = 1;
    for (let x = -8; x < 72; x += 8) { g.beginPath(); g.moveTo(x + 1, 0); g.lineTo(x + 21, 64); g.stroke(); }
    g.strokeStyle = 'rgba(60,36,10,0.45)'; g.lineWidth = 3;
    for (let x = -8; x < 72; x += 8) { g.beginPath(); g.moveTo(x, 64); g.lineTo(x + 20, 0); g.stroke(); }
    g.strokeStyle = 'rgba(255,222,170,0.20)'; g.lineWidth = 1;
    for (let x = -8; x < 72; x += 8) { g.beginPath(); g.moveTo(x - 1, 64); g.lineTo(x + 19, 0); g.stroke(); }
    stains(g, 6, ['#7a5228', '#5a3a18']); speck(g, 60, 'rgba(0,0,0,0.08)');
    bevel(g, 0, 0, 64, 64, 'rgba(255,238,200,0.15)', 'rgba(0,0,0,0.25)');
  });

  FLOOR.azulejo = cnv(g => {                          // blue & white Spanish-colonial tile
    vgrad(g, 0, 0, 64, 64, '#eef2f0', '#dbe3e0');
    for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) {
      const x = tx * 32, y = ty * 32;
      g.fillStyle = '#f4f7f5'; g.fillRect(x + 1, y + 1, 30, 30);
      g.strokeStyle = '#2a5f8a'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(x + 16, y + 4); g.lineTo(x + 28, y + 16); g.lineTo(x + 16, y + 28); g.lineTo(x + 4, y + 16); g.closePath(); g.stroke();
      g.strokeStyle = '#3f7aa8'; g.lineWidth = 1;
      g.beginPath(); g.arc(x + 16, y + 16, 6, 0, 7); g.stroke();
      g.fillStyle = '#2a5f8a'; g.beginPath(); g.arc(x + 16, y + 16, 2, 0, 7); g.fill();
      g.strokeStyle = 'rgba(42,95,138,0.5)'; g.lineWidth = 1;
      [[x + 16, y + 4], [x + 28, y + 16], [x + 16, y + 28], [x + 4, y + 16]].forEach(([cx, cy]) => { g.beginPath(); g.arc(cx, cy, 2.5, 0, 7); g.stroke(); });
      bevel(g, x + 1, y + 1, 30, 30, 'rgba(255,255,255,0.4)', 'rgba(0,0,0,0.12)');
    }
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 31, 64, 2); g.fillRect(31, 0, 2, 64);   // grout lines
    speck(g, 20, 'rgba(0,0,0,0.05)');
  });

  FLOOR.cork = cnv(g => {                             // spy-den corkboard, pinned with a thread
    vgrad(g, 0, 0, 64, 64, '#c9a06a', '#a97e4a');
    speck(g, 260, 'rgba(90,58,24,0.18)'); speck(g, 120, 'rgba(230,190,140,0.15)');
    stains(g, 10, ['#8a6034', '#b8894e']);
    g.strokeStyle = 'rgba(180,20,20,0.55)'; g.lineWidth = 1;                  // a taut red thread, tacked
    g.beginPath(); g.moveTo(10, 12); g.lineTo(48, 40); g.lineTo(18, 52); g.stroke();
    g.fillStyle = '#8a1414';
    [[10, 12], [48, 40], [18, 52]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.arc(x - 0.6, y - 0.6, 0.7, 0, 7); g.fill(); g.fillStyle = '#8a1414'; });
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(38, 6, 16, 12);          // a pinned scrap of paper
    g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 1; g.strokeRect(38, 6, 16, 12);
    g.strokeStyle = 'rgba(0,0,0,0.35)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(40, 10 + i * 3); g.lineTo(52, 10 + i * 3); g.stroke(); }
    bevel(g, 0, 0, 64, 64, 'rgba(255,238,200,0.10)', 'rgba(0,0,0,0.3)');
  });

  FLOOR.corrugated = cnv(g => {                       // corrugated tin roofing / dockside siding
    vgrad(g, 0, 0, 64, 64, '#aab0b6', '#787f86');
    for (let x = 0; x < 64; x += 6) {
      g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(x, 0, 2, 64);
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x + 3, 0, 2, 64);
    }
    g.fillStyle = 'rgba(120,70,40,0.18)'; for (let i = 0; i < 5; i++) { const x = (Math.random() * 64) | 0; g.fillRect(x, 0, 3, 64); }  // rust streaks
    speck(g, 90, 'rgba(90,50,20,0.10)'); speck(g, 60, 'rgba(255,255,255,0.08)');
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 20, 64, 1); g.fillRect(0, 44, 64, 1);   // rivet seams
    g.fillStyle = 'rgba(255,255,255,0.15)'; for (let x = 4; x < 64; x += 8) { g.fillRect(x, 19, 1, 1); g.fillRect(x, 43, 1, 1); }
    bevel(g, 0, 0, 64, 64, 'rgba(255,255,255,0.15)', 'rgba(0,0,0,0.3)');
  });

  FLOOR.awning = cnv(g => {                           // red & white striped storefront canvas
    for (let x = 0; x < 64; x += 8) {
      vgrad(g, x, 0, 8, 64, x / 8 % 2 ? '#c23a34' : '#eee6d8', x / 8 % 2 ? '#8e241f' : '#cabe9e');
    }
    g.strokeStyle = 'rgba(0,0,0,0.10)'; g.lineWidth = 1;
    for (let y = 4; y < 64; y += 5) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y); g.stroke(); }   // canvas weave
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, 0, 64, 2);
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 60, 64, 4);              // hemmed shadowed edge
    stains(g, 5, ['#6a4a30', '#4a3a2a']); speck(g, 30, 'rgba(0,0,0,0.06)');
  });

  FLOOR.limestone = cnv(g => {                        // pale coastal fortress stone (El Morro coquina)
    vgrad(g, 0, 0, 64, 64, '#d8cdb4', '#bcae8e');
    speck(g, 300, 'rgba(140,120,90,0.14)'); speck(g, 90, 'rgba(255,250,235,0.20)');
    g.strokeStyle = 'rgba(120,104,76,0.30)'; g.lineWidth = 1;
    for (let y = 8; y < 64; y += 11) { g.beginPath(); g.moveTo(0, y + Math.sin(y) * 2); g.lineTo(64, y + Math.cos(y) * 2); g.stroke(); }  // bedding lines
    for (let i = 0; i < 20; i++) { g.fillStyle = 'rgba(150,130,98,0.25)'; g.beginPath(); g.ellipse((Math.random() * 64) | 0, (Math.random() * 64) | 0, 1.5 + Math.random() * 1.5, 1 + Math.random(), 0, 0, 7); g.fill(); }  // shell fossils
    bevel(g, 0, 0, 64, 64, 'rgba(255,250,235,0.25)', 'rgba(0,0,0,0.18)');
  });

  FLOOR.terrazzo = cnv(g => {                          // Cuban terrazzo: cement base flecked with stone chips
    vgrad(g, 0, 0, 64, 64, '#d6cfc0', '#b8ae98');
    for (let i = 0; i < 140; i++) {
      const x = (Math.random() * 64) | 0, y = (Math.random() * 64) | 0, r = 1 + Math.random() * 2.4;
      g.fillStyle = ['#8a2e24', '#2a5f4a', '#c9a227', '#3a3d44', '#e8e2ce'][(Math.random() * 5) | 0];
      g.beginPath(); g.ellipse(x, y, r, r * 0.8, Math.random() * 3, 0, 7); g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,0.18)'; speck(g, 60, 'rgba(255,255,255,0.15)');
    g.strokeStyle = 'rgba(0,0,0,0.10)'; g.lineWidth = 1;                     // expansion-joint grid
    g.beginPath(); g.moveTo(0, 32); g.lineTo(64, 32); g.moveTo(32, 0); g.lineTo(32, 64); g.stroke();
    bevel(g, 0, 0, 64, 64, 'rgba(255,255,255,0.22)', 'rgba(0,0,0,0.16)');
  });

  FLOOR.rooftile = cnv(g => {                          // terracotta barrel roof tile, seen from above
    vgrad(g, 0, 0, 64, 64, '#c67a44', '#8f4a24');
    for (let x = -4; x < 64; x += 12) {
      const rg = g.createLinearGradient(x, 0, x + 12, 0);
      rg.addColorStop(0, '#7a3d1c'); rg.addColorStop(0.35, '#d38a4e'); rg.addColorStop(0.6, '#e8a868'); rg.addColorStop(1, '#7a3d1c');
      g.fillStyle = rg; g.beginPath(); g.ellipse(x + 6, 0, 6, 64, 0, 0, Math.PI, false); g.fill();
      g.beginPath(); g.ellipse(x + 6, 64, 6, 64, Math.PI, 0, Math.PI, false); g.fill();
    }
    g.fillStyle = 'rgba(0,0,0,0.15)'; for (let x = 0; x < 64; x += 12) g.fillRect(x, 0, 1.5, 64);
    stains(g, 8, ['#5a3018', '#2e4a2a']); speck(g, 70, 'rgba(0,0,0,0.1)');
    bevel(g, 0, 0, 64, 64, 'rgba(255,220,170,0.15)', 'rgba(0,0,0,0.3)');
  });

  FLOOR.mural = cnv(g => {                             // faded revolutionary-era propaganda mural, sun-bleached
    vgrad(g, 0, 0, 64, 64, '#c94a3a', '#8f2e22');
    g.fillStyle = 'rgba(20,20,20,0.85)';                                    // a silhouetted five-point star
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a2 = -Math.PI / 2 + i * (Math.PI / 5), r = i % 2 === 0 ? 14 : 5.6;
      const px = 32 + Math.cos(a2) * r, py = 20 + Math.sin(a2) * r;
      i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.closePath(); g.fill();
    g.fillStyle = 'rgba(240,230,210,0.9)'; g.font = 'bold 9px monospace'; g.textAlign = 'center';
    g.fillText('VENCEREMOS', 32, 48);
    g.fillStyle = 'rgba(255,255,255,0.08)'; speck(g, 200, 'rgba(255,255,255,0.06)');   // sun-bleaching + plaster wear
    stains(g, 14, ['#5a1a12', '#c94a3a', '#3a2018']);
    g.fillStyle = 'rgba(0,0,0,0.15)'; for (let i = 0; i < 6; i++) { const x = (Math.random() * 64) | 0; g.fillRect(x, 0, 1, 64); }   // hairline cracks
    bevel(g, 0, 0, 64, 64, 'rgba(255,255,255,0.1)', 'rgba(0,0,0,0.3)');
  });

  FLOOR.sandbag = cnv(g => {                           // stacked burlap sandbag wall (lair fortification)
    vgrad(g, 0, 0, 64, 64, '#a68f5c', '#7a6640');
    for (let row = 0; row < 4; row++) {
      const y = row * 16, off = (row % 2) * 10;
      for (let x = -10; x < 64; x += 20) {
        const bg2 = g.createLinearGradient(x + off, y, x + off + 20, y + 16);
        bg2.addColorStop(0, '#b8a06c'); bg2.addColorStop(0.5, '#9a8354'); bg2.addColorStop(1, '#6e5c38');
        g.fillStyle = bg2;
        g.beginPath(); g.ellipse(x + off + 10, y + 8, 11, 7.4, 0, 0, 7); g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1; g.beginPath(); g.ellipse(x + off + 10, y + 8, 11, 7.4, 0, 0, 7); g.stroke();
        g.strokeStyle = 'rgba(255,240,200,0.15)'; g.lineWidth = 0.6;          // burlap weave hint
        for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(x + off + 10 + i * 3, y + 2); g.lineTo(x + off + 10 + i * 3, y + 14); g.stroke(); }
      }
      g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(0, y + 14, 64, 2);
    }
    speck(g, 80, 'rgba(60,48,24,0.12)'); speck(g, 40, 'rgba(255,240,200,0.08)');
    bevel(g, 0, 0, 64, 64, 'rgba(255,240,200,0.1)', 'rgba(0,0,0,0.35)');
  });

  FLOOR.rope = cnv(g => {                              // dockside coiled-rope matting
    vgrad(g, 0, 0, 64, 64, '#c9a86a', '#a3824a');
    const cx = 32, cy = 32;
    for (let r = 4; r < 30; r += 5) {
      g.strokeStyle = 'rgba(90,64,28,0.5)'; g.lineWidth = 4;
      g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke();
      g.strokeStyle = 'rgba(255,232,180,0.28)'; g.lineWidth = 1.4;
      g.beginPath(); g.arc(cx, cy, r + 1.2, 0, 7); g.stroke();
      g.strokeStyle = 'rgba(60,40,16,0.3)'; g.lineWidth = 1;
      g.beginPath(); g.arc(cx, cy, r - 1.2, 0, 7); g.stroke();
    }
    speck(g, 60, 'rgba(60,40,16,0.12)'); stains(g, 5, ['#5a3a18', '#7a5228']);
    bevel(g, 0, 0, 64, 64, 'rgba(255,232,180,0.15)', 'rgba(0,0,0,0.25)');
  });

  // ---- parallax sky (wide; sampled by view angle): warm Havana afternoon ----
  const SKY = cnv(g => {
    const grd = g.createLinearGradient(0, 0, 0, 96);
    grd.addColorStop(0, '#3f7fb8'); grd.addColorStop(0.5, '#8fb8d6'); grd.addColorStop(0.78, '#f0d0a0'); grd.addColorStop(1, '#e8a86a');
    g.fillStyle = grd; g.fillRect(0, 0, 256, 96);
    g.fillStyle = 'rgba(255,246,214,0.95)';           // low tropical sun
    g.beginPath(); g.arc(48, 40, 13, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.28)';           // fat cumulus clouds
    [[110, 22, 24], [175, 30, 30], [228, 18, 20], [26, 30, 18]].forEach(([x, y, r]) => {
      g.beginPath(); g.arc(x, y, r, 0, 7); g.arc(x + r, y + 4, r * 0.7, 0, 7); g.arc(x - r, y + 5, r * 0.6, 0, 7); g.fill();
    });
    // the sea, and a low Havana skyline / Morro along the horizon
    g.fillStyle = '#4a7fa0'; g.fillRect(0, 78, 256, 18);
    g.fillStyle = 'rgba(255,255,255,0.15)'; for (let i = 0; i < 60; i++) g.fillRect((Math.random() * 256) | 0, 79 + ((Math.random() * 15) | 0), 2, 1);
    g.fillStyle = '#caa878';
    for (let x = 0; x <= 256; x += 8) { const h = 70 + ((x * 7) % 11) - (x % 40 === 0 ? 9 : 0); g.fillRect(x, h, 8, 78 - h); }
    g.fillStyle = '#7a5a38'; g.fillRect(120, 60, 6, 18); g.fillRect(118, 56, 10, 5);   // a distant tower (El Morro-ish)
  }, 256, 96);

  // ---- unified texture registry (name → canvas): walls + all surfaces ----
  // Every texture is assignable to any floor, ceiling, or wall in the editor.
  const TX = Object.assign({
    teak: TEX[T.TEAK], lair: TEX[T.LAIR], radio: TEX[T.RADIO],
    blast: TEX[T.EXIT], mainframe: TEX[T.MAINFRAME], poster: TEX[T.POSTER],
  }, FLOOR);
  // realism pass: fine per-texel grain over every texture — flat vector fills
  // read as plastic; a whisper of noise reads as material. Water stays clean.
  for (const n of Object.keys(TX)) {
    if (n === 'water') continue;
    const c = TX[n], gt = c.getContext('2d');
    speck(gt, 80, 'rgba(0,0,0,0.05)', c.width, c.height);
    speck(gt, 55, 'rgba(255,246,220,0.04)', c.width, c.height);
  }
  // ordered list the editor shows as a palette
  const TXNAMES = ['lair', 'teak', 'brick', 'stucco', 'stuccob', 'stuccop', 'panel', 'tile',
    'cobble', 'wood', 'marble', 'concrete', 'water', 'metal', 'vent', 'carpet', 'lounge',
    'ceiltile', 'ground', 'helipad', 'rattan', 'azulejo', 'cork', 'corrugated', 'awning', 'limestone',
    'terrazzo', 'rooftile', 'mural', 'sandbag', 'rope',
    'radio', 'blast', 'mainframe', 'poster'];
  const WALLTX = { 1: 'teak', 2: 'lair', 3: 'blast', 4: 'radio', 5: 'mainframe', 6: 'poster' };
  const wallTexName = (x, y) => {
    const i = Math.floor(y) * MW + Math.floor(x);
    return (stexg && stexg[i]) || WALLTX[get(x, y)] || 'lair';
  };
  const wallTex = (x, y) => TX[wallTexName(x, y)] || TX.lair;

  // ---- sprites ----
  function whiteOf(src) {
    return cnv(g => {
      g.drawImage(src, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64);
    });
  }
  // a generic "destroyed" look for plain props that have no hand-drawn corpse:
  // darken/char the whole silhouette, then scatter soot flecks over it. Keeps
  // the original shape readable (still clearly "the same thing, wrecked") without
  // needing bespoke broken-object art for every prop kind.
  function charredOf(src) {
    return cnv(g => {
      g.drawImage(src, 0, 0);
      g.globalCompositeOperation = 'multiply';
      g.fillStyle = '#4a3226'; g.fillRect(0, 0, 64, 64);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(10,6,4,0.5)'; g.fillRect(0, 0, 64, 64);
      speck(g, 40, 'rgba(0,0,0,0.4)'); speck(g, 14, 'rgba(255,140,60,0.3)');
      g.globalCompositeOperation = 'source-over';
    });
  }
  const CHARRED = {};                        // lazy per-kind cache for charredOf(SPR[kind])
  function charredTex(kind) {
    if (!CHARRED[kind]) CHARRED[kind] = charredOf(SPR[kind]);
    return CHARRED[kind];
  }
  // draw with a crisp 1px dark outline so the sprite reads against any texture
  function outlined(drawFn, w = 64, h = 64) {
    const base = cnv(drawFn, w, h);
    const sil = cnv(gg => { gg.drawImage(base, 0, 0); gg.globalCompositeOperation = 'source-in'; gg.fillStyle = '#100c0a'; gg.fillRect(0, 0, w, h); }, w, h);
    return cnv(g => {
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) g.drawImage(sil, dx, dy);
      g.drawImage(base, 0, 0);
    }, w, h);
  }

  const SPR = {};

  // Realistic human proportions at 64px: head ≈ 1/5 of the figure (Doom-sprite
  // ratio), tapered torso, jointed limbs, one consistent upper-left key light.
  SPR.goon = outlined(g => {
    g.fillStyle = 'rgba(0,0,0,0.32)'; g.beginPath(); g.ellipse(32, 62, 13, 3, 0, 0, 7); g.fill();
    // ---- legs: grey fatigues, creased, tucked into leather boots ----
    let lg = g.createLinearGradient(24, 0, 40, 0);
    lg.addColorStop(0, '#42454e'); lg.addColorStop(0.55, '#31333b'); lg.addColorStop(1, '#202228');
    g.fillStyle = lg;
    g.beginPath(); g.moveTo(26, 39); g.lineTo(31.5, 39); g.lineTo(30.5, 57); g.lineTo(25.5, 57); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(32.5, 39); g.lineTo(38, 39); g.lineTo(38.5, 57); g.lineTo(33.5, 57); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.09)'; g.fillRect(27, 40, 1, 16); g.fillRect(34, 40, 1, 16);
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(26.5, 47); g.lineTo(30.5, 47.5); g.stroke();       // knee folds
    g.beginPath(); g.moveTo(34, 48); g.lineTo(38, 47.5); g.stroke();
    let btg = g.createLinearGradient(0, 55, 0, 63);
    btg.addColorStop(0, '#2c2620'); btg.addColorStop(1, '#0d0b09');
    g.fillStyle = btg; g.fillRect(24.5, 55, 7, 8); g.fillRect(33, 55, 7, 8);
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(25, 55.5, 6, 1); g.fillRect(33.5, 55.5, 6, 1);
    g.fillStyle = '#000'; g.fillRect(24, 61.5, 8, 1.5); g.fillRect(33, 61.5, 8, 1.5);   // soles
    // ---- torso: tailored jumpsuit, shoulders tapering to the waist ----
    let tg = g.createLinearGradient(20, 18, 44, 40);
    tg.addColorStop(0, '#ef9a52'); tg.addColorStop(0.4, '#cd6a28'); tg.addColorStop(1, '#7e3b12');
    g.fillStyle = tg;
    g.beginPath();
    g.moveTo(22, 21); g.quadraticCurveTo(32, 17.5, 42, 21);                    // shoulder line
    g.lineTo(41, 34); g.quadraticCurveTo(40.5, 38, 39, 40);                    // right taper
    g.lineTo(25, 40); g.quadraticCurveTo(23.5, 38, 23, 34);                    // left taper
    g.closePath(); g.fill();
    g.fillStyle = 'rgba(40,12,0,0.30)';                                        // core shadow, right side
    g.beginPath(); g.moveTo(38, 21); g.quadraticCurveTo(41.5, 30, 39, 40); g.lineTo(35, 40); g.quadraticCurveTo(37, 30, 35.5, 21.5); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,220,170,0.18)';                                    // chest highlight
    g.beginPath(); g.ellipse(27.5, 26, 3.5, 6, 0.2, 0, 7); g.fill();
    g.strokeStyle = 'rgba(60,20,0,0.35)'; g.lineWidth = 1;                     // fabric folds
    g.beginPath(); g.moveTo(25, 31); g.quadraticCurveTo(29, 32.5, 31, 31.5); g.stroke();
    g.beginPath(); g.moveTo(33, 35); g.quadraticCurveTo(36, 36, 38.5, 34.5); g.stroke();
    g.fillStyle = '#8a4414'; g.fillRect(31.4, 19, 1.4, 20);                    // zip
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(31.4, 19, 0.6, 20);
    g.strokeStyle = '#8a4414'; g.lineWidth = 1.2;                              // collar
    g.beginPath(); g.moveTo(28, 19.5); g.lineTo(32, 22); g.lineTo(36, 19.5); g.stroke();
    let beltg = g.createLinearGradient(0, 39, 0, 43);
    beltg.addColorStop(0, '#2b2119'); beltg.addColorStop(1, '#120d09');
    g.fillStyle = beltg; g.fillRect(23.5, 39, 17, 4);
    g.fillStyle = '#d9b45a'; g.fillRect(30.5, 39.5, 3, 3);
    g.fillStyle = '#fff2c0'; g.fillRect(30.5, 39.5, 3, 1);
    g.fillStyle = '#1c1610'; g.fillRect(25, 39.7, 3, 2.8); g.fillRect(36, 39.7, 3, 2.8);   // belt pouches
    // ---- arms: bent at the elbow, cradling the SMG ----
    g.strokeStyle = '#b3571e'; g.lineWidth = 4.6; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(23, 22.5); g.lineTo(20.5, 30); g.lineTo(26, 35.5); g.stroke();  // lit arm
    g.strokeStyle = '#93430f';
    g.beginPath(); g.moveTo(41, 22.5); g.lineTo(43.5, 30); g.lineTo(37, 34.5); g.stroke();  // shadow arm
    g.strokeStyle = 'rgba(255,220,170,0.25)'; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(22.5, 23); g.lineTo(20.8, 29.5); g.stroke();
    // ---- SMG across the chest ----
    let gg = g.createLinearGradient(0, 31, 0, 38);
    gg.addColorStop(0, '#43464e'); gg.addColorStop(0.5, '#25272d'); gg.addColorStop(1, '#101115');
    g.save(); g.translate(32, 34.5); g.rotate(-0.12);
    g.fillStyle = gg; g.fillRect(-11, -2.2, 22, 4.4);
    g.fillStyle = '#0a0b0d'; g.fillRect(-15, -1.4, 5, 2.2);                    // barrel
    g.fillStyle = '#2e3138'; g.fillRect(-2, 2, 3.4, 6);                        // magazine
    g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(-11, -2.2, 22, 1);
    g.fillStyle = '#3a2c1a'; g.fillRect(6, -1.6, 5, 3.2);                      // wood stock
    g.restore();
    g.fillStyle = '#c08a5e'; g.beginPath(); g.arc(26.5, 36, 2.4, 0, 7); g.fill();   // hands
    g.fillStyle = '#8f5f3c'; g.beginPath(); g.arc(37, 34.5, 2.3, 0, 7); g.fill();
    // ---- neck + head ----
    g.fillStyle = '#a8724a'; g.fillRect(29.5, 14.5, 5, 4);                     // neck, jaw shadow over it
    let sk = g.createRadialGradient(29.5, 9, 1.5, 32, 11, 7);
    sk.addColorStop(0, '#e8b98a'); sk.addColorStop(0.65, '#c08a5e'); sk.addColorStop(1, '#8f5f3c');
    g.fillStyle = sk; g.beginPath(); g.ellipse(32, 11, 5, 5.6, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(90,50,25,0.35)';                                       // jaw shading
    g.beginPath(); g.ellipse(33.5, 13.5, 3.4, 2.2, -0.15, 0, 7); g.fill();
    g.fillStyle = '#b37a4e'; g.beginPath(); g.ellipse(37, 11.5, 1.1, 1.7, 0, 0, 7); g.fill();   // ear
    g.fillStyle = '#0c0d10';                                                   // aviators: two lenses + bridge + temples
    g.fillRect(27.2, 9, 4.4, 3.2); g.fillRect(32.6, 9, 4.4, 3.2);
    g.fillRect(31.4, 9.8, 1.4, 1); g.fillRect(26.4, 9.6, 1, 1); g.fillRect(36.8, 9.6, 1, 1);
    let lz = g.createLinearGradient(27, 9, 30, 12);
    lz.addColorStop(0, 'rgba(160,200,235,0.7)'); lz.addColorStop(1, 'rgba(25,30,40,0.2)');
    g.fillStyle = lz; g.fillRect(27.6, 9.3, 3.5, 2.4);
    let lz2 = g.createLinearGradient(33, 9, 36, 12);
    lz2.addColorStop(0, 'rgba(160,200,235,0.55)'); lz2.addColorStop(1, 'rgba(25,30,40,0.2)');
    g.fillStyle = lz2; g.fillRect(33, 9.3, 3.5, 2.4);
    g.fillStyle = 'rgba(90,50,25,0.5)'; g.fillRect(31.5, 12.2, 1.6, 1.6);      // nose shadow
    g.fillStyle = '#5e3a24'; g.fillRect(30, 15, 4.4, 1.1);                     // set mouth
    g.fillStyle = 'rgba(60,40,25,0.22)';                                       // stubble
    g.beginPath(); g.ellipse(32, 14.8, 3.6, 2.4, 0, 0, 7); g.fill();
    // ---- beret pulled to one side, band hugging the brow ----
    let brg = g.createLinearGradient(24, 4, 40, 9);
    brg.addColorStop(0, '#3f5433'); brg.addColorStop(0.6, '#2a3a20'); brg.addColorStop(1, '#141f0e');
    g.fillStyle = brg;
    g.beginPath(); g.ellipse(31.5, 6.7, 8.4, 3.6, -0.14, 0, 7); g.fill();
    g.beginPath(); g.moveTo(24, 8); g.quadraticCurveTo(32, 11, 40, 7.4); g.lineTo(39.6, 6); g.quadraticCurveTo(32, 9, 24.4, 6.4); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.13)';
    g.beginPath(); g.ellipse(28.5, 5.4, 4.4, 1.8, -0.14, 0, 7); g.fill();
    g.fillStyle = '#d9b45a'; g.fillRect(36.4, 5.6, 2.4, 2.4);                  // badge
    g.fillStyle = '#fff2c0'; g.fillRect(36.4, 5.6, 1, 1);
  });
  SPR.goonFlash = whiteOf(SPR.goon);

  SPR.corpse = outlined(g => {
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(31, 58.5, 24, 5, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(96,16,10,0.55)'; g.beginPath(); g.ellipse(15, 58, 8.5, 3.4, 0.15, 0, 7); g.fill();   // pooled blood
    g.fillStyle = 'rgba(140,24,14,0.4)'; g.beginPath(); g.ellipse(13, 57, 5, 2, 0.15, 0, 7); g.fill();
    // legs, one kicked out straight and one folded under
    let lg = g.createLinearGradient(0, 50, 0, 60);
    lg.addColorStop(0, '#3b3e46'); lg.addColorStop(1, '#1d1f24');
    g.fillStyle = lg;
    g.beginPath(); g.moveTo(38, 53); g.lineTo(56, 50.5); g.lineTo(56.5, 54); g.lineTo(38.5, 56.5); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(38, 56); g.lineTo(52, 56); g.lineTo(52, 59.5); g.lineTo(38, 59.5); g.closePath(); g.fill();
    g.fillStyle = '#15110d'; g.fillRect(55, 49.5, 6, 5); g.fillRect(51.5, 55.5, 6, 4.6);   // boots
    // torso on its side
    let tg = g.createLinearGradient(18, 48, 42, 60);
    tg.addColorStop(0, '#e08a44'); tg.addColorStop(0.5, '#b85a20'); tg.addColorStop(1, '#6e3410');
    g.fillStyle = tg; g.beginPath(); g.ellipse(29, 55, 12, 5.4, -0.08, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,230,190,0.16)'; g.beginPath(); g.ellipse(26, 52.8, 7.5, 2.4, -0.08, 0, 7); g.fill();
    g.strokeStyle = 'rgba(60,20,0,0.4)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(24, 55); g.quadraticCurveTo(29, 56.5, 34, 55.6); g.stroke();
    g.fillStyle = '#191410'; g.fillRect(35, 52.4, 3.4, 6.4);                   // belt, seen side-on
    g.fillStyle = '#d9b45a'; g.fillRect(35.8, 54.6, 1.8, 1.8);
    g.strokeStyle = '#a54e18'; g.lineWidth = 4; g.lineCap = 'round';           // limp arm
    g.beginPath(); g.moveTo(26, 55); g.lineTo(20, 60.5); g.stroke();
    g.fillStyle = '#c08a5e'; g.beginPath(); g.arc(18.6, 61, 2.1, 0, 7); g.fill();
    // head, cheek to the stone
    let sk = g.createRadialGradient(12, 53.4, 1, 13.5, 54.5, 5.6);
    sk.addColorStop(0, '#e0b184'); sk.addColorStop(0.7, '#bd8657'); sk.addColorStop(1, '#8a5a36');
    g.fillStyle = sk; g.beginPath(); g.ellipse(13.5, 54.8, 5, 4.6, 0.2, 0, 7); g.fill();
    g.fillStyle = '#0c0d10'; g.fillRect(9.4, 52.6, 8.4, 2);                    // shades, knocked askew
    g.fillStyle = 'rgba(160,200,235,0.4)'; g.fillRect(10.2, 53, 2.6, 1.2);
    g.fillStyle = '#5e3a24'; g.fillRect(11, 57.4, 3.6, 1);
    // fallen beret
    let brg = g.createLinearGradient(42, 58, 54, 63);
    brg.addColorStop(0, '#37482c'); brg.addColorStop(1, '#16200f');
    g.fillStyle = brg; g.beginPath(); g.ellipse(47.5, 61, 6.4, 2.6, 0.28, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.1)'; g.beginPath(); g.ellipse(45.8, 60.2, 3.4, 1.2, 0.28, 0, 7); g.fill();
    g.fillStyle = '#d9b45a'; g.fillRect(50.4, 60, 1.6, 1.6);
  });

  // ---- BRUTE: a heavier, slower enforcer — dark singlet, thick arms, no gun ----
  SPR.brute = outlined(g => {
    g.fillStyle = 'rgba(0,0,0,0.34)'; g.beginPath(); g.ellipse(32, 63, 17, 3.6, 0, 0, 7); g.fill();
    let lg = g.createLinearGradient(22, 0, 42, 0);
    lg.addColorStop(0, '#4a4038'); lg.addColorStop(0.55, '#332b24'); lg.addColorStop(1, '#1e1913');
    g.fillStyle = lg;
    g.beginPath(); g.moveTo(24, 40); g.lineTo(31, 40); g.lineTo(30, 58); g.lineTo(23, 58); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(33, 40); g.lineTo(40, 40); g.lineTo(41, 58); g.lineTo(34, 58); g.closePath(); g.fill();
    g.fillStyle = '#0c0d0a'; g.fillRect(21, 57, 10, 5); g.fillRect(32, 57, 10, 5);   // heavy boots
    // barrel torso, no sleeves — bare bulky arms
    let tg = g.createLinearGradient(16, 18, 48, 42);
    tg.addColorStop(0, '#7a6a54'); tg.addColorStop(0.45, '#524638'); tg.addColorStop(1, '#2c2419');
    g.fillStyle = tg;
    g.beginPath(); g.moveTo(18, 24); g.quadraticCurveTo(32, 17, 46, 24); g.lineTo(45, 40); g.quadraticCurveTo(32, 44, 19, 40); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(38, 30, 8, 13, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,235,200,0.16)'; g.beginPath(); g.ellipse(23, 26, 4, 10, 0, 0, 7); g.fill();
    g.fillStyle = '#16130e'; g.fillRect(17, 39, 30, 5);                              // belt
    g.fillStyle = '#8a1414'; g.fillRect(29, 39.6, 6, 3.8);                            // red star buckle
    g.strokeStyle = '#8a7358'; g.lineWidth = 8; g.lineCap = 'round';                  // huge bare arms
    g.beginPath(); g.moveTo(17, 22); g.lineTo(11, 38); g.stroke();
    g.beginPath(); g.moveTo(47, 22); g.lineTo(53, 38); g.stroke();
    g.strokeStyle = 'rgba(255,235,200,0.2)'; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(15, 24); g.lineTo(11, 36); g.stroke();
    g.fillStyle = '#c99a68'; g.beginPath(); g.arc(10, 39, 4.4, 0, 7); g.fill();       // ham fists
    g.fillStyle = '#9c7248'; g.beginPath(); g.arc(54, 39, 4.4, 0, 7); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(6, 37, 8, 2); g.fillRect(50, 37, 8, 2);   // knuckle wraps
    // thick neck + bald, scarred head
    g.fillStyle = '#a8724a'; g.fillRect(27, 12, 10, 6);
    let sk = g.createRadialGradient(28, 10, 1.5, 32, 12, 9);
    sk.addColorStop(0, '#dba878'); sk.addColorStop(0.65, '#b07a4e'); sk.addColorStop(1, '#7a4e2c');
    g.fillStyle = sk; g.beginPath(); g.ellipse(32, 12, 8.6, 8, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(90,50,25,0.35)'; g.beginPath(); g.ellipse(35, 15, 5, 3.4, -0.1, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1;                        // a scar
    g.beginPath(); g.moveTo(24, 8); g.lineTo(27, 15); g.stroke();
    g.fillStyle = '#1a1610'; g.fillRect(23, 8, 18, 3.4);                              // heavy brow / squint
    g.fillStyle = '#3a281a'; g.fillRect(27, 16.6, 9, 1.6);                            // grim underbite mouth
    speck(g, 24, 'rgba(0,0,0,0.06)');
  });
  SPR.bruteFlash = whiteOf(SPR.brute);

  SPR.bruteCorpse = outlined(g => {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 58, 26, 5.4, 0, 0, 7); g.fill();
    let tg = g.createLinearGradient(8, 48, 52, 62);
    tg.addColorStop(0, '#7a6a54'); tg.addColorStop(0.5, '#524638'); tg.addColorStop(1, '#2c2419');
    g.fillStyle = tg; g.beginPath(); g.ellipse(30, 56, 22, 6.6, -0.05, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,235,200,0.14)'; g.beginPath(); g.ellipse(24, 53, 13, 3, -0.05, 0, 7); g.fill();
    g.fillStyle = '#16130e'; g.fillRect(20, 55, 24, 4);
    g.strokeStyle = '#8a7358'; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(24, 54); g.lineTo(14, 60); g.stroke();
    g.fillStyle = '#c99a68'; g.beginPath(); g.arc(12.4, 60.6, 3.6, 0, 7); g.fill();
    let sk = g.createRadialGradient(11, 51.4, 1, 12.5, 52.5, 6.6);
    sk.addColorStop(0, '#dba878'); sk.addColorStop(0.65, '#b07a4e'); sk.addColorStop(1, '#7a4e2c');
    g.fillStyle = sk; g.beginPath(); g.ellipse(12.5, 52.8, 6.4, 5.6, 0.15, 0, 7); g.fill();
    g.fillStyle = 'rgba(90,50,25,0.35)'; g.beginPath(); g.ellipse(14.6, 55, 3.6, 2.4, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(20,10,10,0.4)'; g.beginPath(); g.ellipse(5, 55, 6, 3, 0.2, 0, 7); g.fill();
  });

  // ---- SNIPER: leaner marksman, wide-brim hat, olive fatigues, a rifle at the ready ----
  SPR.sniper = outlined(g => {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 62, 13, 3.2, 0, 0, 7); g.fill();
    let lg = g.createLinearGradient(0, 50, 0, 63);
    lg.addColorStop(0, '#3e4632'); lg.addColorStop(1, '#20261a');
    g.fillStyle = lg; g.fillRect(26, 51, 5, 11); g.fillRect(34, 51, 5, 11);
    g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(27, 51, 1, 11); g.fillRect(35, 51, 1, 11);
    g.fillStyle = '#14150f'; g.fillRect(25, 60, 7, 4); g.fillRect(33, 60, 7, 4);
    let tg = g.createLinearGradient(20, 26, 44, 52);
    tg.addColorStop(0, '#5d6b48'); tg.addColorStop(0.45, '#40492e'); tg.addColorStop(1, '#252c17');
    g.fillStyle = tg;
    g.beginPath(); g.moveTo(23, 29); g.quadraticCurveTo(32, 25.5, 41, 29); g.lineTo(40, 41); g.quadraticCurveTo(32, 44, 24, 41); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,240,200,0.16)'; g.beginPath(); g.ellipse(27, 33, 3.4, 9, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(37, 35, 5.4, 10, 0, 0, 7); g.fill();
    g.fillStyle = '#161811'; g.fillRect(21, 40, 22, 4);
    g.fillStyle = '#8a1414'; g.fillRect(30, 40.4, 4, 3.2);
    // rifle slung diagonally across the body
    g.save(); g.translate(32, 33); g.rotate(-0.5);
    let rg = g.createLinearGradient(0, -3, 0, 3);
    rg.addColorStop(0, '#4a3a24'); rg.addColorStop(1, '#241a0e');
    g.fillStyle = rg; g.fillRect(-20, -2, 40, 4);
    g.fillStyle = '#1a1a1c'; g.fillRect(-24, -1.4, 6, 2.8);                           // barrel
    g.fillStyle = '#2a2d33'; g.fillRect(4, -3.6, 3, 3.2);                             // scope mount
    g.strokeStyle = '#1a1a1c'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(4.5, -3.6); g.lineTo(11, -3.6); g.stroke();
    g.restore();
    g.strokeStyle = '#4c5638'; g.lineWidth = 4.4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(23, 30); g.lineTo(19, 38); g.lineTo(25, 41); g.stroke();
    g.beginPath(); g.moveTo(41, 30); g.lineTo(45, 38); g.lineTo(39, 41); g.stroke();
    g.fillStyle = '#a8724a'; g.beginPath(); g.arc(32, 20, 8, 0, 7); g.fill();
    g.fillStyle = 'rgba(90,50,25,0.35)'; g.beginPath(); g.ellipse(35, 22.6, 4.6, 3, -0.15, 0, 7); g.fill();
    g.fillStyle = '#0c0d10'; g.fillRect(24, 17.6, 16, 3.4);                           // dark shooting glasses
    g.fillStyle = 'rgba(150,190,225,0.4)'; g.fillRect(25, 18, 6, 2); g.fillRect(33, 18, 6, 2);
    g.fillStyle = '#3a2812'; g.fillRect(27, 24.4, 6, 1.4);
    // wide-brim bush hat
    let hg = g.createLinearGradient(18, 8, 46, 18);
    hg.addColorStop(0, '#5a4e2e'); hg.addColorStop(1, '#2e2814');
    g.fillStyle = hg; g.beginPath(); g.ellipse(32, 15, 15, 4, 0, 0, 7); g.fill();
    g.fillStyle = hg; g.beginPath(); g.ellipse(32, 10, 7.6, 6.2, 0, Math.PI, 0, true); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.ellipse(27, 9, 4, 2.4, 0, 0, 7); g.fill();
    speck(g, 20, 'rgba(0,0,0,0.06)');
  });
  SPR.sniperFlash = whiteOf(SPR.sniper);

  SPR.sniperCorpse = outlined(g => {
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(31, 58, 22, 5, 0, 0, 7); g.fill();
    let tg = g.createLinearGradient(10, 50, 50, 60);
    tg.addColorStop(0, '#5d6b48'); tg.addColorStop(0.5, '#40492e'); tg.addColorStop(1, '#252c17');
    g.fillStyle = tg; g.beginPath(); g.ellipse(30, 55, 19, 5.2, -0.06, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,240,200,0.14)'; g.beginPath(); g.ellipse(25, 53, 11, 2.4, -0.06, 0, 7); g.fill();
    g.fillStyle = '#161811'; g.fillRect(24, 53.4, 20, 3);
    g.strokeStyle = '#4c5638'; g.lineWidth = 3.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(24, 54); g.lineTo(16, 59); g.stroke();
    g.fillStyle = '#a8724a'; g.beginPath(); g.arc(13.6, 59.6, 4, 0, 7); g.fill();
    g.fillStyle = 'rgba(90,50,25,0.3)'; g.beginPath(); g.ellipse(15.6, 61.4, 2.6, 1.8, 0, 0, 7); g.fill();
    let hg = g.createLinearGradient(40, 53, 54, 60);
    hg.addColorStop(0, '#5a4e2e'); hg.addColorStop(1, '#2e2814');
    g.fillStyle = hg; g.beginPath(); g.ellipse(47, 57, 8, 3, 0.3, 0, 7); g.fill();
  });

  // ---- CIVILIANS: unarmed Havana locals, wander or stand — never fight back ----
  SPR.civilianM = outlined(g => {
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 62, 11, 2.6, 0, 0, 7); g.fill();
    let lg = g.createLinearGradient(0, 48, 0, 62);
    lg.addColorStop(0, '#cbb896'); lg.addColorStop(1, '#9c8968');
    g.fillStyle = lg; g.fillRect(27, 49, 4, 12); g.fillRect(33, 49, 4, 12);
    g.fillStyle = '#3a2f22'; g.fillRect(26, 59, 6, 3.6); g.fillRect(32, 59, 6, 3.6);
    let tg = g.createLinearGradient(20, 26, 44, 50);
    tg.addColorStop(0, '#f0ead6'); tg.addColorStop(0.45, '#d9d0b4'); tg.addColorStop(1, '#a89c78');
    g.fillStyle = tg;                                                                 // loose guayabera shirt
    g.beginPath(); g.moveTo(23, 29); g.quadraticCurveTo(32, 25.5, 41, 29); g.lineTo(40, 48); g.quadraticCurveTo(32, 51, 24, 48); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(120,105,75,0.4)'; g.lineWidth = 0.8;                        // pleat lines
    g.beginPath(); g.moveTo(28, 29); g.lineTo(27, 48); g.moveTo(36, 29); g.lineTo(37, 48); g.stroke();
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.beginPath(); g.ellipse(37, 36, 5, 12, 0, 0, 7); g.fill();
    g.strokeStyle = '#c9a06a'; g.lineWidth = 4.4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(23, 31); g.lineTo(18, 44); g.stroke();
    g.beginPath(); g.moveTo(41, 31); g.lineTo(46, 44); g.stroke();
    g.fillStyle = '#a8734a'; g.beginPath(); g.arc(17.4, 45, 2.6, 0, 7); g.fill();
    g.fillStyle = '#8a5c38'; g.beginPath(); g.arc(46.6, 45, 2.6, 0, 7); g.fill();
    g.fillStyle = '#a8724a'; g.beginPath(); g.arc(32, 19, 8, 0, 7); g.fill();
    g.fillStyle = 'rgba(90,50,25,0.35)'; g.beginPath(); g.ellipse(35, 21.6, 4.4, 3, -0.15, 0, 7); g.fill();
    g.fillStyle = '#5e3a24'; g.fillRect(29, 24.4, 6, 1.2);
    g.fillStyle = '#241a10'; g.fillRect(28, 15.6, 3, 4); g.fillRect(33, 15.6, 3, 4);   // hair
    let hg = g.createLinearGradient(18, 8, 46, 18);                                   // straw hat
    hg.addColorStop(0, '#e8d090'); hg.addColorStop(1, '#c9a860');
    g.fillStyle = hg; g.beginPath(); g.ellipse(32, 14.4, 13, 3.4, 0, 0, 7); g.fill();
    g.fillStyle = hg; g.beginPath(); g.ellipse(32, 10, 6.4, 5.4, 0, Math.PI, 0, true); g.fill();
    g.fillStyle = '#8a1414'; g.fillRect(26.6, 11.6, 10.8, 1.4);                       // hatband
  });
  SPR.civilianF = outlined(g => {
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 62, 11, 2.6, 0, 0, 7); g.fill();
    g.fillStyle = '#c9906a'; g.fillRect(27, 55, 4, 7); g.fillRect(33, 55, 4, 7);       // bare calves
    g.fillStyle = '#3a2f22'; g.fillRect(26, 59.6, 6, 3); g.fillRect(32, 59.6, 6, 3);
    let dg = g.createLinearGradient(18, 27, 46, 56);                                  // full floral-print dress
    dg.addColorStop(0, '#d8577a'); dg.addColorStop(0.5, '#b8395e'); dg.addColorStop(1, '#7e2140');
    g.fillStyle = dg;
    g.beginPath(); g.moveTo(24, 30); g.quadraticCurveTo(32, 26.5, 40, 30); g.lineTo(46, 55); g.lineTo(18, 55); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.18)';                                           // print dots
    for (const [fx, fy] of [[27, 36], [37, 34], [30, 44], [40, 42], [24, 48], [42, 50]]) { g.beginPath(); g.arc(fx, fy, 1.4, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,0.16)'; g.beginPath(); g.moveTo(38, 30); g.lineTo(44, 54); g.lineTo(40, 54); g.lineTo(35, 30); g.closePath(); g.fill();
    g.fillStyle = '#7e2140'; g.fillRect(26, 38, 12, 2.2);                             // waist sash
    g.strokeStyle = '#c9906a'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(24, 32); g.lineTo(19, 44); g.stroke();
    g.beginPath(); g.moveTo(40, 32); g.lineTo(45, 44); g.stroke();
    g.fillStyle = '#c9906a'; g.beginPath(); g.arc(18.4, 45, 2.4, 0, 7); g.fill(); g.beginPath(); g.arc(45.6, 45, 2.4, 0, 7); g.fill();
    g.fillStyle = '#a8724a'; g.beginPath(); g.arc(32, 19.6, 7.6, 0, 7); g.fill();
    g.fillStyle = 'rgba(90,50,25,0.32)'; g.beginPath(); g.ellipse(34.6, 22, 4, 2.8, -0.15, 0, 7); g.fill();
    g.fillStyle = '#5e3a24'; g.fillRect(29.4, 24.8, 5.4, 1.1);
    let hair = g.createLinearGradient(20, 10, 44, 26);                                // dark hair swept back
    hair.addColorStop(0, '#2a1a10'); hair.addColorStop(1, '#140c06');
    g.fillStyle = hair; g.beginPath(); g.ellipse(32, 15, 9.4, 8.4, 0, Math.PI * 0.9, Math.PI * 2.15); g.fill();
    g.fillStyle = '#d84040'; g.beginPath(); g.arc(24.6, 13, 1.6, 0, 7); g.fill();      // a flower behind the ear
  });
  SPR.civilianCorpse = outlined(g => {
    g.fillStyle = 'rgba(0,0,0,0.24)'; g.beginPath(); g.ellipse(31, 58, 22, 5, 0, 0, 7); g.fill();
    let tg = g.createLinearGradient(10, 50, 50, 60);
    tg.addColorStop(0, '#d8ceb0'); tg.addColorStop(0.5, '#b8ac86'); tg.addColorStop(1, '#7e7458');
    g.fillStyle = tg; g.beginPath(); g.ellipse(30, 55, 19, 5.2, -0.06, 0, 7); g.fill();
    g.fillStyle = 'rgba(90,20,14,0.4)'; g.beginPath(); g.ellipse(16, 57.4, 6, 2.4, 0.15, 0, 7); g.fill();
    g.strokeStyle = '#c9a06a'; g.lineWidth = 3.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(24, 54); g.lineTo(15, 59); g.stroke();
    g.fillStyle = '#a8734a'; g.beginPath(); g.arc(12.6, 59.6, 3.6, 0, 7); g.fill();
    let sk = g.createRadialGradient(11, 51.4, 1, 12.5, 52.5, 6.6);
    sk.addColorStop(0, '#e8c39a'); sk.addColorStop(0.7, '#c9926a'); sk.addColorStop(1, '#8a5a38');
    g.fillStyle = sk; g.beginPath(); g.ellipse(12.5, 52.8, 5.6, 5, 0.15, 0, 7); g.fill();
    let hg = g.createLinearGradient(38, 52, 52, 60);
    hg.addColorStop(0, '#e8d090'); hg.addColorStop(1, '#c9a860');
    g.fillStyle = hg; g.beginPath(); g.ellipse(46, 56, 7, 2.8, 0.3, 0, 7); g.fill();    // fallen straw hat
  });

  // ---------------------------------------------------------------------------
  // OUTDOOR / GENRE PROPS — off the Havana palette, into 1960s spy-thriller
  // territory generally: the parked sedan, the dead-drop phone booth, the
  // sentry post at the edge of the compound. Built for open-air placement.
  // ---------------------------------------------------------------------------
  SPR.sedan = outlined(g => {                                      // sleek black getaway sedan, three-quarter rear view
    g.fillStyle = 'rgba(0,0,0,0.32)'; g.beginPath(); g.ellipse(32, 56, 29, 5, 0, 0, 7); g.fill();
    let body = g.createLinearGradient(4, 24, 60, 50);
    body.addColorStop(0, '#3a3f48'); body.addColorStop(0.45, '#1c1f26'); body.addColorStop(1, '#08090c');
    g.fillStyle = body;
    g.beginPath();
    g.moveTo(6, 46); g.quadraticCurveTo(4, 34, 14, 30); g.lineTo(22, 22); g.quadraticCurveTo(32, 19, 42, 22);
    g.lineTo(50, 30); g.quadraticCurveTo(60, 33, 58, 46); g.quadraticCurveTo(60, 50, 55, 51); g.lineTo(9, 51);
    g.quadraticCurveTo(4, 50, 6, 46); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.14)'; g.beginPath(); g.moveTo(10, 32); g.quadraticCurveTo(20, 24, 32, 22); g.lineTo(30, 30); g.quadraticCurveTo(18, 32, 12, 40); g.closePath(); g.fill();
    let win = g.createLinearGradient(20, 22, 44, 32);
    win.addColorStop(0, '#8fb0c8'); win.addColorStop(1, '#2c3a44');
    g.fillStyle = win; g.beginPath(); g.moveTo(23, 23); g.quadraticCurveTo(32, 20.4, 41, 23); g.lineTo(38, 29); g.lineTo(26, 29); g.closePath(); g.fill();
    g.fillStyle = '#0a0b0d'; g.fillRect(31, 22, 2, 8);                          // window pillar
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1;                        // door seams
    g.beginPath(); g.moveTo(24, 31); g.lineTo(23, 50); g.moveTo(40, 31); g.lineTo(41, 50); g.stroke();
    g.fillStyle = '#c9a227'; g.fillRect(29, 39, 6, 2);                         // door handles
    g.fillStyle = '#0c0d10'; g.beginPath(); g.ellipse(14, 52, 8, 8, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(50, 52, 8, 8, 0, 0, 7); g.fill();
    g.fillStyle = '#3a3d44'; g.beginPath(); g.arc(14, 52, 3.6, 0, 7); g.fill(); g.beginPath(); g.arc(50, 52, 3.6, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(6, 43, 2.4, 3.6); g.fillRect(56, 43, 2.4, 3.6);   // taillight glints
    g.fillStyle = '#8a1414'; g.fillRect(5, 44, 2, 3); g.fillRect(57, 44, 2, 3);
    g.fillStyle = '#c9a227'; g.fillRect(28, 47, 8, 2);                         // rear plate
  });

  SPR.motorcycle = outlined(g => {                                 // chase-scene motorcycle with a sidecar
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(34, 58, 26, 4, 0, 0, 7); g.fill();
    g.strokeStyle = '#1c1e22'; g.lineWidth = 2.4;                              // wheels
    g.beginPath(); g.arc(16, 52, 8, 0, 7); g.stroke(); g.beginPath(); g.arc(46, 52, 8, 0, 7); g.stroke();
    g.fillStyle = '#3a3d44'; g.beginPath(); g.arc(16, 52, 3, 0, 7); g.fill(); g.beginPath(); g.arc(46, 52, 3, 0, 7); g.fill();
    let body = g.createLinearGradient(14, 30, 50, 50);
    body.addColorStop(0, '#4a1414'); body.addColorStop(0.5, '#8a1e1e'); body.addColorStop(1, '#3a0c0c');
    g.fillStyle = body;
    g.beginPath(); g.moveTo(18, 50); g.quadraticCurveTo(20, 36, 30, 34); g.quadraticCurveTo(42, 32, 46, 50); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.15)'; g.beginPath(); g.ellipse(26, 39, 4, 8, -0.2, 0, 7); g.fill();
    g.fillStyle = '#1c1c1e'; g.beginPath(); g.ellipse(30, 33, 7, 3, 0, 0, 7); g.fill();              // seat
    g.strokeStyle = '#8d929c'; g.lineWidth = 2.2;                              // handlebar
    g.beginPath(); g.moveTo(40, 34); g.lineTo(48, 30); g.stroke();
    g.fillStyle = '#0c0d10'; g.beginPath(); g.arc(48, 29, 2.4, 0, 7); g.fill();
    g.fillStyle = '#e8dca0'; g.beginPath(); g.arc(44, 32, 2.4, 0, 7); g.fill();                       // headlamp
    // sidecar, riveted olive drab
    let sc = g.createLinearGradient(0, 38, 0, 52);
    sc.addColorStop(0, '#5a5f42'); sc.addColorStop(1, '#33361f');
    g.fillStyle = sc; g.beginPath(); g.moveTo(2, 52); g.quadraticCurveTo(0, 38, 12, 37); g.quadraticCurveTo(20, 37, 20, 48); g.lineTo(20, 52); g.closePath(); g.fill();
    g.strokeStyle = '#1c1e22'; g.lineWidth = 2; g.beginPath(); g.arc(9, 52, 6, 0, 7); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.1)'; g.beginPath(); g.ellipse(7, 42, 3, 6, -0.2, 0, 7); g.fill();
  });

  SPR.phonebooth = outlined(g => {                                 // the dead-drop: a glazed red phone booth
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 62, 13, 2.8, 0, 0, 7); g.fill();
    let fr = g.createLinearGradient(16, 10, 48, 60);
    fr.addColorStop(0, '#c23a2e'); fr.addColorStop(0.5, '#8f1e16'); fr.addColorStop(1, '#5e100a');
    g.fillStyle = fr; g.fillRect(17, 10, 30, 52);
    g.fillStyle = 'rgba(255,200,180,0.18)'; g.fillRect(17, 10, 4, 52);
    bevel(g, 17, 10, 30, 52, 'rgba(255,200,180,0.2)', 'rgba(0,0,0,0.4)');
    g.fillStyle = '#4a0c08'; g.fillRect(17, 10, 30, 5);                        // domed cap band
    g.fillStyle = '#c9a227'; g.font = 'bold 6px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('TELEPHONE', 32, 13);
    let gl = g.createLinearGradient(0, 18, 0, 50);
    gl.addColorStop(0, 'rgba(180,210,225,0.5)'); gl.addColorStop(1, 'rgba(60,80,95,0.55)');
    g.fillStyle = gl; g.fillRect(21, 18, 22, 32);
    g.strokeStyle = '#8f1e16'; g.lineWidth = 1.4;                              // window mullions
    for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(21 + i * 5.5, 18); g.lineTo(21 + i * 5.5, 50); g.stroke(); }
    for (let i = 1; i < 3; i++) { g.beginPath(); g.moveTo(21, 18 + i * 10.6); g.lineTo(43, 18 + i * 10.6); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(22, 19, 1.6, 30);
    g.fillStyle = '#1c1c1e'; g.beginPath(); g.arc(30, 34, 2, 0, 7); g.fill();   // handset silhouette through the glass
    g.fillStyle = '#3a0c08'; g.fillRect(28, 50, 8, 3);                          // kick plate
    speck(g, 20, 'rgba(0,0,0,0.06)');
  });

  SPR.parkbench = outlined(g => {                                  // slatted wood bench, cast-iron ends
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(32, 58, 26, 3, 0, 0, 7); g.fill();
    g.fillStyle = '#1c1e22';                                                    // cast-iron end frames
    g.beginPath(); g.moveTo(10, 56); g.lineTo(10, 44); g.lineTo(16, 44); g.lineTo(16, 34); g.lineTo(20, 34); g.lineTo(20, 56); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(44, 56); g.lineTo(44, 44); g.lineTo(50, 44); g.lineTo(50, 34); g.lineTo(54, 34); g.lineTo(54, 56); g.closePath(); g.fill();
    for (let i = 0; i < 5; i++) {
      const y = 32 + i * 5;
      let sl = g.createLinearGradient(0, y, 0, y + 4);
      sl.addColorStop(0, '#8a6034'); sl.addColorStop(1, '#5a3a1c');
      g.fillStyle = sl; g.fillRect(9, y, 46, 4);
      g.fillStyle = 'rgba(255,220,170,0.18)'; g.fillRect(9, y, 46, 1);
    }
    for (let i = 0; i < 4; i++) {
      const y = 44 + i * 3;
      let sl = g.createLinearGradient(0, y, 0, y + 2.6);
      sl.addColorStop(0, '#7a5228'); sl.addColorStop(1, '#4a2e14');
      g.fillStyle = sl; g.fillRect(11, y, 42, 2.6);
    }
    speck(g, 30, 'rgba(0,0,0,0.08)');
  });

  SPR.newsstand = outlined(g => {                                  // corner newsstand, papers pinned under clips
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 61.5, 21, 3, 0, 0, 7); g.fill();
    let fr = g.createLinearGradient(0, 24, 0, 58);
    fr.addColorStop(0, '#4a4038'); fr.addColorStop(1, '#241d16');
    g.fillStyle = fr; g.fillRect(14, 30, 36, 28);
    bevel(g, 14, 30, 36, 28, 'rgba(255,230,190,0.15)', 'rgba(0,0,0,0.4)');
    let awn = g.createLinearGradient(10, 18, 54, 30);
    awn.addColorStop(0, '#c23a34'); awn.addColorStop(1, '#7a221e');
    g.fillStyle = awn; g.beginPath(); g.moveTo(10, 30); g.lineTo(16, 18); g.lineTo(48, 18); g.lineTo(54, 30); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.2)'; g.lineWidth = 1;
    for (let x = 18; x < 50; x += 6) { g.beginPath(); g.moveTo(x, 30); g.lineTo(x + 2, 19); g.stroke(); }
    g.fillStyle = '#1c1712'; g.fillRect(14, 34, 36, 4);                        // display shelf
    const paper = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(x, y + h - 2, w, 1.4); };
    paper(17, 39, 9, 12, '#e8e2ce'); paper(27, 41, 9, 10, '#d8c9a0'); paper(37, 38, 9, 13, '#eee6d4');
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.6;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(18, 42 + i * 3); g.lineTo(25, 42 + i * 3); g.stroke(); }
    g.fillStyle = '#8a1414'; g.fillRect(19, 39, 5, 1.4); g.fillRect(38, 38, 5, 1.4);   // masthead bars
    g.fillStyle = '#3a3d44'; g.fillRect(24, 51, 3, 7); g.fillRect(37, 51, 3, 7);        // support legs
  });

  SPR.oildrum = outlined(g => {                                    // rusted steel oil drum
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 60, 13, 2.6, 0, 0, 7); g.fill();
    let bd = g.createLinearGradient(19, 0, 45, 0);
    bd.addColorStop(0, '#5a6048'); bd.addColorStop(0.4, '#7a8060'); bd.addColorStop(0.6, '#4a5038'); bd.addColorStop(1, '#2a2e1c');
    g.fillStyle = bd; g.fillRect(19, 22, 26, 38);
    g.fillStyle = '#3a3d2a'; g.beginPath(); g.ellipse(32, 22, 13, 3.4, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(19, 30, 26, 1.6); g.fillRect(19, 44, 26, 1.6); g.fillRect(19, 55, 26, 1.6);   // ribs
    g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(19, 29, 26, 0.8); g.fillRect(19, 43, 26, 0.8);
    g.fillStyle = 'rgba(120,70,30,0.4)'; g.beginPath(); g.ellipse(25, 36, 3, 8, 0.15, 0, 7); g.fill();   // rust streak
    g.fillStyle = 'rgba(120,70,30,0.3)'; g.beginPath(); g.ellipse(38, 50, 2.4, 6, -0.1, 0, 7); g.fill();
    g.fillStyle = '#c9a227'; g.font = 'bold 7px monospace'; g.textAlign = 'center'; g.fillText('⚠', 32, 42);
    speck(g, 40, 'rgba(0,0,0,0.1)');
  });

  SPR.cratestack = outlined(g => {                                 // stacked wooden shipping crates, stencilled
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 61, 22, 3, 0, 0, 7); g.fill();
    const crate = (x, y, w, h, label) => {
      let bd = g.createLinearGradient(x, y, x, y + h);
      bd.addColorStop(0, '#a5713a'); bd.addColorStop(1, '#6b431e');
      g.fillStyle = bd; g.fillRect(x, y, w, h);
      bevel(g, x, y, w, h, 'rgba(255,220,170,0.2)', 'rgba(0,0,0,0.4)');
      g.strokeStyle = 'rgba(40,22,8,0.4)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + h); g.moveTo(x + w, y); g.lineTo(x, y + h); g.stroke();
      if (label) { g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(x + w / 2 - 8, y + h / 2 - 4, 16, 8); g.fillStyle = '#e8dcc0'; g.font = 'bold 6px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, x + w / 2, y + h / 2); }
    };
    crate(11, 38, 22, 22, 'FRAGILE');
    crate(33, 30, 19, 30, 'THIS SIDE UP');
    crate(13, 20, 17, 16, null);
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1.4;
    g.strokeRect(11, 38, 22, 22); g.strokeRect(33, 30, 19, 30);
  });

  SPR.guardpost = outlined(g => {                                  // sentry box behind a sandbag revetment
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 61, 24, 3, 0, 0, 7); g.fill();
    for (let i = 0; i < 4; i++) {                                              // sandbag wall, low, in front
      const x = 6 + i * 13;
      let bg2 = g.createLinearGradient(x, 46, x + 13, 60);
      bg2.addColorStop(0, '#b8a06c'); bg2.addColorStop(1, '#7a6640');
      g.fillStyle = bg2; g.beginPath(); g.ellipse(x + 6, 53, 7, 6.4, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.8; g.beginPath(); g.ellipse(x + 6, 53, 7, 6.4, 0, 0, 7); g.stroke();
    }
    let box = g.createLinearGradient(16, 14, 48, 48);
    box.addColorStop(0, '#4a4038'); box.addColorStop(0.5, '#33291e'); box.addColorStop(1, '#1c150e');
    g.fillStyle = box; g.beginPath(); g.moveTo(18, 48); g.lineTo(16, 22); g.lineTo(32, 12); g.lineTo(48, 22); g.lineTo(46, 48); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,220,170,0.14)'; g.beginPath(); g.moveTo(18, 48); g.lineTo(16, 22); g.lineTo(24, 20); g.lineTo(24, 46); g.closePath(); g.fill();
    g.fillStyle = '#0c0d10'; g.fillRect(24, 26, 16, 10);                       // viewing slit
    g.fillStyle = 'rgba(160,200,235,0.3)'; g.fillRect(25, 27, 14, 8);
    g.strokeStyle = '#8a1414'; g.lineWidth = 2;                                // barrier pole, raised
    g.beginPath(); g.moveTo(46, 44); g.lineTo(58, 34); g.stroke();
    g.strokeStyle = '#e8e2ce'; g.lineWidth = 2;
    for (let t = 0; t < 1; t += 0.34) { g.beginPath(); g.moveTo(46 + (58 - 46) * t, 44 + (34 - 44) * t); g.lineTo(46 + (58 - 46) * (t + 0.17), 44 + (34 - 44) * (t + 0.17)); g.stroke(); }
  });

  SPR.firehydrant = outlined(g => {                                // squat street hydrant, chipped enamel
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(32, 61, 9, 2.2, 0, 0, 7); g.fill();
    let bd = g.createLinearGradient(24, 0, 40, 0);
    bd.addColorStop(0, '#e0503c'); bd.addColorStop(0.45, '#b8281c'); bd.addColorStop(1, '#7a1410');
    g.fillStyle = bd;
    g.beginPath(); g.moveTo(26, 60); g.lineTo(27, 38); g.quadraticCurveTo(27, 30, 32, 28); g.quadraticCurveTo(37, 30, 37, 38); g.lineTo(38, 60); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,220,200,0.22)'; g.beginPath(); g.ellipse(29, 44, 2, 14, 0, 0, 7); g.fill();
    g.fillStyle = '#8f1e16'; g.beginPath(); g.ellipse(32, 28, 5.4, 3, 0, 0, 7); g.fill();       // cap
    g.fillStyle = '#c9a227'; g.beginPath(); g.arc(32, 24, 2, 0, 7); g.fill();                   // top bolt
    g.fillStyle = '#8f1e16'; g.beginPath(); g.arc(22, 42, 4, 0, 7); g.fill(); g.beginPath(); g.arc(42, 42, 4, 0, 7); g.fill();  // side nozzles
    g.fillStyle = '#3a3d44'; g.beginPath(); g.arc(22, 42, 1.6, 0, 7); g.fill(); g.beginPath(); g.arc(42, 42, 1.6, 0, 7); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(28, 50, 8, 10);                                // chipped patch
    speck(g, 18, 'rgba(0,0,0,0.1)');
  });

  SPR.satdish = outlined(g => {                                    // Cold War rooftop listening dish
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(32, 60, 16, 2.6, 0, 0, 7); g.fill();
    g.fillStyle = '#2a2d33'; g.fillRect(29, 40, 6, 20);                        // mast
    g.strokeStyle = '#3a3d44'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(29, 50); g.lineTo(16, 58); g.moveTo(35, 50); g.lineTo(48, 58); g.stroke();   // brace legs
    let dish = g.createRadialGradient(30, 26, 2, 32, 28, 20);
    dish.addColorStop(0, '#dfe3e8'); dish.addColorStop(0.7, '#a8afb8'); dish.addColorStop(1, '#5c6169');
    g.save(); g.translate(32, 28); g.rotate(-0.15);
    g.fillStyle = dish; g.beginPath(); g.ellipse(0, 0, 20, 15, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
    g.beginPath(); g.ellipse(0, 0, 20, 15, 0, 0, 7); g.stroke();
    g.beginPath(); g.ellipse(0, 0, 13, 9.6, 0, 0, 7); g.stroke();
    g.beginPath(); g.ellipse(0, 0, 6.4, 4.6, 0, 0, 7); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.ellipse(-6, -5, 6, 3, -0.3, 0, 7); g.fill();
    g.restore();
    g.strokeStyle = '#8d929c'; g.lineWidth = 1.4;                              // feed horn arm
    g.beginPath(); g.moveTo(32, 28); g.lineTo(32, 12); g.stroke();
    g.fillStyle = '#3a3d44'; g.fillRect(29.6, 9, 4.8, 5);
  });

  function agentBase(g, hasCase) {
    // Agent 004 slumped against the wall in black tie: real proportions —
    // legs splayed forward with knees dropped outward, arms fallen limp.
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(31, 62, 20, 3.6, 0, 0, 7); g.fill();
    // legs
    let trg = g.createLinearGradient(0, 46, 0, 62);
    trg.addColorStop(0, '#22242b'); trg.addColorStop(1, '#0d0e12');
    g.fillStyle = trg;
    g.beginPath(); g.moveTo(27, 47); g.lineTo(19, 55); g.lineTo(13, 59); g.lineTo(15.5, 61.5); g.lineTo(22.5, 57); g.lineTo(30.5, 50); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(36, 47); g.lineTo(44, 55); g.lineTo(50, 59.5); g.lineTo(47.5, 62); g.lineTo(41, 57); g.lineTo(33, 50); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.07)';
    g.beginPath(); g.moveTo(27, 47.6); g.lineTo(19.5, 55.2); g.lineTo(20.5, 56); g.lineTo(28, 48.8); g.closePath(); g.fill();
    // patent-leather shoes, toes up
    g.fillStyle = '#08090b';
    g.beginPath(); g.ellipse(13.4, 60.6, 3.6, 2, -0.5, 0, 7); g.fill();
    g.beginPath(); g.ellipse(49.8, 61, 3.6, 2, 0.5, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(12, 59.4, 1.6, 0.9); g.fillRect(49, 59.8, 1.6, 0.9);
    // torso slumped into the wall, shoulders dropped
    let tux = g.createLinearGradient(20, 30, 44, 52);
    tux.addColorStop(0, '#2c2f38'); tux.addColorStop(0.45, '#191b21'); tux.addColorStop(1, '#0a0b0e');
    g.fillStyle = tux;
    g.beginPath();
    g.moveTo(23, 33); g.quadraticCurveTo(31, 29.5, 40, 32.6);
    g.lineTo(42, 46); g.quadraticCurveTo(38, 50, 32, 50.4); g.quadraticCurveTo(25.5, 50, 22.5, 46.5);
    g.closePath(); g.fill();
    // satin lapels catching the light
    g.fillStyle = 'rgba(255,255,255,0.10)';
    g.beginPath(); g.moveTo(27, 33.4); g.lineTo(31.4, 37.5); g.lineTo(29, 43); g.lineTo(25.6, 35.5); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.05)';
    g.beginPath(); g.moveTo(37, 33.8); g.lineTo(33.4, 37.5); g.lineTo(35.8, 43); g.lineTo(39, 36); g.closePath(); g.fill();
    // shirt front + placket + bow tie
    let sh = g.createLinearGradient(29, 34, 35, 46);
    sh.addColorStop(0, '#f7f2e4'); sh.addColorStop(1, '#c2bba6');
    g.fillStyle = sh;
    g.beginPath(); g.moveTo(32.4, 33.6); g.lineTo(29.4, 45.5); g.lineTo(35.4, 45.5); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(31.9, 36, 1, 8.6);
    g.fillStyle = '#701818'; g.fillRect(29.9, 33.2, 5, 2.6);
    g.fillStyle = '#a83030'; g.fillRect(29.9, 33.2, 5, 1);
    g.fillStyle = '#0d0d0f'; g.fillRect(31.7, 34, 1.4, 1.2);
    // limp arms with elbow joints
    g.strokeStyle = '#15171c'; g.lineWidth = 4.4; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(24, 36); g.lineTo(18, 44); g.lineTo(15.5, 52.5); g.stroke();
    g.beginPath(); g.moveTo(40, 36.4); g.lineTo(45.5, 44.5); g.lineTo(48.5, 53); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(23.4, 36.4); g.lineTo(18.4, 43.6); g.stroke();
    g.fillStyle = '#c99268'; g.beginPath(); g.arc(15.4, 53.6, 2.2, 0, 7); g.fill();   // hands
    g.fillStyle = '#a8734a'; g.beginPath(); g.arc(48.6, 54, 2.2, 0, 7); g.fill();
    // head fallen onto the shoulder
    g.save(); g.translate(29.5, 26.5); g.rotate(-0.38);
    let sk2 = g.createRadialGradient(-1.5, -2, 1, 0, 0, 7);
    sk2.addColorStop(0, '#ecc39a'); sk2.addColorStop(0.7, '#c99268'); sk2.addColorStop(1, '#95653f');
    g.fillStyle = sk2; g.beginPath(); g.ellipse(0, 0, 5.6, 6.2, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(90,50,25,0.3)';
    g.beginPath(); g.ellipse(1.8, 2.6, 3.4, 2.4, 0, 0, 7); g.fill();
    // side-parted hair
    let hg = g.createLinearGradient(-6, -7, 6, -2);
    hg.addColorStop(0, '#4a3018'); hg.addColorStop(1, '#241505');
    g.fillStyle = hg;
    g.beginPath(); g.moveTo(-5.8, -1); g.quadraticCurveTo(-6.4, -6.4, -1, -6.6); g.quadraticCurveTo(4.4, -6.8, 5.8, -2.4); g.quadraticCurveTo(2, -4.8, -1.6, -4); g.quadraticCurveTo(-4.6, -3.4, -5.8, -1); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(-4.4, -5.4, 4, 0.9);
    // x-ed out eyes, nose shadow, slack mouth
    g.strokeStyle = '#2b1c10'; g.lineWidth = 0.9;
    g.beginPath(); g.moveTo(-4, -1.4); g.lineTo(-1.6, 0.4); g.moveTo(-1.6, -1.4); g.lineTo(-4, 0.4); g.stroke();
    g.beginPath(); g.moveTo(1.4, -1.4); g.lineTo(3.8, 0.4); g.moveTo(3.8, -1.4); g.lineTo(1.4, 0.4); g.stroke();
    g.fillStyle = 'rgba(90,50,25,0.55)'; g.fillRect(-0.6, 1.4, 1.4, 1.3);
    g.fillStyle = '#5e3a24'; g.fillRect(-1.8, 3.6, 3.6, 0.9);
    g.restore();
    if (hasCase) {
      let cg2 = g.createLinearGradient(45, 49, 45, 59);
      cg2.addColorStop(0, '#cfd3da'); cg2.addColorStop(0.5, '#9aa0aa'); cg2.addColorStop(1, '#5d626c');
      g.fillStyle = cg2; g.fillRect(45, 49.5, 13, 9.5);
      g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(45, 49.5, 13, 1);
      g.fillStyle = '#41454d'; g.fillRect(45, 53.4, 13, 1.4);
      g.fillStyle = '#d9b45a'; g.fillRect(49.6, 50.6, 3.4, 1.8);
      g.fillStyle = '#3a3d44'; g.fillRect(49.9, 48.2, 2.8, 1.6);   // handle
    }
  }
  SPR.agentCase = outlined(g => agentBase(g, true));
  SPR.agent = outlined(g => agentBase(g, false));

  function deskBase(g, open) {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 62, 26, 2.6, 0, 0, 7); g.fill();
    // walnut top seen at a slight angle
    let tp = g.createLinearGradient(0, 20, 0, 27);
    tp.addColorStop(0, '#6b4423'); tp.addColorStop(1, '#3f2812');
    g.fillStyle = tp;
    g.beginPath(); g.moveTo(9, 26); g.lineTo(14, 20.5); g.lineTo(55, 20.5); g.lineTo(58, 26); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,230,180,0.2)'; g.fillRect(10.5, 24.8, 46, 1);     // polished front edge
    g.strokeStyle = 'rgba(40,20,6,0.35)'; g.lineWidth = 0.7;                   // grain on the top
    g.beginPath(); g.moveTo(15, 22.5); g.lineTo(52, 22.4); g.stroke();
    g.beginPath(); g.moveTo(13, 24); g.lineTo(54, 23.8); g.stroke();
    // front face, grained
    let fr = g.createLinearGradient(0, 26, 0, 61);
    fr.addColorStop(0, '#553719'); fr.addColorStop(0.6, '#40270f'); fr.addColorStop(1, '#26160a');
    g.fillStyle = fr; g.fillRect(10, 26, 46, 35);
    g.strokeStyle = 'rgba(30,16,5,0.4)';
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(12, 30 + i * 6.4); g.quadraticCurveTo(32, 31.5 + i * 6.4, 54, 30 + i * 6.4); g.stroke(); }
    g.strokeStyle = 'rgba(255,220,160,0.07)';
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(12, 32 + i * 7); g.lineTo(54, 31.6 + i * 7); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(10, 26, 2, 35); g.fillRect(54, 26, 2, 35);   // side shadow
    // drawer
    g.fillStyle = '#2e1c0b'; g.fillRect(35, 31, 17, 12);
    bevel(g, 35, 31, 17, 12, 'rgba(255,220,160,0.18)', 'rgba(0,0,0,0.5)');
    g.fillStyle = '#d9b45a'; g.fillRect(41.2, 36.4, 5, 1.8);
    g.fillStyle = '#fff2c0'; g.fillRect(41.2, 36.4, 5, 0.7);
    if (open) {
      g.fillStyle = '#0f0a05'; g.fillRect(35, 31, 17, 12);
      let dr = g.createLinearGradient(0, 43, 0, 52);
      dr.addColorStop(0, '#3a2410'); dr.addColorStop(1, '#241505');
      g.fillStyle = dr; g.fillRect(33, 43, 21, 9);
      bevel(g, 33, 43, 21, 9, 'rgba(255,220,160,0.2)', 'rgba(0,0,0,0.55)');
      g.fillStyle = '#d9b45a'; g.fillRect(41.2, 47, 5, 1.8);
    }
    // the red rotary phone: body, cradled handset, finger dial
    let ph = g.createLinearGradient(0, 10, 0, 22);
    ph.addColorStop(0, '#e04030'); ph.addColorStop(0.6, '#b32418'); ph.addColorStop(1, '#77140c');
    g.fillStyle = ph;
    g.beginPath(); g.moveTo(13, 21); g.quadraticCurveTo(13.5, 13.5, 19, 13); g.quadraticCurveTo(24.5, 13.5, 25, 21); g.closePath(); g.fill();
    g.fillStyle = '#8f1a10'; g.beginPath(); g.ellipse(19, 12.4, 7.4, 2.6, 0, 0, 7); g.fill();
    let hs = g.createLinearGradient(0, 9, 0, 13);
    hs.addColorStop(0, '#e85040'); hs.addColorStop(1, '#a02015');
    g.fillStyle = hs;
    g.beginPath(); g.ellipse(19, 11, 8, 2.4, 0, 0, 7); g.fill();
    g.beginPath(); g.arc(11.6, 11.8, 2, 0, 7); g.fill(); g.beginPath(); g.arc(26.4, 11.8, 2, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(16, 10.4, 3, 0.8, -0.1, 0, 7); g.fill();
    g.fillStyle = '#f2e9d8'; g.beginPath(); g.arc(19, 17.6, 3, 0, 7); g.fill();
    g.fillStyle = '#77140c'; g.beginPath(); g.arc(19, 17.6, 1.2, 0, 7); g.fill();
    g.fillStyle = '#3a3d44';
    for (let i = 0; i < 6; i++) { const a2 = i * 1.05 - 0.5; g.fillRect(19 + Math.cos(a2) * 2.2 - 0.4, 17.6 + Math.sin(a2) * 2.2 - 0.4, 0.9, 0.9); }
  }
  SPR.desk = outlined(g => deskBase(g, false));
  SPR.deskOpen = outlined(g => deskBase(g, true));

  SPR.tube = outlined(g => {
    const glow = g.createRadialGradient(32, 38, 2, 32, 38, 24);
    glow.addColorStop(0, 'rgba(255,170,70,0.5)'); glow.addColorStop(0.5, 'rgba(255,140,50,0.18)'); glow.addColorStop(1, 'rgba(255,140,50,0)');
    g.fillStyle = glow; g.fillRect(6, 12, 52, 52);
    // glass envelope with a curved dome and cool-to-warm glass tones
    let gl = g.createLinearGradient(23, 0, 41, 0);
    gl.addColorStop(0, 'rgba(210,220,235,0.9)'); gl.addColorStop(0.25, 'rgba(245,250,255,0.95)');
    gl.addColorStop(0.5, 'rgba(180,195,215,0.8)'); gl.addColorStop(1, 'rgba(130,140,160,0.85)');
    g.fillStyle = gl;
    g.beginPath(); g.moveTo(25, 48); g.lineTo(25, 30); g.quadraticCurveTo(25, 20, 32, 20); g.quadraticCurveTo(39, 20, 39, 30); g.lineTo(39, 48); g.closePath(); g.fill();
    // internal plate + glowing filament
    g.strokeStyle = '#ffb35e'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(29, 45); g.lineTo(29, 30); g.lineTo(32, 27); g.lineTo(35, 30); g.lineTo(35, 45); g.stroke();
    g.fillStyle = '#ffd75e'; g.fillRect(30.5, 33, 3, 8);
    g.fillStyle = '#fff6d8'; g.fillRect(31.3, 34.5, 1.4, 5);
    // specular streak on the glass
    g.fillStyle = 'rgba(255,255,255,0.65)'; g.fillRect(27, 23, 1.6, 22);
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(29.2, 25, 0.8, 18);
    // bakelite/steel base with grooves + pins
    let bs = g.createLinearGradient(0, 48, 0, 57);
    bs.addColorStop(0, '#8d929c'); bs.addColorStop(0.5, '#5d626c'); bs.addColorStop(1, '#33363d');
    g.fillStyle = bs; g.fillRect(24, 48, 16, 9);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(24, 50.6, 16, 1); g.fillRect(24, 53.4, 16, 1);
    g.fillStyle = '#1c1e22'; for (let i = 0; i < 4; i++) g.fillRect(26.5 + i * 3.4, 57, 1.4, 5);
  });

  SPR.medkit = outlined(g => {
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 58.5, 21, 2.4, 0, 0, 7); g.fill();
    let cs = g.createLinearGradient(0, 31, 0, 57);
    cs.addColorStop(0, '#f4f1e6'); cs.addColorStop(0.55, '#ddd7c4'); cs.addColorStop(1, '#b3ac97');
    g.fillStyle = cs; g.fillRect(13, 31, 38, 26);
    g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(13, 42.4, 38, 1.6);          // lid seam
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(13, 31, 38, 1.2);
    bevel(g, 13, 31, 38, 26, 'rgba(255,255,255,0.6)', 'rgba(0,0,0,0.4)');
    g.fillStyle = 'rgba(90,80,60,0.25)';                                       // scuffs
    g.fillRect(16, 52, 6, 1); g.fillRect(43, 35, 4, 1); g.fillRect(15, 33.6, 3, 0.8);
    g.fillStyle = '#8d929c'; g.fillRect(18, 41.6, 3, 3.4); g.fillRect(43, 41.6, 3, 3.4);   // steel latches
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(18, 41.6, 3, 1);
    let hd = g.createLinearGradient(0, 26.6, 0, 31);
    hd.addColorStop(0, '#565a63'); hd.addColorStop(1, '#26282d');
    g.fillStyle = hd; g.fillRect(27, 26.6, 10, 4.6);                           // handle
    g.fillStyle = '#eceae2'; g.fillRect(29, 28, 6, 1.6);
    let rc = g.createLinearGradient(0, 34, 0, 52);                             // shaded red cross
    rc.addColorStop(0, '#e03428'); rc.addColorStop(1, '#8f150c');
    g.fillStyle = rc; g.fillRect(28, 34, 8, 18); g.fillRect(22, 40, 20, 6);
    g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(28.6, 34.6, 1.6, 16.8); g.fillRect(22.6, 40.6, 18.8, 1.4);
  });

  SPR.ammo = outlined(g => {
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 58.5, 21, 2.4, 0, 0, 7); g.fill();
    let bx = g.createLinearGradient(0, 33, 0, 57);
    bx.addColorStop(0, '#646a48'); bx.addColorStop(0.5, '#4a4f34'); bx.addColorStop(1, '#2b2e1c');
    g.fillStyle = bx; g.fillRect(13, 33, 38, 24);
    let ld = g.createLinearGradient(0, 33, 0, 39.6);                           // lid + hinge shadow
    ld.addColorStop(0, '#71774f'); ld.addColorStop(1, '#3c402a');
    g.fillStyle = ld; g.fillRect(13, 33, 38, 6.6);
    g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(13, 33, 38, 1);
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(13, 39, 38, 1.2);
    bevel(g, 13, 33, 38, 24, 'rgba(255,255,240,0.25)', 'rgba(0,0,0,0.5)');
    let lt = g.createLinearGradient(0, 30, 0, 35);                             // steel latch
    lt.addColorStop(0, '#7c8188'); lt.addColorStop(1, '#3c3f45');
    g.fillStyle = lt; g.fillRect(28, 30.4, 8, 4.6);
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(28, 30.4, 8, 1);
    g.fillStyle = '#2b2e1c'; g.fillRect(10.6, 40, 2.4, 7); g.fillRect(51, 40, 2.4, 7);   // side handles
    g.fillStyle = '#d9c98e'; g.font = 'bold 9px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('9MM', 32, 46.5);                                               // stencil
    g.fillStyle = 'rgba(217,201,142,0.8)'; g.fillRect(17, 51.4, 30, 1.4);
    g.fillStyle = 'rgba(217,201,142,0.5)'; g.fillRect(17, 42, 4, 1); g.fillRect(43, 42, 4, 1);
    g.fillStyle = 'rgba(120,70,30,0.35)'; g.fillRect(15, 54, 5, 1); g.fillRect(44, 36.6, 4, 0.8);   // rust nicks
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(20, 35, 9, 0.8);
  });

  SPR.plant = outlined(g => {                                     // potted Havana palm
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 62.4, 13, 2.2, 0, 0, 7); g.fill();
    // terracotta pot, side-lit, with rim and sheen
    let pt = g.createLinearGradient(24, 0, 40, 0);
    pt.addColorStop(0, '#c9784a'); pt.addColorStop(0.45, '#a9552c'); pt.addColorStop(1, '#6e3417');
    g.fillStyle = pt;
    g.beginPath(); g.moveTo(24, 48); g.lineTo(40, 48); g.lineTo(37.4, 63); g.lineTo(26.6, 63); g.closePath(); g.fill();
    let rm = g.createLinearGradient(0, 45.4, 0, 49);
    rm.addColorStop(0, '#d98d5c'); rm.addColorStop(1, '#8f4520');
    g.fillStyle = rm; g.fillRect(22.6, 45.4, 18.8, 3.6);
    g.fillStyle = 'rgba(255,235,210,0.3)'; g.fillRect(22.6, 45.4, 18.8, 0.9);
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(22.6, 48.2, 18.8, 0.8);
    g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(26.6, 49.6, 2, 12.4);
    g.fillStyle = '#33200c'; g.beginPath(); g.ellipse(32, 46.6, 7.4, 1.3, 0, 0, 7); g.fill();   // soil
    // ringed trunk with a slight curve
    let tk = g.createLinearGradient(29.6, 0, 34.4, 0);
    tk.addColorStop(0, '#8a6436'); tk.addColorStop(0.5, '#6b4a24'); tk.addColorStop(1, '#432c12');
    g.fillStyle = tk;
    g.beginPath(); g.moveTo(30.4, 46.8); g.quadraticCurveTo(29.6, 36, 31, 29.5); g.lineTo(33.4, 29.5); g.quadraticCurveTo(34.2, 38, 33.8, 46.8); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(30,18,6,0.5)'; g.lineWidth = 0.7;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(30.4, 43 - i * 3.6); g.lineTo(33.8, 42.2 - i * 3.6); g.stroke(); }
    // fronds: layered back-to-front, each a leaf shape with midrib + vein light
    const frond = (rot, len, w, c1, c2) => {
      g.save(); g.translate(32, 30); g.rotate(rot);
      const fg = g.createLinearGradient(0, 0, 0, -len);
      fg.addColorStop(0, c2); fg.addColorStop(1, c1);
      g.fillStyle = fg;
      g.beginPath(); g.moveTo(0, 0);
      g.quadraticCurveTo(-w, -len * 0.45, -w * 0.35, -len);
      g.quadraticCurveTo(0, -len * 0.86, w * 0.35, -len);
      g.quadraticCurveTo(w, -len * 0.45, 0, 0);
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(10,30,8,0.5)'; g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -len); g.stroke();
      g.strokeStyle = 'rgba(220,255,190,0.25)'; g.lineWidth = 0.6;
      g.beginPath(); g.moveTo(-0.8, -2); g.lineTo(-0.8, -len * 0.8); g.stroke();
      g.restore();
    };
    frond(-1.35, 20, 4.6, '#1d4d24', '#153a18');
    frond(1.35, 20, 4.6, '#173f1b', '#0f2c10');
    frond(-0.75, 24, 5, '#2c6b34', '#1c4a20');
    frond(0.75, 24, 5, '#245c2a', '#163c18');
    frond(-0.25, 27, 5.2, '#3c8a46', '#256030');
    frond(0.28, 27, 5.2, '#347a3c', '#1f5226');
    frond(0, 29, 5, '#46a052', '#2c6b34');
    g.fillStyle = '#5e4322'; g.beginPath(); g.arc(30, 29.4, 2, 0, 7); g.arc(34, 29.8, 1.8, 0, 7); g.fill();   // coconuts
    g.fillStyle = 'rgba(255,230,180,0.35)'; g.beginPath(); g.arc(29.4, 28.8, 0.7, 0, 7); g.fill();
  });

  SPR.bar = outlined(g => {
    // brass bar cart: lit frame, glass shelves, stocked top + bottom
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 62, 23, 2.4, 0, 0, 7); g.fill();
    g.strokeStyle = '#8a6a2a'; g.lineWidth = 3;
    g.strokeRect(12, 26, 40, 30);
    g.beginPath(); g.moveTo(12, 41); g.lineTo(52, 41); g.stroke();
    g.strokeStyle = 'rgba(255,235,170,0.5)'; g.lineWidth = 1;                  // brass edge light
    g.beginPath(); g.moveTo(12, 24.8); g.lineTo(52, 24.8); g.stroke();
    g.beginPath(); g.moveTo(13.6, 26); g.lineTo(13.6, 56); g.stroke();
    g.fillStyle = 'rgba(210,230,240,0.14)'; g.fillRect(13.5, 39.6, 37, 1.6); g.fillRect(13.5, 54.6, 37, 1.6);   // glass shelves
    g.strokeStyle = '#8a6a2a'; g.lineWidth = 2.4;                              // wheels
    g.beginPath(); g.arc(18, 59, 3, 0, 7); g.stroke(); g.beginPath(); g.arc(46, 59, 3, 0, 7); g.stroke();
    g.fillStyle = '#2b2118'; g.beginPath(); g.arc(18, 59, 1.2, 0, 7); g.arc(46, 59, 1.2, 0, 7); g.fill();
    // bottles with necks, labels, and a glass shine
    const bottle = (x, w, h, c1, c2, label) => {
      const bg3 = g.createLinearGradient(x, 0, x + w, 0);
      bg3.addColorStop(0, c1); bg3.addColorStop(0.4, c2); bg3.addColorStop(1, c1);
      g.fillStyle = bg3;
      g.fillRect(x, 41 - h, w, h);
      g.fillRect(x + w / 2 - 1.1, 41 - h - 4.4, 2.2, 4.6);
      g.fillStyle = '#1c1208'; g.fillRect(x + w / 2 - 1.1, 41 - h - 5.6, 2.2, 1.6);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x + 1, 41 - h + 1, 1, h - 2);
      if (label) { g.fillStyle = label; g.fillRect(x + 1, 41 - h + h * 0.4, w - 2, h * 0.3); }
    };
    bottle(16, 6, 12, '#173f1b', '#2c6b34', '#e8e2ce');            // gin
    bottle(25, 6, 10, '#6e3d10', '#a5691f', '#d9c98e');            // scotch
    // cocktail shaker, tapered, chrome
    let sh2 = g.createLinearGradient(34, 0, 41, 0);
    sh2.addColorStop(0, '#e8ebef'); sh2.addColorStop(0.35, '#b9bec7'); sh2.addColorStop(1, '#71767f');
    g.fillStyle = sh2;
    g.beginPath(); g.moveTo(34, 41); g.lineTo(34.6, 30); g.lineTo(40.4, 30); g.lineTo(41, 41); g.closePath(); g.fill();
    g.fillStyle = '#8d929c'; g.fillRect(35.2, 28, 4.6, 2.2);
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(35.8, 30.6, 1, 9.6);
    // martini glass: outlined bowl, translucent fill, olive with glint
    g.strokeStyle = '#d8ecf4'; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(43.5, 30); g.lineTo(51.5, 30); g.lineTo(47.5, 36.5); g.closePath(); g.stroke();
    g.fillStyle = 'rgba(216,236,244,0.25)'; g.beginPath(); g.moveTo(44.5, 30.6); g.lineTo(50.5, 30.6); g.lineTo(47.5, 35.6); g.closePath(); g.fill();
    g.fillStyle = '#d8ecf4'; g.fillRect(47, 36.5, 1, 4.4); g.fillRect(45.4, 41, 4.2, 1);
    g.fillStyle = '#4a7a2a'; g.beginPath(); g.arc(47.5, 31.8, 1.3, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(47.2, 31.2, 0.7, 0.7);
    // lower shelf: whisky decanter + two tumblers
    g.fillStyle = 'rgba(200,160,60,0.8)'; g.fillRect(18, 49, 5, 6);
    g.fillStyle = 'rgba(255,240,200,0.4)'; g.fillRect(18.8, 49.8, 1, 4.4);
    g.fillStyle = 'rgba(216,236,244,0.5)'; g.fillRect(27, 50.6, 3.4, 4.6); g.fillRect(32.4, 50.6, 3.4, 4.6);
  });

  // ---- more spycraft: Havana-office tradecraft props ----
  SPR.camera = outlined(g => {                                    // Minox-style subminiature spy camera
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 44, 15, 3, 0, 0, 7); g.fill();
    let bd = g.createLinearGradient(18, 22, 46, 40);
    bd.addColorStop(0, '#c7cdd6'); bd.addColorStop(0.5, '#8d929c'); bd.addColorStop(1, '#4a4e56');
    g.fillStyle = bd; g.fillRect(18, 24, 28, 15);
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(18, 24, 28, 1.4);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(18, 37.6, 28, 1.4);
    bevel(g, 18, 24, 28, 15, 'rgba(255,255,255,0.35)', 'rgba(0,0,0,0.4)');
    g.fillStyle = '#2a2d33'; g.fillRect(20, 27, 8, 6);                       // lens housing
    let lensg = g.createRadialGradient(24, 30, 0.5, 24, 30, 4);
    lensg.addColorStop(0, 'rgba(190,220,255,0.9)'); lensg.addColorStop(0.6, 'rgba(30,40,60,0.9)'); lensg.addColorStop(1, '#0a0b0d');
    g.fillStyle = lensg; g.beginPath(); g.arc(24, 30, 3.4, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(22.6, 28.6, 0.8, 0, 7); g.fill();
    g.fillStyle = '#3a3d44'; g.fillRect(36, 26, 7, 4);                       // viewfinder window
    g.fillStyle = 'rgba(180,210,235,0.5)'; g.fillRect(37, 27, 5, 2);
    g.fillStyle = '#1c1e22'; g.fillRect(40, 22.6, 4, 2.4);                   // shutter dial nub
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 0.6;
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(19 + i * 5.4, 24.4); g.lineTo(19 + i * 5.4, 27.6); g.stroke(); }   // knurled edge
  });

  SPR.safe = outlined(g => {                                      // squat steel floor safe, dial and handle
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 61.5, 19, 3, 0, 0, 7); g.fill();
    let bd = g.createLinearGradient(0, 24, 0, 60);
    bd.addColorStop(0, '#565b64'); bd.addColorStop(0.5, '#33363d'); bd.addColorStop(1, '#1a1c20');
    g.fillStyle = bd; g.fillRect(13, 24, 38, 36);
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(13, 24, 38, 1.4);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(13, 58.6, 38, 1.4);
    bevel(g, 13, 24, 38, 36, 'rgba(255,255,255,0.2)', 'rgba(0,0,0,0.55)');
    let dr = g.createLinearGradient(0, 30, 0, 54);                          // recessed door panel
    dr.addColorStop(0, '#494d55'); dr.addColorStop(1, '#26282d');
    g.fillStyle = dr; g.fillRect(17, 30, 30, 24);
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1.4; g.strokeRect(17, 30, 30, 24);
    let dg = g.createRadialGradient(28, 39, 1, 28, 39, 7);                  // combination dial
    dg.addColorStop(0, '#e8ecf2'); dg.addColorStop(0.7, '#9aa0aa'); dg.addColorStop(1, '#4a4e56');
    g.fillStyle = dg; g.beginPath(); g.arc(28, 39, 6.4, 0, 7); g.fill();
    g.fillStyle = '#1c1e22'; for (let i = 0; i < 12; i++) { const a2 = i / 12 * 6.283; g.fillRect(28 + Math.cos(a2) * 5.4 - 0.4, 39 + Math.sin(a2) * 5.4 - 0.4, 0.8, 0.8); }
    g.fillStyle = '#c92222'; g.beginPath(); g.moveTo(28, 34.4); g.lineTo(29.2, 38.4); g.lineTo(26.8, 38.4); g.closePath(); g.fill();
    let hg = g.createLinearGradient(37, 34, 43, 46);                        // steel bolt handle
    hg.addColorStop(0, '#c7cdd6'); hg.addColorStop(1, '#6a6e76');
    g.fillStyle = hg; g.fillRect(37.4, 34, 5.2, 12);
    g.fillStyle = '#2a2d33'; g.fillRect(38, 36, 4, 1.4); g.fillRect(38, 40, 4, 1.4); g.fillRect(38, 44, 4, 1.4);
    g.fillStyle = '#c9a227'; g.fillRect(19, 32, 6, 1.4);                    // gold brand plate
  });

  SPR.filecab = outlined(g => {                                   // olive-steel filing cabinet, three drawers
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 61.5, 15, 2.6, 0, 0, 7); g.fill();
    let bd = g.createLinearGradient(0, 20, 0, 60);
    bd.addColorStop(0, '#5a5f42'); bd.addColorStop(0.5, '#454a30'); bd.addColorStop(1, '#282b1b');
    g.fillStyle = bd; g.fillRect(18, 20, 28, 40);
    g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(18, 20, 28, 1.2);
    bevel(g, 18, 20, 28, 40, 'rgba(255,255,255,0.16)', 'rgba(0,0,0,0.5)');
    for (let i = 0; i < 3; i++) {
      const y = 23 + i * 12.4;
      let dg = g.createLinearGradient(0, y, 0, y + 10.6);
      dg.addColorStop(0, '#6b7048'); dg.addColorStop(1, '#33361f');
      g.fillStyle = dg; g.fillRect(20, y, 24, 10.6);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(20, y + 10.6, 24, 1);
      g.fillStyle = '#c9a227'; g.fillRect(30, y + 3.4, 4, 3.4);              // brass pull
      g.fillStyle = 'rgba(255,242,192,0.5)'; g.fillRect(30, y + 3.4, 4, 1);
      g.fillStyle = '#1c1e14'; g.fillRect(22, y + 1.2, 8, 1.6);              // label slot
    }
  });

  SPR.globe = outlined(g => {                                     // desk globe on a wooden stand
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(32, 60.5, 11, 2.4, 0, 0, 7); g.fill();
    let leg = g.createLinearGradient(0, 46, 0, 59);
    leg.addColorStop(0, '#6b4a24'); leg.addColorStop(1, '#3a2712');
    g.fillStyle = leg;
    g.beginPath(); g.moveTo(24, 59); g.lineTo(27, 47); g.lineTo(37, 47); g.lineTo(40, 59); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,220,170,0.14)'; g.fillRect(26.4, 48, 1.4, 10);
    g.fillStyle = '#8a6436'; g.fillRect(22, 57.2, 20, 2.6);                  // base plate
    let sph = g.createRadialGradient(27, 28, 2, 32, 32, 15);
    sph.addColorStop(0, '#7fb8d8'); sph.addColorStop(0.55, '#3f7fa8'); sph.addColorStop(1, '#1c4a68');
    g.fillStyle = sph; g.beginPath(); g.arc(32, 32, 14, 0, 7); g.fill();
    g.fillStyle = 'rgba(90,150,70,0.85)';                                    // continents, rough silhouettes
    g.beginPath(); g.ellipse(26, 26, 5, 3.4, -0.3, 0, 7); g.fill();
    g.beginPath(); g.ellipse(37, 24, 4, 2.6, 0.2, 0, 7); g.fill();
    g.beginPath(); g.ellipse(28, 37, 3.6, 5, 0.15, 0, 7); g.fill();
    g.beginPath(); g.ellipse(40, 35, 4.4, 3, -0.1, 0, 7); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 0.6;                    // lat/long lines
    g.beginPath(); g.ellipse(32, 32, 14, 5, 0, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(32, 18); g.lineTo(32, 46); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.ellipse(26, 24, 4, 6, -0.3, 0, 7); g.fill();   // gloss highlight
    g.strokeStyle = '#8a6436'; g.lineWidth = 1.6;                            // meridian ring
    g.beginPath(); g.ellipse(32, 32, 15, 15, 0, 0.15, Math.PI - 0.15); g.stroke();
  });

  SPR.briefcase = outlined(g => {                                  // leather attaché case, standing on end
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 59.5, 16, 3, 0, 0, 7); g.fill();
    let bd = g.createLinearGradient(15, 28, 49, 58);
    bd.addColorStop(0, '#8a5a30'); bd.addColorStop(0.5, '#623d1c'); bd.addColorStop(1, '#3a230e');
    g.fillStyle = bd; g.fillRect(15, 28, 34, 30);
    g.fillStyle = 'rgba(255,220,170,0.16)'; g.fillRect(15, 28, 34, 1.4);
    bevel(g, 15, 28, 34, 30, 'rgba(255,220,170,0.22)', 'rgba(0,0,0,0.5)');
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(32, 28); g.lineTo(32, 58); g.stroke();   // seam
    g.fillStyle = '#2a2018'; g.fillRect(28, 23, 8, 6);                       // handle
    g.strokeStyle = '#1c150e'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(28.5, 28); g.quadraticCurveTo(32, 20, 35.5, 28); g.stroke();
    let hw = g.createLinearGradient(0, 34, 0, 40);
    hw.addColorStop(0, '#d9b45a'); hw.addColorStop(1, '#8a6a2a');
    g.fillStyle = hw; g.fillRect(19, 35, 6, 5); g.fillRect(39, 35, 6, 5);    // brass latches
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(19, 35, 6, 1); g.fillRect(39, 35, 6, 1);
    g.fillStyle = '#3a2712'; g.beginPath(); g.arc(22, 37.5, 1, 0, 7); g.fill(); g.beginPath(); g.arc(42, 37.5, 1, 0, 7); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(15, 46, 34, 2);             // corner scuffs
  });

  SPR.radio = outlined(g => {                                      // shortwave field radio, dials and mesh speaker
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 58.5, 18, 2.8, 0, 0, 7); g.fill();
    let bd = g.createLinearGradient(0, 22, 0, 56);
    bd.addColorStop(0, '#4a4030'); bd.addColorStop(0.5, '#332a1c'); bd.addColorStop(1, '#1c160e');
    g.fillStyle = bd; g.fillRect(14, 22, 36, 34);
    g.fillStyle = 'rgba(255,230,180,0.12)'; g.fillRect(14, 22, 36, 1.2);
    bevel(g, 14, 22, 36, 34, 'rgba(255,220,160,0.18)', 'rgba(0,0,0,0.55)');
    let mg = g.createLinearGradient(0, 26, 0, 46);                          // speaker mesh
    mg.addColorStop(0, '#5a524a'); mg.addColorStop(1, '#2a251e');
    g.fillStyle = mg; g.fillRect(17, 26, 15, 20);
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 0.6;
    for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(17, 27.6 + i * 3.2); g.lineTo(32, 27.6 + i * 3.2); g.stroke(); }
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(19.6 + i * 2.6, 26); g.lineTo(19.6 + i * 2.6, 46); g.stroke(); }
    let dg = g.createRadialGradient(41, 32, 1, 41, 32, 5);                  // tuning dial
    dg.addColorStop(0, '#e8ecf2'); dg.addColorStop(0.7, '#9aa0aa'); dg.addColorStop(1, '#4a4e56');
    g.fillStyle = dg; g.beginPath(); g.arc(41, 32, 4.6, 0, 7); g.fill();
    g.strokeStyle = '#c92222'; g.lineWidth = 1; g.beginPath(); g.moveTo(41, 32); g.lineTo(43.6, 29); g.stroke();
    g.fillStyle = '#1c1e22'; g.beginPath(); g.arc(41, 43, 3.4, 0, 7); g.fill();   // volume knob
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(40.5, 40.4, 1, 2.6);
    g.fillStyle = '#0d0f12'; g.fillRect(17, 49, 30, 4);                     // frequency readout strip
    g.fillStyle = '#3aa85a'; g.font = 'bold 6px monospace'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText('7.4 MC', 19.5, 51.2);
    g.strokeStyle = '#2a251e'; g.lineWidth = 2;                              // telescoping antenna
    g.beginPath(); g.moveTo(46, 22); g.lineTo(52, 6); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.2)'; g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(46, 22); g.lineTo(51.4, 7.4); g.stroke();
  });

  SPR.typewriter = outlined(g => {                                 // portable field typewriter, ribbon spools + keys
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 52, 20, 3, 0, 0, 7); g.fill();
    let bd = g.createLinearGradient(0, 26, 0, 46);
    bd.addColorStop(0, '#3a4550'); bd.addColorStop(0.5, '#232a32'); bd.addColorStop(1, '#12161a');
    g.fillStyle = bd; g.beginPath();
    g.moveTo(14, 46); g.lineTo(16, 30); g.quadraticCurveTo(16, 26, 22, 26); g.lineTo(42, 26); g.quadraticCurveTo(48, 26, 48, 30); g.lineTo(50, 46); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.1)'; g.beginPath(); g.moveTo(16, 30); g.lineTo(22, 30); g.lineTo(20, 46); g.lineTo(14, 46); g.closePath(); g.fill();
    let rl = g.createRadialGradient(20, 22, 1, 20, 22, 4);          // ribbon spools
    rl.addColorStop(0, '#8a1414'); rl.addColorStop(1, '#3a0808');
    g.fillStyle = rl; g.beginPath(); g.arc(20, 22, 4, 0, 7); g.fill();
    g.fillStyle = rl; g.beginPath(); g.arc(44, 22, 4, 0, 7); g.fill();
    g.fillStyle = '#0c0d10'; g.beginPath(); g.arc(20, 22, 1.4, 0, 7); g.fill(); g.beginPath(); g.arc(44, 22, 1.4, 0, 7); g.fill();
    g.strokeStyle = '#8d929c'; g.lineWidth = 1.4;                   // roller/carriage bar
    g.beginPath(); g.moveTo(15, 25); g.lineTo(49, 25); g.stroke();
    g.fillStyle = '#dcd6c4'; g.fillRect(15, 22.6, 34, 2);            // a sheet of paper fed through
    g.fillStyle = '#1c1e22';                                        // key rows
    for (let row = 0; row < 3; row++) for (let col = 0; col < 8; col++) {
      const kx = 18 + col * 3.9 - row * 1, ky = 34 + row * 3.6;
      g.beginPath(); g.arc(kx, ky, 1.3, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.15)'; g.beginPath(); g.arc(kx - 0.4, ky - 0.4, 0.5, 0, 7); g.fill();
      g.fillStyle = '#1c1e22';
    }
    g.fillStyle = '#2a2d33'; g.fillRect(20, 44, 24, 3);              // space bar
  });

  SPR.cigarcrate = outlined(g => {                                  // open crate of Havana cigars, stencilled
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 58.5, 19, 3, 0, 0, 7); g.fill();
    let bd = g.createLinearGradient(0, 30, 0, 58);
    bd.addColorStop(0, '#8a5a2c'); bd.addColorStop(0.5, '#6b431e'); bd.addColorStop(1, '#43290f');
    g.fillStyle = bd; g.fillRect(14, 34, 36, 24);
    bevel(g, 14, 34, 36, 24, 'rgba(255,220,170,0.2)', 'rgba(0,0,0,0.45)');
    g.strokeStyle = 'rgba(40,22,8,0.4)'; g.lineWidth = 1;            // plank seams
    g.beginPath(); g.moveTo(14, 42); g.lineTo(50, 42); g.moveTo(14, 50); g.lineTo(50, 50); g.stroke();
    g.fillStyle = '#c9a227'; g.fillRect(18, 37, 28, 5);              // brand stencil band
    g.fillStyle = '#3a2712'; g.font = 'bold 6px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('HABANOS', 32, 39.6);
    let lid = g.createLinearGradient(0, 28, 0, 34);                  // open lid, propped behind
    lid.addColorStop(0, '#9a6a34'); lid.addColorStop(1, '#5a3a1a');
    g.fillStyle = lid; g.fillRect(16, 24, 32, 8);
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(20, 24); g.lineTo(20, 32); g.moveTo(44, 24); g.lineTo(44, 32); g.stroke();
    for (let i = 0; i < 7; i++) {                                    // bundled cigars poking up
      const x = 17 + i * 4.6;
      let cg2 = g.createLinearGradient(x, 20, x + 3, 34);
      cg2.addColorStop(0, '#a5713a'); cg2.addColorStop(1, '#6b431e');
      g.fillStyle = cg2; g.fillRect(x, 22, 3, 14);
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x, 22, 0.8, 14);
      g.fillStyle = '#e8dcc0'; g.fillRect(x - 0.3, 25, 3.6, 1.6);     // paper band
    }
  });

  SPR.deskfan = outlined(g => {                                     // oscillating desk fan, cage + blades
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(32, 58, 13, 2.6, 0, 0, 7); g.fill();
    let base = g.createLinearGradient(0, 52, 0, 58);
    base.addColorStop(0, '#6a6e76'); base.addColorStop(1, '#33363d');
    g.fillStyle = base; g.beginPath(); g.ellipse(32, 55, 11, 3.4, 0, 0, 7); g.fill();
    let neck = g.createLinearGradient(29, 0, 35, 0);
    neck.addColorStop(0, '#8d929c'); neck.addColorStop(1, '#4a4e56');
    g.fillStyle = neck; g.fillRect(29.6, 34, 4.8, 20);
    let cage = g.createRadialGradient(32, 24, 3, 32, 24, 17);
    cage.addColorStop(0, 'rgba(220,224,230,0.3)'); cage.addColorStop(1, 'rgba(120,126,136,0.15)');
    g.fillStyle = cage; g.beginPath(); g.arc(32, 24, 16, 0, 7); g.fill();
    g.strokeStyle = 'rgba(60,64,72,0.6)'; g.lineWidth = 1;            // cage rings
    g.beginPath(); g.arc(32, 24, 16, 0, 7); g.stroke();
    g.beginPath(); g.arc(32, 24, 11, 0, 7); g.stroke();
    g.beginPath(); g.arc(32, 24, 5.5, 0, 7); g.stroke();
    for (let i = 0; i < 10; i++) { const a2 = i / 10 * 6.283; g.beginPath(); g.moveTo(32, 24); g.lineTo(32 + Math.cos(a2) * 16, 24 + Math.sin(a2) * 16); g.stroke(); }
    let blade = g.createLinearGradient(20, 12, 44, 36);               // three visible blades through the cage
    blade.addColorStop(0, '#c7cdd6'); blade.addColorStop(1, '#71767f');
    g.fillStyle = blade;
    for (const r of [0, 2.1, 4.2]) { g.save(); g.translate(32, 24); g.rotate(r); g.beginPath(); g.ellipse(6, 0, 9, 3, 0, 0, 7); g.fill(); g.restore(); }
    g.fillStyle = '#2a2d33'; g.beginPath(); g.arc(32, 24, 2.4, 0, 7); g.fill();   // hub
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.arc(31.2, 23.2, 0.7, 0, 7); g.fill();
  });

  SPR.streetlamp = outlined(g => {                                   // cast-iron Havana street lamp, lit globe
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 62, 8, 2, 0, 0, 7); g.fill();
    let pole = g.createLinearGradient(29, 0, 35, 0);
    pole.addColorStop(0, '#2a2d33'); pole.addColorStop(0.5, '#4a4e56'); pole.addColorStop(1, '#16181c');
    g.fillStyle = pole; g.fillRect(29.6, 20, 4.8, 42);
    g.fillStyle = '#1c1e22'; g.beginPath(); g.moveTo(24, 62); g.lineTo(40, 62); g.lineTo(37, 56); g.lineTo(27, 56); g.closePath(); g.fill();   // base
    g.strokeStyle = 'rgba(255,255,255,0.1)'; g.lineWidth = 1; g.fillRect(30.4, 20, 1.2, 42);
    g.strokeStyle = '#2a2d33'; g.lineWidth = 3;                       // scrollwork arms
    g.beginPath(); g.moveTo(32, 24); g.quadraticCurveTo(20, 24, 18, 16); g.stroke();
    g.beginPath(); g.moveTo(32, 24); g.quadraticCurveTo(44, 24, 46, 16); g.stroke();
    const glow = g.createRadialGradient(32, 10, 1, 32, 10, 13);
    glow.addColorStop(0, 'rgba(255,220,140,0.55)'); glow.addColorStop(1, 'rgba(255,200,110,0)');
    g.fillStyle = glow; g.fillRect(14, -3, 36, 26);
    let globe = g.createRadialGradient(29, 7, 1, 32, 10, 8);
    globe.addColorStop(0, '#fff6d8'); globe.addColorStop(0.6, '#ffd77a'); globe.addColorStop(1, '#c98a2a');
    g.fillStyle = globe; g.beginPath(); g.arc(32, 10, 7.4, 0, 7); g.fill();
    g.fillStyle = '#1c1e22'; g.fillRect(28, 2.4, 8, 2.4); g.fillRect(29, 16.6, 6, 2);   // cap + finial
    [[18, 16], [46, 16]].forEach(([x, y]) => {
      g.fillStyle = globe; g.beginPath(); g.arc(x, y, 4.6, 0, 7); g.fill();
      g.fillStyle = '#1c1e22'; g.fillRect(x - 2.2, y - 6.4, 4.4, 2);
    });
  });

  SPR.umbrella = outlined(g => {                                     // furled umbrella in a brass stand — the tradecraft kind
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(32, 60.5, 12, 2.6, 0, 0, 7); g.fill();
    let stand = g.createLinearGradient(0, 50, 0, 60);
    stand.addColorStop(0, '#d9b45a'); stand.addColorStop(1, '#8a6a2a');
    g.fillStyle = stand; g.beginPath(); g.moveTo(22, 60); g.lineTo(42, 60); g.lineTo(39, 51); g.lineTo(25, 51); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,242,192,0.35)'; g.fillRect(24, 52, 3, 7);
    g.strokeStyle = '#1c1c1e'; g.lineWidth = 2.4;                     // furled shaft
    g.beginPath(); g.moveTo(32, 51); g.lineTo(32, 12); g.stroke();
    g.fillStyle = '#2a2a2c'; g.fillRect(30, 8, 4, 4);                 // furled canopy, wrapped
    g.beginPath(); g.moveTo(28, 12); g.quadraticCurveTo(32, 9, 36, 12); g.quadraticCurveTo(32, 44, 32, 51); g.quadraticCurveTo(31, 20, 28, 12); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(30, 12); g.lineTo(30, 44); g.stroke();
    g.fillStyle = '#c9a227'; g.beginPath(); g.arc(32, 9, 1.6, 0, 7); g.fill();   // tip — a fatal little needle, if you know where to look
    g.strokeStyle = '#3a3d44'; g.lineWidth = 1.6;                     // hooked handle
    g.beginPath(); g.arc(32, 55, 4, Math.PI * 0.1, Math.PI * 1.5); g.stroke();
  });

  SPR.wallclock = outlined(g => {                                    // wall clock, frozen at the hour that matters
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.arc(33, 25, 13, 0, 7); g.fill();
    let rim = g.createRadialGradient(28, 20, 2, 32, 24, 14);
    rim.addColorStop(0, '#e8dcc0'); rim.addColorStop(0.85, '#b8a87c'); rim.addColorStop(1, '#6e5c38');
    g.fillStyle = rim; g.beginPath(); g.arc(32, 24, 13, 0, 7); g.fill();
    g.strokeStyle = '#3a2f1a'; g.lineWidth = 1.4; g.beginPath(); g.arc(32, 24, 13, 0, 7); g.stroke();
    g.fillStyle = '#f4efe0'; g.beginPath(); g.arc(32, 24, 10.4, 0, 7); g.fill();
    g.fillStyle = '#2a2018';                                          // hour ticks
    for (let i = 0; i < 12; i++) { const a2 = i / 12 * 6.283; g.beginPath(); g.arc(32 + Math.cos(a2) * 9, 24 + Math.sin(a2) * 9, i % 3 === 0 ? 0.9 : 0.5, 0, 7); g.fill(); }
    g.strokeStyle = '#1c150e'; g.lineWidth = 1.6; g.lineCap = 'round';   // hands stopped at a quarter to
    g.beginPath(); g.moveTo(32, 24); g.lineTo(32, 17.4); g.stroke();
    g.beginPath(); g.moveTo(32, 24); g.lineTo(26.6, 24); g.stroke();
    g.fillStyle = '#1c150e'; g.beginPath(); g.arc(32, 24, 1, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.2)'; g.beginPath(); g.ellipse(27, 18, 5, 3, -0.5, 0, 7); g.fill();   // glass glint
  });

  SPR.gun = cnv(g => {
    // classic straight-down-the-sights HUD pistol: viewed from directly behind
    // (hammer/rear sight facing camera, barrel pointing away), gripped in a
    // bare fist dead-centre — matches the reference pistol-sprite-sheet pose.
    // ---- fist: bare hand wrapped around the grip, symmetric, top-lit ----
    g.save();
    g.beginPath(); g.moveTo(20, 42); g.lineTo(76, 42); g.lineTo(80, 58); g.lineTo(74, 96); g.lineTo(22, 96); g.lineTo(16, 58); g.closePath(); g.clip();
    vgrad(g, 12, 40, 72, 56, '#a06a3e', '#6b4327');
    g.restore();
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 2;                       // wrist/finger seam down the centre
    g.beginPath(); g.moveTo(48, 46); g.lineTo(48, 94); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2.4;                    // knuckle creases, arcing across
    for (const y of [54, 64, 75, 86]) { g.beginPath(); g.moveTo(22, y); g.quadraticCurveTo(48, y + 5, 74, y); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,0.10)'; g.lineWidth = 1.4;
    for (const y of [51, 61, 72, 83]) { g.beginPath(); g.moveTo(24, y); g.quadraticCurveTo(48, y + 4, 72, y); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.beginPath(); g.ellipse(48, 94, 30, 5, 0, 0, 7); g.fill();  // base shadow

    // ---- frame: the part disappearing into the fist, faceted gunmetal ----
    vgrad(g, 30, 38, 36, 12, '#3a3d44', '#24262c');
    bevel(g, 30, 38, 36, 12, 'rgba(255,255,255,0.12)', 'rgba(0,0,0,0.4)');

    // ---- slide: blocky, symmetric, chamfered top corners, back face toward us ----
    g.beginPath(); g.moveTo(24, 40); g.lineTo(30, 16); g.lineTo(66, 16); g.lineTo(72, 40); g.closePath();
    const slideGrad = g.createLinearGradient(0, 14, 0, 40);
    slideGrad.addColorStop(0, '#54585f'); slideGrad.addColorStop(0.5, '#33363d'); slideGrad.addColorStop(1, '#1d1f24');
    g.fillStyle = slideGrad; g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.5; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1;               // chamfer highlight edges
    g.beginPath(); g.moveTo(30, 16); g.lineTo(24, 40); g.stroke();
    g.beginPath(); g.moveTo(66, 16); g.lineTo(72, 40); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1;                      // centre facet seam
    g.beginPath(); g.moveTo(48, 17); g.lineTo(48, 39); g.stroke();
    g.fillStyle = '#101114'; g.fillRect(33, 26, 12, 9); g.fillRect(51, 26, 12, 9);  // grip-screw recesses
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(33, 26, 12, 2); g.fillRect(51, 26, 12, 2);

    // ---- rear sight ears + cocked hammer, top-centre ----
    g.fillStyle = '#111318'; g.fillRect(28, 12, 9, 7); g.fillRect(59, 12, 9, 7);   // sight ears
    g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(28, 12, 9, 1.5); g.fillRect(59, 12, 9, 1.5);
    g.fillStyle = '#0a0b0d'; g.fillRect(32, 8, 3, 6); g.fillRect(61, 8, 3, 6);      // notch gap detail
    g.fillStyle = '#26282e'; g.beginPath();                                        // hammer spur
    g.arc(48, 10, 8, Math.PI, 0); g.lineTo(54, 15); g.lineTo(42, 15); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.16)'; g.beginPath(); g.arc(45, 7, 3, Math.PI * 1.1, Math.PI * 1.7); g.fill();
    g.fillStyle = '#0a0b0d'; g.beginPath(); g.arc(48, 12, 2.5, 0, 7); g.fill();     // firing-pin channel

    speck(g, 30, 'rgba(255,255,255,0.05)', 96, 96);                         // fine metal grain
    speck(g, 14, 'rgba(0,0,0,0.06)', 96, 96);
  }, 96, 96);

  // -------------------------------------------------------------------------
  // CUSTOM ART — swap any procedural texture/sprite for an uploaded image.
  // Overrides persist as data URLs in localStorage (shared by the game and
  // the editor, same origin) so they survive reloads and apply everywhere.
  // The original procedural canvases are snapshotted first so "reset" always
  // has something real to go back to.
  // -------------------------------------------------------------------------
  const SPRNAMES = ['goon', 'corpse', 'agentCase', 'agent', 'desk', 'deskOpen', 'tube', 'medkit', 'ammo', 'plant', 'bar', 'gun'];
  const CUSTOM_KEY = 'cloakclick.customArt';
  const DEFAULT_TX = Object.assign({}, TX);
  const DEFAULT_SPR = Object.assign({}, SPR);
  let customArt = { tex: {}, spr: {} };                   // name -> data URL, the persisted override set

  function fitCanvas(img, w, h) {                          // "cover" scale into a w×h canvas, centred, cropped
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    const s = Math.max(w / img.width, h / img.height);
    const dw = img.width * s, dh = img.height * s;
    g.imageSmoothingEnabled = true;
    g.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    return c;
  }
  function persistCustomArt() {
    try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(customArt)); } catch (e) {}
  }
  function setCustomTex(name, img) {
    if (!DEFAULT_TX[name]) return;
    TX[name] = fitCanvas(img, DEFAULT_TX[name].width, DEFAULT_TX[name].height);
    customArt.tex[name] = TX[name].toDataURL();
    persistCustomArt();
  }
  function setCustomSpr(name, img) {
    if (!DEFAULT_SPR[name]) return;
    SPR[name] = fitCanvas(img, DEFAULT_SPR[name].width, DEFAULT_SPR[name].height);
    if (name === 'goon') SPR.goonFlash = whiteOf(SPR.goon);   // keep the hit-flash silhouette in sync
    customArt.spr[name] = SPR[name].toDataURL();
    persistCustomArt();
  }
  function resetTex(name) { if (DEFAULT_TX[name]) { TX[name] = DEFAULT_TX[name]; delete customArt.tex[name]; persistCustomArt(); } }
  function resetSpr(name) {
    if (!DEFAULT_SPR[name]) return;
    SPR[name] = DEFAULT_SPR[name];
    if (name === 'goon') SPR.goonFlash = DEFAULT_SPR.goonFlash;
    delete customArt.spr[name]; persistCustomArt();
  }
  const isCustomTex = name => !!customArt.tex[name];
  const isCustomSpr = name => !!customArt.spr[name];
  (function loadCustomArt() {                               // apply any saved overrides at boot
    try {
      const raw = localStorage.getItem(CUSTOM_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      customArt = { tex: saved.tex || {}, spr: saved.spr || {} };
      for (const name of Object.keys(customArt.tex)) {
        if (!DEFAULT_TX[name]) continue;
        const img = new Image();
        img.onload = () => { TX[name] = fitCanvas(img, DEFAULT_TX[name].width, DEFAULT_TX[name].height); };
        img.src = customArt.tex[name];
      }
      for (const name of Object.keys(customArt.spr)) {
        if (!DEFAULT_SPR[name]) continue;
        const img = new Image();
        img.onload = () => { SPR[name] = fitCanvas(img, DEFAULT_SPR[name].width, DEFAULT_SPR[name].height); if (name === 'goon') SPR.goonFlash = whiteOf(SPR.goon); };
        img.src = customArt.spr[name];
      }
    } catch (e) { console.warn('Custom art failed to load.', e); }
  })();

  // -------------------------------------------------------------------------
  // Entity factories, keyed by the `kind` stored in level data
  // -------------------------------------------------------------------------
  // Every plain prop is destructible by default: hp:20, and a generic charred/
  // wrecked look on death (no bespoke broken-object art needed per kind). A prop
  // that supplies its OWN `getTex` in `extra` (desk's open/closed, agent's
  // has-case) keeps that custom logic verbatim — Object.assign below lets `extra`
  // win — so those stay visually unaffected here; main.js separately excludes a
  // short list of quest-critical kinds (agent/tube/desk) from ever taking damage
  // at all, since destroying them could strand the puzzle chain.
  const prop = (kind, name, x, y, scale, solid, extra) =>
    Object.assign({ kind, name, x, y, scale, solid, dead: false, hp: 20, flash: 0,
      getTex() { return this.dead ? charredTex(kind) : SPR[kind]; } }, extra);

  const FACT = {
    goon: (x, y) => ({
      kind: 'goon', name: 'HENCHMAN', x, y, solid: true, scale: 0.82,
      hp: 45, dead: false, aggro: false, atkT: 0, flash: 0,
      getTex() { return this.dead ? SPR.corpse : (this.flash > 0 ? SPR.goonFlash : SPR.goon); },
    }),
    agent: (x, y) => prop('agent', 'AGENT 004', x, y, 0.55, false,
      { has: true, getTex() { return this.has ? SPR.agentCase : SPR.agent; } }),
    desk: (x, y) => prop('desk', "VOLKOV'S DESK", x, y, 0.85, true,
      { open: false, getTex() { return this.open ? SPR.deskOpen : SPR.desk; } }),
    tube: (x, y) => prop('tube', 'VACUUM TUBE', x, y, 0.32, false),
    plant: (x, y) => prop('plant', 'POTTED PALM', x, y, 0.7, false),
    bar: (x, y) => prop('bar', 'BAR CART', x, y, 0.85, true),
    medkit: (x, y) => prop('medkit', 'FIRST-AID TIN', x, y, 0.34, false, { pickup: 'med' }),
    ammo: (x, y) => prop('ammo', 'AMMO BOX', x, y, 0.34, false, { pickup: 'ammo' }),
    camera: (x, y) => prop('camera', 'SPY CAMERA', x, y, 0.4, false),
    safe: (x, y) => prop('safe', 'WALL SAFE', x, y, 0.8, true),
    filecab: (x, y) => prop('filecab', 'FILING CABINET', x, y, 0.82, true),
    globe: (x, y) => prop('globe', 'DESK GLOBE', x, y, 0.6, false),
    briefcase: (x, y) => prop('briefcase', 'ATTACHÉ CASE', x, y, 0.55, false),
    radio: (x, y) => prop('radio', 'SHORTWAVE SET', x, y, 0.75, true),
    typewriter: (x, y) => prop('typewriter', 'TYPEWRITER', x, y, 0.45, false),
    cigarcrate: (x, y) => prop('cigarcrate', 'CIGAR CRATE', x, y, 0.6, true),
    deskfan: (x, y) => prop('deskfan', 'DESK FAN', x, y, 0.55, false),
    streetlamp: (x, y) => prop('streetlamp', 'STREET LAMP', x, y, 1.0, true),
    umbrella: (x, y) => prop('umbrella', 'UMBRELLA STAND', x, y, 0.55, false),
    wallclock: (x, y) => prop('wallclock', 'WALL CLOCK', x, y, 0.4, false),
    brute: (x, y) => ({
      kind: 'brute', name: 'BRUTE', x, y, solid: true, scale: 0.92,
      hp: 90, dead: false, aggro: false, atkT: 0, flash: 0,
      getTex() { return this.dead ? SPR.bruteCorpse : (this.flash > 0 ? SPR.bruteFlash : SPR.brute); },
    }),
    sniper: (x, y) => ({
      kind: 'sniper', name: 'SNIPER', x, y, solid: true, scale: 0.8,
      hp: 28, dead: false, aggro: false, atkT: 0, flash: 0,
      getTex() { return this.dead ? SPR.sniperCorpse : (this.flash > 0 ? SPR.sniperFlash : SPR.sniper); },
    }),
    // neutral Havana locals: `behavior` is 'wander' (default) or 'stationary', authored per-entity.
    // Low HP — any hit ends them; three dead civilians ends the mission (see main.js).
    civilianM: (x, y, e) => ({
      kind: 'civilianM', name: 'LOCAL', x, y, solid: false, scale: 0.72, hp: 1, dead: false, flash: 0,
      behavior: (e && e.behavior) || 'wander', anchorX: x, anchorY: y, wx: x, wy: y, wanderT: Math.random() * 3,
      getTex() { return this.dead ? SPR.civilianCorpse : SPR.civilianM; },
    }),
    civilianF: (x, y, e) => ({
      kind: 'civilianF', name: 'LOCAL', x, y, solid: false, scale: 0.72, hp: 1, dead: false, flash: 0,
      behavior: (e && e.behavior) || 'wander', anchorX: x, anchorY: y, wx: x, wy: y, wanderT: Math.random() * 3,
      getTex() { return this.dead ? SPR.civilianCorpse : SPR.civilianF; },
    }),
    sedan: (x, y) => prop('sedan', 'PARKED SEDAN', x, y, 1.3, true),
    motorcycle: (x, y) => prop('motorcycle', 'MOTORCYCLE', x, y, 1.0, true),
    phonebooth: (x, y) => prop('phonebooth', 'PHONE BOOTH', x, y, 0.85, true),
    parkbench: (x, y) => prop('parkbench', 'PARK BENCH', x, y, 0.9, true),
    newsstand: (x, y) => prop('newsstand', 'NEWSSTAND', x, y, 0.95, true),
    oildrum: (x, y) => prop('oildrum', 'OIL DRUM', x, y, 0.55, true),
    cratestack: (x, y) => prop('cratestack', 'CRATE STACK', x, y, 0.85, true),
    guardpost: (x, y) => prop('guardpost', 'GUARD POST', x, y, 0.95, true),
    firehydrant: (x, y) => prop('firehydrant', 'FIRE HYDRANT', x, y, 0.4, true),
    satdish: (x, y) => prop('satdish', 'SATELLITE DISH', x, y, 0.75, true),
  };

  function removeEnt(ent) {
    const i = ents.indexOf(ent);
    if (i >= 0) ents.splice(i, 1);
  }

  // -------------------------------------------------------------------------
  // Level loading
  // -------------------------------------------------------------------------
  function defaultLevel() { return JSON.parse(JSON.stringify(DEFAULT)); }

  function load(level) {
    MW = level.w; MH = level.h;
    grid = []; winCells.clear();
    fgrid = new Float64Array(MW * MH).fill(NaN);
    cgrid = new Float64Array(MW * MH).fill(NaN);
    fsxg = new Float64Array(MW * MH);
    fsyg = new Float64Array(MW * MH);
    stexg = new Array(MW * MH).fill(null);
    ctexg = new Array(MW * MH).fill(null);
    for (let y = 0; y < MH; y++) {
      grid[y] = [];
      const row = level.map[y] || '';
      const frow = level.floor && level.floor[y];
      const crow = level.ceil && level.ceil[y];
      const strow = level.stex && level.stex[y];
      const ctrow = level.ctex && level.ctex[y];
      const fsxrow = level.fsx && level.fsx[y];
      const fsyrow = level.fsy && level.fsy[y];
      for (let x = 0; x < MW; x++) {
        const c = (CH[row[x]] !== undefined) ? row[x] : '.';
        grid[y][x] = c;
        if (SURF[c] && SURF[c].win) winCells.add(x + ',' + y);
        if (frow && frow[x] != null) fgrid[y * MW + x] = frow[x];
        if (crow && crow[x] != null) cgrid[y * MW + x] = crow[x];
        if (strow && strow[x] && TX[strow[x]]) stexg[y * MW + x] = strow[x];
        if (ctrow && ctrow[x] && TX[ctrow[x]]) ctexg[y * MW + x] = ctrow[x];
        if (fsxrow && fsxrow[x]) fsxg[y * MW + x] = fsxrow[x];
        if (fsyrow && fsyrow[x]) fsyg[y * MW + x] = fsyrow[x];
      }
    }
    ents.length = 0;
    for (const e of level.ents) if (FACT[e.kind]) ents.push(FACT[e.kind](e.x, e.y, e));
    spawn.x = level.spawn.x; spawn.y = level.spawn.y; spawn.a = level.spawn.a;
    TEX[T.EXIT] = blastDoor(false);
    TEX[T.MAINFRAME] = mainframe(false);
    // vector-first levels ship their own geo → use it verbatim as the runtime geometry
    authoredGeo = (level.geo && level.geo.sectors && level.geo.sectors.length) ? {
      verts: level.geo.verts.map(v => ({ x: v.x, y: v.y })),
      sectors: level.geo.sectors.map(s => ({
        loop: s.loop.slice(), floor: s.floor || 0, ceil: s.ceil == null ? 1 : s.ceil,
        floorTex: s.floorTex || 'carpet', ceilTex: s.ceilTex || 'ceiltile', sky: !!s.sky, win: !!s.win,
        texScale: s.texScale || 1, wallDoor: s.wallDoor ? s.wallDoor.slice() : undefined,
        wallTex: s.wallTex ? s.wallTex.slice() : undefined,
        wallTexScale: s.wallTexScale ? s.wallTexScale.slice() : undefined,
        parent: s.parent == null ? -1 : s.parent, solid: !!s.solid,
      })),
    } : null;
    geoRev++;                                     // new geometry → callers recompile
  }

  // Boot: ?level=custom loads the editor's level from localStorage
  let boot = defaultLevel();
  try {
    if (new URLSearchParams(location.search).get('level') === 'custom') {
      const raw = localStorage.getItem('cloakclick.custom');
      if (raw) { boot = JSON.parse(raw); isCustom = true; }
    }
  } catch (e) { console.warn('Custom level failed to load, using default.', e); }
  load(boot);

  return {
    T, CH, SURF, get, set, isSolid, winAt, charAt, surfAt, floorZAt,
    setFloorZ, setCeilZ, setSurfTex, setCeilTex, setFloorSlope, compileGeo, getGeo,
    TEX, SPR, FLOOR, SKY, TX, TXNAMES, wallTex, wallTexName, WALLTX,
    ents, removeEnt, setPowered,
    spawn, load, defaultLevel, get isCustom() { return isCustom; }, get geoRev() { return geoRev; },
  };
})();
