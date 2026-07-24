'use strict';

// Point-and-click layer: verbs, inventory, messages, and the puzzle chain.
const Adventure = (() => {
  const flags = {
    lockpick: false, punchcard: false, tube: false,
    tubeIn: false, radioOpen: false, deskOpen: false, exitOpen: false,
    knowsCombo: false, safeOpen: false, gotMoney: false, gotRose: false, roseGiven: false,
    // Secret Phrase
    gotLetter: false, decoded: false, phraseUsed: false,
    // Defuse the B
    metZ: false, gaveLetterToZ: false, bombDefused: false, bombFailed: false,
    // The Defector
    familySmuggled: false, defectorFollowing: false, defectorLost: false,
    // Learn the Truth
    met005: false, gotTruth005: false, revealed005: false,
    // The Oeuvre (Paris)
    metArtist: false, gotCityscape: false, gotHeadshot: false, portraitMade: false, gotPortrait: false,
    metMatron: false, galleryAccess: false, hasEgg: false, gotTicket: false,
    // The Double (Dealey Plaza)
    gotNixonMask: false, exchangedMask: false, metLaundry: false, laundryDone: false,
    suitReady: false, gotSuit: false, doubleSuited: false, doubleComplete: false,
    // The Patsy (Dealey Plaza)
    gotPackage: false, curtainsUsed: false, coinsReady: false, gotCoins: false,
    gotDrPepper: false, metPatsy: false, patsyComplete: false,
    // Lao & The Great Baldini (casino)
    wilsonPlayed: false,
  };
  let verb = 'look';
  let selected = null;            // selected inventory item id
  const inv = [];
  let winFn = null;                // registered by main.js — lets a puzzle payoff end the mission directly
  let loseFn = null;                // ditto, for a puzzle failure (cutting the wrong wire)
  let blowFn = null;                // ditto, for a puzzle payoff that blows cover (getting caught red-handed)
  function setWinTrigger(fn) { winFn = fn; }
  function setLoseTrigger(fn) { loseFn = fn; }
  function setBlowTrigger(fn) { blowFn = fn; }
  // The Double + The Patsy are two independent side-quests that converge on one
  // shared win — called after either completes, fires only once both are true.
  function checkDealeyWin() {
    if (flags.doubleComplete && flags.patsyComplete && winFn) winFn();
  }

  const invEl = document.getElementById('inventory');
  const invEmptyEl = document.getElementById('invempty');
  const msgEl = document.getElementById('message');
  let msgTimer = null;

  function msg(text, secs = 3.5) {
    msgEl.textContent = text;
    msgEl.classList.add('on');
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => msgEl.classList.remove('on'), secs * 1000);
  }

  // ---- inventory ----
  function renderInv() {
    invEl.querySelectorAll('.item').forEach(n => n.remove());
    invEmptyEl.style.display = inv.length ? 'none' : 'inline';
    for (const it of inv) {
      const b = document.createElement('button');
      b.className = 'item' + (selected === it.id ? ' selected' : '');
      b.textContent = it.name;
      b.onclick = () => {
        selected = selected === it.id ? null : it.id;
        if (selected) { setVerb('use'); msg('Ready to USE the ' + it.name + '. Click a target.'); }
        renderInv();
      };
      invEl.appendChild(b);
    }
  }

  function addItem(id, name) {
    inv.push({ id, name });
    renderInv();
    Sfx.pickup();
  }

  function removeItem(id) {
    const i = inv.findIndex(t => t.id === id);
    if (i >= 0) inv.splice(i, 1);
    if (selected === id) selected = null;
    renderInv();
  }

  // ---- verbs ----
  const verbBtns = document.querySelectorAll('#verbs .verb');
  function setVerb(v) {
    verb = v;
    verbBtns.forEach(b => b.classList.toggle('active', b.dataset.verb === v));
  }
  verbBtns.forEach(b => b.addEventListener('click', () => setVerb(b.dataset.verb)));

  // ---- hit-testing the 3D view ----
  function resolveAt(mx, my) {
    const col = Math.max(0, Math.min(Engine.W - 1, mx | 0));
    const rects = Engine.rects();
    for (let i = rects.length - 1; i >= 0; i--) {       // nearest sprites last
      const r = rects[i];
      if (mx >= r.x0 && mx <= r.x1 && my >= r.y0 && my <= r.y1 &&
          r.dist <= Engine.zbuf[col] + 0.05) {
        return { kind: 'ent', ent: r.ent, dist: r.dist };
      }
    }
    const ch = Engine.colHit[col];
    if (ch && my >= ch.y0 && my <= ch.y1) {
      // vector interactive walls (authored geo) carry a door/tag kind → map to the same val semantics as grid chars
      const val = (ch.wall && ch.wall.door) ? (DOORVAL[ch.wall.door] || 0) : ch.val;
      return { kind: 'wall', val, x: ch.mx, y: ch.my, dist: ch.dist, wall: ch.wall };
    }
    return null;
  }

  const WALLNAMES = { 1: 'WALL', 2: 'WALL', 3: 'BLAST DOOR', 4: 'RADIO ROOM', 5: 'MAINFRAME', 6: 'POSTER' };
  const DOORVAL = { radio: 4, blast: 3, mainframe: 5, poster: 6 };   // vector wall tag → grid-equivalent val
  // open the thing under the cursor: a vector door toggles its portal; a grid door becomes floor
  function openWall(t) { if (t.wall && t.wall.door) Engine.openDoor(t.wall); else World.set(t.x, t.y, 0); }
  function nameAt(mx, my) {
    const t = resolveAt(mx, my);
    if (!t) return null;
    if (t.kind === 'ent') return t.ent.dead ? 'EX-HENCHMAN' : t.ent.name;
    return t.dist < 6 ? WALLNAMES[t.val] : null;
  }

  // ---- interactions ----
  function lookEnt(e) {
    // generic props don't have their own dead-state line (characters below do) —
    // one shared "wrecked" fallback covers every destructible object
    if (e.dead && e.hp != null && !['goon', 'brute', 'sniper', 'blackbelt', 'soviet', 'spy', 'civilianM', 'civilianF', 'vendor', 'waiter', 'tourist', 'officer', 'fisherman', 'flowergirl', 'carlotta', 'drz', 'defector', 'agent005', 'boss005', 'matron', 'streetartist', 'laundrylady', 'double', 'patsy', 'lao', 'baldini', 'wilson'].includes(e.kind)) {
      return 'Shot to pieces. Whatever it was, it isn’t anymore.';
    }
    switch (e.kind) {
      case 'goon': return e.dead
        ? 'A retired henchman. The benefits package was misrepresented.'
        : 'A henchman in a regulation orange jumpsuit. Union rules require him to attack on sight.';
      case 'brute': return e.dead
        ? 'A very large problem, permanently solved.'
        : 'A slab of a man in a torn singlet. He does not carry a gun. He has not needed one in years.';
      case 'sniper': return e.dead
        ? 'His rifle lies where it fell. It never got the shot it wanted.'
        : 'A marksman under a wide-brim hat, rifle slung and ready. Best not to give him a clean line.';
      case 'blackbelt': return e.dead
        ? 'The belt was earned. The fight, less so.'
        : 'A martial artist in a crisp white gi, black belt cinched tight. No gun — he has never needed one.';
      case 'soviet': return e.dead
        ? 'The fur hat rolled clear. The rifle didn\'t get the chance.'
        : 'A Red Army regular in a heavy greatcoat, rifle held at the ready. Volkov imports his muscle.';
      case 'spy': return e.dead
        ? 'Sunglasses, still on. Some habits outlast the man.'
        : 'A rival operative in a black trench coat and dark glasses, sidearm drawn. Professional courtesy ends here.';
      case 'lao': return e.dead
        ? 'The house dealer, folded for good. Nobody was ever going to collect on his markers.'
        : 'I’m pretty sure he’s cheating. I need to find a way to beat him at his own game.';
      case 'baldini': return e.dead
        ? 'The Great Baldini takes his final bow.'
        : e.sad
          ? 'He stares at his empty hands, done performing for the night.'
          : 'Pick a card, any card!';
      case 'wilson': return e.dead
        ? 'The piano falls silent for good.'
        : 'Wilson works the keys without looking up, sunglasses on indoors like it’s a religious observance.';
      case 'fiona': return e.sitting
        ? 'Fiona, sitting pretty, thoroughly pleased with herself.'
        : 'Fiona. Best dog in Havana, possibly the world. She is not part of this mission.';
      case 'tv': return e.on
        ? 'The Tonight Show, still going. Johnny’s on a roll.'
        : 'An old console TV, dark screen reflecting the room back at you.';
      case 'sheetmusic': return 'Sheet music for “Anything Goes.” Wilson’s kind of song.';
      case 'civilianM': case 'civilianF': return e.dead
        ? 'A local, caught in the crossfire of somebody else’s war. This is on you.'
        : 'A Havana local, minding their own business — which, currently, is more than you can say for yourself.';
      case 'vendor': return e.dead
        ? 'The tray hit the ground before he did. This is on you.'
        : 'A street vendor, tray balanced on one arm. Whatever he’s selling, it isn’t your business today.';
      case 'waiter': return e.dead
        ? 'The tray, the drink, the bow tie — all down together. This is on you.'
        : 'A café waiter, white jacket pressed, drink held aloft with a professional’s indifference to gunfire two tables over.';
      case 'tourist': return e.dead
        ? 'Camera still around his neck. He never got the shot. This is on you.'
        : 'A tourist in a loud shirt, photographing everything except the one thing that matters. Sunglasses hide poor judgment.';
      case 'officer': return e.dead
        ? 'A police officer, down. This complicates your exit considerably, and it’s on you.'
        : 'A Cuban police officer on his beat. Best he never clocks what you’re actually doing here.';
      case 'fisherman': return e.dead
        ? 'His net never made it back to the water. This is on you.'
        : 'A dockworker with a coil of net over one shoulder, weathered by salt and long shifts.';
      case 'flowergirl': return e.dead
        ? 'The basket spilled red across the stones. This is on you.'
        : 'A flower girl with a basket of the day’s cuttings, working the crowd near the cart.';
      case 'carlotta': return e.dead
        ? 'The flower is still behind her ear. This is on you.'
        : (flags.roseGiven
          ? 'Carlotta, hair down, rose behind her ear. She smiles like she means it.'
          : 'Carlotta, hair pinned up, watching the square like she owns it. “You should let your hair down,” you try. She is not impressed.');
      case 'drz': return e.dead
        ? 'A genius, unrecognized to the last. This is on you.'
        : 'Dr. Z, wild-haired and muttering equations under his breath. Whatever he is building, it is not good news.';
      case 'defector': return e.dead
        ? 'Whatever he knew, it is gone now. This is on you.'
        : (flags.defectorFollowing
          ? 'The defector, close behind you, watch clutched tight, eyes on the exit.'
          : 'A nervous man in a good suit, glancing over his shoulder every few seconds.');
      case 'agent005': return e.dead
        ? 'A colleague, once. This is on you.'
        : 'Agent 005, easy smile, watching the square like he has nothing to hide. Maybe he does not.';
      case 'boss005': return e.dead
        ? 'The traitor, permanently retired. Justice, of a sort.'
        : '005, Sterling drawn, the easy smile finally gone.';
      case 'agent': return e.has
        ? 'Agent 004. He didn’t make it. His lockpick kit is still in his hand — he’d want you to have it.'
        : '004 rests easier without the hardware. You’ll drink one for him in Geneva.';
      case 'desk': return e.open
        ? 'The drawer stands open and looted. The red telephone is, disappointingly, just red.'
        : 'Volkov’s desk: walnut, a red telephone, and a locked drawer that practically screams CLASSIFIED.';
      case 'tube': return 'A vacuum tube, military grade. Warm, like a tiny glass furnace.';
      case 'plant': return 'A potted palm. Even secret lairs need a touch of Riviera.';
      case 'royalpalm': return 'A royal palm, smooth and tall. Cuba puts one on the coat of arms; Volkov puts one in the courtyard.';
      case 'bananaplant': return 'A banana tree, green fruit hanging low. Entirely decorative, as far as the mission is concerned.';
      case 'bougainvillea': return 'Bougainvillea, magenta and thorned. Havana grows beautiful things over ugly walls.';
      case 'fern': return 'A fern in a shaded corner, unbothered by any of this.';
      case 'cactus': return 'A potted cactus. One flower, a great many spines — a fair summary of the week.';
      case 'hedge': return 'A trimmed hedge, clipped with more care than anything else in this compound.';
      case 'bar': return 'The bar cart: gin, scotch, a shaker. Volkov entertains between atrocities.';
      case 'medkit': return 'A first-aid tin. Walk over it to use it — this is still a shooter.';
      case 'ammo': return 'Nine-millimetre rounds. Walk over them. They know the drill.';
      case 'wpn_sterling': return 'A hard case, stencilled STEN. Q Branch does not believe in subtlety.';
      case 'wpn_ar7': return 'A field rifle, broken down to fit the case. Assembles in under a minute, if your hands are steady.';
      case 'wpn_laser': return 'A gadget that hums when you get close. Whatever it does, it is not standard issue.';
      case 'wpn_golden': return 'A pistol, gold from grip to barrel, resting on velvet. Every shot counts.';
      case 'camera': return 'A subminiature spy camera. Volkov photographs his enemies before he disposes of them. Sentimental.';
      case 'safe': return flags.safeOpen
        ? 'Empty now. Dial spun back to zero, professionally.'
        : (flags.knowsCombo
          ? 'A wall safe, dial locked. You happen to know it opens on 11.22.63.'
          : 'A wall safe, dial locked. Whatever is in there is above your pay grade, and also welded shut.');
      case 'disguise': return 'Glasses, a rubber nose, a moustache, and a fedora to complete the picture. Q Branch has a sense of humour after all.';
      case 'book': {
        const first = !flags.knowsCombo;
        flags.knowsCombo = true;
        return first
          ? 'Tucked between the pages, a slip of paper: “11.22.63.” You commit it to memory.'
          : 'The book, and the slip of paper you already memorized: 11.22.63.';
      }
      case 'letter': return flags.gotLetter ? 'You already have it.' : 'A scrap of paper, coded. Meaningless, at a glance.';
      case 'telegram': return 'A telegram, stamped RUSH. Addressed, oddly, to Doctor Z.';
      case 'businesscard': return 'A card for Exports Universal. Rather ordinary, if you did not know better.';
      case 'watch': return 'A gold pocket watch, chain coiled beside it. Someone’s father’s, once.';
      case 'personnelfile': return 'A manila folder, stamped CONFIDENTIAL. Someone’s whole career, reduced to a paragraph.';
      case 'microfiche': return 'A single frame of film, far too small to read by eye.';
      case 'screwdriver': return 'A flathead screwdriver. Four screws between you and whatever this is.';
      case 'pliers': return 'A pair of pliers. For wires, presumably, and not the friendly kind.';
      case 'ciphermachine': return 'A cipher machine, three rotors and a keyboard. It wants paper, not conversation.';
      case 'bomb': return flags.bombDefused
        ? 'Dead and harmless now, wires cut, the countdown stopped for good.'
        : (e.casingOpen
          ? 'The casing is off. A tangle of red and blue wire, and a countdown that does not care about your feelings.'
          : 'A bomb, casing sealed, counting down. You will need tools before you need nerve.');
      case 'microfichemachine': return e.showingArticle
        ? 'The screen shows a newspaper clipping — the assassination of the Ambassador to Hong Kong, a few years back.'
        : 'A microfiche viewer, screen dark, waiting for film.';
      case 'sportscar': return 'A sports car, parked and gleaming. Someone’s exit strategy, if you can get the keys.';
      case 'filecab': return 'Three drawers of surveillance files, alphabetized by paranoia.';
      case 'globe': return 'A desk globe. Someone has circled Havana in red grease pencil.';
      case 'briefcase': return 'A leather attaché case. Standard issue for men who deny working for anyone.';
      case 'radio': return 'A shortwave set, dialed to a number station. It hums a tune only Moscow understands.';
      case 'typewriter': return 'A field typewriter, ribbon still wet. Someone was drafting a confession, or a resignation.';
      case 'cigarcrate': return 'Habanos, stencilled and half-smoked into an alibi.';
      case 'deskfan': return 'A desk fan, oscillating dutifully in the heat. It has seen things.';
      case 'streetlamp': return 'A cast-iron lamp post. Havana at night looks better than it behaves.';
      case 'umbrella': return 'A furled umbrella with an unusually sharp tip. Best not handled carelessly.';
      case 'wallclock': return 'Stopped at a quarter to something. Nobody has fixed it. Nobody wants to know why.';
      case 'sedan': return 'A black sedan, engine still warm. Someone left in a hurry, or is about to.';
      case 'motorcycle': return 'A motorcycle and sidecar. Wherever this was going, it was going there fast.';
      case 'phonebooth': return 'A red telephone booth. The classic dead drop — everyone photographs them, nobody suspects them.';
      case 'parkbench': return 'A park bench with a clear sightline to three exits. Not a coincidence.';
      case 'newsstand': return 'Today’s papers, and one that isn’t a paper at all if you know which fold to check.';
      case 'oildrum': return 'A rusted oil drum. Marked hazardous, which is either true or an excellent deterrent.';
      case 'cratestack': return 'Crates stencilled FRAGILE. Nothing fragile has ever shipped in one, historically.';
      case 'guardpost': return 'A sentry post behind sandbags. Fortunately, nobody is home.';
      case 'firehydrant': return 'A fire hydrant, chipped enamel, entirely uninvolved in your mission.';
      case 'satdish': return 'A listening dish, aimed at a satellite that does not officially exist.';
      case 'mailbox': return 'A blue collection box. Somewhere, a postal worker has no idea what they’re about to find in it.';
      case 'trashcan': return 'A dented street can. Havana’s best-kept secrets end up in here, eventually.';
      case 'bicycle': return 'Somebody’s ride home. They’ll be walking tonight.';
      case 'trafficlight': return 'Stuck on green. Traffic in Havana takes this as a suggestion regardless.';
      case 'watertower': return 'A water tower, up where the rooflines meet. Good sightlines, if you were the sort to use them.';
      case 'barrier': return 'A striped sawhorse. ROAD CLOSED, or so the story goes.';
      case 'vendingmachine': {
        if (flags.gotMoney) return 'Cigarettes, by the pack. Volkov’s men are chain smokers, to a man.';
        flags.gotMoney = true;
        e.taken = true;
        addItem('money', 'LOOSE CHANGE');
        return 'Cigarettes, by the pack. On a hunch, you check the coin return — someone left MONEY behind.';
      }
      case 'flowercart': return 'A flower cart, unattended. The vendor stepped away at a very convenient moment.';
      case 'bed': return 'Made up tight enough to bounce a coin off. Someone here was in the service.';
      case 'sofa': return 'A sofa that has absorbed a great many uncomfortable silences.';
      case 'armchair': return 'The good chair. The one nobody visiting is allowed to sit in.';
      case 'diningtable': return 'Set for one. Whoever lives here doesn’t entertain much these days.';
      case 'bookshelf': return 'Novels, mostly. A few of the spines have never been cracked — for show, not for reading.';
      case 'icebox': return 'Hums louder than it should. Probably just the compressor. Probably.';
      case 'recordplayer': return 'A hi-fi console, lid up, needle resting mid-groove. Someone left in a hurry.';
      case 'wardrobe': return 'A tall wardrobe. Just clothes in here — you checked.';
      case 'officechair': return 'A swivel chair, still warm. Whoever sat here left in a hurry.';
      case 'watercooler': return 'A water cooler, half full. The gossip that happens near it has gotten men killed.';
      case 'coatrack': return 'A coat and hat, hung and forgotten. Nobody leaves without their hat in this weather.';
      case 'corkboard': return 'Pinned notices and a length of red string. Somebody here is building the same picture you are.';
      case 'cashregister': return 'A brass till, drawer shut. The till tape would tell a story, if you had time to read it.';
      case 'wallmap': return 'A map on an easel, a route inked in red. It ends at the harbour.';
      case 'conftable': return 'A long table, chairs pushed in neat. Whatever was decided here, it was decided quietly.';
      case 'punchclock': return 'A time clock, a card half-fed into the slot. Someone clocked out and never came back.';
      case 'matron': return e.dead
        ? 'A voice that once filled the Palais Garnier, silenced. This is on you.'
        : (flags.galleryAccess
          ? 'The Matron, presiding over her gallery with the same command she once gave an audience of two thousand.'
          : 'The Matron, furs and pearls and the bearing of a woman who has been applauded by kings. She has not looked at you twice.');
      case 'streetartist': return e.dead
        ? 'His palette lies face-down in the gutter, colors bleeding together. This is on you.'
        : 'A street artist under a striped awning, beret cocked, charcoal-stained fingers working fast for tourist francs.';
      case 'easel': return flags.portraitMade
        ? (flags.gotPortrait ? 'The easel, canvas bare again — you already took the portrait.' : 'A finished portrait on the easel, uncannily accurate. Worth taking.')
        : 'An artist\'s tripod easel, blank canvas waiting for a subject.';
      case 'headshot': return 'An old publicity photograph — the Matron in her opera days, luminous, every inch the star. An artist could work from this.';
      case 'metroticket': return 'A single Métro ticket. One ride, one way.';
      case 'fabergeegg': return flags.hasEgg
        ? 'The case stands empty. You already have what you came for.'
        : 'A Romanov Fabergé egg, gold and jeweled, behind glass. The Matron\'s prize possession, and yours, if she ever lets you close enough.';
      case 'metroentrance': return 'The Métro entrance, ironwork lilies and a lettered plaque. Down those stairs, and you are gone.';
      case 'laundrylady': return e.dead
        ? 'The steam still rises off the press. This is on you.'
        : 'A laundry counter attendant, half-buried in tickets and pressed shirts.';
      case 'double': return e.dead
        ? 'Whatever he was standing in for, it is over now. This is on you.'
        : (flags.doubleComplete
          ? 'The double, suited and masked, standing exactly where he was told to stand.'
          : (flags.doubleSuited ? 'The double, suited up, waiting on the mask.' : 'A man built along the right lines, in the wrong clothes, waiting for instructions.'));
      case 'patsy': return e.dead
        ? 'Whatever he knew — or didn\'t — is gone now. This is on you.'
        : (flags.patsyComplete
          ? 'The patsy, calmer now, nursing a Dr Pepper like it is the only stable thing in his day.'
          : 'A nervous man, watching the door more than the street. Somebody needs him to stay exactly here.');
      case 'nixonmask': return 'A rubber Nixon mask, jowls and all. “There\'s a receipt inside.”';
      case 'maskstand': return 'A costume shop\'s novelty rack — masks of every president who ever needed forgiving.';
      case 'laundryticket': return 'A claim ticket, numbered. Somebody\'s dry cleaning, or somebody\'s alibi.';
      case 'package': return 'A brown-paper package, tied with string. Long enough for curtain rods, if anyone asks.';
      case 'curtainrods': return flags.coinsReady
        ? (flags.gotCoins ? 'Just curtain rods now. Whatever was in there, you already took it.' : 'The rods rattle when you shift them. Something is in there that isn\'t hardware.')
        : 'Curtain rods, wrapped for delivery. Above suspicion, if a little heavy for the job.';
      case 'suitrack': return flags.suitReady
        ? (flags.gotSuit ? 'One empty hanger, swinging slightly. You already took the suit.' : 'Row three: a suit, pressed sharp enough to cut.')
        : 'Rows of pressed suits, none of them claimed. Yet.';
    }
    return 'It defies description. The dossier said nothing about this.';
  }

  function takeEnt(e) {
    switch (e.kind) {
      case 'agent':
        if (e.has) {
          e.has = false;
          flags.lockpick = true;
          addItem('lockpick', 'LOCKPICK KIT');
          return 'You take the lockpick kit. 004 would approve — he never met a lock he liked.';
        }
        return 'You have everything he can give, except his tailor’s number.';
      case 'tube':
        World.removeEnt(e);
        flags.tube = true;
        addItem('tube', 'VACUUM TUBE');
        return 'You pocket the vacuum tube, gently. It is the only one for miles.';
      case 'goon': return e.dead
        ? 'His pockets: lint, sunflower seeds, a photo of Volkov signed “V”. Nothing useful.'
        : 'Absolutely not. He bites.';
      case 'brute': return e.dead ? 'Nothing on him but a busted knuckle brace. He fought with what he had.' : 'You would need a crane.';
      case 'sniper': return e.dead ? 'A rifle, a canteen, a half-written letter home. You leave the letter.' : 'He is not putting that rifle down for you.';
      case 'civilianM': case 'civilianF': case 'vendor': case 'waiter': case 'tourist': case 'officer': case 'fisherman': case 'flowergirl': case 'carlotta':
      case 'drz': case 'defector': case 'agent005': case 'boss005': case 'matron': case 'streetartist':
      case 'laundrylady': case 'double': case 'patsy':
        return 'They are a person, not a prop. Leave them be.';
      case 'desk': return 'It’s a desk. Even you couldn’t expense that.';
      case 'safe': return 'Bolted to the wall. You are a spy, not a mover.';
      case 'book': return flags.knowsCombo
        ? 'You have what you need from it. No sense hauling a library.'
        : 'Just an old book. Might be worth a closer look before you leave it.';
      case 'medkit': case 'ammo': case 'wpn_sterling': case 'wpn_ar7': case 'wpn_laser': case 'wpn_golden': case 'disguise':
        return 'Just walk over it. This is still a shooter.';
      case 'plant': case 'royalpalm': case 'bananaplant': case 'bougainvillea': case 'fern': case 'cactus': case 'hedge':
        return 'Your cover is “orchid dealer”, not “palm smuggler”.';
      case 'bar': return 'Tempting. After the mission.';
      case 'letter':
        if (flags.gotLetter) return 'You already have it.';
        flags.gotLetter = true;
        World.removeEnt(e);
        addItem('letter', 'CODED LETTER');
        return 'You pocket the coded letter. Meaningless — until something can read it.';
      case 'telegram':
        if (inv.some(i => i.id === 'telegram')) return 'You already have it.';
        World.removeEnt(e);
        addItem('telegram', 'TELEGRAM');
        return 'A telegram: “RUSH — to Doctor Z.” Someone was in a hurry to reach him.';
      case 'businesscard':
        if (inv.some(i => i.id === 'businesscard')) return 'You already have it.';
        World.removeEnt(e);
        addItem('businesscard', 'BUSINESS CARD');
        return 'There’s a phone number on it.';
      case 'watch':
        if (inv.some(i => i.id === 'watch')) return 'You already have it.';
        World.removeEnt(e);
        addItem('watch', 'POCKET WATCH');
        return 'You take the watch. It is warm, somehow, like it was just checked.';
      case 'personnelfile':
        if (inv.some(i => i.id === 'file')) return 'You already have it.';
        World.removeEnt(e);
        addItem('file', 'PERSONNEL FILE');
        return 'It says 005 was stationed in Hong Kong for five years.';
      case 'microfiche':
        if (inv.some(i => i.id === 'microfiche')) return 'You already have it.';
        World.removeEnt(e);
        addItem('microfiche', 'MICROFICHE');
        return 'You take the microfiche. It needs a machine, not eyes.';
      case 'screwdriver':
        if (inv.some(i => i.id === 'screwdriver')) return 'You already have it.';
        World.removeEnt(e);
        addItem('screwdriver', 'SCREWDRIVER');
        return 'A screwdriver. Simple, and exactly what this looks like it needs.';
      case 'pliers':
        if (inv.some(i => i.id === 'pliers')) return 'You already have it.';
        World.removeEnt(e);
        addItem('pliers', 'PLIERS');
        return 'A pair of pliers, well used.';
      case 'ciphermachine': case 'bomb': case 'microfichemachine': case 'sportscar':
        return 'That is bolted down, and staying that way.';
      case 'sheetmusic':
        if (inv.some(i => i.id === 'sheetmusic')) return 'You already have it.';
        World.removeEnt(e);
        addItem('sheetmusic', 'SHEET MUSIC');
        return 'Sheet music for "Anything Goes." Wilson might appreciate a request.';
      case 'headshot':
        if (inv.some(i => i.id === 'headshot')) return 'You already have it.';
        World.removeEnt(e);
        addItem('headshot', "MATRON'S HEADSHOT");
        return "You pocket the old publicity photo. An artist could paint quite a flattering portrait from this.";
      case 'metroticket':
        if (inv.some(i => i.id === 'ticket')) return 'You already have it.';
        World.removeEnt(e);
        addItem('ticket', 'METRO TICKET');
        return 'A single Métro ticket. One ride, and you had better make it count.';
      case 'easel':
        if (!flags.portraitMade) return 'Just a blank canvas. Nothing to take yet.';
        if (flags.gotPortrait) return 'You already have the portrait.';
        flags.gotPortrait = true;
        addItem('portrait', 'PORTRAIT');
        return 'You take the portrait, still smelling faintly of turpentine. Uncanny, really.';
      case 'fabergeegg':
        if (flags.hasEgg) return 'You already have it.';
        if (!flags.galleryAccess) return 'Behind glass, and the Matron has not so much as glanced your way. Not yet.';
        World.removeEnt(e);
        flags.hasEgg = true;
        addItem('egg', 'FABERGÉ EGG');
        if (blowFn) blowFn();
        return '“Thief!” The Matron’s voice — the one that once filled an opera house — carries across the entire block. Cover’s blown.';
      case 'nixonmask':
        if (inv.some(i => i.id === 'nixonmask')) return 'You already have it.';
        World.removeEnt(e);
        flags.gotNixonMask = true;
        addItem('nixonmask', 'NIXON MASK');
        return '“There\'s a receipt inside.” Someone bought this in a hurry and never checked the bag.';
      case 'laundryticket':
        if (inv.some(i => i.id === 'laundryticket')) return 'You already have it.';
        World.removeEnt(e);
        addItem('laundryticket', 'LAUNDRY TICKET');
        return 'A numbered claim ticket. Somebody\'s coming back for this.';
      case 'package':
        if (inv.some(i => i.id === 'package')) return 'You already have it.';
        World.removeEnt(e);
        addItem('package', 'WRAPPED PACKAGE');
        return 'A brown-paper package, tied with string. Long enough for curtain rods, if anyone asks.';
      case 'maskstand':
        return 'Bolted to the counter. The masks aren\'t, though.';
      case 'suitrack':
        if (!flags.suitReady) return 'Rows of pressed suits, none of them claimed. Yet.';
        if (flags.gotSuit) return 'You already have the suit.';
        flags.gotSuit = true;
        addItem('suit', 'PRESSED SUIT');
        return 'Row three, just like she said. A suit, pressed sharp enough to cut.';
      case 'curtainrods':
        if (!flags.coinsReady) return 'Just curtain rods, wrapped for delivery. Above suspicion, if a little heavy.';
        if (flags.gotCoins) return 'Nothing left in there.';
        flags.gotCoins = true;
        addItem('coins', 'LOOSE COINS');
        return 'You fish a handful of coins out from among the rods. Somebody\'s exact change for something.';
    }
    return 'You can’t take that.';
  }

  function useEnt(e) {
    if (e.kind === 'desk') {
      if (e.open) return 'The drawer has given up all its secrets.';
      if (selected === 'lockpick' || selected === 'hairpin') {
        e.open = true;
        flags.deskOpen = true;
        flags.punchcard = true;
        Sfx.pick();
        addItem('punchcard', 'PUNCH CARD');
        return 'Thirty seconds of professional fiddling. The drawer yields a PUNCH CARD marked HARBOUR ACCESS.';
      }
      return 'Locked. You need picks, not fingernails.';
    }
    if (e.kind === 'safe') {
      if (flags.safeOpen) return 'Already emptied, dial spun back to zero.';
      if (!flags.knowsCombo) { Sfx.denied(); return 'Dial-locked. You would need the combination.'; }
      flags.safeOpen = true;
      e.open = true;
      addItem('lettersoftransit', 'LETTERS OF TRANSIT');
      Sfx.pick();
      return 'You dial 11.22.63. The tumblers fall into place. Inside: a thick envelope, LETTERS OF TRANSIT, signed and stamped.';
    }
    if (e.kind === 'bar') return 'You mix a quick martini. Shaken, given the circumstances. Morale restored; aim unaffected, officially.';
    if (e.kind === 'tvconsole') {
      e.on = !e.on;
      Sfx.pick();
      return e.on ? 'The picture snaps to life — a rerun flickering through the static.' : 'The picture dies. Better reception elsewhere, probably.';
    }
    if (['goon', 'brute', 'sniper', 'blackbelt', 'soviet', 'spy'].includes(e.kind) && !e.dead) {
      if (selected === 'lettersoftransit' || selected === 'phrase') {
        const geo = World.getGeo();
        let count = 0;
        for (const s of geo.sectors) { if (s.hostile) { s.hostile = false; count++; } }
        const usingPhrase = selected === 'phrase';
        removeItem(usingPhrase ? 'phrase' : 'lettersoftransit');
        if (usingPhrase) flags.phraseUsed = true;
        Sfx.pick();
        if (!count) return usingPhrase ? 'He studies you, unimpressed. There is nothing here for the phrase to open.' : 'He studies the letters, unimpressed. There is nothing here for them to open.';
        return usingPhrase
          ? '“Greenwich Mean?” you ask. He blinks, then answers on reflex: “Never in summer.” Whatever that phrase means to Volkov’s men, it means you belong here now.'
          : 'You slide the envelope across. He studies the seal, nods once, and waves you through — every checkpoint in the compound, forever.';
      }
      return 'He is not open to conversation. Try the Walther.';
    }
    if (e.kind === 'agent') return 'He’s beyond extraction. Take the picks — he’d insist.';
    if (e.kind === 'tube') return 'Take it first. Then find it a socket.';
    if (e.kind === 'flowergirl') {
      if (e.dead) return 'There is nothing left to do here.';
      if (selected === 'money') {
        if (flags.gotRose) return 'Her basket is a little lighter. She already gave you her prettiest one.';
        flags.gotRose = true;
        removeItem('money');
        addItem('rose', 'ROSE');
        Sfx.pickup();
        return 'She takes the coins with a smile and tucks a single rose into your hand.';
      }
      return 'She has nothing to do with your mission. Unless you are buying, of course.';
    }
    if (e.kind === 'carlotta') {
      if (e.dead) return 'There is nothing left to do here.';
      if (selected === 'rose') {
        if (flags.roseGiven) return 'She is already wearing it, tucked behind one ear.';
        flags.roseGiven = true;
        removeItem('rose');
        addItem('hairpin', 'HAIRPIN');
        Sfx.pickup();
        return 'She lets her hair down — somehow even more dangerous than up. “Thank you,” she says, “for opening my heart.” She presses her hairpin into your hand, so you will never forget her.';
      }
      return 'She is clearly waiting for something more romantic than that.';
    }
    if (e.kind === 'ciphermachine') {
      if (selected === 'letter') {
        if (flags.decoded) return 'The machine sits idle. You already have what it gave you.';
        flags.decoded = true;
        removeItem('letter');
        addItem('phrase', 'THE PHRASE');
        Sfx.pick();
        return '“Greenwich Mean?” the machine clatters out. Then, a beat later: “Never in summer.” A challenge, and its answer.';
      }
      return 'A cipher machine, rotors set to nothing in particular. It wants paper, not fingers.';
    }
    if (e.kind === 'drz') {
      if (e.dead) return 'There is nothing left to do here.';
      if (selected === 'telegram' && !flags.gaveLetterToZ) {
        flags.gaveLetterToZ = true;
        removeItem('telegram');
        Sfx.pickup();
        return '“I’m being awarded the Nobel Prize? The world must be saved! Find the B and cut the blue wire!”';
      }
      if (!flags.metZ) {
        flags.metZ = true;
        return '“The world refuses to recognize my genius. Mankind must be punished!”';
      }
      if (flags.gaveLetterToZ) return '“Hurry! Find the B — cut the blue wire!”';
      return '“Genius, wasted on the small-minded,” he mutters, checking a pocket watch of his own.';
    }
    if (e.kind === 'bomb') {
      if (flags.bombDefused) return 'Dead and harmless now.';
      if (selected === 'screwdriver') {
        if (e.casingOpen) return 'Already open. No need to repeat yourself.';
        e.casingOpen = true;
        Sfx.pick();
        return 'Four screws, patience over speed. The casing comes away, revealing a tangle of red and blue wire.';
      }
      if (selected === 'pliers') {
        if (!e.casingOpen) { Sfx.denied(); return 'Sealed shut. Get the casing off first — you will need a screwdriver.'; }
        if (flags.gaveLetterToZ) {
          flags.bombDefused = true;
          e.cut = 'blue';
          Sfx.power();
          if (winFn) winFn();
          return 'You cut the blue wire. The world is saved!';
        }
        flags.bombFailed = true;
        e.cut = 'red';
        Sfx.denied();
        if (loseFn) loseFn();
        return 'You cut the red wire.';
      }
      return e.casingOpen ? 'Wires, red and blue. You will want the pliers, and a steady hand.' : 'Sealed shut. You would need a screwdriver.';
    }
    if (e.kind === 'defector') {
      if (e.dead) return 'There is nothing left to do here.';
      if (flags.defectorFollowing) return 'He stays close, watch in hand, waiting for you to move.';
      if (selected === 'watch' && flags.familySmuggled) {
        flags.defectorFollowing = true;
        removeItem('watch');
        Sfx.pickup();
        return 'He clutches the watch, eyes wet. “Now — we must leave at once!” He falls in behind you.';
      }
      if (!flags.familySmuggled) return '“I’m not leaving without my family.”';
      return '“Thank heavens, we must leave at once! But I can’t leave without my father’s watch.”';
    }
    if (e.kind === 'phonebooth') {
      if (selected === 'businesscard' && !flags.familySmuggled) {
        flags.familySmuggled = true;
        removeItem('businesscard');
        Sfx.pick();
        return 'You dial the number. A clipped voice on the other end: “Tell the defector his family has been smuggled out.”';
      }
      return flags.familySmuggled ? 'The line is dead now. The call already did its work.' : 'A red phone booth. The receiver is heavier than it looks.';
    }
    if (e.kind === 'microfichemachine') {
      if (selected === 'microfiche') {
        if (e.showingArticle) return 'Already loaded. The article is right there on the screen.';
        e.showingArticle = true;
        removeItem('microfiche');
        Sfx.pick();
        return 'The reel clicks into place. An old newspaper clipping resolves into focus: the assassination of the Ambassador to Hong Kong, a few years back.';
      }
      if (selected === 'file') {
        if (!e.showingArticle) { Sfx.denied(); return 'Nothing to compare it to. Load the microfiche first.'; }
        if (flags.gotTruth005) return 'You already put it together.';
        flags.gotTruth005 = true;
        addItem('truth', 'THE TRUTH');
        Sfx.power();
        return '005 was stationed in Hong Kong when the assassination occurred. He’s the traitor!';
      }
      return e.showingArticle ? 'The article sits on the screen, waiting for something to compare it to.' : 'A microfiche viewer. Whirring, patient, waiting for film.';
    }
    if (e.kind === 'agent005') {
      if (e.dead) return 'There is nothing left to do here.';
      if (selected === 'truth') {
        flags.revealed005 = true;
        removeItem('truth');
        e.kind = 'boss005';
        e.aggro = true;
        Sfx.growl();
        return 'You lay the evidence on the table. 005’s easy smile finally slips. “Clever,” he says, reaching for a Sterling of his own.';
      }
      if (!flags.met005) {
        flags.met005 = true;
        return '“There’s a traitor in our midst. You must find him.”';
      }
      return 'He watches the square, saying nothing further.';
    }
    if (e.kind === 'boss005' && !e.dead) return 'He is well past conversation. Try the Walther.';
    if (e.kind === 'sportscar') {
      if (selected === 'keys') {
        removeItem('keys');
        e.open = true;
        if (winFn) winFn();
        return 'The door swings up. The engine roars to life. You are three blocks away before anyone even reaches the square.';
      }
      return 'Locked. You would need keys.';
    }
    if (e.kind === 'streetartist') {
      if (e.dead) return 'There is nothing left to do here.';
      if (selected === 'headshot' && !flags.portraitMade) {
        flags.portraitMade = true;
        flags.gotPortrait = true;
        removeItem('headshot');
        addItem('portrait', 'PORTRAIT');
        Sfx.pick();
        return '“Now THIS is a face worth painting.” He works fast, charcoal then color, and hands you a portrait of the Matron — uncannily flattering.';
      }
      if (!flags.metArtist) {
        flags.metArtist = true;
        return '“Portrait? Painting? Name your poison, mon ami.”';
      }
      if (!flags.gotCityscape) {
        flags.gotCityscape = true;
        addItem('cityscape', 'CITYSCAPE PAINTING');
        Sfx.pick();
        return '“Ten francs for a view of the Seine.” He rolls a canvas and hands it over. “Sold.”';
      }
      return '“Something else, or are you just admiring the view?”';
    }
    if (e.kind === 'matron') {
      if (e.dead) return 'There is nothing left to do here.';
      if (selected === 'portrait') {
        if (flags.galleryAccess) return '“Yes, yes, you\'re already welcome here.”';
        flags.galleryAccess = true;
        removeItem('portrait');
        e.behavior = 'wander';                      // she steps away from the doorway, gallery now open to you
        Sfx.power();
        return '“What a talent — he\'s captured me exactly.” She steps aside, beaming. “Welcome to my gallery.”';
      }
      if (selected === 'cityscape') return '“Talentless hack!” She waves the painting away without a second glance.';
      if (!flags.metMatron) {
        flags.metMatron = true;
        return '“This is a gallery, not a tourist trap. Come back with something worth my time.”';
      }
      return flags.galleryAccess
        ? '“Enjoy the collection. Touch nothing you haven\'t earned.”'
        : '“I have nothing further to say to you.”';
    }
    if (e.kind === 'metroentrance') {
      if (selected === 'ticket') {
        if (!flags.hasEgg) return '“I\'m not leaving without accomplishing my mission.”';
        removeItem('ticket');
        Sfx.power();
        if (winFn) winFn();
        return 'You slip through the turnstile and vanish into the Métro, the egg tucked safe against your ribs. Paris keeps its secrets; so, now, do you.';
      }
      return 'The turnstile wants a ticket, not a conversation.';
    }
    if (e.kind === 'maskstand') {
      if (selected === 'nixonmask') {
        if (flags.exchangedMask) return '“One trade a day,” the shopkeep says. “House rules.”';
        flags.exchangedMask = true;
        removeItem('nixonmask');
        addItem('jfkmask', 'JFK MASK');
        Sfx.pick();
        return '“Even trade,” the shopkeep says, not looking up. “Everybody wants to be somebody else today.”';
      }
      return 'A costume shop\'s novelty rack — masks of every president who ever needed forgiving.';
    }
    if (e.kind === 'laundrylady') {
      if (e.dead) return 'There is nothing left to do here.';
      if (selected === 'laundryticket') {
        if (flags.laundryDone) return '“You already got your suit, hon.”';
        flags.laundryDone = true;
        flags.suitReady = true;
        flags.gotSuit = true;
        removeItem('laundryticket');
        addItem('suit', 'PRESSED SUIT');
        Sfx.pick();
        return 'She checks the number, disappears into the back, and comes out with a suit on a hanger. “Row three,” she says, already turning away.';
      }
      if (!flags.metLaundry) {
        flags.metLaundry = true;
        return '“Ticket or nothing, I\'ve got a line.”';
      }
      return '“Ticket or nothing.”';
    }
    if (e.kind === 'double') {
      if (e.dead) return 'There is nothing left to do here.';
      if (selected === 'suit') {
        if (flags.doubleSuited) return 'He is already wearing the suit.';
        flags.doubleSuited = true;
        e.suited = true;
        removeItem('suit');
        Sfx.pick();
        return 'He steps behind the curtain and comes back suited. “How do I look?” Close enough, in the right light.';
      }
      if (selected === 'jfkmask') {
        if (!flags.doubleSuited) return '“The suit first,” he says. “I\'m not doing this half dressed.”';
        if (flags.doubleComplete) return 'He is already in position, mask and all.';
        flags.doubleComplete = true;
        removeItem('jfkmask');
        e.disguised = true;
        Sfx.power();
        checkDealeyWin();
        return 'He settles the mask into place. From ten feet, in bad light, he could fool a crowd. That is the idea.';
      }
      return flags.doubleComplete ? 'He holds his position, mask and all, saying nothing.' : 'He is waiting on instructions, and clothes.';
    }
    if (e.kind === 'patsy') {
      if (e.dead) return 'There is nothing left to do here.';
      if (selected === 'drpepper') {
        if (flags.patsyComplete) return 'He is still nursing the Dr Pepper, calmer than he has any right to be.';
        flags.patsyComplete = true;
        removeItem('drpepper');
        Sfx.pick();
        checkDealeyWin();
        return '“...Dr Pepper?” His shoulders drop half an inch — the first calm he has shown all day. “Yeah. Yeah, okay. I can wait here.”';
      }
      if (!flags.metPatsy) {
        flags.metPatsy = true;
        return '“I didn\'t do anything,” he says, before you\'ve said a word.';
      }
      return '“I just need somewhere to wait,” he says. Again.';
    }
    if (e.kind === 'curtainrods') {
      if (selected === 'package') {
        if (flags.curtainsUsed) return 'One package is plenty. Any more and someone will notice.';
        flags.curtainsUsed = true;
        flags.coinsReady = true;
        removeItem('package');
        Sfx.pick();
        return 'You tuck the package in among the rods. Something inside rattles — and it isn\'t curtain hardware.';
      }
      return flags.coinsReady
        ? 'The rods rattle when you shift them.'
        : 'Curtain rods, wrapped for delivery. Above suspicion, if a little heavy for the job.';
    }
    if (e.kind === 'vendingmachine') {
      if (selected === 'coins') {
        if (flags.gotDrPepper) return 'Empty-handed this time. You already got what you needed.';
        flags.gotDrPepper = true;
        removeItem('coins');
        addItem('drpepper', 'DR PEPPER');
        Sfx.pick();
        return 'Coins in, a satisfying clunk, and a cold Dr Pepper rolls out.';
      }
      return 'A vending machine, coin slot waiting.';
    }
    if (e.kind === 'tv') {
      if (e.on) return 'The Tonight Show plays on. You already got what you came for.';
      e.on = true;
      addItem('magicianjoke', 'MAGICIAN JOKE');
      Sfx.power();
      return 'The picture snaps on. “What’s the one thing a bald magician can’t pull out of his hat? A hare.” You write it down — someone’s getting this joke whether he likes it or not.';
    }
    if (e.kind === 'baldini') {
      if (e.dead) return 'There is nothing left to do here.';
      if (selected === 'magicianjoke') {
        if (e.sad) return 'He’s heard enough jokes for one lifetime.';
        e.sad = true;
        removeItem('magicianjoke');
        addItem('trickdeck', 'TRICK DECK');
        Sfx.pick();
        return '“What’s the point, I’m a joke. Take my cards, all my cards…” He slides a marked deck across the table, defeated.';
      }
      return e.sad ? 'He stares at his empty hands, done performing for the night.' : 'Pick a card, any card!';
    }
    if (e.kind === 'lao') {
      if (e.dead) return 'There is nothing left to do here.';
      if (selected === 'trickdeck') {
        if (e.mood !== 'distracted') {
          Sfx.denied();
          return '“No dirty tricks!” Lao doesn’t even look up from his own cards.';
        }
        e.mood = 'lost';
        removeItem('trickdeck');
        addItem('milliondollars', '1 MILLION DOLLARS');
        Sfx.power();
        return '“How could I lose? I never lose!” He shoves a stack across the table — a million dollars, give or take.';
      }
      return 'I’m pretty sure he’s cheating. I need to find a way to beat him at his own game.';
    }
    if (e.kind === 'wilson') {
      if (e.dead) return 'There is nothing left to do here.';
      if (selected === 'sheetmusic') {
        if (flags.wilsonPlayed) return 'He’s already playing your request.';
        flags.wilsonPlayed = true;
        removeItem('sheetmusic');
        const laoEnt = World.ents.find(x => x.kind === 'lao' && !x.dead);
        if (laoEnt) laoEnt.mood = 'distracted';
        Sfx.pick();
        return 'Wilson slides the sheet music onto the piano and launches into “Anything Goes.” Lao looks distracted. Time to make your move.';
      }
      return 'Wilson works the keys without looking up.';
    }
    if (e.kind === 'fiona') {
      Sfx.bark();
      if (e.sitting) return 'Fiona barks once, then goes back to looking pleased with herself.';
      e.sitting = true;
      addItem('love', 'LOVE');
      return 'Fiona sits, barks once, and looks up at you like you invented dogs. You feel a little better about all this.';
    }
    if (['civilianM', 'civilianF', 'vendor', 'waiter', 'tourist', 'officer', 'fisherman'].includes(e.kind))
      return e.dead ? 'There is nothing left to do here.' : 'They have nothing to do with your mission. Move along.';
    return 'That doesn’t work. And the clock is running.';
  }

  function lookWall(t) {
    switch (t.val) {
      case 3: return flags.tubeIn
        ? 'The harbour gate. The card reader glows, ready and waiting.'
        : 'The harbour gate. Its card reader is dead — the mainframe has no power.';
      case 4: return 'The radio room. Locked tight — a professional lock, begging for a professional pick.';
      case 5: return flags.tubeIn
        ? 'The mainframe whirs contentedly, reels spinning. Volkov’s electricity bill is your parting gift.'
        : 'Volkov’s mainframe. One vacuum tube socket sits conspicuously empty — sabotage. 004’s handiwork.';
      case 6: return 'A Monte Carlo travel poster. In red pen, 004’s handwriting: “picks open all.”';
    }
    return 'Reinforced lair wall. Volkov spared no expense.';
  }

  function useWall(t) {
    if (t.val === 4) {                                     // radio room
      if (selected === 'lockpick' || selected === 'hairpin') {
        openWall(t);
        flags.radioOpen = true;
        Sfx.pick(); Sfx.door();
        return 'The lock surrenders in eleven seconds. A personal best.';
      }
      Sfx.denied();
      return 'Locked, and the hinges are on the inside. This needs picks.';
    }
    if (t.val === 5) {                                     // mainframe
      if (flags.tubeIn) return 'It hums along nicely, doing its one job beautifully.';
      if (selected === 'tube') {
        flags.tubeIn = true;
        removeItem('tube');
        World.setPowered();
        Sfx.power();
        return 'You seat the tube. The reels spin up — somewhere, a card reader warms.';
      }
      Sfx.denied();
      return 'Rows of sockets and switches. Without the missing tube, it is furniture.';
    }
    if (t.val === 3) {                                     // blast door
      if (selected === 'punchcard') {
        if (!flags.tubeIn) { Sfx.denied(); return 'You feed it the card. Nothing — the reader is dead. Power first.'; }
        flags.exitOpen = true;
        openWall(t);
        removeItem('punchcard');
        Sfx.door();
        return 'The reader swallows the card, thinks, and the harbour gate rumbles aside. Salt air and diesel.';
      }
      Sfx.denied();
      return flags.tubeIn
        ? 'The reader blinks at you. It wants a punch card.'
        : 'It wants a punch card, and its reader wants power.';
    }
    if (t.val === 6) return 'You absorb 004’s advice. The picks open everything.';
    return 'You push the wall. Volkov built to last.';
  }

  function clickAt(mx, my) {
    const t = resolveAt(mx, my);
    if (!t) { msg('Nothing there but carpet and consequence.'); return; }
    if (t.dist > 3.2) { msg('Too far. Saunter closer.'); return; }
    let out;
    if (t.kind === 'ent') {
      out = verb === 'look' ? lookEnt(t.ent) : verb === 'take' ? takeEnt(t.ent) : useEnt(t.ent);
    } else {
      out = verb === 'look' ? lookWall(t)
          : verb === 'take' ? 'That is structural. Leave it for the demolition charges.'
          : useWall(t);
    }
    msg(out, 4.5);
  }

  renderInv();
  return { flags, msg, setVerb, clickAt, nameAt, resolveAt, addItem, setWinTrigger, setLoseTrigger, setBlowTrigger, get selected() { return selected; } };
})();
