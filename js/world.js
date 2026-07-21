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

  // ---------------------------------------------------------------------------
  // PLAZA VIEJA — the default mission, hand-authored in the editor (LAIR
  // ARCHITECT) as a large vector level (48×48, ~24 sectors) and imported here
  // verbatim (2026-07). Carries every puzzle system built so far: the radio
  // door/tube/mainframe/blast-gate chain, the disguise-kit stealth reset, the
  // Letters of Transit safe+book combo, the Carlotta/hairpin alt-lockpick,
  // Secret Phrase (cipher machine), Defuse the B (Dr. Z + bomb), The Defector
  // (business card + phone booth + watch escort), and Learn the Truth (agent
  // 005's boss reveal → keys → sportscar). Replaces the earlier hand-coded
  // procedural IIFE — this is now the single source of truth for Plaza Vieja.
  // ---------------------------------------------------------------------------
  const DEFAULT = {
  "v": 5,
  "w": 48,
  "h": 48,
  "map": [
    "%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%",
    "%..........%...................................%",
    "%..........%...................................%",
    "%..........%...................................%",
    "%..........%...................................%",
    "%..........%...................................%",
    "%..........%...................................%",
    "%..........%...................................%",
    "%..........%...................................%",
    "%..........%...................................%",
    "%..........%...................................%",
    "%%%%%%%%%%%%...................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%..............................................%",
    "%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%"
  ],
  "spawn": {
    "x": 21.4,
    "y": 6.63,
    "a": 0
  },
  "ents": [
    {
      "kind": "streetlamp",
      "x": 31.06,
      "y": 20.95
    },
    {
      "kind": "streetlamp",
      "x": 26.53,
      "y": 3.54
    },
    {
      "kind": "streetlamp",
      "x": 18.59,
      "y": 6.42
    },
    {
      "kind": "oildrum",
      "x": 18.41,
      "y": 7.95
    },
    {
      "kind": "waiter",
      "x": 28.71,
      "y": 18.42,
      "behavior": "stationary"
    },
    {
      "kind": "civilianM",
      "x": 17.88,
      "y": 11.84,
      "behavior": "stationary"
    },
    {
      "kind": "brute",
      "x": 26.35,
      "y": 15.78
    },
    {
      "kind": "royalpalm",
      "x": 27.57,
      "y": 7.81
    },
    {
      "kind": "bananaplant",
      "x": 19.7,
      "y": 8.57
    },
    {
      "kind": "bananaplant",
      "x": 22.23,
      "y": 8.74
    },
    {
      "kind": "fern",
      "x": 23.93,
      "y": 8.97
    },
    {
      "kind": "hedge",
      "x": 24.33,
      "y": 10.54
    },
    {
      "kind": "hedge",
      "x": 24.73,
      "y": 11.84
    },
    {
      "kind": "goon",
      "x": 29,
      "y": 22.91
    },
    {
      "kind": "goon",
      "x": 22.6,
      "y": 18.11
    },
    {
      "kind": "royalpalm",
      "x": 20.77,
      "y": 16.51
    },
    {
      "kind": "royalpalm",
      "x": 25.1,
      "y": 16.34
    },
    {
      "kind": "bar",
      "x": 21.65,
      "y": 7.16
    },
    {
      "kind": "plant",
      "x": 24.76,
      "y": 5.76
    },
    {
      "kind": "armchair",
      "x": 24.88,
      "y": 6.21
    },
    {
      "kind": "bookshelf",
      "x": 24.41,
      "y": 7.09
    },
    {
      "kind": "bougainvillea",
      "x": 20.04,
      "y": 7.21
    },
    {
      "kind": "phonebooth",
      "x": 22.78,
      "y": 8.4
    },
    {
      "kind": "goon",
      "x": 5.65,
      "y": 3.31
    },
    {
      "kind": "goon",
      "x": 7.06,
      "y": 3.37
    },
    {
      "kind": "goon",
      "x": 8.71,
      "y": 3.6
    },
    {
      "kind": "goon",
      "x": 10.29,
      "y": 3.72
    },
    {
      "kind": "goon",
      "x": 11.53,
      "y": 3.78
    },
    {
      "kind": "goon",
      "x": 5.35,
      "y": 4.9
    },
    {
      "kind": "goon",
      "x": 7.29,
      "y": 5.13
    },
    {
      "kind": "goon",
      "x": 9.06,
      "y": 5.25
    },
    {
      "kind": "goon",
      "x": 6.06,
      "y": 4.9
    },
    {
      "kind": "goon",
      "x": 10.82,
      "y": 5.07
    },
    {
      "kind": "goon",
      "x": 8.29,
      "y": 5.48
    },
    {
      "kind": "goon",
      "x": 5.91,
      "y": 6.18
    },
    {
      "kind": "royalpalm",
      "x": 5.36,
      "y": 2.37
    },
    {
      "kind": "royalpalm",
      "x": 6.64,
      "y": 2.39
    },
    {
      "kind": "bananaplant",
      "x": 7.54,
      "y": 2.43
    },
    {
      "kind": "royalpalm",
      "x": 8.63,
      "y": 2.66
    },
    {
      "kind": "bananaplant",
      "x": 9.43,
      "y": 2.69
    },
    {
      "kind": "bananaplant",
      "x": 10.39,
      "y": 2.67
    },
    {
      "kind": "royalpalm",
      "x": 11,
      "y": 2.77
    },
    {
      "kind": "royalpalm",
      "x": 12.07,
      "y": 2.76
    },
    {
      "kind": "guardpost",
      "x": 4.73,
      "y": 3.72
    },
    {
      "kind": "guardpost",
      "x": 12,
      "y": 4.1
    },
    {
      "kind": "goon",
      "x": 27.39,
      "y": 13.58
    },
    {
      "kind": "agent",
      "x": 29.09,
      "y": 32.12
    },
    {
      "kind": "desk",
      "x": 28.43,
      "y": 11.5
    },
    {
      "kind": "bougainvillea",
      "x": 27.85,
      "y": 0.96
    },
    {
      "kind": "bougainvillea",
      "x": 29.45,
      "y": 1.06
    },
    {
      "kind": "cactus",
      "x": 28.63,
      "y": 0.83
    },
    {
      "kind": "flowergirl",
      "x": 28.5,
      "y": 1.96,
      "behavior": "stationary",
      "solid": true
    },
    {
      "kind": "vendingmachine",
      "x": 31.67,
      "y": 17.92
    },
    {
      "kind": "bomb",
      "x": 36.83,
      "y": 13.57
    },
    {
      "kind": "microfichemachine",
      "x": 29.67,
      "y": 11.64
    },
    {
      "kind": "microfiche",
      "x": 23.67,
      "y": 6.94
    },
    {
      "kind": "personnelfile",
      "x": 30.57,
      "y": 11.64
    },
    {
      "kind": "brute",
      "x": 18,
      "y": 15.97
    },
    {
      "kind": "screwdriver",
      "x": 11.96,
      "y": 24.72
    },
    {
      "kind": "pliers",
      "x": 29.63,
      "y": 2.15
    },
    {
      "kind": "streetlamp",
      "x": 31.06,
      "y": 9.21,
      "solid": true
    },
    {
      "kind": "bookshelf",
      "x": 33.4,
      "y": 8.32
    },
    {
      "kind": "bookshelf",
      "x": 33.64,
      "y": 6.97
    },
    {
      "kind": "bookshelf",
      "x": 34.25,
      "y": 7.55
    },
    {
      "kind": "book",
      "x": 33.6,
      "y": 7.65
    },
    {
      "kind": "diningtable",
      "x": 28.99,
      "y": 16.05
    },
    {
      "kind": "diningtable",
      "x": 30.24,
      "y": 17.31
    },
    {
      "kind": "diningtable",
      "x": 30.33,
      "y": 16.15
    },
    {
      "kind": "plant",
      "x": 30.87,
      "y": 15.49
    },
    {
      "kind": "plant",
      "x": 27.82,
      "y": 15.52
    },
    {
      "kind": "plant",
      "x": 31.14,
      "y": 19.41
    },
    {
      "kind": "bar",
      "x": 31.02,
      "y": 16.71
    },
    {
      "kind": "cashregister",
      "x": 29.42,
      "y": 15.45
    },
    {
      "kind": "parkbench",
      "x": 12.06,
      "y": 12.06
    },
    {
      "kind": "parkbench",
      "x": 8.86,
      "y": 17.35
    },
    {
      "kind": "parkbench",
      "x": 14.49,
      "y": 21.95
    },
    {
      "kind": "parkbench",
      "x": 19.57,
      "y": 20.29
    },
    {
      "kind": "royalpalm",
      "x": 8.8,
      "y": 16.29
    },
    {
      "kind": "royalpalm",
      "x": 10.89,
      "y": 12.21
    },
    {
      "kind": "royalpalm",
      "x": 13.83,
      "y": 12.32
    },
    {
      "kind": "royalpalm",
      "x": 11.17,
      "y": 15.06
    },
    {
      "kind": "royalpalm",
      "x": 14.57,
      "y": 19.86
    },
    {
      "kind": "hedge",
      "x": 9.14,
      "y": 19.15
    },
    {
      "kind": "hedge",
      "x": 12.11,
      "y": 21.49
    },
    {
      "kind": "hedge",
      "x": 17.4,
      "y": 22.12
    },
    {
      "kind": "bananaplant",
      "x": 19.37,
      "y": 18.95
    },
    {
      "kind": "bananaplant",
      "x": 19.57,
      "y": 21.98
    },
    {
      "kind": "fern",
      "x": 10.43,
      "y": 20.69
    },
    {
      "kind": "fern",
      "x": 15.69,
      "y": 22.06
    },
    {
      "kind": "hedge",
      "x": 9.63,
      "y": 13.95
    },
    {
      "kind": "carlotta",
      "x": 12.5,
      "y": 14.31,
      "behavior": "stationary"
    },
    {
      "kind": "civilianM",
      "x": 18.5,
      "y": 18.38,
      "behavior": "stationary"
    },
    {
      "kind": "civilianF",
      "x": 8.78,
      "y": 21.48,
      "behavior": "stationary"
    },
    {
      "kind": "fisherman",
      "x": 10.22,
      "y": 19.33,
      "behavior": "stationary"
    },
    {
      "kind": "drz",
      "x": 35.42,
      "y": 13.16,
      "behavior": "wander"
    },
    {
      "kind": "flagpole",
      "x": 21.4,
      "y": 13.47
    },
    {
      "kind": "wpn_sterling",
      "x": 22.69,
      "y": 6.28
    },
    {
      "kind": "medkit",
      "x": 8.76,
      "y": 12.48
    },
    {
      "kind": "wpn_golden",
      "x": 27.36,
      "y": 18.48
    },
    {
      "kind": "wpn_laser",
      "x": 24.23,
      "y": 15.61
    },
    {
      "kind": "ammo",
      "x": 19.29,
      "y": 11.88
    },
    {
      "kind": "ammo",
      "x": 29.56,
      "y": 6.61
    },
    {
      "kind": "streetartist",
      "x": 28.53,
      "y": 9.67,
      "behavior": "stationary"
    },
    {
      "kind": "businesscard",
      "x": 12.89,
      "y": 12.29
    },
    {
      "kind": "screwdriver",
      "x": 14.88,
      "y": 5.49
    },
    {
      "kind": "motorcycle",
      "x": 15.2,
      "y": 6.85
    },
    {
      "kind": "easel",
      "x": 28.96,
      "y": 9.64
    },
    {
      "kind": "stationwagon",
      "x": 15.86,
      "y": 5.81
    },
    {
      "kind": "ammo",
      "x": 16.62,
      "y": 5.32
    },
    {
      "kind": "disguise",
      "x": 24.29,
      "y": 5.87
    },
    {
      "kind": "tube",
      "x": 36.58,
      "y": 13.17
    },
    {
      "kind": "wpn_sterling",
      "x": 25.85,
      "y": 10.43
    },
    {
      "kind": "matron",
      "x": 32.35,
      "y": 4.53,
      "behavior": "stationary"
    },
    {
      "kind": "headshot",
      "x": 33,
      "y": 6.81
    },
    {
      "kind": "fabergeegg",
      "x": 33.8,
      "y": 4.59
    },
    {
      "kind": "defector",
      "x": 23.26,
      "y": 11.63,
      "behavior": "stationary"
    },
    {
      "kind": "watch",
      "x": 15.17,
      "y": 10.06
    },
    {
      "kind": "telegram",
      "x": 19.4,
      "y": 19.91
    },
    {
      "kind": "streetlamp",
      "x": 31.59,
      "y": 3.61
    },
    {
      "kind": "sportscar",
      "x": 30.96,
      "y": 1.94
    },
    {
      "kind": "double",
      "x": 13.8,
      "y": 10.2,
      "behavior": "stationary"
    },
    {
      "kind": "tourist",
      "x": 26.2,
      "y": 14.63,
      "behavior": "wander"
    },
    {
      "kind": "vendor",
      "x": 16.53,
      "y": 21.1,
      "behavior": "stationary"
    },
    {
      "kind": "patsy",
      "x": 30.87,
      "y": 18.47,
      "behavior": "wander"
    },
    {
      "kind": "laundryticket",
      "x": 17.97,
      "y": 1.06
    },
    {
      "kind": "bed",
      "x": 24.59,
      "y": 1.08
    },
    {
      "kind": "nixonmask",
      "x": 26.69,
      "y": 1.48
    },
    {
      "kind": "safe",
      "x": 24.94,
      "y": 20.46
    },
    {
      "kind": "officer",
      "x": 30,
      "y": 9.53,
      "behavior": "stationary"
    },
    {
      "kind": "flowercart",
      "x": 27.97,
      "y": 2.8
    },
    {
      "kind": "flowercart",
      "x": 29.56,
      "y": 2.86
    },
    {
      "kind": "sofa",
      "x": 20.46,
      "y": 6.54
    },
    {
      "kind": "maskstand",
      "x": 16,
      "y": 21.28
    },
    {
      "kind": "laundrylady",
      "x": 24.98,
      "y": 18.57,
      "behavior": "wander"
    },
    {
      "kind": "newsstand",
      "x": 26.57,
      "y": 19.61
    },
    {
      "kind": "wardrobe",
      "x": 26.01,
      "y": 0.89
    },
    {
      "kind": "recordplayer",
      "x": 24.92,
      "y": 2.19
    },
    {
      "kind": "bar",
      "x": 16.23,
      "y": 0.9
    },
    {
      "kind": "ciphermachine",
      "x": 20.05,
      "y": 1.75
    },
    {
      "kind": "plant",
      "x": 20.36,
      "y": 0.67
    },
    {
      "kind": "filecab",
      "x": 19.52,
      "y": 0.72
    },
    {
      "kind": "officechair",
      "x": 17.49,
      "y": 0.98
    },
    {
      "kind": "agent005",
      "x": 15.44,
      "y": 2.46
    },
    {
      "kind": "radioset",
      "x": 23.63,
      "y": 6.03
    },
    {
      "kind": "sniper",
      "x": 4.95,
      "y": 1.59
    },
    {
      "kind": "sniper",
      "x": 6.49,
      "y": 1.52
    },
    {
      "kind": "sniper",
      "x": 8,
      "y": 1.51
    },
    {
      "kind": "sniper",
      "x": 9.67,
      "y": 1.62
    },
    {
      "kind": "sniper",
      "x": 11.41,
      "y": 1.54
    },
    {
      "kind": "goon",
      "x": 3.77,
      "y": 3.36
    },
    {
      "kind": "goon",
      "x": 2.41,
      "y": 3.34
    },
    {
      "kind": "goon",
      "x": 2.38,
      "y": 4.84
    },
    {
      "kind": "goon",
      "x": 3.54,
      "y": 4.98
    },
    {
      "kind": "goon",
      "x": 4.66,
      "y": 5.15
    },
    {
      "kind": "goon",
      "x": 2.2,
      "y": 2.08
    },
    {
      "kind": "goon",
      "x": 4.03,
      "y": 2.02
    }
  ],
  "blown": false,
  "geo": {
    "verts": [
      {
        "x": 17,
        "y": 4.5
      },
      {
        "x": 17,
        "y": 13
      },
      {
        "x": 20,
        "y": 17
      },
      {
        "x": 26,
        "y": 17
      },
      {
        "x": 26,
        "y": 20
      },
      {
        "x": 31.5,
        "y": 22
      },
      {
        "x": 31.5,
        "y": 15
      },
      {
        "x": 27,
        "y": 15
      },
      {
        "x": 27,
        "y": 10
      },
      {
        "x": 32,
        "y": 10
      },
      {
        "x": 32,
        "y": 3
      },
      {
        "x": 26,
        "y": 3
      },
      {
        "x": 26,
        "y": 8
      },
      {
        "x": 19,
        "y": 8
      },
      {
        "x": 19,
        "y": 3
      },
      {
        "x": 22,
        "y": 10
      },
      {
        "x": 22.5,
        "y": 10
      },
      {
        "x": 22.5,
        "y": 10.5
      },
      {
        "x": 23,
        "y": 11
      },
      {
        "x": 23,
        "y": 12.5
      },
      {
        "x": 21.5,
        "y": 12.5
      },
      {
        "x": 21.5,
        "y": 11
      },
      {
        "x": 22,
        "y": 10.5
      },
      {
        "x": 21.5,
        "y": 17
      },
      {
        "x": 24,
        "y": 17
      },
      {
        "x": 24,
        "y": 25.5
      },
      {
        "x": 21.5,
        "y": 25.5
      },
      {
        "x": 22,
        "y": 13
      },
      {
        "x": 22,
        "y": 13.5
      },
      {
        "x": 22.5,
        "y": 13
      },
      {
        "x": 22.5,
        "y": 13
      },
      {
        "x": 22.5,
        "y": 13.5
      },
      {
        "x": 21.5,
        "y": 23.5
      },
      {
        "x": 11,
        "y": 23.5
      },
      {
        "x": 11,
        "y": 33
      },
      {
        "x": 13,
        "y": 25.5
      },
      {
        "x": 27.5,
        "y": 33
      },
      {
        "x": 13,
        "y": 31.5
      },
      {
        "x": 27.5,
        "y": 31.5
      },
      {
        "x": 28,
        "y": 22
      },
      {
        "x": 30,
        "y": 22
      },
      {
        "x": 28,
        "y": 30
      },
      {
        "x": 30,
        "y": 30
      },
      {
        "x": 30,
        "y": 34
      },
      {
        "x": 31,
        "y": 31.5
      },
      {
        "x": 28.5,
        "y": 34
      },
      {
        "x": 31,
        "y": 33
      },
      {
        "x": 32,
        "y": 4
      },
      {
        "x": 32,
        "y": 5
      },
      {
        "x": 32.5,
        "y": 4
      },
      {
        "x": 32.5,
        "y": 5
      },
      {
        "x": 11,
        "y": 24
      },
      {
        "x": 11,
        "y": 24.5
      },
      {
        "x": 5.5,
        "y": 24.5
      },
      {
        "x": 5.5,
        "y": 24
      },
      {
        "x": 19,
        "y": 4
      },
      {
        "x": 19,
        "y": 5
      },
      {
        "x": 26,
        "y": 4
      },
      {
        "x": 26,
        "y": 5
      },
      {
        "x": 22,
        "y": 5
      },
      {
        "x": 23,
        "y": 5
      },
      {
        "x": 22,
        "y": 5.5
      },
      {
        "x": 20,
        "y": 7.5
      },
      {
        "x": 25,
        "y": 7.5
      },
      {
        "x": 25,
        "y": 5.5
      },
      {
        "x": 23,
        "y": 5.5
      },
      {
        "x": 21,
        "y": 6
      },
      {
        "x": 20,
        "y": 6
      },
      {
        "x": 22,
        "y": 7.5
      },
      {
        "x": 23,
        "y": 7.5
      },
      {
        "x": 23,
        "y": 8
      },
      {
        "x": 22,
        "y": 8
      },
      {
        "x": 27,
        "y": 11
      },
      {
        "x": 27,
        "y": 12
      },
      {
        "x": 27.5,
        "y": 11
      },
      {
        "x": 27.5,
        "y": 12
      },
      {
        "x": 13,
        "y": 6.5
      },
      {
        "x": 14.5,
        "y": 0.5
      },
      {
        "x": 1,
        "y": 1
      },
      {
        "x": 2,
        "y": 7
      },
      {
        "x": 27,
        "y": 12.5
      },
      {
        "x": 27,
        "y": 14
      },
      {
        "x": 28,
        "y": 12.5
      },
      {
        "x": 28,
        "y": 14
      },
      {
        "x": 32.5,
        "y": 31.5
      },
      {
        "x": 32.5,
        "y": 10.5
      },
      {
        "x": 33.5,
        "y": 10.5
      },
      {
        "x": 33.5,
        "y": 33
      },
      {
        "x": 28,
        "y": 11
      },
      {
        "x": 31.5,
        "y": 11
      },
      {
        "x": 31.5,
        "y": 13
      },
      {
        "x": 28,
        "y": 14.5
      },
      {
        "x": 31.5,
        "y": 12.5
      },
      {
        "x": 31.5,
        "y": 12
      },
      {
        "x": 32.5,
        "y": 12
      },
      {
        "x": 32.5,
        "y": 12.5
      },
      {
        "x": 29,
        "y": 14.5
      },
      {
        "x": 29,
        "y": 13
      },
      {
        "x": 27.5,
        "y": 2.5
      },
      {
        "x": 30,
        "y": 2.5
      },
      {
        "x": 27.5,
        "y": 0.5
      },
      {
        "x": 30,
        "y": 0.5
      },
      {
        "x": 31.5,
        "y": 17
      },
      {
        "x": 31.5,
        "y": 19
      },
      {
        "x": 32,
        "y": 17.5
      },
      {
        "x": 32,
        "y": 18.5
      },
      {
        "x": 32,
        "y": 7
      },
      {
        "x": 32,
        "y": 8
      },
      {
        "x": 32.5,
        "y": 8
      },
      {
        "x": 32.5,
        "y": 7
      },
      {
        "x": 32.5,
        "y": 6.5
      },
      {
        "x": 34.5,
        "y": 6.5
      },
      {
        "x": 34.5,
        "y": 9
      },
      {
        "x": 32.5,
        "y": 9
      },
      {
        "x": 33.5,
        "y": 13
      },
      {
        "x": 33.5,
        "y": 14
      },
      {
        "x": 34.5,
        "y": 13
      },
      {
        "x": 34.5,
        "y": 14
      },
      {
        "x": 34.5,
        "y": 12.5
      },
      {
        "x": 38,
        "y": 12.5
      },
      {
        "x": 38,
        "y": 15.5
      },
      {
        "x": 34.5,
        "y": 15.5
      },
      {
        "x": 17.5,
        "y": 3.5
      },
      {
        "x": 18,
        "y": 3
      },
      {
        "x": 18,
        "y": 2.5
      },
      {
        "x": 17.5,
        "y": 3
      },
      {
        "x": 15,
        "y": 3
      },
      {
        "x": 15,
        "y": 0.5
      },
      {
        "x": 20.5,
        "y": 0.5
      },
      {
        "x": 20.5,
        "y": 2
      },
      {
        "x": 19.16,
        "y": 15.88
      },
      {
        "x": 18,
        "y": 17
      },
      {
        "x": 15.5,
        "y": 14
      },
      {
        "x": 15.5,
        "y": 12
      },
      {
        "x": 8,
        "y": 11
      },
      {
        "x": 8,
        "y": 22.5
      },
      {
        "x": 20.5,
        "y": 23
      },
      {
        "x": 20.5,
        "y": 18
      },
      {
        "x": 10.5,
        "y": 17.5
      },
      {
        "x": 11,
        "y": 17
      },
      {
        "x": 11,
        "y": 16.5
      },
      {
        "x": 11.5,
        "y": 16
      },
      {
        "x": 12,
        "y": 16
      },
      {
        "x": 12.5,
        "y": 15.5
      },
      {
        "x": 13,
        "y": 15.5
      },
      {
        "x": 13.5,
        "y": 16
      },
      {
        "x": 14,
        "y": 17
      },
      {
        "x": 15,
        "y": 17.5
      },
      {
        "x": 15.5,
        "y": 18.5
      },
      {
        "x": 14.5,
        "y": 19.5
      },
      {
        "x": 13.5,
        "y": 19.5
      },
      {
        "x": 12,
        "y": 20
      },
      {
        "x": 11,
        "y": 19.5
      },
      {
        "x": 10,
        "y": 18.5
      },
      {
        "x": 9.5,
        "y": 18
      },
      {
        "x": 9.5,
        "y": 17.5
      },
      {
        "x": 6,
        "y": 7
      },
      {
        "x": 5.5,
        "y": 7
      },
      {
        "x": 17,
        "y": 8
      },
      {
        "x": 17,
        "y": 9
      },
      {
        "x": 5.5,
        "y": 9
      },
      {
        "x": 6,
        "y": 8.5
      },
      {
        "x": 6,
        "y": 9
      },
      {
        "x": 6,
        "y": 24
      },
      {
        "x": 32.5,
        "y": 6
      },
      {
        "x": 34.5,
        "y": 6
      },
      {
        "x": 34.5,
        "y": 3.5
      },
      {
        "x": 32.5,
        "y": 3.5
      },
      {
        "x": 17,
        "y": 5
      },
      {
        "x": 17,
        "y": 7.5
      },
      {
        "x": 14,
        "y": 7.5
      },
      {
        "x": 14,
        "y": 5
      },
      {
        "x": 17,
        "y": 10
      },
      {
        "x": 17,
        "y": 11
      },
      {
        "x": 16.5,
        "y": 10
      },
      {
        "x": 16.5,
        "y": 11
      },
      {
        "x": 15.5,
        "y": 11
      },
      {
        "x": 13,
        "y": 11.5
      },
      {
        "x": 12,
        "y": 9.5
      },
      {
        "x": 16.5,
        "y": 9.5
      },
      {
        "x": 30.471,
        "y": 2.618
      },
      {
        "x": 31.5,
        "y": 2.5
      },
      {
        "x": 30.471,
        "y": 2.618
      },
      {
        "x": 30.5,
        "y": 0.5
      },
      {
        "x": 31.5,
        "y": 0.5
      },
      {
        "x": 15.5,
        "y": 11.5
      },
      {
        "x": 13,
        "y": 10.5
      },
      {
        "x": 12,
        "y": 10.5
      },
      {
        "x": 15.5,
        "y": 8.5
      },
      {
        "x": 26,
        "y": 18
      },
      {
        "x": 26,
        "y": 19
      },
      {
        "x": 25.5,
        "y": 19
      },
      {
        "x": 25.5,
        "y": 18
      },
      {
        "x": 25.5,
        "y": 17.5
      },
      {
        "x": 24.5,
        "y": 18
      },
      {
        "x": 24.5,
        "y": 19
      },
      {
        "x": 25.5,
        "y": 19.5
      },
      {
        "x": 27,
        "y": 2.5
      },
      {
        "x": 26.5,
        "y": 3
      },
      {
        "x": 26,
        "y": 2.5
      },
      {
        "x": 26.5,
        "y": 2
      },
      {
        "x": 25.5,
        "y": 3
      },
      {
        "x": 24,
        "y": 1.5
      },
      {
        "x": 24,
        "y": 0.5
      },
      {
        "x": 26.5,
        "y": 0.5
      },
      {
        "x": 26.5,
        "y": 1
      },
      {
        "x": 27,
        "y": 1
      },
      {
        "x": 27,
        "y": 2
      },
      {
        "x": 26.5,
        "y": 20.5
      },
      {
        "x": 27.5,
        "y": 21.5
      },
      {
        "x": 26,
        "y": 20.5
      },
      {
        "x": 27.5,
        "y": 22
      },
      {
        "x": 25.5,
        "y": 20.5
      },
      {
        "x": 25.5,
        "y": 20
      },
      {
        "x": 24.5,
        "y": 20
      },
      {
        "x": 24.5,
        "y": 25
      },
      {
        "x": 27.5,
        "y": 25
      },
      {
        "x": 20.5,
        "y": 1
      },
      {
        "x": 20.5,
        "y": 1.5
      },
      {
        "x": 21,
        "y": 1
      },
      {
        "x": 21,
        "y": 1.5
      },
      {
        "x": 18.5,
        "y": 0.5
      },
      {
        "x": 18,
        "y": 0.5
      },
      {
        "x": 18,
        "y": 0
      },
      {
        "x": 18.5,
        "y": 0
      },
      {
        "x": 15.5,
        "y": 3
      },
      {
        "x": 17,
        "y": 3
      },
      {
        "x": 17,
        "y": 3.5
      },
      {
        "x": 15.5,
        "y": 3.5
      },
      {
        "x": 15,
        "y": 1
      },
      {
        "x": 15,
        "y": 2
      },
      {
        "x": 14.5,
        "y": 2
      },
      {
        "x": 14.5,
        "y": 1
      }
    ],
    "sectors": [
      {
        "loop": [
          14,
          55,
          56,
          13,
          71,
          70,
          12,
          58,
          57,
          11,
          198,
          197,
          98,
          99,
          182,
          180,
          181,
          10,
          47,
          48,
          106,
          107,
          9,
          8,
          72,
          73,
          80,
          81,
          7,
          6,
          102,
          104,
          105,
          103,
          5,
          40,
          39,
          209,
          208,
          4,
          190,
          189,
          3,
          24,
          23,
          2,
          130,
          1,
          173,
          172,
          159,
          158,
          169,
          168,
          0,
          122,
          123
        ],
        "floor": 0.4,
        "ceil": 3.3,
        "floorTex": "tile",
        "ceilTex": "stucco",
        "sky": true,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "wallTex": [
          "windowrow",
          "windowrow",
          "windowrow",
          "windowrow",
          "windowrow",
          "windowrow",
          "windowrow",
          "brick",
          "windowrow",
          null,
          "balconywin",
          "brick",
          "windowrow",
          "brick",
          "brick",
          "windowrow",
          "windowrow",
          "windowrow",
          "azulejo",
          "windowrow",
          "azulejo",
          "windowrow",
          "azulejo",
          "azulejo",
          null,
          "azulejo",
          "brick",
          null,
          null,
          "concretepergola",
          null,
          "concretepergola",
          "stucco",
          "stucco",
          null,
          "stucco",
          "stucco",
          "stucco",
          "stucco",
          "stucco",
          "stucco",
          "windowshut",
          null,
          "windowshut",
          null,
          "stucco",
          null,
          null,
          "windowshut",
          "brick",
          "windowshut"
        ],
        "wallTexScale": [
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          0.5,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          0.5,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          2,
          null,
          1,
          1,
          null,
          null,
          null,
          null,
          null,
          null,
          0.5
        ],
        "wallStepTex": [
          null,
          "windowrow",
          null,
          null,
          "windowrow",
          "windowrow",
          null,
          "windowrow",
          null,
          "balconywin",
          "brick",
          null,
          "brick",
          "brick",
          null,
          "windowrow",
          "windowrow",
          "azulejo",
          "windowrow",
          "azulejo",
          "windowrow",
          "azulejo",
          "azulejo",
          null,
          "azulejo",
          null,
          null,
          "brick",
          null,
          "brick",
          "concretepergola",
          "brick",
          null,
          null,
          null,
          null,
          null,
          null,
          "stucco",
          "stucco",
          "stucco",
          null,
          "windowshut",
          null,
          "windowshut",
          null,
          "stucco",
          null,
          "brick",
          "windowshut",
          "brick",
          null,
          "brick",
          null,
          null,
          "brick"
        ],
        "wallStepFloorTex": [
          null,
          null,
          null,
          null,
          "sandstone",
          null,
          null,
          null,
          null,
          null,
          "brick",
          null,
          null,
          "rope",
          null,
          "stucco",
          null,
          "azulejo",
          "stucco",
          "azulejo",
          null,
          null,
          "azulejo",
          null,
          "azulejo",
          null,
          null,
          null,
          null,
          null,
          "carpet",
          null,
          null,
          null,
          null,
          null,
          "stucco",
          null,
          "stucco",
          "stucco",
          null,
          null,
          "brick",
          null,
          "brownstone",
          null,
          null,
          null,
          null,
          null,
          "brick",
          null,
          null,
          null,
          null,
          "brick"
        ],
        "parent": -1
      },
      {
        "loop": [
          15,
          16,
          17,
          18,
          19,
          29,
          30,
          31,
          28,
          27,
          20,
          21,
          22
        ],
        "floor": 0,
        "ceil": 3.1,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "parent": 0,
        "solid": true
      },
      {
        "loop": [
          24,
          25,
          26,
          32,
          23
        ],
        "floor": 0.2,
        "ceil": 1.7,
        "floorTex": "water",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": true,
        "texScale": 1,
        "wallTex": [
          "stucco",
          "stucco",
          null,
          "stucco",
          null
        ],
        "parent": -1
      },
      {
        "loop": [
          26,
          35,
          37,
          38,
          36,
          34,
          52,
          51,
          33,
          32
        ],
        "floor": 0.2,
        "ceil": 1.7,
        "floorTex": "water",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "wallTex": [
          "stucco",
          "stucco",
          "stucco",
          "water",
          "stucco",
          "stucco",
          "stucco",
          "stucco",
          "stucco"
        ],
        "wallStepFloorTex": [
          null,
          null,
          null,
          null,
          null,
          null,
          "stucco",
          null,
          null,
          null
        ],
        "parent": -1
      },
      {
        "loop": [
          40,
          42,
          41,
          39
        ],
        "floor": 0.5,
        "ceil": 1.7,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": true,
        "texScale": 1,
        "parent": -1
      },
      {
        "loop": [
          42,
          44,
          46,
          43,
          45,
          36,
          38,
          41
        ],
        "floor": 0.1,
        "ceil": 2.3,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": true,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "wallTex": [
          null,
          null,
          "brick",
          "brick",
          null,
          null,
          null,
          null
        ],
        "wallStepTex": [
          null,
          null,
          null,
          null,
          null,
          "water",
          null,
          null
        ],
        "parent": -1
      },
      {
        "loop": [
          47,
          49,
          50,
          48
        ],
        "floor": 0.4,
        "ceil": 1.4,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "wallTex": [
          "stucco",
          "doorwood",
          "stucco",
          null
        ],
        "parent": -1
      },
      {
        "loop": [
          52,
          53,
          54,
          163,
          51
        ],
        "floor": 0.8,
        "ceil": 1.7,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "parent": -1
      },
      {
        "loop": [
          55,
          57,
          58,
          60,
          59,
          56
        ],
        "floor": 0.4,
        "ceil": 2.2,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "wallTex": [
          "stucco",
          null,
          "stucco",
          null,
          "stucco",
          null
        ],
        "wallStepTex": [
          null,
          null,
          null,
          "stucco",
          null,
          null
        ],
        "wallStepFloorTex": [
          null,
          "ceiltile",
          null,
          null,
          null,
          "ceiltile"
        ],
        "parent": -1
      },
      {
        "loop": [
          60,
          65,
          64,
          63,
          69,
          68,
          62,
          67,
          66,
          61,
          59
        ],
        "floor": 0.4,
        "ceil": 1.7,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "wallTex": [
          "stucco",
          "stucco",
          "stuccob",
          "stucco",
          "teak",
          "stucco",
          "stucco",
          "stucco",
          "stucco",
          "stucco"
        ],
        "wallStepTex": [
          null,
          null,
          null,
          null,
          "stucco",
          null,
          null,
          null,
          null,
          null,
          null
        ],
        "wallStepFloorTex": [
          null,
          null,
          null,
          null,
          "stucco",
          null,
          null,
          null,
          null,
          null,
          null
        ],
        "parent": -1
      },
      {
        "loop": [
          71,
          68,
          69,
          70
        ],
        "floor": 0.7,
        "ceil": 1.2,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "wallTex": [
          "stucco",
          null,
          "stucco",
          null
        ],
        "parent": -1
      },
      {
        "loop": [
          72,
          74,
          75,
          73
        ],
        "floor": 0.7,
        "ceil": 1.7,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "wallTex": [
          "azulejo",
          "mural",
          "azulejo",
          "brick"
        ],
        "parent": -1
      },
      {
        "loop": [
          79,
          78,
          77,
          76,
          156,
          157
        ],
        "floor": 0.1,
        "ceil": 3.4,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": true,
        "win": false,
        "hostile": true,
        "texScale": 1,
        "wallTex": [
          "wood",
          "wood",
          "wood",
          "wood",
          "wood",
          null
        ],
        "wallTexScale": [
          0.5,
          0.5,
          0.5,
          0.5,
          0.5,
          0.5
        ],
        "wallStepTex": [
          null,
          null,
          null,
          null,
          null,
          "wood"
        ],
        "parent": -1
      },
      {
        "loop": [
          80,
          82,
          83,
          81
        ],
        "floor": 0.4,
        "ceil": 1.6,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": true,
        "texScale": 1,
        "parent": -1
      },
      {
        "loop": [
          44,
          84,
          95,
          94,
          85,
          86,
          114,
          115,
          87,
          46
        ],
        "floor": 0.4,
        "ceil": 1.4,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "wallTex": [
          null,
          null,
          null,
          "brick",
          null,
          null,
          null,
          null
        ],
        "wallStepTex": [
          null,
          null,
          "brick",
          null,
          null,
          null,
          null,
          null
        ],
        "parent": -1
      },
      {
        "loop": [
          82,
          88,
          89,
          93,
          92,
          90,
          97,
          96,
          91,
          83
        ],
        "floor": 0.4,
        "ceil": 1.8,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "wallStepTex": [
          null,
          null,
          null,
          "brick",
          null,
          null,
          null,
          null,
          null,
          null
        ],
        "parent": -1
      },
      {
        "loop": [
          95,
          92,
          93,
          94
        ],
        "floor": 0.7,
        "ceil": 1.2,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "parent": -1
      },
      {
        "loop": [
          98,
          100,
          101,
          99
        ],
        "floor": 0.4,
        "ceil": 1.6,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "parent": -1
      },
      {
        "loop": [
          106,
          109,
          108,
          107
        ],
        "floor": 0.6,
        "ceil": 2.2,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "parent": -1
      },
      {
        "loop": [
          109,
          110,
          111,
          112,
          113,
          108
        ],
        "floor": 0.7,
        "ceil": 2.2,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "wallTex": [
          null,
          null,
          null,
          "stucco",
          null,
          null
        ],
        "parent": -1
      },
      {
        "loop": [
          114,
          116,
          117,
          115
        ],
        "floor": 0,
        "ceil": 1,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "parent": -1
      },
      {
        "loop": [
          116,
          118,
          119,
          120,
          121,
          117
        ],
        "floor": 0,
        "ceil": 1,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "parent": -1
      },
      {
        "loop": [
          122,
          125,
          124,
          123
        ],
        "floor": 0.6,
        "ceil": 2.1,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "wallStepFloorTex": [
          null,
          "brick",
          null,
          null
        ],
        "parent": -1
      },
      {
        "loop": [
          125,
          226,
          225,
          126,
          230,
          229,
          127,
          222,
          221,
          128,
          217,
          218,
          129,
          124
        ],
        "floor": 0.8,
        "ceil": 2.4,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "wallTex": [
          "brick",
          null,
          null,
          null,
          null,
          null
        ],
        "wallStepTex": [
          null,
          "brick",
          null,
          "brick",
          "brick",
          null,
          "brick",
          "brick",
          null,
          null,
          "brick"
        ],
        "wallStepFloorTex": [
          null,
          "brick",
          null,
          "brick",
          "brick",
          null,
          "brick",
          "brick",
          null,
          null,
          "brick"
        ],
        "parent": -1
      },
      {
        "loop": [
          130,
          131,
          132,
          1
        ],
        "floor": 0.3,
        "ceil": 1.3,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "wallTex": [
          "stucco",
          null,
          "stucco",
          null
        ],
        "parent": -1
      },
      {
        "loop": [
          131,
          137,
          136,
          135,
          134,
          133,
          132
        ],
        "floor": 0.3,
        "ceil": 2.3,
        "floorTex": "wetstone",
        "ceilTex": "ceiltile",
        "sky": true,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "wallTex": [
          "rope",
          "rockwall",
          "rockwall",
          "rockwall",
          "rockwall",
          "rope",
          null
        ],
        "wallStepTex": [
          null,
          null,
          null,
          null,
          null,
          null,
          "rope"
        ],
        "parent": -1
      },
      {
        "loop": [
          138,
          139,
          140,
          141,
          142,
          143,
          144,
          145,
          146,
          147,
          148,
          149,
          150,
          151,
          152,
          153,
          154,
          155
        ],
        "floor": 0,
        "ceil": 2.3,
        "floorTex": "water",
        "ceilTex": "ceiltile",
        "sky": true,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "parent": 25
      },
      {
        "loop": [
          159,
          162,
          160,
          157,
          156,
          161,
          188,
          158
        ],
        "floor": 0.7,
        "ceil": 1.4,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "wallTex": [
          "brownstone",
          null,
          "brownstone",
          null,
          "brownstone",
          "brownstone",
          "brownstone",
          null
        ],
        "parent": -1
      },
      {
        "loop": [
          162,
          163,
          54,
          160
        ],
        "floor": 0.8,
        "ceil": 1.7,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "wallTex": [
          "brownstone",
          null,
          "brownstone",
          null
        ],
        "parent": -1
      },
      {
        "loop": [
          49,
          167,
          166,
          165,
          164,
          50
        ],
        "floor": 0.1,
        "ceil": 2,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "wallStepTex": [
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          "brick"
        ],
        "wallStepFloorTex": [
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          "brick"
        ],
        "parent": -1
      },
      {
        "loop": [
          169,
          170,
          171,
          168
        ],
        "floor": 0.1,
        "ceil": 1.8,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "parent": -1
      },
      {
        "loop": [
          173,
          175,
          174,
          172
        ],
        "floor": 0.4,
        "ceil": 1.5,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "wallStepFloorTex": [
          null,
          "brick",
          null,
          null
        ],
        "parent": -1
      },
      {
        "loop": [
          175,
          176,
          185,
          177,
          186,
          187,
          178,
          179,
          174
        ],
        "floor": 0.5,
        "ceil": 1.6,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "wallTex": [
          null,
          null,
          "panel",
          null,
          null,
          null,
          null,
          null,
          null
        ],
        "parent": -1
      },
      {
        "loop": [
          180,
          183,
          184,
          181
        ],
        "floor": 0.1,
        "ceil": 1.4,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "parent": -1
      },
      {
        "loop": [
          190,
          191,
          192,
          189
        ],
        "floor": 0.5,
        "ceil": 1,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "parent": -1
      },
      {
        "loop": [
          191,
          196,
          195,
          194,
          193,
          192
        ],
        "floor": 0,
        "ceil": 1.1,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "parent": -1
      },
      {
        "loop": [
          198,
          199,
          200,
          197
        ],
        "floor": 0.6,
        "ceil": 1.7,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "wallStepFloorTex": [
          null,
          "brick",
          null,
          null
        ],
        "parent": -1
      },
      {
        "loop": [
          199,
          201,
          202,
          203,
          204,
          205,
          206,
          207,
          200
        ],
        "floor": 0.8,
        "ceil": 1.8,
        "floorTex": "carpet",
        "ceilTex": "woodpaneling",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "wallTex": [
          null,
          "woodpaneling",
          "woodpaneling",
          "woodpaneling",
          null,
          null,
          null,
          null,
          null
        ],
        "wallStepTex": [
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          "brick"
        ],
        "parent": -1
      },
      {
        "loop": [
          209,
          211,
          210,
          208
        ],
        "floor": 0.6,
        "ceil": 2,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "parent": -1
      },
      {
        "loop": [
          211,
          216,
          215,
          214,
          213,
          212,
          210
        ],
        "floor": 0.8,
        "ceil": 2.4,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "parent": -1
      },
      {
        "loop": [
          217,
          219,
          220,
          218
        ],
        "floor": 1.1,
        "ceil": 1.9,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "wallDecal": [
          null,
          "wallclock",
          null,
          null
        ],
        "parent": -1
      },
      {
        "loop": [
          222,
          223,
          224,
          221
        ],
        "floor": 1.2,
        "ceil": 2,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "wallDecal": [
          null,
          "corkboard",
          null,
          null
        ],
        "parent": -1
      },
      {
        "loop": [
          226,
          227,
          228,
          225
        ],
        "floor": 1,
        "ceil": 2,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "wallTex": [
          "panel",
          "mainframe",
          "panel",
          null
        ],
        "wallTexScale": [
          0.5,
          0.5,
          0.5,
          1
        ],
        "parent": -1
      },
      {
        "loop": [
          230,
          231,
          232,
          229
        ],
        "floor": 1.2,
        "ceil": 2.2,
        "floorTex": "carpet",
        "ceilTex": "ceiltile",
        "sky": false,
        "win": false,
        "hostile": false,
        "texScale": 1,
        "wallTex": [
          null,
          "blast",
          null,
          null
        ],
        "parent": -1
      }
    ]
  }
};

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
  let startBlown = false;                          // does this level start with Cover already blown? (main.js reads at boot)
  let musicUndercover = 'undercover', musicCoverBlown = 'coverblown';   // per-mission music track keys (main.js reads at boot; see js/music.js)

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
        sky: s.sky, win: s.win, hostile: false, fsx: s.fsx, fsy: s.fsy,
        wallTex, wallCell, wallStepTex: wallTex.map(() => null), wallStepFloorTex: wallTex.map(() => null),
        wallDecal: wallTex.map(() => null), parent: -1,
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

  // ---- street-facing building facades with windows ----
  FLOOR.windowrow = cnv(g => {                        // pastel stucco with a shuttered colonial window, arched top
    vgrad(g, 0, 0, 64, 64, '#e3c988', '#c7a860');
    stains(g, 8, ['#a98a52', '#8a7048']);
    speck(g, 60, 'rgba(0,0,0,0.05)'); speck(g, 30, 'rgba(255,255,255,0.06)');
    g.fillStyle = 'rgba(0,0,0,0.16)'; g.beginPath();                            // recessed window reveal, arched top
    g.moveTo(14, 40); g.lineTo(14, 18); g.quadraticCurveTo(14, 8, 32, 8); g.quadraticCurveTo(50, 8, 50, 18); g.lineTo(50, 40); g.closePath(); g.fill();
    const gl = g.createLinearGradient(16, 10, 48, 38);                          // glass, dim interior
    gl.addColorStop(0, '#3a4a52'); gl.addColorStop(1, '#161e22');
    g.fillStyle = gl; g.beginPath();
    g.moveTo(17, 38); g.lineTo(17, 19); g.quadraticCurveTo(17, 11, 32, 11); g.quadraticCurveTo(47, 11, 47, 19); g.lineTo(47, 38); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1.4;                       // mullions
    g.beginPath(); g.moveTo(32, 11); g.lineTo(32, 38); g.moveTo(17, 24); g.lineTo(47, 24); g.stroke();
    const shu = '#3f6b48';                                                      // green louvered shutters, folded open
    g.fillStyle = shu; g.fillRect(9, 12, 5, 28); g.fillRect(50, 12, 5, 28);
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.8;
    for (let y = 14; y < 38; y += 3) { g.beginPath(); g.moveTo(9, y); g.lineTo(14, y); g.moveTo(50, y); g.lineTo(55, y); g.stroke(); }
    bevel(g, 9, 12, 5, 28, 'rgba(255,255,255,0.12)', 'rgba(0,0,0,0.3)');
    bevel(g, 50, 12, 5, 28, 'rgba(255,255,255,0.12)', 'rgba(0,0,0,0.3)');
    g.fillStyle = '#8a7042'; g.fillRect(12, 40, 40, 4);                         // stone sill
    bevel(g, 12, 40, 40, 4, 'rgba(255,240,200,0.25)', 'rgba(0,0,0,0.3)');
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 59, 64, 5);                 // grimy base
  });

  FLOOR.balconywin = cnv(g => {                       // upper-floor window with a wrought-iron Juliet balcony
    vgrad(g, 0, 0, 64, 64, '#c98f7a', '#a86a5a');
    stains(g, 8, ['#8a5648', '#6a4438']);
    speck(g, 60, 'rgba(0,0,0,0.05)'); speck(g, 30, 'rgba(255,255,255,0.05)');
    g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(15, 8, 34, 30);                // recessed reveal
    const gl = g.createLinearGradient(17, 10, 47, 36);
    gl.addColorStop(0, '#4a5a62'); gl.addColorStop(1, '#1c262a');
    g.fillStyle = gl; g.fillRect(17, 10, 30, 26);
    g.strokeStyle = 'rgba(255,255,255,0.10)'; g.lineWidth = 1;                  // pane reflection streak
    g.beginPath(); g.moveTo(20, 12); g.lineTo(24, 34); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1.4;                       // mullions, french-door style
    g.beginPath(); g.moveTo(32, 10); g.lineTo(32, 36); g.moveTo(17, 22); g.lineTo(47, 22); g.stroke();
    g.strokeStyle = '#e8dcc8'; g.lineWidth = 1.2; g.strokeRect(15, 8, 34, 30);  // painted trim
    g.strokeStyle = '#2a2018'; g.lineWidth = 3; g.lineCap = 'round';            // wrought-iron balcony rail
    g.beginPath(); g.moveTo(11, 41); g.lineTo(53, 41); g.stroke();
    for (let x = 13; x <= 51; x += 6) { g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, 36); g.lineTo(x, 41); g.stroke(); }
    g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(11, 36); g.quadraticCurveTo(20, 32, 32, 36); g.quadraticCurveTo(44, 32, 53, 36); g.stroke();  // scrollwork arc
    g.fillStyle = 'rgba(60,45,30,0.5)'; g.fillRect(11, 41, 42, 2);              // shadow under the rail
    bevel(g, 15, 8, 34, 30, 'rgba(255,240,220,0.18)', 'rgba(0,0,0,0.3)');
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 59, 64, 5);
  });

  FLOOR.shopfront = cnv(g => {                        // ground-floor storefront: broad glass pane, wood frame
    vgrad(g, 0, 0, 64, 64, '#8a6a48', '#6a4e32');
    speck(g, 70, 'rgba(0,0,0,0.08)');
    g.fillStyle = '#4a3624'; g.fillRect(4, 6, 56, 48);                          // dark wood frame surround
    bevel(g, 4, 6, 56, 48, 'rgba(255,220,170,0.15)', 'rgba(0,0,0,0.4)');
    const gl = g.createLinearGradient(8, 10, 56, 50);                          // big display glass, cool reflection
    gl.addColorStop(0, '#7a97a0'); gl.addColorStop(0.45, '#3a4e56'); gl.addColorStop(0.55, '#2a3a40'); gl.addColorStop(1, '#182226');
    g.fillStyle = gl; g.fillRect(8, 10, 48, 40);
    g.fillStyle = 'rgba(255,255,255,0.16)'; g.beginPath();                     // diagonal glare streak
    g.moveTo(12, 46); g.lineTo(24, 12); g.lineTo(30, 12); g.lineTo(18, 46); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(20,14,8,0.5)'; g.lineWidth = 2;                       // muntin cross dividing the display
    g.beginPath(); g.moveTo(32, 10); g.lineTo(32, 50); g.stroke();
    g.fillStyle = 'rgba(10,8,6,0.35)'; g.beginPath(); g.ellipse(44, 40, 7, 9, 0, 0, 7); g.fill();  // a shadowed goods silhouette
    g.fillStyle = '#3a2c1c'; g.fillRect(4, 50, 56, 6);                          // kick panel / base
    bevel(g, 4, 50, 56, 6, 'rgba(255,220,170,0.2)', 'rgba(0,0,0,0.35)');
    g.fillStyle = 'rgba(0,0,0,0.14)'; g.fillRect(0, 59, 64, 5);
  });

  FLOOR.doorwood = cnv(g => {                          // paneled colonial front door, brass fittings
    vgrad(g, 0, 0, 64, 64, '#c9a06a', '#a87e4a');
    stains(g, 6, ['#8a6a44', '#6a5236']);
    g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(8, 4, 48, 56);                   // recessed door reveal
    let dr = g.createLinearGradient(0, 6, 0, 58);
    dr.addColorStop(0, '#8a5c34'); dr.addColorStop(0.5, '#6e4526'); dr.addColorStop(1, '#4a2e18');
    g.fillStyle = dr; g.fillRect(11, 6, 42, 52);
    bevel(g, 11, 6, 42, 52, 'rgba(255,220,170,0.2)', 'rgba(0,0,0,0.5)');
    g.strokeStyle = '#3a2414'; g.lineWidth = 1.4;                                // two raised panels, top + bottom
    g.strokeRect(16, 11, 32, 20); g.strokeRect(16, 35, 32, 18);
    g.fillStyle = 'rgba(255,220,170,0.08)'; g.fillRect(16, 11, 32, 2); g.fillRect(16, 35, 32, 2);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(16, 29, 32, 2); g.fillRect(16, 51, 32, 2);
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(32, 6); g.lineTo(32, 58); g.stroke();  // centre seam
    let br = g.createRadialGradient(41, 32, 0.5, 41, 32, 3);                     // brass handle
    br.addColorStop(0, '#f0d888'); br.addColorStop(1, '#8a6a1a');
    g.fillStyle = br; g.beginPath(); g.arc(41, 32, 2.6, 0, 7); g.fill();
    g.fillStyle = '#5e3a24'; g.fillRect(11, 58, 42, 2);                          // threshold
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 59, 64, 5);
  });

  FLOOR.doorarch = cnv(g => {                          // deep-set arched doorway, shadowed alcove
    vgrad(g, 0, 0, 64, 64, '#d0c4a0', '#b0a37c');
    stains(g, 6, ['#8a7a58', '#6a5c40']);
    g.fillStyle = 'rgba(0,0,0,0.32)'; g.beginPath();                             // deep arched recess
    g.moveTo(10, 60); g.lineTo(10, 24); g.quadraticCurveTo(10, 8, 32, 8); g.quadraticCurveTo(54, 8, 54, 24); g.lineTo(54, 60); g.closePath(); g.fill();
    let dr = g.createLinearGradient(16, 14, 48, 56);
    dr.addColorStop(0, '#241a10'); dr.addColorStop(1, '#0e0a06');
    g.fillStyle = dr; g.beginPath();
    g.moveTo(16, 60); g.lineTo(16, 26); g.quadraticCurveTo(16, 14, 32, 14); g.quadraticCurveTo(48, 14, 48, 26); g.lineTo(48, 60); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 2;                          // stone archivolt trim
    g.beginPath(); g.moveTo(10, 24); g.quadraticCurveTo(10, 8, 32, 8); g.quadraticCurveTo(54, 8, 54, 24); g.stroke();
    g.strokeStyle = 'rgba(255,250,235,0.3)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(11, 23); g.quadraticCurveTo(11, 10, 32, 10); g.quadraticCurveTo(53, 10, 53, 23); g.stroke();
    g.fillStyle = 'rgba(20,14,8,0.5)'; g.beginPath(); g.ellipse(32, 58, 15, 3, 0, 0, 7); g.fill();  // interior floor shadow
    speck(g, 40, 'rgba(0,0,0,0.06)', 64, 64);
  });

  FLOOR.doubledoor = cnv(g => {                        // grand glass-paned double door, hotel/shop entrance
    vgrad(g, 0, 0, 64, 64, '#7a6048', '#5a462e');
    g.fillStyle = '#241a10'; g.fillRect(4, 4, 56, 56);                           // dark wood frame surround
    bevel(g, 4, 4, 56, 56, 'rgba(255,220,170,0.18)', 'rgba(0,0,0,0.45)');
    for (const dx of [7, 33]) {
      const gl = g.createLinearGradient(dx, 8, dx + 24, 56);
      gl.addColorStop(0, '#6a8894'); gl.addColorStop(0.5, '#33454e'); gl.addColorStop(1, '#20292e');
      g.fillStyle = gl; g.fillRect(dx, 8, 24, 48);
      g.strokeStyle = 'rgba(20,14,8,0.6)'; g.lineWidth = 1.5; g.strokeRect(dx, 8, 24, 48);
      g.strokeStyle = 'rgba(20,14,8,0.4)'; g.lineWidth = 1;                      // muntins, three panes tall
      g.beginPath(); g.moveTo(dx, 24); g.lineTo(dx + 24, 24); g.moveTo(dx, 40); g.lineTo(dx + 24, 40); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.14)'; g.beginPath();
      g.moveTo(dx + 3, 50); g.lineTo(dx + 10, 10); g.lineTo(dx + 14, 10); g.lineTo(dx + 7, 50); g.closePath(); g.fill();
      let br = g.createRadialGradient(dx + (dx === 7 ? 21 : 3), 32, 0.5, dx + (dx === 7 ? 21 : 3), 32, 2.6);
      br.addColorStop(0, '#f0d888'); br.addColorStop(1, '#8a6a1a');
      g.fillStyle = br; g.beginPath(); g.arc(dx + (dx === 7 ? 21 : 3), 32, 2.2, 0, 7); g.fill();
    }
    g.fillStyle = 'rgba(0,0,0,0.14)'; g.fillRect(0, 59, 64, 5);
  });

  FLOOR.windowbars = cnv(g => {                         // ground-floor barred window (reja), no glass
    vgrad(g, 0, 0, 64, 64, '#c9b888', '#a99862');
    stains(g, 8, ['#8a7a50', '#6a5c3c']);
    speck(g, 60, 'rgba(0,0,0,0.05)');
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(14, 12, 36, 34);                 // recessed opening
    let interior = g.createLinearGradient(16, 14, 46, 44);
    interior.addColorStop(0, '#241c14'); interior.addColorStop(1, '#0e0a06');
    g.fillStyle = interior; g.fillRect(16, 14, 32, 30);
    g.fillStyle = '#7a8028'; g.fillRect(20, 30, 8, 10); g.fillRect(34, 20, 6, 8);  // hint of interior greenery
    g.strokeStyle = '#1c1e22'; g.lineWidth = 2.4; g.lineCap = 'round';            // iron reja bars, vertical
    for (let x = 19; x <= 43; x += 4.5) { g.beginPath(); g.moveTo(x, 12); g.lineTo(x, 46); g.stroke(); }
    g.strokeStyle = '#26282e'; g.lineWidth = 2;                                  // horizontal crossbars
    g.beginPath(); g.moveTo(14, 20); g.lineTo(50, 20); g.moveTo(14, 38); g.lineTo(50, 38); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.1)'; for (let x = 19; x <= 43; x += 4.5) g.fillRect(x - 0.4, 12, 0.8, 34);  // highlight edge
    g.fillStyle = '#8a7042'; g.fillRect(12, 46, 40, 3);                          // sill
    bevel(g, 12, 46, 40, 3, 'rgba(255,240,200,0.25)', 'rgba(0,0,0,0.3)');
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 59, 64, 5);
  });

  FLOOR.windowshut = cnv(g => {                         // fully shuttered window, closed tight
    vgrad(g, 0, 0, 64, 64, '#c78868', '#a76648');
    stains(g, 7, ['#8a5638', '#6a4230']);
    speck(g, 60, 'rgba(0,0,0,0.05)');
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(13, 10, 38, 36);                 // recess
    let sh = g.createLinearGradient(0, 12, 0, 44);
    sh.addColorStop(0, '#3a5c40'); sh.addColorStop(1, '#22381f');
    g.fillStyle = sh; g.fillRect(15, 12, 34, 32);
    bevel(g, 15, 12, 34, 32, 'rgba(200,230,180,0.18)', 'rgba(0,0,0,0.4)');
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1;                          // louvre slats, closed
    for (let y = 15; y < 42; y += 3.2) { g.beginPath(); g.moveTo(16, y); g.lineTo(48, y); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 1;
    for (let y = 16.4; y < 42; y += 3.2) { g.beginPath(); g.moveTo(16, y); g.lineTo(48, y); g.stroke(); }
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(32, 12); g.lineTo(32, 44); g.stroke();  // centre seam, two doors
    g.fillStyle = '#1c1e22'; g.beginPath(); g.arc(30, 28, 1.2, 0, 7); g.fill(); g.beginPath(); g.arc(34, 28, 1.2, 0, 7); g.fill();  // latch pins
    g.fillStyle = '#8a5638'; g.fillRect(11, 44, 40, 3);                          // sill
    bevel(g, 11, 44, 40, 3, 'rgba(255,220,180,0.22)', 'rgba(0,0,0,0.3)');
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 59, 64, 5);
  });

  FLOOR.rockwall = cnv(g => {                           // rough natural stone / cliff face
    vgrad(g, 0, 0, 64, 64, '#8c887e', '#5e5a52');
    const cols = ['#7a7668', '#67635a', '#918c7e', '#544f47', '#847e70'];
    for (let i = 0; i < 22; i++) {                       // jagged overlapping boulder facets
      const x = Math.random() * 70 - 3, y = Math.random() * 70 - 3, r = 6 + Math.random() * 9;
      g.fillStyle = cols[(Math.random() * cols.length) | 0];
      g.beginPath();
      const pts = 6 + ((Math.random() * 3) | 0);
      for (let k = 0; k < pts; k++) { const a = (k / pts) * 7, rr = r * (0.7 + Math.random() * 0.4); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; k ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = 0.8; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x - r * 0.3, y - r * 0.3); g.lineTo(x + r * 0.2, y - r * 0.1); g.stroke();
    }
    speck(g, 90, 'rgba(0,0,0,0.15)'); speck(g, 50, 'rgba(255,255,255,0.06)');
    bevel(g, 0, 0, 64, 64, 'rgba(255,255,255,0.06)', 'rgba(0,0,0,0.3)');
  });

  FLOOR.mossyrock = cnv(g => {                          // rockwall's damp, overgrown cousin — garden/jungle walls
    vgrad(g, 0, 0, 64, 64, '#6e7860', '#454c38');
    const cols = ['#5e6650', '#4c5340', '#727a5c', '#3e4432'];
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * 70 - 3, y = Math.random() * 70 - 3, r = 6 + Math.random() * 9;
      g.fillStyle = cols[(Math.random() * cols.length) | 0];
      g.beginPath();
      const pts = 6 + ((Math.random() * 3) | 0);
      for (let k = 0; k < pts; k++) { const a = (k / pts) * 7, rr = r * (0.7 + Math.random() * 0.4); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; k ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.24)'; g.lineWidth = 0.8; g.stroke();
    }
    g.fillStyle = 'rgba(90,120,50,0.35)';                // moss patches, thickest low on the wall
    for (let i = 0; i < 14; i++) { const x = Math.random() * 64, y = 24 + Math.random() * 40, r = 3 + Math.random() * 5; g.beginPath(); g.ellipse(x, y, r, r * 0.6, Math.random(), 0, 7); g.fill(); }
    speck(g, 70, 'rgba(0,0,0,0.15)'); speck(g, 40, 'rgba(200,230,150,0.08)');
    bevel(g, 0, 0, 64, 64, 'rgba(200,220,160,0.06)', 'rgba(0,0,0,0.32)');
  });

  FLOOR.pond = cnv(g => {                               // still garden pond — calmer/greener than the fountain's `water`
    vgrad(g, 0, 0, 64, 64, '#3a6650', '#1f4234');
    g.strokeStyle = 'rgba(160,220,190,0.16)'; g.lineWidth = 1;
    for (let k = 0; k < 6; k++) { const y = 6 + k * 10; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 64; x += 8) g.lineTo(x, y + Math.sin(x * 0.3 + k) * 1.6); g.stroke(); }
    g.fillStyle = 'rgba(60,110,70,0.4)';                 // lily pads
    for (const [x, y, r] of [[14, 18, 5], [42, 30, 6], [24, 46, 4.5], [50, 12, 4]]) { g.beginPath(); g.ellipse(x, y, r, r * 0.75, 0.3, 0, 7); g.fill(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + r, y - r * 0.2); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.1)'; for (let i = 0; i < 8; i++) g.fillRect((Math.random() * 64) | 0, (Math.random() * 64) | 0, 2, 1);
  });

  FLOOR.wetstone = cnv(g => {                           // rain-slicked stone/cobble — dockside, alleys after a storm
    g.fillStyle = '#3a3834'; g.fillRect(0, 0, 64, 64);   // dark wet grout
    for (let ty = 0; ty < 5; ty++) for (let tx = 0; tx < 5; tx++) {
      const off = (ty % 2) * 6, x = tx * 13 + off - 4, y = ty * 13, r = 5 + Math.random() * 2;
      g.fillStyle = ['#4c4a46', '#403e3a', '#565450', '#38362f'][(tx + ty) % 4];
      g.beginPath(); g.ellipse(x + 6, y + 6, r, r * 0.85, Math.random(), 0, 7); g.fill();
      g.fillStyle = 'rgba(180,210,230,0.22)'; g.beginPath(); g.ellipse(x + 4.5, y + 4.5, r * 0.4, r * 0.3, 0, 0, 7); g.fill();  // wet specular highlight
    }
    g.fillStyle = 'rgba(140,180,210,0.06)'; g.fillRect(0, 0, 64, 64);
    speck(g, 40, 'rgba(255,255,255,0.05)');
  });

  // ---------------------------------------------------------------------------
  // MIDEAST CITY textures — Casablanca/Indiana-Jones bazaar territory: coursed
  // sandstone, geometric zellige tile, carved wooden mashrabiya screens, a
  // woven kilim rug floor, packed desert sand.
  // ---------------------------------------------------------------------------
  FLOOR.sandstone = cnv(g => {                          // coursed sandstone city wall, wind-worn
    vgrad(g, 0, 0, 64, 64, '#d8b878', '#a8814c');
    g.strokeStyle = 'rgba(80,55,25,0.35)'; g.lineWidth = 1;
    for (let ty = 0; ty < 4; ty++) {
      const y = ty * 16, off = (ty % 2) * 10;
      g.beginPath(); g.moveTo(0, y); g.lineTo(64, y); g.stroke();
      for (let x = -10 + off; x < 64; x += 20) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 16); g.stroke(); }
    }
    g.fillStyle = 'rgba(255,240,200,0.14)';               // sun-bleached block highlights
    for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 4; tx++) g.fillRect(tx * 16 + 1, ty * 16 + 1, 8, 3);
    stains(g, 8, ['#8a6432', '#6a4c22']);
    speck(g, 60, 'rgba(60,40,15,0.14)'); speck(g, 30, 'rgba(255,250,220,0.08)');
    bevel(g, 0, 0, 64, 64, 'rgba(255,245,210,0.1)', 'rgba(50,32,10,0.3)');
  });

  FLOOR.zellige = cnv(g => {                             // Moroccan geometric mosaic tile — 8-point star + cross
    vgrad(g, 0, 0, 64, 64, '#f0ece0', '#dcd6c4');
    const star = (cx, cy, r) => {
      g.beginPath();
      for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283 - 0.2, rr = i % 2 === 0 ? r : r * 0.42; const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr; i ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.closePath(); g.fill();
    };
    g.fillStyle = '#2a5f8a'; star(16, 16, 11); star(48, 16, 11); star(16, 48, 11); star(48, 48, 11);
    g.fillStyle = '#b8542e'; star(32, 32, 11);
    g.fillStyle = 'rgba(255,255,255,0.35)'; star(16, 16, 5); star(48, 16, 5); star(16, 48, 5); star(48, 48, 5); star(32, 32, 5);
    g.strokeStyle = 'rgba(40,30,15,0.3)'; g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, 63, 63);
    g.beginPath(); g.moveTo(32, 0); g.lineTo(0, 32); g.moveTo(32, 0); g.lineTo(64, 32); g.moveTo(0, 32); g.lineTo(32, 64); g.moveTo(64, 32); g.lineTo(32, 64); g.stroke();
    speck(g, 30, 'rgba(0,0,0,0.06)');
  });

  FLOOR.mashrabiya = cnv(g => {                          // carved wooden lattice screen, dark voids between the wood
    vgrad(g, 0, 0, 64, 64, '#8a6438', '#5c4222');
    g.fillStyle = '#241a10';                              // pierced openings
    const hex = (cx, cy, r) => { g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); g.fill(); };
    for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 4; tx++) {
      const x = tx * 16 + 8 + (ty % 2) * 8, y = ty * 16 + 8;
      hex(x % 64 || 64, y, 5.4);
    }
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1.2;
    for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 4; tx++) { const x = tx * 16 + 8 + (ty % 2) * 8, y = ty * 16 + 8; g.beginPath(); g.arc(x % 64 || 64, y, 5.4, 0, 7); g.stroke(); }
    g.fillStyle = 'rgba(255,230,180,0.12)';
    for (let x = 0; x < 64; x += 4) g.fillRect(x, 0, 1, 64);
    bevel(g, 0, 0, 64, 64, 'rgba(255,230,180,0.14)', 'rgba(0,0,0,0.35)');
  });

  FLOOR.kilim = cnv(g => {                               // woven kilim rug — chevron bands, warm reds/oranges
    vgrad(g, 0, 0, 64, 64, '#a8331e', '#7a2012');
    const bands = [[0, 10, '#e8a840'], [10, 20, '#3a2416'], [20, 26, '#c9c0a0'], [26, 36, '#7a2012'], [36, 42, '#c9c0a0'], [42, 52, '#3a2416'], [52, 64, '#e8a840']];
    for (const [y0, y1, col] of bands) {
      g.fillStyle = col; g.fillRect(0, y0, 64, y1 - y0);
      g.fillStyle = 'rgba(0,0,0,0.14)';
      for (let x = 0; x < 64; x += 8) { g.beginPath(); g.moveTo(x, y0); g.lineTo(x + 4, (y0 + y1) / 2); g.lineTo(x, y1); g.stroke(); }
    }
    g.strokeStyle = 'rgba(255,255,255,0.1)'; g.lineWidth = 0.6;
    for (let y = 0; y < 64; y += 2) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y); g.stroke(); }   // weave grain
    speck(g, 40, 'rgba(0,0,0,0.1)');
  });

  FLOOR.sandfloor = cnv(g => {                           // packed desert sand / courtyard dust
    vgrad(g, 0, 0, 64, 64, '#dcc088', '#b89860');
    g.strokeStyle = 'rgba(140,110,60,0.16)'; g.lineWidth = 1;
    for (let k = 0; k < 7; k++) { const y = k * 9 + 3; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 64; x += 8) g.lineTo(x, y + Math.sin(x * 0.35 + k) * 2); g.stroke(); }  // wind ripples
    g.fillStyle = 'rgba(90,66,30,0.25)'; for (let i = 0; i < 14; i++) g.fillRect((Math.random() * 64) | 0, (Math.random() * 64) | 0, 1, 1);  // pebbles
    speck(g, 70, 'rgba(60,42,18,0.1)'); speck(g, 40, 'rgba(255,245,210,0.1)');
  });

  // ---------------------------------------------------------------------------
  // SWINGING 60s PARIS textures — pale Haussmannian limestone, wrought-iron
  // balcony grille, a Mod op-art pattern, toile de Jouy wallpaper, zinc
  // mansard roofing.
  // ---------------------------------------------------------------------------
  FLOOR.haussmann = cnv(g => {                          // pale cut-limestone Haussmann facade, coursed ashlar
    vgrad(g, 0, 0, 64, 64, '#ece4d0', '#c9bea0');
    g.strokeStyle = 'rgba(120,105,75,0.3)'; g.lineWidth = 1;
    for (let ty = 0; ty < 4; ty++) {
      const y = ty * 16, off = (ty % 2) * 11;
      g.beginPath(); g.moveTo(0, y); g.lineTo(64, y); g.stroke();
      for (let x = -11 + off; x < 64; x += 22) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 16); g.stroke(); }
    }
    g.fillStyle = 'rgba(255,252,240,0.18)';
    for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 3; tx++) g.fillRect(tx * 22 + 2, ty * 16 + 1, 10, 3);
    stains(g, 5, ['#a89870', '#8a7a54']);
    speck(g, 45, 'rgba(70,55,30,0.1)'); speck(g, 30, 'rgba(255,252,240,0.08)');
    bevel(g, 0, 0, 64, 64, 'rgba(255,252,240,0.14)', 'rgba(40,32,15,0.22)');
  });

  FLOOR.wroughtiron = cnv(g => {                        // black wrought-iron balcony grille, scrollwork
    g.fillStyle = '#1c1a18'; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = '#3a3630'; g.lineWidth = 2.4; g.lineCap = 'round';
    for (let x = 6; x < 64; x += 12) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 64); g.stroke(); }
    g.lineWidth = 1.6;
    for (let x = 6; x < 64; x += 24) {
      g.beginPath(); g.moveTo(x, 20); g.quadraticCurveTo(x + 8, 14, x + 12, 20); g.quadraticCurveTo(x + 16, 26, x + 24, 20); g.stroke();
      g.beginPath(); g.moveTo(x, 44); g.quadraticCurveTo(x + 8, 38, x + 12, 44); g.quadraticCurveTo(x + 16, 50, x + 24, 44); g.stroke();
      g.beginPath(); g.arc(x + 12, 32, 4, 0, 7); g.stroke();
    }
    g.strokeStyle = 'rgba(90,86,78,0.5)'; g.lineWidth = 0.6;
    for (let x = 6; x < 64; x += 12) { g.beginPath(); g.moveTo(x - 0.6, 0); g.lineTo(x - 0.6, 64); g.stroke(); }
    speck(g, 30, 'rgba(0,0,0,0.2)');
  });

  FLOOR.opart = cnv(g => {                               // Mod 60s op-art — bold concentric black/white rings
    g.fillStyle = '#0e0e10'; g.fillRect(0, 0, 64, 64);
    const rings = ['#f4f0e4', '#0e0e10'];
    for (let r = 30; r > 0; r -= 5) { g.fillStyle = rings[(r / 5) % 2]; g.beginPath(); g.arc(32, 32, r, 0, 7); g.fill(); }
    g.fillStyle = '#d8283a'; g.beginPath(); g.arc(32, 32, 3, 0, 7); g.fill();
    speck(g, 20, 'rgba(0,0,0,0.08)');
  });

  FLOOR.toile = cnv(g => {                               // toile de Jouy wallpaper — pastoral scene in blue ink on cream
    vgrad(g, 0, 0, 64, 64, '#f0ece0', '#e4ddc8');
    g.strokeStyle = '#3a5578'; g.lineWidth = 1; g.fillStyle = '#3a5578';
    g.beginPath(); g.ellipse(20, 44, 8, 5, 0, 0, 7); g.fill();                      // a tree canopy
    g.fillRect(19, 44, 2, 12);
    g.beginPath(); g.moveTo(38, 56); g.quadraticCurveTo(40, 48, 36, 42); g.stroke(); // a shepherd's crook figure, abstracted
    g.beginPath(); g.arc(36, 40, 2.2, 0, 7); g.fill();
    g.beginPath(); g.ellipse(36, 48, 2.6, 6, 0.1, 0, 7); g.fill();
    g.beginPath(); g.ellipse(46, 20, 5, 3, 0.3, 0, 7); g.fill();                    // a distant bird/dove
    g.beginPath(); g.moveTo(48, 19); g.lineTo(53, 16); g.stroke();
    g.strokeStyle = 'rgba(58,85,120,0.4)'; g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(0, 58); g.quadraticCurveTo(32, 52, 64, 58); g.stroke(); // ground line
    speck(g, 20, 'rgba(58,85,120,0.06)');
  });

  FLOOR.zincroof = cnv(g => {                            // Parisian zinc mansard roofing — grey diamond panels
    vgrad(g, 0, 0, 64, 64, '#9098a0', '#6a7078');
    g.strokeStyle = 'rgba(40,44,48,0.4)'; g.lineWidth = 1;
    for (let ty = -1; ty < 5; ty++) for (let tx = -1; tx < 5; tx++) {
      const x = tx * 16 + (ty % 2) * 8, y = ty * 8;
      g.beginPath(); g.moveTo(x, y + 4); g.lineTo(x + 8, y); g.lineTo(x + 16, y + 4); g.lineTo(x + 8, y + 8); g.closePath(); g.stroke();
    }
    g.fillStyle = 'rgba(210,220,226,0.14)';
    for (let ty = -1; ty < 5; ty++) for (let tx = -1; tx < 5; tx++) { const x = tx * 16 + (ty % 2) * 8, y = ty * 8; g.beginPath(); g.moveTo(x, y + 4); g.lineTo(x + 8, y); g.lineTo(x + 9, y + 1); g.lineTo(x + 1, y + 5); g.closePath(); g.fill(); }
    speck(g, 40, 'rgba(20,24,28,0.15)'); speck(g, 20, 'rgba(220,228,232,0.08)');
  });

  // ---------------------------------------------------------------------------
  // PARIS, round 2 — a café awning, Seine embankment stone, a gilded Belle
  // Époque ceiling, a bouquiniste book-stall's green paneling.
  // ---------------------------------------------------------------------------
  FLOOR.cafeawning = cnv(g => {                         // forest-green & cream bistro awning canvas
    const stripes = ['#1e5c3a', '#f0ece0'];
    for (let i = 0; i < 8; i++) { g.fillStyle = stripes[i % 2]; g.fillRect(i * 8, 0, 8, 64); }
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 0.6;
    for (let y = 6; y < 64; y += 7) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y); g.stroke(); }  // canvas weave
    g.fillStyle = 'rgba(255,255,255,0.1)'; for (let i = 1; i < 8; i += 2) g.fillRect(i * 8, 0, 1.4, 64);
    speck(g, 30, 'rgba(0,0,0,0.08)');
    bevel(g, 0, 0, 64, 64, 'rgba(255,255,255,0.1)', 'rgba(0,0,0,0.25)');
  });

  FLOOR.riverstone = cnv(g => {                         // Seine embankment quay wall — grey limestone, mossy waterline
    vgrad(g, 0, 0, 64, 64, '#9a988c', '#727060');
    g.strokeStyle = 'rgba(40,40,32,0.35)'; g.lineWidth = 1;
    for (let ty = 0; ty < 4; ty++) {
      const y = ty * 16, off = (ty % 2) * 10;
      g.beginPath(); g.moveTo(0, y); g.lineTo(64, y); g.stroke();
      for (let x = -10 + off; x < 64; x += 20) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 16); g.stroke(); }
    }
    g.fillStyle = 'rgba(70,100,50,0.28)';                // moss creeping up from the waterline
    for (let i = 0; i < 10; i++) { const x = Math.random() * 64, y = 44 + Math.random() * 20; g.beginPath(); g.ellipse(x, y, 3 + Math.random() * 3, 2, 0, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,0.1)';
    for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 3; tx++) g.fillRect(tx * 20 + 1, ty * 16 + 1, 8, 2.4);
    speck(g, 55, 'rgba(20,20,15,0.14)'); speck(g, 25, 'rgba(255,255,255,0.06)');
  });

  FLOOR.gildedceiling = cnv(g => {                       // Belle Époque gold-leaf ceiling molding on cream plaster
    vgrad(g, 0, 0, 64, 64, '#f0e8d4', '#d8ccac');
    g.strokeStyle = '#c9a227'; g.lineWidth = 2;
    g.beginPath(); g.rect(6, 6, 52, 52); g.stroke();
    g.lineWidth = 1; g.beginPath(); g.rect(12, 12, 40, 40); g.stroke();
    const leaf = (cx, cy, r) => { g.beginPath(); g.ellipse(cx, cy - r * 0.6, r * 0.5, r, -0.3, 0, 7); g.fill(); g.beginPath(); g.ellipse(cx, cy + r * 0.6, r * 0.5, r, 0.3, 0, 7); g.fill(); };
    g.fillStyle = 'rgba(201,162,39,0.8)';
    leaf(32, 32, 8);
    for (const [cx, cy] of [[6, 6], [58, 6], [6, 58], [58, 58]]) { g.save(); g.translate(cx, cy); g.beginPath(); g.arc(0, 0, 5, 0, 7); g.fill(); g.restore(); }
    g.fillStyle = 'rgba(255,250,230,0.3)'; g.beginPath(); g.ellipse(26, 24, 8, 4, -0.3, 0, 7); g.fill();
    speck(g, 30, 'rgba(120,90,20,0.1)');
  });

  FLOOR.bouquiniste = cnv(g => {                         // Seine bouquiniste book-stall — dark green wood paneling
    vgrad(g, 0, 0, 64, 64, '#2e5c40', '#1c3c28');
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1.4;
    for (let x = 0; x < 64; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 64); g.stroke(); }
    g.strokeStyle = 'rgba(0,0,0,0.15)'; g.lineWidth = 0.6;
    for (let y = 8; y < 64; y += 10) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.08)'; for (let x = 2; x < 64; x += 16) g.fillRect(x, 0, 2.4, 64);
    g.fillStyle = '#1c1e22'; g.beginPath(); g.arc(16, 24, 1.4, 0, 7); g.fill(); g.beginPath(); g.arc(48, 40, 1.4, 0, 7); g.fill();  // latch hardware
    stains(g, 5, ['#1a3a26', '#123020']);
    speck(g, 40, 'rgba(0,0,0,0.12)');
    bevel(g, 0, 0, 64, 64, 'rgba(255,255,255,0.06)', 'rgba(0,0,0,0.35)');
  });

  // ---------------------------------------------------------------------------
  // PARIS, round 3 — building facades with windows: a Haussmann limestone
  // front with a wrought-iron Juliet balcony, a zinc mansard dormer, an
  // apartment front with blue-grey louvered shutters, a Belle Époque
  // black-and-gold shopfront.
  // ---------------------------------------------------------------------------
  FLOOR.haussmannwindow = cnv(g => {                    // Haussmann limestone facade, tall French window + iron balcony
    vgrad(g, 0, 0, 64, 64, '#ece4d0', '#c9bea0');
    stains(g, 5, ['#a89870', '#8a7a54']);
    speck(g, 40, 'rgba(70,55,30,0.08)'); speck(g, 25, 'rgba(255,252,240,0.06)');
    g.fillStyle = 'rgba(60,50,30,0.18)'; g.fillRect(15, 6, 34, 32);           // recessed reveal
    const gl = g.createLinearGradient(17, 8, 47, 36);
    gl.addColorStop(0, '#3c4a56'); gl.addColorStop(1, '#161e24');
    g.fillStyle = gl; g.fillRect(17, 8, 30, 28);
    g.strokeStyle = 'rgba(255,255,255,0.10)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(21, 10); g.lineTo(25, 34); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 1.4;                   // french-door mullions, two leaves
    g.beginPath(); g.moveTo(32, 8); g.lineTo(32, 36); g.moveTo(17, 22); g.lineTo(47, 22); g.stroke();
    g.strokeStyle = '#f4efe0'; g.lineWidth = 1.4; g.strokeRect(15, 6, 34, 32); // painted stone trim
    g.strokeStyle = '#1c1a18'; g.lineWidth = 2.6; g.lineCap = 'round';       // wrought-iron Juliet balcony
    g.beginPath(); g.moveTo(11, 41); g.lineTo(53, 41); g.stroke();
    for (let x = 13; x <= 51; x += 5) { g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, 36); g.lineTo(x, 41); g.stroke(); }
    g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(11, 36); g.quadraticCurveTo(20, 32, 32, 36); g.quadraticCurveTo(44, 32, 53, 36); g.stroke();
    g.fillStyle = 'rgba(40,32,15,0.35)'; g.fillRect(11, 41, 42, 2);
    g.fillStyle = '#8a7a54'; g.fillRect(12, 43, 40, 3);                      // stone sill under the balcony
    bevel(g, 15, 6, 34, 32, 'rgba(255,252,240,0.16)', 'rgba(40,32,15,0.25)');
    g.fillStyle = 'rgba(0,0,0,0.1)'; g.fillRect(0, 59, 64, 5);
  });

  FLOOR.mansardwindow = cnv(g => {                       // zinc mansard roof with a dormer window, copper-green cap
    vgrad(g, 0, 0, 64, 64, '#9098a0', '#6a7078');
    g.strokeStyle = 'rgba(40,44,48,0.4)'; g.lineWidth = 1;
    for (let ty = -1; ty < 5; ty++) for (let tx = -1; tx < 5; tx++) {
      const x = tx * 16 + (ty % 2) * 8, y = ty * 8;
      g.beginPath(); g.moveTo(x, y + 4); g.lineTo(x + 8, y); g.lineTo(x + 16, y + 4); g.lineTo(x + 8, y + 8); g.closePath(); g.stroke();
    }
    speck(g, 30, 'rgba(20,24,28,0.12)');
    g.fillStyle = '#4a5258'; g.beginPath();                                 // dormer housing
    g.moveTo(14, 30); g.lineTo(20, 12); g.lineTo(44, 12); g.lineTo(50, 30); g.closePath(); g.fill();
    g.strokeStyle = '#2e3438'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = '#3a7a5c'; g.beginPath();                                 // copper-green roof cap
    g.moveTo(20, 12); g.lineTo(32, 4); g.lineTo(44, 12); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.stroke();
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(20, 16, 24, 18);           // window reveal
    const gl2 = g.createLinearGradient(22, 18, 42, 32);
    gl2.addColorStop(0, '#3c4a52'); gl2.addColorStop(1, '#161e22');
    g.fillStyle = gl2; g.fillRect(22, 18, 20, 14);
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(32, 18); g.lineTo(32, 32); g.moveTo(22, 25); g.lineTo(42, 25); g.stroke();
    g.strokeStyle = '#e8e2d4'; g.lineWidth = 1; g.strokeRect(20, 16, 24, 18);
    g.fillStyle = '#5a6268'; g.fillRect(16, 30, 32, 4);                     // sill / roof-body joint
    vgrad(g, 0, 40, 64, 24, '#7a828a', '#5a6068');                          // roof continues below the dormer
    g.strokeStyle = 'rgba(40,44,48,0.35)'; g.lineWidth = 1;
    for (let x = -8; x < 64; x += 16) { g.beginPath(); g.moveTo(x, 40); g.lineTo(x + 8, 64); g.stroke(); }
    speck(g, 25, 'rgba(20,24,28,0.14)');
  });

  FLOOR.parisshutters = cnv(g => {                       // cream apartment facade, tall window, blue-grey louvered shutters
    vgrad(g, 0, 0, 64, 64, '#e8e0cc', '#cabf9e');
    stains(g, 6, ['#b8ab84', '#9c8f68']);
    speck(g, 45, 'rgba(70,55,30,0.06)'); speck(g, 25, 'rgba(255,252,240,0.06)');
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(13, 6, 38, 44);             // recessed reveal
    const gl = g.createLinearGradient(16, 9, 47, 47);
    gl.addColorStop(0, '#3a4a52'); gl.addColorStop(1, '#141c20');
    g.fillStyle = gl; g.fillRect(16, 9, 32, 38);
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(32, 9); g.lineTo(32, 47); g.moveTo(16, 24); g.lineTo(48, 24); g.moveTo(16, 36); g.lineTo(48, 36); g.stroke();
    const shu = '#5c7080';                                                  // blue-grey louvered shutters, open
    g.fillStyle = shu; g.fillRect(6, 8, 6, 42); g.fillRect(52, 8, 6, 42);
    g.strokeStyle = 'rgba(0,0,0,0.28)'; g.lineWidth = 0.8;
    for (let y = 10; y < 48; y += 3) { g.beginPath(); g.moveTo(6, y); g.lineTo(12, y); g.moveTo(52, y); g.lineTo(58, y); g.stroke(); }
    bevel(g, 6, 8, 6, 42, 'rgba(255,255,255,0.12)', 'rgba(0,0,0,0.3)');
    bevel(g, 52, 8, 6, 42, 'rgba(255,255,255,0.12)', 'rgba(0,0,0,0.3)');
    g.fillStyle = '#a89870'; g.fillRect(11, 48, 42, 4);                     // stone sill
    bevel(g, 11, 48, 42, 4, 'rgba(255,250,230,0.22)', 'rgba(0,0,0,0.28)');
    g.fillStyle = 'rgba(0,0,0,0.1)'; g.fillRect(0, 59, 64, 5);
  });

  FLOOR.parisshopfront = cnv(g => {                      // Belle Époque shopfront: black wood frame, gold fascia lettering
    vgrad(g, 0, 0, 64, 64, '#1c1a18', '#100e0c');
    g.fillStyle = '#0c0b0a'; g.fillRect(4, 14, 56, 40);                     // frame surround
    bevel(g, 4, 14, 56, 40, 'rgba(255,220,140,0.12)', 'rgba(0,0,0,0.5)');
    const gl = g.createLinearGradient(8, 18, 56, 50);
    gl.addColorStop(0, '#5a747c'); gl.addColorStop(0.45, '#2a3a40'); gl.addColorStop(0.55, '#1c2a2e'); gl.addColorStop(1, '#0e1618');
    g.fillStyle = gl; g.fillRect(8, 18, 48, 32);
    g.fillStyle = 'rgba(255,255,255,0.14)'; g.beginPath();                  // diagonal glare streak
    g.moveTo(12, 48); g.lineTo(22, 20); g.lineTo(27, 20); g.lineTo(17, 48); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(10,8,6,0.6)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(32, 18); g.lineTo(32, 50); g.stroke();
    g.fillStyle = '#c9a227'; g.fillRect(0, 0, 64, 12);                      // gold fascia band
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, 12); g.lineTo(64, 12); g.stroke();
    g.fillStyle = 'rgba(30,20,8,0.7)';
    for (let i = 0; i < 5; i++) g.fillRect(8 + i * 10, 4, 6, 4);            // abstracted gold-leaf lettering blocks
    g.fillStyle = '#8a6a1c'; g.fillRect(0, 50, 64, 6);                      // brass kick plate
    bevel(g, 0, 50, 64, 6, 'rgba(255,230,160,0.3)', 'rgba(0,0,0,0.4)');
    speck(g, 30, 'rgba(0,0,0,0.15)');
  });

  // ---------------------------------------------------------------------------
  // NEW YORK 1964 textures — subway station tile, brownstone rowhouse facade,
  // a deli's red/white checker floor, a glass-curtain-wall office tower,
  // a Broadway marquee.
  // ---------------------------------------------------------------------------
  FLOOR.subwaytile = cnv(g => {                         // IND-style subway station tile, cream + colored band
    vgrad(g, 0, 0, 64, 64, '#e8e2d0', '#c9c2a8');
    g.strokeStyle = 'rgba(80,72,50,0.3)'; g.lineWidth = 1;
    for (let x = 0; x <= 64; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 64); g.stroke(); }
    for (let y = 0; y <= 64; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y); g.stroke(); }
    g.fillStyle = '#1e5c3a'; g.fillRect(0, 24, 64, 8);    // colored ID band, IND green
    g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 24); g.lineTo(64, 24); g.moveTo(0, 32); g.lineTo(64, 32); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.15)';
    for (let ty = 0; ty < 8; ty++) for (let tx = 0; tx < 8; tx++) g.fillRect(tx * 8 + 1, ty * 8 + 1, 5, 1.4);
    speck(g, 45, 'rgba(60,54,36,0.1)');
  });

  FLOOR.brownstone = cnv(g => {                          // NYC brownstone rowhouse facade, warm red-brown stone
    vgrad(g, 0, 0, 64, 64, '#8a5240', '#5c3226');
    g.strokeStyle = 'rgba(30,14,8,0.35)'; g.lineWidth = 1;
    for (let ty = 0; ty < 5; ty++) {
      const y = ty * 13, off = (ty % 2) * 8;
      g.beginPath(); g.moveTo(0, y); g.lineTo(64, y); g.stroke();
      for (let x = -8 + off; x < 64; x += 16) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 13); g.stroke(); }
    }
    g.fillStyle = 'rgba(255,220,200,0.1)';
    for (let ty = 0; ty < 5; ty++) for (let tx = 0; tx < 4; tx++) g.fillRect(tx * 16 + 1, ty * 13 + 1, 8, 2.6);
    stains(g, 5, ['#6a3c2c', '#4a2418']);
    speck(g, 50, 'rgba(20,8,4,0.15)'); speck(g, 22, 'rgba(255,220,200,0.06)');
    bevel(g, 0, 0, 64, 64, 'rgba(255,220,200,0.08)', 'rgba(20,8,4,0.3)');
  });

  FLOOR.delitile = cnv(g => {                            // deli/pizzeria checker floor, red & white
    const sq = 16;
    for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 4; tx++) {
      g.fillStyle = (tx + ty) % 2 === 0 ? '#e8e0cc' : '#8a1414';
      g.fillRect(tx * sq, ty * sq, sq, sq);
    }
    g.fillStyle = 'rgba(255,255,255,0.14)';
    for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 4; tx++) if ((tx + ty) % 2 === 0) g.fillRect(tx * sq + 1, ty * sq + 1, sq - 2, 3);
    g.strokeStyle = 'rgba(0,0,0,0.15)'; g.lineWidth = 0.6;
    for (let x = 0; x <= 64; x += sq) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 64); g.stroke(); }
    for (let y = 0; y <= 64; y += sq) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y); g.stroke(); }
    speck(g, 30, 'rgba(0,0,0,0.08)');
  });

  FLOOR.skyscraperglass = cnv(g => {                     // International-Style curtain-wall office tower, blue glass
    vgrad(g, 0, 0, 64, 64, '#4a7ca0', '#2c5074');
    g.strokeStyle = 'rgba(20,30,40,0.5)'; g.lineWidth = 1.4;
    for (let x = 0; x <= 64; x += 10.6) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 64); g.stroke(); }
    g.strokeStyle = 'rgba(20,30,40,0.3)'; g.lineWidth = 0.8;
    for (let y = 0; y <= 64; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.22)';
    for (let x = 1; x < 64; x += 10.6) g.fillRect(x, 0, 2, 64);
    g.fillStyle = 'rgba(200,225,240,0.12)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(30, 0); g.lineTo(0, 40); g.closePath(); g.fill();
    speck(g, 20, 'rgba(255,255,255,0.06)');
  });

  FLOOR.marquee = cnv(g => {                             // Broadway theater marquee, bulb lights + bold lettering band
    vgrad(g, 0, 0, 64, 64, '#3a1414', '#240c0c');
    g.fillStyle = '#c9242e'; g.fillRect(0, 20, 64, 24);   // red lettering band
    bevel(g, 0, 20, 64, 24, 'rgba(255,220,180,0.2)', 'rgba(0,0,0,0.35)');
    g.fillStyle = '#e8dca0'; g.fillRect(6, 28, 52, 8);
    g.fillStyle = '#1c1214'; g.font = 'bold 7px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('TONIGHT', 32, 32.5);
    g.fillStyle = 'rgba(255,225,140,0.9)';                // bulb lights ringing the band
    for (let x = 3; x < 64; x += 6) { g.beginPath(); g.arc(x, 21, 1.3, 0, 7); g.fill(); g.beginPath(); g.arc(x, 43, 1.3, 0, 7); g.fill(); }
    for (let y = 22; y < 43; y += 6) { g.beginPath(); g.arc(3, y, 1.3, 0, 7); g.fill(); g.beginPath(); g.arc(61, y, 1.3, 0, 7); g.fill(); }
    speck(g, 25, 'rgba(0,0,0,0.15)');
  });

  // ---------------------------------------------------------------------------
  // HONG KONG textures — glowing neon shop signage, lashed bamboo scaffolding,
  // colorful tenement mosaic tile, weathered junk-boat deck wood, a dense
  // high-rise tenement facade.
  // ---------------------------------------------------------------------------
  FLOOR.neonsign = cnv(g => {                            // glowing neon Cantonese-style shop sign, dark ground
    vgrad(g, 0, 0, 64, 64, '#140a1c', '#0a0510');
    const glow = (x1, y1, x2, y2, col) => {
      g.strokeStyle = col; g.lineWidth = 3; g.lineCap = 'round';
      g.shadowColor = col; g.shadowBlur = 6;
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
      g.shadowBlur = 0;
    };
    g.strokeStyle = 'rgba(255,60,140,0.9)';
    glow(14, 8, 14, 30, 'rgba(255,60,160,0.95)'); glow(14, 8, 22, 8, 'rgba(255,60,160,0.95)'); glow(14, 19, 20, 19, 'rgba(255,60,160,0.95)');
    glow(30, 8, 30, 30, 'rgba(80,220,255,0.95)'); glow(30, 19, 38, 19, 'rgba(80,220,255,0.95)'); glow(38, 8, 38, 30, 'rgba(80,220,255,0.95)');
    glow(46, 8, 46, 30, 'rgba(255,214,60,0.95)'); glow(46, 8, 52, 14, 'rgba(255,214,60,0.95)'); glow(46, 19, 52, 19, 'rgba(255,214,60,0.95)'); glow(46, 30, 52, 30, 'rgba(255,214,60,0.95)');
    g.fillStyle = 'rgba(255,255,255,0.06)'; for (let y = 40; y < 64; y += 6) g.fillRect(0, y, 64, 1);
    speck(g, 30, 'rgba(0,0,0,0.2)'); speck(g, 15, 'rgba(255,255,255,0.05)');
  });

  FLOOR.bambooscaffold = cnv(g => {                       // lashed bamboo construction scaffolding
    vgrad(g, 0, 0, 64, 64, '#8a9840', '#5c6828');
    const pole = (x) => { let pg = g.createLinearGradient(x - 3, 0, x + 3, 0); pg.addColorStop(0, '#a8b858'); pg.addColorStop(0.5, '#c9d878'); pg.addColorStop(1, '#7a8838'); g.fillStyle = pg; g.fillRect(x - 3, 0, 6, 64); };
    pole(10); pole(32); pole(54);
    g.strokeStyle = 'rgba(60,52,20,0.4)'; g.lineWidth = 1; for (const x of [10, 32, 54]) for (let y = 4; y < 64; y += 9) { g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x + 3, y); g.stroke(); }
    g.strokeStyle = '#5c4a28'; g.lineWidth = 2.4;           // diagonal lashed cross-poles
    g.beginPath(); g.moveTo(4, 16); g.lineTo(60, 40); g.stroke();
    g.beginPath(); g.moveTo(4, 48); g.lineTo(60, 12); g.stroke();
    g.fillStyle = 'rgba(90,70,30,0.6)'; for (const [x, y] of [[10, 16], [32, 28], [54, 40], [10, 48], [32, 30], [54, 12]]) { g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill(); }  // rope lashings
    speck(g, 40, 'rgba(40,50,10,0.15)');
  });

  FLOOR.hongkongtile = cnv(g => {                         // colorful tenement mosaic — small square terrazzo chips
    vgrad(g, 0, 0, 64, 64, '#d8d0b8', '#b8ac8c');
    const cols = ['#c9242e', '#2a5f8a', '#d8a827', '#2a8a5c', '#5a3a7a'];
    for (let i = 0; i < 90; i++) { g.fillStyle = cols[(Math.random() * cols.length) | 0]; g.globalAlpha = 0.5 + Math.random() * 0.3; const x = Math.random() * 64, y = Math.random() * 64; g.fillRect(x, y, 2, 2); }
    g.globalAlpha = 1;
    g.strokeStyle = 'rgba(60,54,36,0.25)'; g.lineWidth = 1;
    for (let x = 0; x <= 64; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 64); g.stroke(); }
    for (let y = 0; y <= 64; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y); g.stroke(); }
    speck(g, 40, 'rgba(60,54,36,0.1)');
  });

  FLOOR.junkwood = cnv(g => {                             // weathered junk-boat deck planking, salt-bleached
    vgrad(g, 0, 0, 64, 64, '#b8a880', '#8a7c5a');
    g.strokeStyle = 'rgba(60,50,30,0.4)'; g.lineWidth = 1;
    for (let y = 0; y < 64; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y); g.stroke(); }
    g.strokeStyle = 'rgba(40,34,20,0.25)'; g.lineWidth = 0.6;
    for (let i = 0; i < 20; i++) { const x = Math.random() * 64, y0 = Math.random() * 64; g.beginPath(); g.moveTo(x, y0); g.lineTo(x + 1 + Math.random() * 3, y0 + 4 + Math.random() * 8); g.stroke(); }
    g.fillStyle = '#5c4a2a'; for (let ty = 0; ty < 8; ty++) for (let tx = 0; tx < 2; tx++) g.fillRect(tx * 30 + 8, ty * 8 + 3.5, 2, 1.4);  // caulked plank pegs
    stains(g, 5, ['#a89870', '#8a7a54']);
    speck(g, 45, 'rgba(60,50,30,0.12)'); speck(g, 20, 'rgba(255,250,230,0.08)');
  });

  FLOOR.tenementwall = cnv(g => {                         // dense Kowloon-style tenement facade, tiny windows + AC units
    vgrad(g, 0, 0, 64, 64, '#a8a090', '#7c7666');
    g.strokeStyle = 'rgba(30,28,20,0.3)'; g.lineWidth = 1;
    for (let x = 0; x <= 64; x += 10.6) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 64); g.stroke(); }
    for (let y = 0; y <= 64; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y); g.stroke(); }
    g.fillStyle = 'rgba(20,24,26,0.7)';                     // small dark windows
    for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 6; tx++) g.fillRect(tx * 10.6 + 2, ty * 16 + 3, 5, 6);
    g.fillStyle = 'rgba(150,155,150,0.6)';                  // AC unit boxes jutting from a few windows
    for (const [tx, ty] of [[1, 0], [3, 1], [0, 2], [4, 3], [2, 2]]) g.fillRect(tx * 10.6 + 2.5, ty * 16 + 9.5, 6, 3);
    stains(g, 6, ['#8a8272', '#6c6656']);
    speck(g, 55, 'rgba(30,28,18,0.14)'); speck(g, 20, 'rgba(255,250,230,0.05)');
  });

  // ---------------------------------------------------------------------------
  // HONG KONG, round 2 — a window behind a rusted security grille, bamboo
  // laundry poles hung with washing, a roll-down shopfront shutter, a wall
  // thick with tangled cable and pipe conduit.
  // ---------------------------------------------------------------------------
  FLOOR.hkgrillewindow = cnv(g => {                      // window behind a rusted diamond-mesh security grille
    vgrad(g, 0, 0, 64, 64, '#9c9484', '#726c5c');
    stains(g, 6, ['#847c68', '#645e4c']);
    speck(g, 45, 'rgba(30,28,18,0.1)');
    g.fillStyle = 'rgba(20,22,22,0.75)'; g.fillRect(10, 10, 44, 38);         // dark window recess
    const gl = g.createLinearGradient(12, 12, 52, 46);
    gl.addColorStop(0, '#3a4038'); gl.addColorStop(1, '#161a16');
    g.fillStyle = gl; g.fillRect(12, 12, 40, 34);
    g.strokeStyle = 'rgba(120,70,30,0.55)'; g.lineWidth = 1.6;              // rusty diamond-mesh grille
    for (let x = -8; x < 60; x += 8) { g.beginPath(); g.moveTo(x, 10); g.lineTo(x + 44, 48); g.stroke(); }
    for (let x = -8; x < 60; x += 8) { g.beginPath(); g.moveTo(x + 44, 10); g.lineTo(x, 48); g.stroke(); }
    g.strokeStyle = '#2a2622'; g.lineWidth = 2.4; g.strokeRect(10, 10, 44, 38); // frame
    g.fillStyle = 'rgba(150,155,148,0.6)'; g.fillRect(46, 24, 9, 5);        // AC unit box
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.6; g.strokeRect(46, 24, 9, 5);
    g.strokeStyle = 'rgba(60,60,55,0.5)'; g.lineWidth = 0.6;
    for (let x = 47; x < 54; x += 1.4) { g.beginPath(); g.moveTo(x, 25); g.lineTo(x, 28); g.stroke(); }
    speck(g, 25, 'rgba(255,255,255,0.05)');
  });

  FLOOR.hklaundrypole = cnv(g => {                        // tenement window, bamboo laundry poles + hung washing
    vgrad(g, 0, 0, 64, 64, '#a89e88', '#7c7460');
    stains(g, 5, ['#8a8268', '#6c6650']);
    g.fillStyle = 'rgba(20,22,22,0.7)'; g.fillRect(20, 6, 30, 30);
    const gl = g.createLinearGradient(22, 8, 48, 34);
    gl.addColorStop(0, '#3a423c'); gl.addColorStop(1, '#181c18');
    g.fillStyle = gl; g.fillRect(22, 8, 26, 26);
    g.strokeStyle = '#2a2622'; g.lineWidth = 2; g.strokeRect(20, 6, 30, 30);
    g.strokeStyle = '#c9b878'; g.lineWidth = 2; g.lineCap = 'round';        // bamboo poles jutting out
    g.beginPath(); g.moveTo(6, 20); g.lineTo(50, 12); g.stroke();
    g.beginPath(); g.moveTo(4, 34); g.lineTo(52, 26); g.stroke();
    const laundry = ['#c94848', '#3a7ab0', '#e0c840', '#e8e4d8', '#5a9c5c'];
    const hang = (px, py, w, h, col) => { g.fillStyle = col; g.fillRect(px, py, w, h); g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 0.6; g.strokeRect(px, py, w, h); };
    hang(10, 20, 8, 12, laundry[0]); hang(22, 16, 7, 10, laundry[1]); hang(34, 13, 6, 9, laundry[2]);
    hang(12, 34, 9, 13, laundry[3]); hang(26, 30, 7, 11, laundry[4]);
    speck(g, 40, 'rgba(30,28,18,0.1)');
    g.fillStyle = 'rgba(0,0,0,0.1)'; g.fillRect(0, 59, 64, 5);
  });

  FLOOR.hkrollshutter = cnv(g => {                        // ground-floor corrugated metal roll-down shopfront shutter
    vgrad(g, 0, 0, 64, 64, '#8a8478', '#5c584e');
    g.strokeStyle = 'rgba(20,18,14,0.4)'; g.lineWidth = 1;
    for (let y = 4; y < 64; y += 5) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.08)';
    for (let y = 4; y < 64; y += 5) g.fillRect(0, y - 1.6, 64, 1.4);        // corrugation highlight
    stains(g, 6, ['#6a6458', '#4c4840']);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 0, 64, 6);               // top housing box
    bevel(g, 0, 0, 64, 6, 'rgba(255,255,255,0.1)', 'rgba(0,0,0,0.4)');
    g.fillStyle = '#2a2622'; g.beginPath(); g.arc(32, 40, 2.4, 0, 7); g.fill(); // padlock hasp
    g.strokeStyle = '#2a2622'; g.lineWidth = 2; g.beginPath(); g.arc(32, 37, 2.6, Math.PI, 0); g.stroke();
    speck(g, 55, 'rgba(20,18,14,0.16)'); speck(g, 20, 'rgba(255,255,255,0.05)');
    bevel(g, 0, 0, 64, 64, 'rgba(255,255,255,0.06)', 'rgba(0,0,0,0.3)');
  });

  FLOOR.hkwireclutter = cnv(g => {                        // dense tangle of hanging cable + pipe conduit, walled-city wall
    vgrad(g, 0, 0, 64, 64, '#8c8674', '#605c4c');
    stains(g, 6, ['#726c5a', '#524e40']);
    speck(g, 55, 'rgba(20,18,14,0.14)');
    g.strokeStyle = 'rgba(30,28,22,0.6)'; g.lineWidth = 1.6;                // conduit pipes
    g.beginPath(); g.moveTo(6, 0); g.lineTo(6, 64); g.moveTo(6, 14); g.lineTo(20, 14); g.moveTo(20, 14); g.lineTo(20, 64); g.stroke();
    g.strokeStyle = 'rgba(20,18,14,0.5)'; g.lineWidth = 0.8;                // sagging cable bundles
    for (let i = 0; i < 6; i++) {
      const y0 = 4 + i * 10;
      g.beginPath(); g.moveTo(0, y0); g.quadraticCurveTo(32, y0 + 10 + (i % 3) * 3, 64, y0 - 2); g.stroke();
    }
    g.fillStyle = '#3a3830'; g.fillRect(44, 8, 10, 14);                     // junction box
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1; g.strokeRect(44, 8, 10, 14);
    speck(g, 30, 'rgba(255,255,255,0.04)');
  });

  // ---------------------------------------------------------------------------
  // MID-CENTURY SUBURBIA textures — pastel clapboard siding, a white picket
  // fence, shag carpet, checkerboard kitchen linoleum, dark walnut rec-room
  // paneling.
  // ---------------------------------------------------------------------------
  FLOOR.clapboard = cnv(g => {                          // horizontal wood clapboard siding, mint-green paint
    vgrad(g, 0, 0, 64, 64, '#a8d0b8', '#7ea892');
    g.strokeStyle = 'rgba(40,60,48,0.35)'; g.lineWidth = 1;
    for (let y = 6; y < 64; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.16)';
    for (let y = 0; y < 64; y += 8) g.fillRect(0, y, 64, 2);
    stains(g, 4, ['#5c8a70', '#4a7460']);
    speck(g, 40, 'rgba(30,45,35,0.1)'); speck(g, 25, 'rgba(255,255,255,0.08)');
    bevel(g, 0, 0, 64, 64, 'rgba(255,255,255,0.12)', 'rgba(20,30,24,0.25)');
  });

  FLOOR.picketfence = cnv(g => {                        // white picket fence, sky showing through the gaps
    vgrad(g, 0, 0, 64, 64, '#a8d0e0', '#7eb0cc');         // sky peeking between pickets
    const pw = 9;
    for (let x = 2; x < 64; x += pw) {
      let pg = g.createLinearGradient(x, 6, x + pw - 3, 60);
      pg.addColorStop(0, '#f4f0e4'); pg.addColorStop(1, '#c9c2ac');
      g.fillStyle = pg;
      g.beginPath(); g.moveTo(x, 14); g.lineTo(x + (pw - 3) / 2, 6); g.lineTo(x + pw - 3, 14); g.lineTo(x + pw - 3, 60); g.lineTo(x, 60); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(90,84,68,0.3)'; g.lineWidth = 0.8; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(x + 1, 16, 1.4, 40);
    }
    g.fillStyle = 'rgba(150,120,60,0.5)'; g.fillRect(0, 26, 64, 2); g.fillRect(0, 44, 64, 2);  // horizontal rails
    speck(g, 25, 'rgba(90,84,68,0.1)');
  });

  FLOOR.shagcarpet = cnv(g => {                          // avocado-green shag carpet, deep pile
    vgrad(g, 0, 0, 64, 64, '#8a9a4a', '#647232');
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * 64, y = Math.random() * 64, len = 3 + Math.random() * 4, a = Math.random() * 0.6 - 0.3;
      g.strokeStyle = `rgba(${100 + ((Math.random() * 40) | 0)},${120 + ((Math.random() * 30) | 0)},60,0.5)`;
      g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sin(a) * len, y - len); g.stroke();
    }
    speck(g, 50, 'rgba(30,38,15,0.12)');
  });

  FLOOR.linoleum = cnv(g => {                            // checkerboard kitchen linoleum, black/cream
    const sq = 16;
    for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 4; tx++) {
      g.fillStyle = (tx + ty) % 2 === 0 ? '#e8e0cc' : '#242220';
      g.fillRect(tx * sq, ty * sq, sq, sq);
    }
    g.fillStyle = 'rgba(255,255,255,0.12)';
    for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 4; tx++) if ((tx + ty) % 2 === 0) g.fillRect(tx * sq + 1, ty * sq + 1, sq - 2, 3);
    g.strokeStyle = 'rgba(0,0,0,0.15)'; g.lineWidth = 0.6;
    for (let x = 0; x <= 64; x += sq) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 64); g.stroke(); }
    for (let y = 0; y <= 64; y += sq) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y); g.stroke(); }
    speck(g, 30, 'rgba(0,0,0,0.06)');
  });

  FLOOR.woodpaneling = cnv(g => {                        // dark walnut rec-room wall paneling, routed grooves
    vgrad(g, 0, 0, 64, 64, '#6a4a2c', '#3e2c18');
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1.4;
    for (let x = 16; x < 64; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 64); g.stroke(); }
    g.strokeStyle = 'rgba(0,0,0,0.14)'; g.lineWidth = 0.6;
    for (let i = 0; i < 30; i++) { const x = Math.random() * 64, y0 = Math.random() * 64; g.beginPath(); g.moveTo(x, y0); g.lineTo(x + 1 + Math.random() * 3, y0 + 6 + Math.random() * 10); g.stroke(); }  // wood grain
    g.fillStyle = 'rgba(255,230,190,0.08)';
    for (let x = 0; x < 64; x += 16) g.fillRect(x + 1, 0, 3, 64);
    speck(g, 35, 'rgba(0,0,0,0.12)');
    bevel(g, 0, 0, 64, 64, 'rgba(255,220,170,0.08)', 'rgba(0,0,0,0.3)');
  });

  // ---------------------------------------------------------------------------
  // SOVIET RUSSIA textures — brutalist precast concrete, a red propaganda
  // banner, colorful onion-dome mosaic tile, herringbone parquet, a socialist-
  // realist mural.
  // ---------------------------------------------------------------------------
  FLOOR.concreteblock = cnv(g => {                      // precast concrete apartment-block panel, seams + streaking
    vgrad(g, 0, 0, 64, 64, '#9a9a92', '#767468');
    g.strokeStyle = 'rgba(40,40,36,0.4)'; g.lineWidth = 1.6;
    g.strokeRect(2, 2, 60, 60);
    g.strokeStyle = 'rgba(40,40,36,0.25)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(32, 2); g.lineTo(32, 62); g.stroke();
    g.fillStyle = 'rgba(30,30,28,0.18)';                  // rain streaking below seams
    for (let i = 0; i < 8; i++) { const x = 4 + Math.random() * 56; g.fillRect(x, 2, 1, 20 + Math.random() * 30); }
    g.fillStyle = 'rgba(255,255,255,0.06)';
    g.fillRect(4, 4, 56, 3);
    stains(g, 6, ['#6a6a60', '#565650']);
    speck(g, 70, 'rgba(20,20,18,0.12)'); speck(g, 30, 'rgba(255,255,255,0.05)');
  });

  FLOOR.redbanner = cnv(g => {                          // red propaganda banner, gold star + rays
    vgrad(g, 0, 0, 64, 64, '#c9242e', '#8a141c');
    g.fillStyle = '#d8a827';
    const star5 = (cx, cy, r) => {
      g.beginPath();
      for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283 - Math.PI / 2, rr = i % 2 === 0 ? r : r * 0.42; const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr; i ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.closePath(); g.fill();
    };
    star5(32, 24, 12);
    g.strokeStyle = 'rgba(216,168,39,0.35)'; g.lineWidth = 1.2;        // rays fanning from the star
    for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283; g.beginPath(); g.moveTo(32, 24); g.lineTo(32 + Math.cos(a) * 30, 24 + Math.sin(a) * 30); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(0, 46, 64, 18);       // banner fold shadow lower band
    g.fillStyle = 'rgba(216,168,39,0.5)'; g.fillRect(0, 50, 64, 1.4); g.fillRect(0, 58, 64, 1.4);
    speck(g, 40, 'rgba(0,0,0,0.1)');
  });

  FLOOR.domemosaic = cnv(g => {                         // colorful onion-dome mosaic tile — reds, blues, gold
    vgrad(g, 0, 0, 64, 64, '#2a5f8a', '#1c3f5c');
    const scale = (cx, cy, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(cx, cy, r, Math.PI, 0); g.fill(); };
    const cols = ['#c9242e', '#d8a827', '#2a8a5c', '#e8e4d8'];
    for (let ty = 0; ty < 5; ty++) for (let tx = 0; tx < 4; tx++) { scale(tx * 16 + ((ty % 2) * 8), ty * 13, 8, cols[(tx + ty) % 4]); }
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.8;
    for (let ty = 0; ty < 5; ty++) for (let tx = 0; tx < 4; tx++) { g.beginPath(); g.arc(tx * 16 + ((ty % 2) * 8), ty * 13, 8, Math.PI, 0); g.stroke(); }
    speck(g, 30, 'rgba(255,255,255,0.06)');
  });

  FLOOR.parquet = cnv(g => {                            // herringbone wood parquet floor
    const plank = (x, y, rot, col) => { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = col; g.fillRect(-8, -3, 16, 6); g.strokeStyle = 'rgba(60,40,18,0.4)'; g.lineWidth = 0.6; g.strokeRect(-8, -3, 16, 6); g.restore(); };
    const cols = ['#a8794a', '#98693e', '#b8895a'];
    let i = 0;
    for (let ty = -1; ty < 6; ty++) for (let tx = -1; tx < 6; tx++) {
      const x = tx * 11 + (ty % 2) * 5.5, y = ty * 11;
      plank(x, y, (tx + ty) % 2 === 0 ? 0.785 : -0.785, cols[i++ % 3]);
    }
    speck(g, 35, 'rgba(60,40,18,0.08)');
    bevel(g, 0, 0, 64, 64, 'rgba(255,230,190,0.08)', 'rgba(0,0,0,0.25)');
  });

  FLOOR.muralsoviet = cnv(g => {                        // socialist-realist mural — worker silhouettes + red banner
    vgrad(g, 0, 0, 64, 64, '#c9c4a8', '#a8a284');
    g.fillStyle = '#3a3a34';                             // worker silhouette, hammer raised
    g.beginPath(); g.ellipse(20, 20, 5, 6, 0, 0, 7); g.fill();
    g.fillRect(15, 26, 10, 24);
    g.save(); g.translate(26, 20); g.rotate(-0.6); g.fillRect(-2, -14, 4, 16); g.fillRect(-5, -18, 10, 4); g.restore();  // raised arm + hammer
    g.fillStyle = '#2a2a26';                             // a second figure, striding
    g.beginPath(); g.ellipse(42, 22, 4.6, 5.6, 0, 0, 7); g.fill();
    g.beginPath(); g.moveTo(36, 46); g.lineTo(38, 27); g.lineTo(46, 27); g.lineTo(50, 46); g.closePath(); g.fill();
    g.fillStyle = '#c9242e'; g.fillRect(0, 48, 64, 12);   // red banner strip along the base
    g.fillStyle = 'rgba(216,168,39,0.7)'; g.fillRect(0, 52, 64, 1.6);
    speck(g, 40, 'rgba(40,36,20,0.1)');
  });

  // ---------------------------------------------------------------------------
  // DEALEY PLAZA 1963 textures — downtown Dallas civic architecture: red-brick
  // warehouse facade, pale poured-concrete colonnade, mown park lawn, city
  // asphalt with lane paint, concrete sidewalk slabs.
  // ---------------------------------------------------------------------------
  FLOOR.warehousebrick = cnv(g => {                     // aged red-brick warehouse facade, soot-streaked
    vgrad(g, 0, 0, 64, 64, '#9a4030', '#6e2c20');
    g.strokeStyle = 'rgba(30,15,10,0.4)'; g.lineWidth = 1;
    for (let ty = 0; ty < 8; ty++) {
      const y = ty * 8, off = (ty % 2) * 8;
      g.beginPath(); g.moveTo(0, y); g.lineTo(64, y); g.stroke();
      for (let x = -8 + off; x < 64; x += 16) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 8); g.stroke(); }
    }
    g.fillStyle = 'rgba(60,26,18,0.2)'; for (let i = 0; i < 6; i++) { const x = 4 + Math.random() * 56; g.fillRect(x, 0, 2, 20 + Math.random() * 30); }  // soot streaking
    g.fillStyle = 'rgba(255,220,200,0.08)';
    for (let ty = 0; ty < 8; ty++) for (let tx = 0; tx < 4; tx++) g.fillRect(tx * 16 + 1, ty * 8 + 1, 6, 2);
    speck(g, 55, 'rgba(20,10,5,0.14)'); speck(g, 25, 'rgba(255,230,210,0.06)');
    bevel(g, 0, 0, 64, 64, 'rgba(255,220,200,0.08)', 'rgba(20,8,5,0.3)');
  });

  FLOOR.concretepergola = cnv(g => {                    // pale poured-concrete colonnade, fluted columns
    vgrad(g, 0, 0, 64, 64, '#d8d0be', '#b0a894');
    g.strokeStyle = 'rgba(90,82,65,0.3)'; g.lineWidth = 1;
    for (let x = 0; x < 64; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 64); g.stroke(); }
    g.fillStyle = 'rgba(255,252,240,0.14)';
    for (let x = 2; x < 64; x += 8) g.fillRect(x, 0, 3, 64);
    g.strokeStyle = 'rgba(60,54,40,0.25)'; g.lineWidth = 1.2;          // horizontal expansion joints
    g.beginPath(); g.moveTo(0, 20); g.lineTo(64, 20); g.stroke();
    g.beginPath(); g.moveTo(0, 44); g.lineTo(64, 44); g.stroke();
    stains(g, 5, ['#a89c84', '#8a7e68']);
    speck(g, 45, 'rgba(60,52,38,0.1)'); speck(g, 25, 'rgba(255,252,240,0.06)');
  });

  FLOOR.lawngrass = cnv(g => {                          // mown civic park lawn, well-kept
    vgrad(g, 0, 0, 64, 64, '#5c8a42', '#3e6a2c');
    g.strokeStyle = 'rgba(90,130,60,0.3)'; g.lineWidth = 1;
    for (let y = 4; y < 64; y += 7) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y); g.stroke(); }  // mowing stripes
    g.fillStyle = 'rgba(255,255,255,0.05)'; for (let y = 0; y < 64; y += 14) g.fillRect(0, y, 64, 3);
    g.fillStyle = 'rgba(30,50,20,0.18)'; for (let i = 0; i < 30; i++) g.fillRect((Math.random() * 64) | 0, (Math.random() * 64) | 0, 1, 2);
    speck(g, 45, 'rgba(20,40,10,0.1)'); speck(g, 25, 'rgba(200,230,150,0.08)');
  });

  FLOOR.roadway = cnv(g => {                            // city asphalt, faded yellow lane paint
    vgrad(g, 0, 0, 64, 64, '#3a3a38', '#242422');
    g.fillStyle = 'rgba(216,180,60,0.75)'; g.fillRect(0, 30, 64, 3);   // dashed centre line
    g.fillStyle = '#242422'; g.fillRect(20, 30, 10, 3); g.fillRect(50, 30, 14, 3);
    g.fillStyle = 'rgba(0,0,0,0.2)'; for (let i = 0; i < 10; i++) g.fillRect((Math.random() * 64) | 0, (Math.random() * 64) | 0, 3, 1);   // tar patches
    speck(g, 90, 'rgba(0,0,0,0.15)'); speck(g, 35, 'rgba(255,255,255,0.05)');
  });

  FLOOR.sidewalk = cnv(g => {                           // concrete sidewalk slabs, expansion joints
    vgrad(g, 0, 0, 64, 64, '#b8b4a4', '#98947e');
    g.strokeStyle = 'rgba(60,56,42,0.35)'; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(0, 32); g.lineTo(64, 32); g.stroke();
    g.beginPath(); g.moveTo(32, 0); g.lineTo(32, 64); g.stroke();
    g.strokeStyle = 'rgba(60,56,42,0.15)'; g.lineWidth = 0.6;
    for (let i = 0; i < 10; i++) { const x0 = Math.random() * 64, y0 = Math.random() * 64; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + Math.random() * 8 - 4, y0 + Math.random() * 8 - 4); g.stroke(); }  // hairline cracks
    stains(g, 5, ['#8a8672', '#76725e']);
    speck(g, 50, 'rgba(50,46,34,0.1)');
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

  // ---- a second parallax sky, selectable per sector: a Paris night ----
  const SKY_PARISNIGHT = cnv(g => {
    const grd = g.createLinearGradient(0, 0, 0, 96);
    grd.addColorStop(0, '#0a1024'); grd.addColorStop(0.55, '#182c4a'); grd.addColorStop(0.8, '#3a4a68'); grd.addColorStop(1, '#5c6478');
    g.fillStyle = grd; g.fillRect(0, 0, 256, 96);
    g.fillStyle = 'rgba(240,238,220,0.95)';            // crescent moon
    g.beginPath(); g.arc(210, 18, 9, 0, 7); g.fill();
    g.fillStyle = grd; g.beginPath(); g.arc(214, 15, 8, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)';            // stars, scattered above the rooftop line
    for (let i = 0; i < 70; i++) { const x = Math.random() * 256, y = Math.random() * 55; g.globalAlpha = 0.3 + Math.random() * 0.6; g.fillRect(x, y, 1, 1); }
    g.globalAlpha = 1;
    // Haussmann rooftop skyline along the horizon, warm windows lit
    g.fillStyle = '#12182a'; for (let x = 0; x <= 256; x += 8) { const h = 62 + ((x * 5) % 9) - (x % 32 === 0 ? 6 : 0); g.fillRect(x, h, 8, 96 - h); }
    g.fillStyle = 'rgba(255,214,140,0.55)';
    for (let i = 0; i < 24; i++) { const x = (Math.random() * 256) | 0, y = 68 + ((Math.random() * 22) | 0); g.fillRect(x, y, 2, 2); }
    // a distant Eiffel Tower silhouette — one continuous tapered outline: splayed
    // legs → first platform → tapered shaft → second platform → spire
    g.fillStyle = '#0a0e1c';
    g.beginPath();
    g.moveTo(86, 63); g.lineTo(95, 46); g.lineTo(94, 46); g.lineTo(98, 32); g.lineTo(97.3, 32);
    g.lineTo(99.5, 18); g.lineTo(100, 11);                                    // up the left leg to the spire tip
    g.lineTo(100.5, 18); g.lineTo(102.7, 32); g.lineTo(102, 32); g.lineTo(106, 46); g.lineTo(105, 46);
    g.lineTo(114, 63);                                                        // down the right leg
    g.closePath(); g.fill();
    g.fillRect(88, 62, 24, 2.4);                                              // base platform bar
    g.strokeStyle = '#0a0e1c'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(93.5, 46); g.lineTo(106.5, 46); g.stroke();       // first platform
    g.beginPath(); g.moveTo(96.8, 32); g.lineTo(103.2, 32); g.stroke();       // second platform
    g.fillStyle = 'rgba(255,214,140,0.55)'; g.fillRect(96.5, 47, 1, 1); g.fillRect(101.5, 47, 1, 1); g.fillRect(99.5, 34, 1, 1);
  }, 256, 96);

  // ---- a third parallax sky: Manhattan skyline by day, 1964 ----
  const SKY_NYCDAY = cnv(g => {
    const grd = g.createLinearGradient(0, 0, 0, 96);
    grd.addColorStop(0, '#3f7fc0'); grd.addColorStop(0.6, '#8fbfe0'); grd.addColorStop(1, '#d8e8ec');
    g.fillStyle = grd; g.fillRect(0, 0, 256, 96);
    g.fillStyle = 'rgba(255,255,255,0.35)';               // scattered fair-weather clouds
    [[40, 16, 16], [140, 12, 20], [200, 22, 14], [90, 26, 12]].forEach(([x, y, r]) => {
      g.beginPath(); g.arc(x, y, r, 0, 7); g.arc(x + r, y + 3, r * 0.7, 0, 7); g.arc(x - r, y + 4, r * 0.6, 0, 7); g.fill();
    });
    // block skyline along the horizon, mixed heights
    g.fillStyle = '#3a4048';
    for (let x = 0; x <= 256; x += 9) { const h = 60 + ((x * 6) % 13) - (x % 45 === 0 ? 8 : 0); g.fillRect(x, h, 9, 96 - h); }
    g.fillStyle = 'rgba(255,255,255,0.08)';
    for (let x = 3; x <= 256; x += 9) g.fillRect(x, 40, 2, 40);              // window columns
    // the Empire State Building — stepped setbacks, tapered spire, antenna mast
    g.fillStyle = '#2c3038';
    g.fillRect(94, 46, 20, 22);
    g.fillRect(98, 38, 12, 8);
    g.fillRect(101, 30, 6, 8);
    g.beginPath(); g.moveTo(102, 30); g.lineTo(106, 30); g.lineTo(104.5, 18); g.lineTo(103.5, 18); g.closePath(); g.fill();
    g.fillRect(103.6, 10, 0.8, 8);                                          // antenna mast
    g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(96, 48, 2, 18); g.fillRect(115.5, 48, 1.5, 18);
    // the Chrysler Building — terraced arched crown, a period-correct silhouette neighbour
    g.fillStyle = '#3a3428';
    g.fillRect(130, 50, 14, 18);
    for (let i = 0; i < 5; i++) { const w2 = 14 - i * 2.4, x0 = 130 + i * 1.2, y0 = 50 - i * 5; g.fillRect(x0, y0, w2, 5); }
    g.beginPath(); g.moveTo(133.5, 25); g.lineTo(140.5, 25); g.lineTo(137, 12); g.closePath(); g.fill();  // the spire point
    g.fillRect(136.6, 6, 0.8, 7);
    g.fillStyle = 'rgba(255,255,255,0.15)';
    for (let i = 0; i < 5; i++) { const y0 = 50 - i * 5; g.beginPath(); g.arc(137, y0 + 2, 1.6, Math.PI, 0); g.fill(); }  // sunburst arches
    speck(g, 20, 'rgba(255,255,255,0.06)');
  }, 256, 96);

  // ---- a fourth parallax sky: a plain starry night, no skyline ----
  const SKY_STARRYNIGHT = cnv(g => {
    const grd = g.createLinearGradient(0, 0, 0, 96);
    grd.addColorStop(0, '#050810'); grd.addColorStop(0.6, '#0c1428'); grd.addColorStop(1, '#182238');
    g.fillStyle = grd; g.fillRect(0, 0, 256, 96);
    g.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 140; i++) { const x = Math.random() * 256, y = Math.random() * 96; g.globalAlpha = 0.25 + Math.random() * 0.65; g.fillRect(x, y, 1, 1); }
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(255,255,255,0.6)';                // a few brighter stars
    for (let i = 0; i < 12; i++) { const x = (Math.random() * 256) | 0, y = (Math.random() * 96) | 0; g.fillRect(x, y, 1, 1); g.fillRect(x - 1, y, 1, 1); g.fillRect(x + 1, y, 1, 1); g.fillRect(x, y - 1, 1, 1); g.fillRect(x, y + 1, 1, 1); }
  }, 256, 96);

  const SKIES = { havana: SKY, parisnight: SKY_PARISNIGHT, nycday: SKY_NYCDAY, starrynight: SKY_STARRYNIGHT };
  const SKYNAMES = ['havana', 'parisnight', 'nycday', 'starrynight'];

  // ---- unified texture registry (name → canvas): walls + all surfaces ----
  // Every texture is assignable to any floor, ceiling, or wall in the editor.
  const TX = Object.assign({
    teak: TEX[T.TEAK], lair: TEX[T.LAIR], radio: TEX[T.RADIO],
    blast: TEX[T.EXIT], mainframe: TEX[T.MAINFRAME], poster: TEX[T.POSTER],
  }, FLOOR);
  // realism pass: fine per-texel grain over every texture — flat vector fills
  // read as plastic; a whisper of noise reads as material. Water stays clean.
  for (const n of Object.keys(TX)) {
    if (n === 'water' || n === 'pond') continue;
    const c = TX[n], gt = c.getContext('2d');
    speck(gt, 80, 'rgba(0,0,0,0.05)', c.width, c.height);
    speck(gt, 55, 'rgba(255,246,220,0.04)', c.width, c.height);
  }
  // ordered list the editor shows as a palette
  const TXNAMES = ['lair', 'teak', 'brick', 'stucco', 'stuccob', 'stuccop', 'panel', 'tile',
    'cobble', 'wood', 'marble', 'concrete', 'water', 'metal', 'vent', 'carpet', 'lounge',
    'ceiltile', 'ground', 'helipad', 'rattan', 'azulejo', 'cork', 'corrugated', 'awning', 'limestone',
    'terrazzo', 'rooftile', 'mural', 'sandbag', 'rope', 'windowrow', 'balconywin', 'shopfront',
    'doorwood', 'doorarch', 'doubledoor', 'windowbars', 'windowshut',
    'rockwall', 'mossyrock', 'pond', 'wetstone',
    'sandstone', 'zellige', 'mashrabiya', 'kilim', 'sandfloor',
    'haussmann', 'wroughtiron', 'opart', 'toile', 'zincroof',
    'cafeawning', 'riverstone', 'gildedceiling', 'bouquiniste',
    'haussmannwindow', 'mansardwindow', 'parisshutters', 'parisshopfront',
    'subwaytile', 'brownstone', 'delitile', 'skyscraperglass', 'marquee',
    'neonsign', 'bambooscaffold', 'hongkongtile', 'junkwood', 'tenementwall',
    'hkgrillewindow', 'hklaundrypole', 'hkrollshutter', 'hkwireclutter',
    'clapboard', 'picketfence', 'shagcarpet', 'linoleum', 'woodpaneling',
    'concreteblock', 'redbanner', 'domemosaic', 'parquet', 'muralsoviet',
    'warehousebrick', 'concretepergola', 'lawngrass', 'roadway', 'sidewalk',
    'radio', 'blast', 'mainframe', 'poster'];
  const WALLTX = { 1: 'teak', 2: 'lair', 3: 'blast', 4: 'radio', 5: 'mainframe', 6: 'poster' };
  const wallTexName = (x, y) => {
    const i = Math.floor(y) * MW + Math.floor(x);
    return (stexg && stexg[i]) || WALLTX[get(x, y)] || 'brick';
  };
  const wallTex = (x, y) => TX[wallTexName(x, y)] || TX.brick;

  // ---- sprites ----
  function whiteOf(src) {
    const w = src.width, h = src.height;                    // size from the source, not a hardcoded 64 — shipped
    return cnv(g => {                                         // character art can be a much bigger canvas than that
      g.drawImage(src, 0, 0, w, h);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    }, w, h);
  }
  // retro grit: per-pixel grain plus a whisper of vertical light falloff, applied
  // to every finished sprite. Flat vector fills read as paper-cutout ("South
  // Park"); the same shapes with sensor-noise texture read as a digitized 90s
  // Build-engine sprite. Only opaque pixels are touched, so outlines stay crisp.
  function grit(c, w, h) {
    const g = c.getContext('2d');
    const d = g.getImageData(0, 0, w, h), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      if (p[i + 3] < 10) continue;
      const n = (Math.random() - 0.5) * 13;
      const v = 1 - (((i >> 2) / w | 0) / h) * 0.05;
      p[i] = Math.min(255, Math.max(0, p[i] * v + n));
      p[i + 1] = Math.min(255, Math.max(0, p[i + 1] * v + n));
      p[i + 2] = Math.min(255, Math.max(0, p[i + 2] * v + n));
    }
    g.putImageData(d, 0, 0);
    return c;
  }
  // draw with a crisp 1px dark outline so the sprite reads against any texture
  function outlined(drawFn, w = 64, h = 64) {
    const base = cnv(drawFn, w, h);
    const sil = cnv(gg => { gg.drawImage(base, 0, 0); gg.globalCompositeOperation = 'source-in'; gg.fillStyle = '#100c0a'; gg.fillRect(0, 0, w, h); }, w, h);
    return grit(cnv(g => {
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) g.drawImage(sil, dx, dy);
      g.drawImage(base, 0, 0);
    }, w, h), w, h);
  }

  const SPR = {};

  // a generic "little explosion" effect for a destroyed plain prop: a quick 3-frame
  // burst (bright core → wide flash+rays → fading smoke puff), picked by elapsed
  // time on the transient fx entity. No bespoke broken-object art needed per kind
  // — the prop itself is removed on death, this just sells the moment.
  const FX_LIFE = 0.32;
  SPR.fxBurst1 = cnv(g => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 12);
    gr.addColorStop(0, 'rgba(255,255,235,0.95)'); gr.addColorStop(0.5, 'rgba(255,190,80,0.85)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 12, 0, 7); g.fill();
  });
  SPR.fxBurst2 = cnv(g => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 22);
    gr.addColorStop(0, 'rgba(255,250,220,0.9)'); gr.addColorStop(0.4, 'rgba(255,160,60,0.75)'); gr.addColorStop(0.75, 'rgba(200,70,30,0.4)'); gr.addColorStop(1, 'rgba(120,40,20,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 22, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,220,140,0.6)'; g.lineWidth = 1.4;
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283, r1 = 10, r2 = 24 + Math.random() * 6;
      g.beginPath(); g.moveTo(32 + Math.cos(a) * r1, 32 + Math.sin(a) * r1); g.lineTo(32 + Math.cos(a) * r2, 32 + Math.sin(a) * r2); g.stroke(); }
  });
  SPR.fxBurst3 = cnv(g => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 26);
    gr.addColorStop(0, 'rgba(120,110,100,0.45)'); gr.addColorStop(0.6, 'rgba(70,64,58,0.3)'); gr.addColorStop(1, 'rgba(40,36,32,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 26, 0, 7); g.fill();
    speck(g, 16, 'rgba(255,150,60,0.35)');
  });
  function spawnFx(x, y) {
    const e = { kind: 'fx', name: '', x, y, solid: false, scale: 0.9, hp: null, dead: false, flash: 0, t: 0,
      getTex() { return this.t < 0.08 ? SPR.fxBurst1 : this.t < 0.18 ? SPR.fxBurst2 : SPR.fxBurst3; } };
    ents.push(e);
    return e;
  }

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
    g.fillStyle = 'rgba(255,220,170,0.3)';                                    // chest highlight
    g.beginPath(); g.ellipse(27.5, 26, 3.5, 6, 0.2, 0, 7); g.fill();
    g.strokeStyle = 'rgba(200,225,255,0.4)'; g.lineWidth = 2;                  // cool rim light, far shoulder edge
    g.beginPath(); g.moveTo(41, 22); g.quadraticCurveTo(40.5, 30, 39, 39); g.stroke();
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
    g.strokeStyle = 'rgba(200,225,255,0.4)'; g.lineWidth = 2.2;                 // cool rim light, far side of the torso
    g.beginPath(); g.moveTo(44.5, 25); g.quadraticCurveTo(44, 32, 42, 39.5); g.stroke();
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
    g.strokeStyle = 'rgba(200,225,255,0.4)'; g.lineWidth = 1.9;                  // cool rim light, far shoulder edge
    g.beginPath(); g.moveTo(40.5, 30); g.quadraticCurveTo(40, 36, 38, 40.5); g.stroke();
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
  // ---------------------------------------------------------------------------
  // Shared realistic humanoid builder — the same Doom-sprite proportions as the
  // combat sprites (head ≈ 1/5 of the figure, jointed limbs, tapered torso, one
  // upper-left key light). Every civilian/NPC below rides this one skeleton and
  // only describes what makes them THEM: garment palette, arm pose, hair/hat,
  // held props. Keeping all bodies on one skeleton is what retires the old
  // big-head paper-cutout look for good.
  // ---------------------------------------------------------------------------
  function person(g, o) {
    const [skL, skM, skD] = o.skin || ['#e8b98a', '#c08a5e', '#8f5f3c'];
    const sw = o.shoulderW || 1;
    const tLen = o.torsoLen || 40;                                     // jacket/coat hem (40 = tucked at the waist)
    g.fillStyle = 'rgba(0,0,0,0.32)'; g.beginPath(); g.ellipse(32, 62, 12, 2.8, 0, 0, 7); g.fill();
    if (o.skirt) {                                                     // full skirt: bare calves under it
      g.fillStyle = skM; g.fillRect(27.6, 49, 3.6, 9.5);
      g.fillStyle = skD; g.fillRect(33, 49, 3.6, 9.5);
      const shs = o.shoes || ['#3a2f22', '#181209'];
      g.fillStyle = shs[0]; g.fillRect(26.4, 57.5, 5.6, 5); g.fillRect(32.6, 57.5, 5.6, 5);
      g.fillStyle = shs[1]; g.fillRect(26, 61.4, 6.4, 1.4); g.fillRect(32.4, 61.4, 6.4, 1.4);
      const sg = g.createLinearGradient(20, 36, 44, 55);
      sg.addColorStop(0, o.skirt[0]); sg.addColorStop(0.5, o.skirt[1]); sg.addColorStop(1, o.skirt[2]);
      g.fillStyle = sg;
      if (o.skirtFn) o.skirtFn(g);
      else { g.beginPath(); g.moveTo(25.5, 36); g.lineTo(38.5, 36); g.lineTo(42, 54); g.lineTo(22, 54); g.closePath(); g.fill(); }
      g.fillStyle = 'rgba(0,0,0,0.2)';                                 // skirt core shadow, right side
      g.beginPath(); g.moveTo(36, 36.5); g.lineTo(40.5, 53.5); g.lineTo(37, 53.5); g.lineTo(33.5, 36.5); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 0.8;           // hanging folds
      g.beginPath(); g.moveTo(28, 38); g.lineTo(26.5, 53); g.moveTo(32.5, 38); g.lineTo(32.5, 53); g.stroke();
    } else {
      const tr = o.trousers || ['#42454e', '#31333b', '#202228'];
      const shortsEnd = o.shorts ? 48 : 56;                            // shorts stop at the knee, skin below
      const lg = g.createLinearGradient(24, 0, 40, 0);
      lg.addColorStop(0, tr[0]); lg.addColorStop(0.55, tr[1]); lg.addColorStop(1, tr[2] || tr[1]);
      g.fillStyle = lg;
      g.beginPath(); g.moveTo(26.5, 38); g.lineTo(31.5, 38); g.lineTo(30.5, shortsEnd); g.lineTo(26, shortsEnd); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(32.5, 38); g.lineTo(37.5, 38); g.lineTo(38, shortsEnd); g.lineTo(33.5, shortsEnd); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(27.2, 39, 1, shortsEnd - 41); g.fillRect(34, 39, 1, shortsEnd - 41);
      if (o.shorts) {                                                  // bare shins down to the footwear
        g.fillStyle = skM; g.fillRect(27.2, 48, 3.6, 9);
        g.fillStyle = skD; g.fillRect(33.8, 48, 3.6, 9);
      } else {
        g.strokeStyle = 'rgba(0,0,0,0.28)'; g.lineWidth = 1;           // knee creases
        g.beginPath(); g.moveTo(27, 47); g.lineTo(30.5, 47.4); g.stroke();
        g.beginPath(); g.moveTo(34, 47.6); g.lineTo(37.5, 47.2); g.stroke();
      }
      const shs = o.shoes || ['#2c2620', '#0d0b09'];
      const sg = g.createLinearGradient(0, 55, 0, 63);
      sg.addColorStop(0, shs[0]); sg.addColorStop(1, shs[1]);
      g.fillStyle = sg; g.fillRect(25, 55.5, 6.6, 7); g.fillRect(33.2, 55.5, 6.6, 7);
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(25.4, 56, 5.8, 1); g.fillRect(33.6, 56, 5.8, 1);
      g.fillStyle = '#000'; g.fillRect(24.6, 61.5, 7.4, 1.5); g.fillRect(33, 61.5, 7.4, 1.5);
    }
    // ---- torso: shoulders tapering to the waist (or flaring to a jacket hem) ----
    const t = o.torso;
    const tg = g.createLinearGradient(20, 18, 44, tLen);
    tg.addColorStop(0, t[0]); tg.addColorStop(0.4, t[1]); tg.addColorStop(1, t[2]);
    g.fillStyle = tg;
    const hemW = tLen > 40 ? 8 : 7;                                    // longer coats flare a little
    g.beginPath();
    g.moveTo(32 - 10 * sw, 21); g.quadraticCurveTo(32, 17.5, 32 + 10 * sw, 21);
    g.lineTo(32 + 9 * sw, 34); g.quadraticCurveTo(32 + 8.5 * sw, (34 + tLen) / 2, 32 + hemW * sw, tLen);
    g.lineTo(32 - hemW * sw, tLen); g.quadraticCurveTo(32 - 8.5 * sw, (34 + tLen) / 2, 32 - 9 * sw, 34);
    g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.34)';                                  // core shadow, right side (deeper for real volume)
    g.beginPath(); g.moveTo(32 + 6 * sw, 21); g.quadraticCurveTo(32 + 9.5 * sw, (21 + tLen) / 2, 32 + (hemW - 1) * sw, tLen);
    g.lineTo(32 + 3 * sw, tLen); g.quadraticCurveTo(32 + 5 * sw, (21 + tLen) / 2, 32 + 3.5 * sw, 21.5); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.24)';                            // chest highlight (key light, near/left side)
    g.beginPath(); g.ellipse(32 - 4.5 * sw, 26, 3.4, 5.6, 0.2, 0, 7); g.fill();
    g.strokeStyle = 'rgba(200,225,255,0.4)'; g.lineWidth = 2;          // cool rim light, far/right silhouette edge
    g.beginPath(); g.moveTo(32 + 8.7 * sw, 22.5); g.quadraticCurveTo(32 + 8.2 * sw, (22 + tLen) / 2, 32 + (hemW - 0.4) * sw, tLen - 1.5); g.stroke();
    if (o.chest) o.chest(g);
    // ---- arms: stroked polylines with round joints; hands at the ends ----
    const bare = o.sleeve === 'skin';
    const sl = bare ? [skM, skD] : o.sleeve || [t[1], t[2]];
    const armL = o.armL || [[23, 22.5], [20.5, 29.5], [22, 36]];
    const armR = o.armR || [[41, 22.5], [43.5, 29.5], [42, 36]];
    g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = o.armW || 4.6;
    g.strokeStyle = sl[0]; g.beginPath(); g.moveTo(armL[0][0], armL[0][1]); for (let i = 1; i < armL.length; i++) g.lineTo(armL[i][0], armL[i][1]); g.stroke();
    g.strokeStyle = sl[1]; g.beginPath(); g.moveTo(armR[0][0], armR[0][1]); for (let i = 1; i < armR.length; i++) g.lineTo(armR[i][0], armR[i][1]); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 1.5;        // lit edge on the near arm
    g.beginPath(); g.moveTo(armL[0][0] - 0.5, armL[0][1] + 0.5); g.lineTo(armL[1][0] - 0.5, armL[1][1]); g.stroke();
    g.strokeStyle = 'rgba(200,225,255,0.3)'; g.lineWidth = 1.4;        // cool rim on the far arm
    g.beginPath(); g.moveTo(armR[0][0] + 0.5, armR[0][1] + 0.5); g.lineTo(armR[1][0] + 0.5, armR[1][1]); g.stroke();
    const hL = o.handL || armL[armL.length - 1], hR = o.handR || armR[armR.length - 1];
    g.fillStyle = skM; g.beginPath(); g.arc(hL[0], hL[1], 2.4, 0, 7); g.fill();
    g.fillStyle = skD; g.beginPath(); g.arc(hR[0], hR[1], 2.4, 0, 7); g.fill();
    // ---- neck + head (radial-lit, jaw shade, ear) — optionally turned ----
    if (o.headTurn) { g.save(); g.translate(32, 12); g.rotate(o.headTurn); g.translate(-32, -12); }
    g.fillStyle = skD; g.fillRect(29.6, 14.5, 4.8, 4.4);
    const hr = o.headR || [5, 5.6];
    const rg = g.createRadialGradient(29.5, 9, 1.5, 32, 11, 7);
    rg.addColorStop(0, skL); rg.addColorStop(0.4, skM); rg.addColorStop(0.75, skD); rg.addColorStop(1, skD);
    g.fillStyle = rg; g.beginPath(); g.ellipse(32, 11, hr[0], hr[1], 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(50,25,10,0.45)';                               // jaw shading, deeper for a real sculpted look
    g.beginPath(); g.ellipse(33.5, 13.4, 3.3, 2.1, -0.15, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,248,232,0.4)';                             // temple/cheekbone rim, opposite the jaw shade
    g.beginPath(); g.ellipse(32 - hr[0] * 0.72, 9.4, 1.8, 3.2, -0.25, 0, 7); g.fill();
    g.fillStyle = skD; g.beginPath(); g.ellipse(32 + hr[0] * 0.94, 11.5, 1, 1.6, 0, 0, 7); g.fill();  // ear
    if (!o.noFace) {
      g.fillStyle = '#e8dcc8';                                                                         // eye whites (sclera)
      g.beginPath(); g.ellipse(30, 10.5, 1.15, 0.95, 0, 0, 7); g.fill();
      g.beginPath(); g.ellipse(34, 10.5, 1.15, 0.95, 0, 0, 7); g.fill();
      g.fillStyle = '#1c130c'; g.beginPath(); g.arc(30.15, 10.55, 0.62, 0, 7); g.fill();                // irises/pupils
      g.beginPath(); g.arc(34.15, 10.55, 0.62, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(29.9, 10.15, 0.4, 0.4); g.fillRect(33.9, 10.15, 0.4, 0.4);  // catch-lights
      g.strokeStyle = '#241a10'; g.lineWidth = 0.5;                                                     // lash line, opens the eye up
      g.beginPath(); g.moveTo(28.9, 9.75); g.lineTo(31.15, 9.7); g.moveTo(32.9, 9.7); g.lineTo(35.1, 9.75); g.stroke();
      g.fillStyle = 'rgba(45,25,12,0.85)';                                                              // bold eyebrows
      g.beginPath(); g.moveTo(28.7, 8.7); g.lineTo(31.3, 8.5); g.lineTo(31.2, 9.15); g.lineTo(28.8, 9.3); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(32.8, 8.5); g.lineTo(35.3, 8.7); g.lineTo(35.2, 9.3); g.lineTo(32.9, 9.15); g.closePath(); g.fill();
      g.fillStyle = 'rgba(50,25,10,0.5)'; g.fillRect(31.4, 11.8, 1.4, 1.9);                             // nose shadow
      g.fillStyle = 'rgba(255,238,215,0.4)'; g.fillRect(31.15, 11, 0.7, 1.6);                           // nose bridge highlight
      g.fillStyle = 'rgba(210,110,90,0.28)'; g.beginPath(); g.ellipse(29.6, 12.6, 1.5, 1.1, 0, 0, 7); g.fill();  // cheek blush, lit side
      g.fillStyle = '#3c2216'; g.fillRect(30, 14.35, 4, 0.75);                                          // upper lip, dark
      g.fillStyle = '#9a5c40'; g.fillRect(30, 15.05, 4, 0.85);                                          // lower lip, lit
      g.fillStyle = 'rgba(255,235,220,0.35)'; g.fillRect(30.6, 15.1, 1.2, 0.35);                        // lip highlight
    }
    if (o.face) o.face(g);
    if (o.hair) o.hair(g);
    if (o.headTurn) g.restore();
    if (o.extras) o.extras(g);
  }

  SPR.civilianM = outlined(g => person(g, {                            // local in a guayabera + straw hat
    trousers: ['#cbb896', '#a89878', '#8a7a5c'], shoes: ['#4a3c2c', '#241c12'],
    torso: ['#f4eeda', '#d9d0b4', '#a89c78'], sleeve: 'skin',
    chest: gg => {
      gg.strokeStyle = 'rgba(120,105,75,0.45)'; gg.lineWidth = 0.8;    // guayabera pleats
      gg.beginPath(); gg.moveTo(28.5, 21.5); gg.lineTo(27.5, 39); gg.moveTo(35.5, 21.5); gg.lineTo(36.5, 39); gg.stroke();
      gg.fillStyle = '#8a7a5c'; for (let y = 23; y < 38; y += 3.6) gg.fillRect(31.6, y, 0.9, 0.9);    // button line
    },
    face: gg => { gg.fillStyle = '#4a2e1a'; gg.fillRect(30, 13.2, 4, 1); },                           // moustache
    hair: gg => {
      gg.fillStyle = '#241a10'; gg.fillRect(27.4, 8.4, 1.8, 3.4); gg.fillRect(34.8, 8.4, 1.8, 3.4);   // sideburns
      const hg = gg.createLinearGradient(20, 3, 44, 10);               // straw hat
      hg.addColorStop(0, '#e8d090'); hg.addColorStop(1, '#c9a860');
      gg.fillStyle = hg; gg.beginPath(); gg.ellipse(32, 8.2, 9.6, 2.5, 0, 0, 7); gg.fill();
      gg.beginPath(); gg.ellipse(32, 5.4, 4.9, 4, 0, Math.PI, 0, true); gg.fill();
      gg.fillStyle = '#8a1414'; gg.fillRect(27.6, 6.2, 8.8, 1.3);      // hatband
      gg.fillStyle = 'rgba(0,0,0,0.22)'; gg.beginPath(); gg.ellipse(32, 8.8, 5.2, 1.2, 0, 0, 7); gg.fill();  // brim shadow on brow
    },
  }));
  SPR.civilianF = outlined(g => person(g, {                            // local in a floral print dress
    skirt: ['#d8577a', '#b8395e', '#7e2140'], shoes: ['#3a2f22', '#181209'],
    torso: ['#d8577a', '#b8395e', '#7e2140'], sleeve: 'skin', armW: 4, shoulderW: 0.85, headR: [4.6, 5.2],
    chest: gg => {
      gg.fillStyle = '#7e2140'; gg.fillRect(26.5, 36, 11, 2);          // waist sash
      gg.fillStyle = 'rgba(255,255,255,0.2)';                          // print dots, bodice + skirt
      for (const [fx, fy] of [[28, 26], [35.5, 29], [30, 33], [27, 42], [36, 44], [31.5, 49], [39, 50]]) { gg.beginPath(); gg.arc(fx, fy, 1.3, 0, 7); gg.fill(); }
    },
    face: gg => { gg.fillStyle = '#a83838'; gg.beginPath(); gg.ellipse(32.1, 14.9, 1.7, 0.8, 0, 0, 7); gg.fill(); },  // lipstick
    hair: gg => {
      const hair = gg.createLinearGradient(24, 4, 40, 16);             // dark hair swept back
      hair.addColorStop(0, '#2a1a10'); hair.addColorStop(1, '#140c06');
      gg.fillStyle = hair;
      gg.beginPath(); gg.ellipse(32, 8.6, 5.6, 5, 0, Math.PI * 0.92, Math.PI * 2.1); gg.fill();
      gg.beginPath(); gg.ellipse(27.6, 10.5, 1.6, 3.4, 0.2, 0, 7); gg.fill();                          // side sweep
      gg.beginPath(); gg.ellipse(36.6, 10.8, 1.5, 3.2, -0.2, 0, 7); gg.fill();
      gg.fillStyle = '#d84040'; gg.beginPath(); gg.arc(27.2, 8.6, 1.4, 0, 7); gg.fill();               // flower behind the ear
    },
  }));
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
  // MORE HAVANA LOCALS — genre-flavored civilian variety: a vendor, a café
  // waiter, a tourist, a police officer, a fisherman, a flower girl. Neutral,
  // same wander/stationary behavior + low-hp/one-hit-down rules as civilianM/F.
  // ---------------------------------------------------------------------------
  SPR.vendor = outlined(g => person(g, {                               // street vendor, apron + tray of goods
    trousers: ['#7a6248', '#5c4a36', '#463828'], shoes: ['#241a12', '#0e0a06'],
    torso: ['#98a084', '#6a7254', '#4a5038'], sleeve: 'skin',
    armL: [[23, 22.5], [18.5, 29], [21, 35]], handL: [21, 35],
    armR: [[41, 22.5], [45.5, 27.5], [43.5, 33]], handR: [43.5, 33],
    chest: gg => {
      const ap = gg.createLinearGradient(26, 24, 38, 40);              // canvas apron over the work shirt
      ap.addColorStop(0, '#d8c8a0'); ap.addColorStop(1, '#a8926a');
      gg.fillStyle = ap; gg.beginPath(); gg.moveTo(27, 24); gg.lineTo(37, 24); gg.lineTo(36.5, 39.5); gg.lineTo(27.5, 39.5); gg.closePath(); gg.fill();
      gg.strokeStyle = 'rgba(90,75,50,0.45)'; gg.lineWidth = 0.8; gg.strokeRect(28.5, 31, 7, 6);      // apron pocket
      gg.strokeStyle = '#8a7a58'; gg.lineWidth = 1;                    // neck straps
      gg.beginPath(); gg.moveTo(28, 24); gg.lineTo(31, 19.5); gg.moveTo(36, 24); gg.lineTo(33.4, 19.5); gg.stroke();
    },
    face: gg => { gg.fillStyle = '#4a2e1a'; gg.fillRect(30, 13.2, 4, 1); },                            // moustache
    hair: gg => {
      gg.fillStyle = '#241a10'; gg.fillRect(27.4, 8.2, 1.8, 3.2); gg.fillRect(34.8, 8.2, 1.8, 3.2);
      gg.fillStyle = '#3a3226'; gg.beginPath(); gg.ellipse(32, 8, 5.6, 3, 0, Math.PI, 0, true); gg.fill();  // flat cap
      gg.fillStyle = '#2a241a'; gg.beginPath(); gg.ellipse(34.5, 8.2, 3.4, 1, 0, 0, 7); gg.fill();          // cap brim
    },
    extras: gg => {
      const tray = gg.createLinearGradient(40, 30, 56, 36);            // tray of wares balanced on the far hand
      tray.addColorStop(0, '#b8875a'); tray.addColorStop(1, '#8a5c38');
      gg.fillStyle = tray; gg.beginPath(); gg.ellipse(48, 32, 7.5, 2.6, 0, 0, 7); gg.fill();
      gg.fillStyle = 'rgba(0,0,0,0.25)'; gg.beginPath(); gg.ellipse(48, 32.8, 7.5, 1.2, 0, 0, 7); gg.fill();
      gg.fillStyle = '#c9a227'; for (const [fx, fy] of [[44.5, 30.6], [48, 29.8], [51.5, 30.8]]) { gg.beginPath(); gg.arc(fx, fy, 1.7, 0, 7); gg.fill(); }
      gg.fillStyle = '#d84040'; gg.beginPath(); gg.arc(46.2, 30, 1.2, 0, 7); gg.fill();
    },
  }));

  SPR.waiter = outlined(g => person(g, {                               // café waiter, white jacket + bow tie + tray aloft
    trousers: ['#23252b', '#17181d', '#0e0f13'], shoes: ['#17181d', '#060708'],
    torso: ['#f7f3e7', '#d9d3bf', '#a8a28e'], sleeve: ['#e8e2d0', '#b8b29c'],
    armR: [[40.5, 22], [45.5, 17], [49.5, 12.5]], handR: [49.5, 12.5],
    chest: gg => {
      gg.strokeStyle = 'rgba(120,115,95,0.45)'; gg.lineWidth = 0.8;    // jacket seam
      gg.beginPath(); gg.moveTo(32, 22); gg.lineTo(32, 39.5); gg.stroke();
      gg.fillStyle = '#1c1e22';                                        // bow tie at the collar
      gg.beginPath(); gg.moveTo(29.6, 20.4); gg.lineTo(32, 21.6); gg.lineTo(29.6, 22.8); gg.closePath(); gg.fill();
      gg.beginPath(); gg.moveTo(34.4, 20.4); gg.lineTo(32, 21.6); gg.lineTo(34.4, 22.8); gg.closePath(); gg.fill();
      gg.fillRect(31.3, 20.8, 1.5, 1.5);
      gg.fillStyle = '#a8a28e'; for (let y = 25; y < 38; y += 3.8) gg.fillRect(31.6, y, 0.9, 0.9);    // buttons
    },
    hair: gg => {
      const hg = gg.createLinearGradient(26, 4, 38, 10);               // slicked dark hair
      hg.addColorStop(0, '#2a1e12'); hg.addColorStop(1, '#140d06');
      gg.fillStyle = hg; gg.beginPath(); gg.ellipse(32, 8.4, 5.2, 4, 0, Math.PI, 0, true); gg.fill();
      gg.fillStyle = 'rgba(255,255,255,0.16)'; gg.beginPath(); gg.ellipse(29.8, 6.6, 2.2, 1, -0.3, 0, 7); gg.fill();  // pomade shine
    },
    extras: gg => {
      const tray = gg.createLinearGradient(44, 8, 60, 12);             // silver tray balanced overhead
      tray.addColorStop(0, '#d8d8dc'); tray.addColorStop(1, '#9098a0');
      gg.fillStyle = tray; gg.beginPath(); gg.ellipse(52, 10.5, 7.5, 2.2, 0, 0, 7); gg.fill();
      gg.fillStyle = 'rgba(0,0,0,0.25)'; gg.beginPath(); gg.ellipse(52, 11.2, 7.5, 1, 0, 0, 7); gg.fill();
      gg.fillStyle = '#e8dca0'; gg.fillRect(50.4, 4.5, 2.8, 5.4);      // a drink riding it
      gg.fillStyle = '#8a1414'; gg.fillRect(50.4, 4.5, 2.8, 1.8);
    },
  }));

  SPR.tourist = outlined(g => person(g, {                              // loud shirt, camera, sun hat, sandals
    skin: ['#f0c8a0', '#d0a074', '#a0764c'],                           // sunburnt-pale next to the locals
    trousers: ['#d8ceb0', '#b8ac8a', '#948a68'], shorts: true, shoes: ['#a8783e', '#5c3e1c'],
    torso: ['#4a8a78', '#2e6a58', '#1c4a3c'], sleeve: 'skin',
    chest: gg => {
      gg.fillStyle = 'rgba(230,190,90,0.6)';                           // hibiscus print
      for (const [fx, fy] of [[27.5, 25], [36, 27], [29, 31], [34.5, 35], [27, 37]]) { gg.beginPath(); gg.arc(fx, fy, 1.7, 0, 7); gg.fill(); }
      gg.strokeStyle = 'rgba(20,14,8,0.5)'; gg.lineWidth = 1;          // camera strap
      gg.beginPath(); gg.moveTo(26.5, 21.5); gg.lineTo(32, 27.5); gg.lineTo(37.5, 21.5); gg.stroke();
      gg.fillStyle = '#1c1e22'; gg.fillRect(29.2, 26.5, 5.6, 3.8);     // camera on the chest
      gg.fillStyle = '#3a3d44'; gg.beginPath(); gg.arc(32, 28.4, 1.6, 0, 7); gg.fill();
      gg.fillStyle = 'rgba(200,220,240,0.7)'; gg.beginPath(); gg.arc(31.5, 27.9, 0.6, 0, 7); gg.fill();
    },
    face: gg => {
      gg.fillStyle = 'rgba(16,16,20,0.85)';                            // sunglasses
      gg.fillRect(28.4, 9.4, 3, 2.2); gg.fillRect(32.6, 9.4, 3, 2.2); gg.fillRect(31.2, 9.9, 1.6, 0.9);
      gg.fillStyle = 'rgba(160,200,235,0.4)'; gg.fillRect(28.7, 9.7, 1.4, 1);
    },
    hair: gg => {
      const hg = gg.createLinearGradient(20, 2, 44, 10);               // wide floppy sun hat
      hg.addColorStop(0, '#f0e0b0'); hg.addColorStop(1, '#d0b878');
      gg.fillStyle = hg; gg.beginPath(); gg.ellipse(32, 8, 11, 2.8, 0.06, 0, 7); gg.fill();
      gg.beginPath(); gg.ellipse(32, 5, 4.8, 3.8, 0, Math.PI, 0, true); gg.fill();
      gg.fillStyle = 'rgba(0,0,0,0.2)'; gg.beginPath(); gg.ellipse(32, 8.6, 5.4, 1.2, 0, 0, 7); gg.fill();
    },
  }));

  SPR.officer = outlined(g => person(g, {                              // Cuban police officer, uniform + peaked cap
    trousers: ['#3e4e63', '#2c3a4a', '#1e2836'], shoes: ['#17181d', '#060708'],
    torso: ['#54687e', '#3a4c60', '#263444'],
    chest: gg => {
      gg.fillStyle = '#c9a227'; gg.fillRect(25.5, 36.5, 13, 2.2);      // duty belt
      gg.fillStyle = '#fff2c0'; gg.fillRect(30.8, 36.8, 2.4, 1.6);     // buckle
      gg.strokeStyle = 'rgba(0,0,0,0.35)'; gg.lineWidth = 0.8;         // breast pockets
      gg.strokeRect(26.8, 24.5, 4.4, 3.6); gg.strokeRect(32.8, 24.5, 4.4, 3.6);
      gg.fillStyle = '#c9a227'; for (let y = 23; y < 36; y += 3.4) gg.fillRect(31.6, y, 0.9, 0.9);    // brass buttons
      gg.fillStyle = '#c9a227'; gg.fillRect(23.5, 20.5, 3.4, 1.4); gg.fillRect(37.1, 20.5, 3.4, 1.4); // shoulder boards
    },
    hair: gg => {
      const cg2 = gg.createLinearGradient(26, 2, 40, 10);              // peaked cap
      cg2.addColorStop(0, '#3e5066'); cg2.addColorStop(1, '#1c242e');
      gg.fillStyle = cg2; gg.beginPath(); gg.ellipse(32, 7.2, 5.8, 3.8, 0, Math.PI, 0, true); gg.fill();
      gg.fillStyle = '#141a22'; gg.beginPath(); gg.ellipse(32, 7.6, 6.2, 1.6, 0, 0, 7); gg.fill();    // band
      gg.fillStyle = '#0e1218'; gg.beginPath(); gg.ellipse(32.6, 8.9, 5, 1.2, 0.05, 0, 7); gg.fill(); // visor
      gg.fillStyle = '#c9a227'; gg.beginPath(); gg.arc(32, 6.2, 1.2, 0, 7); gg.fill();                // badge
    },
    extras: gg => {
      gg.save(); gg.translate(41.5, 38); gg.rotate(0.25);              // baton hanging off the belt
      gg.fillStyle = '#1c1e22'; gg.fillRect(-1.1, 0, 2.2, 9);
      gg.fillStyle = 'rgba(255,255,255,0.15)'; gg.fillRect(-1.1, 0, 0.8, 9);
      gg.restore();
    },
  }));

  SPR.fisherman = outlined(g => person(g, {                            // dockworker, rolled sleeves + net over the shoulder
    trousers: ['#8a9088', '#646a60', '#4a5046'], shoes: ['#241a12', '#0e0a06'],
    torso: ['#d4cdab', '#a89f7d', '#7c745a'], sleeve: 'skin', armW: 5.2,
    chest: gg => {
      gg.fillStyle = '#7c745a'; for (let y = 22.5; y < 30; y += 3) gg.fillRect(31.6, y, 0.9, 0.9);    // henley buttons
      gg.strokeStyle = 'rgba(90,80,55,0.4)'; gg.lineWidth = 0.8;       // shirt strain folds
      gg.beginPath(); gg.moveTo(26, 30); gg.quadraticCurveTo(29, 31.5, 31, 30.5); gg.stroke();
    },
    face: gg => { gg.fillStyle = 'rgba(60,40,25,0.28)'; gg.beginPath(); gg.ellipse(32, 14, 3.2, 2, 0, 0, 7); gg.fill(); },  // stubble
    hair: gg => {
      gg.fillStyle = '#241a10'; gg.fillRect(27.4, 8.2, 1.8, 3.2); gg.fillRect(34.8, 8.2, 1.8, 3.2);
      gg.fillStyle = '#3a3226'; gg.beginPath(); gg.ellipse(32, 8, 5.4, 2.8, 0, Math.PI, 0, true); gg.fill();  // flat cap
      gg.fillStyle = '#2a241a'; gg.beginPath(); gg.ellipse(34.2, 8.2, 3.2, 1, 0, 0, 7); gg.fill();
    },
    extras: gg => {
      gg.fillStyle = 'rgba(180,170,145,0.5)';                          // bundled net slung over the right shoulder
      gg.beginPath(); gg.ellipse(39.5, 22, 3.4, 2.4, 0.5, 0, 7); gg.fill();
      gg.strokeStyle = 'rgba(230,220,200,0.55)'; gg.lineWidth = 0.8;
      for (let i = 0; i < 5; i++) { gg.beginPath(); gg.moveTo(38 + i * 1.6, 22.5); gg.quadraticCurveTo(43 + i * 1.4, 30, 44.5 + i * 1.2, 37); gg.stroke(); }
      for (let i = 0; i < 3; i++) { gg.beginPath(); gg.moveTo(39, 26 + i * 4); gg.lineTo(48, 27.5 + i * 4); gg.stroke(); }  // cross-strands
    },
  }));

  SPR.flowergirl = outlined(g => person(g, {                           // apron dress + basket, matches the flower cart prop
    skirt: ['#d89060', '#b86a3e', '#7e4526'], shoes: ['#3a2f22', '#181209'],
    torso: ['#d89060', '#b86a3e', '#7e4526'], sleeve: 'skin', armW: 4, shoulderW: 0.85, headR: [4.6, 5.2],
    armR: [[40, 23], [44.5, 30], [43.5, 36]], handR: [43.5, 36],
    chest: gg => {
      const ap = gg.createLinearGradient(24, 30, 40, 52);              // work apron over the dress
      ap.addColorStop(0, '#f0ead6'); ap.addColorStop(1, '#c9c0a0');
      gg.fillStyle = ap; gg.beginPath(); gg.moveTo(27, 30); gg.lineTo(37, 30); gg.lineTo(39.5, 52); gg.lineTo(24.5, 52); gg.closePath(); gg.fill();
      gg.strokeStyle = 'rgba(120,105,75,0.4)'; gg.lineWidth = 0.8;
      gg.beginPath(); gg.moveTo(27.5, 38); gg.lineTo(36.5, 38); gg.stroke();             // apron tie line
    },
    hair: gg => {
      const hair = gg.createLinearGradient(24, 4, 40, 16);
      hair.addColorStop(0, '#3a2416'); hair.addColorStop(1, '#1c1208');
      gg.fillStyle = hair;
      gg.beginPath(); gg.ellipse(32, 8.6, 5.6, 5, 0, Math.PI * 0.92, Math.PI * 2.1); gg.fill();
      gg.beginPath(); gg.ellipse(27.6, 10.5, 1.6, 3.4, 0.2, 0, 7); gg.fill();
      gg.beginPath(); gg.ellipse(36.6, 10.8, 1.5, 3.2, -0.2, 0, 7); gg.fill();
      gg.fillStyle = '#d84040'; gg.beginPath(); gg.arc(27.2, 8.6, 1.4, 0, 7); gg.fill();
    },
    extras: gg => {
      const bsk = gg.createLinearGradient(40, 34, 52, 42);             // basket of flowers on the far arm
      bsk.addColorStop(0, '#a8794a'); bsk.addColorStop(1, '#7a5430');
      gg.fillStyle = bsk; gg.beginPath(); gg.ellipse(46.5, 38, 5.8, 4, 0, 0, 7); gg.fill();
      gg.strokeStyle = 'rgba(60,40,20,0.4)'; gg.lineWidth = 0.7;       // weave lines
      gg.beginPath(); gg.moveTo(41.5, 37); gg.lineTo(51.5, 37); gg.moveTo(42, 39.5); gg.lineTo(51, 39.5); gg.stroke();
      gg.fillStyle = '#d84040'; for (const [fx, fy] of [[43.5, 34.5], [47, 33], [50, 34.6]]) { gg.beginPath(); gg.arc(fx, fy, 1.7, 0, 7); gg.fill(); }
      gg.fillStyle = '#e8d040'; gg.beginPath(); gg.arc(48.6, 35, 1.3, 0, 7); gg.fill();
      gg.fillStyle = '#3a7a3a'; gg.fillRect(44.8, 34.5, 0.9, 2.4);     // stems
    },
  }));

  SPR.carlotta = outlined(g => person(g, {                             // Carlotta — hair pinned up, red dress, waiting
    skirt: ['#e0304a', '#b8172e', '#6e0e1c'], shoes: ['#8a1414', '#4a0a0a'],
    skirtFn: gg => {                                                   // fitted skirt with a slit
      gg.beginPath(); gg.moveTo(25.5, 36); gg.lineTo(38.5, 36); gg.lineTo(41.5, 54); gg.lineTo(35.5, 54);
      gg.lineTo(33.8, 42); gg.lineTo(31, 54); gg.lineTo(22.5, 54); gg.closePath(); gg.fill();
    },
    torso: ['#e0304a', '#b8172e', '#6e0e1c'], sleeve: 'skin', armW: 4, shoulderW: 0.82, headR: [4.6, 5.2],
    armL: [[24, 23], [18.5, 28.5], [23, 33.5]], handL: [23, 33.5],     // one hand on the hip
    chest: gg => { gg.fillStyle = 'rgba(255,255,255,0.14)'; gg.fillRect(26.5, 35, 11, 1.5); },
    face: gg => { gg.fillStyle = '#8a1414'; gg.beginPath(); gg.ellipse(32.1, 14.9, 1.8, 0.9, 0, 0, 7); gg.fill(); },  // red lips
    hair: gg => {
      const hair = gg.createLinearGradient(24, 2, 40, 14);
      hair.addColorStop(0, '#3a2416'); hair.addColorStop(1, '#1c1208');
      gg.fillStyle = hair;
      gg.beginPath(); gg.ellipse(32, 8.6, 5.4, 4.8, 0, Math.PI * 0.95, Math.PI * 2.08); gg.fill();
      gg.beginPath(); gg.ellipse(32, 4.4, 3.6, 3, 0, 0, 7); gg.fill(); // the bun on top
      gg.strokeStyle = '#e8dca0'; gg.lineWidth = 1.3; gg.lineCap = 'round';   // the jeweled hairpin, glinting
      gg.beginPath(); gg.moveTo(28.4, 3.2); gg.lineTo(35.6, 5); gg.stroke();
      gg.fillStyle = 'rgba(255,250,220,0.85)'; gg.beginPath(); gg.arc(35.6, 5, 0.9, 0, 7); gg.fill();
      gg.fillStyle = '#d84040'; gg.beginPath(); gg.arc(27.4, 8.4, 1.5, 0, 7); gg.fill();   // flower behind the ear
    },
  }));

  SPR.drz = outlined(g => person(g, {                                  // Dr. Z — balding mad scientist, wild side-hair, lab coat
    trousers: ['#23252b', '#17181d', '#0e0f13'], shoes: ['#17181d', '#060708'],
    torso: ['#eeeadf', '#cfcab9', '#9a9484'], sleeve: ['#e0dbc9', '#b3ad9b'], torsoLen: 47,
    skin: ['#e8c39a', '#c9906a', '#96603a'],
    chest: gg => {
      gg.fillStyle = 'rgba(255,255,255,0.3)'; gg.beginPath(); gg.moveTo(28, 21); gg.lineTo(31.5, 24); gg.lineTo(30, 27.5); gg.closePath(); gg.fill();  // lapels
      gg.fillStyle = 'rgba(0,0,0,0.14)'; gg.beginPath(); gg.moveTo(36, 21); gg.lineTo(32.5, 24); gg.lineTo(34, 27.5); gg.closePath(); gg.fill();
      gg.fillStyle = '#2b2e34'; gg.fillRect(30.4, 21, 3.2, 3.6);       // dark shirt sliver under the lapels
      gg.strokeStyle = 'rgba(0,0,0,0.18)'; gg.lineWidth = 0.8; gg.beginPath(); gg.moveTo(32, 25); gg.lineTo(32, 46.5); gg.stroke();
      gg.fillStyle = '#8a8478'; gg.fillRect(26, 29, 3.8, 3);           // breast pocket
      gg.fillStyle = '#b23a2c'; gg.fillRect(26.5, 28.4, 0.8, 2.6);     // red pen clipped in it
      gg.fillStyle = '#3a5fae'; gg.fillRect(27.7, 28.4, 0.8, 2.6);     // blue pen
    },
    noFace: true,
    face: gg => {
      gg.fillStyle = '#3a3a3a'; gg.fillRect(28.8, 8.6, 1.7, 0.9); gg.fillRect(33.5, 8.6, 1.7, 0.9);   // bushy brows
      gg.strokeStyle = '#1c1e22'; gg.lineWidth = 0.9;                  // round wire glasses
      gg.beginPath(); gg.arc(29.8, 10.4, 1.9, 0, 7); gg.stroke(); gg.beginPath(); gg.arc(34.2, 10.4, 1.9, 0, 7); gg.stroke();
      gg.beginPath(); gg.moveTo(31.6, 10.4); gg.lineTo(32.4, 10.4); gg.stroke();
      gg.beginPath(); gg.moveTo(27.9, 10); gg.lineTo(26.6, 9.4); gg.moveTo(36.1, 10); gg.lineTo(37.4, 9.4); gg.stroke();  // temple arms
      gg.fillStyle = 'rgba(160,215,235,0.4)'; gg.beginPath(); gg.arc(29.8, 10.4, 1.6, 0, 7); gg.fill(); gg.beginPath(); gg.arc(34.2, 10.4, 1.6, 0, 7); gg.fill();
      gg.fillStyle = 'rgba(255,255,255,0.6)'; gg.beginPath(); gg.arc(29.2, 9.9, 0.5, 0, 7); gg.fill(); gg.beginPath(); gg.arc(33.6, 9.9, 0.5, 0, 7); gg.fill();  // lens glint
      gg.fillStyle = 'rgba(60,30,12,0.45)'; gg.fillRect(31.4, 12, 1.4, 1.6);
      gg.strokeStyle = '#8a5a3a'; gg.lineWidth = 1; gg.lineCap = 'round';
      gg.beginPath(); gg.moveTo(30.2, 14.6); gg.quadraticCurveTo(32, 15.3, 33.8, 14.6); gg.stroke();  // faint smile line
    },
    hair: gg => {
      gg.fillStyle = 'rgba(255,255,255,0.22)'; gg.beginPath(); gg.ellipse(30, 7, 3.2, 2.2, -0.3, 0, 7); gg.fill();  // bald-dome shine
      const hair = gg.createLinearGradient(22, 6, 42, 14);
      hair.addColorStop(0, '#f4f4f0'); hair.addColorStop(1, '#c9c4b4');
      gg.fillStyle = hair;
      const tuft = (hx, hy, rot, len, w2) => {                         // spiky static-shocked side tufts, NOT a halo
        gg.save(); gg.translate(hx, hy); gg.rotate(rot);
        gg.beginPath(); gg.moveTo(-w2, 1); gg.quadraticCurveTo(-w2 * 0.3, -len * 0.6, 0, -len); gg.quadraticCurveTo(w2 * 0.3, -len * 0.6, w2, 1); gg.closePath(); gg.fill();
        gg.restore();
      };
      tuft(26.8, 10.5, -1.9, 5, 1.6); tuft(26, 9, -2.3, 4.4, 1.4); tuft(28, 8, -1.5, 4.6, 1.4);       // left burst
      tuft(37.2, 10.5, 1.9, 5, 1.6); tuft(38, 9, 2.3, 4.4, 1.4); tuft(36, 8, 1.5, 4.6, 1.4);          // right burst
      gg.strokeStyle = hair; gg.lineWidth = 0.9; gg.lineCap = 'round';                                 // sparse comb-over wisps
      gg.beginPath(); gg.moveTo(28.5, 6.8); gg.quadraticCurveTo(31, 5.2, 33.5, 6); gg.stroke();
      gg.beginPath(); gg.moveTo(34.5, 6.4); gg.quadraticCurveTo(32, 4.8, 29.5, 5.6); gg.stroke();
    },
  }));

  SPR.defector = outlined(g => person(g, {                             // the defector — nervous, sharp suit, glancing back
    trousers: ['#2a2c33', '#1c1e24', '#101116'], shoes: ['#17181d', '#060708'],
    torso: ['#4a4e58', '#33363e', '#1e2026'], torsoLen: 45, headTurn: 0.3,
    armL: [[23, 22.5], [19, 29], [23.5, 33]], handL: [23.5, 33],       // one hand clutching a lapel
    chest: gg => {
      const sh = gg.createLinearGradient(29, 21, 35, 32);              // shirt V
      sh.addColorStop(0, '#f0ece0'); sh.addColorStop(1, '#c9c4b4');
      gg.fillStyle = sh; gg.beginPath(); gg.moveTo(29.6, 21); gg.lineTo(32, 30); gg.lineTo(34.4, 21); gg.closePath(); gg.fill();
      gg.save(); gg.translate(32, 21.5); gg.rotate(0.08);              // tie knocked slightly askew
      gg.fillStyle = '#701818'; gg.fillRect(-1, 0, 2, 8.5);
      gg.restore();
      gg.fillStyle = 'rgba(255,255,255,0.08)';                         // lapel light
      gg.beginPath(); gg.moveTo(27, 22); gg.lineTo(29.5, 30); gg.lineTo(27.5, 38); gg.lineTo(25.5, 38); gg.closePath(); gg.fill();
    },
    face: gg => {
      gg.strokeStyle = 'rgba(40,22,10,0.7)'; gg.lineWidth = 0.9;       // worried brows
      gg.beginPath(); gg.moveTo(28.8, 9); gg.lineTo(30.6, 9.6); gg.moveTo(35.2, 9); gg.lineTo(33.4, 9.6); gg.stroke();
      gg.fillStyle = 'rgba(255,255,255,0.25)'; gg.beginPath(); gg.ellipse(29.5, 12.8, 1, 0.6, 0.3, 0, 7); gg.fill();  // sheen of sweat
    },
    hair: gg => {
      const hg = gg.createLinearGradient(26, 4, 38, 10);               // slicked dark hair
      hg.addColorStop(0, '#241c12'); hg.addColorStop(1, '#120d06');
      gg.fillStyle = hg; gg.beginPath(); gg.ellipse(32, 8.2, 5.2, 3.8, 0, Math.PI, 0, true); gg.fill();
    },
  }));

  SPR.agent005 = outlined(g => person(g, {                             // Agent 005 — sharp navy suit, confident
    trousers: ['#23252b', '#17181d', '#0e0f13'], shoes: ['#17181d', '#060708'],
    torso: ['#2e3a5c', '#202a44', '#131a2c'], torsoLen: 45,
    chest: gg => {
      const sh = gg.createLinearGradient(29, 21, 35, 32);              // shirt V
      sh.addColorStop(0, '#f0ece0'); sh.addColorStop(1, '#c9c4b4');
      gg.fillStyle = sh; gg.beginPath(); gg.moveTo(29.6, 21); gg.lineTo(32, 30); gg.lineTo(34.4, 21); gg.closePath(); gg.fill();
      gg.fillStyle = '#8a1414'; gg.fillRect(31.1, 21.5, 1.9, 8.5);     // red tie
      gg.fillStyle = 'rgba(255,255,255,0.08)';                         // crisp lapel light
      gg.beginPath(); gg.moveTo(37, 22); gg.lineTo(34.5, 30); gg.lineTo(36.5, 38); gg.lineTo(38.5, 38); gg.closePath(); gg.fill();
      gg.fillStyle = '#f0ece0'; gg.fillRect(26.4, 24.5, 2.6, 1.4);     // pocket square
    },
    face: gg => { gg.fillStyle = 'rgba(255,255,255,0.75)'; gg.beginPath(); gg.arc(29.9, 9.9, 0.55, 0, 7); gg.fill(); },  // the knowing glint
    hair: gg => {
      const hg = gg.createLinearGradient(26, 4, 38, 10);               // neat dark hair, side part
      hg.addColorStop(0, '#2a1e12'); hg.addColorStop(1, '#140d06');
      gg.fillStyle = hg; gg.beginPath(); gg.ellipse(32, 8.4, 5.3, 4.2, 0, Math.PI, 0, true); gg.fill();
      gg.strokeStyle = 'rgba(255,255,255,0.14)'; gg.lineWidth = 0.8;
      gg.beginPath(); gg.moveTo(29.5, 5.2); gg.lineTo(28.5, 8); gg.stroke();   // part line
    },
  }));

  SPR.matron = outlined(g => person(g, {                              // The Matron — gallery owner, ex-opera diva, furs + pearls
    trousers: ['#3a2436', '#281826', '#180e18'], skirt: ['#5a2e4a', '#3a1c32', '#241220'], shoes: ['#180e18', '#0a0508'],
    torso: ['#6a3454', '#4a2440', '#2e1428'], torsoLen: 46, shoulderW: 1.05, headR: [4.8, 5.4],
    skirtFn: gg => { gg.beginPath(); gg.moveTo(24, 36); gg.lineTo(40, 36); gg.lineTo(43, 55); gg.lineTo(21, 55); gg.closePath(); gg.fill(); },
    chest: gg => {
      gg.fillStyle = 'rgba(240,236,224,0.9)';                         // fox-fur stole
      gg.beginPath(); gg.ellipse(24, 24, 4.6, 3.2, -0.3, 0, 7); gg.fill();
      gg.beginPath(); gg.ellipse(40, 24, 4.6, 3.2, 0.3, 0, 7); gg.fill();
      gg.strokeStyle = 'rgba(200,196,184,0.6)'; gg.lineWidth = 0.8;
      gg.beginPath(); gg.moveTo(24, 26); gg.quadraticCurveTo(32, 34, 40, 26); gg.stroke();
      gg.fillStyle = '#f0ece0'; for (const [fx, fy] of [[27, 32], [32, 34.5], [37, 32]]) { gg.beginPath(); gg.arc(fx, fy, 1.1, 0, 7); gg.fill(); }  // pearls
      gg.fillStyle = 'rgba(0,0,0,0.4)'; gg.beginPath(); gg.arc(22.5, 23, 0.8, 0, 7); gg.fill(); gg.beginPath(); gg.arc(41.5, 23, 0.8, 0, 7); gg.fill();  // fox eyes
    },
    face: gg => { gg.fillStyle = '#8a1428'; gg.beginPath(); gg.ellipse(32.1, 14.9, 1.8, 0.9, 0, 0, 7); gg.fill(); },  // deep red lipstick
    hair: gg => {
      const hair = gg.createLinearGradient(22, 3, 42, 16);            // silver upswept hair
      hair.addColorStop(0, '#d8d4c8'); hair.addColorStop(1, '#a8a294');
      gg.fillStyle = hair;
      gg.beginPath(); gg.ellipse(32, 8, 6.2, 5.6, 0, Math.PI * 0.9, Math.PI * 2.15); gg.fill();
      gg.beginPath(); gg.ellipse(32, 3.6, 4, 3.4, 0, 0, 7); gg.fill();
      gg.strokeStyle = 'rgba(0,0,0,0.15)'; gg.lineWidth = 0.6; gg.beginPath(); gg.moveTo(28, 5); gg.quadraticCurveTo(32, 2.5, 36, 5); gg.stroke();
    },
    extras: gg => {
      gg.strokeStyle = '#c9a227'; gg.lineWidth = 1;                    // opera glasses on a chain, held
      gg.beginPath(); gg.moveTo(43.5, 36); gg.quadraticCurveTo(46, 30, 44, 24); gg.stroke();
      gg.fillStyle = '#1c1e22'; gg.beginPath(); gg.arc(42.6, 22.4, 1.6, 0, 7); gg.fill(); gg.beginPath(); gg.arc(46, 22.4, 1.6, 0, 7); gg.fill();
    },
  }));

  SPR.streetartist = outlined(g => person(g, {                        // Street Artist — beret, paint-smeared smock
    trousers: ['#8a8478', '#6a6458', '#4a4438'], shoes: ['#3a2c14', '#1c1408'],
    torso: ['#c9c2ac', '#a8a08c', '#847c68'], sleeve: 'skin', armW: 4.4,
    armR: [[41, 22], [46, 27], [44.5, 33]], handR: [44.5, 33],
    chest: gg => {
      gg.fillStyle = 'rgba(180,60,50,0.6)'; gg.beginPath(); gg.ellipse(27, 30, 1.6, 1, -0.3, 0, 7); gg.fill();  // paint smears on the smock
      gg.fillStyle = 'rgba(60,110,160,0.55)'; gg.beginPath(); gg.ellipse(35, 34, 1.8, 1, 0.4, 0, 7); gg.fill();
      gg.fillStyle = 'rgba(220,190,50,0.55)'; gg.beginPath(); gg.ellipse(29, 37, 1.4, 0.9, 0, 0, 7); gg.fill();
      gg.strokeStyle = 'rgba(90,80,60,0.4)'; gg.lineWidth = 0.8; gg.beginPath(); gg.moveTo(26, 22); gg.lineTo(24, 39); gg.moveTo(38, 22); gg.lineTo(40, 39); gg.stroke();
    },
    face: gg => { gg.fillStyle = 'rgba(60,40,25,0.3)'; gg.beginPath(); gg.ellipse(32, 14, 3, 1.8, 0, 0, 7); gg.fill(); },  // little goatee
    hair: gg => {
      gg.fillStyle = '#241a10'; gg.fillRect(27.4, 8.2, 1.8, 3.2); gg.fillRect(34.8, 8.2, 1.8, 3.2);
      gg.fillStyle = '#2a1c30'; gg.beginPath(); gg.ellipse(32, 7.4, 5.8, 3, 0, Math.PI, 0, true); gg.fill();  // beret
      gg.fillStyle = '#1c1224'; gg.beginPath(); gg.arc(36.5, 6, 1, 0, 7); gg.fill();
    },
    extras: gg => {
      gg.save(); gg.translate(20, 32); gg.rotate(-0.3);                // palette on the near arm
      gg.fillStyle = '#c9a06a'; gg.beginPath(); gg.ellipse(0, 0, 5, 3.6, 0, 0, 7); gg.fill();
      gg.fillStyle = '#c9333a'; gg.beginPath(); gg.arc(-2, -1, 0.9, 0, 7); gg.fill();
      gg.fillStyle = '#2a5f8a'; gg.beginPath(); gg.arc(0, -1.5, 0.9, 0, 7); gg.fill();
      gg.fillStyle = '#d8a827'; gg.beginPath(); gg.arc(2, -1, 0.9, 0, 7); gg.fill();
      gg.restore();
    },
  }));

  SPR.laundrylady = outlined(g => person(g, {                          // laundry counter attendant — apron, headscarf
    trousers: ['#8a8478', '#6a6458', '#4a4438'], shoes: ['#3a2c14', '#1c1408'],
    torso: ['#a8b0a0', '#88907e', '#686e5c'], sleeve: 'skin', armW: 4,
    chest: gg => {
      const ap = gg.createLinearGradient(24, 24, 40, 50);              // apron over the housedress
      ap.addColorStop(0, '#e8e2d0'); ap.addColorStop(1, '#c0baa4');
      gg.fillStyle = ap; gg.beginPath(); gg.moveTo(26, 24); gg.lineTo(38, 24); gg.lineTo(39.5, 49.5); gg.lineTo(24.5, 49.5); gg.closePath(); gg.fill();
      gg.strokeStyle = 'rgba(90,85,65,0.4)'; gg.lineWidth = 0.8; gg.strokeRect(28.5, 33, 7, 6);   // apron pocket
    },
    face: gg => { gg.fillStyle = 'rgba(60,40,25,0.2)'; gg.beginPath(); gg.ellipse(32, 13.6, 3, 1.6, 0, 0, 7); gg.fill(); },
    hair: gg => {
      gg.fillStyle = '#3a2a1a'; gg.fillRect(27.4, 8.2, 1.8, 3.2); gg.fillRect(34.8, 8.2, 1.8, 3.2);
      const sc = gg.createLinearGradient(24, 4, 40, 12);               // headscarf, knotted
      sc.addColorStop(0, '#8a3050'); sc.addColorStop(1, '#5c1e34');
      gg.fillStyle = sc; gg.beginPath(); gg.ellipse(32, 7, 6.4, 4.6, 0, Math.PI, 0, true); gg.fill();
      gg.fillStyle = sc; gg.beginPath(); gg.ellipse(38, 7.6, 2.2, 1.6, 0.4, 0, 7); gg.fill();   // knot
    },
    extras: gg => {
      gg.fillStyle = '#f0ece0'; gg.fillRect(38, 26, 5, 9);             // a folded shirt over one arm
      gg.strokeStyle = 'rgba(0,0,0,0.15)'; gg.lineWidth = 0.6; gg.strokeRect(38, 26, 5, 9);
    },
  }));

  SPR.double = outlined(g => person(g, {                               // the double — plain, forgettable, waiting
    trousers: ['#7a7468', '#5c564c', '#403a30'], shoes: ['#241a12', '#0e0a06'],
    torso: ['#8a8478', '#6a6458', '#4a4438'], sleeve: ['#8a8478', '#6a6458'],
    face: gg => { },
  }));
  SPR.doubleSuited = outlined(g => person(g, {                         // the double, suited but not yet masked
    trousers: ['#23252b', '#17181d', '#0e0f13'], shoes: ['#17181d', '#060708'],
    torso: ['#2e3040', '#1e2030', '#131420'], torsoLen: 45,
    chest: gg => {
      const sh = gg.createLinearGradient(29, 21, 35, 32);
      sh.addColorStop(0, '#f0ece0'); sh.addColorStop(1, '#c9c4b4');
      gg.fillStyle = sh; gg.beginPath(); gg.moveTo(29.6, 21); gg.lineTo(32, 30); gg.lineTo(34.4, 21); gg.closePath(); gg.fill();
      gg.fillStyle = '#1c3a5c'; gg.fillRect(31.1, 21.5, 1.9, 8.5);
    },
    face: gg => { },
  }));
  SPR.doubleDressed = outlined(g => person(g, {                        // the double, suited and masked — the payoff
    trousers: ['#23252b', '#17181d', '#0e0f13'], shoes: ['#17181d', '#060708'],
    torso: ['#2e3040', '#1e2030', '#131420'], torsoLen: 45,
    chest: gg => {
      const sh = gg.createLinearGradient(29, 21, 35, 32);
      sh.addColorStop(0, '#f0ece0'); sh.addColorStop(1, '#c9c4b4');
      gg.fillStyle = sh; gg.beginPath(); gg.moveTo(29.6, 21); gg.lineTo(32, 30); gg.lineTo(34.4, 21); gg.closePath(); gg.fill();
      gg.fillStyle = '#1c3a5c'; gg.fillRect(31.1, 21.5, 1.9, 8.5);
    },
    noFace: true,
    hair: gg => {
      const mk = gg.createRadialGradient(29, 9, 1, 32, 11, 8);         // a stiff novelty mask, not a real face
      mk.addColorStop(0, '#e8c8a8'); mk.addColorStop(0.7, '#c99a72'); mk.addColorStop(1, '#8a6446');
      gg.fillStyle = mk; gg.beginPath(); gg.ellipse(32, 11, 6.6, 7, 0, 0, 7); gg.fill();
      gg.strokeStyle = 'rgba(0,0,0,0.3)'; gg.lineWidth = 0.8; gg.beginPath(); gg.ellipse(32, 11, 6.6, 7, 0, 0, 7); gg.stroke();
      gg.fillStyle = '#1c1e22'; gg.fillRect(28.4, 9.4, 1.6, 1.2); gg.fillRect(33.6, 9.4, 1.6, 1.2);   // painted eyes
      gg.fillStyle = '#7a4a30'; gg.beginPath(); gg.ellipse(32, 14.6, 2.4, 1, 0, 0, 7); gg.fill();     // painted mouth
      gg.strokeStyle = 'rgba(180,150,120,0.5)'; gg.lineWidth = 0.6; gg.beginPath(); gg.moveTo(25.6, 11); gg.lineTo(38.4, 11); gg.stroke();  // mask seam
      gg.fillStyle = '#241a10'; gg.beginPath(); gg.ellipse(32, 3.6, 5.6, 2.6, 0, Math.PI, 0, true); gg.fill();  // hair painted onto the mask
    },
  }));

  SPR.patsy = outlined(g => person(g, {                                // the patsy — nervous, ill-fitting jacket, glasses
    trousers: ['#5a5648', '#403c32', '#28241c'], shoes: ['#241a12', '#0e0a06'],
    torso: ['#8a8266', '#6a6450', '#4a463a'], sleeve: 'skin', armW: 4,
    chest: gg => { gg.strokeStyle = 'rgba(40,36,26,0.4)'; gg.lineWidth = 0.8; gg.beginPath(); gg.moveTo(28, 22); gg.lineTo(26.5, 39); gg.moveTo(36, 22); gg.lineTo(37.5, 39); gg.stroke(); },
    face: gg => {
      gg.strokeStyle = 'rgba(20,16,10,0.7)'; gg.lineWidth = 0.8;        // heavy black-frame glasses
      gg.beginPath(); gg.rect(27.6, 9, 3.4, 2.6); gg.rect(33, 9, 3.4, 2.6); gg.stroke();
      gg.beginPath(); gg.moveTo(31, 10.2); gg.lineTo(33, 10.2); gg.stroke();
      gg.fillStyle = 'rgba(255,255,255,0.28)'; gg.fillRect(28, 9.3, 2.6, 1.8); gg.fillRect(33.4, 9.3, 2.6, 1.8);
      gg.fillStyle = 'rgba(255,255,255,0.4)'; gg.beginPath(); gg.ellipse(29.2, 13, 1, 0.6, 0.2, 0, 7); gg.fill();  // sweat
    },
    hair: gg => { gg.fillStyle = '#241a10'; gg.beginPath(); gg.ellipse(32, 8, 5.6, 4, 0, Math.PI, 0, true); gg.fill(); },
  }));

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

  SPR.sportscar = outlined(g => {                                  // sleek red convertible — the getaway, if you earn it
    g.fillStyle = 'rgba(0,0,0,0.32)'; g.beginPath(); g.ellipse(32, 56, 30, 5, 0, 0, 7); g.fill();
    let body = g.createLinearGradient(4, 26, 60, 50);
    body.addColorStop(0, '#e8382c'); body.addColorStop(0.5, '#b8241a'); body.addColorStop(1, '#6e120c');
    g.fillStyle = body;
    g.beginPath();
    g.moveTo(6, 46); g.quadraticCurveTo(4, 36, 16, 32); g.lineTo(24, 27); g.quadraticCurveTo(32, 25, 40, 27);
    g.lineTo(48, 32); g.quadraticCurveTo(60, 34, 58, 46); g.quadraticCurveTo(60, 50, 55, 51); g.lineTo(9, 51);
    g.quadraticCurveTo(4, 50, 6, 46); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.moveTo(10, 34); g.quadraticCurveTo(20, 28, 32, 26); g.lineTo(30, 32); g.quadraticCurveTo(18, 34, 12, 42); g.closePath(); g.fill();
    g.fillStyle = '#3a2018'; g.beginPath(); g.ellipse(32, 33, 11, 4.4, 0, 0, 7); g.fill();     // open cockpit, no roof
    g.fillStyle = '#1c1e22'; g.beginPath(); g.ellipse(32, 34, 8.6, 3, 0, 0, 7); g.fill();      // seats
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(24, 33); g.lineTo(23, 50); g.moveTo(40, 33); g.lineTo(41, 50); g.stroke();
    g.fillStyle = '#c9a227'; g.fillRect(29, 40, 6, 2);                                        // door handles
    g.fillStyle = '#0c0d10'; g.beginPath(); g.ellipse(14, 52, 8, 8, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(50, 52, 8, 8, 0, 0, 7); g.fill();
    g.fillStyle = '#e8ecf0'; g.beginPath(); g.arc(14, 52, 3.6, 0, 7); g.fill(); g.beginPath(); g.arc(50, 52, 3.6, 0, 7); g.fill();  // chrome hubcaps
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(6, 44, 2.4, 3.6); g.fillRect(56, 44, 2.4, 3.6);
    g.fillStyle = '#f0d840'; g.fillRect(5, 45, 2, 3); g.fillRect(57, 45, 2, 3);                // amber taillights
    g.fillStyle = '#e8ecf0'; g.fillRect(28, 48, 8, 2);                                         // chrome rear bumper
  });
  SPR.sportscarOpen = SPR.sportscar;   // doors-open state (keys used) — placeholder until/unless shipped art overrides it, same as every other ART_ASSETS entry

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

  // ---------------------------------------------------------------------------
  // WAVE 1 — STREET & OUTDOOR PROPS
  // ---------------------------------------------------------------------------
  SPR.mailbox = outlined(g => {                                    // rounded-top blue collection mailbox
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(32, 60, 12, 2.4, 0, 0, 7); g.fill();
    let bd = g.createLinearGradient(20, 0, 44, 0);
    bd.addColorStop(0, '#3a5a8a'); bd.addColorStop(0.45, '#284470'); bd.addColorStop(1, '#152840');
    g.fillStyle = bd;
    g.beginPath(); g.moveTo(20, 58); g.lineTo(20, 34); g.quadraticCurveTo(20, 22, 32, 22); g.quadraticCurveTo(44, 22, 44, 34); g.lineTo(44, 58); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.16)'; g.beginPath(); g.ellipse(25, 32, 3, 9, -0.1, 0, 7); g.fill();
    g.fillStyle = '#12223a'; g.fillRect(28, 40, 8, 6);                         // pull-down slot
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(28, 40, 8, 1.4);
    g.fillStyle = '#c9a227'; g.font = 'bold 6px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('MAIL', 32, 51);
    g.fillStyle = '#1c1e22'; g.fillRect(24, 56, 4, 4); g.fillRect(36, 56, 4, 4);   // legs
  });

  SPR.trashcan = outlined(g => {                                   // dented galvanized street trash can + lid
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(32, 60, 11, 2.4, 0, 0, 7); g.fill();
    let bd = g.createLinearGradient(21, 0, 43, 0);
    bd.addColorStop(0, '#9aa0a8'); bd.addColorStop(0.5, '#6a6f76'); bd.addColorStop(1, '#3e4247');
    g.fillStyle = bd;
    g.beginPath(); g.moveTo(22, 36); g.lineTo(24, 58); g.lineTo(40, 58); g.lineTo(42, 36); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(23, 44); g.lineTo(41, 44); g.moveTo(23.5, 51); g.lineTo(40.5, 51); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(25, 37, 2, 19);
    let lid = g.createLinearGradient(19, 30, 45, 36);
    lid.addColorStop(0, '#aeb4bb'); lid.addColorStop(1, '#5a5f66');
    g.fillStyle = lid; g.beginPath(); g.ellipse(32, 33, 13, 4, 0, 0, 7); g.fill();
    g.fillStyle = '#2a2d33'; g.fillRect(29, 28, 6, 4);                          // handle
  });

  SPR.bicycle = outlined(g => {                                    // period bicycle, leaned on its kickstand
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(32, 60, 20, 3, 0, 0, 7); g.fill();
    g.strokeStyle = '#1c1e22'; g.lineWidth = 2;
    g.beginPath(); g.arc(18, 54, 10, 0, 7); g.stroke(); g.beginPath(); g.arc(46, 54, 10, 0, 7); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.15)'; g.lineWidth = 0.6;
    for (let i = 0; i < 8; i++) { const a2 = i / 8 * 6.283; g.beginPath(); g.moveTo(18, 54); g.lineTo(18 + Math.cos(a2) * 9.4, 54 + Math.sin(a2) * 9.4); g.stroke(); }
    for (let i = 0; i < 8; i++) { const a2 = i / 8 * 6.283 + 0.3; g.beginPath(); g.moveTo(46, 54); g.lineTo(46 + Math.cos(a2) * 9.4, 54 + Math.sin(a2) * 9.4); g.stroke(); }
    let fr = g.createLinearGradient(14, 20, 50, 54);
    fr.addColorStop(0, '#3a6b3a'); fr.addColorStop(1, '#1e3d1e');
    g.strokeStyle = fr; g.lineWidth = 2.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(18, 54); g.lineTo(30, 30); g.lineTo(46, 54); g.moveTo(30, 30); g.lineTo(26, 54); g.moveTo(30, 30); g.lineTo(34, 22); g.stroke();
    g.fillStyle = '#1c1c1e'; g.beginPath(); g.ellipse(34, 21, 5, 2, -0.3, 0, 7); g.fill();          // seat
    g.strokeStyle = '#8d929c'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(46, 54); g.lineTo(49, 34); g.stroke();
    g.beginPath(); g.moveTo(43, 34); g.lineTo(55, 34); g.stroke();                                  // handlebar
    g.fillStyle = '#3a3d44'; g.fillRect(20, 56, 2, 6);                                              // kickstand
  });

  SPR.trafficlight = outlined(g => {                                // pole-mounted traffic signal, three lamps
    g.fillStyle = 'rgba(0,0,0,0.24)'; g.beginPath(); g.ellipse(32, 61, 7, 1.8, 0, 0, 7); g.fill();
    let pole = g.createLinearGradient(29, 0, 35, 0);
    pole.addColorStop(0, '#3a3d44'); pole.addColorStop(0.5, '#5a5f66'); pole.addColorStop(1, '#1c1e22');
    g.fillStyle = pole; g.fillRect(29.6, 20, 4.8, 41);
    let box = g.createLinearGradient(0, 6, 0, 26);
    box.addColorStop(0, '#2a2d33'); box.addColorStop(1, '#101114');
    g.fillStyle = box; g.fillRect(24, 6, 16, 22);
    bevel(g, 24, 6, 16, 22, 'rgba(255,255,255,0.14)', 'rgba(0,0,0,0.5)');
    const lamp = (cy, on, color) => {
      let lg = g.createRadialGradient(30, cy - 1, 0.5, 32, cy, 4);
      lg.addColorStop(0, on ? '#fff6d8' : 'rgba(255,255,255,0.15)'); lg.addColorStop(0.6, on ? color : 'rgba(40,40,40,0.6)'); lg.addColorStop(1, '#0a0a0a');
      g.fillStyle = lg; g.beginPath(); g.arc(32, cy, 4, 0, 7); g.fill();
    };
    lamp(11, false, '#c92222'); lamp(17, false, '#c9a227'); lamp(23, true, '#3fa84a');
    g.fillStyle = 'rgba(120,220,140,0.25)'; g.beginPath(); g.arc(32, 23, 7, 0, 7); g.fill();   // lit-green glow
  });

  SPR.watertower = outlined(g => {                                  // wooden rooftop water tower on steel legs
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 61, 18, 2.6, 0, 0, 7); g.fill();
    g.strokeStyle = '#2a2d33'; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(20, 60); g.lineTo(26, 30); g.moveTo(44, 60); g.lineTo(38, 30); g.moveTo(24, 46); g.lineTo(40, 46); g.stroke();
    let tank = g.createLinearGradient(16, 8, 48, 32);
    tank.addColorStop(0, '#9a7248'); tank.addColorStop(0.5, '#6b4e2e'); tank.addColorStop(1, '#3e2c18');
    g.fillStyle = tank; g.beginPath(); g.moveTo(17, 30); g.lineTo(20, 10); g.lineTo(44, 10); g.lineTo(47, 30); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,230,190,0.18)'; g.beginPath(); g.moveTo(22, 28); g.lineTo(24, 12); g.lineTo(29, 12); g.lineTo(27, 28); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.8;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(19 + i * 7, 29); g.lineTo(21 + i * 6.6, 11); g.stroke(); }
    let roof = g.createLinearGradient(0, 4, 0, 12);
    roof.addColorStop(0, '#5a4a34'); roof.addColorStop(1, '#2e2414');
    g.fillStyle = roof; g.beginPath(); g.moveTo(15, 10); g.lineTo(32, 3); g.lineTo(49, 10); g.closePath(); g.fill();
  });

  SPR.barrier = outlined(g => {                                     // wooden sawhorse construction barrier
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(32, 58, 22, 3, 0, 0, 7); g.fill();
    g.strokeStyle = '#2a2018'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(14, 56); g.lineTo(26, 30); g.moveTo(50, 56); g.lineTo(38, 30); g.moveTo(20, 56); g.lineTo(32, 30); g.moveTo(44, 56); g.lineTo(32, 30); g.stroke();
    for (let i = 0; i < 3; i++) {
      const y = 30 + i * 8;
      let bd = g.createLinearGradient(0, y, 0, y + 6);
      bd.addColorStop(0, '#e8dcc0'); bd.addColorStop(1, '#c9a227');
      g.fillStyle = bd; g.fillRect(12, y, 40, 6);
      g.fillStyle = '#c23a2e'; g.fillRect(12, y, 12, 6); g.fillRect(36, y, 16, 6);
      g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.strokeRect(12, y, 40, 6);
    }
  });

  SPR.vendingmachine = outlined(g => {                               // cigarette/soda vending machine
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 61, 13, 2.6, 0, 0, 7); g.fill();
    let bd = g.createLinearGradient(15, 8, 49, 60);
    bd.addColorStop(0, '#c23a2e'); bd.addColorStop(0.5, '#8a1e18'); bd.addColorStop(1, '#4a0e0c');
    g.fillStyle = bd; g.fillRect(15, 8, 34, 52);
    bevel(g, 15, 8, 34, 52, 'rgba(255,200,180,0.2)', 'rgba(0,0,0,0.45)');
    g.fillStyle = '#0c0d10'; g.fillRect(19, 13, 26, 20);                        // dark glass front
    for (let i = 0; i < 4; i++) {
      g.fillStyle = ['#e8dcc0', '#c9a860', '#e8e2ce', '#d9c98e'][i];
      g.fillRect(20.5 + i * 6.2, 15, 5, 16);
    }
    g.fillStyle = '#2a1210'; g.fillRect(19, 35, 26, 4);                         // coin slot bar
    g.fillStyle = '#c9a227'; g.beginPath(); g.arc(24, 37, 1.4, 0, 7); g.fill();
    g.fillStyle = '#1c0d0a'; g.fillRect(19, 42, 26, 12);                        // dispenser tray
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(20, 43, 24, 1);
  });
  SPR.vendingmachineTaken = SPR.vendingmachine;   // coin already taken — placeholder until/unless shipped art overrides it

  SPR.flowercart = outlined(g => {                                   // wooden street vendor cart, flowers piled high
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 60, 20, 3, 0, 0, 7); g.fill();
    g.strokeStyle = '#1c1e22'; g.lineWidth = 2;
    g.beginPath(); g.arc(16, 55, 6, 0, 7); g.stroke(); g.beginPath(); g.arc(48, 55, 6, 0, 7); g.stroke();
    let bd = g.createLinearGradient(10, 34, 54, 50);
    bd.addColorStop(0, '#9a6a34'); bd.addColorStop(1, '#5a3a1c');
    g.fillStyle = bd; g.fillRect(10, 38, 44, 14);
    bevel(g, 10, 38, 44, 14, 'rgba(255,220,170,0.2)', 'rgba(0,0,0,0.4)');
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
    for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(10 + i * 8.8, 38); g.lineTo(10 + i * 8.8, 52); g.stroke(); }
    const flower = (x, y, c) => { g.fillStyle = c; for (const [dx, dy] of [[0, -2], [2, 0], [0, 2], [-2, 0]]) { g.beginPath(); g.arc(x + dx, y + dy, 1.6, 0, 7); g.fill(); } g.fillStyle = '#e8d840'; g.beginPath(); g.arc(x, y, 1, 0, 7); g.fill(); };
    g.fillStyle = '#2e6a3a';
    for (let i = 0; i < 8; i++) g.fillRect(13 + i * 5, 24 + (i % 3) * 3, 1.4, 16 - (i % 3) * 3);
    const cols = ['#d8577a', '#e8d840', '#c23a2e', '#8a5cc9', '#e8a840'];
    for (let i = 0; i < 9; i++) flower(13 + i * 4.6, 22 + (i % 4) * 4, cols[i % cols.length]);
  });

  // ---------------------------------------------------------------------------
  // WAVE 2 — HOME PROPS
  // ---------------------------------------------------------------------------
  SPR.bed = outlined(g => {                                        // wooden-frame bed, made up, seen at an angle
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(33, 58, 27, 4, 0, 0, 7); g.fill();
    let hb = g.createLinearGradient(6, 14, 26, 46);                             // headboard
    hb.addColorStop(0, '#9a7248'); hb.addColorStop(1, '#5a3e22');
    g.fillStyle = hb; g.beginPath(); g.moveTo(6, 46); g.lineTo(8, 16); g.quadraticCurveTo(16, 12, 24, 16); g.lineTo(26, 46); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,220,170,0.18)'; g.fillRect(10, 18, 3, 24);
    let sh = g.createLinearGradient(10, 34, 58, 56);                            // sheet/blanket mass
    sh.addColorStop(0, '#e4dcc4'); sh.addColorStop(1, '#b8ac86');
    g.fillStyle = sh; g.beginPath(); g.moveTo(10, 40); g.lineTo(58, 44); g.lineTo(56, 57); g.lineTo(12, 57); g.closePath(); g.fill();
    let bl = g.createLinearGradient(10, 44, 58, 57);                            // top blanket, colored
    bl.addColorStop(0, '#8a3344'); bl.addColorStop(1, '#5a1e2c');
    g.fillStyle = bl; g.beginPath(); g.moveTo(10, 48); g.lineTo(58, 51); g.lineTo(56, 57); g.lineTo(12, 57); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.moveTo(14, 49); g.lineTo(54, 52); g.stroke();
    g.fillStyle = '#f0ead6'; g.beginPath(); g.ellipse(17, 41, 8, 4.4, -0.1, 0, 7); g.fill();          // pillow
    g.fillStyle = 'rgba(0,0,0,0.08)'; g.beginPath(); g.ellipse(17, 42.4, 6, 2, -0.1, 0, 7); g.fill();
    g.fillStyle = '#3e2c18'; g.fillRect(10, 56, 3, 4); g.fillRect(54, 56, 3, 4);                      // legs
  });

  SPR.sofa = outlined(g => {                                        // two-cushion upholstered sofa
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 59, 25, 3.4, 0, 0, 7); g.fill();
    let body = g.createLinearGradient(8, 24, 56, 54);
    body.addColorStop(0, '#3e6b6e'); body.addColorStop(0.5, '#2a4d50'); body.addColorStop(1, '#16302f');
    g.fillStyle = body;
    g.beginPath(); g.moveTo(8, 54); g.lineTo(8, 30); g.quadraticCurveTo(8, 24, 14, 24); g.lineTo(50, 24); g.quadraticCurveTo(56, 24, 56, 30); g.lineTo(56, 54); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(10, 26, 4, 26);
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(50, 26, 4, 26);
    let seat = g.createLinearGradient(0, 38, 0, 54);
    seat.addColorStop(0, '#4a7d80'); seat.addColorStop(1, '#2a4d50');
    g.fillStyle = seat; g.fillRect(11, 38, 42, 16);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(32, 38); g.lineTo(32, 54); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.1)'; g.beginPath(); g.ellipse(21, 41, 9, 3, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(43, 41, 9, 3, 0, 0, 7); g.fill();
    g.fillStyle = '#1e1712'; g.fillRect(12, 54, 3, 4); g.fillRect(49, 54, 3, 4);                       // wooden legs
  });

  SPR.armchair = outlined(g => {                                    // single upholstered armchair
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 59, 17, 3, 0, 0, 7); g.fill();
    let body = g.createLinearGradient(16, 18, 48, 52);
    body.addColorStop(0, '#a8632e'); body.addColorStop(0.5, '#7a4620'); body.addColorStop(1, '#4a2a12');
    g.fillStyle = body;
    g.beginPath(); g.moveTo(16, 52); g.lineTo(16, 26); g.quadraticCurveTo(16, 18, 24, 18); g.lineTo(40, 18); g.quadraticCurveTo(48, 18, 48, 26); g.lineTo(48, 52); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,220,170,0.16)'; g.fillRect(18, 20, 4, 22);
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(44, 20, 4, 22);
    g.fillStyle = '#8a4e26'; g.fillRect(12, 36, 8, 14); g.fillRect(44, 36, 8, 14);                     // armrests
    bevel(g, 12, 36, 8, 14, 'rgba(255,220,170,0.2)', 'rgba(0,0,0,0.3)');
    bevel(g, 44, 36, 8, 14, 'rgba(255,220,170,0.2)', 'rgba(0,0,0,0.3)');
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.ellipse(32, 40, 12, 5, 0, 0, 7); g.fill();
    g.fillStyle = '#2e1c0e'; g.fillRect(18, 52, 3, 5); g.fillRect(43, 52, 3, 5);
  });

  SPR.diningtable = outlined(g => {                                 // set dining table with a cloth
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(32, 58, 24, 3.4, 0, 0, 7); g.fill();
    let cloth = g.createLinearGradient(6, 28, 58, 44);
    cloth.addColorStop(0, '#e4dcc4'); cloth.addColorStop(1, '#b8ac86');
    g.fillStyle = cloth; g.beginPath(); g.ellipse(32, 34, 26, 8, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(32, 32, 20, 5.4, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.ellipse(32, 38, 24, 5, 0, Math.PI * 0.05, Math.PI * 0.95); g.fill();
    g.fillStyle = 'rgba(120,60,30,0.4)'; g.fillRect(20, 38, 24, 20);              // wood legs seen through cloth hem
    g.fillStyle = '#e8e2ce'; g.beginPath(); g.arc(24, 33, 3.4, 0, 7); g.fill();   // plate
    g.fillStyle = '#8a1414'; g.beginPath(); g.ellipse(24, 33, 1.6, 1, 0, 0, 7); g.fill();
    g.fillStyle = '#c9ccd4'; g.fillRect(28.5, 31.4, 0.8, 3.4);                    // fork
    g.fillStyle = '#d8ecf4'; g.beginPath(); g.moveTo(41, 30); g.lineTo(45, 30); g.lineTo(43.4, 34); g.fill();   // wine glass
    g.fillRect(42.8, 34, 0.6, 2);
  });

  SPR.bookshelf = outlined(g => {                                   // wooden shelving, packed with colorful spines
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(32, 61, 19, 2.6, 0, 0, 7); g.fill();
    let bd = g.createLinearGradient(11, 6, 53, 60);
    bd.addColorStop(0, '#8a5c30'); bd.addColorStop(1, '#4a2e14');
    g.fillStyle = bd; g.fillRect(11, 6, 42, 54);
    bevel(g, 11, 6, 42, 54, 'rgba(255,220,170,0.18)', 'rgba(0,0,0,0.4)');
    const shelf = (y) => {
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(13, y, 38, 2);
      let x = 15;
      while (x < 47) {
        const w = 2 + Math.random() * 2.4, h = 9 + Math.random() * 3;
        g.fillStyle = ['#8a3344', '#2e6a5c', '#c9a227', '#3a4a8a', '#a85c2e', '#5c3a8a'][(Math.random() * 6) | 0];
        g.fillRect(x, y - h, w, h);
        g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(x, y - h, 0.6, h);
        x += w + 0.6;
      }
    };
    shelf(24); shelf(38); shelf(52); shelf(60);
  });

  SPR.icebox = outlined(g => {                                      // rounded-corner 1960s refrigerator
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 61, 13, 2.6, 0, 0, 7); g.fill();
    let bd = g.createLinearGradient(18, 0, 46, 0);
    bd.addColorStop(0, '#eceae2'); bd.addColorStop(0.5, '#cfcabb'); bd.addColorStop(1, '#9a9587');
    g.fillStyle = bd;
    g.beginPath(); g.moveTo(19, 60); g.lineTo(19, 12); g.quadraticCurveTo(19, 6, 25, 6); g.lineTo(39, 6); g.quadraticCurveTo(45, 6, 45, 12); g.lineTo(45, 60); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(22, 9, 3, 18);
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(19, 28, 26, 1.6);                // freezer seam
    g.fillStyle = '#3a3d44'; g.fillRect(40, 12, 2.4, 12); g.fillRect(40, 34, 2.4, 22);   // chrome handles
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(40, 12, 0.8, 12);
    g.fillStyle = '#c9a227'; g.fillRect(20, 30, 6, 3);                            // brand badge
  });

  SPR.recordplayer = outlined(g => {                                 // wooden hi-fi console with an open lid
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 58, 22, 3, 0, 0, 7); g.fill();
    let bd = g.createLinearGradient(8, 34, 56, 54);
    bd.addColorStop(0, '#7a4e26'); bd.addColorStop(1, '#3e2812');
    g.fillStyle = bd; g.fillRect(8, 38, 48, 16);
    bevel(g, 8, 38, 48, 16, 'rgba(255,220,170,0.2)', 'rgba(0,0,0,0.4)');
    g.fillStyle = '#4a5044'; g.fillRect(10, 40, 14, 12);                          // speaker cloth
    for (let i = 0; i < 4; i++) g.fillRect(11 + i * 3.4, 41, 0.8, 10);
    let lid = g.createLinearGradient(24, 16, 56, 38);                            // open lid at an angle
    lid.addColorStop(0, '#9a6a34'); lid.addColorStop(1, '#5a3a1c');
    g.fillStyle = lid; g.beginPath(); g.moveTo(26, 38); g.lineTo(30, 16); g.lineTo(58, 18); g.lineTo(56, 38); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1;
    let plt = g.createRadialGradient(43, 30, 1, 43, 30, 9);                      // turntable platter
    plt.addColorStop(0, '#2a2d33'); plt.addColorStop(1, '#0e0f12');
    g.fillStyle = plt; g.beginPath(); g.ellipse(43, 30, 10, 5, 0, 0, 7); g.fill();
    g.fillStyle = '#c9a227'; g.beginPath(); g.ellipse(43, 30, 1.4, 0.8, 0, 0, 7); g.fill();
    g.strokeStyle = '#8d929c'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(52, 27); g.lineTo(56, 24); g.stroke();  // tonearm
  });

  SPR.wardrobe = outlined(g => {                                     // tall double-door armoire
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 62, 16, 2.6, 0, 0, 7); g.fill();
    let bd = g.createLinearGradient(15, 4, 49, 60);
    bd.addColorStop(0, '#6b4a28'); bd.addColorStop(1, '#3a2410');
    g.fillStyle = bd; g.fillRect(15, 4, 34, 58);
    bevel(g, 15, 4, 34, 58, 'rgba(255,220,170,0.18)', 'rgba(0,0,0,0.42)');
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(32, 4); g.lineTo(32, 62); g.stroke();
    g.strokeStyle = 'rgba(255,220,170,0.14)'; g.lineWidth = 1;
    g.strokeRect(19, 9, 11, 48); g.strokeRect(34, 9, 11, 48);                     // panel insets
    g.fillStyle = '#c9a227'; g.fillRect(28, 30, 2, 5); g.fillRect(34, 30, 2, 5);  // handles
    g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(20, 10, 2, 46);
  });

  // ---------------------------------------------------------------------------
  // WAVE 3 — WORK PROPS
  // ---------------------------------------------------------------------------
  SPR.officechair = outlined(g => {                                 // wheeled swivel chair, leather back
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(32, 60, 13, 2.6, 0, 0, 7); g.fill();
    g.strokeStyle = '#2a2d33'; g.lineWidth = 2;                                 // star base + casters
    for (let i = 0; i < 5; i++) { const a2 = i / 5 * 6.283; g.beginPath(); g.moveTo(32, 56); g.lineTo(32 + Math.cos(a2) * 13, 56 + Math.sin(a2) * 4); g.stroke(); }
    g.fillStyle = '#1c1e22'; for (let i = 0; i < 5; i++) { const a2 = i / 5 * 6.283; g.beginPath(); g.arc(32 + Math.cos(a2) * 13, 56 + Math.sin(a2) * 4, 1.6, 0, 7); g.fill(); }
    g.fillStyle = '#3a3d44'; g.fillRect(30, 40, 4, 16);                          // gas-lift post
    let seat = g.createLinearGradient(0, 34, 0, 44);
    seat.addColorStop(0, '#3a2418'); seat.addColorStop(1, '#1c120a');
    g.fillStyle = seat; g.beginPath(); g.ellipse(32, 38, 13, 5, 0, 0, 7); g.fill();
    let back = g.createLinearGradient(18, 10, 46, 36);
    back.addColorStop(0, '#4a2e1c'); back.addColorStop(1, '#22140c');
    g.fillStyle = back; g.beginPath(); g.moveTo(19, 34); g.quadraticCurveTo(17, 14, 24, 10); g.lineTo(40, 10); g.quadraticCurveTo(47, 14, 45, 34); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.1)'; g.beginPath(); g.ellipse(26, 20, 4, 10, -0.1, 0, 7); g.fill();
    g.fillStyle = '#1c1e22'; g.fillRect(17, 26, 6, 12); g.fillRect(41, 26, 6, 12);   // armrests
  });

  SPR.watercooler = outlined(g => {                                  // office water cooler, jug on top
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(32, 60, 10, 2.4, 0, 0, 7); g.fill();
    let bd = g.createLinearGradient(23, 0, 41, 0);
    bd.addColorStop(0, '#e8ecf0'); bd.addColorStop(0.5, '#c2c8ce'); bd.addColorStop(1, '#8a9096');
    g.fillStyle = bd; g.fillRect(23, 34, 18, 26);
    bevel(g, 23, 34, 18, 26, 'rgba(255,255,255,0.4)', 'rgba(0,0,0,0.3)');
    g.fillStyle = '#0c0d10'; g.fillRect(26, 40, 12, 8);                          // dispenser recess
    g.fillStyle = '#3a4a8a'; g.fillRect(28, 42, 3, 4);                          // hot/cold spigots
    g.fillStyle = '#8a1414'; g.fillRect(33, 42, 3, 4);
    let jug = g.createRadialGradient(32, 20, 2, 32, 22, 12);
    jug.addColorStop(0, 'rgba(210,230,240,0.55)'); jug.addColorStop(0.7, 'rgba(120,170,195,0.5)'); jug.addColorStop(1, 'rgba(60,100,120,0.6)');
    g.fillStyle = jug; g.beginPath(); g.moveTo(24, 34); g.quadraticCurveTo(22, 20, 27, 12); g.lineTo(37, 12); g.quadraticCurveTo(42, 20, 40, 34); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(28, 22, 2, 10, -0.1, 0, 7); g.fill();
    g.fillStyle = '#4a5a5e'; g.fillRect(29, 8, 6, 4);                            // cap
  });

  SPR.coatrack = outlined(g => {                                     // standing wooden coat rack, a coat hung
    g.fillStyle = 'rgba(0,0,0,0.24)'; g.beginPath(); g.ellipse(32, 61, 9, 2, 0, 0, 7); g.fill();
    let pole = g.createLinearGradient(29, 0, 35, 0);
    pole.addColorStop(0, '#8a5c30'); pole.addColorStop(0.5, '#6b4520'); pole.addColorStop(1, '#3e2812');
    g.fillStyle = pole; g.fillRect(29.6, 12, 4.8, 48);
    g.fillStyle = '#3e2812'; g.beginPath(); g.moveTo(20, 60); g.lineTo(24, 54); g.lineTo(40, 54); g.lineTo(44, 60); g.closePath(); g.fill();  // splayed base
    g.fillStyle = '#5a3a1e';                                                     // hook pegs
    for (const [hx, hy, r] of [[26, 16, 0.6], [38, 18, -0.6], [24, 24, 0.9], [40, 26, -0.9]]) {
      g.save(); g.translate(hx, hy); g.rotate(r); g.fillRect(0, -1.4, 8, 2.8); g.restore();
    }
    let coat = g.createLinearGradient(18, 20, 46, 48);                           // a hung overcoat
    coat.addColorStop(0, '#3a3f48'); coat.addColorStop(1, '#181b20');
    g.fillStyle = coat; g.beginPath(); g.moveTo(24, 22); g.lineTo(20, 48); g.lineTo(44, 48); g.lineTo(40, 22); g.quadraticCurveTo(32, 26, 24, 22); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.1)'; g.beginPath(); g.moveTo(26, 24); g.lineTo(23, 47); g.stroke();
    g.fillStyle = '#0c0d10'; g.beginPath(); g.arc(31, 10, 3, 0, 7); g.fill();     // a hat on top
    g.fillStyle = 'rgba(255,255,255,0.15)'; g.beginPath(); g.ellipse(29, 9, 1.4, 0.8, -0.3, 0, 7); g.fill();
  });

  SPR.corkboard = outlined(g => {                                    // freestanding bulletin board, pinned notices
    g.fillStyle = 'rgba(0,0,0,0.24)'; g.beginPath(); g.ellipse(32, 61, 16, 2.4, 0, 0, 7); g.fill();
    let fr = g.createLinearGradient(10, 6, 54, 54);
    fr.addColorStop(0, '#9a6a34'); fr.addColorStop(1, '#5a3a1c');
    g.fillStyle = fr; g.fillRect(10, 6, 44, 48);
    g.fillStyle = '#c9a06a'; g.fillRect(14, 10, 36, 40);                         // cork surface
    speck(g, 200, 'rgba(90,58,24,0.18)'); speck(g, 100, 'rgba(230,190,140,0.12)');
    const note = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 0.6; g.strokeRect(x, y, w, h); g.fillStyle = '#8a1414'; g.beginPath(); g.arc(x + w / 2, y + 1.5, 0.8, 0, 7); g.fill(); };
    note(17, 14, 9, 11, '#eee6d4'); note(29, 13, 8, 10, '#e0c890'); note(40, 15, 8, 12, '#f0ead6');
    g.strokeStyle = 'rgba(180,20,20,0.6)'; g.lineWidth = 1;                      // red string linking pins
    g.beginPath(); g.moveTo(21, 20); g.lineTo(33, 18); g.lineTo(44, 21); g.stroke();
    g.fillStyle = '#c9a227'; g.fillRect(16, 28, 20, 6);                          // a map clipping
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.strokeRect(16, 28, 20, 6);
    bevel(g, 10, 6, 44, 48, 'rgba(255,220,170,0.16)', 'rgba(0,0,0,0.4)');
  });

  SPR.cashregister = outlined(g => {                                  // brass-trimmed mechanical till
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 58, 16, 2.6, 0, 0, 7); g.fill();
    let bd = g.createLinearGradient(15, 24, 49, 52);
    bd.addColorStop(0, '#3a3d44'); bd.addColorStop(0.5, '#1c1e22'); bd.addColorStop(1, '#0a0b0d');
    g.fillStyle = bd; g.beginPath(); g.moveTo(15, 52); g.lineTo(17, 30); g.quadraticCurveTo(17, 24, 24, 24); g.lineTo(40, 24); g.quadraticCurveTo(47, 24, 47, 30); g.lineTo(49, 52); g.closePath(); g.fill();
    g.fillStyle = '#c9a227'; g.fillRect(15, 50, 34, 4);                          // brass base trim
    g.fillStyle = 'rgba(255,242,192,0.5)'; g.fillRect(15, 50, 34, 1);
    g.fillStyle = '#0c0d10'; g.fillRect(21, 28, 22, 8);                          // amount window
    g.fillStyle = '#e8dca0'; g.font = 'bold 7px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('1.35', 32, 32.5);
    g.fillStyle = '#c9ccd4';                                                     // key rows
    for (let r = 0; r < 2; r++) for (let c2 = 0; c2 < 6; c2++) { g.beginPath(); g.arc(19 + c2 * 5, 41 + r * 5, 1.6, 0, 7); g.fill(); }
    g.fillStyle = '#c9a227'; g.beginPath(); g.arc(45, 38, 3, 0, 7); g.fill();     // side crank
    g.strokeStyle = '#8a6a1e'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(45, 38); g.lineTo(50, 33); g.stroke();
  });

  SPR.wallmap = outlined(g => {                                       // large framed regional map on an easel
    g.fillStyle = 'rgba(0,0,0,0.24)'; g.beginPath(); g.ellipse(32, 61, 17, 2.2, 0, 0, 7); g.fill();
    g.strokeStyle = '#3e2812'; g.lineWidth = 2.4;                                // easel legs
    g.beginPath(); g.moveTo(16, 60); g.lineTo(24, 12); g.moveTo(48, 60); g.lineTo(40, 12); g.moveTo(20, 44); g.lineTo(44, 44); g.stroke();
    let fr = g.createLinearGradient(10, 6, 54, 46);
    fr.addColorStop(0, '#8a5c30'); fr.addColorStop(1, '#4a2e14');
    g.fillStyle = fr; g.fillRect(10, 6, 44, 40);
    let map = g.createLinearGradient(13, 9, 51, 43);
    map.addColorStop(0, '#d8cba0'); map.addColorStop(1, '#b8a878');
    g.fillStyle = map; g.fillRect(13, 9, 38, 34);
    g.fillStyle = 'rgba(90,120,140,0.55)';                                       // coastline / sea
    g.beginPath(); g.moveTo(13, 30); g.lineTo(25, 26); g.lineTo(30, 32); g.lineTo(20, 43); g.lineTo(13, 43); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(60,40,10,0.4)'; g.lineWidth = 0.6;                     // contour/border lines
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(15, 12 + i * 6); g.lineTo(49, 10 + i * 6.4); g.stroke(); }
    g.strokeStyle = 'rgba(180,20,20,0.7)'; g.lineWidth = 1;                      // a marked route
    g.beginPath(); g.moveTo(18, 38); g.lineTo(30, 22); g.lineTo(46, 16); g.stroke();
    g.fillStyle = '#8a1414'; g.beginPath(); g.arc(46, 16, 1.6, 0, 7); g.fill();
    bevel(g, 10, 6, 44, 40, 'rgba(255,220,170,0.18)', 'rgba(0,0,0,0.4)');
  });

  SPR.conftable = outlined(g => {                                     // long conference table, chairs implied
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 56, 30, 5, 0, 0, 7); g.fill();
    let top = g.createLinearGradient(0, 30, 0, 44);
    top.addColorStop(0, '#7a4e26'); top.addColorStop(1, '#4a2e14');
    g.fillStyle = top; g.beginPath(); g.ellipse(32, 37, 30, 9, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,220,170,0.2)'; g.beginPath(); g.ellipse(32, 34, 26, 6, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 0.6;
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(6, 37 + i * 0.5); g.quadraticCurveTo(32, 40 + i * 0.5, 58, 37 + i * 0.5); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(32, 43, 29, 6, 0, 0.05, Math.PI - 0.05); g.fill();
    g.fillStyle = '#2a1c10'; g.fillRect(14, 42, 3, 12); g.fillRect(47, 42, 3, 12);   // legs
    const chair = (x) => { g.fillStyle = '#1c1e22'; g.beginPath(); g.ellipse(x, 50, 4, 2.2, 0, 0, 7); g.fill(); g.fillRect(x - 3, 45, 6, 5); };
    chair(12); chair(52);
  });

  SPR.punchclock = outlined(g => {                                    // wall-mounted time clock, card slot below
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(32, 61, 9, 1.8, 0, 0, 7); g.fill();
    let bd = g.createLinearGradient(18, 6, 46, 54);
    bd.addColorStop(0, '#5a5f42'); bd.addColorStop(1, '#2e321e');
    g.fillStyle = bd; g.fillRect(18, 6, 28, 48);
    bevel(g, 18, 6, 28, 48, 'rgba(255,255,255,0.14)', 'rgba(0,0,0,0.42)');
    let face = g.createRadialGradient(30, 18, 1, 32, 20, 11);
    face.addColorStop(0, '#f4efe0'); face.addColorStop(1, '#c9c2a8');
    g.fillStyle = face; g.beginPath(); g.arc(32, 20, 10, 0, 7); g.fill();
    g.strokeStyle = '#2a2818'; g.lineWidth = 1.4; g.beginPath(); g.arc(32, 20, 10, 0, 7); g.stroke();
    g.fillStyle = '#1c150e'; for (let i = 0; i < 12; i++) { const a2 = i / 12 * 6.283; g.beginPath(); g.arc(32 + Math.cos(a2) * 8, 20 + Math.sin(a2) * 8, 0.6, 0, 7); g.fill(); }
    g.strokeStyle = '#1c150e'; g.lineWidth = 1.2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(32, 20); g.lineTo(32, 14); g.stroke();
    g.beginPath(); g.moveTo(32, 20); g.lineTo(37, 22); g.stroke();
    g.fillStyle = '#0c0d10'; g.fillRect(22, 36, 20, 5);                          // card slot
    g.fillStyle = '#e8dca0'; g.fillRect(24, 30, 4, 8);                           // a punch card, half-fed
    g.fillStyle = '#c9a227'; g.fillRect(20, 44, 24, 6);                          // brass mechanism plate
  });

  // ---------------------------------------------------------------------------
  // MIDEAST CITY props — bazaar clutter for a Casablanca/Indiana-Jones quarter.
  // ---------------------------------------------------------------------------
  SPR.bazaarstall = outlined(g => {                                   // market stall, striped awning + goods laid out
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 61, 22, 3.4, 0, 0, 7); g.fill();
    g.fillStyle = '#5c4222'; g.fillRect(8, 20, 3, 40); g.fillRect(53, 20, 3, 40);          // posts
    g.fillStyle = '#3a2c14'; g.fillRect(8, 20, 3, 3); g.fillRect(53, 20, 3, 3);
    const stripes = ['#c9333a', '#e8dcc0'];
    for (let i = 0; i < 10; i++) { g.fillStyle = stripes[i % 2]; g.beginPath(); g.moveTo(6 + i * 5.2, 10); g.lineTo(11 + i * 5.2, 10); g.lineTo(13 + i * 5.2, 22); g.lineTo(4 + i * 5.2, 22); g.closePath(); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.moveTo(6, 22); g.lineTo(58, 22); g.lineTo(58, 25); g.lineTo(6, 25); g.closePath(); g.fill();
    let tb = g.createLinearGradient(8, 38, 56, 50);                    // table
    tb.addColorStop(0, '#a8794a'); tb.addColorStop(1, '#7a5430');
    g.fillStyle = tb; g.fillRect(8, 38, 48, 5); g.fillRect(11, 43, 4, 15); g.fillRect(49, 43, 4, 15);
    const goods = [['#b8542e', 34], ['#c9a227', 38], ['#3a7a3a', 30], ['#8a1414', 36], ['#d8a840', 32]];
    goods.forEach(([col, x], i) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, 34 - (i % 2) * 3, 5.5, 4, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.15)'; g.beginPath(); g.ellipse(x - 1.5, 32 - (i % 2) * 3, 2, 1.4, 0, 0, 7); g.fill(); });
    g.fillStyle = '#c9a06a'; g.fillRect(6, 46.5, 14, 4);                // rolled rug leaning on the table
    g.strokeStyle = '#8a1414'; g.lineWidth = 1; for (let x = 8; x < 20; x += 3) { g.beginPath(); g.moveTo(x, 46.5); g.lineTo(x, 50.5); g.stroke(); }
  });

  SPR.spicesacks = outlined(g => {                                    // burlap sacks piled with mounded spice
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 60, 18, 4, 0, 0, 7); g.fill();
    const sack = (cx, cy, w, h, col) => {
      let sg = g.createLinearGradient(cx - w, cy - h, cx + w, cy + h);
      sg.addColorStop(0, '#c9b078'); sg.addColorStop(1, '#a08850');
      g.fillStyle = sg; g.beginPath(); g.ellipse(cx, cy, w, h, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(90,70,35,0.4)'; g.lineWidth = 0.8;
      for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(cx - w + 3, cy + i * h * 0.5); g.lineTo(cx + w - 3, cy + i * h * 0.5); g.stroke(); }
      g.fillStyle = col; g.beginPath(); g.ellipse(cx, cy - h * 0.55, w * 0.7, h * 0.5, 0, Math.PI, 0, true); g.fill();  // mounded spice on top
      g.fillStyle = 'rgba(0,0,0,0.15)'; g.beginPath(); g.ellipse(cx, cy - h * 0.55, w * 0.7, h * 0.5, 0, 0, Math.PI); g.fill();
    };
    sack(18, 48, 11, 12, '#c9642e'); sack(38, 50, 12, 13, '#a83a2a'); sack(28, 34, 10, 11, '#d8a012');
  });

  SPR.brasslantern = outlined(g => {                                  // ornate hanging brass lantern, star-cut piercings
    g.strokeStyle = '#4a3a1a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(32, 2); g.lineTo(32, 12); g.stroke();  // chain
    let bg = g.createLinearGradient(20, 12, 44, 46);
    bg.addColorStop(0, '#e8c860'); bg.addColorStop(0.5, '#b8892c'); bg.addColorStop(1, '#7a5a18');
    g.fillStyle = bg;
    g.beginPath(); g.moveTo(32, 12); g.lineTo(24, 18); g.lineTo(22, 32); g.lineTo(26, 44); g.lineTo(38, 44); g.lineTo(42, 32); g.lineTo(40, 18); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,240,180,0.85)';                            // warm glow through the piercings
    for (const [px, py] of [[28, 24], [36, 24], [32, 30], [28, 36], [36, 36]]) { g.beginPath(); g.arc(px, py, 1.8, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(60,42,10,0.4)'; g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(24, 18); g.lineTo(40, 18); g.moveTo(22, 32); g.lineTo(42, 32); g.stroke();
    g.fillStyle = '#8a6a20'; g.beginPath(); g.moveTo(24, 44); g.lineTo(40, 44); g.lineTo(36, 50); g.lineTo(28, 50); g.closePath(); g.fill();  // finial base
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.ellipse(27, 20, 2, 5, -0.2, 0, 7); g.fill();  // brass sheen
  });

  SPR.hookah = outlined(g => {                                        // brass water pipe, glass base, coiled hose
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 61, 12, 3, 0, 0, 7); g.fill();
    let base = g.createRadialGradient(28, 50, 2, 32, 52, 14);
    base.addColorStop(0, 'rgba(160,210,225,0.55)'); base.addColorStop(1, 'rgba(60,110,120,0.35)');
    g.fillStyle = base; g.beginPath(); g.ellipse(32, 52, 11, 10, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(200,235,240,0.5)'; g.lineWidth = 1; g.beginPath(); g.ellipse(32, 52, 11, 10, 0, 0, 7); g.stroke();
    let stem = g.createLinearGradient(28, 14, 36, 44);
    stem.addColorStop(0, '#e8c860'); stem.addColorStop(1, '#a8792c');
    g.fillStyle = stem; g.fillRect(29.5, 14, 5, 30);
    g.fillStyle = '#c9a227'; g.beginPath(); g.ellipse(32, 44, 6, 3, 0, 0, 7); g.fill();
    g.fillStyle = '#e8c860'; g.beginPath(); g.ellipse(32, 15, 7, 4, 0, 0, 7); g.fill();   // bowl
    g.fillStyle = '#3a2c14'; g.beginPath(); g.ellipse(32, 13, 4, 2.4, 0, 0, 7); g.fill();  // tobacco
    g.strokeStyle = '#8a1414'; g.lineWidth = 2.4; g.lineCap = 'round';                    // coiled hose
    g.beginPath(); g.moveTo(37, 40); g.quadraticCurveTo(48, 42, 46, 50); g.quadraticCurveTo(44, 56, 50, 58); g.stroke();
    g.fillStyle = '#c9a06a'; g.beginPath(); g.arc(50, 58, 2, 0, 7); g.fill();             // mouthpiece
  });

  SPR.urn = outlined(g => {                                           // large ceramic amphora/urn
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 60, 12, 3, 0, 0, 7); g.fill();
    let ug = g.createLinearGradient(18, 10, 46, 56);
    ug.addColorStop(0, '#d8a860'); ug.addColorStop(0.5, '#b8792e'); ug.addColorStop(1, '#7a4c1a');
    g.fillStyle = ug;
    g.beginPath(); g.moveTo(27, 10); g.lineTo(37, 10); g.lineTo(41, 20); g.quadraticCurveTo(45, 34, 38, 46); g.quadraticCurveTo(36, 56, 32, 57); g.quadraticCurveTo(28, 56, 26, 46); g.quadraticCurveTo(19, 34, 23, 20); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.moveTo(36, 20); g.quadraticCurveTo(40, 34, 35, 46); g.lineTo(32, 46); g.quadraticCurveTo(37, 34, 33, 20); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,240,200,0.2)'; g.beginPath(); g.ellipse(27, 28, 2.4, 10, -0.1, 0, 7); g.fill();
    g.strokeStyle = 'rgba(90,60,20,0.4)'; g.lineWidth = 1;             // geometric band decoration
    g.beginPath(); g.moveTo(23, 30); g.lineTo(41, 30); g.stroke();
    g.strokeStyle = 'rgba(60,40,15,0.5)'; g.lineWidth = 0.8;
    for (let x = 24; x < 41; x += 3) { g.beginPath(); g.moveTo(x, 27); g.lineTo(x + 1.5, 30); g.lineTo(x, 33); g.stroke(); }
    g.fillStyle = '#7a4c1a'; g.beginPath(); g.ellipse(32, 10, 6, 2, 0, 0, 7); g.fill();   // mouth rim
    g.strokeStyle = '#5c3a14'; g.lineWidth = 2; g.beginPath(); g.moveTo(22, 16); g.quadraticCurveTo(18, 22, 22, 28); g.stroke();  // handle
    g.beginPath(); g.moveTo(42, 16); g.quadraticCurveTo(46, 22, 42, 28); g.stroke();
  });

  SPR.cratesarabic = outlined(g => {                                  // stenciled wooden crate stack, Arabic-market goods
    let cg = g.createLinearGradient(8, 20, 56, 58);
    cg.addColorStop(0, '#c9a06a'); cg.addColorStop(1, '#8a6438');
    g.fillStyle = cg; g.fillRect(10, 34, 22, 22); g.fillRect(34, 30, 20, 26); g.fillRect(14, 14, 22, 22);
    g.strokeStyle = 'rgba(60,40,18,0.5)'; g.lineWidth = 1;
    g.strokeRect(10, 34, 22, 22); g.strokeRect(34, 30, 20, 26); g.strokeRect(14, 14, 22, 22);
    g.strokeStyle = 'rgba(0,0,0,0.2)';
    for (const [x, y, w, h] of [[10, 34, 22, 22], [34, 30, 20, 26], [14, 14, 22, 22]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + h); g.moveTo(x + w, y); g.lineTo(x, y + h); g.stroke(); }
    g.fillStyle = 'rgba(140,50,30,0.55)';                              // stenciled star mark
    const star6 = (cx, cy, r) => { g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); g.fill(); };
    star6(21, 45, 5); star6(44, 43, 4.4); star6(25, 25, 4.4);
    speck(g, 30, 'rgba(0,0,0,0.1)');
  });

  SPR.well = outlined(g => {                                          // round stone well with a rope and bucket
    g.fillStyle = 'rgba(0,0,0,0.32)'; g.beginPath(); g.ellipse(32, 61, 18, 3.6, 0, 0, 7); g.fill();
    g.fillStyle = '#3a3226'; g.fillRect(14, 24, 3, 30); g.fillRect(47, 24, 3, 30);         // support posts
    g.strokeStyle = '#241c14'; g.lineWidth = 2; g.beginPath(); g.moveTo(14, 24); g.lineTo(50, 24); g.stroke();  // crossbar
    g.fillStyle = '#5c4222'; g.beginPath(); g.moveTo(28, 20); g.lineTo(36, 20); g.lineTo(32, 26); g.closePath(); g.fill();  // little roof peak
    let sg = g.createLinearGradient(10, 34, 54, 58);
    sg.addColorStop(0, '#9a9082'); sg.addColorStop(0.5, '#7a7264'); sg.addColorStop(1, '#524c40');
    g.fillStyle = sg; g.beginPath(); g.ellipse(32, 48, 20, 12, 0, 0, 7); g.fill();
    g.fillStyle = '#1c1a16'; g.beginPath(); g.ellipse(32, 46, 13, 6, 0, 0, 7); g.fill();   // dark opening
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1;
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.ellipse(32, 48, 20 - i * 0, 12, 0, 0, 7); g.stroke(); }
    for (let x = 14; x <= 50; x += 6) { g.beginPath(); g.moveTo(x, 40); g.lineTo(x, 58); g.stroke(); }  // stone courses
    g.strokeStyle = '#8a6a3a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(32, 24); g.lineTo(32, 40); g.stroke();  // rope down
    g.fillStyle = '#5c4222'; g.fillRect(29, 39, 6, 5);                 // bucket
    g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(29.5, 39.5, 1.4, 4);
  });

  SPR.handcart = outlined(g => {                                      // wooden market handcart / barrow, laden
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 58, 22, 4, 0, 0, 7); g.fill();
    g.fillStyle = '#241a10'; g.beginPath(); g.arc(16, 50, 7, 0, 7); g.fill(); g.beginPath(); g.arc(46, 50, 7, 0, 7); g.fill();  // wheels
    g.fillStyle = '#5c4222'; g.beginPath(); g.arc(16, 50, 2, 0, 7); g.fill(); g.beginPath(); g.arc(46, 50, 2, 0, 7); g.fill();
    g.strokeStyle = '#8a6a3a'; g.lineWidth = 0.8;
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; g.beginPath(); g.moveTo(16, 50); g.lineTo(16 + Math.cos(a) * 6.5, 50 + Math.sin(a) * 6.5); g.stroke(); g.beginPath(); g.moveTo(46, 50); g.lineTo(46 + Math.cos(a) * 6.5, 50 + Math.sin(a) * 6.5); g.stroke(); }
    let bed = g.createLinearGradient(8, 30, 54, 48);
    bed.addColorStop(0, '#a8794a'); bed.addColorStop(1, '#7a5430');
    g.fillStyle = bed; g.beginPath(); g.moveTo(9, 46); g.lineTo(6, 32); g.lineTo(56, 32); g.lineTo(53, 46); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(60,40,18,0.4)'; g.lineWidth = 1; for (let x = 10; x < 54; x += 6) { g.beginPath(); g.moveTo(x, 32); g.lineTo(x - 1, 46); g.stroke(); }
    const goods = [['#b8542e', 18, 26], ['#3a7a3a', 28, 24], ['#d8a840', 38, 26], ['#8a1414', 46, 24]];
    goods.forEach(([col, x, y]) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, 5, 4, 0, 0, 7); g.fill(); });
    g.strokeStyle = '#3a2c14'; g.lineWidth = 2; g.beginPath(); g.moveTo(6, 34); g.lineTo(-4, 40); g.moveTo(6, 38); g.lineTo(-4, 44); g.stroke();  // handles
  });

  // ---------------------------------------------------------------------------
  // SWINGING 60s PARIS props — bistro/boulevard clutter for a Left Bank quarter.
  // ---------------------------------------------------------------------------
  SPR.cafetable = outlined(g => {                                     // round marble bistro table + wire chair
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(30, 60, 20, 4, 0, 0, 7); g.fill();
    g.strokeStyle = '#2a2622'; g.lineWidth = 2.2;                     // wire cafe chair, seen behind
    g.beginPath(); g.moveTo(46, 58); g.lineTo(46, 40); g.quadraticCurveTo(46, 32, 52, 30); g.stroke();
    g.beginPath(); g.moveTo(38, 44); g.lineTo(52, 44); g.stroke();
    for (let x = 39; x <= 51; x += 3) { g.beginPath(); g.moveTo(x, 44); g.lineTo(x, 58); g.stroke(); }
    let leg = g.createLinearGradient(0, 40, 0, 58);
    leg.addColorStop(0, '#2c2a26'); leg.addColorStop(1, '#141210');
    g.strokeStyle = leg; g.lineWidth = 2;                              // table pedestal
    g.beginPath(); g.moveTo(20, 58); g.lineTo(20, 42); g.stroke();
    g.beginPath(); g.moveTo(12, 58); g.lineTo(28, 58); g.stroke();
    let top = g.createRadialGradient(16, 34, 1, 20, 36, 15);
    top.addColorStop(0, '#f0ece2'); top.addColorStop(0.6, '#d4cebe'); top.addColorStop(1, '#a8a294');
    g.fillStyle = top; g.beginPath(); g.ellipse(20, 36, 15, 5.6, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(90,84,70,0.4)'; g.lineWidth = 0.8; g.beginPath(); g.ellipse(20, 36, 15, 5.6, 0, 0, 7); g.stroke();
    g.fillStyle = '#1c1e22'; g.fillRect(15, 30, 4, 5);                 // demitasse cup
    g.fillStyle = '#e8dca0'; g.fillRect(15, 30, 4, 1.4);
  });

  SPR.streetkiosk = outlined(g => {                                   // Colonne Morris advertising kiosk
    g.fillStyle = 'rgba(0,0,0,0.32)'; g.beginPath(); g.ellipse(32, 61, 14, 3.2, 0, 0, 7); g.fill();
    let cg = g.createLinearGradient(16, 10, 48, 58);
    cg.addColorStop(0, '#3a6a4a'); cg.addColorStop(0.5, '#254a32'); cg.addColorStop(1, '#12281a');
    g.fillStyle = cg; g.beginPath(); g.moveTo(20, 58); g.quadraticCurveTo(16, 30, 22, 12); g.lineTo(42, 12); g.quadraticCurveTo(48, 30, 44, 58); g.closePath(); g.fill();
    g.fillStyle = '#e8dcc0';                                           // posters wrapped around it
    g.beginPath(); g.moveTo(24, 46); g.quadraticCurveTo(22, 34, 25, 22); g.lineTo(33, 22); g.quadraticCurveTo(31, 34, 32, 46); g.closePath(); g.fill();
    g.fillStyle = '#c9333a'; g.fillRect(25, 26, 7, 5); g.fillStyle = '#2a5f8a'; g.fillRect(25, 33, 7, 5); g.fillStyle = '#d8a840'; g.fillRect(25, 40, 7, 4);
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.moveTo(38, 46); g.quadraticCurveTo(40, 30, 37, 14); g.lineTo(42, 14); g.quadraticCurveTo(46, 30, 43, 58); g.lineTo(40, 58); g.closePath(); g.fill();
    g.fillStyle = '#12281a'; g.beginPath(); g.ellipse(32, 12, 13, 3.4, 0, 0, 7); g.fill();   // domed cap
    g.beginPath(); g.ellipse(32, 8, 8, 5, 0, Math.PI, 0, true); g.fill();
    g.fillStyle = '#0a1810'; g.fillRect(30, 2, 4, 6);                  // finial
    g.strokeStyle = 'rgba(255,255,255,0.1)'; g.lineWidth = 1; g.beginPath(); g.moveTo(20, 55); g.lineTo(44, 55); g.stroke();
  });

  SPR.vespa = outlined(g => {                                         // pastel Italian scooter, chrome trim
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 58, 20, 4, 0, 0, 7); g.fill();
    g.fillStyle = '#1c1e22'; g.beginPath(); g.arc(17, 54, 6, 0, 7); g.fill(); g.beginPath(); g.arc(45, 54, 6, 0, 7); g.fill();
    g.fillStyle = '#8a8a8a'; g.beginPath(); g.arc(17, 54, 2.2, 0, 7); g.fill(); g.beginPath(); g.arc(45, 54, 2.2, 0, 7); g.fill();
    let body = g.createLinearGradient(10, 24, 50, 54);
    body.addColorStop(0, '#8ec4c4'); body.addColorStop(0.5, '#6aa8a8'); body.addColorStop(1, '#3e7a7a');
    g.fillStyle = body;
    g.beginPath(); g.moveTo(14, 52); g.quadraticCurveTo(10, 38, 20, 30); g.quadraticCurveTo(26, 24, 34, 26); g.quadraticCurveTo(42, 24, 46, 32); g.quadraticCurveTo(50, 40, 44, 52); g.quadraticCurveTo(30, 56, 14, 52); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.ellipse(22, 34, 5, 9, -0.3, 0, 7); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.16)'; g.beginPath(); g.ellipse(40, 42, 5, 10, 0.2, 0, 7); g.fill();
    g.fillStyle = '#c9c9cc'; g.fillRect(30, 16, 3, 12);                // handlebar stem
    g.fillStyle = '#9098a0'; g.fillRect(20, 15, 20, 2.4);              // handlebars
    g.fillStyle = '#1c1e22'; g.beginPath(); g.arc(20, 16, 1.8, 0, 7); g.fill(); g.beginPath(); g.arc(40, 16, 1.8, 0, 7); g.fill();
    g.fillStyle = '#e8e8ec'; g.beginPath(); g.ellipse(32, 22, 4, 3, 0, 0, 7); g.fill();     // headlamp
    g.fillStyle = '#1c1e22'; g.fillRect(15, 44, 34, 4);                // running board
  });

  SPR.easel = outlined(g => {                                         // artist's tripod easel, small canvas on it
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(32, 60, 14, 2.6, 0, 0, 7); g.fill();
    g.strokeStyle = '#7a5a34'; g.lineWidth = 2.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(20, 60); g.lineTo(32, 20); g.stroke();
    g.beginPath(); g.moveTo(44, 60); g.lineTo(32, 20); g.stroke();
    g.beginPath(); g.moveTo(32, 60); g.lineTo(32, 34); g.stroke();
    g.strokeStyle = '#5c4222'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(22, 44); g.lineTo(42, 44); g.stroke();  // crossbar
    let canvas = g.createLinearGradient(18, 18, 46, 46);
    canvas.addColorStop(0, '#f0ece0'); canvas.addColorStop(1, '#d4cebe');
    g.save(); g.translate(32, 32); g.rotate(-0.04);
    g.fillStyle = '#8a6a3a'; g.fillRect(-15, -15, 30, 30);             // frame
    g.fillStyle = canvas; g.fillRect(-13, -13, 26, 26);
    g.fillStyle = '#5a7a9a'; g.fillRect(-13, -13, 26, 12);             // a little sketched landscape
    g.fillStyle = '#4a7a4a'; g.beginPath(); g.moveTo(-13, 2); g.quadraticCurveTo(0, -4, 13, 2); g.lineTo(13, 13); g.lineTo(-13, 13); g.closePath(); g.fill();
    g.fillStyle = '#e8dca0'; g.beginPath(); g.arc(6, -8, 4, 0, 7); g.fill();
    g.restore();
    g.fillStyle = '#7a5a34'; g.fillRect(29, 46, 6, 3);                 // ledge holding the canvas
  });

  SPR.boulevardlamp = outlined(g => {                                 // ornate double-globe cast-iron street lamp
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 61, 8, 2, 0, 0, 7); g.fill();
    let ig = g.createLinearGradient(26, 10, 38, 60);
    ig.addColorStop(0, '#3a3d34'); ig.addColorStop(0.5, '#242822'); ig.addColorStop(1, '#141610');
    g.fillStyle = ig; g.fillRect(30, 24, 4, 36);
    g.beginPath(); g.ellipse(32, 60, 8, 2.4, 0, 0, 7); g.fill();       // base
    g.beginPath(); g.ellipse(32, 55, 6, 2, 0, 0, 7); g.fill();
    g.strokeStyle = ig; g.lineWidth = 2;
    g.beginPath(); g.moveTo(32, 26); g.quadraticCurveTo(18, 22, 18, 14); g.stroke();  // curled arm, left globe
    g.beginPath(); g.moveTo(32, 26); g.quadraticCurveTo(46, 22, 46, 14); g.stroke();  // curled arm, right globe
    const glow = g.createRadialGradient(18, 12, 0, 18, 12, 6);
    glow.addColorStop(0, 'rgba(255,240,190,0.95)'); glow.addColorStop(1, 'rgba(255,220,150,0.15)');
    g.fillStyle = glow; g.beginPath(); g.arc(18, 12, 6, 0, 7); g.fill();
    const glow2 = g.createRadialGradient(46, 12, 0, 46, 12, 6);
    glow2.addColorStop(0, 'rgba(255,240,190,0.95)'); glow2.addColorStop(1, 'rgba(255,220,150,0.15)');
    g.fillStyle = glow2; g.beginPath(); g.arc(46, 12, 6, 0, 7); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.beginPath(); g.arc(18, 12, 6, 0, 7); g.stroke(); g.beginPath(); g.arc(46, 12, 6, 0, 7); g.stroke();
    g.fillStyle = '#141610'; g.beginPath(); g.arc(18, 6.5, 1.6, 0, 7); g.fill(); g.beginPath(); g.arc(46, 6.5, 1.6, 0, 7); g.fill();  // finials
  });

  SPR.champagnebucket = outlined(g => {                                // silver ice bucket, champagne + two flutes
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 60, 14, 3, 0, 0, 7); g.fill();
    let bkt = g.createLinearGradient(16, 40, 48, 60);
    bkt.addColorStop(0, '#e8e8ec'); bkt.addColorStop(0.5, '#b8b8c0'); bkt.addColorStop(1, '#84848c');
    g.fillStyle = bkt; g.beginPath(); g.moveTo(18, 42); g.lineTo(46, 42); g.lineTo(43, 58); g.lineTo(21, 58); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(24, 44); g.lineTo(22, 56); g.stroke();
    g.fillStyle = '#c9c9cc'; g.beginPath(); g.ellipse(32, 42, 14, 3.2, 0, 0, 7); g.fill();
    g.fillStyle = '#0a3a2a'; g.fillRect(28, 12, 8, 30);                // champagne bottle
    g.fillStyle = '#0a2418'; g.beginPath(); g.ellipse(32, 12, 4, 2, 0, 0, 7); g.fill(); g.fillRect(30.5, 6, 3, 7);
    g.fillStyle = '#e8dca0'; g.fillRect(28, 24, 8, 6);                 // foil label
    g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(28.6, 14, 1.2, 20);
    g.strokeStyle = '#c9c9cc'; g.lineWidth = 1.4;                      // two champagne flutes
    g.beginPath(); g.moveTo(14, 46); g.lineTo(14, 36); g.stroke(); g.beginPath(); g.moveTo(11, 46); g.lineTo(17, 46); g.stroke();
    g.fillStyle = 'rgba(230,220,180,0.5)'; g.beginPath(); g.moveTo(11, 36); g.quadraticCurveTo(14, 32, 17, 36); g.lineTo(14.5, 40); g.closePath(); g.fill();
    g.strokeStyle = '#c9c9cc'; g.beginPath(); g.moveTo(50, 46); g.lineTo(50, 36); g.stroke(); g.beginPath(); g.moveTo(47, 46); g.lineTo(53, 46); g.stroke();
    g.fillStyle = 'rgba(230,220,180,0.5)'; g.beginPath(); g.moveTo(47, 36); g.quadraticCurveTo(50, 32, 53, 36); g.lineTo(50.5, 40); g.closePath(); g.fill();
  });

  SPR.jukebox = outlined(g => {                                       // colorful rounded 60s jukebox, chrome + glow tubes
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 61, 15, 3, 0, 0, 7); g.fill();
    let cab = g.createLinearGradient(14, 8, 50, 60);
    cab.addColorStop(0, '#d8384a'); cab.addColorStop(0.5, '#a8202e'); cab.addColorStop(1, '#6e1420');
    g.fillStyle = cab; g.beginPath(); g.moveTo(14, 60); g.lineTo(14, 22); g.quadraticCurveTo(14, 8, 32, 8); g.quadraticCurveTo(50, 8, 50, 22); g.lineTo(50, 60); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.14)'; g.beginPath(); g.moveTo(17, 58); g.lineTo(17, 24); g.quadraticCurveTo(17, 14, 26, 12); g.lineTo(24, 20); g.quadraticCurveTo(19, 22, 19, 30); g.lineTo(19, 58); g.closePath(); g.fill();
    let dome = g.createLinearGradient(20, 10, 44, 30);                 // glowing dome tubes
    dome.addColorStop(0, 'rgba(255,240,180,0.9)'); dome.addColorStop(1, 'rgba(255,190,80,0.5)');
    g.fillStyle = dome; g.beginPath(); g.moveTo(19, 30); g.lineTo(19, 22); g.quadraticCurveTo(19, 12, 32, 12); g.quadraticCurveTo(45, 12, 45, 22); g.lineTo(45, 30); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1; for (let x = 22; x < 44; x += 4) { g.beginPath(); g.moveTo(x, 30); g.lineTo(x, 13); g.stroke(); }
    let sel = g.createLinearGradient(18, 34, 46, 50);                 // chrome selector grille
    sel.addColorStop(0, '#e0e0e4'); sel.addColorStop(1, '#909098');
    g.fillStyle = sel; g.fillRect(18, 34, 28, 16);
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.8; for (let y = 36; y < 50; y += 3) { g.beginPath(); g.moveTo(19, y); g.lineTo(45, y); g.stroke(); }
    g.fillStyle = '#1c1e22'; g.fillRect(18, 52, 28, 6);                // coin slot / speaker panel
  });

  SPR.metroentrance = outlined(g => {                                 // Art Nouveau Paris Metro entrance arch
    g.fillStyle = 'rgba(0,0,0,0.32)'; g.beginPath(); g.ellipse(32, 61, 22, 3, 0, 0, 7); g.fill();
    let ig = g.createLinearGradient(6, 20, 58, 58);
    ig.addColorStop(0, '#3a6a52'); ig.addColorStop(0.5, '#254a38'); ig.addColorStop(1, '#122a1e');
    g.strokeStyle = ig; g.fillStyle = '#254a38'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(8, 58); g.lineTo(8, 24); g.stroke();
    g.beginPath(); g.moveTo(56, 58); g.lineTo(56, 24); g.stroke();
    g.beginPath(); g.moveTo(8, 24); g.quadraticCurveTo(8, 10, 32, 8); g.quadraticCurveTo(56, 10, 56, 24); g.stroke();
    g.fillStyle = '#12281a'; g.fillRect(20, 14, 24, 7);                // METROPOLITAIN plaque
    g.fillStyle = '#e8dca0'; g.font = '5px serif'; g.fillText('METRO', 22, 19.5);
    const bloom = (cx, cy) => { g.fillStyle = '#3a6a52'; g.beginPath(); g.arc(cx, cy, 3, 0, 7); g.fill(); g.fillStyle = '#e8b840'; g.beginPath(); g.arc(cx, cy, 1.2, 0, 7); g.fill(); };
    bloom(8, 12); bloom(56, 12); bloom(32, 6);                          // ornamental lily lamps atop the ironwork
    g.strokeStyle = '#3a6a52'; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(8, 24); g.lineTo(8, 15); g.stroke(); g.beginPath(); g.moveTo(56, 24); g.lineTo(56, 15); g.stroke(); g.beginPath(); g.moveTo(32, 10); g.lineTo(32, 8); g.stroke();
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.moveTo(12, 58); g.lineTo(12, 26); g.quadraticCurveTo(12, 16, 32, 14); g.quadraticCurveTo(52, 16, 52, 26); g.lineTo(52, 58); g.closePath(); g.fill();  // dark stair void
  });

  // ---------------------------------------------------------------------------
  // PARIS LANDMARKS — big background scenery silhouettes, meant to be placed
  // large (scale it way up with the 3D-preview +/- keys) and seen from across
  // a plaza or over the rooftops.
  // ---------------------------------------------------------------------------
  SPR.eiffeltower = outlined(g => {                                   // the Eiffel Tower — iron lattice silhouette
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 61, 15, 2.6, 0, 0, 7); g.fill();
    const ig = g.createLinearGradient(0, 2, 0, 60);
    ig.addColorStop(0, '#8a6a48'); ig.addColorStop(1, '#4a3420');
    g.fillStyle = ig;
    g.beginPath(); g.moveTo(9, 58); g.lineTo(27, 27); g.lineTo(30, 27); g.lineTo(19, 58); g.closePath(); g.fill();     // near leg
    g.beginPath(); g.moveTo(55, 58); g.lineTo(37, 27); g.lineTo(34, 27); g.lineTo(45, 58); g.closePath(); g.fill();    // far leg
    g.fillRect(22, 25, 20, 3);                                                                                          // first platform
    g.beginPath(); g.moveTo(25, 25); g.lineTo(29, 9); g.lineTo(35, 9); g.lineTo(39, 25); g.closePath(); g.fill();       // mid tower
    g.fillRect(28.5, 7.5, 7, 2.2);                                                                                      // second platform
    g.beginPath(); g.moveTo(30.5, 7.5); g.lineTo(31.6, 2); g.lineTo(32.4, 2); g.lineTo(33.5, 7.5); g.closePath(); g.fill(); // spire
    g.strokeStyle = 'rgba(20,14,8,0.45)'; g.lineWidth = 0.8;                                                             // lattice cross-braces
    for (let i = 0; i < 5; i++) {
      const y0 = 30 + i * 5.5, xl = 9 + (58 - y0) / 31 * 18, xr = 55 - (58 - y0) / 31 * 18;
      g.beginPath(); g.moveTo(xl, y0); g.lineTo(xr, y0); g.stroke();
    }
    g.fillStyle = 'rgba(255,220,160,0.08)'; g.fillRect(30, 2, 4, 56);
  });

  SPR.arcdetriomphe = outlined(g => {                                  // the Arc de Triomphe — pale stone triumphal arch
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 61, 22, 3, 0, 0, 7); g.fill();
    const sg = g.createLinearGradient(4, 4, 60, 58);
    sg.addColorStop(0, '#d8cfb4'); sg.addColorStop(1, '#a89a78');
    g.fillStyle = sg; g.fillRect(4, 6, 56, 52);
    g.strokeStyle = 'rgba(80,68,44,0.3)'; g.lineWidth = 0.8;
    for (let y = 6; y < 58; y += 6) { g.beginPath(); g.moveTo(4, y); g.lineTo(60, y); g.stroke(); }         // coursed stone
    const og = g.createLinearGradient(20, 20, 44, 58);
    og.addColorStop(0, '#3a3428'); og.addColorStop(1, '#161410');
    g.fillStyle = og; g.beginPath();                                                                          // dark arched opening
    g.moveTo(21, 58); g.lineTo(21, 32); g.quadraticCurveTo(21, 21.5, 32, 21.5); g.quadraticCurveTo(43, 21.5, 43, 32); g.lineTo(43, 58); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(60,52,34,0.6)'; g.lineWidth = 1.4; g.beginPath();
    g.moveTo(20, 32); g.quadraticCurveTo(20, 20, 32, 20); g.quadraticCurveTo(44, 20, 44, 32); g.stroke();
    g.fillStyle = 'rgba(140,120,80,0.4)'; g.fillRect(4, 4, 56, 4);                                          // top cornice band
    bevel(g, 4, 4, 56, 4, 'rgba(255,250,230,0.2)', 'rgba(0,0,0,0.25)');
    g.fillStyle = 'rgba(90,78,52,0.5)'; g.fillRect(8, 30, 8, 22); g.fillRect(48, 30, 8, 22);                // relief-carving panels
    g.strokeStyle = 'rgba(60,52,34,0.4)'; g.lineWidth = 0.6; g.strokeRect(8, 30, 8, 22); g.strokeRect(48, 30, 8, 22);
    speck(g, 40, 'rgba(60,52,34,0.1)');
    bevel(g, 4, 6, 56, 52, 'rgba(255,250,230,0.12)', 'rgba(40,32,15,0.25)');
  });

  SPR.notredame = outlined(g => {                                      // Notre-Dame — twin Gothic towers + rose window
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 61, 22, 3, 0, 0, 7); g.fill();
    const sg = g.createLinearGradient(2, 2, 62, 58);
    sg.addColorStop(0, '#c9c0a8'); sg.addColorStop(1, '#948a6c');
    g.fillStyle = sg;
    g.fillRect(4, 8, 16, 50); g.fillRect(44, 8, 16, 50);                                                    // twin towers
    g.fillRect(16, 20, 32, 38);                                                                              // central facade
    g.strokeStyle = 'rgba(70,60,40,0.3)'; g.lineWidth = 0.7;
    for (let y = 10; y < 56; y += 6) { g.beginPath(); g.moveTo(4, y); g.lineTo(60, y); g.stroke(); }
    g.fillStyle = sg; for (const tx of [4, 8, 12, 16, 44, 48, 52, 56]) g.fillRect(tx, 5, 2.6, 4);           // tower crenellations
    const rg = g.createRadialGradient(32, 32, 1, 32, 32, 9);                                                 // rose window
    rg.addColorStop(0, '#e0c840'); rg.addColorStop(0.5, '#c94848'); rg.addColorStop(1, '#2a3a6a');
    g.fillStyle = rg; g.beginPath(); g.arc(32, 32, 9, 0, 7); g.fill();
    g.strokeStyle = '#3a3020'; g.lineWidth = 1;
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; g.beginPath(); g.moveTo(32, 32); g.lineTo(32 + Math.cos(a) * 9, 32 + Math.sin(a) * 9); g.stroke(); }
    g.beginPath(); g.arc(32, 32, 9, 0, 7); g.stroke();
    g.fillStyle = 'rgba(30,26,18,0.7)';                                                                       // three portals
    for (const cx of [22, 32, 42]) { g.beginPath(); g.moveTo(cx - 4, 58); g.lineTo(cx - 4, 50); g.quadraticCurveTo(cx - 4, 45, cx, 45); g.quadraticCurveTo(cx + 4, 45, cx + 4, 50); g.lineTo(cx + 4, 58); g.closePath(); g.fill(); }
    speck(g, 40, 'rgba(70,60,40,0.1)');
    bevel(g, 4, 8, 56, 50, 'rgba(255,250,230,0.1)', 'rgba(30,24,10,0.25)');
  });

  SPR.louvrepyramid = outlined(g => {                                  // the Louvre glass pyramid, courtyard base
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 60, 22, 3, 0, 0, 7); g.fill();
    g.fillStyle = '#8a8474'; g.fillRect(2, 52, 60, 8);                                                       // stone courtyard base
    bevel(g, 2, 52, 60, 8, 'rgba(255,250,230,0.15)', 'rgba(0,0,0,0.3)');
    const glass = g.createLinearGradient(10, 14, 54, 52);
    glass.addColorStop(0, '#a8d0d8'); glass.addColorStop(0.5, '#4a7480'); glass.addColorStop(1, '#1c2e34');
    g.fillStyle = glass;
    g.beginPath(); g.moveTo(32, 8); g.lineTo(56, 52); g.lineTo(8, 52); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(20,20,18,0.6)'; g.lineWidth = 1;                                                    // steel lattice frame
    for (let i = 1; i < 6; i++) {
      const t = i / 6;
      g.beginPath(); g.moveTo(32 - (32 - 8) * t, 8 + (52 - 8) * t); g.lineTo(32 + (56 - 32) * t, 8 + (52 - 8) * t); g.stroke();
    }
    g.beginPath(); g.moveTo(32, 8); g.lineTo(8, 52); g.moveTo(32, 8); g.lineTo(56, 52); g.moveTo(32, 8); g.lineTo(32, 52); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.moveTo(32, 8); g.lineTo(20, 40); g.lineTo(26, 40); g.closePath(); g.fill();  // sun glint facet
    speck(g, 20, 'rgba(255,255,255,0.06)');
  });

  SPR.moulinrouge = outlined(g => {                                    // Moulin Rouge — red windmill atop the cabaret facade
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 61, 20, 3, 0, 0, 7); g.fill();
    const bg = g.createLinearGradient(2, 30, 62, 58);
    bg.addColorStop(0, '#3a1a1a'); bg.addColorStop(1, '#200e0e');
    g.fillStyle = bg; g.fillRect(4, 30, 56, 28);
    g.fillStyle = '#c9242e'; g.fillRect(4, 46, 56, 4);                                                       // red awning stripe
    g.fillStyle = 'rgba(255,214,60,0.85)';
    for (let i = 0; i < 6; i++) g.fillRect(8 + i * 9, 34, 5, 9);                                             // marquee bulbs / lit windows
    g.fillStyle = '#5c3a26'; g.fillRect(27, 10, 10, 22);                                                     // windmill tower
    g.fillStyle = '#3a2418'; g.beginPath(); g.moveTo(25, 10); g.lineTo(32, 2); g.lineTo(39, 10); g.closePath(); g.fill();
    g.save(); g.translate(32, 12);                                                                            // sails (cross)
    g.strokeStyle = '#c9242e'; g.lineWidth = 2.4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-14, -14); g.lineTo(14, 14); g.moveTo(14, -14); g.lineTo(-14, 14); g.stroke();
    g.fillStyle = 'rgba(240,230,210,0.85)';
    for (const [dx, dy] of [[-14, -14], [14, -14], [14, 14], [-14, 14]]) { g.save(); g.translate(dx, dy); g.rotate(Math.atan2(-dy, -dx)); g.fillRect(-8, -2.4, 10, 4.8); g.restore(); }
    g.restore();
    g.fillStyle = '#2a1414'; g.beginPath(); g.arc(32, 12, 2.2, 0, 7); g.fill();                               // hub
    speck(g, 30, 'rgba(0,0,0,0.2)');
  });

  SPR.sacrecoeur = outlined(g => {                                     // Sacré-Cœur — white travertine domes atop Montmartre
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 61, 22, 3, 0, 0, 7); g.fill();
    const sg = g.createLinearGradient(2, 20, 62, 58);
    sg.addColorStop(0, '#f0ece0'); sg.addColorStop(1, '#c8c0a8');
    g.fillStyle = sg; g.fillRect(6, 34, 52, 24);                                                              // base structure
    g.strokeStyle = 'rgba(120,110,88,0.3)'; g.lineWidth = 0.7;
    for (let y = 36; y < 58; y += 6) { g.beginPath(); g.moveTo(6, y); g.lineTo(58, y); g.stroke(); }
    g.fillStyle = sg; g.beginPath(); g.arc(32, 26, 13, Math.PI, 0); g.fill();                                 // central big dome
    g.strokeStyle = 'rgba(150,140,110,0.3)'; g.beginPath(); g.arc(32, 26, 13, Math.PI, 0); g.stroke();
    g.fillStyle = '#c9a227'; g.beginPath(); g.arc(32, 12, 1.8, 0, 7); g.fill();                               // gold cross finial
    g.strokeStyle = '#c9a227'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(32, 4); g.lineTo(32, 12); g.moveTo(29, 7); g.lineTo(35, 7); g.stroke();
    for (const cx of [14, 50]) {                                                                              // side smaller domes
      g.fillStyle = sg; g.beginPath(); g.arc(cx, 32, 6, Math.PI, 0); g.fill();
      g.fillStyle = '#c9a227'; g.beginPath(); g.arc(cx, 26, 1, 0, 7); g.fill();
    }
    g.fillStyle = 'rgba(40,36,26,0.6)'; g.beginPath();                                                        // arched entrance
    g.moveTo(26, 58); g.lineTo(26, 48); g.quadraticCurveTo(26, 42, 32, 42); g.quadraticCurveTo(38, 42, 38, 48); g.lineTo(38, 58); g.closePath(); g.fill();
    speck(g, 35, 'rgba(120,110,88,0.08)');
    bevel(g, 6, 34, 52, 24, 'rgba(255,255,255,0.12)', 'rgba(80,72,54,0.2)');
  });

  // ---------------------------------------------------------------------------
  // MID-CENTURY SUBURBIA props — American backyard/driveway clutter, 1950s-60s.
  // ---------------------------------------------------------------------------
  SPR.stationwagon = outlined(g => {                                  // finned woodgrain station wagon, three-quarter rear
    g.fillStyle = 'rgba(0,0,0,0.32)'; g.beginPath(); g.ellipse(32, 58, 30, 5, 0, 0, 7); g.fill();
    let body = g.createLinearGradient(2, 22, 62, 52);
    body.addColorStop(0, '#d8c060'); body.addColorStop(0.5, '#b89838'); body.addColorStop(1, '#7a621e');
    g.fillStyle = body;
    g.beginPath(); g.moveTo(4, 52); g.lineTo(6, 34); g.quadraticCurveTo(8, 26, 18, 24); g.lineTo(46, 24); g.quadraticCurveTo(56, 26, 58, 34); g.lineTo(60, 52); g.closePath(); g.fill();
    g.fillStyle = '#6a4522';                                          // woodgrain side panel
    g.beginPath(); g.moveTo(10, 50); g.lineTo(11, 36); g.lineTo(53, 36); g.lineTo(54, 50); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(90,60,25,0.5)'; g.lineWidth = 0.8;
    for (let x = 14; x < 52; x += 6) { g.beginPath(); g.moveTo(x, 37); g.quadraticCurveTo(x + 2, 43, x, 49); g.stroke(); }
    let glass = g.createLinearGradient(10, 26, 54, 34);
    glass.addColorStop(0, 'rgba(170,210,225,0.7)'); glass.addColorStop(1, 'rgba(120,160,180,0.55)');
    g.fillStyle = glass; g.beginPath(); g.moveTo(16, 33); g.lineTo(19, 26); g.lineTo(45, 26); g.lineTo(48, 33); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(32, 26); g.lineTo(32, 33); g.stroke();
    g.fillStyle = '#e8e4d8'; g.fillRect(2, 40, 4, 3); g.fillRect(58, 40, 4, 3);              // chrome bumpers
    g.fillStyle = '#1c1e22'; g.beginPath(); g.arc(15, 52, 6, 0, 7); g.fill(); g.beginPath(); g.arc(49, 52, 6, 0, 7); g.fill();
    g.fillStyle = '#8a8a8a'; g.beginPath(); g.arc(15, 52, 2.4, 0, 7); g.fill(); g.beginPath(); g.arc(49, 52, 2.4, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,240,200,0.7)'; g.beginPath(); g.arc(6, 45, 2, 0, 7); g.fill(); g.beginPath(); g.arc(58, 45, 2, 0, 7); g.fill();  // tail fins/lamps
  });

  SPR.mailboxpost = outlined(g => {                                   // residential post mailbox, red flag up
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(32, 61, 6, 1.6, 0, 0, 7); g.fill();
    g.fillStyle = '#5c4222'; g.fillRect(30, 34, 4, 27);                // post
    g.fillStyle = '#3a2c14'; g.fillRect(29, 59, 6, 2);
    let box = g.createLinearGradient(18, 20, 46, 36);
    box.addColorStop(0, '#5a8a5c'); box.addColorStop(1, '#3a6440');
    g.fillStyle = box; g.beginPath(); g.moveTo(18, 34); g.lineTo(18, 26); g.quadraticCurveTo(18, 20, 24, 20); g.lineTo(40, 20); g.quadraticCurveTo(46, 20, 46, 26); g.lineTo(46, 34); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(26, 25, 3, 5, -0.2, 0, 7); g.fill();
    g.fillStyle = '#1c1e22'; g.fillRect(17, 32, 30, 2.4);              // box mouth shadow
    g.fillStyle = '#e8dca0'; g.fillRect(20, 27, 12, 3);                // house number
    g.fillStyle = '#c9333a'; g.save(); g.translate(46, 24); g.rotate(-0.5);   // red flag, up
    g.fillRect(0, -1, 8, 4); g.restore();
    g.fillStyle = '#8a8a8a'; g.fillRect(45, 22, 1.6, 8);
  });

  SPR.bbqgrill = outlined(g => {                                      // charcoal kettle grill on three legs
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 60, 15, 3.4, 0, 0, 7); g.fill();
    g.strokeStyle = '#1c1e22'; g.lineWidth = 2.2;                     // three legs
    g.beginPath(); g.moveTo(32, 44); g.lineTo(18, 58); g.stroke();
    g.beginPath(); g.moveTo(32, 44); g.lineTo(46, 58); g.stroke();
    g.beginPath(); g.moveTo(32, 44); g.lineTo(32, 60); g.stroke();
    let kettle = g.createRadialGradient(26, 30, 2, 32, 34, 20);
    kettle.addColorStop(0, '#6a6a6a'); kettle.addColorStop(0.6, '#3a3a3a'); kettle.addColorStop(1, '#1c1c1c');
    g.fillStyle = kettle; g.beginPath(); g.ellipse(32, 36, 18, 15, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,180,80,0.4)'; g.beginPath(); g.ellipse(32, 40, 12, 4, 0, 0, Math.PI); g.fill();  // coal glow at the grate
    g.fillStyle = '#c9c9cc'; g.fillRect(14, 34, 2, 6); g.fillRect(48, 34, 2, 6);   // side handles
    g.fillStyle = '#2c2c2c'; g.beginPath(); g.ellipse(32, 22, 15, 5, 0, 0, 7); g.fill();  // domed lid
    g.beginPath(); g.ellipse(32, 15, 9, 6, 0, Math.PI, 0, true); g.fill();
    g.fillStyle = '#8a8a8a'; g.fillRect(30, 10, 4, 5);                // lid handle
    g.fillStyle = 'rgba(255,255,255,0.14)'; g.beginPath(); g.ellipse(24, 18, 3, 6, -0.2, 0, 7); g.fill();
  });

  SPR.tvconsole = outlined(g => {                                     // wood-cabinet console TV, rabbit-ear antenna
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 61, 18, 3, 0, 0, 7); g.fill();
    let cab = g.createLinearGradient(10, 14, 54, 60);
    cab.addColorStop(0, '#8a6438'); cab.addColorStop(1, '#5c4222');
    g.fillStyle = cab; g.fillRect(10, 20, 44, 40);
    bevel(g, 10, 20, 44, 40, 'rgba(255,230,180,0.16)', 'rgba(0,0,0,0.35)');
    g.fillStyle = '#1c1e22'; g.beginPath(); g.ellipse(32, 38, 15, 13, 0, 0, 7); g.fill();   // round-cornered screen
    let scr = g.createRadialGradient(28, 34, 1, 32, 38, 14);
    scr.addColorStop(0, 'rgba(150,190,200,0.6)'); scr.addColorStop(1, 'rgba(40,60,70,0.3)');
    g.fillStyle = scr; g.beginPath(); g.ellipse(32, 38, 12, 10.4, 0, 0, 7); g.fill();
    g.fillStyle = '#c9a06a'; g.fillRect(14, 52, 6, 4); g.fillRect(44, 52, 6, 4);   // knobs
    g.fillStyle = '#3a3226'; g.beginPath(); g.arc(16, 54, 1.2, 0, 7); g.fill(); g.beginPath(); g.arc(46, 54, 1.2, 0, 7); g.fill();
    g.strokeStyle = '#8a8a8a'; g.lineWidth = 1.3;                     // rabbit-ear antenna
    g.beginPath(); g.moveTo(28, 20); g.lineTo(22, 4); g.stroke();
    g.beginPath(); g.moveTo(36, 20); g.lineTo(44, 4); g.stroke();
    g.fillStyle = '#5c4222'; g.fillRect(4, 56, 6, 4); g.fillRect(54, 56, 6, 4);   // stubby legs
  });
  SPR.tvconsoleOn = SPR.tvconsole;   // picture-on state — placeholder until/unless shipped art overrides it

  SPR.lawnmower = outlined(g => {                                     // push reel lawnmower
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 58, 16, 3.2, 0, 0, 7); g.fill();
    g.strokeStyle = '#8a8a8a'; g.lineWidth = 2.2;                     // handle
    g.beginPath(); g.moveTo(20, 22); g.lineTo(38, 48); g.stroke();
    g.fillStyle = '#3a3226'; g.fillRect(15, 18, 8, 3);                // grip
    g.fillStyle = '#1c1e22'; g.beginPath(); g.arc(24, 52, 8, 0, 7); g.fill(); g.beginPath(); g.arc(48, 52, 8, 0, 7); g.fill();  // wheels
    g.fillStyle = '#c9a227'; g.beginPath(); g.arc(24, 52, 2.6, 0, 7); g.fill(); g.beginPath(); g.arc(48, 52, 2.6, 0, 7); g.fill();
    let body = g.createLinearGradient(20, 40, 52, 56);
    body.addColorStop(0, '#c9333a'); body.addColorStop(1, '#8a1a20');
    g.fillStyle = body; g.beginPath(); g.moveTo(20, 44); g.lineTo(52, 44); g.lineTo(48, 56); g.lineTo(24, 56); g.closePath(); g.fill();
    g.strokeStyle = '#e8e4d8'; g.lineWidth = 1; for (let x = 26; x < 48; x += 5) { g.beginPath(); g.moveTo(x, 44); g.lineTo(x - 2, 56); g.stroke(); }  // reel blades
    g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(22, 45, 26, 2);
  });

  SPR.swingset = outlined(g => {                                     // backyard A-frame swing set
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(32, 61, 26, 3, 0, 0, 7); g.fill();
    g.strokeStyle = '#8a8a8a'; g.lineWidth = 2.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(6, 60); g.lineTo(18, 12); g.lineTo(30, 60); g.stroke();       // left A-frame
    g.beginPath(); g.moveTo(34, 60); g.lineTo(46, 12); g.lineTo(58, 60); g.stroke();      // right A-frame
    g.beginPath(); g.moveTo(18, 12); g.lineTo(46, 12); g.stroke();                        // top bar
    g.strokeStyle = 'rgba(255,255,255,0.15)'; g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(7, 59); g.lineTo(17.5, 13); g.stroke();
    g.strokeStyle = '#c9c2ac'; g.lineWidth = 1;                       // chains + a swing seat
    g.beginPath(); g.moveTo(26, 12); g.lineTo(24, 42); g.stroke(); g.beginPath(); g.moveTo(38, 12); g.lineTo(40, 42); g.stroke();
    let seat = g.createLinearGradient(20, 42, 44, 48);
    seat.addColorStop(0, '#d8a840'); seat.addColorStop(1, '#a87820');
    g.fillStyle = seat; g.beginPath(); g.moveTo(22, 42); g.quadraticCurveTo(32, 48, 42, 42); g.lineTo(42, 46); g.quadraticCurveTo(32, 51, 22, 46); g.closePath(); g.fill();
  });

  SPR.picnictable = outlined(g => {                                   // wooden picnic table, attached benches
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 60, 24, 3.6, 0, 0, 7); g.fill();
    g.strokeStyle = '#7a5a34'; g.lineWidth = 3; g.lineCap = 'round';   // A-frame legs, both ends
    g.beginPath(); g.moveTo(10, 56); g.lineTo(20, 30); g.lineTo(30, 56); g.stroke();
    g.beginPath(); g.moveTo(34, 56); g.lineTo(44, 30); g.lineTo(54, 56); g.stroke();
    let top = g.createLinearGradient(4, 24, 60, 34);
    top.addColorStop(0, '#c9946a'); top.addColorStop(1, '#a8794a');
    g.fillStyle = top; g.fillRect(4, 24, 56, 8);
    g.strokeStyle = 'rgba(90,60,30,0.4)'; g.lineWidth = 0.8; for (let x = 6; x < 60; x += 8) { g.beginPath(); g.moveTo(x, 24); g.lineTo(x, 32); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(4, 24, 56, 1.6);
    let bench = g.createLinearGradient(4, 46, 60, 52);                // both benches
    bench.addColorStop(0, '#a8794a'); bench.addColorStop(1, '#7a5430');
    g.fillStyle = bench; g.fillRect(2, 44, 24, 5); g.fillRect(38, 44, 24, 5);
  });

  SPR.sprinkler = outlined(g => {                                    // oscillating lawn sprinkler, mid-spray
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(32, 60, 8, 2, 0, 0, 7); g.fill();
    g.fillStyle = '#4a8a4a'; g.beginPath(); g.ellipse(32, 60, 22, 3.6, 0, 0, 7); g.fill();  // wet grass patch
    g.fillStyle = 'rgba(120,200,220,0.25)'; g.beginPath(); g.ellipse(32, 60, 20, 3.2, 0, 0, 7); g.fill();
    g.fillStyle = '#8a8a8a'; g.fillRect(29, 46, 6, 12);                // base
    g.fillStyle = '#c9c9cc'; g.beginPath(); g.ellipse(32, 44, 8, 4, 0, 0, 7); g.fill();     // spray head
    g.strokeStyle = 'rgba(180,220,235,0.55)'; g.lineWidth = 1.2;
    for (const a of [-1.1, -0.5, 0.5, 1.1]) { g.beginPath(); g.moveTo(32, 44); g.quadraticCurveTo(32 + Math.sin(a) * 14, 30, 32 + Math.sin(a) * 22, 20 + Math.abs(a) * 6); g.stroke(); }
    g.fillStyle = 'rgba(220,240,250,0.4)'; for (let i = 0; i < 10; i++) g.fillRect(14 + Math.random() * 36, 14 + Math.random() * 24, 1.4, 1.4);  // droplets
  });

  // ---------------------------------------------------------------------------
  // SOVIET RUSSIA props — Cold War Moscow clutter, well suited to a spy game.
  // ---------------------------------------------------------------------------
  SPR.laborstatue = outlined(g => {                                   // heroic worker statue, hammer raised — socialist-realist bronze
    g.fillStyle = 'rgba(0,0,0,0.32)'; g.beginPath(); g.ellipse(32, 61, 16, 3.2, 0, 0, 7); g.fill();
    g.fillStyle = '#4a4a3e'; g.fillRect(16, 52, 32, 8);                // stone plinth
    bevel(g, 16, 52, 32, 8, 'rgba(255,255,255,0.1)', 'rgba(0,0,0,0.3)');
    let bronze = g.createLinearGradient(18, 10, 46, 52);
    bronze.addColorStop(0, '#6a8a6a'); bronze.addColorStop(0.5, '#4a6a4c'); bronze.addColorStop(1, '#2c4230');
    g.fillStyle = bronze;
    g.beginPath(); g.moveTo(24, 52); g.lineTo(20, 34); g.quadraticCurveTo(20, 24, 28, 20); g.lineTo(34, 20); g.quadraticCurveTo(40, 24, 39, 34); g.lineTo(38, 52); g.closePath(); g.fill();
    g.save(); g.translate(38, 20); g.rotate(-0.7);                     // raised arm + hammer
    g.fillRect(-2, -16, 4, 18); g.fillStyle = '#3a5a3c'; g.fillRect(-6, -20, 12, 5);
    g.restore();
    g.fillStyle = bronze; g.beginPath(); g.arc(31, 15, 5.2, 0, 7); g.fill();  // head
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.ellipse(27, 30, 3, 12, 0.1, 0, 7); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(24, 52); g.lineTo(20, 34); g.stroke();
  });

  SPR.samovar = outlined(g => {                                       // ornate brass Russian tea samovar
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 60, 11, 2.6, 0, 0, 7); g.fill();
    let sg = g.createLinearGradient(18, 14, 46, 56);
    sg.addColorStop(0, '#e8c860'); sg.addColorStop(0.5, '#b8892c'); sg.addColorStop(1, '#7a5a18');
    g.fillStyle = sg;
    g.beginPath(); g.moveTo(26, 14); g.lineTo(38, 14); g.quadraticCurveTo(44, 20, 42, 32); g.quadraticCurveTo(44, 44, 38, 54); g.lineTo(26, 54); g.quadraticCurveTo(20, 44, 22, 32); g.quadraticCurveTo(20, 20, 26, 14); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.ellipse(27, 30, 2.4, 14, -0.05, 0, 7); g.fill();
    g.strokeStyle = 'rgba(90,60,20,0.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(20, 32); g.lineTo(44, 32); g.stroke();  // decorative band
    g.fillStyle = '#5c4210'; g.beginPath(); g.arc(32, 12, 4, 0, 7); g.fill();     // finial lid
    g.strokeStyle = '#7a5a18'; g.lineWidth = 2; g.beginPath(); g.moveTo(18, 30); g.quadraticCurveTo(12, 30, 12, 36); g.stroke();  // spigot handle-side
    g.fillStyle = '#3a2c14'; g.fillRect(9, 34, 5, 3);                  // spigot
    g.fillStyle = '#7a5a18'; g.fillRect(24, 54, 16, 4);                // base tray
  });

  SPR.posterboard = outlined(g => {                                   // freestanding propaganda poster stand
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 60, 13, 2.6, 0, 0, 7); g.fill();
    g.fillStyle = '#2a2a26'; g.fillRect(14, 56, 36, 3); g.fillRect(20, 20, 2.5, 38); g.fillRect(41.5, 20, 2.5, 38);
    let board = g.createLinearGradient(20, 10, 44, 56);
    board.addColorStop(0, '#c9242e'); board.addColorStop(1, '#8a141c');
    g.fillStyle = board; g.fillRect(18, 10, 28, 46);
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.strokeRect(18, 10, 28, 46);
    g.fillStyle = '#d8a827';
    const star5 = (cx, cy, r) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283 - Math.PI / 2, rr = i % 2 === 0 ? r : r * 0.42; const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); g.fill(); };
    star5(32, 24, 8);
    g.fillStyle = 'rgba(216,168,39,0.6)'; g.fillRect(21, 40, 22, 3); g.fillRect(21, 46, 16, 3);  // stenciled text lines
  });

  SPR.payphone = outlined(g => {                                      // Soviet-style yellow/grey street payphone kiosk
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 60, 12, 2.8, 0, 0, 7); g.fill();
    let cab = g.createLinearGradient(16, 8, 48, 58);
    cab.addColorStop(0, '#c9be6a'); cab.addColorStop(1, '#8a8248');
    g.fillStyle = cab; g.fillRect(16, 12, 32, 46);
    bevel(g, 16, 12, 32, 46, 'rgba(255,255,220,0.16)', 'rgba(0,0,0,0.32)');
    g.fillStyle = 'rgba(140,170,190,0.5)'; g.fillRect(20, 16, 24, 18);   // glass panel
    g.strokeStyle = 'rgba(60,58,30,0.4)'; g.lineWidth = 0.8; g.strokeRect(20, 16, 24, 18);
    g.fillStyle = '#3a3a34'; g.fillRect(26, 38, 12, 8);                  // phone box
    g.fillStyle = '#1c1e22'; g.beginPath(); g.arc(32, 44, 2, 0, 7); g.fill(); g.fillRect(30, 34, 4, 6);  // handset on hook
    g.fillStyle = '#e8e4d8'; g.fillRect(28, 50, 8, 5);                   // coin slot plate
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(30, 51.5, 4, 1.4);
  });

  SPR.stalinistlamp = outlined(g => {                                  // ornate obelisk-topped Stalinist street lamp
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 61, 8, 1.8, 0, 0, 7); g.fill();
    let ig = g.createLinearGradient(28, 10, 36, 60);
    ig.addColorStop(0, '#3a3a34'); ig.addColorStop(0.5, '#24241e'); ig.addColorStop(1, '#141410');
    g.fillStyle = ig; g.fillRect(29, 24, 6, 36);
    g.beginPath(); g.ellipse(32, 60, 9, 2.4, 0, 0, 7); g.fill();
    g.beginPath(); g.moveTo(24, 26); g.lineTo(40, 26); g.lineTo(37, 20); g.lineTo(27, 20); g.closePath(); g.fill();  // decorative collar
    const glow = g.createRadialGradient(32, 12, 0, 32, 12, 8);
    glow.addColorStop(0, 'rgba(255,235,180,0.95)'); glow.addColorStop(1, 'rgba(255,210,140,0.1)');
    g.fillStyle = glow; g.beginPath(); g.moveTo(23, 14); g.lineTo(32, 2); g.lineTo(41, 14); g.closePath(); g.fill();   // obelisk lamp shade
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(23, 14); g.lineTo(32, 2); g.lineTo(41, 14); g.closePath(); g.stroke();
    g.fillStyle = '#d8a827'; g.beginPath(); g.arc(32, 4, 1.4, 0, 7); g.fill();   // gold finial star point
  });

  SPR.sputnikmodel = outlined(g => {                                  // small Sputnik satellite monument — sphere on a mast, clear of the plinth
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 60, 14, 2.8, 0, 0, 7); g.fill();
    g.fillStyle = '#4a4a3e'; g.fillRect(18, 52, 28, 8);                // stepped stone plinth (wide, squat — reads as a monument base)
    g.fillStyle = '#5a5a4c'; g.fillRect(22, 46, 20, 6);
    bevel(g, 18, 52, 28, 8, 'rgba(255,255,255,0.1)', 'rgba(0,0,0,0.3)');
    bevel(g, 22, 46, 20, 6, 'rgba(255,255,255,0.1)', 'rgba(0,0,0,0.3)');
    g.strokeStyle = '#5c5850'; g.lineWidth = 2.4;                      // thin mast, clear gap between plinth and sphere
    g.beginPath(); g.moveTo(32, 46); g.lineTo(32, 24); g.stroke();
    const sph = g.createRadialGradient(27, 17, 1, 32, 20, 10);
    sph.addColorStop(0, '#f0ece0'); sph.addColorStop(0.6, '#b0aca0'); sph.addColorStop(1, '#68645a');
    g.fillStyle = sph; g.beginPath(); g.arc(32, 20, 9, 0, 7); g.fill();  // the sphere, well clear of the base
    g.strokeStyle = 'rgba(0,0,0,0.28)'; g.lineWidth = 0.8;
    g.beginPath(); g.arc(32, 20, 9, 0, 7); g.stroke();
    g.beginPath(); g.ellipse(32, 20, 9, 3.6, 0, 0, 7); g.stroke();      // orbital-band seam lines
    g.beginPath(); g.ellipse(32, 20, 3.6, 9, 0, 0, 7); g.stroke();
    g.strokeStyle = '#8a8478'; g.lineWidth = 1;                        // four thin antennae, trailing back from the sphere itself
    for (const a of [-2.6, -2.0, 2.0, 2.6]) { g.beginPath(); g.moveTo(32 + Math.cos(a) * 8, 20 + Math.sin(a) * 8 * 0.6); g.lineTo(32 + Math.cos(a) * 24, 20 + Math.sin(a) * 24 * 0.6 - 4); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(28, 15, 3, 4, -0.3, 0, 7); g.fill();  // specular highlight
    g.fillStyle = '#d8a827'; g.fillRect(21, 53.5, 22, 1.4);            // gold plaque strip on the plinth
  });

  SPR.vodkacrate = outlined(g => {                                    // wooden crate of vodka bottles
    let cr = g.createLinearGradient(10, 30, 54, 58);
    cr.addColorStop(0, '#a8794a'); cr.addColorStop(1, '#7a5430');
    g.fillStyle = cr; g.fillRect(10, 40, 44, 18);
    g.strokeStyle = 'rgba(60,40,18,0.5)'; g.lineWidth = 1; g.strokeRect(10, 40, 44, 18);
    g.beginPath(); g.moveTo(10, 40); g.lineTo(54, 40); g.stroke();
    const bottle = (x) => {
      g.fillStyle = 'rgba(230,238,240,0.55)'; g.fillRect(x, 18, 6, 24);
      g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(x + 1, 20, 1.4, 18);
      g.fillStyle = '#1c1e22'; g.fillRect(x + 1.5, 12, 3, 7);
      g.fillStyle = '#e8dca0'; g.fillRect(x, 28, 6, 5);                // label
    };
    bottle(14); bottle(23); bottle(32); bottle(41); bottle(50 - 6);
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(10, 40, 44, 3);
  });

  SPR.radioset = outlined(g => {                                      // reel-to-reel spy radio set on a stand
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 60, 15, 3, 0, 0, 7); g.fill();
    g.fillStyle = '#3a2c14'; g.fillRect(16, 50, 4, 10); g.fillRect(44, 50, 4, 10);   // stand legs
    let cab = g.createLinearGradient(12, 22, 52, 52);
    cab.addColorStop(0, '#4a4e44'); cab.addColorStop(1, '#2c2e26');
    g.fillStyle = cab; g.fillRect(12, 22, 40, 28);
    bevel(g, 12, 22, 40, 28, 'rgba(255,255,255,0.1)', 'rgba(0,0,0,0.35)');
    g.fillStyle = '#1c1e22'; g.beginPath(); g.arc(22, 32, 6.5, 0, 7); g.fill(); g.beginPath(); g.arc(42, 32, 6.5, 0, 7); g.fill();  // two tape reels
    g.strokeStyle = '#8a8a8a'; g.lineWidth = 1; g.beginPath(); g.arc(22, 32, 6.5, 0, 7); g.stroke(); g.beginPath(); g.arc(42, 32, 6.5, 0, 7); g.stroke();
    g.fillStyle = '#c9c9cc'; for (const [cx, cy] of [[22, 32], [42, 32]]) { g.beginPath(); g.arc(cx, cy, 1.6, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(200,200,200,0.4)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(28, 34); g.lineTo(36, 34); g.stroke();  // tape between reels
    g.fillStyle = '#1c1e22'; g.fillRect(15, 42, 34, 6);                 // dial/meter panel
    g.fillStyle = 'rgba(120,220,140,0.7)'; g.fillRect(17, 43.4, 6, 3.2);  // glowing needle meter
    g.strokeStyle = '#2a3a2c'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(20, 46); g.lineTo(21, 44); g.stroke();
    g.fillStyle = '#c9a227'; g.beginPath(); g.arc(40, 45, 2, 0, 7); g.fill();  // tuning knob
  });

  // ---------------------------------------------------------------------------
  // DEALEY PLAZA 1963 props — downtown Dallas civic-plaza clutter, period
  // architecture and street furniture (no depiction of the events of that day).
  // ---------------------------------------------------------------------------
  SPR.warehousebuilding = outlined(g => {                             // tall red-brick warehouse facade, period downtown architecture
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 61, 26, 3, 0, 0, 7); g.fill();
    let bg = g.createLinearGradient(4, 2, 60, 58);
    bg.addColorStop(0, '#8a3c2c'); bg.addColorStop(1, '#5c2818');
    g.fillStyle = bg; g.fillRect(4, 2, 56, 56);
    g.strokeStyle = 'rgba(30,14,8,0.4)'; g.lineWidth = 0.8;
    for (let y = 2; y < 58; y += 7) { g.beginPath(); g.moveTo(4, y); g.lineTo(60, y); g.stroke(); }
    const winRows = 6, winCols = 5;
    for (let r = 0; r < winRows; r++) for (let c = 0; c < winCols; c++) {
      const x = 8 + c * 10, y = 6 + r * 8.4;
      g.fillStyle = 'rgba(20,24,26,0.75)'; g.fillRect(x, y, 6, 5.4);
      g.fillStyle = 'rgba(140,170,185,0.3)'; g.fillRect(x + 0.5, y + 0.5, 2.4, 4.4);
      g.strokeStyle = 'rgba(40,20,12,0.5)'; g.lineWidth = 0.6; g.strokeRect(x, y, 6, 5.4);
    }
    g.fillStyle = '#3a1a10'; g.fillRect(4, 52, 56, 6);                 // ground-floor loading-dock band
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(10, 53, 12, 5); g.fillRect(42, 53, 12, 5);
    g.fillStyle = 'rgba(255,220,200,0.06)'; g.fillRect(4, 2, 56, 3);
  });

  SPR.pergolacolonnade = outlined(g => {                              // Dealey-Plaza-style concrete colonnade/pergola
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 60, 24, 3.6, 0, 0, 7); g.fill();
    let cc = g.createLinearGradient(6, 20, 58, 58);
    cc.addColorStop(0, '#e0d8c4'); cc.addColorStop(1, '#b8ae94');
    g.fillStyle = cc;
    for (const x of [8, 20, 32, 44, 56]) { g.fillRect(x - 2.5, 22, 5, 34); }   // fluted columns
    g.strokeStyle = 'rgba(120,110,88,0.4)'; g.lineWidth = 0.8;
    for (const x of [8, 20, 32, 44, 56]) { g.beginPath(); g.moveTo(x, 22); g.lineTo(x, 56); g.stroke(); }
    g.fillStyle = cc; g.fillRect(4, 16, 56, 6);                        // entablature
    bevel(g, 4, 16, 56, 6, 'rgba(255,252,240,0.2)', 'rgba(0,0,0,0.3)');
    g.fillStyle = 'rgba(255,252,240,0.14)'; for (const x of [8, 20, 32, 44, 56]) g.fillRect(x - 2.5, 22, 1.6, 34);
    g.fillStyle = '#8a7e68'; g.fillRect(4, 56, 56, 3);                 // low seating wall base
  });

  SPR.vintagelamppost = outlined(g => {                               // simple period cast-iron Americana lamppost
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 61, 7, 1.8, 0, 0, 7); g.fill();
    let ig = g.createLinearGradient(28, 14, 36, 60);
    ig.addColorStop(0, '#3a3a34'); ig.addColorStop(0.5, '#242822'); ig.addColorStop(1, '#141610');
    g.fillStyle = ig; g.fillRect(30, 24, 4, 36);
    g.beginPath(); g.ellipse(32, 60, 8, 2.2, 0, 0, 7); g.fill();
    g.fillRect(28, 22, 8, 3);                                          // collar
    const glow = g.createRadialGradient(32, 12, 0, 32, 12, 8);
    glow.addColorStop(0, 'rgba(255,240,195,0.95)'); glow.addColorStop(1, 'rgba(255,220,150,0.12)');
    g.fillStyle = glow; g.beginPath(); g.ellipse(32, 12, 7, 9, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(20,20,18,0.4)'; g.lineWidth = 1; g.beginPath(); g.ellipse(32, 12, 7, 9, 0, 0, 7); g.stroke();
    g.fillStyle = '#141610'; g.beginPath(); g.ellipse(32, 4, 3.4, 1.8, 0, 0, 7); g.fill();  // cap
  });

  SPR.streetsign = outlined(g => {                                    // green double street-name sign on a post
    g.fillStyle = 'rgba(0,0,0,0.24)'; g.beginPath(); g.ellipse(32, 60, 5, 1.4, 0, 0, 7); g.fill();
    g.fillStyle = '#8a8a8a'; g.fillRect(30, 20, 3, 40);
    let sg1 = g.createLinearGradient(6, 12, 36, 20);
    sg1.addColorStop(0, '#1e5c3a'); sg1.addColorStop(1, '#123a24');
    g.save(); g.translate(20, 16); g.rotate(-0.05);
    g.fillStyle = sg1; g.fillRect(-16, -4, 32, 8);
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 0.6; g.strokeRect(-15, -3, 30, 6);
    g.fillStyle = '#e8e4d8'; g.fillRect(-13, -1.6, 24, 3.2);
    g.restore();
    let sg2 = g.createLinearGradient(28, 24, 58, 32);
    sg2.addColorStop(0, '#1e5c3a'); sg2.addColorStop(1, '#123a24');
    g.save(); g.translate(44, 28); g.rotate(0.05);
    g.fillStyle = sg2; g.fillRect(-16, -4, 32, 8);
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 0.6; g.strokeRect(-15, -3, 30, 6);
    g.fillStyle = '#e8e4d8'; g.fillRect(-13, -1.6, 24, 3.2);
    g.restore();
  });

  SPR.newspaperbox = outlined(g => {                                  // coin-operated newspaper vending box
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 60, 11, 2.6, 0, 0, 7); g.fill();
    let bx = g.createLinearGradient(16, 18, 48, 58);
    bx.addColorStop(0, '#c9333a'); bx.addColorStop(1, '#8a1a20');
    g.fillStyle = bx; g.fillRect(16, 22, 32, 36);
    bevel(g, 16, 22, 32, 36, 'rgba(255,255,255,0.14)', 'rgba(0,0,0,0.35)');
    g.fillStyle = 'rgba(140,170,190,0.55)'; g.fillRect(19, 25, 26, 16);   // window showing the front page
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.8; g.strokeRect(19, 25, 26, 16);
    g.fillStyle = '#1c1e22'; g.fillRect(22, 28, 20, 3); g.fillRect(22, 33, 14, 2); g.fillRect(22, 37, 16, 2);   // headline lines
    g.fillStyle = '#1c1e22'; g.fillRect(20, 44, 24, 5);                // coin slot plate
    g.fillStyle = '#c9c9cc'; g.fillRect(23, 45.2, 6, 1.6);
    g.fillStyle = '#3a3226'; g.fillRect(16, 56, 32, 3);                // base
  });

  SPR.sedan1963 = outlined(g => {                                     // pastel two-tone period convertible sedan
    g.fillStyle = 'rgba(0,0,0,0.32)'; g.beginPath(); g.ellipse(32, 58, 30, 5, 0, 0, 7); g.fill();
    let body = g.createLinearGradient(2, 24, 62, 52);
    body.addColorStop(0, '#e8c8a0'); body.addColorStop(0.5, '#d0a86c'); body.addColorStop(1, '#8a6a3e');
    g.fillStyle = body;
    g.beginPath(); g.moveTo(4, 50); g.lineTo(6, 34); g.quadraticCurveTo(10, 26, 20, 25); g.lineTo(44, 25); g.quadraticCurveTo(54, 26, 58, 34); g.lineTo(60, 50); g.closePath(); g.fill();
    g.fillStyle = '#f0ece0';                                           // white lower panel (two-tone)
    g.beginPath(); g.moveTo(6, 40); g.lineTo(58, 40); g.lineTo(58, 50); g.lineTo(6, 50); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(6, 40); g.lineTo(58, 40); g.stroke();
    let glass = g.createLinearGradient(12, 27, 52, 35);                // open convertible top — bench seat visible
    glass.addColorStop(0, 'rgba(90,70,55,0.6)'); glass.addColorStop(1, 'rgba(60,45,35,0.5)');
    g.fillStyle = glass; g.beginPath(); g.moveTo(16, 34); g.lineTo(19, 27); g.lineTo(45, 27); g.lineTo(48, 34); g.closePath(); g.fill();
    g.fillStyle = '#8a6a4a'; g.fillRect(18, 30, 28, 4);                // bench seat back
    g.fillStyle = '#e8e4d8'; g.fillRect(2, 42, 4, 3); g.fillRect(58, 42, 4, 3);   // chrome bumpers
    g.fillStyle = '#1c1e22'; g.beginPath(); g.arc(15, 51, 6, 0, 7); g.fill(); g.beginPath(); g.arc(49, 51, 6, 0, 7); g.fill();
    g.fillStyle = '#c9c9cc'; g.beginPath(); g.arc(15, 51, 2.4, 0, 7); g.fill(); g.beginPath(); g.arc(49, 51, 2.4, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,240,200,0.6)'; g.beginPath(); g.ellipse(6, 44, 1.6, 2.4, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(58, 44, 1.6, 2.4, 0, 0, 7); g.fill();
  });

  SPR.flagpole = outlined(g => {                                      // Texas state flag on a pole
    g.fillStyle = 'rgba(0,0,0,0.24)'; g.beginPath(); g.ellipse(32, 61, 4, 1.4, 0, 0, 7); g.fill();
    let pg = g.createLinearGradient(29, 4, 34, 60);
    pg.addColorStop(0, '#c9c9cc'); pg.addColorStop(1, '#7a7a7e');
    g.fillStyle = pg; g.fillRect(30, 6, 2.4, 55);
    g.fillStyle = '#e8dca0'; g.beginPath(); g.arc(31.2, 4.4, 1.8, 0, 7); g.fill();       // gold ball finial
    g.save(); g.translate(32.4, 8);
    g.fillStyle = '#8a1414'; g.fillRect(0, 4, 20, 3.4);                // red stripe
    g.fillStyle = '#f0ece0'; g.fillRect(0, 7.4, 20, 3.4);              // white stripe
    g.fillStyle = '#1e3a6e'; g.fillRect(0, 0, 7, 10.8);                // blue field with star
    g.fillStyle = '#e8dca0';
    const star5 = (cx, cy, r) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283 - Math.PI / 2, rr = i % 2 === 0 ? r : r * 0.42; const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); g.fill(); };
    star5(3.5, 5.4, 3);
    g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 0.6; g.strokeRect(0, 0, 20, 10.8);
    g.restore();
  });

  SPR.stormdrain = outlined(g => {                                    // curbside storm drain grate, set in the road
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(32, 40, 20, 8, 0, 0, 7); g.fill();
    let cc = g.createLinearGradient(12, 32, 52, 48);
    cc.addColorStop(0, '#9a9686'); cc.addColorStop(1, '#726e5e');
    g.fillStyle = cc; g.beginPath(); g.ellipse(32, 40, 20, 8, 0, 0, 7); g.fill();
    g.fillStyle = '#1c1e22'; g.beginPath(); g.ellipse(32, 40, 15, 5.4, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1;
    for (let x = -12; x <= 12; x += 4) { g.beginPath(); g.moveTo(32 + x, 36); g.lineTo(32 + x * 0.86, 44); g.stroke(); }
    g.strokeStyle = 'rgba(150,145,125,0.5)'; g.lineWidth = 1;
    g.beginPath(); g.ellipse(32, 40, 20, 8, 0, 0, 7); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.1)'; g.beginPath(); g.ellipse(26, 36, 8, 2, 0, 0, 7); g.fill();
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

  // ---- weapon pickups: a hard case per gun, stenciled, in the medkit/ammo style ----
  function gunCase(label, top, bot, stencil) {
    return outlined(g => {
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 58.5, 22, 2.6, 0, 0, 7); g.fill();
      let cs = g.createLinearGradient(0, 30, 0, 58);
      cs.addColorStop(0, top); cs.addColorStop(1, bot);
      g.fillStyle = cs; g.fillRect(11, 30, 42, 28);
      bevel(g, 11, 30, 42, 28, 'rgba(255,255,255,0.3)', 'rgba(0,0,0,0.5)');
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(11, 41, 42, 1.6);              // lid seam
      g.fillStyle = '#20222a'; g.fillRect(17, 41.4, 4, 4); g.fillRect(43, 41.4, 4, 4);  // latches
      g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(17, 41.4, 4, 1); g.fillRect(43, 41.4, 4, 1);
      g.fillStyle = stencil; g.font = 'bold 8px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(label, 32, 51.5);
      g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(13, 32, 38, 1);
      speck(g, 30, 'rgba(0,0,0,0.08)', 64, 64);
    });
  }
  SPR.wpn_sterling = gunCase('STEN', '#4a4f45', '#26281f', 'rgba(220,224,200,0.8)');
  SPR.wpn_ar7 = gunCase('AR-7', '#3a3c30', '#1c1e16', 'rgba(200,210,180,0.8)');
  SPR.wpn_laser = outlined(g => {                                  // glowing gadget case
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 58.5, 22, 2.6, 0, 0, 7); g.fill();
    let cs = g.createLinearGradient(0, 30, 0, 58);
    cs.addColorStop(0, '#3a4a56'); cs.addColorStop(1, '#1a232a');
    g.fillStyle = cs; g.fillRect(11, 30, 42, 28);
    bevel(g, 11, 30, 42, 28, 'rgba(150,220,255,0.3)', 'rgba(0,0,0,0.5)');
    const gl = g.createRadialGradient(32, 44, 1, 32, 44, 12);
    gl.addColorStop(0, 'rgba(200,245,255,0.95)'); gl.addColorStop(0.6, 'rgba(60,200,255,0.6)'); gl.addColorStop(1, 'rgba(20,120,180,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(32, 44, 12, 0, 7); g.fill();
    g.fillStyle = '#0c1216'; g.fillRect(17, 41.4, 4, 4); g.fillRect(43, 41.4, 4, 4);
    speck(g, 24, 'rgba(150,220,255,0.08)', 64, 64);
  });
  SPR.wpn_golden = outlined(g => {                                 // ornate display case, velvet-lined
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 58.5, 22, 2.6, 0, 0, 7); g.fill();
    let cs = g.createLinearGradient(0, 30, 0, 58);
    cs.addColorStop(0, '#5a4020'); cs.addColorStop(1, '#2c2010');
    g.fillStyle = cs; g.fillRect(11, 30, 42, 28);
    bevel(g, 11, 30, 42, 28, 'rgba(255,220,140,0.35)', 'rgba(0,0,0,0.5)');
    g.fillStyle = '#4a1620'; g.fillRect(15, 34, 34, 20);                          // velvet interior
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(15, 34, 34, 3);
    let gd = g.createLinearGradient(20, 38, 44, 48);                             // the gun itself, resting inside
    gd.addColorStop(0, '#f0d878'); gd.addColorStop(1, '#8a6a1a');
    g.fillStyle = gd; g.beginPath(); g.moveTo(20, 44); g.lineTo(42, 40); g.lineTo(44, 44); g.lineTo(22, 48); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#20222a'; g.fillRect(17, 41.4, 4, 4); g.fillRect(43, 41.4, 4, 4);
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(17, 41.4, 4, 1); g.fillRect(43, 41.4, 4, 1);
    speck(g, 20, 'rgba(255,220,140,0.1)', 64, 64);
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

  // ---------------------------------------------------------------------------
  // MORE GREENERY — a wider palette of Havana plants and trees, street and indoor.
  // ---------------------------------------------------------------------------
  SPR.royalpalm = outlined(g => {                                  // tall royal palm — Cuba's national tree, ground-planted
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(32, 62, 9, 1.8, 0, 0, 7); g.fill();
    let tk = g.createLinearGradient(28, 0, 36, 0);                              // smooth pale grey trunk, slightly swollen
    tk.addColorStop(0, '#c9c4b0'); tk.addColorStop(0.5, '#a8a08c'); tk.addColorStop(1, '#726c5a');
    g.fillStyle = tk;
    g.beginPath(); g.moveTo(29.4, 61); g.quadraticCurveTo(28, 34, 30.4, 14); g.lineTo(33.6, 14); g.quadraticCurveTo(35.6, 34, 34.6, 61); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(60,54,40,0.3)'; g.lineWidth = 0.7;                     // faint ringed bark
    for (let i = 0; i < 9; i++) { const y = 58 - i * 5; g.beginPath(); g.moveTo(29.6, y); g.lineTo(34.4, y - 0.6); g.stroke(); }
    g.fillStyle = '#5a6b3c'; g.beginPath(); g.ellipse(32, 14, 3.6, 6, 0, 0, 7); g.fill();          // smooth green crownshaft
    const frond = (rot, len, c1, c2) => {
      g.save(); g.translate(32, 12); g.rotate(rot);
      const fg = g.createLinearGradient(0, 0, 0, -len);
      fg.addColorStop(0, c2); fg.addColorStop(1, c1);
      g.fillStyle = fg;
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-3.4, -len * 0.5, -1, -len); g.quadraticCurveTo(0, -len * 0.9, 1, -len); g.quadraticCurveTo(3.4, -len * 0.5, 0, 0);
      g.closePath(); g.fill();
      g.restore();
    };
    frond(-1.5, 15, '#2c5a30', '#1c3f20'); frond(-1.0, 17, '#356a38', '#234a26');
    frond(-0.4, 19, '#3f7a42', '#2a5530'); frond(0.4, 19, '#3f7a42', '#2a5530');
    frond(1.0, 17, '#356a38', '#234a26'); frond(1.5, 15, '#2c5a30', '#1c3f20');
    frond(0, 20, '#4a8a4e', '#316038');
  });

  SPR.bananaplant = outlined(g => {                                 // banana tree, broad tropical leaves
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(32, 61, 14, 2.4, 0, 0, 7); g.fill();
    let tk = g.createLinearGradient(28, 0, 36, 0);
    tk.addColorStop(0, '#8ea25a'); tk.addColorStop(0.5, '#6a7f3e'); tk.addColorStop(1, '#455326');
    g.fillStyle = tk; g.beginPath(); g.moveTo(29, 60); g.quadraticCurveTo(28.6, 40, 30.4, 26); g.lineTo(33.6, 26); g.quadraticCurveTo(35.4, 40, 35, 60); g.closePath(); g.fill();
    const leaf = (rot, len, w, tilt, c1, c2) => {
      g.save(); g.translate(32, 27); g.rotate(rot);
      const fg = g.createLinearGradient(0, 0, -len * 0.3, -len);
      fg.addColorStop(0, c2); fg.addColorStop(1, c1);
      g.fillStyle = fg;
      g.beginPath(); g.moveTo(0, 0);
      g.quadraticCurveTo(-w, -len * 0.4 + tilt, -w * 0.5, -len + tilt);
      g.quadraticCurveTo(0, -len * 0.85 + tilt, w * 0.5, -len - tilt);
      g.quadraticCurveTo(w, -len * 0.4 - tilt, 0, 0);
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(20,40,10,0.4)'; g.lineWidth = 0.9;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(tilt * 0.4, -len + tilt * 0.4); g.stroke();
      g.restore();
    };
    leaf(-1.1, 22, 11, -4, '#2a5a2c', '#1c3e1e'); leaf(-0.5, 26, 13, -2, '#3a7a3c', '#265428');
    leaf(0.1, 27, 13, 3, '#4a9048', '#2f6432'); leaf(0.7, 24, 12, 5, '#3a7a3c', '#265428');
    leaf(1.2, 20, 10, 6, '#2a5a2c', '#1c3e1e');
    g.fillStyle = '#5a3018'; g.beginPath(); g.moveTo(32, 28); g.quadraticCurveTo(38, 34, 36, 42); g.lineTo(33, 41); g.quadraticCurveTo(35, 34, 30, 29); g.closePath(); g.fill();  // hanging flower stalk
    g.fillStyle = '#d8c840'; for (const [fx, fy] of [[34, 38], [35, 41]]) { g.beginPath(); g.ellipse(fx, fy, 2.4, 1.4, 0.3, 0, 7); g.fill(); }  // a few green bananas
  });

  SPR.bougainvillea = outlined(g => {                               // flowering shrub in a pot, vivid magenta bracts
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 62.4, 12, 2.2, 0, 0, 7); g.fill();
    let pt = g.createLinearGradient(24, 0, 40, 0);
    pt.addColorStop(0, '#c9784a'); pt.addColorStop(0.45, '#a9552c'); pt.addColorStop(1, '#6e3417');
    g.fillStyle = pt; g.beginPath(); g.moveTo(23, 48); g.lineTo(41, 48); g.lineTo(38, 63); g.lineTo(26, 63); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,235,210,0.3)'; g.fillRect(22.6, 45.4, 18.8, 0.9);
    let rm = g.createLinearGradient(0, 45.4, 0, 49);
    rm.addColorStop(0, '#d98d5c'); rm.addColorStop(1, '#8f4520');
    g.fillStyle = rm; g.fillRect(22, 45.4, 20, 3.6);
    g.strokeStyle = '#4a3018'; g.lineWidth = 1.6;                                // wiry woody stems
    g.beginPath(); g.moveTo(32, 46); g.quadraticCurveTo(24, 32, 27, 16); g.stroke();
    g.beginPath(); g.moveTo(32, 46); g.quadraticCurveTo(40, 30, 36, 14); g.stroke();
    g.beginPath(); g.moveTo(32, 46); g.quadraticCurveTo(32, 26, 32, 12); g.stroke();
    g.fillStyle = '#2c5a30';                                                     // small green foliage clusters
    for (const [lx, ly] of [[26, 22], [37, 20], [32, 16], [22, 30], [41, 28]]) { g.beginPath(); g.ellipse(lx, ly, 4, 3, 0, 0, 7); g.fill(); }
    g.fillStyle = '#d8347a';                                                     // magenta bract clusters — the showy part
    for (const [bx, by, r] of [[24, 15, 5], [37, 12, 5.4], [30, 9, 4.4], [43, 22, 4], [20, 26, 3.6]]) {
      for (let i = 0; i < 5; i++) { const a2 = i / 5 * 6.283; g.beginPath(); g.ellipse(bx + Math.cos(a2) * r * 0.5, by + Math.sin(a2) * r * 0.5, r * 0.5, r * 0.32, a2, 0, 7); g.fill(); }
    }
    g.fillStyle = 'rgba(255,255,255,0.3)'; for (const [bx, by] of [[24, 15], [37, 12], [30, 9]]) { g.beginPath(); g.arc(bx, by, 1, 0, 7); g.fill(); }
  });

  SPR.fern = outlined(g => {                                        // lush potted fern, shaded-courtyard plant
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 60.4, 11, 2, 0, 0, 7); g.fill();
    let pt = g.createLinearGradient(23, 0, 41, 0);
    pt.addColorStop(0, '#8a8070'); pt.addColorStop(0.45, '#6a6152'); pt.addColorStop(1, '#443e32');
    g.fillStyle = pt; g.beginPath(); g.moveTo(24, 46); g.lineTo(40, 46); g.lineTo(37.6, 61); g.lineTo(26.4, 61); g.closePath(); g.fill();
    bevel(g, 24, 44, 16, 3, 'rgba(255,255,255,0.2)', 'rgba(0,0,0,0.3)');
    g.fillStyle = '#3a3428'; g.beginPath(); g.ellipse(32, 45, 7, 1.4, 0, 0, 7); g.fill();
    const spray = (rot, len, c1, c2) => {
      g.save(); g.translate(32, 44); g.rotate(rot);
      g.strokeStyle = c1; g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-2, -len * 0.5, 0, -len); g.stroke();
      for (let i = 2; i < len; i += 3) {
        const t = i / len, w = 4 * (1 - t * 0.6);
        g.fillStyle = c2;
        g.beginPath(); g.ellipse(-2 - w * 0.4, -i, w * 0.5, 1.6, -0.5, 0, 7); g.fill();
        g.beginPath(); g.ellipse(2 + w * 0.4, -i, w * 0.5, 1.6, 0.5, 0, 7); g.fill();
      }
      g.restore();
    };
    for (const rot of [-0.9, -0.5, -0.15, 0.15, 0.5, 0.9]) spray(rot, 26 + Math.random() * 4, 'rgba(20,50,16,0.5)', ['#2c6030', '#3a7a3c', '#245026'][((rot + 1) * 3) | 0]);
  });

  SPR.cactus = outlined(g => {                                      // potted cactus/succulent, desk or patio accent
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(32, 60, 9, 1.8, 0, 0, 7); g.fill();
    let pt = g.createLinearGradient(25, 0, 39, 0);
    pt.addColorStop(0, '#d89058'); pt.addColorStop(0.45, '#b06e38'); pt.addColorStop(1, '#7a4620');
    g.fillStyle = pt; g.beginPath(); g.moveTo(25, 48); g.lineTo(39, 48); g.lineTo(37, 60); g.lineTo(27, 60); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,235,210,0.3)'; g.fillRect(24.6, 46, 14.8, 0.9);
    g.fillStyle = '#c9924a'; g.fillRect(24, 46, 16, 3);
    let cb = g.createLinearGradient(24, 20, 40, 48);                             // barrel cactus body
    cb.addColorStop(0, '#4a8a52'); cb.addColorStop(1, '#2c5a32');
    g.fillStyle = cb; g.beginPath(); g.ellipse(32, 36, 9, 13, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(20,50,20,0.4)'; g.lineWidth = 1;                       // vertical ribs
    for (const dx of [-6, -3, 0, 3, 6]) { g.beginPath(); g.moveTo(32 + dx, 24); g.quadraticCurveTo(32 + dx * 1.1, 36, 32 + dx, 48); g.stroke(); }
    g.fillStyle = '#e8dca0'; for (const dx of [-6, -3, 0, 3, 6]) for (let y = 26; y < 46; y += 5) { g.beginPath(); g.arc(32 + dx, y, 0.5, 0, 7); g.fill(); }  // spines
    g.fillStyle = '#d8347a'; g.beginPath(); g.arc(32, 23, 2.4, 0, 7); g.fill();   // a single flower on top
    g.fillStyle = '#e858a0'; g.beginPath(); g.arc(31, 22, 1, 0, 7); g.fill();
  });

  SPR.hedge = outlined(g => {                                       // trimmed boxwood hedge / planter box
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 58, 22, 3, 0, 0, 7); g.fill();
    let bx = g.createLinearGradient(0, 40, 0, 56);
    bx.addColorStop(0, '#8a6a48'); bx.addColorStop(1, '#5a4228');
    g.fillStyle = bx; g.fillRect(10, 40, 44, 16);
    bevel(g, 10, 40, 44, 16, 'rgba(255,220,170,0.2)', 'rgba(0,0,0,0.4)');
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(10, 40, 44, 2);
    let fo = g.createLinearGradient(0, 18, 0, 42);                               // rounded clipped foliage mass
    fo.addColorStop(0, '#4a8a4e'); fo.addColorStop(1, '#2c5a32');
    g.fillStyle = fo;
    g.beginPath(); g.moveTo(10, 42); g.quadraticCurveTo(8, 18, 22, 16); g.quadraticCurveTo(32, 10, 42, 16); g.quadraticCurveTo(56, 18, 54, 42); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.beginPath(); g.ellipse(24, 22, 10, 6, -0.2, 0, 7); g.fill();
    speck(g, 60, 'rgba(0,50,10,0.15)'); speck(g, 30, 'rgba(200,255,180,0.08)');
    g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(10, 42); g.quadraticCurveTo(8, 18, 22, 16); g.quadraticCurveTo(32, 10, 42, 16); g.quadraticCurveTo(56, 18, 54, 42); g.stroke();
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
  SPR.safeOpen = SPR.safe;   // door-open state — placeholder until/unless shipped art overrides it

  SPR.ciphermachine = outlined(g => {                             // Enigma-esque cipher machine, three rotors + keys
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 60, 20, 3, 0, 0, 7); g.fill();
    let bd = g.createLinearGradient(0, 30, 0, 58);
    bd.addColorStop(0, '#5a4a30'); bd.addColorStop(0.5, '#3a3020'); bd.addColorStop(1, '#201810');
    g.fillStyle = bd; g.fillRect(12, 30, 40, 28);
    bevel(g, 12, 30, 40, 28, 'rgba(255,240,200,0.2)', 'rgba(0,0,0,0.5)');
    g.fillStyle = '#0c0d10'; g.fillRect(16, 34, 32, 10);                        // rotor housing recess
    for (const rx of [22, 32, 42]) {
      let rot = g.createRadialGradient(rx, 39, 0.5, rx, 39, 4.4);
      rot.addColorStop(0, '#e8dca0'); rot.addColorStop(0.7, '#a8925a'); rot.addColorStop(1, '#5a4a28');
      g.fillStyle = rot; g.beginPath(); g.arc(rx, 39, 4.2, 0, 7); g.fill();
      g.strokeStyle = '#1c1712'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(rx, 39); g.lineTo(rx + 3, 36.6); g.stroke();
      g.fillStyle = '#1c1712'; g.font = 'bold 5px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ABC'[(rx / 10) | 0] || 'Q', rx, 40.6);
    }
    g.fillStyle = '#1c1e22';                                                    // key rows
    for (let row = 0; row < 2; row++) for (let col = 0; col < 8; col++) {
      const kx = 16 + col * 3.6 - row * 1.2, ky = 48 + row * 4;
      g.beginPath(); g.arc(kx, ky, 1.4, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.15)'; g.beginPath(); g.arc(kx - 0.4, ky - 0.4, 0.5, 0, 7); g.fill();
      g.fillStyle = '#1c1e22';
    }
    g.fillStyle = '#c9a227'; g.fillRect(14, 31.4, 8, 1.4);                       // brass plate
  });

  SPR.bomb = outlined(g => {                                      // "the B" — casing on: sealed cylinder + countdown
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 58, 18, 3, 0, 0, 7); g.fill();
    let cs = g.createLinearGradient(14, 24, 50, 24);
    cs.addColorStop(0, '#3a3d44'); cs.addColorStop(0.5, '#5a5f68'); cs.addColorStop(1, '#24262c');
    g.fillStyle = cs; g.fillRect(14, 24, 36, 32);
    bevel(g, 14, 24, 36, 32, 'rgba(255,255,255,0.2)', 'rgba(0,0,0,0.5)');
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(14, 24 + i * 8); g.lineTo(50, 24 + i * 8); g.stroke(); }
    g.fillStyle = '#0c0d10'; g.fillRect(20, 30, 24, 10);                        // countdown display
    g.fillStyle = '#e02020'; g.font = 'bold 9px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('00:47', 32, 35.4);
    g.fillStyle = '#c9302a'; g.beginPath(); g.arc(24, 48, 2.4, 0, 7); g.fill();          // status LEDs
    g.fillStyle = '#3aa848'; g.beginPath(); g.arc(32, 48, 2.4, 0, 7); g.fill();
    g.fillStyle = '#3a5ec9'; g.beginPath(); g.arc(40, 48, 2.4, 0, 7); g.fill();
    g.fillStyle = '#8a8f98'; g.fillRect(18, 20, 4, 6); g.fillRect(42, 20, 4, 6);         // bolt caps top corners
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 0.8; g.strokeRect(18, 20, 4, 6); g.strokeRect(42, 20, 4, 6);
  });
  SPR.bombOpen = outlined(g => {                                  // casing removed — red/blue wires exposed
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 58, 18, 3, 0, 0, 7); g.fill();
    let cs = g.createLinearGradient(14, 24, 50, 24);
    cs.addColorStop(0, '#3a3d44'); cs.addColorStop(0.5, '#5a5f68'); cs.addColorStop(1, '#24262c');
    g.fillStyle = cs; g.fillRect(14, 24, 36, 32);
    bevel(g, 14, 24, 36, 32, 'rgba(255,255,255,0.2)', 'rgba(0,0,0,0.5)');
    g.fillStyle = '#0c0d10'; g.fillRect(19, 29, 26, 24);                        // open cavity
    g.fillStyle = '#0c0d10'; g.fillRect(20, 30, 24, 10); g.fillStyle = '#e02020';
    g.font = 'bold 9px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('00:12', 32, 35.4);
    g.strokeStyle = '#2050c9'; g.lineWidth = 2.6; g.lineCap = 'round';           // blue wire
    g.beginPath(); g.moveTo(23, 44); g.quadraticCurveTo(29, 48, 27, 52); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.2)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(23, 44); g.quadraticCurveTo(29, 48, 27, 52); g.stroke();
    g.strokeStyle = '#c9302a'; g.lineWidth = 2.6; g.lineCap = 'round';          // red wire
    g.beginPath(); g.moveTo(41, 44); g.quadraticCurveTo(35, 48, 37, 52); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.2)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(41, 44); g.quadraticCurveTo(35, 48, 37, 52); g.stroke();
    g.fillStyle = '#8a8f98'; g.fillRect(18, 20, 4, 6); g.fillRect(42, 20, 4, 6);
  });
  SPR.bombRedCut = SPR.bombOpen;    // wrong-wire-cut state — placeholder until/unless shipped art overrides it
  SPR.bombBlueCut = SPR.bombOpen;   // right-wire-cut state — placeholder until/unless shipped art overrides it

  SPR.microfichemachine = outlined(g => {                         // viewer, blank screen — idle state
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 60, 20, 3, 0, 0, 7); g.fill();
    let bd = g.createLinearGradient(0, 20, 0, 58);
    bd.addColorStop(0, '#5a5f42'); bd.addColorStop(0.5, '#454a30'); bd.addColorStop(1, '#282b1b');
    g.fillStyle = bd; g.fillRect(12, 42, 40, 16);
    bevel(g, 12, 42, 40, 16, 'rgba(255,255,255,0.18)', 'rgba(0,0,0,0.5)');
    g.strokeStyle = '#2a2d33'; g.lineWidth = 3; g.beginPath(); g.moveTo(28, 42); g.lineTo(24, 20); g.stroke();  // gooseneck arm
    g.beginPath(); g.moveTo(36, 42); g.lineTo(40, 20); g.stroke();
    let scr = g.createLinearGradient(14, 12, 50, 30);
    scr.addColorStop(0, '#2a2e26'); scr.addColorStop(1, '#14160f');
    g.fillStyle = scr; g.fillRect(14, 12, 36, 18);
    bevel(g, 14, 12, 36, 18, 'rgba(200,220,180,0.15)', 'rgba(0,0,0,0.5)');
    g.fillStyle = 'rgba(140,200,140,0.4)'; g.font = '6px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('- NO FICHE LOADED -', 32, 21);
    g.fillStyle = '#1c1e22'; g.beginPath(); g.arc(20, 50, 2.4, 0, 7); g.fill();          // focus knob
  });
  SPR.microfichemachineOn = outlined(g => {                        // showing the newspaper article — active state
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 60, 20, 3, 0, 0, 7); g.fill();
    let bd = g.createLinearGradient(0, 20, 0, 58);
    bd.addColorStop(0, '#5a5f42'); bd.addColorStop(0.5, '#454a30'); bd.addColorStop(1, '#282b1b');
    g.fillStyle = bd; g.fillRect(12, 42, 40, 16);
    bevel(g, 12, 42, 40, 16, 'rgba(255,255,255,0.18)', 'rgba(0,0,0,0.5)');
    g.strokeStyle = '#2a2d33'; g.lineWidth = 3; g.beginPath(); g.moveTo(28, 42); g.lineTo(24, 20); g.stroke();
    g.beginPath(); g.moveTo(36, 42); g.lineTo(40, 20); g.stroke();
    let scr = g.createLinearGradient(14, 12, 50, 30);
    scr.addColorStop(0, '#e8e4d4'); scr.addColorStop(1, '#c9c4ac');
    g.fillStyle = scr; g.fillRect(14, 12, 36, 18);
    bevel(g, 14, 12, 36, 18, 'rgba(255,255,255,0.4)', 'rgba(0,0,0,0.4)');
    g.fillStyle = '#1c1e22'; g.font = 'bold 6px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('AMBASSADOR', 32, 17); g.fillText('SLAIN IN HK', 32, 23);
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(17, 26.4 + i * 1.4); g.lineTo(47, 26.4 + i * 1.4); g.stroke(); }
    g.fillStyle = '#1c1e22'; g.beginPath(); g.arc(20, 50, 2.4, 0, 7); g.fill();
  });

  SPR.disguise = outlined(g => {                                  // novelty glasses/nose/moustache under a tilted fedora
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(32, 51, 17, 3, 0, 0, 7); g.fill();
    let brim = g.createLinearGradient(10, 30, 54, 40);                       // fedora brim, tilted
    brim.addColorStop(0, '#8a6a3e'); brim.addColorStop(0.5, '#6b4e28'); brim.addColorStop(1, '#4a3418');
    g.fillStyle = brim; g.beginPath(); g.ellipse(32, 34, 22, 7, -0.08, 0, 7); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1; g.beginPath(); g.ellipse(32, 34, 22, 7, -0.08, 0, 7); g.stroke();
    g.fillStyle = 'rgba(255,235,190,0.18)'; g.beginPath(); g.ellipse(30, 31.4, 16, 3, -0.08, 0, 7); g.fill();
    let crown = g.createLinearGradient(16, 12, 48, 30);                      // crown, dented top, sitting back on the brim
    crown.addColorStop(0, '#9a7a48'); crown.addColorStop(0.5, '#7a5c30'); crown.addColorStop(1, '#4a3418');
    g.fillStyle = crown;
    g.beginPath(); g.moveTo(18, 30); g.quadraticCurveTo(16, 12, 32, 10); g.quadraticCurveTo(48, 12, 46, 30); g.closePath(); g.fill();
    g.fillStyle = '#241a10'; g.fillRect(16, 26, 32, 4);                      // hatband
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1;                     // dent crease
    g.beginPath(); g.moveTo(32, 11); g.lineTo(32, 24); g.stroke();
    g.fillStyle = '#0c0d10'; g.beginPath(); g.ellipse(20, 42, 5.6, 4, 0, 0, 7); g.fill();  // glasses frames, big round
    g.fillStyle = '#0c0d10'; g.beginPath(); g.ellipse(44, 42, 5.6, 4, 0, 0, 7); g.fill();
    g.strokeStyle = '#0c0d10'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(25.4, 42); g.lineTo(38.6, 42); g.stroke();  // bridge
    g.fillStyle = 'rgba(120,160,190,0.3)'; g.beginPath(); g.ellipse(20, 42, 4, 2.8, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(120,160,190,0.3)'; g.beginPath(); g.ellipse(44, 42, 4, 2.8, 0, 0, 7); g.fill();
    let nose = g.createRadialGradient(32, 46, 1, 32, 46, 6);                 // the big fake nose
    nose.addColorStop(0, '#e0a878'); nose.addColorStop(1, '#a8703e');
    g.fillStyle = nose; g.beginPath(); g.ellipse(32, 46.4, 5, 5.6, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.arc(29.6, 47.6, 1, 0, 7); g.fill(); g.beginPath(); g.arc(34.4, 47.6, 1, 0, 7); g.fill();
    g.fillStyle = '#1c1712';                                                 // the bushy moustache
    g.beginPath(); g.moveTo(20, 51); g.quadraticCurveTo(26, 47.6, 32, 50.4); g.quadraticCurveTo(38, 47.6, 44, 51);
    g.quadraticCurveTo(38, 54.4, 32, 52.4); g.quadraticCurveTo(26, 54.4, 20, 51); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.beginPath(); g.moveTo(22, 50.4); g.quadraticCurveTo(27, 48.4, 32, 50.4); g.stroke();
  });

  SPR.book = outlined(g => {                                      // an open book, a folded paper tucked inside
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(32, 47, 19, 3, 0, 0, 7); g.fill();
    let cov = g.createLinearGradient(10, 32, 54, 32);                        // left + right covers, fanned open
    cov.addColorStop(0, '#6e2418'); cov.addColorStop(0.5, '#8a3020'); cov.addColorStop(1, '#6e2418');
    g.fillStyle = cov;
    g.beginPath(); g.moveTo(10, 44); g.lineTo(13, 30); g.lineTo(32, 34); g.lineTo(32, 47); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(54, 44); g.lineTo(51, 30); g.lineTo(32, 34); g.lineTo(32, 47); g.closePath(); g.fill();
    let pg = g.createLinearGradient(0, 30, 0, 46);                           // pages, cream, fanned
    pg.addColorStop(0, '#f0e8d0'); pg.addColorStop(1, '#d8cca4');
    g.fillStyle = pg;
    g.beginPath(); g.moveTo(13.6, 32.6); g.lineTo(16, 31.6); g.lineTo(32, 35.4); g.lineTo(32, 46); g.lineTo(15, 43.4); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(50.4, 32.6); g.lineTo(48, 31.6); g.lineTo(32, 35.4); g.lineTo(32, 46); g.lineTo(49, 43.4); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(120,100,60,0.35)'; g.lineWidth = 0.6;              // text hint lines
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(17, 34.6 + i * 2); g.lineTo(29, 36.2 + i * 1.6); g.stroke(); g.beginPath(); g.moveTo(35, 36.2 + i * 1.6); g.lineTo(47, 34.6 + i * 2); g.stroke(); }
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(32, 34); g.lineTo(32, 47); g.stroke();  // spine
    let paper = g.createLinearGradient(24, 38, 40, 48);                      // the folded paper, poking out
    paper.addColorStop(0, '#fff8e0'); paper.addColorStop(1, '#e8dcae');
    g.fillStyle = paper; g.save(); g.translate(32, 43); g.rotate(0.15);
    g.fillRect(-9, -6, 18, 12);
    g.restore();
    g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 0.8;
    g.save(); g.translate(32, 43); g.rotate(0.15); g.strokeRect(-9, -6, 18, 12);
    g.fillStyle = '#8a1414'; g.font = 'bold 7px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('11.22.63', 0, 0); g.restore();
  });

  SPR.letter = outlined(g => {                                    // a coded letter, sealed
    g.fillStyle = 'rgba(0,0,0,0.24)'; g.beginPath(); g.ellipse(32, 46, 16, 2.6, 0, 0, 7); g.fill();
    let env = g.createLinearGradient(16, 32, 48, 44);
    env.addColorStop(0, '#e8ddc0'); env.addColorStop(1, '#c9bc94');
    g.fillStyle = env; g.fillRect(16, 32, 32, 22);
    bevel(g, 16, 32, 32, 22, 'rgba(255,255,255,0.3)', 'rgba(0,0,0,0.35)');
    g.fillStyle = 'rgba(120,105,70,0.4)'; g.beginPath(); g.moveTo(16, 32); g.lineTo(32, 44); g.lineTo(48, 32); g.stroke();
    g.strokeStyle = 'rgba(120,105,70,0.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(16, 32); g.lineTo(32, 44); g.lineTo(48, 32); g.stroke();
    g.strokeStyle = 'rgba(60,50,30,0.5)'; g.lineWidth = 0.6;                     // gibberish coded text hint
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(20, 46 + i * 2.4); g.lineTo(44, 46 + i * 2.4); g.stroke(); }
    let sealGrad = g.createRadialGradient(32, 34, 0.5, 32, 34, 4);
    sealGrad.addColorStop(0, '#c94a3a'); sealGrad.addColorStop(1, '#7e241a');
    g.fillStyle = sealGrad; g.beginPath(); g.arc(32, 34, 3.6, 0, 7); g.fill();
  });

  SPR.telegram = outlined(g => {                                  // Dr Z's urgent telegram, RUSH stamped
    g.fillStyle = 'rgba(0,0,0,0.24)'; g.beginPath(); g.ellipse(32, 46, 17, 2.6, 0, 0, 7); g.fill();
    let paper = g.createLinearGradient(14, 28, 50, 46);
    paper.addColorStop(0, '#f0d878'); paper.addColorStop(1, '#d0ae4a');
    g.fillStyle = paper; g.fillRect(14, 28, 36, 20);
    bevel(g, 14, 28, 36, 20, 'rgba(255,255,255,0.3)', 'rgba(0,0,0,0.3)');
    g.fillStyle = '#8a1414'; g.save(); g.translate(24, 34); g.rotate(-0.2);
    g.strokeStyle = '#8a1414'; g.lineWidth = 1.4; g.strokeRect(-8, -3, 16, 6);
    g.font = 'bold 6px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('RUSH', 0, 0.4);
    g.restore();
    g.strokeStyle = 'rgba(60,50,10,0.45)'; g.lineWidth = 0.6;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(18, 40 + i * 2.4); g.lineTo(46, 40 + i * 2.4); g.stroke(); }
  });

  SPR.businesscard = outlined(g => {                              // Exports Universal business card
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(32, 43, 13, 2.2, 0, 0, 7); g.fill();
    let cd = g.createLinearGradient(20, 34, 44, 42);
    cd.addColorStop(0, '#f4f0e2'); cd.addColorStop(1, '#d8d0b8');
    g.fillStyle = cd; g.save(); g.translate(32, 38); g.rotate(-0.1); g.fillRect(-12, -5, 24, 10);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.8; g.strokeRect(-12, -5, 24, 10);
    g.fillStyle = '#1c3a5c'; g.font = 'bold 4.6px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('EXPORTS', 0, -1.4); g.fillText('UNIVERSAL', 0, 2);
    g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(-9, 4.4); g.lineTo(9, 4.4); g.stroke();
    g.restore();
  });

  SPR.watch = outlined(g => {                                     // an heirloom pocket watch, chain coiled beside it
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(32, 46, 13, 2.4, 0, 0, 7); g.fill();
    g.strokeStyle = '#c9a227'; g.lineWidth = 1.2;                                // coiled chain
    g.beginPath(); g.arc(22, 42, 5, 0.2, 5.5); g.stroke();
    g.beginPath(); g.arc(20, 40, 3, 0.2, 5.5); g.stroke();
    let cs = g.createRadialGradient(34, 34, 1, 34, 34, 11);
    cs.addColorStop(0, '#f0d878'); cs.addColorStop(0.6, '#c9a227'); cs.addColorStop(1, '#7a5c14');
    g.fillStyle = cs; g.beginPath(); g.arc(34, 34, 10, 0, 7); g.fill();
    g.strokeStyle = '#5a4210'; g.lineWidth = 1.2; g.beginPath(); g.arc(34, 34, 10, 0, 7); g.stroke();
    g.fillStyle = '#f4efe0'; g.beginPath(); g.arc(34, 34, 7, 0, 7); g.fill();
    g.strokeStyle = '#1c1e22'; g.lineWidth = 0.8;
    for (let i = 0; i < 12; i++) { const a2 = i / 12 * 6.283; g.beginPath(); g.moveTo(34 + Math.cos(a2) * 5.6, 34 + Math.sin(a2) * 5.6); g.lineTo(34 + Math.cos(a2) * 6.6, 34 + Math.sin(a2) * 6.6); g.stroke(); }
    g.beginPath(); g.moveTo(34, 34); g.lineTo(34, 30); g.moveTo(34, 34); g.lineTo(37, 35); g.stroke();
    g.fillStyle = '#c9a227'; g.beginPath(); g.arc(34, 24.4, 1.6, 0, 7); g.fill();       // crown/stem
  });

  SPR.personnelfile = outlined(g => {                             // manila folder, CONFIDENTIAL, a clipped photo
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(32, 48, 18, 2.6, 0, 0, 7); g.fill();
    let fl = g.createLinearGradient(12, 30, 52, 46);
    fl.addColorStop(0, '#d8b878'); fl.addColorStop(1, '#b8925a');
    g.fillStyle = fl; g.fillRect(12, 32, 40, 16);
    g.fillStyle = 'rgba(90,60,20,0.3)'; g.beginPath(); g.moveTo(12, 32); g.lineTo(22, 27); g.lineTo(34, 27); g.lineTo(38, 32); g.closePath(); g.fill();
    bevel(g, 12, 32, 40, 16, 'rgba(255,240,200,0.3)', 'rgba(0,0,0,0.35)');
    g.fillStyle = '#f0ece0'; g.fillRect(35, 33.6, 9, 11);                              // clipped photo, corner
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.8; g.strokeRect(35, 33.6, 9, 11);
    g.fillStyle = '#c9a06a'; g.beginPath(); g.arc(39.4, 37.6, 2.4, 0, 7); g.fill();
    g.fillStyle = '#8a1414'; g.font = 'bold 5px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.save(); g.translate(22, 40); g.rotate(-0.05); g.fillText('CONFIDENTIAL', 0, 0); g.restore();
  });

  SPR.microfiche = outlined(g => {                                // a small translucent microfiche slide
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(32, 42, 11, 2, 0, 0, 7); g.fill();
    let mf = g.createLinearGradient(22, 34, 42, 42);
    mf.addColorStop(0, 'rgba(200,210,200,0.7)'); mf.addColorStop(1, 'rgba(140,150,140,0.7)');
    g.fillStyle = mf; g.fillRect(22, 34, 20, 8);
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 0.8; g.strokeRect(22, 34, 20, 8);
    g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 0.5;
    for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(22 + i * 5, 34); g.lineTo(22 + i * 5, 42); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(23, 35, 18, 1.2);
  });

  SPR.screwdriver = outlined(g => {                               // flathead screwdriver, red handle
    g.fillStyle = 'rgba(0,0,0,0.24)'; g.beginPath(); g.ellipse(32, 47, 15, 2.2, 0, 0, 7); g.fill();
    let sh = g.createLinearGradient(14, 40, 32, 44);
    sh.addColorStop(0, '#e8ecf0'); sh.addColorStop(1, '#9aa0aa');
    g.strokeStyle = sh; g.lineWidth = 2.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(14, 44); g.lineTo(32, 40); g.stroke();
    g.fillStyle = '#c9ccd4'; g.fillRect(12.6, 42.6, 3, 2.8);                            // tip
    let hd = g.createLinearGradient(30, 34, 50, 44);
    hd.addColorStop(0, '#c9302a'); hd.addColorStop(1, '#7a1c18');
    g.fillStyle = hd; g.beginPath(); g.ellipse(42, 38, 10, 5, -0.35, 0, 7); g.fill();
    bevel(g, 34, 33, 16, 10, 'rgba(255,255,255,0.2)', 'rgba(0,0,0,0.3)');
  });

  SPR.pliers = outlined(g => {                                    // red-handled pliers
    g.fillStyle = 'rgba(0,0,0,0.24)'; g.beginPath(); g.ellipse(32, 48, 15, 2.2, 0, 0, 7); g.fill();
    g.strokeStyle = '#8a8f98'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(20, 32); g.lineTo(30, 42); g.stroke();
    g.beginPath(); g.moveTo(44, 32); g.lineTo(34, 42); g.stroke();
    g.fillStyle = '#c9302a';
    g.save(); g.translate(24, 46); g.rotate(0.7); g.fillRect(-3, -8, 6, 12); g.restore();  // red rubber grips
    g.save(); g.translate(40, 46); g.rotate(-0.7); g.fillRect(-3, -8, 6, 12); g.restore();
    g.fillStyle = '#5a5e66'; g.beginPath(); g.arc(32, 39, 2.2, 0, 7); g.fill();          // pivot
  });

  SPR.headshot = outlined(g => {                                  // a studio headshot photograph, cover-document issue
    g.fillStyle = 'rgba(0,0,0,0.24)'; g.beginPath(); g.ellipse(32, 46, 14, 2.4, 0, 0, 7); g.fill();
    let bd = g.createLinearGradient(16, 28, 48, 44);
    bd.addColorStop(0, '#f0ece0'); bd.addColorStop(1, '#d4cebe');
    g.fillStyle = bd; g.fillRect(16, 28, 32, 18);
    bevel(g, 16, 28, 32, 18, 'rgba(255,255,255,0.3)', 'rgba(0,0,0,0.3)');
    g.fillStyle = '#3a342a'; g.fillRect(20, 31, 24, 12);              // the photo itself, sepia-toned
    let sk = g.createRadialGradient(30, 35, 1, 32, 37, 6);
    sk.addColorStop(0, '#a89078'); sk.addColorStop(1, '#6a5c48');
    g.fillStyle = sk; g.beginPath(); g.arc(32, 37, 4.4, 0, 7); g.fill();  // face silhouette
    g.fillStyle = '#241e18'; g.beginPath(); g.ellipse(32, 33.4, 4, 2.4, 0, Math.PI, 0, true); g.fill();  // hairline
    g.fillStyle = 'rgba(240,236,224,0.5)'; g.fillRect(20, 40.5, 24, 1.4);
  });

  SPR.metroticket = outlined(g => {                               // a single Paris Métro ticket
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(32, 42, 11, 2, 0, 0, 7); g.fill();
    let tk = g.createLinearGradient(20, 34, 44, 44);
    tk.addColorStop(0, '#e8d8a0'); tk.addColorStop(1, '#c9b878');
    g.save(); g.translate(32, 39); g.rotate(-0.08);
    g.fillStyle = tk; g.fillRect(-12, -5, 24, 10);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.8; g.strokeRect(-12, -5, 24, 10);
    g.fillStyle = '#1c3a5c'; g.font = 'bold 3.6px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('METRO', 0, -1.6);
    g.strokeStyle = 'rgba(30,58,92,0.5)'; g.lineWidth = 0.6; for (let x = -9; x <= 9; x += 3) { g.beginPath(); g.moveTo(x, 0.5); g.lineTo(x, 4); g.stroke(); }  // magnetic stripe hatching
    g.restore();
  });

  SPR.fabergeegg = outlined(g => {                                // Romanov Fabergé egg — gold, jeweled, on a stand
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 58, 12, 2.6, 0, 0, 7); g.fill();
    g.fillStyle = '#c9a227'; g.beginPath(); g.moveTo(24, 56); g.lineTo(40, 56); g.lineTo(36, 50); g.lineTo(28, 50); g.closePath(); g.fill();  // gold stand
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(28, 50); g.lineTo(24, 56); g.moveTo(36, 50); g.lineTo(40, 56); g.stroke();
    const eg = g.createRadialGradient(27, 24, 1, 32, 32, 18);
    eg.addColorStop(0, '#fff4c0'); eg.addColorStop(0.45, '#e8c860'); eg.addColorStop(0.8, '#b8892c'); eg.addColorStop(1, '#7a5a18');
    g.fillStyle = eg; g.beginPath(); g.ellipse(32, 33, 12, 17, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(90,60,20,0.4)'; g.lineWidth = 0.8;           // gilded lattice bands
    g.beginPath(); g.ellipse(32, 33, 12, 17, 0, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(20, 33); g.lineTo(44, 33); g.stroke();
    g.beginPath(); g.ellipse(32, 33, 5, 17, 0, 0, 7); g.stroke();
    const jewel = (jx, jy, col) => { g.fillStyle = col; g.beginPath(); g.arc(jx, jy, 1.6, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(jx - 0.4, jy - 0.4, 0.5, 0, 7); g.fill(); };
    jewel(32, 22, '#c9242e'); jewel(24, 30, '#2a5f8a'); jewel(40, 30, '#2a8a5c'); jewel(32, 42, '#c9242e');
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(27, 24, 3, 6, -0.2, 0, 7); g.fill();  // gold sheen
  });

  SPR.nixonmask = outlined(g => {                                 // rubber Nixon novelty mask, jowly caricature
    g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(32, 50, 15, 3, 0, 0, 7); g.fill();
    const sk = g.createRadialGradient(28, 28, 2, 32, 32, 16);
    sk.addColorStop(0, '#e8c8a0'); sk.addColorStop(0.7, '#c9986a'); sk.addColorStop(1, '#8a6444');
    g.fillStyle = sk; g.beginPath(); g.ellipse(32, 30, 13, 16, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(120,80,50,0.3)'; g.beginPath(); g.ellipse(24, 34, 4, 6, -0.2, 0, 7); g.fill();      // jowls
    g.beginPath(); g.ellipse(40, 34, 4, 6, 0.2, 0, 7); g.fill();
    g.fillStyle = '#1c1e22'; g.fillRect(24.6, 22, 5, 1.6); g.fillRect(34.4, 22, 5, 1.6);                    // heavy brows
    g.fillStyle = '#0e0f13'; g.beginPath(); g.ellipse(27.4, 27, 2, 1.4, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(36.6, 27, 2, 1.4, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(120,80,50,0.4)'; g.beginPath(); g.moveTo(30, 30); g.quadraticCurveTo(32, 36, 30, 40); g.lineTo(34, 40); g.quadraticCurveTo(32, 36, 34, 30); g.closePath(); g.fill();  // nose
    g.strokeStyle = '#5a3a1a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(26, 42); g.quadraticCurveTo(32, 39, 38, 42); g.stroke();          // grin
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 0.8; g.beginPath(); g.ellipse(32, 30, 13, 16, 0, 0, 7); g.stroke();
    g.fillStyle = '#e8dca0'; g.fillRect(38, 44, 8, 6);                 // the receipt, tucked half out
    g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 0.4; for (let y = 46; y < 49; y += 1.2) { g.beginPath(); g.moveTo(39, y); g.lineTo(45, y); g.stroke(); }
  });

  SPR.maskstand = outlined(g => {                                 // novelty-shop mask display rack
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 61, 16, 3, 0, 0, 7); g.fill();
    g.fillStyle = '#5c4222'; g.fillRect(30, 20, 3, 40);
    g.fillStyle = '#3a2c14'; g.beginPath(); g.ellipse(32, 60, 12, 2.4, 0, 0, 7); g.fill();
    g.strokeStyle = '#5c4222'; g.lineWidth = 2; g.beginPath(); g.moveTo(31.5, 22); g.lineTo(16, 26); g.stroke();
    g.beginPath(); g.moveTo(31.5, 26); g.lineTo(48, 30); g.stroke();
    g.beginPath(); g.moveTo(31.5, 30); g.lineTo(18, 40); g.stroke();
    const mask = (cx, cy, col) => {
      g.fillStyle = col; g.beginPath(); g.ellipse(cx, cy, 6, 7.4, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 0.7; g.beginPath(); g.ellipse(cx, cy, 6, 7.4, 0, 0, 7); g.stroke();
      g.fillStyle = '#1c1e22'; g.beginPath(); g.ellipse(cx - 2.2, cy - 1.5, 1, 0.8, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(cx + 2.2, cy - 1.5, 1, 0.8, 0, 0, 7); g.fill();
    };
    mask(16, 27, '#d8b888'); mask(48, 31, '#e8c8a0'); mask(18, 41, '#c9a06a');
  });

  SPR.laundryticket = outlined(g => {                             // a small paper claim ticket, numbered
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(32, 40, 9, 1.6, 0, 0, 7); g.fill();
    let tk = g.createLinearGradient(24, 32, 40, 40);
    tk.addColorStop(0, '#e8dca0'); tk.addColorStop(1, '#c9bc78');
    g.save(); g.translate(32, 36); g.rotate(0.1);
    g.fillStyle = tk; g.fillRect(-9, -4, 18, 8);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.6; g.strokeRect(-9, -4, 18, 8);
    g.fillStyle = '#8a1414'; g.font = 'bold 6px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('42', 0, 0.4);
    g.strokeStyle = 'rgba(0,0,0,0.15)'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(-7, 3); g.lineTo(7, 3); g.stroke();
    g.restore();
  });

  SPR.package = outlined(g => {                                   // brown-paper package, tied with string
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 52, 18, 3.4, 0, 0, 7); g.fill();
    let pk = g.createLinearGradient(12, 28, 52, 50);
    pk.addColorStop(0, '#a8794a'); pk.addColorStop(1, '#7a5430');
    g.fillStyle = pk; g.fillRect(12, 28, 40, 22);
    bevel(g, 12, 28, 40, 22, 'rgba(255,240,210,0.16)', 'rgba(0,0,0,0.3)');
    g.strokeStyle = '#e8dca0'; g.lineWidth = 1.6;                     // string, wrapped both ways
    g.beginPath(); g.moveTo(32, 28); g.lineTo(32, 50); g.stroke();
    g.beginPath(); g.moveTo(12, 39); g.lineTo(52, 39); g.stroke();
    g.fillStyle = '#e8dca0'; g.beginPath(); g.ellipse(32, 39, 3, 2, 0, 0, 7); g.fill();  // bow
    g.strokeStyle = 'rgba(60,40,18,0.3)'; g.lineWidth = 0.5;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(14 + i * 10, 28); g.lineTo(15 + i * 10, 50); g.stroke(); }
  });

  SPR.curtainrods = outlined(g => {                                // long paper-wrapped bundle, propped in a corner
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 60, 8, 2.4, 0, 0, 7); g.fill();
    g.save(); g.translate(32, 34); g.rotate(0.12);
    let pk = g.createLinearGradient(-6, -30, 6, 30);
    pk.addColorStop(0, '#d8cca0'); pk.addColorStop(1, '#a89870');
    g.fillStyle = pk; g.fillRect(-6, -30, 12, 60);
    g.strokeStyle = 'rgba(80,70,40,0.3)'; g.lineWidth = 0.7; g.strokeRect(-6, -30, 12, 60);
    g.strokeStyle = '#8a1414'; g.lineWidth = 1.2;                    // twine wraps
    for (let y = -24; y < 28; y += 12) { g.beginPath(); g.moveTo(-6, y); g.lineTo(6, y); g.stroke(); }
    g.fillStyle = '#5c5040'; g.beginPath(); g.ellipse(0, -30, 5, 1.6, 0, 0, 7); g.fill();  // rod ends peeking out
    g.fillStyle = '#5c5040'; g.beginPath(); g.ellipse(0, 30, 5, 1.6, 0, 0, 7); g.fill();
    g.restore();
  });

  SPR.suitrack = outlined(g => {                                   // rolling garment rack, one suit on a hanger
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 60, 18, 3, 0, 0, 7); g.fill();
    g.strokeStyle = '#8a8a8a'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(10, 58); g.lineTo(14, 12); g.stroke();
    g.beginPath(); g.moveTo(54, 58); g.lineTo(50, 12); g.stroke();
    g.beginPath(); g.moveTo(14, 12); g.lineTo(50, 12); g.stroke();
    g.fillStyle = '#1c1e22'; g.beginPath(); g.arc(12, 59, 3, 0, 7); g.fill(); g.beginPath(); g.arc(52, 59, 3, 0, 7); g.fill();
    g.strokeStyle = '#c9a227'; g.lineWidth = 1;                      // hanger
    g.beginPath(); g.moveTo(32, 12); g.lineTo(28, 17); g.lineTo(36, 17); g.lineTo(32, 12); g.stroke();
    let su = g.createLinearGradient(20, 17, 44, 50);
    su.addColorStop(0, '#3a3d48'); su.addColorStop(0.5, '#26282e'); su.addColorStop(1, '#151619');
    g.fillStyle = su;
    g.beginPath(); g.moveTo(22, 20); g.quadraticCurveTo(32, 16, 42, 20); g.lineTo(40, 48); g.lineTo(24, 48); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.1)'; g.beginPath(); g.moveTo(28, 20); g.lineTo(27, 46); g.lineTo(30, 46); g.lineTo(31, 21); g.closePath(); g.fill();
    g.fillStyle = '#e8e4d8'; g.beginPath(); g.moveTo(29.5, 20); g.lineTo(32, 27); g.lineTo(34.5, 20); g.closePath(); g.fill();  // shirt V
  });

  // ---------------------------------------------------------------------------
  // NEW YORK 1964 props — Manhattan street clutter, World's Fair era.
  // ---------------------------------------------------------------------------
  SPR.yellowcab = outlined(g => {                                     // checker-cab-style NYC taxi, three-quarter rear
    g.fillStyle = 'rgba(0,0,0,0.32)'; g.beginPath(); g.ellipse(32, 56, 29, 5, 0, 0, 7); g.fill();
    let body = g.createLinearGradient(2, 24, 62, 50);
    body.addColorStop(0, '#f4c93a'); body.addColorStop(0.5, '#e8a800'); body.addColorStop(1, '#a87400');
    g.fillStyle = body;
    g.beginPath(); g.moveTo(4, 50); g.lineTo(6, 34); g.quadraticCurveTo(10, 26, 20, 25); g.lineTo(44, 25); g.quadraticCurveTo(54, 26, 58, 34); g.lineTo(60, 50); g.closePath(); g.fill();
    g.fillStyle = '#1c1e22';                                          // checker stripe along the side
    g.fillRect(8, 40, 48, 4);
    g.fillStyle = '#f4c93a'; for (let x = 8; x < 56; x += 8) g.fillRect(x, 40, 4, 4);
    let glass = g.createLinearGradient(10, 26, 54, 34);
    glass.addColorStop(0, 'rgba(170,210,225,0.7)'); glass.addColorStop(1, 'rgba(120,160,180,0.55)');
    g.fillStyle = glass; g.beginPath(); g.moveTo(16, 33); g.lineTo(19, 26); g.lineTo(45, 26); g.lineTo(48, 33); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(32, 26); g.lineTo(32, 33); g.stroke();
    g.fillStyle = '#1c1e22'; g.fillRect(24, 20, 16, 4);                // roof taxi light
    g.fillStyle = '#c9242e'; g.font = 'bold 3px monospace'; g.textAlign = 'center'; g.fillText('TAXI', 32, 23);
    g.fillStyle = '#e8e4d8'; g.fillRect(2, 40, 4, 3); g.fillRect(58, 40, 4, 3);
    g.fillStyle = '#1c1e22'; g.beginPath(); g.arc(15, 52, 6, 0, 7); g.fill(); g.beginPath(); g.arc(49, 52, 6, 0, 7); g.fill();
    g.fillStyle = '#8a8a8a'; g.beginPath(); g.arc(15, 52, 2.4, 0, 7); g.fill(); g.beginPath(); g.arc(49, 52, 2.4, 0, 7); g.fill();
  });

  SPR.policecarny = outlined(g => {                                   // 1964 NYPD black-and-white cruiser
    g.fillStyle = 'rgba(0,0,0,0.32)'; g.beginPath(); g.ellipse(32, 56, 29, 5, 0, 0, 7); g.fill();
    let body = g.createLinearGradient(2, 24, 62, 50);
    body.addColorStop(0, '#3a3d44'); body.addColorStop(0.5, '#1e2024'); body.addColorStop(1, '#0c0d0f');
    g.fillStyle = body;
    g.beginPath(); g.moveTo(4, 50); g.lineTo(6, 34); g.quadraticCurveTo(10, 26, 20, 25); g.lineTo(44, 25); g.quadraticCurveTo(54, 26, 58, 34); g.lineTo(60, 50); g.closePath(); g.fill();
    g.fillStyle = '#e8e4d8'; g.fillRect(8, 40, 48, 5);                 // white door band
    g.fillStyle = '#1c1e22'; g.font = 'bold 4px monospace'; g.textAlign = 'center'; g.fillText('POLICE', 32, 44);
    let glass = g.createLinearGradient(10, 26, 54, 34);
    glass.addColorStop(0, 'rgba(170,210,225,0.7)'); glass.addColorStop(1, 'rgba(120,160,180,0.55)');
    g.fillStyle = glass; g.beginPath(); g.moveTo(16, 33); g.lineTo(19, 26); g.lineTo(45, 26); g.lineTo(48, 33); g.closePath(); g.fill();
    g.fillStyle = '#c9242e'; g.beginPath(); g.ellipse(28, 22, 3.2, 2, 0, 0, 7); g.fill();  // roof light, single bubble (period)
    g.fillStyle = 'rgba(255,120,110,0.5)'; g.beginPath(); g.ellipse(28, 22, 3.2, 2, 0, 0, 7); g.fill();
    g.fillStyle = '#e8e4d8'; g.fillRect(2, 40, 4, 3); g.fillRect(58, 40, 4, 3);
    g.fillStyle = '#1c1e22'; g.beginPath(); g.arc(15, 52, 6, 0, 7); g.fill(); g.beginPath(); g.arc(49, 52, 6, 0, 7); g.fill();
    g.fillStyle = '#8a8a8a'; g.beginPath(); g.arc(15, 52, 2.4, 0, 7); g.fill(); g.beginPath(); g.arc(49, 52, 2.4, 0, 7); g.fill();
  });

  SPR.hotdogcart = outlined(g => {                                    // NYC street hot dog cart, umbrella + steam box
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 58, 20, 3.6, 0, 0, 7); g.fill();
    g.fillStyle = '#1c1e22'; g.beginPath(); g.arc(18, 54, 5, 0, 7); g.fill(); g.beginPath(); g.arc(46, 54, 5, 0, 7); g.fill();
    let cart = g.createLinearGradient(12, 32, 52, 52);
    cart.addColorStop(0, '#e8e4d8'); cart.addColorStop(1, '#b8b4a4');
    g.fillStyle = cart; g.fillRect(12, 34, 40, 20);
    bevel(g, 12, 34, 40, 20, 'rgba(255,255,255,0.2)', 'rgba(0,0,0,0.3)');
    g.fillStyle = '#c9242e'; g.fillRect(12, 40, 40, 3); g.fillRect(12, 47, 40, 3);   // red trim stripes
    g.fillStyle = '#1c1e22'; g.fillRect(18, 36, 10, 4);                // steam box window
    g.fillStyle = 'rgba(230,230,230,0.4)'; g.beginPath(); g.ellipse(23, 32, 5, 3, 0, Math.PI, 0, true); g.fill();  // steam wisp
    g.strokeStyle = '#8a8a8a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(32, 34); g.lineTo(32, 12); g.stroke();  // umbrella pole
    const um = g.createLinearGradient(12, 4, 52, 14);
    um.addColorStop(0, '#c9242e'); um.addColorStop(1, '#8a1414');
    g.fillStyle = um; g.beginPath(); g.moveTo(12, 12); g.quadraticCurveTo(32, 0, 52, 12); g.lineTo(32, 14); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 0.8; for (let x = 16; x < 52; x += 9) { g.beginPath(); g.moveTo(x, 11); g.lineTo(32, 3); g.stroke(); }
  });

  SPR.subwaygrate = outlined(g => {                                   // sidewalk subway grate, steam rising
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(32, 40, 20, 8, 0, 0, 7); g.fill();
    let cc = g.createLinearGradient(12, 32, 52, 48);
    cc.addColorStop(0, '#5c5850'); cc.addColorStop(1, '#3a3830');
    g.fillStyle = cc; g.beginPath(); g.ellipse(32, 40, 20, 8, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1.2;
    for (let x = -16; x <= 16; x += 4) { g.beginPath(); g.moveTo(32 + x, 34); g.lineTo(32 + x * 0.86, 46); g.stroke(); }
    g.strokeStyle = 'rgba(150,145,125,0.4)'; g.lineWidth = 1; g.beginPath(); g.ellipse(32, 40, 20, 8, 0, 0, 7); g.stroke();
    g.fillStyle = 'rgba(220,220,220,0.35)';                           // steam rising off the grate
    g.beginPath(); g.ellipse(26, 26, 5, 8, -0.2, 0, 7); g.fill();
    g.beginPath(); g.ellipse(38, 20, 6, 10, 0.15, 0, 7); g.fill();
    g.fillStyle = 'rgba(220,220,220,0.2)'; g.beginPath(); g.ellipse(32, 12, 7, 9, 0, 0, 7); g.fill();
  });

  SPR.glassbooth = outlined(g => {                                    // classic NYC glass-and-aluminum phone booth
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 61, 14, 2.8, 0, 0, 7); g.fill();
    g.fillStyle = '#9098a0'; g.fillRect(16, 12, 3, 48); g.fillRect(45, 12, 3, 48);   // aluminum frame posts
    g.fillRect(16, 12, 32, 3);
    let glass = g.createLinearGradient(19, 15, 45, 58);
    glass.addColorStop(0, 'rgba(180,215,225,0.35)'); glass.addColorStop(1, 'rgba(120,160,180,0.3)');
    g.fillStyle = glass; g.fillRect(19, 15, 26, 43);
    g.strokeStyle = 'rgba(150,150,155,0.5)'; g.lineWidth = 1;
    for (let x = 19; x <= 45; x += 8.6) { g.beginPath(); g.moveTo(x, 15); g.lineTo(x, 58); g.stroke(); }
    g.fillStyle = '#1c1e22'; g.beginPath(); g.arc(32, 32, 2, 0, 7); g.fill(); g.fillRect(30, 26, 4, 6);  // handset
    g.fillStyle = '#c9242e'; g.fillRect(24, 8, 16, 5);                 // BELL sign
    g.fillStyle = '#e8e4d8'; g.font = 'bold 3px monospace'; g.textAlign = 'center'; g.fillText('BELL', 32, 11.4);
    g.fillStyle = '#9098a0'; g.fillRect(16, 58, 32, 3);
  });

  SPR.worldsfair = outlined(g => {                                    // 1964 World's Fair Unisphere monument, small replica
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 60, 16, 3, 0, 0, 7); g.fill();
    g.fillStyle = '#4a4a3e'; g.fillRect(20, 52, 24, 7);                // plinth
    bevel(g, 20, 52, 24, 7, 'rgba(255,255,255,0.1)', 'rgba(0,0,0,0.3)');
    g.strokeStyle = '#8a8a3a'; g.lineWidth = 1.6;                      // three tilted support legs
    g.beginPath(); g.moveTo(26, 52); g.lineTo(30, 34); g.stroke();
    g.beginPath(); g.moveTo(38, 52); g.lineTo(34, 34); g.stroke();
    g.beginPath(); g.moveTo(32, 52); g.lineTo(32, 34); g.stroke();
    const sph = g.createRadialGradient(27, 24, 1, 32, 28, 13);
    sph.addColorStop(0, '#e8dca0'); sph.addColorStop(0.6, '#b8a850'); sph.addColorStop(1, '#7a6c28');
    g.fillStyle = sph; g.beginPath(); g.arc(32, 27, 12, 0, 7); g.fill();
    g.strokeStyle = 'rgba(60,54,20,0.5)'; g.lineWidth = 0.8;           // meridian/lattice lines — the globe's steel frame
    g.beginPath(); g.ellipse(32, 27, 12, 5, 0, 0, 7); g.stroke();
    g.beginPath(); g.ellipse(32, 27, 12, 12, 0, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
    g.beginPath(); g.ellipse(32, 27, 5, 12, 0, 0, 7); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.2)'; g.lineWidth = 1; g.beginPath(); g.arc(32, 27, 12, Math.PI * 1.1, Math.PI * 1.4); g.stroke();
  });

  SPR.fireescape = outlined(g => {                                    // wrought-iron fire escape, bolted to a facade
    g.strokeStyle = '#1c1e22'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(8, 4); g.lineTo(8, 60); g.stroke();
    g.beginPath(); g.moveTo(56, 4); g.lineTo(56, 60); g.stroke();
    const platform = (y) => {
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(8, y, 48, 3);
      g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 0.7;
      for (let x = 10; x < 56; x += 4) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 3); g.stroke(); }
      g.strokeStyle = '#1c1e22'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(8, y - 10); g.lineTo(8, y); g.moveTo(56, y - 10); g.lineTo(56, y); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.6;           // railing balusters
      for (let x = 10; x < 56; x += 5) { g.beginPath(); g.moveTo(x, y - 10); g.lineTo(x, y); g.stroke(); }
    };
    platform(20); platform(38); platform(56);
    g.strokeStyle = '#1c1e22'; g.lineWidth = 1.6;                     // zigzag drop-ladder between two platforms
    g.beginPath(); g.moveTo(14, 38); g.lineTo(24, 48); g.lineTo(14, 56); g.stroke();
  });

  SPR.brownstonestoop = outlined(g => {                               // brownstone entrance stoop, iron railing
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 61, 22, 3, 0, 0, 7); g.fill();
    let st = g.createLinearGradient(10, 30, 54, 60);
    st.addColorStop(0, '#8a5240'); st.addColorStop(1, '#5c3226');
    g.fillStyle = st;
    for (let i = 0; i < 5; i++) { const w2 = 44 - i * 7, x0 = 32 - w2 / 2, y0 = 60 - i * 6; g.fillRect(x0, y0 - 6, w2, 6); }
    g.strokeStyle = 'rgba(30,14,8,0.3)'; g.lineWidth = 0.6;
    for (let i = 0; i < 5; i++) { const w2 = 44 - i * 7, x0 = 32 - w2 / 2, y0 = 60 - i * 6; g.strokeRect(x0, y0 - 6, w2, 6); }
    g.strokeStyle = '#1c1e22'; g.lineWidth = 1.6;                     // wrought-iron railings, both sides
    g.beginPath(); g.moveTo(10, 60); g.lineTo(16, 28); g.stroke();
    g.beginPath(); g.moveTo(54, 60); g.lineTo(48, 28); g.stroke();
    for (let i = 0; i < 8; i++) { const t = i / 8, x1 = 10 + (16 - 10) * t, y1 = 60 + (28 - 60) * t; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1, y1 - 6); g.stroke(); }
    g.fillStyle = '#3a2c1a'; g.fillRect(28, 22, 8, 8);                 // door glimpse at the top
  });

  // ---------------------------------------------------------------------------
  // HONG KONG props — harbor, street-market, and tea-house clutter.
  // ---------------------------------------------------------------------------
  SPR.rickshaw = outlined(g => {                                      // pulled rickshaw, two big wheels, canopy folded back
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 58, 20, 3.6, 0, 0, 7); g.fill();
    g.strokeStyle = '#3a2c14'; g.lineWidth = 1.4;                      // spoked wheels
    g.beginPath(); g.arc(20, 48, 11, 0, 7); g.stroke(); g.beginPath(); g.arc(44, 48, 11, 0, 7); g.stroke();
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; g.beginPath(); g.moveTo(20, 48); g.lineTo(20 + Math.cos(a) * 10.5, 48 + Math.sin(a) * 10.5); g.stroke(); g.beginPath(); g.moveTo(44, 48); g.lineTo(44 + Math.cos(a) * 10.5, 48 + Math.sin(a) * 10.5); g.stroke(); }
    g.fillStyle = '#5c4222'; g.beginPath(); g.arc(20, 48, 2, 0, 7); g.fill(); g.beginPath(); g.arc(44, 48, 2, 0, 7); g.fill();
    let seat = g.createLinearGradient(14, 24, 50, 42);
    seat.addColorStop(0, '#8a1414'); seat.addColorStop(1, '#5c0e0e');
    g.fillStyle = seat; g.beginPath(); g.moveTo(16, 40); g.lineTo(48, 40); g.lineTo(44, 26); g.lineTo(20, 26); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,215,140,0.5)'; g.beginPath(); g.ellipse(24, 28, 5, 8, -0.2, 0, 7); g.fill();
    g.fillStyle = '#241a10'; g.beginPath(); g.ellipse(32, 20, 13, 4, 0, Math.PI, 0, true); g.fill();  // folded canopy hood, at the back
    g.strokeStyle = '#5c4222'; g.lineWidth = 2.2;                       // pull shafts
    g.beginPath(); g.moveTo(16, 40); g.lineTo(2, 52); g.stroke();
    g.beginPath(); g.moveTo(48, 40); g.lineTo(62, 52); g.stroke();
  });

  SPR.junkboat = outlined(g => {                                      // Chinese junk, red-brown battened sails
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(32, 54, 30, 5, 0, 0, 7); g.fill();
    let hull = g.createLinearGradient(4, 36, 60, 52);
    hull.addColorStop(0, '#8a5a2e'); hull.addColorStop(1, '#5c3a1c');
    g.fillStyle = hull; g.beginPath(); g.moveTo(4, 44); g.quadraticCurveTo(6, 52, 16, 52); g.lineTo(52, 52); g.quadraticCurveTo(60, 50, 58, 42); g.lineTo(50, 40); g.lineTo(10, 40); g.closePath(); g.fill();
    g.fillStyle = '#3a2410'; g.beginPath(); g.moveTo(50, 40); g.quadraticCurveTo(56, 30, 50, 22); g.lineTo(44, 22); g.quadraticCurveTo(48, 32, 44, 40); g.closePath(); g.fill();  // raised stern
    g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 0.8; for (let x = 12; x < 52; x += 6) { g.beginPath(); g.moveTo(x, 41); g.lineTo(x - 1, 51); g.stroke(); }
    const sail = (x, topY, botY, w, col) => {
      g.fillStyle = col; g.beginPath(); g.moveTo(x, topY); g.lineTo(x + w, topY + 4); g.lineTo(x + w - 2, botY); g.lineTo(x - 2, botY - 4); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; for (let y = topY + 6; y < botY; y += 6) { g.beginPath(); g.moveTo(x - 1, y); g.lineTo(x + w - 2, y + 2); g.stroke(); }
    };
    g.strokeStyle = '#3a2410'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(20, 40); g.lineTo(20, 8); g.stroke();
    sail(9, 10, 38, 22, '#a8442e');
    g.strokeStyle = '#3a2410'; g.beginPath(); g.moveTo(40, 40); g.lineTo(40, 16); g.stroke();
    sail(32, 18, 40, 14, '#8a3a26');
  });

  SPR.dimsumcart = outlined(g => {                                    // dim sum trolley, stacked bamboo steamers
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 58, 20, 3.6, 0, 0, 7); g.fill();
    g.fillStyle = '#1c1e22'; g.beginPath(); g.arc(16, 54, 5, 0, 7); g.fill(); g.beginPath(); g.arc(48, 54, 5, 0, 7); g.fill();
    let cart = g.createLinearGradient(10, 36, 54, 54);
    cart.addColorStop(0, '#c9302a'); cart.addColorStop(1, '#8a1414');
    g.fillStyle = cart; g.fillRect(10, 38, 44, 16);
    bevel(g, 10, 38, 44, 16, 'rgba(255,255,255,0.14)', 'rgba(0,0,0,0.3)');
    g.fillStyle = '#d8a827'; g.font = 'bold 5px monospace'; g.textAlign = 'center'; g.fillText('點心', 32, 47);
    const steamer = (x, y) => {
      let bg = g.createLinearGradient(x - 8, y - 3, x + 8, y + 3);
      bg.addColorStop(0, '#c9a06a'); bg.addColorStop(1, '#8a6a3a');
      g.fillStyle = bg; g.fillRect(x - 8, y - 3, 16, 6);
      g.strokeStyle = 'rgba(60,40,15,0.4)'; g.lineWidth = 0.6; for (let i = -6; i <= 6; i += 3) { g.beginPath(); g.moveTo(x + i, y - 3); g.lineTo(x + i, y + 3); g.stroke(); }
    };
    steamer(24, 30); steamer(40, 30); steamer(32, 22);
    g.fillStyle = 'rgba(230,230,230,0.35)'; g.beginPath(); g.ellipse(32, 16, 6, 8, 0, Math.PI, 0, true); g.fill();  // steam wisp
  });

  SPR.mahjongtable = outlined(g => {                                  // square mahjong table, tiles mid-game
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 58, 20, 4, 0, 0, 7); g.fill();
    g.fillStyle = '#3a2c14'; g.fillRect(12, 50, 4, 10); g.fillRect(48, 50, 4, 10);   // table legs
    let top = g.createLinearGradient(8, 24, 56, 48);
    top.addColorStop(0, '#3a6a4a'); top.addColorStop(1, '#254a32');
    g.fillStyle = top; g.fillRect(8, 26, 48, 24);
    bevel(g, 8, 26, 48, 24, 'rgba(255,255,255,0.14)', 'rgba(0,0,0,0.35)');
    g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 1; g.strokeRect(12, 30, 40, 16);
    const tile = (x, y) => { g.fillStyle = '#e8e2d0'; g.fillRect(x, y, 5, 7); g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.5; g.strokeRect(x, y, 5, 7); g.fillStyle = '#8a1414'; g.fillRect(x + 1, y + 2, 3, 1); };
    for (let i = 0; i < 6; i++) tile(14 + i * 6, 34);
    g.fillStyle = '#c9a227'; for (const [x, y] of [[20, 44], [30, 46], [40, 44]]) { g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); }  // stacked coin counters
  });

  SPR.neonsignboard = outlined(g => {                                 // hanging vertical neon shop sign, Cantonese glow
    g.strokeStyle = '#3a3630'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(32, 2); g.lineTo(32, 10); g.stroke();
    g.fillStyle = '#0e0a14'; g.fillRect(18, 10, 28, 48);
    bevel(g, 18, 10, 28, 48, 'rgba(255,255,255,0.08)', 'rgba(0,0,0,0.4)');
    const glowChar = (cy, col) => {
      g.strokeStyle = col; g.lineWidth = 2.2; g.lineCap = 'round'; g.shadowColor = col; g.shadowBlur = 5;
      g.beginPath(); g.moveTo(23, cy - 5); g.lineTo(41, cy - 5); g.moveTo(32, cy - 5); g.lineTo(32, cy + 5); g.moveTo(24, cy + 5); g.lineTo(40, cy + 5); g.stroke();
      g.shadowBlur = 0;
    };
    glowChar(20, 'rgba(255,60,160,0.95)'); glowChar(34, 'rgba(80,220,255,0.95)'); glowChar(48, 'rgba(255,214,60,0.95)');
    g.fillStyle = '#3a3630'; g.fillRect(16, 8, 32, 3);
  });

  SPR.lanternstring = outlined(g => {                                 // string of hanging red paper lanterns
    g.strokeStyle = '#3a2c14'; g.lineWidth = 1; g.beginPath(); g.moveTo(2, 4); g.quadraticCurveTo(32, 16, 62, 4); g.stroke();
    const lantern = (x, y, s) => {
      const lg = g.createRadialGradient(x - s * 0.3, y - s * 0.3, 1, x, y, s);
      lg.addColorStop(0, '#e8503a'); lg.addColorStop(1, '#8a1414');
      g.fillStyle = lg; g.beginPath(); g.ellipse(x, y, s, s * 1.15, 0, 0, 7); g.fill();
      g.fillStyle = '#c9a227'; g.fillRect(x - s * 0.3, y - s * 1.2, s * 0.6, 2); g.fillRect(x - s * 0.3, y + s * 1.05, s * 0.6, 2);
      g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 0.6; for (let yy = -s * 0.6; yy <= s * 0.6; yy += s * 0.5) { g.beginPath(); g.ellipse(x, y, s, s * 1.15, 0, 0, 7); g.stroke(); }
      g.fillStyle = 'rgba(255,220,150,0.4)'; g.beginPath(); g.ellipse(x - s * 0.3, y - s * 0.3, s * 0.4, s * 0.5, 0, 0, 7); g.fill();
    };
    lantern(10, 10, 7); lantern(32, 15, 8); lantern(54, 10, 7);
  });

  SPR.teastall = outlined(g => {                                      // street tea/herbal stall, jars + kettle
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 58, 20, 3.6, 0, 0, 7); g.fill();
    g.fillStyle = '#5c4222'; g.fillRect(10, 20, 3, 38); g.fillRect(51, 20, 3, 38);   // stall frame posts
    let awn = g.createLinearGradient(8, 12, 56, 22);
    awn.addColorStop(0, '#3a6a4a'); awn.addColorStop(1, '#254a32');
    g.fillStyle = awn; g.beginPath(); g.moveTo(6, 22); g.lineTo(58, 22); g.lineTo(52, 12); g.lineTo(12, 12); g.closePath(); g.fill();
    let counter = g.createLinearGradient(8, 40, 56, 56);
    counter.addColorStop(0, '#a8794a'); counter.addColorStop(1, '#7a5430');
    g.fillStyle = counter; g.fillRect(8, 42, 48, 14);
    const jar = (x, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, 36, 4, 6, 0, 0, 7); g.fill(); g.fillStyle = '#5c4222'; g.fillRect(x - 4, 30, 8, 2); };
    jar(16, 'rgba(200,160,90,0.7)'); jar(24, 'rgba(120,90,50,0.7)'); jar(48, 'rgba(160,60,40,0.7)');
    g.fillStyle = '#8a8a8a'; g.beginPath(); g.ellipse(36, 38, 5, 5, 0, 0, 7); g.fill();   // kettle
    g.fillRect(40, 36, 4, 1.6); g.fillStyle = 'rgba(230,230,230,0.4)'; g.beginPath(); g.ellipse(38, 30, 3, 5, 0, Math.PI, 0, true); g.fill();
  });

  SPR.birdcage = outlined(g => {                                      // ornate hanging bamboo/brass bird cage
    g.strokeStyle = '#3a2c14'; g.lineWidth = 1; g.beginPath(); g.moveTo(32, 2); g.lineTo(32, 10); g.stroke();
    g.fillStyle = '#c9a227'; g.beginPath(); g.ellipse(32, 11, 3, 1.6, 0, 0, 7); g.fill();   // hook ring
    let dome = g.createLinearGradient(16, 12, 48, 18);
    dome.addColorStop(0, '#c9a06a'); dome.addColorStop(1, '#8a6438');
    g.fillStyle = dome; g.beginPath(); g.ellipse(32, 16, 15, 6, 0, Math.PI, 0, true); g.fill();
    g.strokeStyle = '#8a6438'; g.lineWidth = 1;                        // bamboo bars
    for (let x = 18; x <= 46; x += 4) { g.beginPath(); g.moveTo(x, 16); g.lineTo(x, 46); g.stroke(); }
    g.beginPath(); g.moveTo(17, 24); g.lineTo(47, 24); g.stroke(); g.beginPath(); g.moveTo(17, 38); g.lineTo(47, 38); g.stroke();
    g.fillStyle = dome; g.beginPath(); g.ellipse(32, 46, 16, 5, 0, 0, 7); g.fill();
    g.fillStyle = '#3a2c14'; g.beginPath(); g.ellipse(32, 47, 12, 3, 0, 0, 7); g.fill();
    g.fillStyle = '#2a3a2c'; g.beginPath(); g.ellipse(28, 30, 3, 4, 0, 0, 7); g.fill(); g.fillStyle = '#c9a227'; g.beginPath(); g.arc(29.4, 28.4, 0.7, 0, 7); g.fill();  // a small bird silhouette
    g.fillStyle = '#e8dca0'; g.fillRect(20, 42, 3, 2); g.fillRect(40, 42, 3, 2);  // seed/water dishes
  });

  // ---- wall DECALS: flat mounted images (P in the editor) — drawn small and
  // centred with a wide transparent margin, since the engine stretches whatever
  // isn't transparent across the WHOLE wall face, not just where it's drawn here.
  // Two per location, reusing that location's existing texture/prop palette.
  SPR.decalHavanaTravel = outlined(g => {                            // "VISIT HAVANA" tourism poster
    let bg = g.createLinearGradient(0, 8, 0, 56);
    bg.addColorStop(0, '#e8d8a8'); bg.addColorStop(1, '#d8c088');
    g.fillStyle = bg; g.fillRect(10, 8, 44, 48);
    g.strokeStyle = '#7a5a2c'; g.lineWidth = 2; g.strokeRect(10, 8, 44, 48);
    g.fillStyle = 'rgba(255,220,140,0.9)'; g.beginPath(); g.arc(32, 24, 8, 0, 7); g.fill();  // sun
    g.fillStyle = '#3a5a2c';                                          // palm silhouette
    g.beginPath(); g.moveTo(32, 44); g.lineTo(31, 26); g.lineTo(30, 44); g.closePath(); g.fill();
    [[-1, -0.3], [1, -0.3], [-0.6, -0.9], [0.6, -0.9], [0, -1]].forEach(([dx, dy]) => {
      g.beginPath(); g.moveTo(31, 26); g.lineTo(31 + dx * 10, 26 + dy * 7); g.lineTo(31 + dx * 7, 26 + dy * 5 + 1); g.closePath(); g.fill();
    });
    g.fillStyle = '#8a2418'; g.fillRect(12, 46, 40, 8);                // red banner
    g.fillStyle = '#f0e0b0'; g.font = 'bold 6px monospace'; g.textAlign = 'center';
    g.fillText('HAVANA', 32, 51);
  });
  SPR.decalWantedSpanish = outlined(g => {                            // "SE BUSCA" wanted handbill
    g.fillStyle = '#d8cc9c'; g.fillRect(12, 6, 40, 50);
    g.strokeStyle = '#2a2418'; g.lineWidth = 1.4; g.strokeRect(12, 6, 40, 50);
    g.fillStyle = '#2a2418'; g.fillRect(14, 8, 36, 8);
    g.fillStyle = '#e8dca0'; g.font = 'bold 7px monospace'; g.textAlign = 'center';
    g.fillText('SE BUSCA', 32, 14);
    g.fillStyle = '#8a8068'; g.fillRect(20, 20, 24, 22);               // mugshot silhouette box
    g.fillStyle = '#3a3628'; g.beginPath(); g.arc(32, 27, 5, 0, 7); g.fill();
    g.beginPath(); g.moveTo(24, 40); g.quadraticCurveTo(32, 33, 40, 40); g.fill();
    g.strokeStyle = '#4a4030'; g.lineWidth = 0.6;
    for (let y = 44; y <= 52; y += 3) { g.beginPath(); g.moveTo(16, y); g.lineTo(48, y); g.stroke(); }
    stains(g, 6, ['#8a7a54', '#6a5a3a']);
  });
  SPR.decalRugWall = outlined(g => {                                  // woven rug/tapestry hung on the wall
    g.fillStyle = '#7a2418'; g.fillRect(10, 8, 44, 48);
    g.strokeStyle = '#c9a227'; g.lineWidth = 2; g.strokeRect(10, 8, 44, 48);
    g.strokeStyle = '#e8c860'; g.lineWidth = 1;
    for (let i = 0; i < 4; i++) { const y = 16 + i * 10; g.beginPath(); g.moveTo(14, y); g.lineTo(32, y - 4); g.lineTo(50, y); g.lineTo(32, y + 4); g.closePath(); g.stroke(); }
    g.fillStyle = '#1c5a5a'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(32, 16 + i * 10, 1.6, 0, 7); g.fill(); }
    speck(g, 60, 'rgba(230,200,100,0.12)');
  });
  SPR.decalBrassPlaque = outlined(g => {                              // ornate brass mosaic wall plaque
    let br = g.createLinearGradient(14, 12, 50, 44);
    br.addColorStop(0, '#e0b84a'); br.addColorStop(1, '#8a6820');
    g.fillStyle = br; g.beginPath(); g.ellipse(32, 28, 18, 15, 0, 0, 7); g.fill();
    g.strokeStyle = '#4a3810'; g.lineWidth = 1.6; g.stroke();
    g.strokeStyle = 'rgba(60,40,10,0.55)'; g.lineWidth = 0.8;          // arabesque lattice
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(32 + i * 6, 14); g.lineTo(32 - i * 6, 42); g.stroke(); }
    g.fillStyle = '#1c5a5a'; g.beginPath(); g.arc(32, 28, 3.4, 0, 7); g.fill();
    bevel(g, 14, 13, 36, 30, 'rgba(255,240,190,0.3)', 'rgba(0,0,0,0.4)');
  });
  SPR.decalGalleryPoster = outlined(g => {                            // Belle Époque exhibition poster
    let bg = g.createLinearGradient(0, 6, 0, 58);
    bg.addColorStop(0, '#e8ddc4'); bg.addColorStop(1, '#d0c2a0');
    g.fillStyle = bg; g.fillRect(10, 6, 44, 52);
    g.strokeStyle = '#8a1424'; g.lineWidth = 2; g.strokeRect(13, 9, 38, 46);
    g.strokeStyle = 'rgba(138,20,36,0.5)'; g.lineWidth = 1;            // art-nouveau corner swirls
    [[13, 9], [51, 9], [13, 55], [51, 55]].forEach(([cx, cy]) => { g.beginPath(); g.arc(cx, cy, 5, 0, 7); g.stroke(); });
    g.fillStyle = '#8a1424'; g.beginPath();                            // stylised iris/lily silhouette
    g.moveTo(32, 44); g.quadraticCurveTo(20, 30, 26, 16); g.quadraticCurveTo(32, 26, 32, 16);
    g.quadraticCurveTo(32, 26, 38, 16); g.quadraticCurveTo(44, 30, 32, 44); g.fill();
    g.fillStyle = '#4a3018'; g.font = 'italic bold 6px monospace'; g.textAlign = 'center';
    g.fillText('EXPOSITION', 32, 50);
  });
  SPR.decalMetroMap = outlined(g => {                                 // Paris Métro line map
    g.fillStyle = '#e8e2d0'; g.fillRect(10, 8, 44, 48);
    g.strokeStyle = '#3a3428'; g.lineWidth = 1.2; g.strokeRect(10, 8, 44, 48);
    const lines = [['#8a1424', 14], ['#c9a227', 24], ['#1c5a5a', 34], ['#3a5a2c', 44]];
    lines.forEach(([col, y]) => {
      g.strokeStyle = col; g.lineWidth = 2;
      g.beginPath(); g.moveTo(14, y); g.lineTo(50, y + (Math.random() * 4 - 2)); g.stroke();
      g.fillStyle = '#e8e2d0';
      for (let x = 18; x <= 46; x += 8) { g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); g.strokeStyle = col; g.lineWidth = 0.8; g.stroke(); }
    });
  });
  SPR.decalFamilyPhoto = outlined(g => {                              // framed family portrait
    let fr = g.createLinearGradient(12, 8, 52, 54);
    fr.addColorStop(0, '#c9a06a'); fr.addColorStop(1, '#8a6438');
    g.fillStyle = fr; g.fillRect(12, 8, 40, 46);
    g.fillStyle = '#dce8ec'; g.fillRect(16, 12, 32, 38);
    g.fillStyle = '#5a4a3a';                                           // three simple silhouettes
    [[24, 38, 4], [32, 34, 5], [40, 38, 3.4]].forEach(([x, y, r]) => {
      g.beginPath(); g.arc(x, y - r - 2, r * 0.55, 0, 7); g.fill();
      g.beginPath(); g.moveTo(x - r, y + 6); g.quadraticCurveTo(x, y - r * 0.6, x + r, y + 6); g.fill();
    });
    bevel(g, 12, 8, 40, 46, 'rgba(255,240,200,0.3)', 'rgba(0,0,0,0.4)');
  });
  SPR.decalForSale = outlined(g => {                                  // realtor "FOR SALE" flyer
    g.fillStyle = '#f0ece0'; g.fillRect(12, 10, 40, 42);
    g.strokeStyle = '#2a2418'; g.lineWidth = 1; g.strokeRect(12, 10, 40, 42);
    g.fillStyle = '#8a1418'; g.fillRect(14, 12, 36, 10);
    g.fillStyle = '#f0ece0'; g.font = 'bold 6px monospace'; g.textAlign = 'center';
    g.fillText('FOR SALE', 32, 18.5);
    g.fillStyle = '#5a4a3a';                                           // little house icon
    g.fillRect(24, 32, 16, 12); g.beginPath(); g.moveTo(22, 32); g.lineTo(32, 24); g.lineTo(42, 32); g.closePath(); g.fill();
    g.fillStyle = '#3a5a8a'; g.fillRect(30, 37, 4, 7);
    g.strokeStyle = '#8a8068'; g.lineWidth = 0.6;
    g.beginPath(); g.moveTo(16, 48); g.lineTo(46, 48); g.stroke();
  });
  SPR.decalPropagandaPoster = outlined(g => {                         // Soviet red-star propaganda poster
    g.fillStyle = '#8a1414'; g.fillRect(10, 8, 44, 48);
    g.strokeStyle = '#e8d8a0'; g.lineWidth = 1.4; g.strokeRect(13, 11, 38, 42);
    g.fillStyle = '#e8d8a0';                                           // five-point star
    g.save(); g.translate(32, 26); g.beginPath();
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * (Math.PI * 2 / 5), a2 = a + Math.PI / 5;
      g.lineTo(Math.cos(a) * 9, Math.sin(a) * 9); g.lineTo(Math.cos(a2) * 3.6, Math.sin(a2) * 3.6); }
    g.closePath(); g.fill(); g.restore();
    g.fillStyle = '#e8d8a0'; g.fillRect(16, 44, 32, 3); g.fillRect(16, 49, 24, 3);   // slogan bars
  });
  SPR.decalPravda = outlined(g => {                                   // Pravda front page pinned up
    g.fillStyle = '#e0dccc'; g.fillRect(11, 8, 42, 48);
    g.strokeStyle = '#2a2822'; g.lineWidth = 1; g.strokeRect(11, 8, 42, 48);
    g.fillStyle = '#1a1814'; g.font = 'bold 8px monospace'; g.textAlign = 'center';
    g.fillText('PRAVDA', 32, 16);
    g.strokeStyle = '#2a2822'; g.lineWidth = 1; g.beginPath(); g.moveTo(13, 19); g.lineTo(51, 19); g.stroke();
    g.strokeStyle = 'rgba(30,28,22,0.55)'; g.lineWidth = 0.6;
    for (let col = 0; col < 3; col++) { const x = 15 + col * 12;
      for (let y = 24; y <= 52; y += 3) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 9, y); g.stroke(); } }
    g.fillStyle = '#c9a227'; g.beginPath(); g.arc(20, 12, 1.2, 0, 7); g.fill();
  });
  SPR.decalWantedTreason = outlined(g => {                            // 1963 Dallas "WANTED FOR TREASON" handbill
    g.fillStyle = '#e8e4d8'; g.fillRect(11, 6, 42, 52);
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 1.6; g.strokeRect(11, 6, 42, 52);
    g.fillStyle = '#1a1a1a'; g.font = 'bold 6px monospace'; g.textAlign = 'center';
    g.fillText('WANTED FOR', 32, 13);
    g.fillStyle = '#8a1418'; g.fillText('TREASON', 32, 21);
    g.fillStyle = '#8a8474'; g.fillRect(19, 26, 26, 22);                // mugshot box, two-up
    g.fillStyle = '#2a2822'; g.beginPath(); g.arc(26, 34, 3.6, 0, 7); g.fill(); g.beginPath(); g.arc(38, 34, 3.6, 0, 7); g.fill();
    g.beginPath(); g.moveTo(21, 46); g.quadraticCurveTo(26, 40, 31, 46); g.fill();
    g.beginPath(); g.moveTo(33, 46); g.quadraticCurveTo(38, 40, 43, 46); g.fill();
    g.strokeStyle = '#4a463c'; g.lineWidth = 0.6;
    for (let y = 51; y <= 55; y += 2) { g.beginPath(); g.moveTo(15, y); g.lineTo(49, y); g.stroke(); }
    stains(g, 8, ['#8a8068', '#5a5648']);
  });
  SPR.decalCampaignPoster = outlined(g => {                           // red/white/blue campaign poster
    g.fillStyle = '#e8e4d8'; g.fillRect(10, 8, 44, 48);
    g.fillStyle = '#2c4a8a'; g.fillRect(10, 8, 44, 6);
    g.fillStyle = '#8a1418'; g.fillRect(10, 50, 44, 6);
    g.fillStyle = '#e8e4d8'; g.font = 'bold 5px monospace'; g.textAlign = 'center';
    g.fillText('LEADERSHIP \'63', 32, 12.5);
    g.fillStyle = '#2a2822';                                            // bust silhouette
    g.beginPath(); g.arc(32, 27, 7, 0, 7); g.fill();
    g.beginPath(); g.moveTo(20, 46); g.quadraticCurveTo(32, 32, 44, 46); g.fill();
    g.strokeStyle = '#c9a227'; g.lineWidth = 1; g.strokeRect(13, 15, 38, 32);
  });
  SPR.decalBroadwayPoster = outlined(g => {                           // Broadway marquee show poster
    g.fillStyle = '#1c1a24'; g.fillRect(10, 8, 44, 48);
    g.strokeStyle = '#c9a227'; g.lineWidth = 2; g.strokeRect(12, 10, 40, 44);
    g.fillStyle = '#e8c860'; g.font = 'bold 8px monospace'; g.textAlign = 'center';
    g.fillText('BRAVO!', 32, 26);
    g.fillStyle = '#e8c860';
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283, sx = 32 + Math.cos(a) * 14, sy = 40 + Math.sin(a) * 9;
      g.save(); g.translate(sx, sy); g.beginPath();
      for (let k = 0; k < 5; k++) { const a1 = -Math.PI / 2 + k * (Math.PI * 2 / 5), a2 = a1 + Math.PI / 5;
        g.lineTo(Math.cos(a1) * 2, Math.sin(a1) * 2); g.lineTo(Math.cos(a2) * 0.8, Math.sin(a2) * 0.8); }
      g.closePath(); g.fill(); g.restore(); }
  });
  SPR.decalSubwayMap = outlined(g => {                                // NYC subway line map
    g.fillStyle = '#f0ece0'; g.fillRect(10, 8, 44, 48);
    g.strokeStyle = '#2a2822'; g.lineWidth = 1; g.strokeRect(10, 8, 44, 48);
    const lines = [['#0039A6', 16], ['#FF6319', 28], ['#6CBE45', 40], ['#A626AA', 50]];
    lines.forEach(([col, y]) => {
      g.strokeStyle = col; g.lineWidth = 2.2;
      g.beginPath(); g.moveTo(14, 12); g.lineTo(20, y); g.lineTo(50, y - 4); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(20, y, 1.6, 0, 7); g.fill();
    });
  });
  SPR.decalCouplets = outlined(g => {                                 // Chinese New Year red/gold couplets
    g.fillStyle = '#8a1414'; g.fillRect(12, 6, 10, 52); g.fillRect(42, 6, 10, 52);
    g.strokeStyle = '#c9a227'; g.lineWidth = 1;
    g.strokeRect(12, 6, 10, 52); g.strokeRect(42, 6, 10, 52);
    g.fillStyle = '#e8c860';
    for (let y = 12; y <= 52; y += 8) { g.fillRect(15, y, 4, 4); g.fillRect(45, y, 4, 4); }
    g.beginPath(); g.arc(32, 14, 6, 0, 7); g.fill();                    // gold medallion top-centre
    g.fillStyle = '#8a1414'; g.font = 'bold 6px monospace'; g.textAlign = 'center'; g.fillText('福', 32, 17);
  });
  SPR.decalKungFuPoster = outlined(g => {                              // dramatic kung-fu movie poster
    let bg = g.createLinearGradient(0, 6, 0, 58);
    bg.addColorStop(0, '#e8c860'); bg.addColorStop(1, '#8a1414');
    g.fillStyle = bg; g.fillRect(10, 6, 44, 52);
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 1.6; g.strokeRect(10, 6, 44, 52);
    g.fillStyle = '#1a1414';                                            // dynamic fighter silhouette
    g.beginPath(); g.arc(32, 20, 4, 0, 7); g.fill();
    g.beginPath(); g.moveTo(28, 24); g.lineTo(20, 30); g.lineTo(24, 34); g.lineTo(30, 28); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(36, 24); g.lineTo(48, 20); g.lineTo(46, 24); g.lineTo(38, 28); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(28, 30); g.lineTo(24, 48); g.lineTo(30, 48); g.lineTo(34, 32); g.lineTo(38, 48); g.lineTo(44, 48); g.lineTo(36, 28); g.closePath(); g.fill();
    g.fillStyle = '#e8e4d8'; g.font = 'bold 7px monospace'; g.textAlign = 'center'; g.fillText('IRON FIST', 32, 55);
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

  // ---- shared first-person grip: bare fist + frame stub, reused by every new
  // weapon viewmodel so the whole arsenal reads as one consistent HUD "slot"
  // (same pose/size as the Walther above; only the mechanism above the fist differs) ----
  function gunFist(g) {
    g.save();
    g.beginPath(); g.moveTo(20, 42); g.lineTo(76, 42); g.lineTo(80, 58); g.lineTo(74, 96); g.lineTo(22, 96); g.lineTo(16, 58); g.closePath(); g.clip();
    vgrad(g, 12, 40, 72, 56, '#a06a3e', '#6b4327');
    g.restore();
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(48, 46); g.lineTo(48, 94); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2.4;
    for (const y of [54, 64, 75, 86]) { g.beginPath(); g.moveTo(22, y); g.quadraticCurveTo(48, y + 5, 74, y); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,0.10)'; g.lineWidth = 1.4;
    for (const y of [51, 61, 72, 83]) { g.beginPath(); g.moveTo(24, y); g.quadraticCurveTo(48, y + 4, 72, y); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.beginPath(); g.ellipse(48, 94, 30, 5, 0, 0, 7); g.fill();
  }

  SPR.gunSterling = cnv(g => {                                    // Sterling: tubular perforated barrel jacket + side mag
    gunFist(g);
    vgrad(g, 30, 38, 36, 12, '#3a3d44', '#24262c');
    bevel(g, 30, 38, 36, 12, 'rgba(255,255,255,0.12)', 'rgba(0,0,0,0.4)');
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(48, 40, 22, 4, 0, 0, 7); g.fill();  // grounding shadow under the jacket
    const jacketPath = () => { g.beginPath(); g.moveTo(29, 39); g.lineTo(27, 15); g.quadraticCurveTo(27, 7, 48, 7); g.quadraticCurveTo(69, 7, 69, 15); g.lineTo(67, 39); g.closePath(); };
    let bj = g.createLinearGradient(27, 0, 69, 0);                  // barrel jacket: dark-light-dark cylindrical roll-off
    bj.addColorStop(0, '#1a1b1e'); bj.addColorStop(0.22, '#4c4f57'); bj.addColorStop(0.42, '#63666f');
    bj.addColorStop(0.58, '#3a3d44'); bj.addColorStop(0.8, '#24262c'); bj.addColorStop(1, '#0e0f11');
    g.fillStyle = bj; jacketPath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1.5; jacketPath(); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1;      // specular rim on the near-light edge
    g.beginPath(); g.moveTo(33, 13); g.quadraticCurveTo(33, 9, 42, 8); g.stroke();
    g.fillStyle = '#050506'; g.beginPath(); g.ellipse(48, 8, 15, 3, 0, 0, 7); g.fill();  // muzzle-end dark bore, seen face-on
    g.strokeStyle = 'rgba(120,124,132,0.6)'; g.lineWidth = 1; g.beginPath(); g.ellipse(48, 8, 15, 3, 0, 0, 7); g.stroke();
    for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {   // ventilation holes, each with rim + AO
      const hx = 34 + col * 9.4, hy = 15 + row * 7.4;
      g.fillStyle = '#050506'; g.beginPath(); g.arc(hx, hy, 2.1, 0, 7); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 0.8; g.beginPath(); g.arc(hx, hy, 2.6, 0, 7); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 0.7; g.beginPath(); g.arc(hx - 0.6, hy - 0.6, 1, Math.PI, Math.PI * 1.6); g.stroke();
    }
    let sb = g.createLinearGradient(42, 0, 56, 0);                  // rear tangent sight, dimensional block
    sb.addColorStop(0, '#0c0d0f'); sb.addColorStop(0.5, '#2c2e33'); sb.addColorStop(1, '#0c0d0f');
    g.fillStyle = sb; g.fillRect(42, 2, 12, 7);
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 0.8; g.strokeRect(42, 2, 12, 1.4);
    g.fillStyle = '#020203'; g.fillRect(46.5, 0, 3, 4.4);           // notch aperture
    let bh = g.createRadialGradient(69, 20, 0.4, 69, 20, 3);        // cocking-handle knob, side profile
    bh.addColorStop(0, '#8a8e98'); bh.addColorStop(1, '#3a3d44');
    g.fillStyle = bh; g.beginPath(); g.arc(69, 20, 3, 0, 7); g.fill();
    let mg = g.createLinearGradient(2, 0, 28, 0);                   // side-mounted magazine, the Sterling's signature, tapered
    mg.addColorStop(0, '#0e0f11'); mg.addColorStop(0.3, '#40434b'); mg.addColorStop(0.55, '#54575f'); mg.addColorStop(1, '#16171a');
    g.fillStyle = mg; g.beginPath(); g.moveTo(2, 19); g.lineTo(27, 17.4); g.lineTo(27, 29.6); g.lineTo(2, 32); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1; g.beginPath(); g.moveTo(2, 19); g.lineTo(27, 17.4); g.lineTo(27, 29.6); g.lineTo(2, 32); g.closePath(); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(4, 20); g.lineTo(25, 18.6); g.stroke();
    g.fillStyle = '#0a0b0c'; g.fillRect(2, 30, 8, 3);                // magazine baseplate
    speck(g, 30, 'rgba(255,255,255,0.06)', 96, 96); speck(g, 18, 'rgba(0,0,0,0.1)', 96, 96);
  }, 96, 96);

  SPR.gunAR7 = cnv(g => {                                          // AR-7: takedown survival rifle, stepped receiver, tall silhouette
    gunFist(g);
    vgrad(g, 30, 38, 36, 12, '#3a3d44', '#24262c');
    bevel(g, 30, 38, 36, 12, 'rgba(255,255,255,0.12)', 'rgba(0,0,0,0.4)');
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(48, 40, 17, 4, 0, 0, 7); g.fill();
    const stockPath = () => { g.beginPath(); g.moveTo(32, 40); g.lineTo(30, 26); g.quadraticCurveTo(30, 22, 36, 21); g.lineTo(60, 21); g.quadraticCurveTo(66, 22, 66, 26); g.lineTo(64, 40); g.closePath(); };
    let sk = g.createLinearGradient(30, 0, 66, 0);                  // stowed-stock receiver body, moulded polymer sheen
    sk.addColorStop(0, '#0e0f0a'); sk.addColorStop(0.25, '#2e3324'); sk.addColorStop(0.5, '#3c4330'); sk.addColorStop(0.75, '#242820'); sk.addColorStop(1, '#0a0b08');
    g.fillStyle = sk; stockPath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1.4; stockPath(); g.stroke();
    g.strokeStyle = 'rgba(230,240,210,0.18)'; g.lineWidth = 1; g.beginPath(); g.moveTo(33, 25); g.quadraticCurveTo(35, 22, 40, 21.6); g.stroke();
    const recPath = () => { g.beginPath(); g.moveTo(34, 21); g.lineTo(33, 5); g.quadraticCurveTo(33, 1, 40, 1); g.lineTo(56, 1); g.quadraticCurveTo(63, 1, 63, 5); g.lineTo(62, 21); g.closePath(); };
    let rc = g.createLinearGradient(33, 0, 63, 0);                  // upper action, one step narrower + lighter
    rc.addColorStop(0, '#181a13'); rc.addColorStop(0.3, '#3a4230'); rc.addColorStop(0.5, '#4a5338'); rc.addColorStop(0.7, '#2e3524'); rc.addColorStop(1, '#12130e');
    g.fillStyle = rc; recPath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1.2; recPath(); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(48, 1); g.lineTo(48, 21); g.stroke();
    let peep = g.createRadialGradient(48, 8, 0.5, 48, 8, 5.4);      // rear peep sight, real depth via radial shading
    peep.addColorStop(0, '#4a4d54'); peep.addColorStop(0.55, '#1c1d20'); peep.addColorStop(1, '#050506');
    g.fillStyle = peep; g.beginPath(); g.arc(48, 8, 5.4, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 0.8; g.beginPath(); g.arc(48, 8, 5.4, Math.PI * 1.1, Math.PI * 1.6); g.stroke();
    g.fillStyle = '#000'; g.beginPath(); g.arc(48, 8, 2, 0, 7); g.fill();
    let bl = g.createLinearGradient(44, 0, 52, 0);                  // barrel poking above, subtle taper + muzzle highlight
    bl.addColorStop(0, '#0e0f0a'); bl.addColorStop(0.5, '#3a4230'); bl.addColorStop(1, '#0e0f0a');
    g.fillStyle = bl; g.beginPath(); g.moveTo(45.4, 1); g.lineTo(46, -4); g.lineTo(50, -4); g.lineTo(50.6, 1); g.closePath(); g.fill();
    g.fillStyle = '#050506'; g.beginPath(); g.ellipse(48, -4, 2.3, 1, 0, 0, 7); g.fill();
    g.fillStyle = '#6a7358'; g.beginPath(); g.arc(38, 12, 1.7, 0, 7); g.fill(); g.beginPath(); g.arc(58, 12, 1.7, 0, 7); g.fill();  // takedown screws
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(38, 12, 1.7, 0, 7); g.stroke(); g.beginPath(); g.arc(58, 12, 1.7, 0, 7); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 0.8;            // slot detail on the screw heads
    g.beginPath(); g.moveTo(36.5, 12); g.lineTo(39.5, 12); g.moveTo(56.5, 12); g.lineTo(59.5, 12); g.stroke();
    let sl = g.createLinearGradient(0, 30, 0, 34);                  // sling loop at the buttstock end
    sl.addColorStop(0, '#4a4d54'); sl.addColorStop(1, '#1c1d20');
    g.strokeStyle = sl; g.lineWidth = 2; g.beginPath(); g.arc(33, 33, 2.6, 0.6, 3.6); g.stroke();
    speck(g, 26, 'rgba(255,255,255,0.03)', 96, 96); speck(g, 20, 'rgba(0,0,0,0.1)', 96, 96);
  }, 96, 96);

  SPR.gunLaser = cnv(g => {                                        // Q-branch laser: sleek gadget frame, layered glowing emitter
    gunFist(g);
    vgrad(g, 30, 38, 36, 12, '#2c3a44', '#182228');
    bevel(g, 30, 38, 36, 12, 'rgba(150,220,255,0.18)', 'rgba(0,0,0,0.4)');
    g.fillStyle = 'rgba(30,120,180,0.28)'; g.beginPath(); g.ellipse(48, 40, 22, 5, 0, 0, 7); g.fill();  // cool ambient glow pooling under it
    const framePath = () => { g.beginPath(); g.moveTo(25, 40); g.lineTo(29, 15); g.quadraticCurveTo(48, 6, 67, 15); g.lineTo(71, 40); g.closePath(); };
    let fr = g.createLinearGradient(25, 0, 71, 0);                  // brushed gunmetal, cool highlight sweeping across
    fr.addColorStop(0, '#141b20'); fr.addColorStop(0.28, '#6e8894'); fr.addColorStop(0.42, '#9ec2d2'); fr.addColorStop(0.55, '#4a6270');
    fr.addColorStop(0.78, '#243038'); fr.addColorStop(1, '#0e1316');
    g.fillStyle = fr; framePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1.5; framePath(); g.stroke();
    g.strokeStyle = 'rgba(200,240,255,0.5)'; g.lineWidth = 1;       // crisp top rim catching the light
    g.beginPath(); g.moveTo(31, 17); g.quadraticCurveTo(48, 9, 65, 17); g.stroke();
    let innerFr = g.createLinearGradient(0, 18, 0, 38);              // inset panel, a shade darker — reads as a separate plate
    innerFr.addColorStop(0, '#1c2830'); innerFr.addColorStop(1, '#0c1216');
    g.fillStyle = innerFr; g.beginPath(); g.moveTo(32, 38); g.lineTo(34, 20); g.quadraticCurveTo(48, 14, 62, 20); g.lineTo(64, 38); g.closePath(); g.fill();
    let coil = g.createLinearGradient(38, 24, 58, 24);               // glowing power-cell strip
    coil.addColorStop(0, 'rgba(30,80,120,0.2)'); coil.addColorStop(0.5, 'rgba(140,230,255,0.9)'); coil.addColorStop(1, 'rgba(30,80,120,0.2)');
    g.fillStyle = coil; g.fillRect(38, 25, 20, 3);
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(38, 25.6, 20, 0.8);
    let halo = g.createRadialGradient(48, 15, 0, 48, 15, 13);        // emitter: soft outer halo
    halo.addColorStop(0, 'rgba(200,245,255,0.55)'); halo.addColorStop(0.5, 'rgba(70,200,255,0.28)'); halo.addColorStop(1, 'rgba(20,120,180,0)');
    g.fillStyle = halo; g.beginPath(); g.arc(48, 15, 13, 0, 7); g.fill();
    let em = g.createRadialGradient(48, 15, 0.5, 48, 15, 7.5);       // bright inner crystal core
    em.addColorStop(0, '#ffffff'); em.addColorStop(0.4, 'rgba(190,245,255,0.98)'); em.addColorStop(0.75, 'rgba(60,200,255,0.85)'); em.addColorStop(1, 'rgba(20,120,180,0.15)');
    g.fillStyle = em; g.beginPath(); g.moveTo(48, 8); g.lineTo(53, 15); g.lineTo(48, 22); g.lineTo(43, 15); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(48, 8); g.lineTo(53, 15); g.lineTo(48, 22); g.lineTo(43, 15); g.closePath(); g.stroke();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(48, 15, 1.6, 0, 7); g.fill();
    for (const [ix, iy, on] of [[35, 32, 1], [61, 32, 0]]) {         // small status LEDs
      const led = g.createRadialGradient(ix, iy, 0, ix, iy, 2);
      led.addColorStop(0, on ? '#baffc8' : '#3a2020'); led.addColorStop(1, on ? '#1a8a3a' : '#1a0a0a');
      g.fillStyle = led; g.beginPath(); g.arc(ix, iy, 1.6, 0, 7); g.fill();
    }
    g.strokeStyle = 'rgba(140,220,255,0.55)'; g.lineWidth = 1.1;     // side cooling fins, each with its own tiny highlight
    for (const y of [21, 26, 31, 36]) {
      g.beginPath(); g.moveTo(30, y); g.lineTo(37, y - 1); g.stroke();
      g.beginPath(); g.moveTo(59, y - 1); g.lineTo(66, y); g.stroke();
    }
    g.strokeStyle = 'rgba(255,255,255,0.2)'; g.lineWidth = 0.6;
    for (const y of [20.4, 25.4, 30.4, 35.4]) { g.beginPath(); g.moveTo(30, y); g.lineTo(37, y - 1); g.stroke(); }
    speck(g, 20, 'rgba(150,220,255,0.08)', 96, 96);
  }, 96, 96);

  SPR.gunGolden = cnv(g => {                                       // Golden Gun: same silhouette as the Walther, gilded + gem, ornate
    gunFist(g);
    vgrad(g, 30, 38, 36, 12, '#8a6a2a', '#5a4416');
    bevel(g, 30, 38, 36, 12, 'rgba(255,240,180,0.25)', 'rgba(0,0,0,0.4)');
    g.fillStyle = 'rgba(140,100,10,0.3)'; g.beginPath(); g.ellipse(48, 40, 20, 4, 0, 0, 7); g.fill();
    const slidePath = () => { g.beginPath(); g.moveTo(24, 40); g.lineTo(30, 16); g.lineTo(66, 16); g.lineTo(72, 40); g.closePath(); };
    let sg = g.createLinearGradient(20, 0, 76, 0);                  // polished-gold roll-off: dark, bright streak, dark, bright, dark
    sg.addColorStop(0, '#5a4416'); sg.addColorStop(0.18, '#c9a227'); sg.addColorStop(0.32, '#fff3c0');
    sg.addColorStop(0.46, '#c9a227'); sg.addColorStop(0.62, '#7a5c1e'); sg.addColorStop(0.78, '#e8c860'); sg.addColorStop(1, '#4a3a12');
    g.fillStyle = sg; slidePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1.5; slidePath(); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(30, 16); g.lineTo(24, 40); g.stroke();
    g.beginPath(); g.moveTo(66, 16); g.lineTo(72, 40); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(48, 17); g.lineTo(48, 39); g.stroke();  // centre facet seam
    g.strokeStyle = 'rgba(140,90,10,0.6)'; g.lineWidth = 1;          // ornate engraving flourish, layered curls
    g.beginPath(); g.moveTo(35, 21); g.quadraticCurveTo(48, 16, 61, 21); g.stroke();
    g.beginPath(); g.moveTo(35, 34); g.quadraticCurveTo(48, 39, 61, 34); g.stroke();
    g.strokeStyle = 'rgba(255,240,190,0.35)'; g.lineWidth = 0.7;
    g.beginPath(); g.moveTo(36, 23); g.quadraticCurveTo(48, 19, 60, 23); g.stroke();
    g.beginPath(); g.moveTo(38, 25); g.quadraticCurveTo(48, 22, 58, 25); g.moveTo(38, 30); g.quadraticCurveTo(48, 33, 58, 30); g.stroke();
    let gem = g.createRadialGradient(46, 11, 0.4, 49, 13, 5);        // red gem inset, faceted — the classic Golden Gun tell
    gem.addColorStop(0, '#ffd8d0'); gem.addColorStop(0.35, '#ff5a44'); gem.addColorStop(0.75, '#a01a10'); gem.addColorStop(1, '#4a0a06');
    g.fillStyle = gem; g.beginPath(); g.arc(48, 12, 4.4, 0, 7); g.fill();
    g.strokeStyle = '#3a2c08'; g.lineWidth = 1; g.beginPath(); g.arc(48, 12, 4.4, 0, 7); g.stroke();
    g.strokeStyle = 'rgba(120,20,10,0.5)'; g.lineWidth = 0.6;        // facet cuts across the gem
    for (const a2 of [0, 1.05, 2.1, 3.14, 4.2, 5.24]) { g.beginPath(); g.moveTo(48, 12); g.lineTo(48 + Math.cos(a2) * 4.4, 12 + Math.sin(a2) * 4.4); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(46.4, 10.4, 1, 0, 7); g.fill();  // sparkle
    let bezel = g.createLinearGradient(0, 6, 0, 18);
    bezel.addColorStop(0, '#f0d878'); bezel.addColorStop(1, '#8a6a1a');
    g.strokeStyle = bezel; g.lineWidth = 1.4; g.beginPath(); g.arc(48, 12, 5.4, 0, 7); g.stroke();
    speck(g, 20, 'rgba(255,240,180,0.1)', 96, 96); speck(g, 8, 'rgba(0,0,0,0.08)', 96, 96);
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
  // SHIPPED CHARACTER ART — real PNG assets replacing specific procedural
  // SPR entries by default (distinct from CUSTOM ART above, which is a
  // per-browser user override persisted to localStorage; this is checked
  // into the repo as the actual shipped look for that kind). Loaded async
  // at boot — every getTex() reads SPR[kind] fresh each frame, so a sprite
  // arriving a few frames late just pops in with no special handling needed.
  // -------------------------------------------------------------------------
  const ART_ASSETS = {                                      // bump a path's ?v= whenever that file on disk changes
    matron: 'assets/sprites/matron.png?v=2',
    civilianM: 'assets/sprites/civilianM.png?v=1',
    streetartist: 'assets/sprites/streetartist.png?v=1',
    brute: 'assets/sprites/brute.png?v=1',
    carlotta: 'assets/sprites/carlotta.png?v=1',
    defector: 'assets/sprites/defector.png?v=1',
    flowergirl: 'assets/sprites/flowergirl.png?v=1',
    goon: 'assets/sprites/goon.png?v=1',
    laundrylady: 'assets/sprites/laundrylady.png?v=1',
    drz: 'assets/sprites/drz.png?v=1',
    sniper: 'assets/sprites/sniper.png?v=1',
    waiter: 'assets/sprites/waiter.png?v=1',
    agent005: 'assets/sprites/agent005.png?v=1',
    civilianF: 'assets/sprites/civilianF.png?v=1',
    fisherman: 'assets/sprites/fisherman.png?v=1',
    vendor: 'assets/sprites/vendor.png?v=1',
    tourist: 'assets/sprites/tourist.png?v=1',
    patsy: 'assets/sprites/patsy.png?v=1',
    officer: 'assets/sprites/officer.png?v=1',
    double: 'assets/sprites/double.png?v=1',
    doubleSuited: 'assets/sprites/doubleSuited.png?v=1',
    doubleDressed: 'assets/sprites/doubleDressed.png?v=1',
    eiffeltower: 'assets/sprites/eiffeltower.png?v=1',
    louvrepyramid: 'assets/sprites/louvrepyramid.png?v=1',
    arcdetriomphe: 'assets/sprites/arcdetriomphe.png?v=1',
    moulinrouge: 'assets/sprites/moulinrouge.png?v=1',
    sacrecoeur: 'assets/sprites/sacrecoeur.png?v=1',
    notredame: 'assets/sprites/notredame.png?v=1',
    gun: 'assets/sprites/gun.png?v=2',
    gunSterling: 'assets/sprites/gunSterling.png?v=1',
    gunAR7: 'assets/sprites/gunAR7.png?v=1',
    gunLaser: 'assets/sprites/gunLaser.png?v=1',
    gunGolden: 'assets/sprites/gunGolden.png?v=1',
    maskstand: 'assets/sprites/maskstand.png?v=1',
    nixonmask: 'assets/sprites/nixonmask.png?v=1',
    sportscar: 'assets/sprites/sportscar.png?v=1',
    sportscarOpen: 'assets/sprites/sportscarOpen.png?v=1',
    book: 'assets/sprites/book.png?v=1',
    fabergeegg: 'assets/sprites/fabergeegg.png?v=1',
    agent: 'assets/sprites/agent.png?v=1',
    agentCase: 'assets/sprites/agentCase.png?v=1',
    headshot: 'assets/sprites/headshot.png?v=1',
    vendingmachine: 'assets/sprites/vendingmachine.png?v=1',
    vendingmachineTaken: 'assets/sprites/vendingmachineTaken.png?v=1',
    bomb: 'assets/sprites/bomb.png?v=1',
    bombOpen: 'assets/sprites/bombOpen.png?v=1',
    bombRedCut: 'assets/sprites/bombRedCut.png?v=1',
    bombBlueCut: 'assets/sprites/bombBlueCut.png?v=1',
    desk: 'assets/sprites/desk.png?v=1',
    deskOpen: 'assets/sprites/deskOpen.png?v=1',
    safe: 'assets/sprites/safe.png?v=1',
    safeOpen: 'assets/sprites/safeOpen.png?v=1',
    microfichemachine: 'assets/sprites/microfichemachine.png?v=2',
    microfichemachineOn: 'assets/sprites/microfichemachineOn.png?v=2',
    ciphermachine: 'assets/sprites/ciphermachine.png?v=1',
    tvconsole: 'assets/sprites/tvconsole.png?v=1',
    tvconsoleOn: 'assets/sprites/tvconsoleOn.png?v=1',
  };
  const FLASH_OF = { goon: 'goonFlash', brute: 'bruteFlash', sniper: 'sniperFlash' };  // hit-flash white silhouettes
                                                                                          // derived from these — regenerate
                                                                                          // whenever the base art is replaced
  function isTainted(img) {                                // a canvas holding this image would throw on getImageData —
    try {                                                    // e.g. index.html opened via file:// in a browser that
      const c = document.createElement('canvas'); c.width = 1; c.height = 1;  // treats local files as cross-origin.
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0, 1, 1);
      g.getImageData(0, 0, 1, 1);
      return false;
    } catch (e) { return true; }
  }
  function trimTransparent(img) {                          // crop to the opaque bounding box — AI-generated character
    const c = document.createElement('canvas');             // art tends to ship with a lot of empty padding around
    c.width = img.width; c.height = img.height;             // the figure, which would otherwise shrink it on the canvas
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let minX = c.width, minY = c.height, maxX = 0, maxY = 0;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      if (d[(y * c.width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    if (maxX < minX || maxY < minY) return img;             // fully transparent — nothing to trim
    const w = maxX - minX + 1, h = maxY - minY + 1;
    const t = document.createElement('canvas'); t.width = w; t.height = h;
    t.getContext('2d').drawImage(c, minX, minY, w, h, 0, 0, w, h);
    return t;
  }
  function fitCharacter(img, w, h) {                        // scale to fit WITHIN the canvas and bottom-align (feet
    const c = document.createElement('canvas');              // planted on the floor line) — matches how every procedural
    c.width = w; c.height = h;                                // character fills ~all of the 64x64 canvas, feet near y=64,
    const g = c.getContext('2d');                             // since the renderer maps the canvas's bottom edge to the floor.
    const s = Math.min(h / img.height, w / img.width);        // contain-fit, not fill-height: a trimmed image wider than
    const dw = img.width * s, dh = img.height * s;            // it is tall (a car, a reclining body, an open book) would
    g.imageSmoothingEnabled = true;                           // otherwise overflow the square canvas and get clipped left/right
    g.drawImage(img, (w - dw) / 2, h - dh, dw, dh);
    return c;
  }
  function fitWeapon(img, w, h) {                           // scale to fill the canvas HEIGHT like fitCharacter, but
    const c = document.createElement('canvas');              // align on the MUZZLE (topmost opaque pixels) instead of
    c.width = w; c.height = h;                                // the bounding-box centre — AI-generated weapon art isn't
    const g = c.getContext('2d');                             // reliably centred on its own barrel (the fist/mag/scope
    const s = h / img.height;                                 // hangs off one side unevenly), so centering the whole
    const dw = img.width * s;                                 // silhouette leaves the sights off the crosshair. Every
                                                                // weapon is posed pointing away from camera, so the first
                                                                // opaque row from the top is the barrel/emitter tip.
    const sc = document.createElement('canvas'); sc.width = img.width; sc.height = img.height;
    const sg = sc.getContext('2d'); sg.drawImage(img, 0, 0);
    const d = sg.getImageData(0, 0, img.width, img.height).data;
    let minY = -1;
    for (let y = 0; y < img.height && minY < 0; y++) {
      for (let x = 0; x < img.width; x++) { if (d[(y * img.width + x) * 4 + 3] > 8) { minY = y; break; } }
    }
    let sumX = 0, n = 0;
    if (minY >= 0) {
      const band = Math.min(img.height, minY + Math.max(2, Math.round(img.height * 0.03)));
      for (let y = minY; y < band; y++) for (let x = 0; x < img.width; x++) {
        if (d[(y * img.width + x) * 4 + 3] > 8) { sumX += x; n++; }
      }
    }
    const muzzleX = n > 0 ? sumX / n : img.width / 2;
    g.imageSmoothingEnabled = true;
    g.drawImage(img, w / 2 - muzzleX * s, 0, dw, h);
    return c;
  }
  const WEAPON_SPRITE_NAMES = new Set(['gun', 'gunSterling', 'gunAR7', 'gunLaser', 'gunGolden']);  // HUD viewmodels — muzzle-aligned, not bbox-centred
  const ART_RES = 256;                                      // shipped PNG art renders at real resolution, not the
                                                               // 64x64 procedural-canvas size — billboards sample at
                                                               // their own texture size now (see engine.js), so there's
                                                               // no upside to downscaling detailed art to 64x64 first
  for (const [name, path] of Object.entries(ART_ASSETS)) {
    if (!SPR[name]) continue;
    const w = ART_RES, h = ART_RES;
    const img = new Image();
    img.onload = () => {
      // A tainted canvas must NEVER reach SPR — the renderer's own texture
      // cache (cacheOf in engine.js) reads pixel data from every sprite it
      // draws, with no guard of its own; handing it a tainted canvas throws
      // mid-frame and blanks the whole screen, not just this one character.
      if (isTainted(img)) {
        console.warn('Shipped character art blocked by the browser (canvas tainted — this happens opening index.html via file://; serve it from a local server instead, e.g. `python3 -m http.server`). Keeping the built-in art for:', path);
        return;
      }
      try {
        const fit = WEAPON_SPRITE_NAMES.has(name) ? fitWeapon : fitCharacter;
        SPR[name] = fit(trimTransparent(img), w, h);
        if (FLASH_OF[name]) SPR[FLASH_OF[name]] = whiteOf(SPR[name]);
      } catch (e) { console.warn('Failed to apply shipped character art:', path, e); }
    };
    img.onerror = () => console.warn('Failed to load shipped character art (check the path/file exists):', path);
    img.src = path;
  }

  // -------------------------------------------------------------------------
  // Entity factories, keyed by the `kind` stored in level data
  // -------------------------------------------------------------------------
  // Every plain prop is destructible by default: hp:20. On death main.js removes
  // it and spawns a `spawnFx` burst — no lingering wrecked sprite. A prop
  // that supplies its OWN `getTex` in `extra` (desk's open/closed, agent's
  // has-case) keeps that custom logic verbatim — Object.assign below lets `extra`
  // win — so those stay visually unaffected here; main.js separately excludes a
  // short list of quest-critical kinds (agent/tube/desk) from ever taking damage
  // at all, since destroying them could strand the puzzle chain.
  const prop = (kind, name, x, y, scale, solid, extra) =>
    Object.assign({ kind, name, x, y, scale, solid, dead: false, hp: 20, flash: 0,
      getTex() { return SPR[kind]; } }, extra);

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
    royalpalm: (x, y) => prop('royalpalm', 'ROYAL PALM', x, y, 1.3, true),
    bananaplant: (x, y) => prop('bananaplant', 'BANANA TREE', x, y, 0.85, true),
    bougainvillea: (x, y) => prop('bougainvillea', 'BOUGAINVILLEA', x, y, 0.75, false),
    fern: (x, y) => prop('fern', 'POTTED FERN', x, y, 0.65, false),
    cactus: (x, y) => prop('cactus', 'POTTED CACTUS', x, y, 0.55, false),
    hedge: (x, y) => prop('hedge', 'HEDGE', x, y, 0.9, true),
    bar: (x, y) => prop('bar', 'BAR CART', x, y, 0.85, true),
    medkit: (x, y) => prop('medkit', 'FIRST-AID TIN', x, y, 0.34, false, { pickup: 'med' }),
    ammo: (x, y) => prop('ammo', 'AMMO BOX', x, y, 0.34, false, { pickup: 'ammo' }),
    wpn_sterling: (x, y) => prop('wpn_sterling', 'STERLING CASE', x, y, 0.42, false, { pickup: 'weapon', weaponKind: 'sterling', grantAmmo: 60 }),
    wpn_ar7: (x, y) => prop('wpn_ar7', 'AR-7 CASE', x, y, 0.42, false, { pickup: 'weapon', weaponKind: 'ar7', grantAmmo: 20 }),
    wpn_laser: (x, y) => prop('wpn_laser', 'LASER GADGET', x, y, 0.42, false, { pickup: 'weapon', weaponKind: 'laser', grantAmmo: 8 }),
    wpn_golden: (x, y) => prop('wpn_golden', 'GOLDEN GUN', x, y, 0.42, false, { pickup: 'weapon', weaponKind: 'golden', grantAmmo: 24 }),
    camera: (x, y) => prop('camera', 'SPY CAMERA', x, y, 0.4, false),
    disguise: (x, y) => prop('disguise', 'DISGUISE KIT', x, y, 0.45, false, { pickup: 'disguise' }),
    book: (x, y) => prop('book', 'OPEN BOOK', x, y, 0.4, false),
    safe: (x, y) => prop('safe', 'WALL SAFE', x, y, 0.8, true, {
      open: false, getTex() { return this.open ? SPR.safeOpen : SPR.safe; },
    }),
    letter: (x, y) => prop('letter', 'CODED LETTER', x, y, 0.32, false),
    telegram: (x, y) => prop('telegram', 'TELEGRAM', x, y, 0.32, false),
    businesscard: (x, y) => prop('businesscard', 'BUSINESS CARD', x, y, 0.26, false),
    watch: (x, y) => prop('watch', 'POCKET WATCH', x, y, 0.3, false),
    personnelfile: (x, y) => prop('personnelfile', 'PERSONNEL FILE', x, y, 0.35, false),
    microfiche: (x, y) => prop('microfiche', 'MICROFICHE', x, y, 0.26, false),
    screwdriver: (x, y) => prop('screwdriver', 'SCREWDRIVER', x, y, 0.3, false),
    pliers: (x, y) => prop('pliers', 'PLIERS', x, y, 0.3, false),
    ciphermachine: (x, y) => prop('ciphermachine', 'CIPHER MACHINE', x, y, 0.8, true),
    bomb: (x, y) => prop('bomb', 'THE BOMB', x, y, 0.85, true, { casingOpen: false, cut: null,
      getTex() { return this.cut === 'blue' ? SPR.bombBlueCut : this.cut === 'red' ? SPR.bombRedCut : this.casingOpen ? SPR.bombOpen : SPR.bomb; } }),
    microfichemachine: (x, y) => prop('microfichemachine', 'MICROFICHE VIEWER', x, y, 0.8, true, { showingArticle: false,
      getTex() { return this.showingArticle ? SPR.microfichemachineOn : SPR.microfichemachine; } }),
    sportscar: (x, y) => prop('sportscar', 'SPORTS CAR', x, y, 1.3, true, {
      open: false, getTex() { return this.open ? SPR.sportscarOpen : SPR.sportscar; },
    }),
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
    vendor: (x, y, e) => ({
      kind: 'vendor', name: 'VENDOR', x, y, solid: false, scale: 0.72, hp: 1, dead: false, flash: 0,
      behavior: (e && e.behavior) || 'wander', anchorX: x, anchorY: y, wx: x, wy: y, wanderT: Math.random() * 3,
      getTex() { return this.dead ? SPR.civilianCorpse : SPR.vendor; },
    }),
    waiter: (x, y, e) => ({
      kind: 'waiter', name: 'WAITER', x, y, solid: false, scale: 0.72, hp: 1, dead: false, flash: 0,
      behavior: (e && e.behavior) || 'wander', anchorX: x, anchorY: y, wx: x, wy: y, wanderT: Math.random() * 3,
      getTex() { return this.dead ? SPR.civilianCorpse : SPR.waiter; },
    }),
    tourist: (x, y, e) => ({
      kind: 'tourist', name: 'TOURIST', x, y, solid: false, scale: 0.72, hp: 1, dead: false, flash: 0,
      behavior: (e && e.behavior) || 'wander', anchorX: x, anchorY: y, wx: x, wy: y, wanderT: Math.random() * 3,
      getTex() { return this.dead ? SPR.civilianCorpse : SPR.tourist; },
    }),
    officer: (x, y, e) => ({
      kind: 'officer', name: 'POLICE OFFICER', x, y, solid: false, scale: 0.72, hp: 1, dead: false, flash: 0,
      behavior: (e && e.behavior) || 'wander', anchorX: x, anchorY: y, wx: x, wy: y, wanderT: Math.random() * 3,
      getTex() { return this.dead ? SPR.civilianCorpse : SPR.officer; },
    }),
    fisherman: (x, y, e) => ({
      kind: 'fisherman', name: 'FISHERMAN', x, y, solid: false, scale: 0.72, hp: 1, dead: false, flash: 0,
      behavior: (e && e.behavior) || 'wander', anchorX: x, anchorY: y, wx: x, wy: y, wanderT: Math.random() * 3,
      getTex() { return this.dead ? SPR.civilianCorpse : SPR.fisherman; },
    }),
    flowergirl: (x, y, e) => ({
      kind: 'flowergirl', name: 'FLOWER GIRL', x, y, solid: false, scale: 0.72, hp: 1, dead: false, flash: 0,
      behavior: (e && e.behavior) || 'wander', anchorX: x, anchorY: y, wx: x, wy: y, wanderT: Math.random() * 3,
      getTex() { return this.dead ? SPR.civilianCorpse : SPR.flowergirl; },
    }),
    carlotta: (x, y, e) => ({
      kind: 'carlotta', name: 'CARLOTTA', x, y, solid: false, scale: 0.72, hp: 1, dead: false, flash: 0,
      behavior: (e && e.behavior) || 'stationary', anchorX: x, anchorY: y, wx: x, wy: y, wanderT: Math.random() * 3,
      getTex() { return this.dead ? SPR.civilianCorpse : SPR.carlotta; },
    }),
    drz: (x, y, e) => ({
      kind: 'drz', name: 'DR. Z', x, y, solid: false, scale: 0.72, hp: 1, dead: false, flash: 0,
      behavior: (e && e.behavior) || 'stationary', anchorX: x, anchorY: y, wx: x, wy: y, wanderT: Math.random() * 3,
      getTex() { return this.dead ? SPR.civilianCorpse : SPR.drz; },
    }),
    defector: (x, y, e) => ({
      kind: 'defector', name: 'THE DEFECTOR', x, y, solid: false, scale: 0.72, hp: 1, dead: false, flash: 0,
      behavior: (e && e.behavior) || 'stationary', anchorX: x, anchorY: y, wx: x, wy: y, wanderT: Math.random() * 3,
      getTex() { return this.dead ? SPR.civilianCorpse : SPR.defector; },
    }),
    // Agent 005 starts as a protected ally (kind 'agent005', NO_DAMAGE) — main.js's
    // shoot() literally rewrites his `kind` to 'boss005' once "The Truth" is used on
    // him, which drops the NO_DAMAGE protection and picks him up in the HOSTILE
    // table automatically, reusing all existing combat/AI code for the boss fight.
    agent005: (x, y) => ({
      kind: 'agent005', name: 'AGENT 005', x, y, solid: true, scale: 0.85, hp: 220, dead: false, aggro: false, atkT: 0, flash: 0,
      getTex() { return this.dead ? SPR.corpse : SPR.agent005; },
    }),
    matron: (x, y, e) => ({
      kind: 'matron', name: 'THE MATRON', x, y, solid: true, scale: 0.85, hp: 1, dead: false, flash: 0,
      behavior: (e && e.behavior) || 'stationary', anchorX: x, anchorY: y, wx: x, wy: y, wanderT: Math.random() * 3,
      getTex() { return this.dead ? SPR.civilianCorpse : SPR.matron; },
    }),
    streetartist: (x, y, e) => ({
      kind: 'streetartist', name: 'STREET ARTIST', x, y, solid: true, scale: 0.85, hp: 1, dead: false, flash: 0,
      behavior: (e && e.behavior) || 'stationary', anchorX: x, anchorY: y, wx: x, wy: y, wanderT: Math.random() * 3,
      getTex() { return this.dead ? SPR.civilianCorpse : SPR.streetartist; },
    }),
    headshot: (x, y) => prop('headshot', "MATRON'S HEADSHOT", x, y, 0.3, false),
    metroticket: (x, y) => prop('metroticket', 'METRO TICKET', x, y, 0.26, false),
    fabergeegg: (x, y) => prop('fabergeegg', 'FABERGÉ EGG', x, y, 0.55, true),
    laundrylady: (x, y, e) => ({
      kind: 'laundrylady', name: 'LAUNDRY LADY', x, y, solid: true, scale: 0.85, hp: 1, dead: false, flash: 0,
      behavior: (e && e.behavior) || 'stationary', anchorX: x, anchorY: y, wx: x, wy: y, wanderT: Math.random() * 3,
      getTex() { return this.dead ? SPR.civilianCorpse : SPR.laundrylady; },
    }),
    // The double starts plain-clothed and unremarkable; useEnt() flips `suited`
    // once the suit goes on, then `disguised` (suited AND masked) once the mask
    // follows — three visually distinct states, same kind-preserving state-flip
    // trick used for the boss005 reveal, just visual here rather than combat-relevant.
    double: (x, y, e) => ({
      kind: 'double', name: 'THE DOUBLE', x, y, solid: true, scale: 0.85, hp: 1, dead: false, flash: 0, suited: false, disguised: false,
      behavior: (e && e.behavior) || 'stationary', anchorX: x, anchorY: y, wx: x, wy: y, wanderT: Math.random() * 3,
      getTex() { return this.dead ? SPR.civilianCorpse : (this.disguised ? SPR.doubleDressed : this.suited ? SPR.doubleSuited : SPR.double); },
    }),
    patsy: (x, y, e) => ({
      kind: 'patsy', name: 'THE PATSY', x, y, solid: true, scale: 0.85, hp: 1, dead: false, flash: 0,
      behavior: (e && e.behavior) || 'stationary', anchorX: x, anchorY: y, wx: x, wy: y, wanderT: Math.random() * 3,
      getTex() { return this.dead ? SPR.civilianCorpse : SPR.patsy; },
    }),
    nixonmask: (x, y) => prop('nixonmask', 'NIXON MASK', x, y, 0.4, false),
    maskstand: (x, y) => prop('maskstand', 'MASK STAND', x, y, 0.85, true),
    laundryticket: (x, y) => prop('laundryticket', 'LAUNDRY TICKET', x, y, 0.26, false),
    package: (x, y) => prop('package', 'WRAPPED PACKAGE', x, y, 0.5, false),
    curtainrods: (x, y) => prop('curtainrods', 'CURTAIN RODS', x, y, 0.7, true),
    suitrack: (x, y) => prop('suitrack', 'GARMENT RACK', x, y, 0.9, true),
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
    // Wave 1 — street & outdoor
    mailbox: (x, y) => prop('mailbox', 'MAILBOX', x, y, 0.55, true),
    trashcan: (x, y) => prop('trashcan', 'TRASH CAN', x, y, 0.5, true),
    bicycle: (x, y) => prop('bicycle', 'BICYCLE', x, y, 0.75, true),
    trafficlight: (x, y) => prop('trafficlight', 'TRAFFIC LIGHT', x, y, 1.0, true),
    watertower: (x, y) => prop('watertower', 'WATER TOWER', x, y, 1.1, true),
    barrier: (x, y) => prop('barrier', 'BARRIER', x, y, 0.7, true),
    vendingmachine: (x, y) => prop('vendingmachine', 'VENDING MACHINE', x, y, 0.85, true, {
      taken: false, getTex() { return this.taken ? SPR.vendingmachineTaken : SPR.vendingmachine; },
    }),
    flowercart: (x, y) => prop('flowercart', 'FLOWER CART', x, y, 0.85, true),
    // Wave 2 — home
    bed: (x, y) => prop('bed', 'BED', x, y, 1.0, true),
    sofa: (x, y) => prop('sofa', 'SOFA', x, y, 0.9, true),
    armchair: (x, y) => prop('armchair', 'ARMCHAIR', x, y, 0.7, true),
    diningtable: (x, y) => prop('diningtable', 'DINING TABLE', x, y, 0.85, true),
    bookshelf: (x, y) => prop('bookshelf', 'BOOKSHELF', x, y, 0.85, true),
    icebox: (x, y) => prop('icebox', 'ICEBOX', x, y, 0.85, true),
    recordplayer: (x, y) => prop('recordplayer', 'RECORD PLAYER', x, y, 0.75, true),
    wardrobe: (x, y) => prop('wardrobe', 'WARDROBE', x, y, 0.95, true),
    // Wave 3 — work
    officechair: (x, y) => prop('officechair', 'OFFICE CHAIR', x, y, 0.7, true),
    watercooler: (x, y) => prop('watercooler', 'WATER COOLER', x, y, 0.7, true),
    coatrack: (x, y) => prop('coatrack', 'COAT RACK', x, y, 0.8, true),
    corkboard: (x, y) => prop('corkboard', 'CORKBOARD', x, y, 0.9, true),
    cashregister: (x, y) => prop('cashregister', 'CASH REGISTER', x, y, 0.75, true),
    wallmap: (x, y) => prop('wallmap', 'WALL MAP', x, y, 0.95, true),
    conftable: (x, y) => prop('conftable', 'CONFERENCE TABLE', x, y, 1.1, true),
    punchclock: (x, y) => prop('punchclock', 'PUNCH CLOCK', x, y, 0.85, true),
    // Mideast City wave
    bazaarstall: (x, y) => prop('bazaarstall', 'BAZAAR STALL', x, y, 1.15, true),
    spicesacks: (x, y) => prop('spicesacks', 'SPICE SACKS', x, y, 0.85, true),
    brasslantern: (x, y) => prop('brasslantern', 'BRASS LANTERN', x, y, 0.55, false),
    hookah: (x, y) => prop('hookah', 'HOOKAH', x, y, 0.6, true),
    urn: (x, y) => prop('urn', 'CERAMIC URN', x, y, 0.75, true),
    cratesarabic: (x, y) => prop('cratesarabic', 'MARKET CRATES', x, y, 0.9, true),
    well: (x, y) => prop('well', 'STONE WELL', x, y, 1.0, true),
    handcart: (x, y) => prop('handcart', 'MARKET HANDCART', x, y, 0.95, true),
    // Swinging 60s Paris wave
    cafetable: (x, y) => prop('cafetable', 'BISTRO TABLE', x, y, 0.85, true),
    streetkiosk: (x, y) => prop('streetkiosk', 'ADVERTISING KIOSK', x, y, 1.1, true),
    vespa: (x, y) => prop('vespa', 'VESPA SCOOTER', x, y, 0.9, true),
    easel: (x, y) => prop('easel', "ARTIST'S EASEL", x, y, 0.85, false),
    boulevardlamp: (x, y) => prop('boulevardlamp', 'BOULEVARD LAMP', x, y, 1.05, true),
    champagnebucket: (x, y) => prop('champagnebucket', 'CHAMPAGNE BUCKET', x, y, 0.5, false),
    jukebox: (x, y) => prop('jukebox', 'JUKEBOX', x, y, 0.85, true),
    metroentrance: (x, y) => prop('metroentrance', 'METRO ENTRANCE', x, y, 1.2, true),
    eiffeltower: (x, y) => prop('eiffeltower', 'EIFFEL TOWER', x, y, 2.4, true),
    arcdetriomphe: (x, y) => prop('arcdetriomphe', 'ARC DE TRIOMPHE', x, y, 1.6, true),
    notredame: (x, y) => prop('notredame', 'NOTRE-DAME', x, y, 1.8, true),
    louvrepyramid: (x, y) => prop('louvrepyramid', 'LOUVRE PYRAMID', x, y, 1.3, true),
    moulinrouge: (x, y) => prop('moulinrouge', 'MOULIN ROUGE', x, y, 1.3, true),
    sacrecoeur: (x, y) => prop('sacrecoeur', 'SACRÉ-CŒUR', x, y, 1.6, true),
    // Mid-century suburbia wave
    stationwagon: (x, y) => prop('stationwagon', 'STATION WAGON', x, y, 1.3, true),
    mailboxpost: (x, y) => prop('mailboxpost', 'MAILBOX', x, y, 0.6, true),
    bbqgrill: (x, y) => prop('bbqgrill', 'BBQ GRILL', x, y, 0.7, true),
    tvconsole: (x, y) => prop('tvconsole', 'TV CONSOLE', x, y, 0.9, true, {
      on: false, getTex() { return this.on ? SPR.tvconsoleOn : SPR.tvconsole; },
    }),
    lawnmower: (x, y) => prop('lawnmower', 'LAWNMOWER', x, y, 0.7, true),
    swingset: (x, y) => prop('swingset', 'SWING SET', x, y, 1.15, true),
    picnictable: (x, y) => prop('picnictable', 'PICNIC TABLE', x, y, 1.05, true),
    sprinkler: (x, y) => prop('sprinkler', 'LAWN SPRINKLER', x, y, 0.55, false),
    // Soviet Russia wave
    laborstatue: (x, y) => prop('laborstatue', 'LABOR STATUE', x, y, 1.1, true),
    samovar: (x, y) => prop('samovar', 'SAMOVAR', x, y, 0.55, true),
    posterboard: (x, y) => prop('posterboard', 'PROPAGANDA POSTER', x, y, 0.9, true),
    payphone: (x, y) => prop('payphone', 'STREET PAYPHONE', x, y, 0.85, true),
    stalinistlamp: (x, y) => prop('stalinistlamp', 'STALINIST LAMP', x, y, 1.0, true),
    sputnikmodel: (x, y) => prop('sputnikmodel', 'SPUTNIK MONUMENT', x, y, 0.85, true),
    vodkacrate: (x, y) => prop('vodkacrate', 'VODKA CRATE', x, y, 0.7, true),
    radioset: (x, y) => prop('radioset', 'RADIO SET', x, y, 0.75, true),
    // Dealey Plaza 1963 wave
    warehousebuilding: (x, y) => prop('warehousebuilding', 'WAREHOUSE BUILDING', x, y, 1.4, true),
    pergolacolonnade: (x, y) => prop('pergolacolonnade', 'CONCRETE PERGOLA', x, y, 1.25, true),
    vintagelamppost: (x, y) => prop('vintagelamppost', 'VINTAGE LAMPPOST', x, y, 1.0, true),
    streetsign: (x, y) => prop('streetsign', 'STREET SIGN', x, y, 0.85, true),
    newspaperbox: (x, y) => prop('newspaperbox', 'NEWSPAPER BOX', x, y, 0.65, true),
    sedan1963: (x, y) => prop('sedan1963', "'63 SEDAN", x, y, 1.3, true),
    flagpole: (x, y) => prop('flagpole', 'FLAGPOLE', x, y, 1.15, true),
    stormdrain: (x, y) => prop('stormdrain', 'STORM DRAIN', x, y, 0.5, false),
    // New York 1964 wave
    yellowcab: (x, y) => prop('yellowcab', 'YELLOW CAB', x, y, 1.3, true),
    policecarny: (x, y) => prop('policecarny', 'POLICE CRUISER', x, y, 1.3, true),
    hotdogcart: (x, y) => prop('hotdogcart', 'HOT DOG CART', x, y, 0.95, true),
    subwaygrate: (x, y) => prop('subwaygrate', 'SUBWAY GRATE', x, y, 0.5, false),
    glassbooth: (x, y) => prop('glassbooth', 'PHONE BOOTH', x, y, 0.95, true),
    worldsfair: (x, y) => prop('worldsfair', "WORLD'S FAIR UNISPHERE", x, y, 1.1, true),
    fireescape: (x, y) => prop('fireescape', 'FIRE ESCAPE', x, y, 1.15, false),
    brownstonestoop: (x, y) => prop('brownstonestoop', 'BROWNSTONE STOOP', x, y, 1.1, true),
    // Hong Kong wave
    rickshaw: (x, y) => prop('rickshaw', 'RICKSHAW', x, y, 1.0, true),
    junkboat: (x, y) => prop('junkboat', 'JUNK BOAT', x, y, 1.3, true),
    dimsumcart: (x, y) => prop('dimsumcart', 'DIM SUM CART', x, y, 0.95, true),
    mahjongtable: (x, y) => prop('mahjongtable', 'MAHJONG TABLE', x, y, 1.0, true),
    neonsignboard: (x, y) => prop('neonsignboard', 'NEON SIGNBOARD', x, y, 1.1, false),
    lanternstring: (x, y) => prop('lanternstring', 'PAPER LANTERNS', x, y, 0.9, false),
    teastall: (x, y) => prop('teastall', 'TEA STALL', x, y, 1.0, true),
    birdcage: (x, y) => prop('birdcage', 'BIRD CAGE', x, y, 0.7, false),
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
    for (const e of level.ents) {
      if (!FACT[e.kind]) continue;
      const ent = FACT[e.kind](e.x, e.y, e);
      // per-instance solid override (editor's WALK-THROUGH toggle) — every FACT
      // entry sets its own default `solid`, this just lets one placed copy differ
      if (e.solid != null) ent.solid = e.solid;
      // per-instance scale override (editor's +/- resize) — every FACT entry sets
      // its own default `scale`, this lets one placed copy be bigger/smaller
      if (e.scale != null) ent.scale = e.scale;
      ents.push(ent);
    }
    spawn.x = level.spawn.x; spawn.y = level.spawn.y; spawn.a = level.spawn.a;
    TEX[T.EXIT] = blastDoor(false);
    TEX[T.MAINFRAME] = mainframe(false);
    // vector-first levels ship their own geo → use it verbatim as the runtime geometry
    authoredGeo = (level.geo && level.geo.sectors && level.geo.sectors.length) ? {
      verts: level.geo.verts.map(v => ({ x: v.x, y: v.y })),
      sectors: level.geo.sectors.map(s => ({
        loop: s.loop.slice(), floor: s.floor || 0, ceil: s.ceil == null ? 1 : s.ceil,
        floorTex: s.floorTex || 'carpet', ceilTex: s.ceilTex || 'ceiltile', sky: !!s.sky, skyTex: s.skyTex || null, win: !!s.win, hostile: !!s.hostile,
        texScale: s.texScale || 1, wallDoor: s.wallDoor ? s.wallDoor.slice() : undefined,
        wallTex: s.wallTex ? s.wallTex.slice() : undefined,
        wallTexScale: s.wallTexScale ? s.wallTexScale.slice() : undefined,
        wallStepTex: s.wallStepTex ? s.wallStepTex.slice() : undefined,
        wallStepFloorTex: s.wallStepFloorTex ? s.wallStepFloorTex.slice() : undefined,
        wallDecal: s.wallDecal ? s.wallDecal.slice() : undefined,
        parent: s.parent == null ? -1 : s.parent, solid: !!s.solid,
      })),
    } : null;
    startBlown = !!level.blown;
    musicUndercover = level.musicUndercover || 'undercover';
    musicCoverBlown = level.musicCoverBlown || 'coverblown';
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
    TEX, SPR, FLOOR, SKY, SKIES, SKYNAMES, TX, TXNAMES, wallTex, wallTexName, WALLTX,
    ents, removeEnt, setPowered, spawnFx, FX_LIFE,
    spawn, load, defaultLevel, get isCustom() { return isCustom; }, get geoRev() { return geoRev; },
    get startBlown() { return startBlown; },
    get musicUndercover() { return musicUndercover; },
    get musicCoverBlown() { return musicCoverBlown; },
  };
})();
