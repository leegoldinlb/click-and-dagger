'use strict';

// Point-and-click layer: verbs, inventory, messages, and the puzzle chain.
const Adventure = (() => {
  const flags = {
    lockpick: false, punchcard: false, tube: false,
    tubeIn: false, radioOpen: false, deskOpen: false, exitOpen: false,
  };
  let verb = 'look';
  let selected = null;            // selected inventory item id
  const inv = [];

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
    if (e.dead && e.hp != null && !['goon', 'brute', 'sniper', 'civilianM', 'civilianF'].includes(e.kind)) {
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
      case 'civilianM': case 'civilianF': return e.dead
        ? 'A local, caught in the crossfire of somebody else’s war. This is on you.'
        : 'A Havana local, minding their own business — which, currently, is more than you can say for yourself.';
      case 'agent': return e.has
        ? 'Agent 004. He didn’t make it. His lockpick kit is still in his hand — he’d want you to have it.'
        : '004 rests easier without the hardware. You’ll drink one for him in Geneva.';
      case 'desk': return e.open
        ? 'The drawer stands open and looted. The red telephone is, disappointingly, just red.'
        : 'Volkov’s desk: walnut, a red telephone, and a locked drawer that practically screams CLASSIFIED.';
      case 'tube': return 'A vacuum tube, military grade. Warm, like a tiny glass furnace.';
      case 'plant': return 'A potted palm. Even secret lairs need a touch of Riviera.';
      case 'bar': return 'The bar cart: gin, scotch, a shaker. Volkov entertains between atrocities.';
      case 'medkit': return 'A first-aid tin. Walk over it to use it — this is still a shooter.';
      case 'ammo': return 'Nine-millimetre rounds. Walk over them. They know the drill.';
      case 'camera': return 'A subminiature spy camera. Volkov photographs his enemies before he disposes of them. Sentimental.';
      case 'safe': return 'A wall safe, dial locked. Whatever is in there is above your pay grade, and also welded shut.';
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
      case 'civilianM': case 'civilianF': return 'They are a person, not a prop. Leave them be.';
      case 'desk': return 'It’s a desk. Even you couldn’t expense that.';
      case 'medkit': case 'ammo': return 'Just walk over it. This is still a shooter.';
      case 'plant': return 'Your cover is “orchid dealer”, not “palm smuggler”.';
      case 'bar': return 'Tempting. After the mission.';
    }
    return 'You can’t take that.';
  }

  function useEnt(e) {
    if (e.kind === 'desk') {
      if (e.open) return 'The drawer has given up all its secrets.';
      if (selected === 'lockpick') {
        e.open = true;
        flags.deskOpen = true;
        flags.punchcard = true;
        Sfx.pick();
        addItem('punchcard', 'PUNCH CARD');
        return 'Thirty seconds of professional fiddling. The drawer yields a PUNCH CARD marked HARBOUR ACCESS.';
      }
      return 'Locked. You need picks, not fingernails.';
    }
    if (e.kind === 'bar') return 'You mix a quick martini. Shaken, given the circumstances. Morale restored; aim unaffected, officially.';
    if (e.kind === 'goon' && !e.dead) return 'He is not open to conversation. Try the Walther.';
    if ((e.kind === 'brute' || e.kind === 'sniper') && !e.dead) return 'He is not open to conversation. Try the Walther.';
    if (e.kind === 'agent') return 'He’s beyond extraction. Take the picks — he’d insist.';
    if (e.kind === 'tube') return 'Take it first. Then find it a socket.';
    if (e.kind === 'civilianM' || e.kind === 'civilianF') return e.dead ? 'There is nothing left to do here.' : 'They have nothing to do with your mission. Move along.';
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
      if (selected === 'lockpick') {
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
  return { flags, msg, setVerb, clickAt, nameAt, resolveAt, addItem, get selected() { return selected; } };
})();
