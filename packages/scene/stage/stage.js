  // =====================================================================
  // the stage: one place painted live from the town clock, the critters in
  // it, and the words. The app sends it what is happening; it never decides.
  // =====================================================================
  const cv = $('cv'), snap = $('snap'), SUPER = 1.4, ZOOM = 0.42;
  const post = (m) => { try { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m)); } catch (e) { /* no host */ } };
  const byId = Object.fromEntries(PLACES.map((p) => [p.id, p]));
  const S = { place: 'room', v: 0, wx: 'clear', hour: null, offsetMs: 0, phase: 'idle', who: null, awake: false };
  const crits = {};
  const critFor = (id) => crits[id] || (crits[id] = new Critter(CAST.find((c) => c.id === id)));
  const air = new Air(); let airKey = '';
  const bg = document.createElement('canvas'); let bgKey = '';
  let dims = { w: 0, h: 0, dpr: 1 }, anchor = null, lastTitle = '';
  const cam = { zs: new Spring(22, 9.2, 0) };

  const simDate = () => {
    if (S.hour !== null) { const d = new Date(); d.setHours(Math.floor(S.hour), Math.round((S.hour % 1) * 60), 0, 0); return d; }
    return new Date(Date.now() + S.offsetMs);
  };
  const hourOf = (d) => d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;

  function resize() {
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); // 3x costs twice the fill for paint nobody can tell apart
    dims = { w: r.width, h: r.height, dpr };
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    bg.width = Math.round(r.width * dpr * SUPER); bg.height = Math.round(r.height * dpr * SUPER); bgKey = '';
  }
  new ResizeObserver(resize).observe(cv);

  // a place's paint and front keep a few measurements on the place itself; a second painting of it
  // (a kept one, a thumbnail) must not disturb the live one
  const keepPlace = (pl, fn) => { const keep = { ...pl }; try { return fn(); } finally { Object.assign(pl, keep); } };

  // ---------- who does what: the place says where everyone is, the talk says what they're doing ----------
  function modeFor(c) {
    let mode = c.mode || 'idle';
    if (mode === 'sleep' && S.awake) mode = 'idle';
    if (S.phase === 'idle' || (S.who && c.who !== S.who)) return mode === 'speak' ? 'idle' : mode;
    if (S.phase === 'speak') return 'speak';
    if (S.phase === 'listen' || S.phase === 'turn') return 'listen';
    return 'idle';
  }
  function setTalk(m) {
    const before = S.phase, now = performance.now();
    S.phase = m.phase || 'idle';
    if (m.who !== undefined) S.who = m.who;
    if (S.phase !== 'idle' && !S.awake) { S.awake = true; if (S.who && crits[S.who] && crits[S.who].mode === 'sleep') crits[S.who].gesture('poke'); }
    if (S.phase === 'idle' && m.sleepAgain) S.awake = false;
    const cr = S.who && crits[S.who];
    if (cr) {
      cr.driven = true;
      // waiting on the reply: a glance up and away, as people do while they think
      if (S.phase === 'think' && before !== 'think') { cr.hold.lx = Math.random() < 0.5 ? -0.7 : 0.7; cr.hold.ly = -0.35; cr.hold.lookUntil = now + 1400; cr.t = now; }
      if (S.phase === 'speak' && before !== 'speak') cr.R.stretch.kick(1.1);
    }
    $('scrim').classList.toggle('on', S.phase !== 'idle');
    if (S.phase === 'listen' && cur && cur.el) cur.el.classList.add('dim');
  }

  // ---------- render loop ----------
  const weavePat = cv.getContext('2d').createPattern(weave, 'repeat');
  let last = performance.now(), lastSec = -1;
  // a still camera draws at 30 fps (the critters breathe as well, and the phone keeps its CPU for
  // the voice); a moving one at full rate
  const camMoving = () => Math.abs(cam.zs.v) > 0.003 || Math.abs(cam.zs.x - cam.zs.t) > 0.003;
  function frame(now) {
    if (!still && now - last < 31 && !camMoving()) { requestAnimationFrame(frame); return; }
    const dt = clamp((now - last) / 1000, 0, 1 / 20); last = now;
    const { w, h, dpr } = dims;
    if (w) {
      const d = simDate(), hr = hourOf(d), L = light(hr, S.wx), pl = byId[S.place] || byId.room;
      const key = `${pl.id}|${S.v}|${S.wx}|${Math.floor(hr * 60)}|${w}x${h}`;
      if (key !== bgKey) { const b = bg.getContext('2d'); b.setTransform(dpr * SUPER, 0, 0, dpr * SUPER, 0, 0); b.clearRect(0, 0, w, h); pl.paint(b, w, h, L, S.v); bgKey = key; }
      if (airKey !== S.wx + w) { air.reset(S.wx, w, h); airKey = S.wx + w; }
      // the camera leans in on a spring while the talk goes on, with a breath of handheld drift
      cam.zs.t = S.phase === 'idle' ? 0 : S.phase === 'listen' ? 0.88 : 1; cam.zs.step(dt);
      const a = anchor || { x: w / 2, y: h / 2, s: w * 0.1 }, zk = cam.zs.x, z = 1 + ZOOM * zk;
      const fx = a.x, fy = a.y - a.s * 0.62;
      let tx = fx + (w * 0.5 - fx) * clamp(zk, 0, 1.2) + noise(now / 4000, 7) * 1.4, ty = fy + (h * 0.42 - fy) * clamp(zk, 0, 1.2) + noise(now / 4600, 8) * 1.2;
      tx = clamp(tx, w - (w - fx) * z, fx * z); ty = clamp(ty, h - (h - fy) * z, fy * z); // never past the painting's edge
      const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.save(); g.translate(tx, ty); g.scale(z, z); g.translate(-fx, -fy);
      g.drawImage(bg, 0, 0, w, h);
      const res = pl.front(g, w, h, L, now, S.v) || {};
      anchor = null;
      for (const c of res.cast || []) {
        const cr = critFor(c.who); cr.mode = modeFor(c); cr.step(dt, now);
        if (!anchor || c.who === S.who) anchor = c;
        const s = c.s * (cr.s.scale || 1); g.save(); if (c.clip) { g.beginPath(); g.rect(...c.clip); g.clip(); }
        g.translate(c.x, c.y); g.scale(s, s); LT = lightT(L, { x: c.x, y: c.y, s }, c.src, c.warm || 0); PX = s * dpr * z; cr.draw(g, LT); g.restore();
      }
      if (res.after) res.after();
      if (!pl.noWindows) air.draw(g, dt, now, res.clip || null);
      g.restore();
      // canvas weave over everything, so the whole screen reads as a painting
      g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.07; g.fillStyle = weavePat; g.fillRect(0, 0, w, h); g.restore();
      const sec = Math.floor(now / 1000);
      if (sec !== lastSec) { lastSec = sec; const t = pl.title(hr, S.v, L); if (t !== lastTitle) { lastTitle = t; post({ t: 'title', title: t, place: pl.id }); } }
    }
    if (!still || frame.n++ < 3) requestAnimationFrame(frame);
  }
  frame.n = 0;

  // ---------- changing place: the old painting breathes out over the new one ----------
  function setScene(m) {
    const changed = m.place !== undefined && m.place !== S.place;
    if (changed && dims.w && !m.cut) {
      snap.width = cv.width; snap.height = cv.height; snap.getContext('2d').drawImage(cv, 0, 0);
      snap.getAnimations().forEach((x) => x.cancel());
      snap.animate([{ opacity: 1, filter: 'blur(0px)', transform: 'scale(1)' }, { opacity: 0, filter: 'blur(14px)', transform: 'scale(1.05)' }], { duration: 1100, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
    }
    if (m.place !== undefined) S.place = m.place;
    if (m.v !== undefined) S.v = m.v;
    if (m.wx !== undefined) S.wx = m.wx;
    if (m.hour !== undefined) S.hour = m.hour;
    if (m.offsetMs !== undefined) S.offsetMs = m.offsetMs;
    if (changed) { anchor = null; S.awake = false; lastTitle = ''; }
    bgKey = '';
  }

  // ---------- captions: words as spans so each can arrive on its own ----------
  const sayBox = $('sayBox'), youEl = $('you');
  let cur = null, lastBeat = 0;
  function wordsInto(el, text, cls) {
    el.textContent = ''; const starts = []; let at = 0;
    text.split(' ').forEach((w, i, all) => {
      const s = document.createElement('span'); s.className = 'w' + (cls ? ' ' + cls : ''); s.textContent = w + (i < all.length - 1 ? ' ' : ''); el.appendChild(s);
      starts.push(at); at += w.length + 1;
    });
    return { spans: el.children, starts };
  }
  const fadeAway = (el, dy) => { const an = el.animate([{ opacity: getComputedStyle(el).opacity, filter: 'blur(0px)' }, { opacity: 0, filter: 'blur(8px)', transform: `translateY(${dy}px) scale(.97)` }], { duration: 460, easing: 'cubic-bezier(.4,0,.7,.2)', fill: 'forwards' }); return an; };
  function clearSay() { [...sayBox.children].forEach((el) => { fadeAway(el, -14).onfinish = () => el.remove(); }); cur = null; }
  // a word already on screen when its line grows: shown as it is, with no second arrival
  const settle = (el) => { el.classList.add('in'); el.style.animation = 'none'; el.style.opacity = 1; el.style.filter = 'none'; el.style.transform = 'none'; el.style.webkitMaskImage = 'none'; el.style.maskImage = 'none'; el.style.color = 'var(--bone)'; };
  // a live line arrives in pieces as the voice is written: the same line grows, it never restarts
  function setLine(m) {
    const text = m.text || '';
    if (cur && cur.id === m.id) {
      if (m.gloss) cur.gloss = m.gloss;
      if (text === cur.text) return;
      const shown = cur.shown, { spans, starts } = wordsInto(cur.el, text);
      for (let i = 0; i < Math.min(shown, spans.length); i++) settle(spans[i]);
      Object.assign(cur, { spans, starts, words: text.split(' '), text, shown: Math.min(shown, spans.length) });
      return;
    }
    newLine(text, m.gloss, m.id);
  }
  function newLine(text, gloss, id) {
    clearSay();
    const wrap = document.createElement('div'), p = document.createElement('p'), v = document.createElement('p');
    p.className = 'line say'; v.className = 'line gloss'; wrap.append(p, v); sayBox.appendChild(wrap);
    const { spans, starts } = wordsInto(p, text);
    cur = { id, el: p, glossEl: v, gloss: gloss || '', spans, starts, words: text.split(' '), text, shown: 0, done: false };
  }
  // the voice reached this character of the line: show the words it has said, and let them move the body
  function reveal(chars) {
    if (!cur) return;
    let n = 0; while (n < cur.starts.length && cur.starts[n] < chars) n++;
    const now = performance.now(), cr = S.who && crits[S.who];
    for (let i = cur.shown; i < n; i++) {
      const el = cur.spans[i]; el.style.animationDelay = ((i - cur.shown) * 40) + 'ms'; el.classList.add('in');
      const w = cur.words[i] || '';
      if (cr) {
        cr.t = now;
        if (/\?$/.test(w)) cr.gesture('question'); else if (/!$/.test(w)) cr.gesture('exclaim');
        else if (now - lastBeat > 170) { cr.gesture('beat'); cr.env = 0.55 + Math.min(0.45, w.length / 14); lastBeat = now; }
      }
    }
    cur.shown = Math.max(cur.shown, n);
  }
  function showGloss() {
    if (!cur || !cur.gloss || cur.glossEl.textContent) return;
    const { spans } = wordsInto(cur.glossEl, cur.gloss);
    [...spans].forEach((el, i) => { el.style.animationDelay = (i * 22) + 'ms'; el.classList.add('in'); });
  }
  function lineDone() { if (!cur) return; reveal(1e9); cur.done = true; showGloss(); if (S.who && crits[S.who]) crits[S.who].R.nod.kick(3); }
  function setYou(text, final) {
    const words = text.trim() ? text.trim().split(/\s+/) : [];
    if (!words.length) return;
    if (youEl.dataset.text !== words.join(' ')) {
      const prev = youEl.dataset.text ? youEl.dataset.text.split(' ') : [];
      let keep = 0; while (keep < prev.length && keep < words.length && prev[keep] === words[keep]) keep++;
      const { spans } = wordsInto(youEl, words.join(' '), 'part');
      for (let i = 0; i < spans.length; i++) { if (i < keep) { spans[i].style.animation = 'none'; spans[i].style.opacity = 1; spans[i].style.filter = 'none'; spans[i].style.transform = 'none'; spans[i].style.webkitMaskImage = 'none'; spans[i].style.maskImage = 'none'; } spans[i].classList.add('in'); }
      youEl.dataset.text = words.join(' '); youEl.classList.remove('final');
      // the character nods along as your words come in
      if (words.length > keep && words.length % 3 === 0 && S.who && crits[S.who]) crits[S.who].gesture('nod');
    }
    if (final && !youEl.classList.contains('final')) {
      [...youEl.children].forEach((el, i) => { el.style.animation = ''; el.classList.remove('part'); el.style.animationDelay = `0ms, 0ms, ${i * 45}ms`; });
      youEl.classList.add('final');
    }
  }
  function clearYou() { if (!youEl.children.length) return; const an = youEl.animate([{ opacity: 1, filter: 'blur(0px)' }, { opacity: 0, filter: 'blur(8px)', transform: 'translateY(-10px)' }], { duration: 420, easing: 'cubic-bezier(.4,0,.7,.2)' }); an.onfinish = () => { youEl.textContent = ''; youEl.dataset.text = ''; youEl.classList.remove('final'); }; }

  // ---------- the painting's label ----------
  let labelT = 0;
  function showLabel(title, sub, ms) { $('lTitle').textContent = title ? `‘${title}’` : ''; $('lSub').textContent = sub || ''; $('label').classList.add('on'); clearTimeout(labelT); if (ms) labelT = setTimeout(() => $('label').classList.remove('on'), ms); }
  function hideLabel() { clearTimeout(labelT); $('label').classList.remove('on'); }

  // ---------- a still painting of any place at any hour, for the wall and the kept card ----------
  function render(m) {
    const sp = m.spec || {}, pl = byId[sp.place] || byId.room, w = m.w || 300, h = m.h || 375, k = m.scale || 2;
    const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
    const g = c.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0);
    const L = light(sp.hour ?? 19.3, sp.wx || 'clear');
    keepPlace(pl, () => {
      pl.paint(g, w, h, L, sp.v || 0);
      const res = pl.front(g, w, h, L, 20000, sp.v || 0) || {};
      for (const cc of res.cast || []) {
        const cr = new Critter(CAST.find((x) => x.id === cc.who)); cr.mode = cc.mode === 'sleep' && !sp.asleep ? 'idle' : cc.mode || 'idle';
        cr.nextIdle = cr.nextBlink = 1e12; for (let i = 0; i < 90; i++) cr.step(1 / 60, 1000 + i * 16);
        const s = cc.s * (cr.s.scale || 1); g.save(); if (cc.clip) { g.beginPath(); g.rect(...cc.clip); g.clip(); }
        g.translate(cc.x, cc.y); g.scale(s, s); LT = lightT(L, { x: cc.x, y: cc.y, s }, cc.src, cc.warm || 0); PX = s * k; cr.draw(g, LT); g.restore();
      }
      if (res.after) res.after();
    });
    g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.07; g.fillStyle = g.createPattern(weave, 'repeat'); g.fillRect(0, 0, w, h); g.restore();
    post({ t: 'rendered', id: m.id, data: c.toDataURL('image/jpeg', 0.86) });
  }

  // ---------- the app's messages ----------
  const handlers = {
    scene: setScene,
    talk: setTalk,
    line: setLine,
    chars: (m) => reveal(m.n || 0),
    lineDone,
    gloss: (m) => { if (cur) { cur.gloss = m.text || ''; if (cur.done) showGloss(); } },
    clearSay,
    you: (m) => setYou(m.text || '', !!m.final),
    clearYou,
    label: (m) => showLabel(m.title, m.sub, m.ms),
    hideLabel,
    gesture: (m) => { const cr = crits[m.who || S.who]; if (cr) { cr.t = performance.now(); cr.gesture(m.kind || 'poke'); } },
    render,
  };
  window.stage = { recv(m) { try { const fn = handlers[m && m.t]; if (fn) fn(m); } catch (e) { post({ t: 'error', message: String(e && e.message || e) }); } } };
  window.addEventListener('error', (e) => post({ t: 'error', message: String(e.message) }));
  requestAnimationFrame(frame);
  post({ t: 'ready', places: PLACES.map((p) => p.id) });
})();
</script>
</body>
</html>
