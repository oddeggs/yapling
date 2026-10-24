  // =====================================================================
  // the gallery: one live canvas per place, painted from the town clock and weather
  // =====================================================================
  const clock = { mode: 'live', base: Date.now(), realBase: performance.now(), pick: 19.3 };
  const simDate = (now) => { if (clock.mode === 'live') return new Date(); if (clock.mode === 'fast') return new Date(clock.base + (now - clock.realBase) * 720); const d = new Date(); d.setHours(Math.floor(clock.pick), Math.round((clock.pick % 1) * 60), 0, 0); return d; };
  const hourOf = (d) => d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  const fmt = (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  let WX = 'clear';
  const SUPER = 1.4;

  const grid = $('grid'), cards = [];
  const SPEAKER = '<svg viewBox="0 0 24 24"><path class="f" d="M4 9.2h3.2L11.6 5c.5-.5 1.4-.1 1.4.6v12.8c0 .7-.9 1.1-1.4.6l-4.4-4.2H4c-.6 0-1-.4-1-1v-3.6c0-.6.4-1 1-1Z"/><path d="M16.2 8.8a4.6 4.6 0 0 1 0 6.4M18.8 6.4a8.2 8.2 0 0 1 0 11.2"/></svg>';
  PLACES.forEach((pl) => {
    const el = document.createElement('article'); el.className = 'card';
    el.innerHTML = `<div class="frame" role="img" aria-label="${pl.name}, painted live"><canvas></canvas></div>
      <div><h2></h2><div class="meta">${pl.name} · ${pl.who} · ${pl.hours}</div></div><p>${pl.story}</p>
      <div class="row">${pl.variants.map((v, i) => `<button type="button" class="chip" data-v="${i}" aria-pressed="${i === 0}">${v}</button>`).join('')}<button type="button" class="listen" aria-pressed="false" aria-label="Listen to ${pl.name}">${SPEAKER}<span class="bars"><i></i><i></i><i></i></span>Listen</button></div>`;
    grid.appendChild(el);
    const card = { pl, el, cv: el.querySelector('canvas'), h2: el.querySelector('h2'), v: 0, bg: document.createElement('canvas'), key: '', visible: false, air: new Air(), airKey: '', crits: {}, title: '' };
    el.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => { card.v = +b.dataset.v; el.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); card.key = ''; }));
    el.querySelector('.frame').addEventListener('click', () => Object.values(card.crits).forEach((c) => c.gesture(c.mode === 'sleep' ? 'nod' : 'poke')));
    el.querySelector('.listen').addEventListener('click', (e) => listen(card, e.currentTarget));
    cards.push(card);
  });
  const io = new IntersectionObserver((es) => es.forEach((e) => { const c = cards.find((k) => k.cv === e.target); if (c) c.visible = e.isIntersecting; }), { rootMargin: '120px' });
  cards.forEach((c) => io.observe(c.cv));
  const critFor = (card, id) => card.crits[id] || (card.crits[id] = new Critter(CAST.find((c) => c.id === id)));

  function setTitle(card, t) {
    if (card.title === t) return; const first = !card.title; card.title = t;
    if (first) { card.h2.textContent = `‘${t}’`; return; }
    card.h2.classList.add('swap'); setTimeout(() => { card.h2.textContent = `‘${t}’`; card.h2.classList.remove('swap'); }, 380);
  }

  let last = performance.now(), lastSec = -1;
  function frame(now) {
    const dt = clamp((now - last) / 1000, 0, 1 / 20); last = now;
    const d = simDate(now), hr = hourOf(d), dpr = Math.min(2, devicePixelRatio || 1);
    for (const card of cards) {
      if (!card.visible) continue;
      const r = card.cv.getBoundingClientRect(); if (!r.width) continue;
      const w = r.width, h = r.height, pl = card.pl, L = light(hr, WX);
      if (card.cv.width !== Math.round(w * dpr)) { card.cv.width = Math.round(w * dpr); card.cv.height = Math.round(h * dpr); card.bg.width = Math.round(w * dpr * SUPER); card.bg.height = Math.round(h * dpr * SUPER); card.key = ''; }
      const key = `${card.v}|${WX}|${Math.floor(hr * 60)}|${w}`;
      if (key !== card.key) { const b = card.bg.getContext('2d'); b.setTransform(dpr * SUPER, 0, 0, dpr * SUPER, 0, 0); b.clearRect(0, 0, w, h); pl.paint(b, w, h, L, card.v); card.key = key; }
      if (card.airKey !== WX + w) { card.air.reset(WX, w, h); card.airKey = WX + w; }
      const g = card.cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.drawImage(card.bg, 0, 0, w, h);
      const res = pl.front(g, w, h, L, now, card.v) || {};
      for (const c of res.cast || []) {
        const cr = critFor(card, c.who); cr.mode = c.mode || 'idle'; cr.step(dt, now);
        const spec = cr.s, s = c.s * (spec.scale || 1); g.save(); if (c.clip) { g.beginPath(); g.rect(...c.clip); g.clip(); }
        g.translate(c.x, c.y); g.scale(s, s); const T = lightT(L, { x: c.x, y: c.y, s: s }, c.src, c.warm || 0); LT = T; PX = s * dpr; cr.draw(g, T); g.restore();
      }
      if (res.after) res.after();
      if (!pl.noWindows) card.air.draw(g, dt, now, pl.interior ? res.clip : res.clip || null);
      g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.07; g.fillStyle = g.createPattern(weave, 'repeat'); g.fillRect(0, 0, w, h); g.restore();
      if (Math.floor(now / 1000) !== lastSec) setTitle(card, pl.title(hr, card.v, L));
    }
    const sec = Math.floor(now / 1000);
    if (sec !== lastSec) { lastSec = sec; $('clock').innerHTML = `<b>${fmt(d)}</b> in Natterwick`; mixWeather(); }
    if (!still || frame.n++ < 2) requestAnimationFrame(frame);
  }
  frame.n = 0; requestAnimationFrame(frame);
  // titles for cards that start off screen
  cards.forEach((c) => setTitle(c, c.pl.title(hourOf(simDate(performance.now())), 0, light(hourOf(simDate(performance.now())), WX))));

  // ---------- controls ----------
  function segCtl(id, fn) { const el = $(id); el.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const bs = [...el.querySelectorAll('button')]; bs.forEach((x) => x.setAttribute('aria-pressed', String(x === b))); el.style.setProperty('--i', bs.indexOf(b)); fn(b.dataset.v); }); }
  segCtl('segTime', (v) => { clock.mode = v; clock.base = Date.now(); clock.realBase = performance.now(); $('pickWrap').classList.toggle('on', v === 'pick'); showPick(); });
  segCtl('segWx', (v) => { WX = v; });
  function showPick() { const el = $('pick'); clock.pick = +el.value; el.style.setProperty('--p', (clock.pick / 23.9 * 100) + '%'); $('pickVal').textContent = fmt(new Date(2026, 0, 1, Math.floor(clock.pick), Math.round((clock.pick % 1) * 60))); }
  $('pick').addEventListener('input', showPick); showPick();

  // ---------- sound: each place's music and ambience, with the weather on top ----------
  const A = { ctx: null, buf: {}, cur: null, wx: {} };
  async function load(name) { if (name in A.buf) return A.buf[name]; A.buf[name] = null; try { const r = await fetch(`audio/${name}.mp3`); if (!r.ok) return null; A.buf[name] = await A.ctx.decodeAudioData(await r.arrayBuffer()); } catch (e) { A.buf[name] = null; } return A.buf[name]; }
  function loopOf(buf, vol) { const s = A.ctx.createBufferSource(), gn = A.ctx.createGain(); s.buffer = buf; s.loop = true; gn.gain.value = 0; s.connect(gn).connect(A.ctx.destination); s.start(); gn.gain.setTargetAtTime(vol, A.ctx.currentTime, 0.9); return { s, gn }; }
  function fadeOut(n) { if (!n) return; n.gn.gain.setTargetAtTime(0, A.ctx.currentTime, 0.5); setTimeout(() => { try { n.s.stop(); } catch (e) {} }, 2500); }
  async function listen(card, btn) {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    if (!A.ctx) A.ctx = new AC(); if (A.ctx.state === 'suspended') A.ctx.resume();
    const same = A.cur && A.cur.card === card;
    if (A.cur) { fadeOut(A.cur.m); fadeOut(A.cur.a); A.cur.btn.setAttribute('aria-pressed', 'false'); A.cur = null; }
    if (same) { mixWeather(); return; }
    btn.setAttribute('aria-pressed', 'true'); const cur = { card, btn }; A.cur = cur;
    const [m, a] = await Promise.all([load('m-' + card.pl.music), load('a-' + card.pl.amb)]);
    if (A.cur !== cur) return;
    cur.m = m && loopOf(m, 0.5); cur.a = a && loopOf(a, 0.42); mixWeather();
  }
  async function mixWeather() {
    if (!A.ctx) return; const on = !!A.cur, want = { rain: on && WX === 'rain', wind: on && (WX === 'wind' || WX === 'snow') };
    for (const k of ['rain', 'wind']) {
      const vol = want[k] ? (A.cur.card.pl.interior ? 0.16 : 0.34) : 0;
      if (!A.wx[k] && vol > 0) { const b = await load('w-' + k); if (b && !A.wx[k]) A.wx[k] = loopOf(b, vol); }
      else if (A.wx[k]) A.wx[k].gn.gain.setTargetAtTime(vol, A.ctx.currentTime, 0.8);
    }
  }
})();
</script>
