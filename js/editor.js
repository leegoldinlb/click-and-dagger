'use strict';

// LAIR ARCHITECT — level editor. Produces the same level JSON that
// World.load() consumes; SAVE & PLAY hands it to the game via localStorage.
const Editor = (() => {
  const LS_KEY = 'cloakclick.custom';
  const T = World.T;

  const TILES = [
    { ch: '.', name: 'FLOOR' },
    { ch: '#', name: 'TEAK WALL', tex: T.TEAK },
    { ch: '%', name: 'LAIR WALL', tex: T.LAIR },
    { ch: 'C', name: 'RADIO DOOR', tex: T.RADIO },
    { ch: 'E', name: 'BLAST DOOR', tex: T.EXIT },
    { ch: 'F', name: 'MAINFRAME', tex: T.MAINFRAME },
    { ch: 'P', name: 'POSTER', tex: T.POSTER },
    { ch: 'r', name: 'RAISED', floor: 'metal', tag: '▲' },
    { ch: 'p', name: 'SUNKEN', floor: 'lounge', tag: '▼' },
    { ch: 'l', name: 'LOW CEIL', floor: 'carpet', tag: '▁' },
    { ch: 'o', name: 'OUTDOOR', floor: 'ground', tag: '☼' },
    { ch: 'w', name: 'HELIPAD', floor: 'helipad', tag: 'H' },
  ];
  // map chars that are floor sectors → the floor texture drawn top-down
  const FLOORNAME = { r: 'metal', p: 'lounge', l: 'carpet', o: 'ground', w: 'helipad' };
  const ENTS = [
    { kind: 'goon', name: 'HENCHMAN', spr: 'goon' },
    { kind: 'agent', name: 'AGENT 004', spr: 'agentCase' },
    { kind: 'desk', name: 'DESK', spr: 'desk' },
    { kind: 'tube', name: 'TUBE', spr: 'tube' },
    { kind: 'plant', name: 'PALM', spr: 'plant' },
    { kind: 'royalpalm', name: 'ROYAL PALM', spr: 'royalpalm' },
    { kind: 'bananaplant', name: 'BANANA TREE', spr: 'bananaplant' },
    { kind: 'bougainvillea', name: 'BOUGAINVILLEA', spr: 'bougainvillea' },
    { kind: 'fern', name: 'POTTED FERN', spr: 'fern' },
    { kind: 'cactus', name: 'POTTED CACTUS', spr: 'cactus' },
    { kind: 'hedge', name: 'HEDGE', spr: 'hedge' },
    { kind: 'bar', name: 'BAR CART', spr: 'bar' },
    { kind: 'medkit', name: 'FIRST-AID', spr: 'medkit' },
    { kind: 'ammo', name: 'AMMO', spr: 'ammo' },
    { kind: 'wpn_sterling', name: 'STERLING CASE', spr: 'wpn_sterling' },
    { kind: 'wpn_ar7', name: 'AR-7 CASE', spr: 'wpn_ar7' },
    { kind: 'wpn_laser', name: 'LASER GADGET', spr: 'wpn_laser' },
    { kind: 'wpn_golden', name: 'GOLDEN GUN', spr: 'wpn_golden' },
    { kind: 'camera', name: 'CAMERA', spr: 'camera' },
    { kind: 'disguise', name: 'DISGUISE KIT', spr: 'disguise' },
    { kind: 'book', name: 'OPEN BOOK', spr: 'book' },
    { kind: 'safe', name: 'SAFE', spr: 'safe' },
    { kind: 'letter', name: 'CODED LETTER', spr: 'letter' },
    { kind: 'telegram', name: 'TELEGRAM', spr: 'telegram' },
    { kind: 'businesscard', name: 'BUSINESS CARD', spr: 'businesscard' },
    { kind: 'watch', name: 'POCKET WATCH', spr: 'watch' },
    { kind: 'personnelfile', name: 'PERSONNEL FILE', spr: 'personnelfile' },
    { kind: 'microfiche', name: 'MICROFICHE', spr: 'microfiche' },
    { kind: 'screwdriver', name: 'SCREWDRIVER', spr: 'screwdriver' },
    { kind: 'pliers', name: 'PLIERS', spr: 'pliers' },
    { kind: 'ciphermachine', name: 'CIPHER MACHINE', spr: 'ciphermachine' },
    { kind: 'bomb', name: 'THE BOMB', spr: 'bomb' },
    { kind: 'microfichemachine', name: 'MICROFICHE VIEWER', spr: 'microfichemachine' },
    { kind: 'sportscar', name: 'SPORTS CAR', spr: 'sportscar' },
    { kind: 'filecab', name: 'FILE CABINET', spr: 'filecab' },
    { kind: 'globe', name: 'GLOBE', spr: 'globe' },
    { kind: 'briefcase', name: 'BRIEFCASE', spr: 'briefcase' },
    { kind: 'radio', name: 'SHORTWAVE', spr: 'radio' },
    { kind: 'typewriter', name: 'TYPEWRITER', spr: 'typewriter' },
    { kind: 'cigarcrate', name: 'CIGAR CRATE', spr: 'cigarcrate' },
    { kind: 'deskfan', name: 'DESK FAN', spr: 'deskfan' },
    { kind: 'streetlamp', name: 'STREET LAMP', spr: 'streetlamp' },
    { kind: 'umbrella', name: 'UMBRELLA', spr: 'umbrella' },
    { kind: 'wallclock', name: 'WALL CLOCK', spr: 'wallclock' },
    { kind: 'brute', name: 'BRUTE', spr: 'brute' },
    { kind: 'sniper', name: 'SNIPER', spr: 'sniper' },
    { kind: 'blackbelt', name: 'BLACKBELT', spr: 'blackbelt' },
    { kind: 'soviet', name: 'SOVIET SOLDIER', spr: 'soviet' },
    { kind: 'spy', name: 'ENEMY SPY', spr: 'spy' },
    { kind: 'lao', name: 'LAO', spr: 'lao' },
    { kind: 'baldini', name: 'THE GREAT BALDINI', spr: 'baldini' },
    { kind: 'wilson', name: 'WILSON', spr: 'wilson' },
    { kind: 'fiona', name: 'FIONA', spr: 'fiona' },
    { kind: 'tv', name: 'TV', spr: 'tv' },
    { kind: 'sheetmusic', name: 'SHEET MUSIC', spr: 'sheetmusic' },
    { kind: 'civilianM', name: 'CIVILIAN (M)', spr: 'civilianM' },
    { kind: 'civilianF', name: 'CIVILIAN (F)', spr: 'civilianF' },
    { kind: 'vendor', name: 'VENDOR', spr: 'vendor' },
    { kind: 'waiter', name: 'WAITER', spr: 'waiter' },
    { kind: 'tourist', name: 'TOURIST', spr: 'tourist' },
    { kind: 'officer', name: 'POLICE OFFICER', spr: 'officer' },
    { kind: 'fisherman', name: 'FISHERMAN', spr: 'fisherman' },
    { kind: 'flowergirl', name: 'FLOWER GIRL', spr: 'flowergirl' },
    { kind: 'carlotta', name: 'CARLOTTA', spr: 'carlotta' },
    { kind: 'drz', name: 'DR. Z', spr: 'drz' },
    { kind: 'defector', name: 'THE DEFECTOR', spr: 'defector' },
    { kind: 'agent005', name: 'AGENT 005', spr: 'agent005' },
    { kind: 'sedan', name: 'SEDAN', spr: 'sedan' },
    { kind: 'bug', name: 'VW BUG', spr: 'bug' },
    { kind: 'motorcycle', name: 'MOTORCYCLE', spr: 'motorcycle' },
    { kind: 'phonebooth', name: 'PHONE BOOTH', spr: 'phonebooth' },
    { kind: 'parkbench', name: 'PARK BENCH', spr: 'parkbench' },
    { kind: 'newsstand', name: 'NEWSSTAND', spr: 'newsstand' },
    { kind: 'oildrum', name: 'OIL DRUM', spr: 'oildrum' },
    { kind: 'cratestack', name: 'CRATE STACK', spr: 'cratestack' },
    { kind: 'guardpost', name: 'GUARD POST', spr: 'guardpost' },
    { kind: 'firehydrant', name: 'FIRE HYDRANT', spr: 'firehydrant' },
    { kind: 'satdish', name: 'SAT. DISH', spr: 'satdish' },
    { kind: 'mailbox', name: 'MAILBOX', spr: 'mailbox' },
    { kind: 'trashcan', name: 'TRASH CAN', spr: 'trashcan' },
    { kind: 'bicycle', name: 'BICYCLE', spr: 'bicycle' },
    { kind: 'trafficlight', name: 'TRAFFIC LIGHT', spr: 'trafficlight' },
    { kind: 'watertower', name: 'WATER TOWER', spr: 'watertower' },
    { kind: 'barrier', name: 'BARRIER', spr: 'barrier' },
    { kind: 'vendingmachine', name: 'VENDING MACHINE', spr: 'vendingmachine' },
    { kind: 'flowercart', name: 'FLOWER CART', spr: 'flowercart' },
    { kind: 'bed', name: 'BED', spr: 'bed' },
    { kind: 'sofa', name: 'SOFA', spr: 'sofa' },
    { kind: 'armchair', name: 'ARMCHAIR', spr: 'armchair' },
    { kind: 'diningtable', name: 'DINING TABLE', spr: 'diningtable' },
    { kind: 'bookshelf', name: 'BOOKSHELF', spr: 'bookshelf' },
    { kind: 'icebox', name: 'ICEBOX', spr: 'icebox' },
    { kind: 'recordplayer', name: 'RECORD PLAYER', spr: 'recordplayer' },
    { kind: 'wardrobe', name: 'WARDROBE', spr: 'wardrobe' },
    { kind: 'officechair', name: 'OFFICE CHAIR', spr: 'officechair' },
    { kind: 'watercooler', name: 'WATER COOLER', spr: 'watercooler' },
    { kind: 'coatrack', name: 'COAT RACK', spr: 'coatrack' },
    { kind: 'corkboard', name: 'CORKBOARD', spr: 'corkboard' },
    { kind: 'cashregister', name: 'CASH REGISTER', spr: 'cashregister' },
    { kind: 'wallmap', name: 'WALL MAP', spr: 'wallmap' },
    { kind: 'conftable', name: 'CONFERENCE TABLE', spr: 'conftable' },
    { kind: 'punchclock', name: 'PUNCH CLOCK', spr: 'punchclock' },
    { kind: 'bazaarstall', name: 'BAZAAR STALL', spr: 'bazaarstall' },
    { kind: 'spicesacks', name: 'SPICE SACKS', spr: 'spicesacks' },
    { kind: 'brasslantern', name: 'BRASS LANTERN', spr: 'brasslantern' },
    { kind: 'hookah', name: 'HOOKAH', spr: 'hookah' },
    { kind: 'urn', name: 'CERAMIC URN', spr: 'urn' },
    { kind: 'cratesarabic', name: 'MARKET CRATES', spr: 'cratesarabic' },
    { kind: 'well', name: 'STONE WELL', spr: 'well' },
    { kind: 'handcart', name: 'MARKET HANDCART', spr: 'handcart' },
    { kind: 'cafetable', name: 'BISTRO TABLE', spr: 'cafetable' },
    { kind: 'streetkiosk', name: 'ADVERTISING KIOSK', spr: 'streetkiosk' },
    { kind: 'vespa', name: 'VESPA SCOOTER', spr: 'vespa' },
    { kind: 'easel', name: "ARTIST'S EASEL", spr: 'easel' },
    { kind: 'boulevardlamp', name: 'BOULEVARD LAMP', spr: 'boulevardlamp' },
    { kind: 'champagnebucket', name: 'CHAMPAGNE BUCKET', spr: 'champagnebucket' },
    { kind: 'jukebox', name: 'JUKEBOX', spr: 'jukebox' },
    { kind: 'metroentrance', name: 'METRO ENTRANCE', spr: 'metroentrance' },
    { kind: 'eiffeltower', name: 'EIFFEL TOWER', spr: 'eiffeltower' },
    { kind: 'arcdetriomphe', name: 'ARC DE TRIOMPHE', spr: 'arcdetriomphe' },
    { kind: 'notredame', name: 'NOTRE-DAME', spr: 'notredame' },
    { kind: 'louvrepyramid', name: 'LOUVRE PYRAMID', spr: 'louvrepyramid' },
    { kind: 'moulinrouge', name: 'MOULIN ROUGE', spr: 'moulinrouge' },
    { kind: 'sacrecoeur', name: 'SACRÉ-CŒUR', spr: 'sacrecoeur' },
    { kind: 'parisbar', name: 'PARIS BAR', spr: 'parisbar' },
    { kind: 'stationwagon', name: 'STATION WAGON', spr: 'stationwagon' },
    { kind: 'mailboxpost', name: 'MAILBOX', spr: 'mailboxpost' },
    { kind: 'bbqgrill', name: 'BBQ GRILL', spr: 'bbqgrill' },
    { kind: 'tvconsole', name: 'TV CONSOLE', spr: 'tvconsole' },
    { kind: 'lawnmower', name: 'LAWNMOWER', spr: 'lawnmower' },
    { kind: 'swingset', name: 'SWING SET', spr: 'swingset' },
    { kind: 'picnictable', name: 'PICNIC TABLE', spr: 'picnictable' },
    { kind: 'sprinkler', name: 'LAWN SPRINKLER', spr: 'sprinkler' },
    { kind: 'laborstatue', name: 'LABOR STATUE', spr: 'laborstatue' },
    { kind: 'samovar', name: 'SAMOVAR', spr: 'samovar' },
    { kind: 'posterboard', name: 'PROPAGANDA POSTER', spr: 'posterboard' },
    { kind: 'payphone', name: 'STREET PAYPHONE', spr: 'payphone' },
    { kind: 'stalinistlamp', name: 'STALINIST LAMP', spr: 'stalinistlamp' },
    { kind: 'sputnikmodel', name: 'SPUTNIK MONUMENT', spr: 'sputnikmodel' },
    { kind: 'vodkacrate', name: 'VODKA CRATE', spr: 'vodkacrate' },
    { kind: 'radioset', name: 'RADIO SET', spr: 'radioset' },
    { kind: 'warehousebuilding', name: 'WAREHOUSE BUILDING', spr: 'warehousebuilding' },
    { kind: 'pergolacolonnade', name: 'CONCRETE PERGOLA', spr: 'pergolacolonnade' },
    { kind: 'vintagelamppost', name: 'VINTAGE LAMPPOST', spr: 'vintagelamppost' },
    { kind: 'streetsign', name: 'STREET SIGN', spr: 'streetsign' },
    { kind: 'newspaperbox', name: 'NEWSPAPER BOX', spr: 'newspaperbox' },
    { kind: 'sedan1963', name: "'63 SEDAN", spr: 'sedan1963' },
    { kind: 'flagpole', name: 'FLAGPOLE', spr: 'flagpole' },
    { kind: 'stormdrain', name: 'STORM DRAIN', spr: 'stormdrain' },
    { kind: 'yellowcab', name: 'YELLOW CAB', spr: 'yellowcab' },
    { kind: 'policecarny', name: 'POLICE CRUISER', spr: 'policecarny' },
    { kind: 'hotdogcart', name: 'HOT DOG CART', spr: 'hotdogcart' },
    { kind: 'subwaygrate', name: 'SUBWAY GRATE', spr: 'subwaygrate' },
    { kind: 'glassbooth', name: 'PHONE BOOTH', spr: 'glassbooth' },
    { kind: 'worldsfair', name: "WORLD'S FAIR UNISPHERE", spr: 'worldsfair' },
    { kind: 'fireescape', name: 'FIRE ESCAPE', spr: 'fireescape' },
    { kind: 'brownstonestoop', name: 'BROWNSTONE STOOP', spr: 'brownstonestoop' },
    { kind: 'rickshaw', name: 'RICKSHAW', spr: 'rickshaw' },
    { kind: 'junkboat', name: 'JUNK BOAT', spr: 'junkboat' },
    { kind: 'dimsumcart', name: 'DIM SUM CART', spr: 'dimsumcart' },
    { kind: 'mahjongtable', name: 'MAHJONG TABLE', spr: 'mahjongtable' },
    { kind: 'neonsignboard', name: 'NEON SIGNBOARD', spr: 'neonsignboard' },
    { kind: 'lanternstring', name: 'PAPER LANTERNS', spr: 'lanternstring' },
    { kind: 'teastall', name: 'TEA STALL', spr: 'teastall' },
    { kind: 'hongkongbar', name: 'HONG KONG BAR', spr: 'hongkongbar' },
    { kind: 'birdcage', name: 'BIRD CAGE', spr: 'birdcage' },
    { kind: 'matron', name: 'THE MATRON', spr: 'matron' },
    { kind: 'streetartist', name: 'STREET ARTIST', spr: 'streetartist' },
    { kind: 'headshot', name: "MATRON'S HEADSHOT", spr: 'headshot' },
    { kind: 'metroticket', name: 'METRO TICKET', spr: 'metroticket' },
    { kind: 'fabergeegg', name: 'FABERGÉ EGG', spr: 'fabergeegg' },
    { kind: 'laundrylady', name: 'LAUNDRY LADY', spr: 'laundrylady' },
    { kind: 'double', name: 'THE DOUBLE', spr: 'double' },
    { kind: 'patsy', name: 'THE PATSY', spr: 'patsy' },
    { kind: 'nixonmask', name: 'NIXON MASK', spr: 'nixonmask' },
    { kind: 'maskstand', name: 'MASK STAND', spr: 'maskstand' },
    { kind: 'laundryticket', name: 'LAUNDRY TICKET', spr: 'laundryticket' },
    { kind: 'package', name: 'WRAPPED PACKAGE', spr: 'package' },
    { kind: 'curtainrods', name: 'CURTAIN RODS', spr: 'curtainrods' },
    { kind: 'suitrack', name: 'GARMENT RACK', spr: 'suitrack' },
  ];
  const CIVILIAN_KINDS = new Set(['civilianM', 'civilianF', 'vendor', 'waiter', 'tourist', 'officer', 'fisherman', 'flowergirl', 'carlotta', 'drz', 'defector', 'matron', 'streetartist', 'laundrylady', 'double', 'patsy']);      // neutral — placed with a default wander behavior
  const WEAPON_KINDS = new Set(['medkit', 'ammo', 'wpn_sterling', 'wpn_ar7', 'wpn_laser', 'wpn_golden', 'camera', 'disguise']);  // pulled out of PERSONNEL & PROPS into their own WEAPONS & POWER-UPS palette
  const PERSONNEL_KINDS = new Set(['goon', 'agent', 'brute', 'sniper', 'blackbelt', 'soviet', 'spy', 'civilianM', 'civilianF', 'vendor', 'waiter', 'tourist', 'officer', 'fisherman', 'flowergirl', 'carlotta', 'drz', 'defector', 'agent005', 'matron', 'streetartist', 'laundrylady', 'double', 'patsy', 'lao', 'baldini', 'wilson', 'fiona']);
  const ITEM_KINDS = new Set(['tube', 'letter', 'telegram', 'businesscard', 'watch', 'personnelfile', 'microfiche', 'screwdriver', 'pliers', 'headshot', 'metroticket', 'fabergeegg', 'nixonmask', 'laundryticket', 'package', 'sheetmusic']);  // small TAKE-able objects that end up in the field kit — everything else placeable is a fixed prop
  const CHTEX = { '#': T.TEAK, '%': T.LAIR, 'C': T.RADIO, 'E': T.EXIT, 'F': T.MAINFRAME, 'P': T.POSTER };

  // ---- state ----
  // fh/ch: per-cell floor/ceil height overrides (null = material default)
  // stex/ctex: per-cell surface(floor/wall) and ceiling texture overrides (null = default)
  const lv = { w: 24, h: 24, cells: [], fh: [], ch: [], stex: [], ctex: [], fsx: [], fsy: [], spawn: { x: 2.5, y: 2.5, a: 0 }, ents: [], blown: false, musicUndercover: 'undercover', musicCoverBlown: 'coverblown' };
  let tool = { t: 'tile', v: '#' };
  let entBtns = [];                                              // ENTS-index → palette button, for keyboard/wheel cycling
  const hset = { f: 0.0, c: 1.0, applyF: true, applyC: false };  // height-tool settings
  const texset = { name: 'brick', target: 'surf' };              // texture-tool settings
  let eyedrop = false;
  let rectMode = false, rectStart = null;                       // rectangle bulk-fill
  // 3D-preview starting viewpoint, settable from the 2D map (CAMERA tool) so you
  // can pan/scroll to a distant part of a big map and land exactly there when
  // switching to 3D, instead of always restarting at spawn / a sector corner.
  // Also kept in sync on every preview exit, so simply toggling 3D→2D→3D resumes
  // wherever you last stood — that's the "camera stays put" half of the fix.
  let previewCam = null;
  // ---- vector sector geometry (Build-style DRAW mode) ----
  // verts: {x,y} in world units (float). sectors: { loop:[vertIndices], floor, ceil, parent }.
  const geo = { verts: [], sectors: [] };
  let drawMode = false;
  let draft = [];                                               // vertex indices of the sector being drawn
  const gcur = { x: 0, y: 0, vi: -1 };                          // snapped world cursor + snapped-vertex index
  let hoverEdge = null;                                         // {s, i} hovered wall for I-insert
  let draggingVert = -1;                                        // vertex index being dragged, or -1
  let painting = false;
  let hover = null;
  let cellPx = 28;
  let zoom = 1;                               // map zoom factor (scroll wheel)

  // effective floor/ceil for a cell: override if set, else the material default
  function effH(x, y) {
    const chr = lv.cells[y][x];
    const base = World.SURF[chr];
    if (World.CH[chr] > 0 || !base) return null;   // solid
    const fo = lv.fh[y] ? lv.fh[y][x] : null, co = lv.ch[y] ? lv.ch[y][x] : null;
    return { f: fo != null ? fo : base.f, c: co != null ? co : base.c, custom: fo != null || co != null };
  }

  const cvs = document.getElementById('grid');
  const g = cvs.getContext('2d');
  const statusEl = document.getElementById('status');
  const coordsEl = document.getElementById('coords');
  let statusT = null;

  function status(t) {
    statusEl.textContent = t;
    clearTimeout(statusT);
    statusT = setTimeout(() => { statusEl.textContent = ' '; }, 3500);
  }

  // ---- level <-> editor state ----
  function fromLevel(json) {
    previewCam = null;   // a freshly loaded level has a different coordinate space — don't carry over a stale 3D start point
    lv.w = json.w; lv.h = json.h;
    lv.cells = []; lv.fh = []; lv.ch = []; lv.stex = []; lv.ctex = []; lv.fsx = []; lv.fsy = [];
    for (let y = 0; y < lv.h; y++) {
      const row = json.map[y] || '';
      const frow = json.floor && json.floor[y], crow = json.ceil && json.ceil[y];
      const strow = json.stex && json.stex[y], ctrow = json.ctex && json.ctex[y];
      const fsxrow = json.fsx && json.fsx[y], fsyrow = json.fsy && json.fsy[y];
      lv.cells[y] = []; lv.fh[y] = []; lv.ch[y] = []; lv.stex[y] = []; lv.ctex[y] = []; lv.fsx[y] = []; lv.fsy[y] = [];
      for (let x = 0; x < lv.w; x++) {
        lv.cells[y][x] = World.CH[row[x]] !== undefined ? row[x] : '.';
        lv.fh[y][x] = frow && frow[x] != null ? frow[x] : null;
        lv.ch[y][x] = crow && crow[x] != null ? crow[x] : null;
        lv.stex[y][x] = strow && strow[x] ? strow[x] : null;
        lv.ctex[y][x] = ctrow && ctrow[x] ? ctrow[x] : null;
        lv.fsx[y][x] = fsxrow && fsxrow[x] ? fsxrow[x] : 0;
        lv.fsy[y][x] = fsyrow && fsyrow[x] ? fsyrow[x] : 0;
      }
    }
    lv.spawn = { x: json.spawn.x, y: json.spawn.y, a: json.spawn.a };
    lv.ents = json.ents.map(e => ({ ...e }));                     // keep extra fields (e.g. civilian `behavior`)
    lv.blown = !!json.blown;
    document.getElementById('startblown').checked = lv.blown;
    lv.musicUndercover = json.musicUndercover || 'undercover';
    lv.musicCoverBlown = json.musicCoverBlown || 'coverblown';
    document.getElementById('musicUndercover').value = lv.musicUndercover;
    document.getElementById('musicCoverBlown').value = lv.musicCoverBlown;
    geo.verts = (json.geo && json.geo.verts) ? json.geo.verts.map(v => ({ x: v.x, y: v.y })) : [];
    geo.sectors = (json.geo && json.geo.sectors) ? json.geo.sectors.map(s => ({
      loop: s.loop.slice(), floor: s.floor || 0, ceil: s.ceil == null ? 1 : s.ceil,
      floorTex: s.floorTex || 'carpet', ceilTex: s.ceilTex || 'ceiltile', sky: !!s.sky, skyTex: s.skyTex || null, win: !!s.win, hostile: !!s.hostile,
      texScale: s.texScale || 1, wallDoor: s.wallDoor ? s.wallDoor.slice() : null,
      wallBlock: s.wallBlock ? s.wallBlock.slice() : null,
      wallTex: s.wallTex ? s.wallTex.slice() : null,
      wallTexScale: s.wallTexScale ? s.wallTexScale.slice() : null, parent: s.parent == null ? -1 : s.parent,
      wallStepTex: s.wallStepTex ? s.wallStepTex.slice() : null,
      wallStepFloorTex: s.wallStepFloorTex ? s.wallStepFloorTex.slice() : null,
      wallDecal: s.wallDecal ? s.wallDecal.slice() : null,
      solid: !!s.solid,
    })) : [];
    draft = [];
    document.getElementById('mw').value = lv.w;
    document.getElementById('mh').value = lv.h;
    syncAngleSelect();
    fitCanvas();
    render();
  }

  function toLevel() {
    let anyH = false, anyT = false, anyS = false;
    for (let y = 0; y < lv.h; y++) for (let x = 0; x < lv.w; x++) {
      if ((lv.fh[y] && lv.fh[y][x] != null) || (lv.ch[y] && lv.ch[y][x] != null)) anyH = true;
      if ((lv.stex[y] && lv.stex[y][x]) || (lv.ctex[y] && lv.ctex[y][x])) anyT = true;
      if ((lv.fsx[y] && lv.fsx[y][x]) || (lv.fsy[y] && lv.fsy[y][x])) anyS = true;
    }
    const out = {
      v: anyS ? 4 : anyT ? 3 : anyH ? 2 : 1, w: lv.w, h: lv.h,
      map: lv.cells.map(r => r.join('')),
      spawn: { x: lv.spawn.x, y: lv.spawn.y, a: lv.spawn.a },
      ents: lv.ents.map(e => ({ ...e })),
      blown: !!lv.blown,
      musicUndercover: lv.musicUndercover,
      musicCoverBlown: lv.musicCoverBlown,
    };
    if (anyH) {
      out.floor = lv.fh.map(r => r.map(v => v == null ? null : v));
      out.ceil = lv.ch.map(r => r.map(v => v == null ? null : v));
    }
    if (anyT) {
      out.stex = lv.stex.map(r => r.map(v => v || null));
      out.ctex = lv.ctex.map(r => r.map(v => v || null));
    }
    if (anyS) {
      out.fsx = lv.fsx.map(r => r.map(v => v || 0));
      out.fsy = lv.fsy.map(r => r.map(v => v || 0));
    }
    if (geo.sectors.length) {
      out.geo = {
        verts: geo.verts.map(v => ({ x: v.x, y: v.y })),
        sectors: geo.sectors.map(s => ({ loop: s.loop.slice(), floor: s.floor, ceil: s.ceil, floorTex: s.floorTex, ceilTex: s.ceilTex, sky: !!s.sky, skyTex: s.skyTex || undefined, win: !!s.win, hostile: !!s.hostile, texScale: s.texScale || 1,
          wallDoor: (s.wallDoor && s.wallDoor.some(Boolean)) ? s.wallDoor.slice() : undefined,
          wallBlock: (s.wallBlock && s.wallBlock.some(Boolean)) ? s.wallBlock.slice() : undefined,
          wallTex: (s.wallTex && s.wallTex.some(Boolean)) ? s.wallTex.slice() : undefined,
          wallTexScale: (s.wallTexScale && s.wallTexScale.some(v => v && v !== 1)) ? s.wallTexScale.slice() : undefined,
          wallStepTex: (s.wallStepTex && s.wallStepTex.some(Boolean)) ? s.wallStepTex.slice() : undefined,
          wallStepFloorTex: (s.wallStepFloorTex && s.wallStepFloorTex.some(Boolean)) ? s.wallStepFloorTex.slice() : undefined,
          wallDecal: (s.wallDecal && s.wallDecal.some(Boolean)) ? s.wallDecal.slice() : undefined,
          parent: s.parent, solid: s.solid || undefined })),
      };
      out.v = Math.max(out.v, 5);
    }
    return out;
  }

  function blankLevel(w, h) {
    const map = [];
    for (let y = 0; y < h; y++) {
      map.push((y === 0 || y === h - 1) ? '%'.repeat(w) : '%' + '.'.repeat(w - 2) + '%');
    }
    return { v: 1, w, h, map, spawn: { x: (w >> 1) + 0.5, y: (h >> 1) + 0.5, a: 0 }, ents: [] };
  }

  // ---- palette ----
  function thumb(draw) {
    const c = document.createElement('canvas');
    c.width = 30; c.height = 30;
    draw(c.getContext('2d'));
    return c;
  }
  function toolBtn(parent, label, tc, sel) {
    const b = document.createElement('button');
    b.className = 'tool';
    b.appendChild(tc);
    b.appendChild(document.createTextNode(label));
    b.onclick = () => {
      document.querySelectorAll('.tool').forEach(n => n.classList.remove('sel'));
      b.classList.add('sel');
      sel();
    };
    parent.appendChild(b);
    return b;
  }

  function buildPalette() {
    const tilesEl = document.getElementById('tiles');
    for (const t of TILES) {
      const tc = thumb(gg => {
        gg.imageSmoothingEnabled = false;
        gg.fillStyle = '#241d18'; gg.fillRect(0, 0, 30, 30);
        if (t.tex !== undefined) gg.drawImage(World.TEX[t.tex], 0, 0, 64, 64, 0, 0, 30, 30);
        else if (t.floor) gg.drawImage(World.FLOOR[t.floor], 0, 0, 64, 64, 0, 0, 30, 30);
        if (t.tag) {
          gg.fillStyle = '#0b0b0e'; gg.fillRect(0, 0, 12, 12);
          gg.fillStyle = '#ffd75e'; gg.font = 'bold 10px monospace';
          gg.textAlign = 'center'; gg.textBaseline = 'middle';
          gg.fillText(t.tag, 6, 7);
        }
      });
      const b = toolBtn(tilesEl, t.name, tc, () => { tool = { t: 'tile', v: t.ch }; });
      if (t.ch === tool.v) b.classList.add('sel');
    }
    const propsEl = document.getElementById('propsPal');
    const personnelEl = document.getElementById('personnelPal');
    const itemsEl = document.getElementById('itemsPal');
    const wpnEl = document.getElementById('wpnPal');
    entBtns = ENTS.map(e => {
      const tc = thumb(gg => {
        gg.imageSmoothingEnabled = false;
        gg.fillStyle = '#241d18'; gg.fillRect(0, 0, 30, 30);
        const tx = World.SPR[e.spr];
        gg.drawImage(tx, 0, 0, tx.width, tx.height, 1, 1, 28, 28);   // sample the sprite's OWN size, not a hardcoded
      });                                                              // 64x64 — shipped art can be much bigger than that
      const parent = WEAPON_KINDS.has(e.kind) ? wpnEl : PERSONNEL_KINDS.has(e.kind) ? personnelEl : ITEM_KINDS.has(e.kind) ? itemsEl : propsEl;
      const b = toolBtn(parent, e.name, tc, () => { tool = { t: 'ent', v: e.kind }; });
      if (e.kind === tool.v) b.classList.add('sel');
      return b;
    });
    const spEl = document.getElementById('specials');
    toolBtn(spEl, 'SPAWN', thumb(gg => {
      gg.fillStyle = '#241d18'; gg.fillRect(0, 0, 30, 30);
      drawSpawnArrow(gg, 15, 15, 11, 0);
    }), () => { tool = { t: 'spawn' }; });
    toolBtn(spEl, 'ERASER', thumb(gg => {
      gg.fillStyle = '#241d18'; gg.fillRect(0, 0, 30, 30);
      gg.strokeStyle = '#ff8a3a'; gg.lineWidth = 3;
      gg.beginPath(); gg.moveTo(8, 8); gg.lineTo(22, 22); gg.moveTo(22, 8); gg.lineTo(8, 22); gg.stroke();
    }), () => { tool = { t: 'erase' }; });
    toolBtn(spEl, 'PREVIEW CAM', thumb(gg => {
      gg.fillStyle = '#241d18'; gg.fillRect(0, 0, 30, 30);
      drawCamMarker(gg, 15, 15, 11, 0);
    }), () => { tool = { t: 'campos' }; status('PREVIEW CAM: click the map to set the 3D preview start point. Right-click to clear it.'); });

    const htEl = document.getElementById('htools');
    toolBtn(htEl, 'RAISE/LWR', thumb(gg => {
      gg.fillStyle = '#241d18'; gg.fillRect(0, 0, 30, 30);
      gg.fillStyle = '#7fd0ff';
      gg.beginPath(); gg.moveTo(15, 3); gg.lineTo(9, 11); gg.lineTo(21, 11); gg.fill();
      gg.fillStyle = '#ffb060';
      gg.beginPath(); gg.moveTo(15, 27); gg.lineTo(9, 19); gg.lineTo(21, 19); gg.fill();
    }), () => { tool = { t: 'height' }; });
    toolBtn(htEl, 'FILL ROOM', thumb(gg => {
      gg.fillStyle = '#241d18'; gg.fillRect(0, 0, 30, 30);
      gg.strokeStyle = '#7fe0d8'; gg.lineWidth = 2;
      gg.strokeRect(7, 12, 16, 12);
      gg.fillStyle = '#7fe0d8'; gg.fillRect(7, 18, 16, 6);
      gg.beginPath(); gg.moveTo(15, 4); gg.lineTo(15, 12); gg.stroke();
    }), () => { tool = { t: 'hfill' }; });

    // wire the height inputs
    const hf = document.getElementById('hf'), hc = document.getElementById('hc');
    const hfOn = document.getElementById('hfOn'), hcOn = document.getElementById('hcOn');
    const clampH = v => Math.max(-4, Math.min(8, v));
    hf.oninput = () => { hset.f = clampH(parseFloat(hf.value) || 0); };
    hc.oninput = () => { hset.c = clampH(parseFloat(hc.value) || 1); };
    hfOn.onchange = () => { hset.applyF = hfOn.checked; };
    hcOn.onchange = () => { hset.applyC = hcOn.checked; };
    document.getElementById('hpick').onclick = () => {
      eyedrop = true; status('EYEDROP: CLICK A CELL TO READ ITS HEIGHTS.');
    };

    // texture palette — every registry texture, assignable to any surface
    const texEl = document.getElementById('texpal');
    for (const name of World.TXNAMES) {
      const tc = thumb(gg => {
        gg.imageSmoothingEnabled = false;
        gg.drawImage(World.TX[name], 0, 0, 64, 64, 0, 0, 30, 30);
      });
      const b = toolBtn(texEl, name.toUpperCase(), tc, () => { tool = { t: 'tex' }; texset.name = name; });
      if (name === texset.name) b.dataset.tex = name;
    }
    document.getElementById('textarget').onchange = e => { texset.target = e.target.value; };
  }

  // ---- rendering ----
  function drawPad(gg, px, py, s) {
    gg.strokeStyle = '#ffd75e'; gg.lineWidth = Math.max(1, s / 14);
    gg.beginPath(); gg.arc(px + s / 2, py + s / 2, s * 0.33, 0, 7); gg.stroke();
    gg.fillStyle = '#ffd75e';
    gg.font = 'bold ' + Math.max(7, s * 0.4) + 'px monospace';
    gg.textAlign = 'center'; gg.textBaseline = 'middle';
    gg.fillText('H', px + s / 2, py + s / 2 + 1);
  }

  function tagCell(gg, px, py, s, ch, col) {
    gg.fillStyle = col; gg.font = 'bold ' + Math.max(8, s * 0.6) + 'px monospace';
    gg.textAlign = 'center'; gg.textBaseline = 'middle';
    gg.fillText(ch, px + s / 2, py + s / 2 + 1);
  }

  function drawSpawnArrow(gg, cx, cy, r, a) {
    gg.fillStyle = '#4dff6a';
    gg.save(); gg.translate(cx, cy); gg.rotate(a);
    gg.beginPath();
    gg.moveTo(r, 0); gg.lineTo(-r * 0.6, -r * 0.6); gg.lineTo(-r * 0.25, 0); gg.lineTo(-r * 0.6, r * 0.6);
    gg.closePath(); gg.fill();
    gg.restore();
  }

  // 3D-preview camera marker — a cyan eye/lens circle with a facing wedge, kept
  // visually distinct from the green spawn arrow (spawn = where the MISSION
  // starts; this = where the EDITOR's 3D preview starts, purely an editing aid)
  function drawCamMarker(gg, cx, cy, r, a) {
    gg.save(); gg.translate(cx, cy);
    gg.fillStyle = 'rgba(90,220,255,0.25)'; gg.strokeStyle = '#5adcff'; gg.lineWidth = Math.max(1, r * 0.12);
    gg.beginPath(); gg.arc(0, 0, r * 0.55, 0, 7); gg.fill(); gg.stroke();
    gg.rotate(a);
    gg.beginPath(); gg.moveTo(r * 0.5, 0); gg.lineTo(r * 1.15, -r * 0.5); gg.lineTo(r * 1.15, r * 0.5); gg.closePath();
    gg.fillStyle = '#5adcff'; gg.fill();
    gg.restore();
  }

  function fitCanvas() {
    const base = Math.max(12, Math.min(30, Math.floor(740 / Math.max(lv.w, lv.h))));
    cellPx = Math.max(6, Math.min(160, Math.round(base * zoom)));
    cvs.width = lv.w * cellPx;
    cvs.height = lv.h * cellPx;
    g.imageSmoothingEnabled = false;
  }

  function render() {
    const c = cellPx;
    // vector map: dark background + reference grid
    g.fillStyle = '#161210'; g.fillRect(0, 0, lv.w * c, lv.h * c);
    g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 1;
    for (let x = 0; x <= lv.w; x++) { g.beginPath(); g.moveTo(x * c + 0.5, 0); g.lineTo(x * c + 0.5, lv.h * c); g.stroke(); }
    for (let y = 0; y <= lv.h; y++) { g.beginPath(); g.moveTo(0, y * c + 0.5); g.lineTo(lv.w * c, y * c + 0.5); g.stroke(); }
    // vector sectors (filled by floor tint) + walls
    renderGeo();
    // entities (free-positioned)
    for (const e of lv.ents) {
      const def = ENTS.find(d => d.kind === e.kind);
      if (def) {
        const tx = World.SPR[def.spr];                      // sample the sprite's OWN size, not a hardcoded 64x64 —
        g.drawImage(tx, 0, 0, tx.width, tx.height, (e.x - 0.5) * c + 1, (e.y - 0.5) * c + 1, c - 2, c - 2);  // shipped art can be bigger
      }
    }
    // spawn
    drawSpawnArrow(g, lv.spawn.x * c, lv.spawn.y * c, c * 0.38, lv.spawn.a);
    // 3D-preview camera start point, if the CAMERA tool has placed one
    if (previewCam) drawCamMarker(g, previewCam.x * c, previewCam.y * c, c * 0.38, previewCam.a);
    renderChecks();
  }

  // ---- mission checklist ----
  function has(ch) { return lv.cells.some(r => r.includes(ch)); }
  function entCount(kind) { return lv.ents.filter(e => e.kind === kind).length; }
  function spawnInSector() {
    return Engine.sectorAt(lv.spawn.x, lv.spawn.y, geo) >= 0;
  }
  function doorCount() {
    let n = 0; for (const s of geo.sectors) if (s.wallDoor) n += s.wallDoor.filter(Boolean).length;
    return n;
  }
  function renderChecks() {
    const ul = document.getElementById('checks');
    if (!ul) return;                              // panel removed from the UI — kept for a future readme/re-enable
    const winSectors = geo.sectors.filter(s => s.win).length;
    const items = [
      [geo.sectors.length > 0, 'SECTORS DRAWN (' + geo.sectors.length + ')'],
      [spawnInSector(), 'AGENT SPAWN INSIDE A SECTOR'],
      [winSectors > 0, 'WIN ZONE TAGGED (' + winSectors + ')'],
      [entCount('agent') > 0, 'AGENT 004 (LOCKPICKS) PLACED'],
    ];
    ul.innerHTML = '';
    for (const [ok, label] of items) {
      const li = document.createElement('li');
      li.className = ok ? 'ok' : 'bad';
      li.textContent = (ok ? '✓ ' : '⚠ ') + label;
      ul.appendChild(li);
    }
    const li = document.createElement('li');
    li.className = 'info';
    li.textContent = '● DOORS: ' + doorCount() + ' · HENCHMEN: ' + entCount('goon') +
      ' · MEDKITS: ' + entCount('medkit') + ' · AMMO: ' + entCount('ammo');
    ul.appendChild(li);
  }

  // ---- editing ----
  // "enter" prop-placement (defaults to the first kind) or step to the next/prev kind;
  // [ ] and scrolling the PERSONNEL & PROPS panel both drive this — mirrors the 3D
  // preview's [ ]/scroll texture cycling, but for WHICH sprite the ENT tool stamps.
  function cycleEntKind(dir) {
    const i = tool.t === 'ent' ? ENTS.findIndex(e => e.kind === tool.v) : -1;
    const next = ((i < 0 ? -dir : i) + dir + ENTS.length) % ENTS.length;
    tool = { t: 'ent', v: ENTS[next].kind };
    entBtns.forEach(b => b.classList.remove('sel'));
    entBtns[next].classList.add('sel');
    status('PLACING: ' + ENTS[next].name);
  }
  // leave prop-placement mode: back to the default click = draw-a-vertex tool
  function deselectEntTool(silent) {
    if (tool.t !== 'ent') return;
    tool = { t: 'tile', v: '#' };
    document.querySelectorAll('.tool.sel').forEach(b => b.classList.remove('sel'));
    if (!silent) status('PROP PLACEMENT OFF.');
  }
  function entsAt(x, y) { return lv.ents.filter(e => Math.floor(e.x) === x && Math.floor(e.y) === y); }
  function removeEntsAt(x, y) { lv.ents = lv.ents.filter(e => !(Math.floor(e.x) === x && Math.floor(e.y) === y)); }
  function entAtWorld(wx, wy) {            // nearest entity within ~0.5 of a free-space point
    let best = null, bd = 0.5 * 0.5;
    for (const e of lv.ents) { const dx = e.x - wx, dy = e.y - wy, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = e; } }
    return best;
  }

  function stampHeight(x, y) {                               // brush one cell
    if (World.CH[lv.cells[y][x]] > 0) return;               // never on solids
    if (hset.applyF) lv.fh[y][x] = hset.f;
    if (hset.applyC) lv.ch[y][x] = hset.c;
  }
  function clearHeight(x, y) { lv.fh[y][x] = null; lv.ch[y][x] = null; }

  function fillHeight(sx, sy) {                              // flood a room of one floor height
    if (World.CH[lv.cells[sy][sx]] > 0) return;
    const start = effH(sx, sy); if (!start) return;
    const target = start.f, seen = new Set(), stack = [[sx, sy]];
    while (stack.length) {
      const [x, y] = stack.pop(), k = x + ',' + y;
      if (seen.has(k) || x < 0 || y < 0 || x >= lv.w || y >= lv.h) continue;
      seen.add(k);
      if (World.CH[lv.cells[y][x]] > 0) continue;            // walls bound the room
      const e = effH(x, y);
      if (!e || Math.abs(e.f - target) > 1e-3) continue;     // stop at a height change
      stampHeight(x, y);
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }

  function applyCell(x, y) {                          // one cell, no render (used by rect fill)
    if (tool.t === 'tile') {
      lv.cells[y][x] = tool.v;
      if (World.CH[tool.v] > 0) removeEntsAt(x, y);     // walls evict entities
    } else if (tool.t === 'ent') {
      lv.cells[y][x] = World.CH[lv.cells[y][x]] > 0 ? '.' : lv.cells[y][x];
      removeEntsAt(x, y);
      lv.ents.push(Object.assign({ kind: tool.v, x: x + 0.5, y: y + 0.5 }, CIVILIAN_KINDS.has(tool.v) ? { behavior: 'wander' } : null));
    } else if (tool.t === 'spawn') {
      lv.cells[y][x] = World.CH[lv.cells[y][x]] > 0 ? '.' : lv.cells[y][x];
      lv.spawn.x = x + 0.5; lv.spawn.y = y + 0.5;
    } else if (tool.t === 'erase') {
      eraseCell(x, y);
    } else if (tool.t === 'height') {
      stampHeight(x, y);
    } else if (tool.t === 'hfill') {
      fillHeight(x, y);
    } else if (tool.t === 'tex') {
      stampTex(x, y);
    }
  }
  function apply(x, y) { applyCell(x, y); render(); }

  function stampTex(x, y) {
    if (texset.target === 'ceil') { if (World.CH[lv.cells[y][x]] === 0) lv.ctex[y][x] = texset.name; }
    else lv.stex[y][x] = texset.name;              // floor cells → floor tex, wall cells → wall tex
  }
  function clearTex(x, y) {
    if (texset.target === 'ceil') lv.ctex[y][x] = null; else lv.stex[y][x] = null;
  }

  function eraseCell(x, y) {
    if (entsAt(x, y).length) removeEntsAt(x, y);
    else { lv.cells[y][x] = '.'; clearHeight(x, y); lv.stex[y][x] = null; lv.ctex[y][x] = null; }
  }
  function erase(x, y) { eraseCell(x, y); render(); }

  const rectEligible = () => ['tile', 'tex', 'height', 'erase'].includes(tool.t);
  function applyRect(ax, ay, bx, by) {                // fill a rectangular region with the active tool
    const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), y0 = Math.min(ay, by), y1 = Math.max(ay, by);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) applyCell(x, y);
    render();
    status('FILLED ' + (x1 - x0 + 1) + '×' + (y1 - y0 + 1) + ' REGION.');
  }

  function cellFromEvent(e) {
    const r = cvs.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) * (cvs.width / r.width) / cellPx);
    const y = Math.floor((e.clientY - r.top) * (cvs.height / r.height) / cellPx);
    if (x < 0 || y < 0 || x >= lv.w || y >= lv.h) return null;
    return { x, y };
  }

  cvs.addEventListener('mousedown', e => {
    if (drawMode) {                                  // vector map: place vertex / entity / spawn
      const w = worldFromEvent(e);
      if (e.button === 2) {                          // right-click: delete an entity, else cancel a draft
        if (tool.t === 'campos') { previewCam = null; render(); status('PREVIEW CAM CLEARED — 3D preview will use the default start again.'); return; }
        const hit = entAtWorld(w.x, w.y);
        if (hit) { pushUndo(); lv.ents.splice(lv.ents.indexOf(hit), 1); render(); }
        else cancelDraft();
        return;
      }
      if (tool.t === 'campos') {                     // 3D-preview starting viewpoint — not level data, no undo needed
        previewCam = { x: +w.x.toFixed(2), y: +w.y.toFixed(2), a: +document.getElementById('spawnang').value };
        render();
        status('PREVIEW CAM SET AT ' + previewCam.x + ', ' + previewCam.y + ' — switch to 3D PREVIEW to land there.');
        return;
      }
      if (tool.t === 'ent') {
        pushUndo();
        const placedName = (ENTS.find(e => e.kind === tool.v) || {}).name || tool.v;
        lv.ents.push(Object.assign({ kind: tool.v, x: +w.x.toFixed(2), y: +w.y.toFixed(2) }, CIVILIAN_KINDS.has(tool.v) ? { behavior: 'wander' } : null));
        deselectEntTool(true);                          // one prop per pick — no accidental continuous stamping
        status('PLACED ' + placedName + '.');
        render();
        return;
      }
      if (tool.t === 'spawn') { pushUndo(); lv.spawn.x = +w.x.toFixed(2); lv.spawn.y = +w.y.toFixed(2); lv.spawn.a = +document.getElementById('spawnang').value; render(); return; }
      if (tool.t === 'erase') { const hit = entAtWorld(w.x, w.y); if (hit) { pushUndo(); lv.ents.splice(lv.ents.indexOf(hit), 1); render(); } return; }
      if (draft.length === 0 && gcur.vi >= 0) {       // clicked an existing vertex (not mid-draft) → drag it
        pushUndo(); draggingVert = gcur.vi; return;
      }
      pushUndo(); placeVertex();                      // default tool draws sector geometry
      return;
    }
    const c = cellFromEvent(e);
    if (!c) return;
    if (eyedrop) {
      const eh = effH(c.x, c.y);
      if (eh) {
        hset.f = eh.f; hset.c = eh.c;
        document.getElementById('hf').value = eh.f;
        document.getElementById('hc').value = eh.c;
        status('PICKED  F:' + eh.f.toFixed(1) + '  C:' + eh.c.toFixed(1) + '.');
      }
      eyedrop = false; return;
    }
    if (e.button === 2) {
      pushUndo();
      if (tool.t === 'height' || tool.t === 'hfill') { clearHeight(c.x, c.y); render(); }
      else if (tool.t === 'tex') { clearTex(c.x, c.y); render(); }
      else erase(c.x, c.y);
      return;
    }
    pushUndo();
    if (rectMode && rectEligible()) { rectStart = { x: c.x, y: c.y }; hover = c; render(); return; }
    painting = true;
    apply(c.x, c.y);
  });
  cvs.addEventListener('mousemove', e => {
    if (drawMode) { updateDrawHover(e); return; }   // vector DRAW mode
    const c = cellFromEvent(e);
    hover = c;
    if (c) {
      const eh = effH(c.x, c.y);
      coordsEl.textContent = 'CELL ' + c.x + ',' + c.y +
        (eh ? ' · F ' + eh.f.toFixed(1) + ' C ' + eh.c.toFixed(1) + (eh.custom ? '*' : '') : ' · WALL') +
        (entsAt(c.x, c.y)[0] ? ' · ' + ENTS.find(d => d.kind === entsAt(c.x, c.y)[0].kind).name : '');
      if (painting && (tool.t === 'tile' || tool.t === 'erase' || tool.t === 'height' || tool.t === 'tex')) { apply(c.x, c.y); return; }
    } else {
      coordsEl.textContent = ' ';
    }
    render();
  });
  window.addEventListener('mouseup', () => {
    painting = false;
    if (draggingVert >= 0) { draggingVert = -1; rebuildParents(); render(); status('VERTEX MOVED.'); }
    if (rectStart) {
      const end = hover || rectStart;
      applyRect(rectStart.x, rectStart.y, end.x, end.y);
      rectStart = null;
    }
  });
  cvs.addEventListener('mouseleave', () => { hover = null; painting = false; render(); });
  cvs.addEventListener('contextmenu', e => e.preventDefault());

  // ---- controls ----
  document.getElementById('spawnang').addEventListener('change', e => {
    lv.spawn.a = parseFloat(e.target.value);
    render();
  });
  function syncAngleSelect() {
    const sel = document.getElementById('spawnang');
    let best = 0, bd = 1e9;
    [...sel.options].forEach((o, i) => {
      const d = Math.abs(Math.atan2(Math.sin(lv.spawn.a - parseFloat(o.value)), Math.cos(lv.spawn.a - parseFloat(o.value))));
      if (d < bd) { bd = d; best = i; }
    });
    sel.selectedIndex = best;
    lv.spawn.a = parseFloat(sel.value);
  }

  document.getElementById('resize').addEventListener('click', () => {
    const w = Math.max(8, Math.min(48, parseInt(document.getElementById('mw').value) || 24));
    const h = Math.max(8, Math.min(48, parseInt(document.getElementById('mh').value) || 24));
    const cells = [], fh = [], ch = [], stex = [], ctex = [], fsx = [], fsy = [];
    for (let y = 0; y < h; y++) {
      cells[y] = []; fh[y] = []; ch[y] = []; stex[y] = []; ctex[y] = []; fsx[y] = []; fsy[y] = [];
      for (let x = 0; x < w; x++) {
        cells[y][x] = (lv.cells[y] && lv.cells[y][x] !== undefined) ? lv.cells[y][x]
          : (y === 0 || x === 0 || y === h - 1 || x === w - 1) ? '%' : '.';
        fh[y][x] = (lv.fh[y] && lv.fh[y][x] !== undefined) ? lv.fh[y][x] : null;
        ch[y][x] = (lv.ch[y] && lv.ch[y][x] !== undefined) ? lv.ch[y][x] : null;
        stex[y][x] = (lv.stex[y] && lv.stex[y][x] !== undefined) ? lv.stex[y][x] : null;
        ctex[y][x] = (lv.ctex[y] && lv.ctex[y][x] !== undefined) ? lv.ctex[y][x] : null;
        fsx[y][x] = (lv.fsx[y] && lv.fsx[y][x] !== undefined) ? lv.fsx[y][x] : 0;
        fsy[y][x] = (lv.fsy[y] && lv.fsy[y][x] !== undefined) ? lv.fsy[y][x] : 0;
      }
    }
    // keep the border sealed
    for (let x = 0; x < w; x++) { if (cells[0][x] === '.') cells[0][x] = '%'; if (cells[h - 1][x] === '.') cells[h - 1][x] = '%'; }
    for (let y = 0; y < h; y++) { if (cells[y][0] === '.') cells[y][0] = '%'; if (cells[y][w - 1] === '.') cells[y][w - 1] = '%'; }
    lv.w = w; lv.h = h; lv.cells = cells; lv.fh = fh; lv.ch = ch; lv.stex = stex; lv.ctex = ctex; lv.fsx = fsx; lv.fsy = fsy;
    lv.ents = lv.ents.filter(e => e.x < w - 0.25 && e.y < h - 0.25);
    lv.spawn.x = Math.min(lv.spawn.x, w - 1.5);
    lv.spawn.y = Math.min(lv.spawn.y, h - 1.5);
    fitCanvas(); render();
    status('RESIZED TO ' + w + '×' + h + '.');
  });

  // ---- camera: scroll-wheel zoom (Ctrl/Cmd+scroll, centred on the cursor) ----
  // Plain scroll/trackpad-swipe is left alone (no preventDefault) so the
  // browser's native scrolling of the #gridscroll overflow container pans the
  // view instead — that used to be hijacked into zoom unconditionally, which
  // meant scrolling was the ONLY thing wheel input could do and there was no
  // way to pan without dragging the (thin) scrollbars directly.
  const gridscroll = document.getElementById('gridscroll');
  gridscroll.addEventListener('wheel', e => {
    if (!(e.ctrlKey || e.metaKey)) return;              // plain wheel/trackpad scroll → native pan; pinch/ctrl+wheel → zoom
    e.preventDefault();
    const before = cvs.getBoundingClientRect();
    const wx = (e.clientX - before.left) / cellPx;      // world point under the cursor (old scale)
    const wy = (e.clientY - before.top) / cellPx;
    const prev = zoom;
    zoom = Math.max(0.4, Math.min(6, zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
    if (zoom === prev) return;
    fitCanvas(); render();
    const sr = gridscroll.getBoundingClientRect();      // re-anchor so the same point stays under the cursor
    gridscroll.scrollLeft = sr.left + gridscroll.clientLeft + wx * cellPx - e.clientX;
    gridscroll.scrollTop = sr.top + gridscroll.clientTop + wy * cellPx - e.clientY;
    status('ZOOM ×' + zoom.toFixed(2));
  }, { passive: false });

  // ---- camera: middle-mouse-drag pan (Photoshop/Blender-style grab-and-drag) ----
  let panning = false, panX = 0, panY = 0, panScrollL = 0, panScrollT = 0;
  gridscroll.addEventListener('mousedown', e => {
    if (e.button !== 1) return;                         // middle button only — left/right stay paint/erase
    e.preventDefault();
    panning = true; panX = e.clientX; panY = e.clientY;
    panScrollL = gridscroll.scrollLeft; panScrollT = gridscroll.scrollTop;
    gridscroll.classList.add('panning');
  });
  window.addEventListener('mousemove', e => {
    if (!panning) return;
    gridscroll.scrollLeft = panScrollL - (e.clientX - panX);
    gridscroll.scrollTop = panScrollT - (e.clientY - panY);
  });
  window.addEventListener('mouseup', e => {
    if (e.button === 1 && panning) { panning = false; gridscroll.classList.remove('panning'); }
  });
  gridscroll.addEventListener('auxclick', e => { if (e.button === 1) e.preventDefault(); });  // suppress middle-click autoscroll/paste

  function save() {
    localStorage.setItem(LS_KEY, JSON.stringify(toLevel()));
    status('SAVED TO BROWSER.');
  }
  document.getElementById('save').addEventListener('click', save);
  document.getElementById('play').addEventListener('click', () => {
    save();
    window.open('index.html?level=custom', '_blank');
  });

  document.getElementById('export').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(toLevel(), null, 1)], { type: 'application/json' }));
    a.download = 'click-and-dagger-mission.json';
    a.click();
    URL.revokeObjectURL(a.href);
    status('EXPORTED.');
  });

  document.getElementById('import').addEventListener('click', () => document.getElementById('filein').click());
  document.getElementById('filein').addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const j = JSON.parse(rd.result);
        if (!Number.isInteger(j.w) || !Number.isInteger(j.h) || !Array.isArray(j.map) ||
            !Array.isArray(j.ents) || !j.spawn) throw new Error('not a mission file');
        fromLevel(j);
        status('IMPORTED ' + f.name.toUpperCase() + '.');
      } catch (err) {
        status('IMPORT FAILED: ' + err.message.toUpperCase());
      }
      e.target.value = '';
    };
    rd.readAsText(f);
  });

  document.getElementById('loaddefault').addEventListener('click', () => {
    const d = World.defaultLevel();
    fromLevel(d);
    if (d.geo && d.geo.sectors && d.geo.sectors.length) {         // authored vector mission → load its geo verbatim
      status('LOADED PLAZA VIEJA — ' + geo.sectors.length + ' SECTORS.');
      return;
    }
    // legacy grid mission → import as vector sectors so it shows in the vector map
    try {
      World.load(toLevel());
      const cg = World.compileGeo();
      geo.verts = cg.verts; geo.sectors = cg.sectors; draft = [];
      render();
      status('IMPORTED PLAZA VIEJA — ' + geo.sectors.length + ' SECTORS.');
    } catch (err) { status('IMPORT FAILED: ' + String(err.message || err).toUpperCase()); }
  });
  document.getElementById('startblown').addEventListener('change', e => { lv.blown = e.target.checked; });
  (function initMusicPals() {
    const ucSel = document.getElementById('musicUndercover'), cbSel = document.getElementById('musicCoverBlown');
    for (const t of MUSIC_TRACKS.undercover) ucSel.appendChild(new Option(t.name, t.key));
    for (const t of MUSIC_TRACKS.coverblown) cbSel.appendChild(new Option(t.name, t.key));
    ucSel.value = lv.musicUndercover; cbSel.value = lv.musicCoverBlown;
    ucSel.addEventListener('change', e => { lv.musicUndercover = e.target.value; });
    cbSel.addEventListener('change', e => { lv.musicCoverBlown = e.target.value; });
  })();
  document.getElementById('newmap').addEventListener('click', () => {
    const w = Math.max(8, Math.min(48, parseInt(document.getElementById('mw').value) || 24));
    const h = Math.max(8, Math.min(48, parseInt(document.getElementById('mh').value) || 24));
    fromLevel(blankLevel(w, h));
    status('NEW ' + w + '×' + h + ' MAP.');
  });

  // ---- 3D first-person preview (toggle with the map editor) ----
  const pcanvas = document.getElementById('pcanvas');
  const cam = { x: 2.5, y: 2.5, a: 0, pitch: 0, eyeZ: 0.5, hurtT: 0 };
  const pG = { player: cam, combat: false, over: false, preview: true, pick: true, bobT: 0, bobAmt: 0, fireT: 0 };
  const pcur = { cx: -1, cy: -1 };            // cursor position in the render buffer (for surface picking)
  const pkeys = {};
  let previewOn = false, pengineReady = false, praf = null, plast = 0, pdrag = false, plx = 0, ply = 0;
  let manualEyeZ = false;                                      // once SPACE/C has flown the eye, it stops auto-following the floor
  let usePortal = false, portalGraph = null;  // portal render path when the level has vector sectors
  let previewCompiled = false;                // preview is a grid level compiled to geo (walk-only; sculpt drawn sectors)

  // A "sector" = the connected region of cells sharing the pointed surface:
  // same floor height (kind 0), same ceiling height (kind 1), or same wall
  // texture (kind 2). Editing acts on the whole sector, not one cell.
  function floodSector(sx, sy, kind) {
    const inB = (x, y) => x >= 0 && y >= 0 && x < lv.w && y < lv.h;
    let match;
    if (kind === 2) {
      if (!World.isSolid(sx, sy)) return [];
      const t0 = World.wallTexName(sx, sy);
      match = (x, y) => World.isSolid(x, y) && World.wallTexName(x, y) === t0;
    } else if (kind === 1) {
      const s0 = World.surfAt(sx, sy); if (!s0) return [];
      const h0 = s0.c;
      match = (x, y) => { const s = World.surfAt(x, y); return !!s && Math.abs(s.c - h0) < 1e-3; };
    } else {
      // floor: a sector is the connected COPLANAR region (same gradient, on the
      // same plane) so a whole ramp counts as one sector, not per-cell.
      const s0 = World.surfAt(sx, sy); if (!s0) return [];
      const A = s0.fsx, B = s0.fsy, f0 = s0.f;
      match = (x, y) => {
        const s = World.surfAt(x, y);
        if (!s || Math.abs(s.fsx - A) > 1e-6 || Math.abs(s.fsy - B) > 1e-6) return false;
        return Math.abs(s.f - (f0 + A * (x - sx) + B * (y - sy))) < 1e-3;
      };
    }
    const out = [], seen = new Set(), stack = [[sx, sy]];
    while (stack.length) {
      const [x, y] = stack.pop(), k = x + ',' + y;
      if (seen.has(k) || !inB(x, y)) continue;
      seen.add(k);
      if (!match(x, y)) continue;
      out.push({ x, y });
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    return out;
  }

  // 3D editing: point at a floor/ceiling, PgUp/PgDn raises/lowers the whole sector
  function adjustSurface(dir) {
    const t = Engine.pickAt(pcur.cx, pcur.cy);
    if (!t || t.kind === 2) { status('POINT AT A FLOOR OR CEILING.'); return; }
    const cells = floodSector(t.mx, t.my, t.kind);
    if (!cells.length) return;
    const step = 0.1 * dir;
    for (const c of cells) {                          // additive → preserves any slope
      const s = World.surfAt(c.x, c.y);
      if (t.kind === 0) {
        const z = Math.max(-4, Math.min(s.c - 0.2, s.f + step));
        World.setFloorZ(c.x, c.y, z); lv.fh[c.y][c.x] = +z.toFixed(3);
      } else {
        const z = Math.max(s.f + 0.2, Math.min(8, s.c + step));
        World.setCeilZ(c.x, c.y, z); lv.ch[c.y][c.x] = +z.toFixed(3);
      }
    }
    status((t.kind === 0 ? 'FLOOR' : 'CEILING') + ' sector ' + (dir > 0 ? 'raised' : 'lowered') + ' (' + cells.length + ' cells)');
  }

  // 3D editing: point at a floor, tilt the whole sector into a ramp along your
  // view direction (mean height stays fixed as the pivot).
  function slopeSector(delta) {
    const t = Engine.pickAt(pcur.cx, pcur.cy);
    if (!t || t.kind !== 0) { status('POINT AT A FLOOR TO SLOPE IT.'); return; }
    const cells = floodSector(t.mx, t.my, 0);
    if (cells.length < 2) { status('SECTOR TOO SMALL TO SLOPE.'); return; }
    let sX = 0, sY = 0, sH = 0;
    for (const c of cells) { sX += c.x + 0.5; sY += c.y + 0.5; sH += World.surfAt(c.x, c.y).f; }
    const n = cells.length, cX = sX / n, cY = sY / n, h0 = sH / n;
    const s0 = World.surfAt(t.mx, t.my);
    let A = s0.fsx + delta * Math.cos(cam.a), B = s0.fsy + delta * Math.sin(cam.a);
    const mag = Math.hypot(A, B), MAXG = 0.7;
    if (mag > MAXG) { A *= MAXG / mag; B *= MAXG / mag; }
    for (const c of cells) {
      const f = h0 + A * (c.x + 0.5 - cX) + B * (c.y + 0.5 - cY);
      World.setFloorZ(c.x, c.y, f); World.setFloorSlope(c.x, c.y, A, B);
      lv.fh[c.y][c.x] = +f.toFixed(3); lv.fsx[c.y][c.x] = +A.toFixed(4); lv.fsy[c.y][c.x] = +B.toFixed(4);
    }
    status('SLOPE gradient ' + Math.hypot(A, B).toFixed(2) + ' (' + n + ' cells)');
  }

  // 3D editing: point at any surface, [ / ] cycles its whole sector's texture
  function swapTexture(delta) {
    const t = Engine.pickAt(pcur.cx, pcur.cy);
    if (!t) { status('POINT AT A SURFACE.'); return; }
    const cells = floodSector(t.mx, t.my, t.kind);
    if (!cells.length) return;
    let cur;
    if (t.kind === 2) cur = World.wallTexName(t.mx, t.my);
    else { const s = World.surfAt(t.mx, t.my); cur = t.kind === 0 ? s.ft : s.ct; }
    const names = World.TXNAMES;
    let i = names.indexOf(cur); if (i < 0) i = 0;
    const next = names[(i + delta + names.length) % names.length];
    for (const c of cells) {
      if (t.kind === 1) { World.setCeilTex(c.x, c.y, next); lv.ctex[c.y][c.x] = next; }
      else { World.setSurfTex(c.x, c.y, next); lv.stex[c.y][c.x] = next; }
    }
    const label = t.kind === 2 ? 'WALL' : t.kind === 1 ? 'CEILING' : 'FLOOR';
    status(label + ' sector → ' + next.toUpperCase() + ' · ' + cells.length + ' cells');
  }

  // ---- vector-sector editing (portal preview): sculpt the sector you look at ----
  function pickGeoSector() {                                   // march the crosshair ray to the last sector before a wall
    // A NESTED sub-sector (fountain, stage, any parent>=0 sector) is always the
    // more specific target the instant the ray crosses into it — stop right there
    // instead of continuing to march past it back into its (larger) parent. Without
    // this, a small feature surrounded by more of the same outer sector could never
    // register: the march would touch it for a couple of steps, then get overwritten
    // again by the parent sector as the ray continued toward the wall behind it.
    const dx = Math.cos(cam.a), dy = Math.sin(cam.a);
    let last = Engine.sectorAt(cam.x, cam.y, geo);
    for (let t = 0.2; t <= 6; t += 0.2) {
      const s = Engine.sectorAt(cam.x + dx * t, cam.y + dy * t, geo);
      if (s < 0) break;
      if (geo.sectors[s].parent >= 0) return s;
      last = s;
    }
    return last;
  }
  function geoRaise(dir, ceiling) {
    const s = pickGeoSector(); if (s < 0) { status('LOOK AT A SECTOR.'); return; }
    const sec = geo.sectors[s], step = 0.1 * dir;
    if (ceiling) sec.ceil = Math.max(sec.floor + 0.2, Math.min(12, +(sec.ceil + step).toFixed(3)));
    else sec.floor = Math.max(-6, Math.min(sec.ceil - 0.2, +(sec.floor + step).toFixed(3)));
    status('SECTOR ' + (s + 1) + (ceiling ? ' CEIL ' + sec.ceil.toFixed(1) : ' FLOOR ' + sec.floor.toFixed(1)));
  }
  function geoTex(dir, ceiling) {
    const s = pickGeoSector(); if (s < 0) { status('LOOK AT A SECTOR.'); return; }
    const sec = geo.sectors[s], names = World.TXNAMES;
    let i = names.indexOf(ceiling ? sec.ceilTex : sec.floorTex); if (i < 0) i = 0;
    const next = names[(i + dir + names.length) % names.length];
    if (ceiling) sec.ceilTex = next; else sec.floorTex = next;
    status('SECTOR ' + (s + 1) + ' ' + (ceiling ? 'CEIL' : 'FLOOR') + ' → ' + next.toUpperCase());
  }
  function geoSky() {
    const s = pickGeoSector(); if (s < 0) { status('LOOK AT A SECTOR.'); return; }
    const sec = geo.sectors[s]; sec.sky = !sec.sky;
    status('SECTOR ' + (s + 1) + ' SKY ' + (sec.sky ? 'ON' : 'OFF'));
  }
  // Shift+K cycles WHICH sky image a sky sector uses (Havana day / Paris night / …).
  // Stored even when sky is off, so picking a sky ahead of time sticks once you turn it on.
  function geoSkyTex() {
    const s = pickGeoSector(); if (s < 0) { status('LOOK AT A SECTOR.'); return; }
    const sec = geo.sectors[s], names = World.SKYNAMES;
    let i = names.indexOf(sec.skyTex || 'havana'); if (i < 0) i = 0;
    sec.skyTex = names[(i + 1) % names.length];
    status('SECTOR ' + (s + 1) + ' SKY → ' + sec.skyTex.toUpperCase());
  }
  function geoWin() {                                          // tag the looked-at sector a WIN zone (goal)
    const s = pickGeoSector(); if (s < 0) { status('LOOK AT A SECTOR.'); return; }
    const sec = geo.sectors[s]; sec.win = !sec.win;
    status('SECTOR ' + (s + 1) + ' WIN ZONE ' + (sec.win ? 'ON' : 'OFF'));
  }
  // tag the looked-at sector HOSTILE territory — crossing into one blows the
  // player's Cover status (main.js), waking every hostile to normal AI rules.
  function geoHostile() {
    const s = pickGeoSector(); if (s < 0) { status('LOOK AT A SECTOR.'); return; }
    const sec = geo.sectors[s]; sec.hostile = !sec.hostile;
    status('SECTOR ' + (s + 1) + ' HOSTILE AREA ' + (sec.hostile ? 'ON' : 'OFF'));
  }
  // toggle a nested shape between a solid mass (column/pillar — no floor/ceiling,
  // blocks movement and sight, textured on its outward face) and a proper walkable
  // sector — the classic Build-engine "hole becomes a sector" conversion.
  function geoToggleSolid() {
    const s = pickGeoSector(); if (s < 0) { status('LOOK AT A SECTOR.'); return; }
    const sec = geo.sectors[s];
    if (sec.parent < 0) { status('ONLY A NESTED SHAPE CAN BE A SOLID COLUMN.'); return; }
    sec.solid = !sec.solid;
    portalGraph = Engine.buildGraph(geo);                      // wall linkage changes: portal ↔ solid
    status('SECTOR ' + (s + 1) + (sec.solid ? ' → SOLID (COLUMN)' : ' → WALKABLE SECTOR'));
  }
  const TEXSCALES = [1, 2, 4, 0.5];                            // floor/ceiling tile size cycle
  function geoTexScale() {
    const s = pickGeoSector(); if (s < 0) { status('LOOK AT A SECTOR.'); return; }
    const sec = geo.sectors[s];
    let i = TEXSCALES.indexOf(sec.texScale || 1); if (i < 0) i = 0;
    sec.texScale = TEXSCALES[(i + 1) % TEXSCALES.length];
    status('SECTOR ' + (s + 1) + ' TILE ×' + sec.texScale + (sec.texScale > 1 ? ' (bigger)' : sec.texScale < 1 ? ' (smaller)' : ''));
  }
  // ray (from camera) vs segment → distance along the ray, or null if it doesn't hit
  function raySeg(ox, oy, dx, dy, ax, ay, bx, by) {
    const ex = bx - ax, ey = by - ay, den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) return null;
    const t = ((ax - ox) * ey - (ay - oy) * ex) / den;        // along ray
    const u = ((ax - ox) * dy - (ay - oy) * dx) / den;        // along segment
    return (t >= 0 && u >= 0 && u <= 1) ? t : null;
  }
  function pickGeoWall() {                                     // the loop edge of the current sector the crosshair hits
    // Deliberately NOT pickGeoSector() — that one marches the flat ray THROUGH open
    // portals to find the farthest visible room (correct for floor/ceiling: aiming
    // through a doorway should edit the room beyond it). A wall you're looking at,
    // at any pitch, always belongs to the sector you're physically standing in —
    // using the march here meant aiming down at a nearby step/riser from the plaza
    // side would walk straight past it into the raised sector beyond, so the riser's
    // OWN wall (an edge of the plaza sector) was never even in the candidate list.
    const s = Engine.sectorAt(cam.x, cam.y, geo);
    if (s < 0 || !portalGraph[s]) return null;
    const dx = Math.cos(cam.a), dy = Math.sin(cam.a);
    const walls = portalGraph[s], loopLen = geo.sectors[s].loop.length;
    let best = null, bt = Infinity;
    for (let i = 0; i < walls.length && i < loopLen; i++) {   // own loop edges only (skip appended hole walls)
      const w = walls[i], A = geo.verts[w.v1], B = geo.verts[w.v2];
      const t = raySeg(cam.x, cam.y, dx, dy, A.x, A.y, B.x, B.y);
      if (t != null && t < bt) { bt = t; best = { s, i, portal: w.next >= 0, dist: t }; }
    }
    return best;
  }
  const WALL_PICK_DIST = 6;                                    // T/[/] act on the WALL (not the floor) when it's this close
  // Inside a small NESTED sector (fountain, stage…) that 6-unit reach is bigger
  // than the whole feature, so a wall is always "close" and its floor/ceiling
  // could never be targeted without holding Shift. Tighten the reach there so its
  // own surface stays directly selectable — you can still hit its walls, just by
  // aiming closer to them, same as approaching any real wall.
  const wallPickDist = hit => (hit && geo.sectors[hit.s].parent >= 0) ? 1.2 : WALL_PICK_DIST;
  function geoWallTex(dir) {                                   // cycle the looked-at WALL's texture
    const hit = pickGeoWall(); if (!hit) { status('LOOK AT A WALL.'); return; }
    const sec = geo.sectors[hit.s], names = World.TXNAMES;
    if (!sec.wallTex) sec.wallTex = new Array(sec.loop.length).fill(null);
    let i = names.indexOf(sec.wallTex[hit.i] || 'brick'); if (i < 0) i = 0;
    const next = names[(i + dir + names.length) % names.length];
    sec.wallTex[hit.i] = next;
    portalGraph = Engine.buildGraph(geo);                      // re-derive wall.tex
    status('WALL ' + (hit.i + 1) + ' → ' + next.toUpperCase());
  }
  // does this portal wall's opening have a soffit (neighbour ceiling lower) and/or
  // a riser (neighbour floor higher) — the surfaces above/below a non-flush opening
  // that render at all, and so are the only ones worth retexturing.
  function wallStepInfo(hit) {
    if (!hit || !hit.portal) return { up: false, down: false };
    const w = portalGraph[hit.s] && portalGraph[hit.s][hit.i];
    const nsec = w && w.next >= 0 ? geo.sectors[w.next] : null;
    if (!nsec) return { up: false, down: false };
    const sec = geo.sectors[hit.s];
    return { up: nsec.ceil < sec.ceil - 0.001, down: nsec.floor > sec.floor + 0.001 };
  }
  // resolves exactly what surface the crosshair (plus Shift) is editing right now —
  // used by every texture-assignment entry point (cycle keys, the palette, favorites)
  // so they all agree. A wall with BOTH a soffit and a riser is ambiguous; Shift picks
  // the SOFFIT over the RISER there, mirroring how Shift already means "the ceiling"
  // everywhere else (PgUp/PgDn, the plain floor/ceiling texture cycle below). A step
  // is always reachable no matter the range — it's a thin band between two sectors,
  // easy to be "far" from even while clearly aiming at it — but a plain full-height
  // wall only counts within wallPickDist, so aiming across a room at the floor doesn't
  // accidentally grab a wall on the far side.
  function texTarget(shift) {
    const wallHit = pickGeoWall();
    if (wallHit) {
      const step = wallStepInfo(wallHit);
      if (step.up && step.down) return { kind: shift ? 'soffit' : 'riser', hit: wallHit };
      if (step.up) return { kind: 'soffit', hit: wallHit };
      if (step.down) return { kind: 'riser', hit: wallHit };
      if (!shift && wallHit.dist < wallPickDist(wallHit)) return { kind: 'wall', hit: wallHit };
    }
    const s = pickGeoSector();
    if (s < 0) return null;
    return { kind: shift ? 'ceil' : 'floor', s };
  }
  function geoWallStepTex(dir) {                               // cycle the SOFFIT above a stepped-down opening
    const hit = pickGeoWall(); if (!hit) { status('LOOK AT A WALL.'); return; }
    const sec = geo.sectors[hit.s], names = World.TXNAMES;
    if (!sec.wallStepTex) sec.wallStepTex = new Array(sec.loop.length).fill(null);
    let i = names.indexOf(sec.wallStepTex[hit.i] || 'vent'); if (i < 0) i = 0;
    const next = names[(i + dir + names.length) % names.length];
    sec.wallStepTex[hit.i] = next;
    portalGraph = Engine.buildGraph(geo);
    status('WALL ' + (hit.i + 1) + ' SOFFIT → ' + next.toUpperCase());
  }
  function geoWallStepFloorTex(dir) {                          // cycle the RISER below a stepped-up opening
    const hit = pickGeoWall(); if (!hit) { status('LOOK AT A WALL.'); return; }
    const sec = geo.sectors[hit.s], names = World.TXNAMES;
    if (!sec.wallStepFloorTex) sec.wallStepFloorTex = new Array(sec.loop.length).fill(null);
    let i = names.indexOf(sec.wallStepFloorTex[hit.i] || 'metal'); if (i < 0) i = 0;
    const next = names[(i + dir + names.length) % names.length];
    sec.wallStepFloorTex[hit.i] = next;
    portalGraph = Engine.buildGraph(geo);
    status('WALL ' + (hit.i + 1) + ' RISER → ' + next.toUpperCase());
  }
  // mount any sprite flat against a wall, like a poster/map/photo pinned to the
  // brick — drawn once (no tiling) over the plain wall texture. A curated list,
  // not every SPR kind, since most (henchmen, plants, furniture) don't read as
  // wall-mountable images; the paper/board props do.
  const DECAL_KINDS = [null, 'wallmap', 'corkboard', 'wallclock', 'telegram', 'personnelfile', 'businesscard', 'letter',
    'decalHavanaTravel', 'decalWantedSpanish', 'decalRugWall', 'decalBrassPlaque', 'decalGalleryPoster', 'decalMetroMap',
    'decalFamilyPhoto', 'decalForSale', 'decalPropagandaPoster', 'decalPravda', 'decalWantedTreason', 'decalCampaignPoster',
    'decalBroadwayPoster', 'decalSubwayMap', 'decalCouplets', 'decalKungFuPoster'];
  function geoWallDecal() {
    const hit = pickGeoWall(); if (!hit) { status('LOOK AT A WALL.'); return; }
    const sec = geo.sectors[hit.s];
    if (!sec.wallDecal) sec.wallDecal = new Array(sec.loop.length).fill(null);
    let i = DECAL_KINDS.indexOf(sec.wallDecal[hit.i] || null); if (i < 0) i = 0;
    const next = DECAL_KINDS[(i + 1) % DECAL_KINDS.length];
    sec.wallDecal[hit.i] = next;
    portalGraph = Engine.buildGraph(geo);                      // re-derive wall.decal
    status('WALL ' + (hit.i + 1) + ' DECAL → ' + (next ? next.toUpperCase() : 'NONE'));
  }
  // find the entity nearest the crosshair (screen-centre pick, same idea as the
  // game's Adventure.resolveAt but against the editor's own preview render)
  function pickEntNear() {
    const rects = Engine.rects(), cx = Engine.W / 2, cy = Engine.H / 2;
    let best = null;
    for (const r of rects) {
      if (cx >= r.x0 && cx <= r.x1 && cy >= r.y0 && cy <= r.y1) {
        if (!best || r.dist < best.dist) best = r;
      }
    }
    return best;
  }
  // toggle WALK-THROUGH ⇄ SOLID on the entity under the crosshair. Overrides that
  // kind's default (every FACT entry has its own baseline `solid`) per placed copy.
  function geoToggleEntSolid() {
    const r = pickEntNear();
    if (!r) { status('LOOK AT AN OBJECT.'); return; }
    const ent = r.ent, idx = World.ents.indexOf(ent);
    ent.solid = !ent.solid;
    if (idx >= 0 && lv.ents[idx]) lv.ents[idx].solid = ent.solid;
    status((ent.name || ent.kind || 'OBJECT').toUpperCase() + ' → ' + (ent.solid ? 'SOLID' : 'WALK-THROUGH'));
  }
  // toggle WANDER ⇄ STATIONARY on the civilian/NPC under the crosshair — overrides
  // that kind's baseline default (most civilians wander; a few, like the Matron or
  // Street Artist, default to standing put) per placed copy, same idea as J above.
  function geoToggleEntWander() {
    const r = pickEntNear();
    if (!r) { status('LOOK AT A CHARACTER.'); return; }
    const ent = r.ent, idx = World.ents.indexOf(ent);
    if (!('behavior' in ent)) { status((ent.name || ent.kind || 'OBJECT').toUpperCase() + " DOESN'T WANDER."); return; }
    ent.behavior = ent.behavior === 'wander' ? 'stationary' : 'wander';
    if (idx >= 0 && lv.ents[idx]) lv.ents[idx].behavior = ent.behavior;
    status((ent.name || ent.kind || 'OBJECT').toUpperCase() + ' → ' + ent.behavior.toUpperCase());
  }
  // M: flatten ⇄ billboard toggle on the entity under the crosshair — a
  // flattened sprite stops turning to face the camera and instead renders as
  // a fixed 2D plane at flatAngle (see geoRotateEntFlat, below).
  function geoToggleEntFlat() {
    const r = pickEntNear();
    if (!r) { status('LOOK AT AN OBJECT.'); return; }
    const ent = r.ent, idx = World.ents.indexOf(ent);
    ent.flat = !ent.flat;
    if (ent.flat && ent.flatAngle == null) ent.flatAngle = 0;
    if (idx >= 0 && lv.ents[idx]) { lv.ents[idx].flat = ent.flat; lv.ents[idx].flatAngle = ent.flatAngle; }
    status((ent.name || ent.kind || 'OBJECT').toUpperCase() + ' → ' + (ent.flat ? 'FLATTENED  ( , . to rotate )' : 'BILLBOARD'));
  }
  // , / . : rotate a flattened entity 45° at a time — no-op (with a hint) on
  // an ordinary billboard sprite, which has no fixed facing to rotate.
  function geoRotateEntFlat(dir) {
    const r = pickEntNear();
    if (!r) { status('LOOK AT AN OBJECT.'); return; }
    const ent = r.ent, idx = World.ents.indexOf(ent);
    if (!ent.flat) { status((ent.name || ent.kind || 'OBJECT').toUpperCase() + " ISN'T FLATTENED — PRESS M FIRST."); return; }
    ent.flatAngle = ((ent.flatAngle || 0) + dir * Math.PI / 4 + Math.PI * 2) % (Math.PI * 2);
    if (idx >= 0 && lv.ents[idx]) lv.ents[idx].flatAngle = ent.flatAngle;
    status((ent.name || ent.kind || 'OBJECT').toUpperCase() + ' FACING → ' + Math.round(ent.flatAngle * 180 / Math.PI) + '°');
  }
  // +/- : grow/shrink the placed entity under the crosshair — lets a landmark
  // prop (or anything else) be scaled up into background scenery, or down to
  // fit a tight spot, independent of that kind's baseline FACT scale.
  function geoScaleEnt(dir) {
    const r = pickEntNear();
    if (!r) { status('LOOK AT AN OBJECT.'); return; }
    const ent = r.ent, idx = World.ents.indexOf(ent);
    const next = Math.max(0.15, Math.min(6, ent.scale * (dir > 0 ? 1.08 : 1 / 1.08)));
    ent.scale = Math.round(next * 100) / 100;
    if (idx >= 0 && lv.ents[idx]) lv.ents[idx].scale = ent.scale;
    status((ent.name || ent.kind || 'OBJECT').toUpperCase() + ' SCALE → ' + ent.scale.toFixed(2));
  }
  function cycleTex(dir, shift) {                              // [ ] / wheel: wall (Shift = soffit over riser) else floor/ceil
    const t = texTarget(shift);
    if (!t) { status('LOOK AT A SURFACE.'); return; }
    if (t.kind === 'soffit') geoWallStepTex(dir);
    else if (t.kind === 'riser') geoWallStepFloorTex(dir);
    else if (t.kind === 'wall') geoWallTex(dir);
    else geoTex(dir, t.kind === 'ceil');
  }
  // assign a SPECIFIC texture name (not cycle) to whatever cycleTex would currently
  // act on — the texture-palette popup's click handler
  function setTexAtTarget(name, shift) {
    const t = texTarget(shift);
    if (!t) { status('LOOK AT A SURFACE.'); return; }
    if (t.kind === 'floor' || t.kind === 'ceil') {
      const sec = geo.sectors[t.s];
      if (t.kind === 'ceil') sec.ceilTex = name; else sec.floorTex = name;
      status('SECTOR ' + (t.s + 1) + ' ' + (t.kind === 'ceil' ? 'CEIL' : 'FLOOR') + ' → ' + name.toUpperCase());
      return;
    }
    const hit = t.hit, sec = geo.sectors[hit.s];
    if (t.kind === 'soffit') {
      if (!sec.wallStepTex) sec.wallStepTex = new Array(sec.loop.length).fill(null);
      sec.wallStepTex[hit.i] = name;
      status('WALL ' + (hit.i + 1) + ' SOFFIT → ' + name.toUpperCase());
    } else if (t.kind === 'riser') {
      if (!sec.wallStepFloorTex) sec.wallStepFloorTex = new Array(sec.loop.length).fill(null);
      sec.wallStepFloorTex[hit.i] = name;
      status('WALL ' + (hit.i + 1) + ' RISER → ' + name.toUpperCase());
    } else {
      if (!sec.wallTex) sec.wallTex = new Array(sec.loop.length).fill(null);
      sec.wallTex[hit.i] = name;
      status('WALL ' + (hit.i + 1) + ' → ' + name.toUpperCase());
    }
    portalGraph = Engine.buildGraph(geo);
  }
  // texture palette popup — \ opens it over the 3D preview, click a swatch to apply
  // it to whatever's under the crosshair right now, ESC cancels without changing anything
  let texPaletteOpen = false, texPaletteShift = false;
  function renderTexPalette() {
    const el = document.getElementById('texpaletteGrid');
    el.innerHTML = '';
    for (const name of World.TXNAMES) {
      const tc = thumb(gg => {
        gg.imageSmoothingEnabled = false;
        gg.drawImage(World.TX[name], 0, 0, 64, 64, 0, 0, 30, 30);
      });
      toolBtn(el, name.toUpperCase(), tc, () => {
        pushUndo();
        setTexAtTarget(name, texPaletteShift);
        closeTexPalette();
      });
    }
  }
  function openTexPalette(shift) {
    if (previewCompiled) { status('DRAW SECTORS TO SCULPT — GRID PREVIEW HAS NO SURFACES TO RETEXTURE.'); return; }
    Object.keys(pkeys).forEach(k => { pkeys[k] = false; });        // stop any held WASD/turn while the palette is up
    texPaletteShift = shift;
    texPaletteOpen = true;
    renderTexPalette();
    document.getElementById('texpalette').hidden = false;
    status('TEXTURE PALETTE — click one to apply, ESC to cancel.');
  }
  function closeTexPalette() {
    texPaletteOpen = false;
    document.getElementById('texpalette').hidden = true;
  }
  function geoWallTexScale() {                                 // cycle the looked-at WALL's tile size
    const hit = pickGeoWall(); if (!hit) { status('LOOK AT A WALL.'); return; }
    const sec = geo.sectors[hit.s];
    if (!sec.wallTexScale) sec.wallTexScale = new Array(sec.loop.length).fill(1);
    let i = TEXSCALES.indexOf(sec.wallTexScale[hit.i] || 1); if (i < 0) i = 0;
    const next = TEXSCALES[(i + 1) % TEXSCALES.length];
    sec.wallTexScale[hit.i] = next;
    portalGraph = Engine.buildGraph(geo);                      // re-derive wall.texScale
    status('WALL ' + (hit.i + 1) + ' TILE ×' + next + (next > 1 ? ' (bigger)' : next < 1 ? ' (smaller)' : ''));
  }
  const DOORKINDS = [null, 'radio', 'blast', 'mainframe', 'poster'];
  function geoDoor() {                                         // cycle the looked-at wall's door/interaction tag
    const hit = pickGeoWall(); if (!hit) { status('LOOK AT A WALL.'); return; }
    const sec = geo.sectors[hit.s];
    if (!sec.wallDoor) sec.wallDoor = new Array(sec.loop.length).fill(null);
    const next = DOORKINDS[(DOORKINDS.indexOf(sec.wallDoor[hit.i] || null) + 1) % DOORKINDS.length];
    sec.wallDoor[hit.i] = next;
    portalGraph = Engine.buildGraph(geo);                     // re-derive wall.door + siblings
    status('WALL ' + (hit.i + 1) + (hit.portal ? ' (portal)' : ' (solid)') + ' → ' + (next ? next.toUpperCase() : 'PLAIN'));
  }
  function geoBlockWall() {                                   // toggle an "invisible wall" on the looked-at wall —
    const hit = pickGeoWall(); if (!hit) { status('LOOK AT A WALL.'); return; }   // it still renders as a fully open
    const sec = geo.sectors[hit.s];                                              // portal (a forced-perspective vista
    if (!sec.wallBlock) sec.wallBlock = new Array(sec.loop.length).fill(false);   // stays visible) but blocks movement
    const next = !sec.wallBlock[hit.i];                                          // like a window you can't walk through
    sec.wallBlock[hit.i] = next;
    portalGraph = Engine.buildGraph(geo);                     // re-derive wall.block
    status('WALL ' + (hit.i + 1) + (hit.portal ? ' (portal)' : ' (solid)') + ' → ' + (next ? 'INVISIBLE WALL ON' : 'INVISIBLE WALL OFF') +
      (!hit.portal ? ' (already solid — no effect)' : ''));
  }

  // ---- texture favorites: hover a surface in the 3D preview, 1-9/0 applies a saved
  // texture, Shift+1-9/0 saves the surface under the crosshair into that slot. One
  // shared bank of 10 (not separate per floor/ceiling/wall) — persisted across sessions.
  const FAV_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'];
  const FAV_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  function loadFavorites() {
    try {
      const raw = localStorage.getItem('cloakclick.favorites');
      if (raw) { const a = JSON.parse(raw); if (Array.isArray(a) && a.length === 10) return a; }
    } catch (e) { /* ignore corrupt storage */ }
    return new Array(10).fill(null);
  }
  let favorites = loadFavorites();
  function persistFavorites() { try { localStorage.setItem('cloakclick.favorites', JSON.stringify(favorites)); } catch (e) { /* storage may be unavailable */ } }
  function renderFavbar() {
    const el = document.getElementById('favbar'); if (!el) return;
    el.innerHTML = '';
    FAV_LABELS.forEach((lbl, i) => {
      const name = favorites[i];
      const cell = document.createElement('div');
      cell.className = 'favslot' + (name ? '' : ' empty');
      if (name) {
        const tex = World.TX[name];
        if (tex) {
          const c = document.createElement('canvas'); c.width = 26; c.height = 26;
          c.getContext('2d').drawImage(tex, 0, 0, 64, 64, 0, 0, 26, 26);
          cell.appendChild(c);
        }
        cell.title = name.toUpperCase();
      }
      const num = document.createElement('span'); num.className = 'favnum'; num.textContent = lbl;
      cell.appendChild(num);
      el.appendChild(cell);
    });
  }
  // Ctrl+1-9/0 saves, plain 1-9/0 applies; Shift (either way) picks the SOFFIT over
  // the RISER on a stepped wall, same as the cycle keys and the texture palette.
  function favSave(slot, shift) {
    const t = texTarget(shift); if (!t) { status('LOOK AT A SURFACE.'); return; }
    let name;
    if (t.kind === 'floor') name = geo.sectors[t.s].floorTex;
    else if (t.kind === 'ceil') name = geo.sectors[t.s].ceilTex;
    else {
      const sec = geo.sectors[t.hit.s];
      name = t.kind === 'soffit' ? ((sec.wallStepTex && sec.wallStepTex[t.hit.i]) || 'vent')
        : t.kind === 'riser' ? ((sec.wallStepFloorTex && sec.wallStepFloorTex[t.hit.i]) || 'metal')
        : ((sec.wallTex && sec.wallTex[t.hit.i]) || 'brick');
    }
    favorites[slot] = name;
    persistFavorites(); renderFavbar();
    status('SLOT ' + FAV_LABELS[slot] + ' SAVED — ' + name.toUpperCase());
  }
  function favApply(slot, shift) {
    const name = favorites[slot];
    if (!name) { status('SLOT ' + FAV_LABELS[slot] + ' IS EMPTY — CTRL+' + FAV_LABELS[slot] + ' TO SAVE ONE.'); return; }
    const t = texTarget(shift); if (!t) { status('LOOK AT A SURFACE.'); return; }
    pushUndo();
    if (t.kind === 'floor' || t.kind === 'ceil') {
      const sec = geo.sectors[t.s];
      if (t.kind === 'ceil') sec.ceilTex = name; else sec.floorTex = name;
      status('SECTOR ' + (t.s + 1) + ' ' + (t.kind === 'ceil' ? 'CEIL' : 'FLOOR') + ' → ' + name.toUpperCase() + ' (slot ' + FAV_LABELS[slot] + ')');
      return;
    }
    const sec = geo.sectors[t.hit.s];
    if (t.kind === 'soffit') {
      if (!sec.wallStepTex) sec.wallStepTex = new Array(sec.loop.length).fill(null);
      sec.wallStepTex[t.hit.i] = name;
      status('WALL ' + (t.hit.i + 1) + ' SOFFIT → ' + name.toUpperCase() + ' (slot ' + FAV_LABELS[slot] + ')');
    } else if (t.kind === 'riser') {
      if (!sec.wallStepFloorTex) sec.wallStepFloorTex = new Array(sec.loop.length).fill(null);
      sec.wallStepFloorTex[t.hit.i] = name;
      status('WALL ' + (t.hit.i + 1) + ' RISER → ' + name.toUpperCase() + ' (slot ' + FAV_LABELS[slot] + ')');
    } else {
      if (!sec.wallTex) sec.wallTex = new Array(sec.loop.length).fill(null);
      sec.wallTex[t.hit.i] = name;
      status('WALL ' + (t.hit.i + 1) + ' → ' + name.toUpperCase() + ' (slot ' + FAV_LABELS[slot] + ')');
    }
    portalGraph = Engine.buildGraph(geo);
  }

  function pSolid(x, y) {
    const r = 0.2;
    return World.isSolid(x - r, y - r) || World.isSolid(x + r, y - r) ||
           World.isSolid(x - r, y + r) || World.isSolid(x + r, y + r);
  }
  function pUpdate(dt) {
    const turn = 2.4 * dt;
    if (pkeys.ArrowLeft) cam.a -= turn;
    if (pkeys.ArrowRight) cam.a += turn;
    if (pkeys.ArrowUp) cam.pitch = Math.min(70, cam.pitch + 90 * dt);
    if (pkeys.ArrowDown) cam.pitch = Math.max(-70, cam.pitch - 90 * dt);
    const dx = Math.cos(cam.a), dy = Math.sin(cam.a);
    let mx = 0, my = 0;
    if (pkeys.KeyW) { mx += dx; my += dy; }
    if (pkeys.KeyS) { mx -= dx; my -= dy; }
    if (pkeys.KeyD) { mx += -dy; my += dx; }
    if (pkeys.KeyA) { mx -= -dy; my -= dx; }
    const len = Math.hypot(mx, my);
    if (len > 0) {
      const sp = 3.0 * dt / len, nx = cam.x + mx * sp, ny = cam.y + my * sp;
      Engine.moveGeo(geo, portalGraph, cam, nx, ny, 0.2, 0.5);      // real wall/step collision on the Build engine
      for (const e of World.ents) {                                 // same solid-entity push-back as the game (main.js tryMove)
        if (!e.solid || e.dead) continue;
        const er = (e.scale || 0.5) * 0.4, min = 0.2 + er;
        const dx = cam.x - e.x, dy = cam.y - e.y, d = Math.hypot(dx, dy);
        if (d < min && d > 1e-4) { cam.x = e.x + (dx / d) * min; cam.y = e.y + (dy / d) * min; }
      }
    }
    // SPACE/C free-fly the eye up/down for navigation. The first tap of either
    // permanently drops the "eye follows the floor" snap below for this preview
    // session — otherwise the snap would drag a flown height straight back down
    // the instant you let go. Only C ever lowers it again from then on.
    if (pkeys.Space) { manualEyeZ = true; cam.eyeZ = Math.min(20, cam.eyeZ + 3.0 * dt); }
    if (pkeys.KeyC) { manualEyeZ = true; cam.eyeZ = Math.max(-8, cam.eyeZ - 3.0 * dt); }
    if (!manualEyeZ) {
      const s = Engine.sectorAt(cam.x, cam.y, geo);
      const target = (s >= 0 ? geo.sectors[s].floor : 0) + 0.5;
      cam.eyeZ += (target - cam.eyeZ) * Math.min(1, dt * 10);
    }
  }
  function pStep(dt) {                                             // one preview frame — also used as a debug hook
    pUpdate(dt || 1 / 60);
    Engine.renderPortal(pG, geo, portalGraph);                     // always the Build/portal renderer
    updateTarget();
  }
  function pLoop(t) {
    if (!previewOn) return;
    const dt = Math.min(0.05, (t - plast) / 1000 || 0.016); plast = t;
    pStep(dt);
    praf = requestAnimationFrame(pLoop);
  }
  function updateTarget() {
    const el = document.getElementById('ptarget');
    // an entity actually drawn at screen-centre is nearer than any wall/sector
    // behind it — check it first so J (solid toggle) always targets what you see
    const entHit = pickEntNear();
    if (entHit) {
      el.textContent = '● ' + (entHit.ent.name || entHit.ent.kind).toUpperCase() + '   ' +
        (entHit.ent.solid ? 'SOLID' : 'WALK-THROUGH') + '   J to toggle' +
        ('behavior' in entHit.ent ? '   ·   ' + entHit.ent.behavior.toUpperCase() + '   B to toggle' : '') +
        '   ·   SCALE ' + entHit.ent.scale.toFixed(2) + '   +/- to resize';
      el.style.display = 'block';
      Engine.setHighlight(null);
      return;
    }
    if (usePortal) {
      // Shift picks the ceiling off a plain surface, or the SOFFIT over the RISER on
      // a stepped wall — the same live modifier every texture command reads, so the
      // highlight always shows exactly what a keypress would actually hit right now.
      const shiftHeld = !!(pkeys.ShiftLeft || pkeys.ShiftRight);
      const t = texTarget(shiftHeld);
      if (!t) { el.style.display = 'none'; Engine.setHighlight(null); return; }
      if (t.kind === 'soffit' || t.kind === 'riser' || t.kind === 'wall') {
        const wallHit = t.hit, sec = geo.sectors[wallHit.s];
        const wscale = (sec.wallTexScale && sec.wallTexScale[wallHit.i]) || 1;
        const wdoor = sec.wallDoor && sec.wallDoor[wallHit.i];
        const wdecal = sec.wallDecal && sec.wallDecal[wallHit.i];
        const wblock = sec.wallBlock && sec.wallBlock[wallHit.i];
        const step = wallStepInfo(wallHit);
        let label, hint;
        if (t.kind === 'soffit') { label = 'SOFFIT ' + String((sec.wallStepTex && sec.wallStepTex[wallHit.i]) || 'vent').toUpperCase(); hint = '[ ] soffit tex' + (step.down ? ' · Shift = riser' : ''); }
        else if (t.kind === 'riser') { label = 'RISER ' + String((sec.wallStepFloorTex && sec.wallStepFloorTex[wallHit.i]) || 'metal').toUpperCase(); hint = '[ ] riser tex' + (step.up ? ' · Shift = soffit' : ''); }
        else { label = String((sec.wallTex && sec.wallTex[wallHit.i]) || 'brick').toUpperCase(); hint = 'T tile · F door · P decal · I invisible wall'; }
        el.textContent = '■ WALL ' + (wallHit.i + 1) + (wallHit.portal ? ' (portal)' : ' (solid)') +
          '   ' + label + (wscale !== 1 ? ' ×' + wscale : '') + (wdoor ? ' · ' + wdoor.toUpperCase() : '') + (wdecal ? ' · ' + wdecal.toUpperCase() + ' DECAL' : '') + (wblock ? ' · INVISIBLE WALL' : '') +
          (previewCompiled ? '' : '   ' + hint);
        el.style.display = 'block';
        Engine.setHighlight({ sec: wallHit.s, edge: wallHit.i });
        return;
      }
      const s = t.s, sec = geo.sectors[s];
      if (sec.solid) {                                          // a column/pillar — no floor/ceiling to report
        el.textContent = '■ SECTOR ' + (s + 1) + ' — SOLID COLUMN' + (previewCompiled ? '' : '   H to make walkable');
        el.style.display = 'block';
        Engine.setHighlight(null);
        return;
      }
      const doors = (sec.wallDoor && sec.wallDoor.filter(Boolean).length) || 0;
      el.textContent = (previewCompiled ? '◇ GRID SECTOR ' : '◆ SECTOR ') + (s + 1) + '   floor ' + sec.floor.toFixed(1) + ' · ceil ' + sec.ceil.toFixed(1) +
        '   ' + String(sec.floorTex).toUpperCase() + ' / ' + String(sec.ceilTex).toUpperCase() +
        ((sec.texScale || 1) !== 1 ? ' ×' + sec.texScale : '') + (sec.sky ? ' · SKY ' + String(sec.skyTex || 'havana').toUpperCase() : '') + (sec.win ? ' · WIN' : '') + (sec.hostile ? ' · HOSTILE' : '') + (doors ? ' · ' + doors + ' DOOR' : '') +
        (sec.parent >= 0 && !previewCompiled ? '   H solid' : '');
      el.style.display = 'block';
      Engine.setHighlight({ sec: s, kind: t.kind === 'ceil' ? 'ceil' : 'floor' });
      return;
    }
    Engine.setHighlight(null);
    const tt = Engine.pickAt(pcur.cx, pcur.cy);
    if (!tt) { el.style.display = 'none'; return; }
    if (tt.kind === 2) {
      el.textContent = '■ WALL  ' + World.wallTexName(tt.mx, tt.my).toUpperCase() + '   [ ] swap texture';
    } else if (tt.kind === 1) {
      const s = World.surfAt(tt.mx, tt.my);
      el.textContent = '▼ CEILING  z ' + s.c.toFixed(1) + '  ' + String(s.ct || '—').toUpperCase() + '   PgUp/PgDn · [ ]';
    } else {
      const s = World.surfAt(tt.mx, tt.my);
      const grad = Math.hypot(s.fsx, s.fsy);
      el.textContent = '▲ FLOOR  z ' + s.f.toFixed(1) + '  ' + String(s.ft).toUpperCase() +
        (grad > 0.001 ? '  slope ' + grad.toFixed(2) : '') + '   PgUp/PgDn · [ ] · , . slope';
    }
    el.style.display = 'block';
  }
  function enterPreview() {
    // Always preview on the Build/portal engine (matches the game — no raycaster).
    // A grid level is compiled to vector sectors in-place for the walkthrough;
    // levels with drawn sectors use their own geometry (and stay sculptable).
    try { World.load(toLevel()); }                               // entities + textures for either path
    catch (err) { status('PREVIEW FAILED: ' + String(err.message || err).toUpperCase()); return; }
    previewCompiled = geo.sectors.length === 0;
    if (previewCompiled) { const g = World.compileGeo(); geo.verts = g.verts; geo.sectors = g.sectors; }
    usePortal = true;
    portalGraph = Engine.buildGraph(geo);
    cam.pitch = 0; cam.sector = undefined;
    manualEyeZ = false;                                          // fresh preview session — eye follows the floor again until SPACE/C
    if (previewCam) {                                            // an explicit CAMERA-tool placement (or wherever you last stood) wins
      cam.x = previewCam.x; cam.y = previewCam.y; cam.a = previewCam.a;
    } else if (previewCompiled) {                                // start at the mission spawn
      cam.x = lv.spawn.x; cam.y = lv.spawn.y; cam.a = lv.spawn.a;
    } else {                                                     // start in a corner of the first drawn sector
      const L = geo.sectors[0].loop, v0 = geo.verts[L[0]], cn = centroid(L);
      cam.x = v0.x + (cn.x - v0.x) * 0.3; cam.y = v0.y + (cn.y - v0.y) * 0.3;
      cam.a = Math.atan2(cn.y - cam.y, cn.x - cam.x);
    }
    const s = Engine.sectorAt(cam.x, cam.y, geo);
    cam.eyeZ = (s >= 0 ? geo.sectors[s].floor : 0) + 0.5;
    if (!pengineReady) { Engine.init(pcanvas); pengineReady = true; }
    document.getElementById('grid').hidden = true;
    document.getElementById('preview3d').hidden = false;
    const b = document.getElementById('viewtoggle');
    b.classList.add('active'); b.innerHTML = '&#9638; MAP EDITOR';
    document.getElementById('viewhint').textContent = previewCompiled ? 'Walking your level on the Build engine' : 'Walking & sculpting your vector sectors';
    document.getElementById('pcontrols').innerHTML = previewCompiled
      ? '<b>WASD</b> move (collides) &nbsp;·&nbsp; <b>SPACE</b>/<b>C</b> fly up/down &nbsp;·&nbsp; <b>DRAG</b> look &nbsp;·&nbsp; grid level — DRAW SECTORS to sculpt in 3D, or edit the 2D map &nbsp;·&nbsp; <b>J</b> object solid ⇄ walk-through &nbsp;·&nbsp; <b>B</b> character wander ⇄ stationary &nbsp;·&nbsp; <b>+</b>/<b>-</b> scale object &nbsp;·&nbsp; <b>ESC</b> map'
      : '<b>WASD</b> move &nbsp;·&nbsp; <b>SPACE</b>/<b>C</b> fly up/down &nbsp;·&nbsp; <b>DRAG</b> look &nbsp;·&nbsp; sector: <b>PgUp</b>/<b>PgDn</b> floor (Shift ceil) &nbsp;·&nbsp; <b>[</b> <b>]</b> / <b>scroll</b> / <b>\\</b> tex — wall if aiming close, else floor (Shift ceil; on a stepped wall Shift picks the SOFFIT over the RISER) &nbsp;·&nbsp; <b>T</b> tile size &nbsp;·&nbsp; <b>K</b> sky (<b>Shift</b>+<b>K</b> which sky) &nbsp;·&nbsp; <b>G</b> win &nbsp;·&nbsp; <b>N</b> hostile area &nbsp;·&nbsp; <b>F</b> door &nbsp;·&nbsp; <b>H</b> solid column ⇄ walkable &nbsp;·&nbsp; <b>P</b> mount a sprite on a wall (poster) &nbsp;·&nbsp; <b>J</b> object solid ⇄ walk-through &nbsp;·&nbsp; <b>B</b> character wander ⇄ stationary &nbsp;·&nbsp; <b>+</b>/<b>-</b> scale object &nbsp;·&nbsp; <b>1</b>-<b>9</b>/<b>0</b> apply favorite (Shift = soffit) &nbsp;·&nbsp; <b>Ctrl</b>+<b>1</b>-<b>9</b>/<b>0</b> save favorite &nbsp;·&nbsp; <b>ESC</b> map';
    document.getElementById('favbar').style.display = previewCompiled ? 'none' : 'flex';
    renderFavbar();
    previewOn = true; plast = performance.now();
    praf = requestAnimationFrame(pLoop);
  }
  function exitPreview() {
    previewOn = false; if (praf) cancelAnimationFrame(praf);
    previewCam = { x: +cam.x.toFixed(2), y: +cam.y.toFixed(2), a: cam.a };  // remember exactly where you left off
    if (previewCompiled) { geo.verts = []; geo.sectors = []; previewCompiled = false; }  // discard the throwaway grid compile
    document.getElementById('grid').hidden = false;
    document.getElementById('preview3d').hidden = true;
    const b = document.getElementById('viewtoggle');
    b.classList.remove('active'); b.innerHTML = '&#9633; 3D PREVIEW';
    document.getElementById('viewhint').textContent = 'Walk your level in first person';
    render();
  }
  document.getElementById('viewtoggle').onclick = () => previewOn ? exitPreview() : enterPreview();
  document.getElementById('rectbtn').onclick = () => {
    rectMode = !rectMode;
    document.getElementById('rectbtn').classList.toggle('active', rectMode);
    status(rectMode ? 'RECT FILL ON — drag a region with any paint tool.' : 'RECT FILL OFF.');
  };

  window.addEventListener('keydown', e => {
    if (!previewOn) return;
    const el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'SELECT')) return;
    if (texPaletteOpen) {                          // popup swallows everything except its own cancel key
      if (e.code === 'Escape') { closeTexPalette(); e.preventDefault(); }
      return;
    }
    if (e.code === 'Escape') { exitPreview(); return; }
    // Portal preview sculpts the VECTOR sector under the crosshair (Shift = ceiling).
    // A grid level compiled just for the walkthrough (previewCompiled) isn't sculpted
    // in 3D — draw sectors, or edit heights/textures in the 2D map.
    if (!previewCompiled) {
      const sh = e.shiftKey;
      if (e.code === 'Backslash') { openTexPalette(sh); e.preventDefault(); return; }
      if (e.code === 'PageUp') { if (!e.repeat) pushUndo(); geoRaise(+1, sh); e.preventDefault(); return; }
      if (e.code === 'PageDown') { if (!e.repeat) pushUndo(); geoRaise(-1, sh); e.preventDefault(); return; }
      if (e.code === 'BracketRight') { if (!e.repeat) pushUndo(); cycleTex(+1, sh); e.preventDefault(); return; }
      if (e.code === 'BracketLeft') { if (!e.repeat) pushUndo(); cycleTex(-1, sh); e.preventDefault(); return; }
      if (e.code === 'KeyT') {
        if (!e.repeat) pushUndo();
        const wallHit = !sh && pickGeoWall();                 // close-range wall in view → scale IT, not the floor
        if (wallHit && wallHit.dist < wallPickDist(wallHit)) geoWallTexScale(); else geoTexScale();
        e.preventDefault(); return;
      }
      if (e.code === 'KeyK') { if (!e.repeat) pushUndo(); if (sh) geoSkyTex(); else geoSky(); e.preventDefault(); return; }
      if (e.code === 'KeyG') { if (!e.repeat) pushUndo(); geoWin(); e.preventDefault(); return; }
      if (e.code === 'KeyN') { if (!e.repeat) pushUndo(); geoHostile(); e.preventDefault(); return; }
      if (e.code === 'KeyF') { if (!e.repeat) pushUndo(); geoDoor(); e.preventDefault(); return; }
      if (e.code === 'KeyH') { if (!e.repeat) pushUndo(); geoToggleSolid(); e.preventDefault(); return; }
      if (e.code === 'KeyP') { if (!e.repeat) pushUndo(); geoWallDecal(); e.preventDefault(); return; }   // mount/cycle a sprite on the wall, poster-style
      if (e.code === 'KeyI') { if (!e.repeat) pushUndo(); geoBlockWall(); e.preventDefault(); return; }   // toggle invisible wall (open portal, blocked movement)
      const favIdx = FAV_KEYS.indexOf(e.code);
      if (favIdx >= 0) { if (!e.repeat) { if (e.ctrlKey) favSave(favIdx, sh); else favApply(favIdx, sh); } e.preventDefault(); return; }
    }
    // works on either a grid or vector level — toggles whether a placed entity
    // blocks movement, independent of any sector/wall sculpting
    if (e.code === 'KeyJ') { if (!e.repeat) pushUndo(); geoToggleEntSolid(); e.preventDefault(); return; }
    if (e.code === 'KeyB') { if (!e.repeat) pushUndo(); geoToggleEntWander(); e.preventDefault(); return; }
    if (e.code === 'KeyM') { if (!e.repeat) pushUndo(); geoToggleEntFlat(); e.preventDefault(); return; }
    if (e.code === 'Comma') { if (!e.repeat) pushUndo(); geoRotateEntFlat(-1); e.preventDefault(); return; }
    if (e.code === 'Period') { if (!e.repeat) pushUndo(); geoRotateEntFlat(+1); e.preventDefault(); return; }
    if (e.code === 'Equal' || e.code === 'NumpadAdd') { if (!e.repeat) pushUndo(); geoScaleEnt(+1); e.preventDefault(); return; }
    if (e.code === 'Minus' || e.code === 'NumpadSubtract') { if (!e.repeat) pushUndo(); geoScaleEnt(-1); e.preventDefault(); return; }
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyC'].includes(e.code)) {
      pkeys[e.code] = true; e.preventDefault();
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') pkeys[e.code] = true;   // tracked for the live floor/ceiling highlight
  });
  window.addEventListener('keyup', e => { pkeys[e.code] = false; });
  function updatePcur(e) {
    const r = pcanvas.getBoundingClientRect();
    pcur.cx = Math.floor((e.clientX - r.left) / r.width * Engine.W);
    pcur.cy = Math.floor((e.clientY - r.top) / r.height * Engine.H);
  }
  pcanvas.addEventListener('mousemove', updatePcur);
  pcanvas.addEventListener('mousedown', e => { if (texPaletteOpen) return; pdrag = true; plx = e.clientX; ply = e.clientY; updatePcur(e); });
  window.addEventListener('mouseup', () => { pdrag = false; });
  window.addEventListener('mousemove', e => {
    if (!pdrag || !previewOn || texPaletteOpen) return;
    cam.a += (e.clientX - plx) * 0.005;
    cam.pitch = Math.max(-70, Math.min(70, cam.pitch - (e.clientY - ply) * 0.4));
    plx = e.clientX; ply = e.clientY;
  });
  pcanvas.addEventListener('wheel', e => {                    // scroll = cycle texture on whatever you're aiming at
    if (!previewOn || previewCompiled || texPaletteOpen) return;
    e.preventDefault();
    pushUndo(); cycleTex(e.deltaY < 0 ? +1 : -1, e.shiftKey);
  }, { passive: false });

  // ---- vector sector geometry (Build-style DRAW mode) ----
  function worldFromEvent(e) {
    const r = cvs.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (cvs.width / r.width) / cellPx,
             y: (e.clientY - r.top) * (cvs.height / r.height) / cellPx };
  }
  function snapWorld(wx, wy) {                                  // snap to a nearby vertex, else 0.5 grid
    let best = -1, bd = 0.45 * 0.45;
    for (let i = 0; i < geo.verts.length; i++) {
      const dx = geo.verts[i].x - wx, dy = geo.verts[i].y - wy, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i; }
    }
    if (best >= 0) return { x: geo.verts[best].x, y: geo.verts[best].y, vi: best };
    return { x: Math.round(wx * 2) / 2, y: Math.round(wy * 2) / 2, vi: -1 };
  }
  function vertIndexFor(sp) {
    if (sp.vi >= 0) return sp.vi;
    geo.verts.push({ x: sp.x, y: sp.y });
    return geo.verts.length - 1;
  }
  function polyArea(loop) {
    let a = 0;
    for (let i = 0; i < loop.length; i++) {
      const p = geo.verts[loop[i]], q = geo.verts[loop[(i + 1) % loop.length]];
      a += p.x * q.y - q.x * p.y;
    }
    return a / 2;
  }
  function centroid(loop) {
    let x = 0, y = 0;
    for (const vi of loop) { x += geo.verts[vi].x; y += geo.verts[vi].y; }
    return { x: x / loop.length, y: y / loop.length };
  }
  function pointInLoop(px, py, loop) {
    let inside = false;
    for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
      const a = geo.verts[loop[i]], b = geo.verts[loop[j]];
      if (((a.y > py) !== (b.y > py)) && (px < (b.x - a.x) * (py - a.y) / (b.y - a.y) + a.x)) inside = !inside;
    }
    return inside;
  }
  function edgeIsPortal(s, a, b) {
    if (geo.sectors[s].parent >= 0) return !geo.sectors[s].solid;  // walkable sub-sector outline → red; solid column → white
    for (let s2 = 0; s2 < geo.sectors.length; s2++) {
      if (s2 === s) continue;
      const L = geo.sectors[s2].loop;
      for (let j = 0; j < L.length; j++) {
        const x = L[j], y = L[(j + 1) % L.length];
        if ((x === a && y === b) || (x === b && y === a)) return true;  // shared wall → red
      }
    }
    return false;
  }
  function distToSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx, cy = ay + t * dy;
    return { d: Math.hypot(px - cx, py - cy), x: cx, y: cy };
  }

  function placeVertex() {
    const sp = snapWorld(gcur.x, gcur.y);
    if (draft.length === 0) { draft.push(vertIndexFor(sp)); render(); return; }
    if (sp.vi === draft[0] && draft.length >= 3) { closeSector(); return; }
    const vi = vertIndexFor(sp);
    if (draft.includes(vi)) { status('THAT VERTEX IS ALREADY IN THE LOOP.'); return; }
    draft.push(vi); render();
  }
  function closeSector() {
    const loop = draft.slice();
    if (polyArea(loop) < 0) loop.reverse();                    // normalise to CCW
    const sec = { loop, floor: 0, ceil: 1, floorTex: 'carpet', ceilTex: 'ceiltile', sky: false, skyTex: null, win: false, hostile: false, texScale: 1, wallDoor: null, wallBlock: null, wallTex: null, wallTexScale: null, wallStepTex: null, wallStepFloorTex: null, wallDecal: null, parent: -1, solid: false };
    const c = centroid(loop);
    for (let s = 0; s < geo.sectors.length; s++)
      if (pointInLoop(c.x, c.y, geo.sectors[s].loop)) { sec.parent = s; break; }  // nested → sub-sector
    // Build-engine convention: a shape drawn INSIDE another sector starts as a
    // solid mass (a column/pillar) — not a walkable room. Press H on it in the
    // 3D preview to convert it into a proper sector with its own floor/ceiling.
    sec.solid = sec.parent >= 0;
    geo.sectors.push(sec);
    draft = [];
    status('SECTOR ' + geo.sectors.length + ' CREATED · ' + loop.length + ' walls' +
      (sec.parent >= 0 ? ' · SOLID (H in 3D preview to make it walkable)' : ''));
    render();
  }
  function insertVertexOnWall() {
    if (!hoverEdge) { status('HOVER A WALL, THEN PRESS I.'); return; }
    const { s, i } = hoverEdge, loop = geo.sectors[s].loop;
    const a = loop[i], b = loop[(i + 1) % loop.length];
    const cp = distToSeg(gcur.x, gcur.y, geo.verts[a].x, geo.verts[a].y, geo.verts[b].x, geo.verts[b].y);
    geo.verts.push({ x: +cp.x.toFixed(3), y: +cp.y.toFixed(3) });
    const nv = geo.verts.length - 1;
    for (const sec of geo.sectors) {                           // split in every sector sharing the wall
      const L = sec.loop;
      for (let j = 0; j < L.length; j++) {
        const x = L[j], y = L[(j + 1) % L.length];
        if ((x === a && y === b) || (x === b && y === a)) { L.splice(j + 1, 0, nv); break; }
      }
    }
    status('VERTEX INSERTED ON WALL.'); render();
  }
  function cancelDraft() { if (draft.length) { draft = []; status('DRAFT CANCELLED.'); render(); } }

  function updateDrawHover(e) {
    const w = worldFromEvent(e);
    if (draggingVert >= 0) {                          // move the dragged vertex, snapped to the half-grid
      geo.verts[draggingVert].x = Math.round(w.x * 2) / 2;
      geo.verts[draggingVert].y = Math.round(w.y * 2) / 2;
      gcur.x = geo.verts[draggingVert].x; gcur.y = geo.verts[draggingVert].y; gcur.vi = draggingVert;
      render(); return;
    }
    const sp = snapWorld(w.x, w.y);
    gcur.x = sp.x; gcur.y = sp.y; gcur.vi = sp.vi;
    hoverEdge = null; let bd = 0.5;
    for (let s = 0; s < geo.sectors.length; s++) {
      const L = geo.sectors[s].loop;
      for (let i = 0; i < L.length; i++) {
        const A = geo.verts[L[i]], B = geo.verts[L[(i + 1) % L.length]];
        const cp = distToSeg(w.x, w.y, A.x, A.y, B.x, B.y);
        if (cp.d < bd) { bd = cp.d; hoverEdge = { s, i }; }
      }
    }
    coordsEl.textContent = 'DRAW  x ' + gcur.x.toFixed(1) + '  y ' + gcur.y.toFixed(1) +
      (draft.length ? '  · ' + draft.length + ' verts' : '') + (hoverEdge ? '  · [I] split wall' : '');
    render();
  }

  function renderGeo() {
    const c = cellPx;
    for (let s = 0; s < geo.sectors.length; s++) {             // faint sector fills
      const L = geo.sectors[s].loop;
      g.beginPath();
      for (let i = 0; i < L.length; i++) { const v = geo.verts[L[i]]; i ? g.lineTo(v.x * c, v.y * c) : g.moveTo(v.x * c, v.y * c); }
      g.closePath();
      g.fillStyle = geo.sectors[s].solid ? 'rgba(40,40,46,0.85)'          // solid column — filled in, opaque
        : geo.sectors[s].parent >= 0 ? 'rgba(200,80,80,0.10)' : 'rgba(120,180,255,0.08)';
      g.fill();
      if (geo.sectors[s].hostile) { g.fillStyle = 'rgba(220,40,30,0.16)'; g.fill(); }  // hostile-area tint, on top
    }
    g.lineWidth = 2.5; g.lineCap = 'round';                    // walls: white solid, red portal
    for (let s = 0; s < geo.sectors.length; s++) {
      const L = geo.sectors[s].loop;
      for (let i = 0; i < L.length; i++) {
        const A = geo.verts[L[i]], B = geo.verts[L[(i + 1) % L.length]];
        g.strokeStyle = edgeIsPortal(s, L[i], L[(i + 1) % L.length]) ? '#ff5555' : '#eef2f6';
        g.beginPath(); g.moveTo(A.x * c, A.y * c); g.lineTo(B.x * c, B.y * c); g.stroke();
      }
    }
    if (hoverEdge) {
      const L = geo.sectors[hoverEdge.s].loop, A = geo.verts[L[hoverEdge.i]], B = geo.verts[L[(hoverEdge.i + 1) % L.length]];
      g.strokeStyle = '#7fe0d8'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(A.x * c, A.y * c); g.lineTo(B.x * c, B.y * c); g.stroke();
    }
    g.fillStyle = '#ffd75e';                                   // vertices
    for (const v of geo.verts) { g.beginPath(); g.arc(v.x * c, v.y * c, 2.5, 0, 7); g.fill(); }
    if (draft.length) {                                        // draft polyline + rubber band
      g.strokeStyle = '#b8ffb8'; g.lineWidth = 2;
      g.beginPath();
      for (let i = 0; i < draft.length; i++) { const v = geo.verts[draft[i]]; i ? g.lineTo(v.x * c, v.y * c) : g.moveTo(v.x * c, v.y * c); }
      g.lineTo(gcur.x * c, gcur.y * c); g.stroke();
      const first = geo.verts[draft[0]];
      g.strokeStyle = 'rgba(184,255,184,0.5)'; g.lineWidth = 2;
      g.beginPath(); g.arc(first.x * c, first.y * c, 6, 0, 7); g.stroke();
    }
    if (draggingVert >= 0) {                                   // actively dragging: solid highlight, bigger
      g.fillStyle = 'rgba(255,215,94,0.5)';
      g.beginPath(); g.arc(gcur.x * c, gcur.y * c, 7, 0, 7); g.fill();
    }
    g.strokeStyle = gcur.vi >= 0 ? '#ffd75e' : '#8fd6ff'; g.lineWidth = 2;
    g.beginPath(); g.arc(gcur.x * c, gcur.y * c, 4, 0, 7); g.stroke();
  }

  // ---- undo stack (snapshots the whole edited level; grouped per action) ----
  const undoStack = [];
  function snapshot() {
    return JSON.stringify({
      w: lv.w, h: lv.h, cells: lv.cells, fh: lv.fh, ch: lv.ch, stex: lv.stex, ctex: lv.ctex,
      fsx: lv.fsx, fsy: lv.fsy, spawn: lv.spawn, ents: lv.ents, geo, draft,
    });
  }
  function pushUndo() { undoStack.push(snapshot()); if (undoStack.length > 60) undoStack.shift(); }
  function undo() {
    if (!undoStack.length) { status('NOTHING TO UNDO.'); return; }
    const s = JSON.parse(undoStack.pop());
    lv.w = s.w; lv.h = s.h; lv.cells = s.cells; lv.fh = s.fh; lv.ch = s.ch;
    lv.stex = s.stex; lv.ctex = s.ctex; lv.fsx = s.fsx; lv.fsy = s.fsy;
    lv.spawn = s.spawn; lv.ents = s.ents;
    geo.verts = s.geo.verts; geo.sectors = s.geo.sectors; draft = s.draft;
    fitCanvas();
    if (previewOn) { if (usePortal) portalGraph = Engine.buildGraph(geo); else World.load(toLevel()); }
    render(); status('UNDO.');
  }

  // ---- vector deletion (Build-style: remove verts / sectors) ----
  function rebuildParents() {
    geo.sectors.forEach((sec, s) => {
      sec.parent = -1;
      const c = centroid(sec.loop);
      for (let p = 0; p < geo.sectors.length; p++) {
        if (p === s || !pointInLoop(c.x, c.y, geo.sectors[p].loop)) continue;
        if (sec.parent < 0 || Math.abs(polyArea(geo.sectors[p].loop)) < Math.abs(polyArea(geo.sectors[sec.parent].loop))) sec.parent = p;
      }
    });
  }
  function reindexAfterRemoved(vi) {
    geo.verts.splice(vi, 1);
    const dec = i => (i > vi ? i - 1 : i);
    geo.sectors.forEach(sec => { sec.loop = sec.loop.map(dec); });
    draft = draft.map(dec);
  }
  function pruneVerts() {
    const used = new Set();
    geo.sectors.forEach(sec => sec.loop.forEach(i => used.add(i)));
    draft.forEach(i => used.add(i));
    for (let i = geo.verts.length - 1; i >= 0; i--) if (!used.has(i)) reindexAfterRemoved(i);
  }
  function deleteVertex(vi) {
    geo.sectors.forEach(sec => { const k = sec.loop.indexOf(vi); if (k >= 0) sec.loop.splice(k, 1); });
    const dk = draft.indexOf(vi); if (dk >= 0) draft.splice(dk, 1);
    geo.sectors = geo.sectors.filter(sec => sec.loop.length >= 3);
    reindexAfterRemoved(vi);
    pruneVerts(); rebuildParents();
  }
  function deleteSectorAt(x, y) {
    let best = -1, ba = Infinity;
    for (let s = 0; s < geo.sectors.length; s++)
      if (pointInLoop(x, y, geo.sectors[s].loop)) { const a = Math.abs(polyArea(geo.sectors[s].loop)); if (a < ba) { ba = a; best = s; } }
    if (best < 0) return false;
    geo.sectors.splice(best, 1); pruneVerts(); rebuildParents();
    return true;
  }
  function handleDelete() {
    if (drawMode) {
      if (draft.length) { pushUndo(); draft.pop(); status('REMOVED LAST VERTEX.'); render(); }
      else if (gcur.vi >= 0) { pushUndo(); deleteVertex(gcur.vi); gcur.vi = -1; hoverEdge = null; status('VERTEX DELETED.'); render(); }
      else { pushUndo(); if (deleteSectorAt(gcur.x, gcur.y)) { status('SECTOR DELETED.'); render(); } else { undoStack.pop(); status('NOTHING TO DELETE HERE.'); } }
    } else if (hover) {
      pushUndo(); eraseCell(hover.x, hover.y); render();
    }
  }

  document.getElementById('drawbtn').onclick = () => {
    drawMode = !drawMode;
    document.getElementById('drawbtn').classList.toggle('active', drawMode);
    document.getElementById('drawhelp').hidden = !drawMode;
    if (drawMode && previewOn) exitPreview();
    if (drawMode) { rectMode = false; document.getElementById('rectbtn').classList.remove('active'); }
    draft = [];
    status(drawMode ? 'DRAW MODE — SPACE/click vertices · DEL removes · Ctrl-Z undo.' : 'DRAW MODE OFF.');
    render();
  };
  window.addEventListener('keydown', e => {
    const el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'SELECT')) return;
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { undo(); e.preventDefault(); return; }
    if ((e.code === 'Delete' || e.code === 'Backspace') && !previewOn) { handleDelete(); e.preventDefault(); return; }
    if (!previewOn && (e.code === 'BracketRight' || e.code === 'BracketLeft')) {   // 2D map: cycle the ENT stamp
      cycleEntKind(e.code === 'BracketRight' ? 1 : -1); e.preventDefault(); return;
    }
    if (!drawMode || previewOn) return;
    if (e.code === 'Space') { pushUndo(); placeVertex(); e.preventDefault(); }
    else if (e.code === 'KeyI') { pushUndo(); insertVertexOnWall(); e.preventDefault(); }
    else if (e.code === 'Escape') {
      if (draft.length) cancelDraft();
      else deselectEntTool();
      e.preventDefault();
    }
  });

  // clicking anywhere in the palette that isn't a prop/tool button drops out of prop-placement mode
  document.getElementById('palette').addEventListener('click', e => {
    if (!e.target.closest('.tool')) deselectEntTool();
  });

  // ---- boot: vector-native editor (the grid painter is retired) ----
  buildPalette();
  drawMode = true;                                            // vector authoring is the only mode
  document.querySelectorAll('.gridtool').forEach(el => el.hidden = true);
  document.getElementById('drawhelp').hidden = false;
  let start = null;
  try { start = JSON.parse(localStorage.getItem(LS_KEY)); } catch (e) {}
  fromLevel(start && start.geo && start.geo.sectors && start.geo.sectors.length ? start : blankLevel(24, 24));
  status('READY, ARCHITECT — DRAW A SECTOR.');

  return { lv, toLevel, fromLevel, apply, erase, save, get tool() { return tool; }, set tool(t) { tool = t; }, render,
    get geo() { return geo; }, get draft() { return draft; }, get drawMode() { return drawMode; }, get cam() { return cam; },
    pStep, get portalGraph() { return portalGraph; }, rebuildPortalGraph: () => { portalGraph = Engine.buildGraph(geo); } };
})();

window.EDITOR = Editor;
