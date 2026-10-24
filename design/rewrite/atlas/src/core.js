  const $ = (id) => document.getElementById(id);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rng = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const css = (c, a = 1) => `rgba(${c.map((v) => Math.round(clamp(v, 0, 255))).join(',')},${a})`;
  const ease = (t) => t * t * (3 - 2 * t);
  const smooth = (a, b, x) => ease(clamp((x - a) / (b - a), 0, 1));
  const noise = (t, k = 0) => (Math.sin(t + k * 1.7) + 0.6 * Math.sin(t * 1.618 + k * 3.1) + 0.3 * Math.sin(t * 2.718 + k * 0.6)) / 1.9;
  const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, system-ui, sans-serif';
  const SERIF = 'ui-serif, "New York", Newsreader, Georgia, serif';

  // ---------- light through the day: keyframes in local hours ----------
  const K = [
    { h: 0, sky: ['#0c0f18', '#1a2132', '#33405a'], gnd: ['#1a1f2b', '#0b0d13'], hill: ['#232b3d', '#151a26'], haze: '#96aad2', hazeA: .12, stars: 1, dark: 1, wall: ['#141d2c', '#273852'], floor: ['#18202e', '#0b0f17'], sea: ['#141a28', '#0a0d15'] },
    { h: 5, sky: ['#141826', '#2a2f45', '#5d5a72'], gnd: ['#262636', '#121219'], hill: ['#3a3a52', '#22222f'], haze: '#c8b4c8', hazeA: .2, stars: .6, dark: .95, wall: ['#1b2033', '#30344c'], floor: ['#1c1f2c', '#0e1018'], sea: ['#232637', '#10121b'] },
    { h: 6.5, sky: ['#3b4660', '#8d7f93', '#e3b9a7'], gnd: ['#5b5160', '#2c2630'], hill: ['#7d6f80', '#4a4050'], haze: '#ffd2be', hazeA: .35, stars: .1, dark: .45, wall: ['#463f52', '#6c5f6e'], floor: ['#3a3442', '#1c1820'], sea: ['#6b6476', '#332e3c'] },
    { h: 9, sky: ['#8fa3b5', '#b9c4c9', '#e3ddd0'], gnd: ['#8a8a80', '#5d5e58'], hill: ['#9aa0a2', '#707470'], haze: '#f0ece1', hazeA: .35, stars: 0, dark: 0, wall: ['#6f7a84', '#9aa09f'], floor: ['#5a5d5f', '#33363a'], sea: ['#8796a0', '#56636c'] },
    { h: 13, sky: ['#9bb0bf', '#c3ccd0', '#e6e2d8'], gnd: ['#918f84', '#64645d'], hill: ['#a2a7a8', '#777b77'], haze: '#f0ece1', hazeA: .35, stars: 0, dark: 0, wall: ['#78838b', '#a3a9a6'], floor: ['#62666a', '#393c40'], sea: ['#8c9ea8', '#5b6b74'] },
    { h: 16.5, sky: ['#8d9db0', '#c2bfbe', '#e8d6c0'], gnd: ['#8c8274', '#5b5249'], hill: ['#a49a92', '#756b64'], haze: '#fae1c3', hazeA: .35, stars: 0, dark: 0, wall: ['#75767c', '#a19a92'], floor: ['#5e5a58', '#36322f'], sea: ['#8a8f98', '#575b64'] },
    { h: 18.3, sky: ['#5d5f7a', '#b98c8c', '#f0bf98'], gnd: ['#6c5258', '#33252c'], hill: ['#8e6a72', '#553e48'], haze: '#ffc8a0', hazeA: .4, stars: 0, dark: .25, wall: ['#5d4e5a', '#8f6e6c'], floor: ['#4a3a3e', '#241a1e'], sea: ['#7c6470', '#3e3038'] },
    { h: 19.3, sky: ['#1f1a27', '#523a4d', '#d1a3a2'], gnd: ['#3a2935', '#17111a'], hill: ['#6e4c5e', '#3a2836'], haze: '#ffcdbe', hazeA: .28, stars: .4, dark: .8, wall: ['#2a2638', '#4a3c50'], floor: ['#241e2a', '#120e16'], sea: ['#3e2e3e', '#1a131c'] },
    { h: 20.8, sky: ['#111626', '#2a3350', '#6a6f8e'], gnd: ['#232634', '#10121a'], hill: ['#3c4260', '#232838'], haze: '#aab4dc', hazeA: .18, stars: .8, dark: 1, wall: ['#151b2d', '#2a3550'], floor: ['#181d2a', '#0c0f16'], sea: ['#1b2135', '#0c0f18'] },
  ];
  const KEYS = ['sky', 'gnd', 'hill', 'wall', 'floor', 'sea'];
  function light(h, wx = 'clear') {
    let i = K.length - 1; while (i > 0 && K[i].h > h) i--;
    const a = K[i], b = K[(i + 1) % K.length], span = ((b.h - a.h) + 24) % 24 || 24, t = ease(((h - a.h) + 24) % 24 / span);
    const m = (x, y) => mix(hex(x), hex(y), t), L = { h, wx };
    KEYS.forEach((k) => { L[k] = a[k].map((c, j) => m(c, b[k][j])); });
    L.haze = m(a.haze, b.haze); L.hazeA = a.hazeA + (b.hazeA - a.hazeA) * t; L.stars = a.stars + (b.stars - a.stars) * t; L.dark = a.dark + (b.dark - a.dark) * t;
    // weather changes the light itself: rain greys and darkens, fog lifts the haze and hides the stars, snow cools and brightens the ground
    const grey = (c, k, to = [128, 130, 138]) => mix(c, to, k);
    if (wx === 'rain') { KEYS.forEach((k) => { L[k] = L[k].map((c) => grey(c, 0.32).map((v) => v * 0.82)); }); L.stars = 0; L.hazeA += 0.08; L.haze = grey(L.haze, 0.5); }
    if (wx === 'fog') { const f = mix([206, 204, 200], [70, 76, 92], L.dark); KEYS.forEach((k) => { L[k] = L[k].map((c) => mix(c, f, 0.38)); }); L.stars = 0; L.hazeA = 0.62; L.haze = f; }
    if (wx === 'snow') { L.sky = L.sky.map((c) => grey(c, 0.3, [180, 186, 198])); L.gnd = L.gnd.map((c) => mix(c, mix([232, 234, 240], [96, 104, 128], L.dark), 0.78)); L.stars *= 0.3; L.hazeA += 0.1; L.haze = mix(L.haze, [220, 226, 238], 0.4); }
    return L;
  }

  // ---------- textures ----------
  const grain = (() => { const c = document.createElement('canvas'); c.width = c.height = 200; const g = c.getContext('2d'), d = g.createImageData(200, 200), r = rng(7); for (let i = 0; i < d.data.length; i += 4) { const v = 70 + r() * 120; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } g.putImageData(d, 0, 0); return c; })();
  const weave = (() => { const c = document.createElement('canvas'); c.width = c.height = 6; const g = c.getContext('2d'); g.fillStyle = '#808080'; g.fillRect(0, 0, 6, 6); g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, 3, 2); g.fillRect(3, 3, 3, 2); g.fillStyle = '#6a6a6a'; g.fillRect(0, 2, 6, 1); g.fillRect(2, 0, 1, 6); g.fillRect(5, 0, 1, 6); return c; })();
  const canFilter = 'filter' in (document.createElement('canvas').getContext('2d') || {});

  // ---------- brushes ----------
  function vgrad(g, y0, y1, stops) { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
  function glow(g, x, y, r, c, a) { if (a <= 0.003 || r <= 0) return; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, css(c, a)); gr.addColorStop(1, css(c, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  function wash(g, x0, y0, w, h, seed, n) { const r = rng(seed); for (let i = 0; i < n; i++) glow(g, x0 + r() * w, y0 + r() * h, w * (0.25 + r() * 0.5), i % 2 ? [255, 235, 225] : [10, 6, 14], 0.04 + r() * 0.06); }
  function ridge(w, base, amp, seed) { const r = rng(seed), a1 = r() * 6, a2 = r() * 6, f1 = 1.5 + r() * 2, f2 = 4 + r() * 4; return (x) => base - amp * (0.55 + 0.35 * Math.sin((x / w) * f1 * Math.PI + a1) + 0.1 * Math.sin((x / w) * f2 * Math.PI + a2)); }
  function hills(g, w, base, amp, c, seed) { const f = ridge(w, base, amp, seed); g.beginPath(); g.moveTo(0, base); for (let x = 0; x <= w; x += 4) g.lineTo(x, f(x)); g.lineTo(w, base + 2); g.lineTo(0, base + 2); g.closePath(); g.fillStyle = vgrad(g, base - amp * 1.1, base, [[0, css(c, 0.55)], [1, css(c, 1)]]); g.fill(); return f; }
  function stars(g, x0, y0, w, h, seed, n, a) { if (a < 0.02) return; const r = rng(seed); for (let i = 0; i < n; i++) { g.fillStyle = `rgba(236,230,220,${(0.4 + r() * 0.5) * a})`; g.fillRect(x0 + r() * w, y0 + r() * h, 1.1 + r(), 1.1 + r()); } }
  function moon(g, x, y, r, a) { g.save(); g.beginPath(); g.arc(x, y, r, 0, 7); g.clip(); g.fillStyle = `rgba(238,232,220,${a})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.arc(x + r * 0.42, y - r * 0.22, r * 0.86, 0, 7); g.fill('evenodd'); g.restore(); }
  function finish(g, w, h, vig = 0.5) {
    g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.15; g.fillStyle = g.createPattern(grain, 'repeat'); g.fillRect(0, 0, w, h); g.restore();
    const v = g.createRadialGradient(w / 2, h * 0.45, h * 0.25, w / 2, h * 0.45, h * 0.78); v.addColorStop(0, 'rgba(8,6,10,0)'); v.addColorStop(1, `rgba(8,6,10,${vig})`); g.fillStyle = v; g.fillRect(0, 0, w, h);
  }
  function sunPos(w, hz, h) { if (h <= 6 || h >= 18.6) return null; const t = (h - 6) / 12.6; return { x: w * (0.1 + 0.8 * t), y: hz - Math.sin(t * Math.PI) * hz * 0.75, warm: 1 - Math.sin(t * Math.PI) }; }
  function sky(g, w, hz, L, seed = 3, moonAt = [0.78, 0.22]) {
    g.fillStyle = vgrad(g, 0, hz, [[0, css(L.sky[0])], [0.55, css(L.sky[1])], [1, css(L.sky[2])]]); g.fillRect(0, 0, w, hz);
    wash(g, 0, 0, w, hz, seed, 10); stars(g, 0, 0, w, hz * 0.55, seed + 1, 30, L.stars);
    if (L.wx === 'clear' || L.wx === 'wind') {
      const s = sunPos(w, hz, L.h);
      if (s) { glow(g, s.x, s.y, w * 0.35, mix([255, 245, 225], [255, 190, 140], s.warm), 0.35); g.fillStyle = css(mix([255, 250, 238], [255, 214, 170], s.warm), 0.9); g.beginPath(); g.arc(s.x, s.y, w * 0.028, 0, 7); g.fill(); }
      if (L.stars > 0.15) { glow(g, w * moonAt[0], hz * moonAt[1], w * 0.12, [200, 210, 235], 0.12 * L.stars); moon(g, w * moonAt[0], hz * moonAt[1], w * 0.018, Math.min(1, L.stars)); }
    }
    glow(g, w * 0.5, hz, w * 0.95, L.haze, L.hazeA);
  }
  function ground(g, w, h, y0, L, seed = 9) {
    g.fillStyle = vgrad(g, y0, h, [[0, css(L.gnd[0])], [1, css(L.gnd[1])]]); g.fillRect(0, y0, w, h - y0); wash(g, 0, y0, w, h - y0, seed, 6);
    if (L.wx === 'rain') { g.fillStyle = 'rgba(6,8,14,.18)'; g.fillRect(0, y0, w, h - y0); }
  }
  // a warm light on a wet street makes a long soft column beneath it
  function reflect(g, x, y0, y1, wd, c, a) { if (a <= 0.01) return; const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, css(c, a)); gr.addColorStop(1, css(c, 0)); g.fillStyle = gr; g.save(); g.filter = canFilter ? 'blur(3px)' : 'none'; g.fillRect(x - wd / 2, y0, wd, y1 - y0); g.restore(); }
  function ink(L, k = 0.6, base) { return css(mix(base || L.gnd[1], [6, 4, 8], k)); }
  // a bare tree, drawn as tapering branches that split
  function tree(g, x, y, len, ang, wdt, depth, r, c) {
    if (depth === 0 || len < 2) return; const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    g.strokeStyle = c; g.lineWidth = wdt; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo((x + x2) / 2 + (r() - 0.5) * len * 0.2, (y + y2) / 2, x2, y2); g.stroke();
    const n = depth > 3 ? 2 : 2 + (r() < 0.4 ? 1 : 0);
    for (let i = 0; i < n; i++) tree(g, x2, y2, len * (0.62 + r() * 0.18), ang + (r() - 0.5) * 1.1 + (i - (n - 1) / 2) * 0.5, wdt * 0.66, depth - 1, r, c);
  }
  // lights a critter from the place's own light: the sky by day, the lamp after dark
  function lightT(L, a, src, warm = 0) {
    const amb = mix([255, 250, 242], [176, 180, 214], L.dark), k = 1 - 0.24 * L.dark;
    const lit = (c) => mix(c.map((v, i) => v * amb[i] / 255 * k), [255, 200, 140], 0.1 * L.dark + warm);
    let lx = src.x - a.x, ly = src.y - (a.y - a.s * 0.6); const m = Math.hypot(lx, ly) || 1; lx /= m; ly /= m;
    return { lx, ly, lit, shade: css(mix([196, 186, 208], [118, 118, 166], L.dark)), ao: css(mix([150, 140, 160], [90, 90, 130], L.dark)), rim: css(L.dark > 0.5 || warm > 0.1 ? [255, 206, 150] : [255, 242, 226]), rimA: 0.42 + 0.4 * Math.max(L.dark, warm * 2), grainA: 0.7 - 0.38 * L.dark };
  }

  // ---------- weather in the air: rain, snow, fog drift and wind-blown leaves ----------
  class Air {
    constructor() { this.parts = []; this.kind = ''; this.w = 0; }
    reset(kind, w, h) {
      this.kind = kind; this.w = w; this.h = h; const r = rng(Math.round(w) + kind.length * 17); this.parts = [];
      const n = kind === 'rain' ? 110 : kind === 'snow' ? 90 : kind === 'wind' ? 9 : kind === 'fog' ? 5 : 0;
      for (let i = 0; i < n; i++) this.parts.push({ x: r() * w, y: r() * h, z: 0.35 + r() * 0.65, p: r() * 6.28, s: r() });
    }
    draw(g, dt, now, clip) {
      const { w, h } = this; if (!this.parts.length) return;
      g.save(); if (clip) { g.beginPath(); clip.forEach(([x, y, cw, ch]) => g.rect(x, y, cw, ch)); g.clip(); }
      if (this.kind === 'rain') { g.strokeStyle = 'rgba(214,222,236,.32)'; g.lineCap = 'round'; for (const p of this.parts) { p.y += dt * h * (1.4 + p.z); p.x += dt * w * 0.06; if (p.y > h) { p.y = -10; p.x = Math.random() * w; } if (p.x > w) p.x -= w; g.lineWidth = 0.6 + p.z * 0.6; g.globalAlpha = 0.4 + p.z * 0.6; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - w * 0.006, p.y - h * 0.02 * p.z); g.stroke(); } }
      if (this.kind === 'snow') { g.fillStyle = 'rgba(244,244,248,.85)'; for (const p of this.parts) { p.y += dt * h * 0.05 * (0.5 + p.z); p.x += Math.sin(now / 1400 + p.p) * dt * 8 * p.z; if (p.y > h) { p.y = -4; p.x = Math.random() * w; } g.globalAlpha = 0.35 + p.z * 0.6; g.beginPath(); g.arc(p.x, p.y, 0.6 + p.z * 1.5, 0, 7); g.fill(); } }
      if (this.kind === 'fog') { for (const p of this.parts) { const x = ((p.x + now * 0.004 * p.z) % (w * 1.6)) - w * 0.3, y = h * (0.35 + p.s * 0.5); glow(g, x, y, w * (0.5 + p.z * 0.4), [222, 222, 226], 0.1 + p.z * 0.07); } }
      if (this.kind === 'wind') { for (const p of this.parts) { p.x += dt * w * (0.25 + p.z * 0.25); p.y += Math.sin(now / 300 + p.p) * dt * 20; if (p.x > w + 10) { p.x = -10; p.y = h * (0.3 + Math.random() * 0.6); } g.save(); g.translate(p.x, p.y); g.rotate(now / 240 * (p.z + 0.4) + p.p); g.fillStyle = 'rgba(60,46,40,.75)'; g.beginPath(); g.ellipse(0, 0, 3 + p.z * 2.5, 1.4 + p.z, 0, 0, 7); g.fill(); g.restore(); } }
      g.restore(); g.globalAlpha = 1;
    }
  }
