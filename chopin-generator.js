// Seeded "Chopin-style" piano piece generator for https://www.onlinepianist.com/virtual-piano
// Same seed  ->  exactly the same piece, every time.  Uses all 88 keys (A0–C8).
//
// The site's default "Real" keybinds only reach 35 keys (C3–A#5). This script installs a
// Custom keybind map instead: 44 keys (1-0, Q-P [ ], A-L ; ', Z-M , . / =) play A0–E4,
// and the same keys with Shift play F4–C8.
//
// FIRST TIME ONLY: open the page, F12 → Console, paste this file, press Enter.
//   It saves the 88-key map and asks you to reload (F5). After reloading, paste it again.
//
// Then every time:
// 1. CLICK ONE PIANO KEY with the mouse (unlocks sound).
// 2. F12 → Console, paste this file, press Enter. Then:
//      chopin(4444)                 – generate + play the piece for seed 4444 (~3 min)
//      chopin('rainy night')        – seeds can be any text too
//      chopin(4444, {minutes: 5})   – same seed, extended to ~5 min with extra episodes
//      stop()                       – stop playback
//      restoreRealKeys()            – put the site back to its default "Real" keybinds (then reload)
//
// How it works (all choices come from the seeded random generator):
//   style   nocturne / waltz / mazurka / étude
//   key     any of 12 tonics, minor (68%) or major
//   form    A (8-bar question + 8-bar answer) · B (contrasting key & texture) · A' (ornamented) · [episodes] · coda
//   harmony weighted chord-to-chord transitions (i→iv→V7→i, Neapolitan, diminished 7ths…), cadences at phrase ends
//   melody  rhythm motifs + interval contour, chord tones on strong beats, an arch that peaks ~2/3 through a phrase
//   Chopin  turns, grace notes, trills before cadences, fioritura runs in the reprise, rubato, drone bass in mazurkas,
//           ritardando at phrase ends, Picardy-third endings

(() => {
  // ---------- keyboard mapping: all 88 keys via a Custom keybind map ----------
  const CODES = ['Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Digit0',
    'KeyQ','KeyW','KeyE','KeyR','KeyT','KeyY','KeyU','KeyI','KeyO','KeyP','BracketLeft','BracketRight',
    'KeyA','KeyS','KeyD','KeyF','KeyG','KeyH','KeyJ','KeyK','KeyL','Semicolon','Quote',
    'KeyZ','KeyX','KeyC','KeyV','KeyB','KeyN','KeyM','Comma','Period','Slash','Equal'];
  const LOW = 21, SPLIT = 65, TOP = 108;             // A0 … E4 plain keys, F4 … C8 with Shift
  const fit = m => { while (m < LOW) m += 12; while (m > TOP) m -= 12; return m; };
  const keyOf = m => { m = fit(m); return m < SPLIT ? { code: CODES[m - LOW], shift: false } : { code: CODES[m - SPLIT], shift: true }; };
  const fire = (type, m) => { const { code, shift } = keyOf(m);
    window.dispatchEvent(new KeyboardEvent(type, { code, key: code, shiftKey: shift, bubbles: true, cancelable: true })); };

  const SETTINGS = 'vp-settings';
  const wantedMap = () => { const m = {}; CODES.forEach((c, i) => { m[LOW + i] = { code: c }; m[SPLIT + i] = { code: c, shift: true }; }); return m; };
  function mapInstalled() {
    try { const s = JSON.parse(localStorage.getItem(SETTINGS) || '{}'), w = wantedMap();
      return s.keyboardMarks === 'custom' && s.customKeyMap && Object.keys(w).every(k => s.customKeyMap[k] && s.customKeyMap[k].code === w[k].code && !!s.customKeyMap[k].shift === !!w[k].shift);
    } catch { return false; }
  }
  function installMap() {
    const s = JSON.parse(localStorage.getItem(SETTINGS) || '{}');
    localStorage.setItem(SETTINGS, JSON.stringify({ ...s, keyboardMarks: 'custom', customKeyMap: wantedMap(), zoomed: false }));
  }
  let needsReload = false;                           // map was written this session; the page must reload to use it
  window.restoreRealKeys = () => {
    const s = JSON.parse(localStorage.getItem(SETTINGS) || '{}');
    localStorage.setItem(SETTINGS, JSON.stringify({ ...s, keyboardMarks: 'real' }));
    console.log('Default "Real" keybinds restored. Reload the page (F5).');
  };

  // ---------- seeded random generator ----------
  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
    return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; };
  }
  function mulberry32(a) {
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function makeRng(seed) {
    const r = mulberry32(xmur3(String(seed))());
    return {
      f: (a, b) => a + (b - a) * r(),
      i: (a, b) => a + Math.floor(r() * (b - a + 1)),
      pick: arr => arr[Math.floor(r() * arr.length)],
      chance: p => r() < p,
      w: obj => { const ks = Object.keys(obj); let s = 0; ks.forEach(k => s += obj[k]);
        let x = r() * s; for (const k of ks) { x -= obj[k]; if (x <= 0) return k; } return ks[ks.length - 1]; },
    };
  }

  // ---------- music theory ----------
  const KEYN = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
  const QUAL = { M:[0,4,7], m:[0,3,7], d7:[0,3,6,9], D7:[0,4,7,10], hd:[0,3,6,10], M7:[0,4,7,11] };
  const DEG = {
    minor: { i:[0,'m'], iv:[5,'m'], V7:[7,'D7'], V:[7,'M'], VI:[8,'M'], III:[3,'M'], VII:[10,'M'], ii0:[2,'hd'], N6:[1,'M'], vii7:[11,'d7'] },
    major: { I:[0,'M'], IM7:[0,'M7'], ii:[2,'m'], iii:[4,'m'], IV:[5,'M'], V7:[7,'D7'], V:[7,'M'], vi:[9,'m'], vii7:[11,'d7'], II7:[2,'D7'], iv:[5,'m'], bVI:[8,'M'] },
  };
  const TRANS = {
    minor: { i:{iv:3,VI:2,III:1.2,V7:2,vii7:1,ii0:1,VII:.8}, iv:{V7:3,i:1.2,ii0:1,vii7:1.5,N6:.7,VII:.8},
      VI:{iv:2,ii0:2,N6:1,V7:1.5,III:.5}, III:{VI:2,iv:2,VII:1}, VII:{III:3,i:1}, ii0:{V7:4,vii7:1},
      N6:{V7:4}, vii7:{i:3,V7:1}, V7:{i:4,VI:1.5}, V:{i:3,VI:1} },
    major: { I:{IV:3,vi:2.5,ii:2,V7:2,iii:1,II7:.8,vii7:.6,IM7:.5,bVI:.4}, IM7:{IV:3,vi:1,ii:1}, ii:{V7:4,vii7:1,II7:.5},
      iii:{vi:3,IV:2}, IV:{V7:3,I:1.5,ii:1.5,iv:1,vii7:1}, iv:{I:2,V7:2}, vi:{ii:3,IV:2.5,II7:1,iii:.5},
      II7:{V7:4}, vii7:{I:3,V7:1}, V7:{I:4,vi:1.5}, V:{I:3,vi:1}, bVI:{V7:2,iv:1} },
  };
  const PRE = { minor: ['iv','ii0','N6','VI','iv'], major: ['IV','ii','II7','iv','ii'] };
  const TON = { minor: 'i', major: 'I' };
  const SCALE = { minor: [0,2,3,5,7,8,10], major: [0,2,4,5,7,9,11] };

  const chordOf = (key, mode, rn) => { const [deg, q] = DEG[mode][rn]; const root = (key + deg) % 12;
    return { rn, root, pcs: QUAL[q].map(x => (root + x) % 12) }; };
  const pc = x => ((x % 12) + 12) % 12;
  // the key's scale, bent to fit chromatic chord tones (raised 7th over V7, flat 2nd over N6, …)
  function scaleFor(key, mode, ch) {
    const base = SCALE[mode].map(x => (x + key) % 12), set = new Set(base);
    return base.map(p => { if (ch.pcs.includes(p)) return p;
      const up = (p + 1) % 12, dn = (p + 11) % 12;
      if (ch.pcs.includes(up) && !set.has(up)) return up;
      if (ch.pcs.includes(dn) && !set.has(dn)) return dn;
      return p; });
  }
  const moveScale = (p, n, sc) => { if (!n) return p; let x = p; const s = n > 0 ? 1 : -1;
    for (let k = 0; k < Math.abs(n); k++) { do { x += s; } while (!sc.includes(pc(x))); } return x; };
  const nearest = (p, pcs) => { for (let d = 0; d < 12; d++) { if (pcs.includes(pc(p + d))) return p + d; if (pcs.includes(pc(p - d))) return p - d; } return p; };
  const clampOct = (p, lo, hi) => { while (p > hi) p -= 12; while (p < lo) p += 12; return p; };
  const tonesFrom = (pcs, s, n) => { const o = []; for (let m = s; o.length < n && m <= TOP; m++) if (pcs.includes(pc(m))) o.push(m); return o; };

  const RHY = {
    8: [[2,2,2,2],[3,1,2,2],[4,2,2],[2,1,1,2,2],[6,2],[3,1,4],[1,1,1,1,2,2],[2,2,4],[4,1,1,2],[2,2,3,1]],
    6: [[2,2,2],[3,1,2],[4,2],[2,1,1,2],[1.5,.5,2,2],[2,1.5,.5,2],[4,1,1],[1,1,2,2]],
  };
  const TEMPLATES = [['a','b','a','c','a','b','d'], ['a','a','b','c','a','a','d'], ['a','b','c','b','a','b','d'], ['a','b','a','b','c','c','d']];

  function genDeltas(R, n) {
    const out = []; let last = 0;
    for (let i = 0; i < n; i++) {
      let d;
      if (last >= 3) d = -1; else if (last <= -3) d = 1;   // step back after a leap
      else d = +R.w({ '-1':3, '1':3, '-2':1.4, '2':1.4, '0':.5, '3':.6, '4':.5, '5':.25, '-3':.5, '-4':.25 });
      out.push(d); last = d;
    }
    return out;
  }

  // ---------- composition ----------
  function walk(R, mode, cur, n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      cur = R.w(TRANS[mode][cur]);
      if (i === n - 1 && /^(V|vii)/.test(cur)) cur = R.pick(mode === 'minor' ? ['VI','i','III'] : ['vi','I','IV']);
      out.push([cur]);
    }
    return out;
  }

  // one 8-bar phrase: 'HC' ends on V (question), 'PAC' ends on the tonic (answer)
  function genPhrase(R, S, key, mode, cad, prev) {
    const U = S.U;
    let names;
    if (prev) { names = prev.names.slice(0, 4); const last = names[3][names[3].length - 1]; names = names.concat(walk(R, mode, last, 2)); }
    else names = [[TON[mode]]].concat(walk(R, mode, TON[mode], 5));
    const pre = R.pick(PRE[mode]);
    if (cad === 'HC') { names.push([pre]); names.push(['V7']); }
    else { names.push([pre, 'V7']); names.push([TON[mode]]); }
    const chords = names.map(bar => bar.map(n => chordOf(key, mode, n)));
    const chordAt = u => { const b = Math.min(7, Math.floor(u / U)), cs = chords[b]; return cs[(u - b * U) < U / 2 || cs.length === 1 ? 0 : 1]; };

    const plan = prev ? prev.plan : (() => {
      const tpl = R.pick(TEMPLATES), ids = {};
      return tpl.map(id => { if (!ids[id]) { const r = R.pick(RHY[U]); ids[id] = { r, d: genDeltas(R, r.length) }; } return ids[id]; });
    })();
    const endR = cad === 'PAC' ? [U] : R.pick([[U], [U - 2, 2], [U / 2, U / 2]]);
    const peak = R.f(.55, .75);

    let notes = [], p, startBar = 0;
    if (prev) { notes = prev.notes.filter(n => n[0] < 4 * U).map(n => n.slice()); p = notes[notes.length - 1][1]; startBar = 4; }
    else p = nearest(clampOct(S.lo + R.i(4, 10), S.lo, S.hi), chords[0][0].pcs);

    for (let b = startBar; b < 8; b++) {
      const pl = b === 7 ? { r: endR, d: genDeltas(R, endR.length) } : plan[b];
      let pos = 0;
      pl.r.forEach((d, j) => {
        const u = b * U + pos, ch = chordAt(u), sc = scaleFor(key, mode, ch);
        let t = moveScale(p, pl.d[j], sc);
        const frac = u / (8 * U);
        const lvl = frac < peak ? frac / peak : 1 - (frac - peak) / (1 - peak) * 0.8;
        const arc = S.lo + 3 + lvl * (S.hi - S.lo - 5);
        if (t > arc + 6) t = moveScale(t, -2, sc);
        if (t < arc - 6) t = moveScale(t, 2, sc);
        const strong = pos % (U === 8 ? 4 : 2) === 0 || d >= 3;
        if (strong) t = nearest(t, ch.pcs);
        t = clampOct(t, S.lo, S.hi);
        if (!sc.includes(pc(t))) t = nearest(t, ch.pcs);
        notes.push([u, t, d]); p = t; pos += d;
      });
    }
    // cadence note
    const last = notes[notes.length - 1];
    const target = cad === 'PAC' ? [key, (key + (mode === 'minor' ? 3 : 4)) % 12] : [(key + 7) % 12, (key + 11) % 12, (key + 2) % 12];
    last[1] = clampOct(nearest(last[1], target), S.lo, S.hi);
    return { names, chords, plan, notes, chordAt, key, mode };
  }

  const makeTheme = (R, S, key, mode) => { const a = genPhrase(R, S, key, mode, 'HC', null);
    return { key, mode, phrases: [a, genPhrase(R, S, key, mode, 'PAC', a)] }; };

  // ---------- rendering ----------
  function render(seed, opts = {}) {
    const R = makeRng(seed);
    const ev = []; let T = 0;
    const N = (t, m, d) => ev.push([Math.max(0, Math.round(t)), m, Math.max(40, Math.round(d))]);

    const style = R.w({ nocturne: 3, waltz: 2.5, mazurka: 2, etude: 2 });
    const mode = R.chance(.68) ? 'minor' : 'major';
    const key = R.i(0, 11);
    const S = { style, U: style === 'waltz' || style === 'mazurka' ? 6 : 8, lo: 65, hi: 93,
      unit: { nocturne: R.i(300, 380), waltz: R.i(150, 185), mazurka: R.i(175, 215), etude: R.i(210, 250) }[style] };
    const texA = { nocturne: 'noct', waltz: 'waltz', mazurka: 'mazurka', etude: 'waves' }[style];
    const texB = { nocturne: R.pick(['noct', 'chorale', 'broken']), waltz: 'waltz', mazurka: 'drone', etude: 'broken' }[style];
    const altTex = S.U === 8 ? ['noct', 'chorale', 'broken', 'waves'] : ['waltz', 'mazurka', 'drone'];

    // left-hand / accompaniment for one bar
    function accomp(tex, cs, t0, u, theme, b, waveState) {
      const segU = S.U / cs.length;
      cs.forEach((ch, ci) => {
        const ts = t0 + ci * segU * u;
        const inv = R.chance(.18) ? ch.pcs[1] : ch.root;
        const bass = 36 + inv;                                   // C2–B2
        const up = tonesFrom(ch.pcs, bass + 7, 4);               // open voicing above the bass
        if (ci === 0 && b % 4 === 0 && (tex === 'noct' || tex === 'chorale' || tex === 'drone') && R.chance(.6))
          N(t0 + 15, bass - 12, S.U * u - 40);                   // deep octave on phrase-group downbeats
        if (tex === 'noct') {
          const pat = segU === 8 ? [bass, up[0], up[1], up[2], up[3], up[2], up[1], up[0]] : [bass, up[0], up[1], up[2]];
          pat.forEach((m, i) => N(ts + i * u, m, i ? 2 * u - 20 : segU * u - 30));
        } else if (tex === 'broken') {
          const pat = S.U === 8 ? [bass, up[0], up[1], up[0], bass, up[0], up[1], up[0]] : [bass, up[0], up[1], up[0], up[1], up[0]];
          pat.slice(0, segU).forEach((m, i) => N(ts + i * u, m, (i % 4 ? 1 : 2) * u - 15));
        } else if (tex === 'chorale') {
          N(ts, bass, segU * u - 30);
          const blk = tonesFrom(ch.pcs, 52, 3);
          for (let q = 0; q < segU; q += 2) blk.forEach(m => N(ts + q * u + 20, m, 2 * u - 40));
        } else if (tex === 'waltz') {
          const b2 = b % 2 ? 36 + pc(ch.root + 7) : bass;
          const blk = tonesFrom(ch.pcs, 55, 3);
          if (ci === 0) N(ts, b2, 2 * u - 20);
          for (let q = (ci === 0 ? 2 : 0); q < segU; q += 2) blk.forEach(m => N(ts + q * u, m, u * 1.2));
        } else if (tex === 'mazurka') {
          const blk = tonesFrom(ch.pcs, 55, 3);
          if (ci === 0) N(ts, bass, 2 * u - 20);
          blk.forEach(m => N(ts + (ci === 0 ? 2 : 0) * u, m, 2.4 * u));
          if (ci === cs.length - 1 && R.chance(.5)) blk.forEach(m => N(t0 + 4 * u, m, .8 * u));
        } else if (tex === 'drone') {
          if (ci === 0) { N(ts, 36 + theme.key, S.U * u - 30); N(ts, 36 + theme.key + 7, S.U * u - 30); }
          tonesFrom(ch.pcs, 55, 2).forEach(m => N(t0 + 2 * u, m, 1.6 * u));
        } else if (tex === 'waves') {
          const s = u / 2;
          const pat = S.U === 8 ? [bass, up[0], up[1], up[0], bass, up[0], up[1], up[0]] : [bass, up[0], up[1], up[0], up[1], up[0]];
          pat.slice(0, segU).forEach((m, i) => N(ts + i * u, m, (i % 4 ? 1 : 2) * u - 15));
          let st = waveState.start + R.i(-4, 4); st = Math.max(60, Math.min(72, st)); waveState.start = st;
          while (tonesFrom(ch.pcs, st, 8).length < 8) st -= 2;
          const tt = tonesFrom(ch.pcs, st, 8);
          let seq = R.chance(.5) ? [0,1,2,3,4,5,6,7,6,5,4,3,2,1,2,3].map(i => tt[i]) : [0,1,2,3,4,3,2,1,0,2,1,3,2,4,3,1].map(i => tt[i]);
          if (R.chance(.4)) seq = seq.reverse();
          seq.slice(0, segU * 2).forEach((m, i) => N(ts + i * s, m, s - 12));
        }
      });
    }

    // melody with Chopin-style ornaments (level 0–2)
    function melody(ph, at, opt) {
      const ns = ph.notes;
      // notes the accompaniment is still holding at time t (for clash avoidance)
      const heldAt = (t, len = 0) => { const out = []; for (let j = ev.length - 1; j >= 0 && j > ev.length - 160; j--) {
        const [t2, m2, d2] = ev[j]; if (d2 >= 90 && t2 <= t + 20 + len && t2 + d2 > t + 40) out.push(fit(m2)); } return out; };
      const clashes = (p, held) => held.some(h => [1, 11, 13].includes(Math.abs(fit(p) - h)));
      ns.forEach(([u, p, d], i) => {
        const t = at(u) + R.f(-10, 10), dMs = at(u + d) - at(u);
        const ch = ph.chordAt(u), sc = scaleFor(ph.key, ph.mode, ch);
        // voice-leading filter: a melody note that grinds a half-step against the held accompaniment moves to a chord tone
        const win = Math.min(dMs * .6, 600);
        if (d >= 1 && clashes(p, heldAt(t, win))) {
          const cands = [nearest(p, ch.pcs), moveScale(p, 1, sc), moveScale(p, -1, sc), nearest(p + 3, ch.pcs), nearest(p - 3, ch.pcs)]
            .map(q => clampOct(q, S.lo, S.hi));
          const q = cands.find(q => !clashes(q, heldAt(t, win))); if (q !== undefined) p = q;
        }
        const up = moveScale(p, 1, sc), lo = moveScale(p, -1, sc);
        const isLast = i === ns.length - 1, isPen = i === ns.length - 2, L = opt.orn;
        if (opt.dbl && p - 12 >= 55) N(t, p - 12, dMs - 20);
        if (S.style === 'nocturne' && d >= 2 && R.chance(.35)) { const b = tonesFrom(ch.pcs, 55, 16).filter(x => x < p - 2).pop(); if (b) N(t + 25, b, dMs - 50); }
        if (L >= 2 && d >= 4 && !isLast && R.chance(.55)) {            // fioritura run
          const hold = dMs * .4, rest = dMs - hold, k = Math.max(6, Math.floor(rest / 55)), s = rest / k;
          N(t, p, hold - 10);
          const np = ns[i + 1][1], chrom = R.chance(.35);
          let x = p; const upN = Math.ceil(k * .4);
          for (let j = 0; j < k; j++) {
            if (j < upN) x = Math.min(100, moveScale(x, 1, sc));
            else x = chrom ? x - 1 : moveScale(x, -1, sc);
            if (j >= upN && x <= np) x = np + 1;
            N(t + hold + j * s, x, s - 8);
          }
        } else if (isPen && d >= 2 && R.chance(.25 + .2 * L)) {        // trill before the cadence
          const n = Math.floor(dMs * .7 / 65);
          for (let j = 0; j < n; j++) N(t + j * 65, j % 2 ? p : up, 55);
          N(t + n * 65, p, dMs - n * 65 - 15);
        } else if (L >= 1 && d >= 3 && R.chance(.15 * L)) {            // turn
          [up, p, lo].forEach((m, j) => N(t + j * 65, m, 55));
          N(t + 195, p, dMs - 210);
        } else if (L >= 1 && d >= 2 && R.chance(.12 * L)) {            // grace note
          N(t - 50, up, 45); N(t, p, dMs - 15);
        } else N(t, p, dMs - 15);
      });
    }

    function section(theme, opt) {
      const waveState = { start: R.i(59, 64) };
      theme.phrases.forEach((ph, pi) => {
        const bs = [], us = []; let t = T;
        for (let b = 0; b < 8; b++) {
          let u = S.unit * opt.tscale * (1 + R.f(-.015, .015));
          if (b === 7) u *= 1.12;
          if (b === 6 && pi === theme.phrases.length - 1) u *= 1.05;
          bs.push(t); us.push(u); t += u * S.U;
        }
        const at = x => { const b = Math.min(7, Math.floor(x / S.U)); return bs[b] + (x - b * S.U) * us[b]; };
        ph.chords.forEach((cs, b) => accomp(opt.tex, cs, bs[b], us[b], theme, b, waveState));
        if (opt.tex !== 'waves') melody(ph, at, opt);
        T = t;
      });
      T += S.unit * .8;
    }

    function coda(theme) {
      const k = theme.key, m = theme.mode, ton = TON[m];
      const rns = m === 'minor' ? ['iv', 'i', R.pick(['N6', 'iv']), 'V7', 'i'] : ['IV', 'I', R.pick(['iv', 'ii']), 'V7', 'I'];
      const s0 = Math.max(110, S.U === 8 ? S.unit / 2 : S.unit * .65);
      rns.forEach((rn, i) => {
        const ch = chordOf(k, m, rn), s = s0 * (1 + i * .12);
        const bass = i < 2 ? 36 + k : 36 + ch.root;
        N(T, bass, 16 * s - 30);
        N(T, bass - 12, 16 * s - 30);
        tonesFrom(ch.pcs, bass + 7, 3).forEach((x, j) => N(T + (j + 1) * 2 * s, x, (14 - 2 * j) * s));
        const tt = tonesFrom(ch.pcs, 60 + R.i(0, 4) + i * 2, 9);
        [0,1,2,3,4,5,6,7,8,7,6,5,4,3,2,1].forEach((ix, j) => N(T + j * s, tt[Math.min(ix, tt.length - 1)], s - 12));
        T += 16 * s;
      });
      const picardy = m === 'minor' && R.chance(.45);
      const fin = [24 + k, 36 + k].concat(tonesFrom([k, (k + (m === 'minor' && !picardy ? 3 : 4)) % 12, (k + 7) % 12], 55, 9));
      fin.forEach((x, j) => N(T + j * 90, x, 5000));
      T += 5600;
      return picardy;
    }

    // ----- form -----
    const A = makeTheme(R, S, key, mode);
    const bShift = +(mode === 'minor' ? R.w({ '3': 3, '8': 1.5, '0': 1.5 }) : R.w({ '9': 2.5, '5': 1.5, '0': 1.5 }));
    const bMode = mode === 'minor' ? 'major' : (bShift === 5 ? 'major' : 'minor');
    const B = makeTheme(R, S, (key + bShift) % 12, bMode);
    const dance = S.U === 6;
    const plan = [
      [A, { tex: texA, orn: 0, tscale: 1, label: 'A' }],
      ...(dance ? [[A, { tex: texA, orn: 1, dbl: true, tscale: 1, label: 'A (repeat)' }]] : []),
      [B, { tex: texB, orn: 1, tscale: R.f(.92, 1.05), label: 'B' }],
      ...(dance ? [[B, { tex: texB, orn: 2, tscale: 1, label: 'B (repeat)' }]] : []),
      [A, { tex: texA, orn: 2, dbl: dance, tscale: 1, label: "A'" }],
    ];
    const secLen = o => 16 * S.U * S.unit * o.tscale * 1.02;
    const targetMs = (opts.minutes || 3) * 60000 - 20000;
    let est = plan.reduce((s, [, o]) => s + secLen(o), 0), epi = 0;
    while (est < targetMs && epi < 8) {
      const shifts = mode === 'minor' ? [[8,'major'],[5,'minor'],[3,'major'],[10,'major']] : [[7,'major'],[5,'major'],[9,'minor'],[8,'major']];
      const [sh, md] = R.pick(shifts);
      const C = makeTheme(R, S, (key + sh) % 12, md);
      const o1 = { tex: R.pick(altTex), orn: 1, tscale: R.f(.9, 1.08), label: 'Episode ' + (++epi) };
      plan.push([C, o1]); est += secLen(o1);
      if (dance) { const o1b = { ...o1, orn: 2, label: o1.label + ' (repeat)' }; plan.push([C, o1b]); est += secLen(o1b); }
      // the main theme returns only after every second episode (or before the coda)
      if (est >= targetMs || epi % 2 === 0) {
        const o2 = { tex: texA, orn: 2, dbl: dance && R.chance(.5), tscale: 1, label: "A'" };
        plan.push([A, o2]); est += secLen(o2);
      }
    }

    if (plan[plan.length - 1][0] !== A) plan.push([A, { tex: texA, orn: 2, tscale: 1, label: "A'" }]);

    const sections = [];
    for (const [th, o] of plan) { sections.push(`${Math.round(T / 1000)}s ${o.label} (${KEYN[th.key]} ${th.mode})`); section(th, o); }
    sections.push(`${Math.round(T / 1000)}s Coda`);
    const picardy = coda(A);

    ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const info = {
      seed: String(seed), style, key: `${KEYN[key]} ${mode}`,
      tempo: `${S.U === 6 ? '3/4' : '4/4'}, ${S.style === 'etude' ? '16th' : '8th'} ≈ ${S.style === 'etude' ? S.unit / 2 : S.unit} ms`,
      length: `${Math.floor(T / 60000)}:${String(Math.round(T / 1000) % 60).padStart(2, '0')}`,
      notes: ev.length, sections, ending: picardy ? 'Picardy third (ends in major)' : 'plain tonic chord',
    };
    return { ev, info };
  }

  // ---------- player ----------
  window.stop = () => { window.__stop = true; CODES.forEach(c => window.dispatchEvent(new KeyboardEvent('keyup', { code: c, key: c, bubbles: true }))); };
  window.chopinScore = (seed, opts) => render(seed, opts);
  window.chopin = (seed = 4444, opts = {}) => {
    window.__stop = true;
    const { ev, info } = render(seed, opts);
    if (needsReload || !mapInstalled()) {
      installMap(); needsReload = true;
      const msg = 'The 88-key keybind map has been saved. Reload the page (F5), click one piano key, then paste this script again.';
      console.log(msg); return msg;
    }
    setTimeout(() => {
      window.__stop = false;
      const t0 = performance.now() + 150; let i = 0;
      // Two notes share each physical key (plain + Shift). A keyup releases both, so a key is only
      // released once every note currently using it has ended.
      const heldMidi = {}, codeUse = {};
      const press = m => { const { code } = keyOf(m);
        if (heldMidi[m]) fire('keyup', m);                 // re-strike a note that is still sounding
        fire('keydown', m); heldMidi[m] = (heldMidi[m] || 0) + 1; codeUse[code] = (codeUse[code] || 0) + 1; };
      const release = m => { const { code } = keyOf(m);
        heldMidi[m]--; codeUse[code]--;
        if (codeUse[code] <= 0) { codeUse[code] = 0; fire('keyup', m); heldMidi[m] = 0;
          const other = m < SPLIT ? m + (SPLIT - LOW) : m - (SPLIT - LOW); if (other >= LOW && other <= TOP) heldMidi[other] = 0; } };
      (function tick() {
        const now = performance.now() - t0;
        while (i < ev.length && ev[i][0] <= now) {
          const [, m0, d] = ev[i], m = fit(m0);
          if (!window.__stop) { press(m); setTimeout(() => release(m), d); }
          i++;
        }
        if (i < ev.length && !window.__stop) setTimeout(tick, 4);
      })();
    }, 200);
    console.log(info);
    return info;
  };
  console.log(mapInstalled()
    ? 'Ready (88 keys). Try chopin(4444) or chopin("any text"), stop() to stop.'
    : (installMap(), needsReload = true, 'First run: the 88-key keybind map has been saved. Reload the page (F5), click one piano key, then paste this script again.'));
})();
