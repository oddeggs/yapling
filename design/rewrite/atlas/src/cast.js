  class Spring { constructor(k, c, x = 0) { this.k = k; this.c = c; this.x = x; this.v = 0; this.t = x; } step(dt) { const a = -this.k * (this.x - this.t) - this.c * this.v; this.v += a * dt; this.x += this.v * dt; return this.x; } kick(v) { this.v += v; } }
  const rot = (x, y, px, py, a) => { const c = Math.cos(a), s = Math.sin(a), dx = x - px, dy = y - py; return [px + dx * c - dy * s, py + dx * s + dy * c]; };
  function catmull(pts, closed = true) {
    const p = new Path2D(), n = pts.length; p.moveTo(pts[0][0], pts[0][1]); const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) { const p0 = pts[closed ? (i - 1 + n) % n : Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[closed ? (i + 2) % n : Math.min(i + 2, n - 1)];
      p.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]); }
    if (closed) p.closePath(); return p;
  }
  const BOX = new Path2D(); BOX.rect(-3, -3, 6, 6);
  const outside = (p, dx, dy) => { const q = new Path2D(BOX); q.addPath(p, { a: 1, b: 0, c: 0, d: 1, e: dx, f: dy }); return q; };
  function ribbon(pts, W, tip = 'round') {
    const n = pts.length, Lp = [], Rp = [], dirs = [];
    for (let i = 0; i < n; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m; dirs.push([dx, dy]); const w = W[Math.min(i, W.length - 1)] / 2; Lp.push([pts[i][0] - dy * w, pts[i][1] + dx * w]); Rp.push([pts[i][0] + dy * w, pts[i][1] - dx * w]); }
    const p = new Path2D(), mid = (u, v) => [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2];
    p.moveTo(Lp[0][0], Lp[0][1]); let m0 = mid(Lp[0], Lp[1]); p.lineTo(m0[0], m0[1]);
    for (let i = 1; i < n - 1; i++) { const m1 = mid(Lp[i], Lp[i + 1]); p.quadraticCurveTo(Lp[i][0], Lp[i][1], m1[0], m1[1]); }
    p.lineTo(Lp[n - 1][0], Lp[n - 1][1]);
    const d = dirs[n - 1], wt = W[Math.min(n - 1, W.length - 1)];
    if (tip === 'round') p.bezierCurveTo(Lp[n - 1][0] + d[0] * wt * 0.8, Lp[n - 1][1] + d[1] * wt * 0.8, Rp[n - 1][0] + d[0] * wt * 0.8, Rp[n - 1][1] + d[1] * wt * 0.8, Rp[n - 1][0], Rp[n - 1][1]);
    else if (tip === 'point') { const c = pts[n - 1]; p.lineTo(c[0] + d[0] * wt * 1.6, c[1] + d[1] * wt * 1.6); p.lineTo(Rp[n - 1][0], Rp[n - 1][1]); }
    else { const c = pts[n - 1]; p.lineTo(c[0] - d[0] * wt * 0.35, c[1] - d[1] * wt * 0.35); p.lineTo(Rp[n - 1][0], Rp[n - 1][1]); }
    m0 = mid(Rp[n - 1], Rp[n - 2]); p.lineTo(m0[0], m0[1]);
    for (let i = n - 2; i > 0; i--) { const m1 = mid(Rp[i], Rp[i - 1]); p.quadraticCurveTo(Rp[i][0], Rp[i][1], m1[0], m1[1]); }
    p.lineTo(Rp[0][0], Rp[0][1]); p.closePath(); return p;
  }
  function seg(pts, f0, f1) {
    const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const tot = L[L.length - 1], at = (f) => { const d = f * tot; if (d >= tot) { const a = pts[pts.length - 2], b = pts[pts.length - 1], m = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ex = d - tot; return [b[0] + (b[0] - a[0]) / m * ex, b[1] + (b[1] - a[1]) / m * ex]; } let i = 1; while (L[i] < d) i++; const t = (d - L[i - 1]) / (L[i] - L[i - 1]); return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]; };
    const out = [at(f0)]; for (let i = 1; i < pts.length; i++) if (L[i] / tot > f0 && L[i] / tot < f1) out.push(pts[i]); out.push(at(f1)); return out;
  }
  function seed(w, h) { const p = new Path2D(); p.moveTo(0, -h / 2); p.bezierCurveTo(w * 0.62, -h / 2, w * 0.5, h * 0.3, 0, h / 2); p.bezierCurveTo(-w * 0.5, h * 0.3, -w * 0.62, -h / 2, 0, -h / 2); return p; }
  function blob(pts) { return catmull(pts); }
  const poly = (pts) => { const p = new Path2D(); pts.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath(); return p; };
  const mirrorHalf = (half) => half.map(([x, y, e]) => [x, y, e ? 1 : 0]).concat(half.slice(1, -1).reverse().map(([x, y, e]) => [-x, y, e ? 2 : 0]));

  // =====================================================================
  // the cast: each one is a silhouette, a face, colours, and a few pieces on springs
  // =====================================================================
  const CAST = [
    { id: 'pip', name: 'Pip', species: 'Red panda', role: 'Your roommate', title: 'Moved In, More Or Less', wall: [92, 108, 128], floor: [62, 70, 84],
      note: '<b>Signature:</b> the red scarf, the only red thing in town. Curious and easily delighted: big ear flicks, a hop when something is new.',
      base: [238, 232, 222], dark: [40, 30, 32], mark: [96, 68, 58], accent: [222, 72, 56],
      half: [[0, 0], [0.17, -0.004], [0.262, -0.05], [0.296, -0.17], [0.287, -0.34], [0.252, -0.52], [0.228, -0.64], [0.238, -0.72], [0.266, -0.772], [0.238, -0.798], [0.226, -0.86], [0.19, -0.93], [0.178, -0.998, 1], [0.197, -1.112, 1], [0.188, -1.148, 1], [0.16, -1.128, 1], [0.112, -1.036, 1], [0.058, -1.0], [0, -0.992]],
      ear: { pivot: [0.15, -1.0], rest: 0.32, inner: [[0.168, -1.01], [0.188, -1.11], [0.172, -1.115], [0.128, -1.04]] },
      head: [0.56, 0.78, -0.66], eyes: { x: 0.088, y: -0.802, w: 0.032, h: 0.046 }, nose: { y: -0.758, w: 0.044, h: 0.024 },
      tail: { root: [0.17, -0.08], rest: [[0, 0], [0.17, 0.08], [0.37, 0.1], [0.56, 0.05], [0.69, -0.07], [0.74, -0.24], [0.69, -0.39], [0.58, -0.45]], w: [0.1, 0.13, 0.145, 0.14, 0.13, 0.115, 0.095, 0.07], bands: [[0.17, 0.27], [0.37, 0.47], [0.57, 0.67], [0.78, 1.3]], band: 'mark' },
      arms: { sh: 0.19, shy: -0.56, rest: [0.075, -0.25], up: [0.31, -0.52], L: 0.19, w: 0.08, paw: 'dark' }, feet: 'dark',
      marks(c, d, P, T) { c.save(); c.filter = blurU(0.012); c.strokeStyle = css(T.mark, 0.6); c.lineCap = 'round'; c.lineWidth = 0.028; [-1, 1].forEach((s) => { const f = P.turn * 0.035, a = d(s * 0.075 + f, -0.785), b = d(s * 0.1 + f, -0.735), e = d(s * 0.118 + f, -0.69); c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo(b[0], b[1], e[0], e[1]); c.stroke(); }); c.restore(); },
      front(c, d, P, T, st) { scarf(c, d, P, T, st, -0.676, -0.612, 0.245); },
      tempo: { beat: [200, 330], size: 0.5 } },
    { id: 'linh', name: 'Linh', species: 'Pangolin', role: 'Next door · the Library desk', title: 'I Used To Freeze Too', wall: [116, 128, 106], floor: [80, 86, 70],
      note: '<b>Signature:</b> a library book held to her chest, and armour she doesn\'t need with you. Calm: slow blinks, small nods, never hurried.',
      base: [184, 150, 108], dark: [52, 40, 32], mark: [140, 108, 74], accent: [70, 98, 102], face: [214, 188, 156],
      half: [[0, 0], [0.18, -0.004], [0.28, -0.06], [0.315, -0.2], [0.305, -0.38], [0.258, -0.55], [0.2, -0.67], [0.17, -0.75], [0.158, -0.83], [0.135, -0.92], [0.085, -0.98], [0, -1.0]],
      held: true, head: [0.62, 0.8, -0.72], eyes: { x: 0.062, y: -0.88, w: 0.024, h: 0.032 }, nose: { y: -0.82, w: 0.032, h: 0.018 },
      tail: { root: [0.2, -0.06], rest: [[0, 0], [0.16, 0.06], [0.34, 0.07], [0.5, 0.02], [0.6, -0.08], [0.62, -0.2], [0.55, -0.28]], w: [0.2, 0.2, 0.18, 0.15, 0.12, 0.09, 0.06], bands: [[0.1, 0.2], [0.3, 0.4], [0.5, 0.6], [0.7, 0.8], [0.9, 1.3]], band: 'mark', point: true },
      arms: { sh: 0.2, shy: -0.6, rest: [0.07, -0.46], up: [0.3, -0.58], L: 0.16, w: 0.075, paw: 'dark' }, feet: 'dark',
      marks(c, d, P, T) {
        // the face: a soft pale mask down the narrow head
        c.fillStyle = css(T.face); c.fill(catmull([[0, -0.99], [0.09, -0.94], [0.11, -0.86], [0.075, -0.8], [0, -0.785], [-0.075, -0.8], [-0.11, -0.86], [-0.09, -0.94]].map(([x, y]) => d(x + P.turn * 0.02, y))));
        // scales: pointed shields in rows, each riding the body's bend
        for (let r = 0, y = -0.72; y < -0.02; r++, y += 0.07) for (let x = -0.36 + (r % 2) * 0.045; x < 0.37; x += 0.09) {
          const p = d(x, y), s = 0.05 + 0.008 * (1 - (-y)); c.save(); c.translate(p[0], p[1]); c.rotate(P.tilt * 0.2);
          const q = new Path2D(); q.moveTo(-s, -s * 0.5); q.bezierCurveTo(-s, -s * 1.1, s, -s * 1.1, s, -s * 0.5); q.bezierCurveTo(s * 0.9, s * 0.2, s * 0.25, s * 0.7, 0, s * 0.95); q.bezierCurveTo(-s * 0.25, s * 0.7, -s * 0.9, s * 0.2, -s, -s * 0.5);
          c.fillStyle = css(T.mark); c.fill(q); c.fillStyle = css(T.base, 0.55); c.translate(0, -s * 0.12); c.scale(0.8, 0.55); c.fill(q); c.restore();
        }
      },
      front(c, d, P, T) { // the book
        const a = d(-0.13, -0.62), b = d(0.13, -0.62), e = d(0.13, -0.42), f = d(-0.13, -0.42);
        const bk = catmull([a, [(a[0] + b[0]) / 2, a[1] - 0.006], b, [b[0] + 0.004, (b[1] + e[1]) / 2], e, [(e[0] + f[0]) / 2, e[1] + 0.004], f, [f[0] - 0.004, (f[1] + a[1]) / 2]]);
        paintForm(c, bk, T.accent, { sd: 0.04, rw: 0.012 }); c.fillStyle = css(mix(T.accent, [240, 230, 210], 0.6)); c.fillRect(Math.min(a[0], f[0]) + 0.012, a[1] + 0.035, 0.02, 0.12);
      },
      tempo: { beat: [300, 520], size: 0.32 } },
    { id: 'mei', name: 'Mei', species: 'Otter', role: 'Lantern Café', title: 'Kaya Toast, Probably', wall: [168, 120, 124], floor: [118, 78, 84],
      note: '<b>Signature:</b> her mustard apron and whiskers that twitch when she laughs. Quick and funny: fast beats, big leans, a laugh-bounce on every joke.',
      base: [128, 92, 70], dark: [42, 30, 26], mark: [92, 64, 48], accent: [204, 166, 92], face: [226, 210, 186],
      half: [[0, 0], [0.15, -0.004], [0.22, -0.05], [0.245, -0.18], [0.228, -0.38], [0.196, -0.56], [0.172, -0.7], [0.19, -0.79], [0.212, -0.86], [0.19, -0.93], [0.168, -0.965, 1], [0.196, -1.0, 1], [0.182, -1.03, 1], [0.142, -1.018, 1], [0.1, -1.045], [0, -1.055]],
      ear: { pivot: [0.15, -1.0], rest: 0.2, inner: null },
      head: [0.62, 0.82, -0.74], eyes: { x: 0.074, y: -0.905, w: 0.026, h: 0.036 }, nose: { y: -0.86, w: 0.06, h: 0.03 },
      tail: { root: [0.16, -0.06], rest: [[0, 0], [0.18, 0.06], [0.38, 0.06], [0.55, 0.0], [0.64, -0.1], [0.66, -0.2]], w: [0.14, 0.13, 0.11, 0.085, 0.06, 0.04], point: true },
      arms: { sh: 0.17, shy: -0.62, rest: [0.06, -0.3], up: [0.3, -0.62], L: 0.19, w: 0.07, paw: 'dark' }, feet: 'dark',
      marks(c, d, P, T) {
        const f = P.turn * 0.03; c.fillStyle = css(T.face);
        c.fill(catmull([[0, -0.74], [0.11, -0.71], [0.16, -0.62], [0.15, -0.4], [0, -0.33], [-0.15, -0.4], [-0.16, -0.62], [-0.11, -0.71]].map(([x, y]) => d(x, y))));
        c.fill(catmull([[0, -0.9], [0.1, -0.88], [0.14, -0.84], [0.12, -0.8], [0, -0.78], [-0.12, -0.8], [-0.14, -0.84], [-0.1, -0.88]].map(([x, y]) => d(x + f, y))));
        c.fill(catmull([[-0.07, -0.95], [-0.05, -0.965], [-0.03, -0.955], [-0.05, -0.94]].map(([x, y]) => d(x + f, y)))); c.fill(catmull([[0.07, -0.95], [0.05, -0.965], [0.03, -0.955], [0.05, -0.94]].map(([x, y]) => d(x + f, y))));
      },
      front(c, d, P, T, st) {
        const ap = catmull([[-0.16, -0.36], [0, -0.345], [0.16, -0.36], [0.17, -0.24], [0.14, -0.12], [0, -0.1], [-0.14, -0.12], [-0.17, -0.24]].map(([x, y]) => d(x, y)));
        c.save(); c.clip(st.body); paintForm(c, ap, T.accent, { sd: 0.05, rw: 0.012, rim: 0.6 }); c.restore();
        // whiskers twitch with the talk
        c.strokeStyle = css(T.face, 0.7); c.lineWidth = 0.007; c.lineCap = 'round';
        [-1, 1].forEach((s) => [0, 1, 2].forEach((i) => { const a = d(s * 0.1 + P.turn * 0.03, -0.84 + i * 0.012), tw = Math.sin(st.t / 90 + i) * 0.01 * (P.env + 0.2); c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo(a[0] + s * 0.07, a[1] - 0.01 + i * 0.008 + tw, a[0] + s * 0.14, a[1] + (i - 1) * 0.025 + tw); c.stroke(); }));
      },
      tempo: { beat: [150, 260], size: 0.7, laugh: true } },
    { id: 'sol', name: 'Sol', species: 'Tarsier', role: 'Hollowbrook office', title: 'Just To Confirm', wall: [84, 116, 118], floor: [56, 78, 80],
      note: '<b>Signature:</b> enormous eyes that notice everything, and a clipboard. Precise: small quick nods, a head-swivel when something catches their eye.',
      base: [176, 154, 128], dark: [40, 30, 26], mark: [128, 104, 84], accent: [222, 214, 196], inner: [212, 172, 150],
      half: [[0, 0], [0.13, -0.004], [0.2, -0.05], [0.222, -0.16], [0.2, -0.31], [0.168, -0.42], [0.2, -0.49], [0.272, -0.56], [0.31, -0.68], [0.296, -0.8], [0.25, -0.88], [0.205, -0.925, 1], [0.29, -1.04, 1], [0.322, -1.115, 1], [0.27, -1.14, 1], [0.2, -1.07, 1], [0.12, -0.975], [0.06, -0.962], [0, -0.96]],
      sleepEar: -0.12, sleepSquash: 0.26, held: true, ear: { pivot: [0.2, -0.95], rest: 0.12, inner: [[0.215, -0.955], [0.286, -1.05], [0.3, -1.1], [0.266, -1.115], [0.212, -1.05]] },
      head: [0.42, 0.56, -0.48], eyes: { x: 0.125, y: -0.72, w: 0.15, h: 0.165, big: true }, nose: { y: -0.6, w: 0.026, h: 0.014 },
      tail: { root: [0.12, -0.1], rest: [[0, 0], [0.16, 0.0], [0.3, -0.1], [0.38, -0.28], [0.4, -0.48], [0.37, -0.66], [0.32, -0.78]], w: [0.035, 0.03, 0.028, 0.026, 0.026, 0.04, 0.06] },
      arms: { sh: 0.16, shy: -0.42, rest: [0.07, -0.26], up: [0.26, -0.5], L: 0.15, w: 0.055, paw: 'base' }, feet: 'base',
      front(c, d, P, T) {
        const a = d(-0.11, -0.4), b = d(0.11, -0.4), e = d(0.11, -0.16), f = d(-0.11, -0.16);
        paintForm(c, poly([a, b, e, f]), T.accent, { sd: 0.03, rw: 0.01, rim: 0.5 });
        c.fillStyle = css(T.dark); const m = d(0, -0.4); c.fillRect(m[0] - 0.035, m[1] - 0.012, 0.07, 0.03);
        c.strokeStyle = css(T.dark, 0.35); c.lineWidth = 0.008; [0.0, 0.045, 0.09].forEach((o) => { const p = d(-0.07, -0.33 + o), q = d(0.07, -0.33 + o); c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke(); });
      },
      tempo: { beat: [170, 240], size: 0.35 } },
    { id: 'hank', name: 'Hank', species: 'Raccoon', role: 'Café regular · shipping', title: 'Ten Percent And We\'re Friends', wall: [150, 128, 92], floor: [104, 86, 60],
      note: '<b>Signature:</b> the bandit mask, a flat cap and a ringed tail. Loud and fast: big beats, leans in on every number, a finger up for "Deal?"',
      base: [134, 134, 138], dark: [30, 28, 32], mark: [56, 54, 60], accent: [72, 64, 58], face: [226, 224, 220],
      half: [[0, 0], [0.19, -0.004], [0.29, -0.06], [0.33, -0.2], [0.318, -0.38], [0.276, -0.54], [0.244, -0.64], [0.262, -0.72], [0.302, -0.775], [0.262, -0.8], [0.246, -0.86], [0.205, -0.925], [0.19, -0.975, 1], [0.222, -1.08, 1], [0.205, -1.11, 1], [0.165, -1.09, 1], [0.112, -1.0, 1], [0.05, -0.982], [0, -0.978]],
      ear: { pivot: [0.155, -0.98], rest: 0.36, inner: [[0.178, -0.985], [0.206, -1.07], [0.188, -1.08], [0.13, -1.005]] },
      head: [0.56, 0.78, -0.66], eyes: { x: 0.1, y: -0.82, w: 0.03, h: 0.04, light: true }, nose: { y: -0.755, w: 0.05, h: 0.028 },
      tail: { root: [0.18, -0.08], rest: [[0, 0], [0.18, 0.08], [0.38, 0.09], [0.56, 0.03], [0.68, -0.09], [0.72, -0.25], [0.66, -0.4]], w: [0.12, 0.16, 0.175, 0.17, 0.155, 0.13, 0.09], bands: [[0.15, 0.26], [0.36, 0.47], [0.57, 0.68], [0.8, 1.3]], band: 'dark' },
      arms: { sh: 0.2, shy: -0.56, rest: [0.08, -0.26], up: [0.33, -0.6], L: 0.2, w: 0.085, paw: 'dark' }, feet: 'dark',
      marks(c, d, P, T) {
        const f = P.turn * 0.035; c.fillStyle = css(T.face);
        c.fill(catmull([[0, -0.84], [0.1, -0.79], [0.14, -0.74], [0.1, -0.69], [0, -0.68], [-0.1, -0.69], [-0.14, -0.74], [-0.1, -0.79]].map(([x, y]) => d(x + f, y))));
        [-1, 1].forEach((s) => c.fill(catmull([[s * 0.04, -0.9], [s * 0.12, -0.915], [s * 0.18, -0.885], [s * 0.1, -0.87]].map(([x, y]) => d(x + f, y)))));
        c.save(); c.filter = blurU(0.008); c.fillStyle = css(T.mark);
        c.fill(catmull([[0, -0.845], [0.08, -0.86], [0.17, -0.85], [0.24, -0.8], [0.2, -0.775], [0.13, -0.785], [0.05, -0.8], [0, -0.79], [-0.05, -0.8], [-0.13, -0.785], [-0.2, -0.775], [-0.24, -0.8], [-0.17, -0.85], [-0.08, -0.86]].map(([x, y]) => d(x + f, y)))); c.restore();
      },
      front(c, d, P, T) { // flat cap
        const pts = [[-0.17, -0.94], [-0.12, -0.995], [0, -1.015], [0.12, -0.995], [0.17, -0.94], [0.2, -0.915], [0.06, -0.905], [-0.1, -0.915]].map(([x, y]) => d(x + P.turn * 0.02, y));
        paintForm(c, catmull(pts), T.accent, { sd: 0.04, rw: 0.012 });
      },
      tempo: { beat: [130, 220], size: 0.85 } },
    { id: 'nell', name: 'Nell', species: 'Koala', role: 'Lantern Inn front desk', title: 'No Worries, We\'ll Sort It', wall: [128, 108, 128], floor: [86, 70, 88],
      note: '<b>Signature:</b> fluffy fan ears, a big nose and a cup of tea that never spills. Unflappable: slow, easy beats and a sip when she thinks.',
      base: [156, 158, 164], dark: [34, 32, 36], mark: [118, 120, 128], accent: [232, 224, 208], face: [228, 226, 222],
      half: [[0, 0], [0.2, -0.004], [0.31, -0.07], [0.35, -0.22], [0.335, -0.42], [0.285, -0.58], [0.27, -0.7], [0.28, -0.8], [0.25, -0.88], [0.19, -0.935], [0.1, -0.968], [0, -0.978]],
      held: true, sideEars: { at: [0.27, -0.9], rest: 0.15 },
      head: [0.58, 0.78, -0.66], eyes: { x: 0.115, y: -0.83, w: 0.026, h: 0.034 }, nose: { y: -0.765, w: 0.11, h: 0.14, big: true },
      arms: { sh: 0.22, shy: -0.6, rest: [0.07, -0.47], up: [0.3, -0.6], L: 0.17, w: 0.085, paw: 'dark' }, feet: 'dark',
      marks(c, d, P, T) { c.fillStyle = css(T.face, 0.85); c.fill(catmull([[0, -0.66], [0.13, -0.6], [0.17, -0.45], [0.13, -0.3], [0, -0.26], [-0.13, -0.3], [-0.17, -0.45], [-0.13, -0.6]].map(([x, y]) => d(x, y)))); },
      front(c, d, P, T) { // teacup and saucer
        const m = d(0, -0.5); c.save(); c.translate(m[0], m[1]); c.rotate(P.tilt * 0.3);
        const cup = new Path2D(); cup.moveTo(-0.075, -0.05); cup.lineTo(0.075, -0.05); cup.bezierCurveTo(0.072, 0.02, 0.05, 0.05, 0, 0.05); cup.bezierCurveTo(-0.05, 0.05, -0.072, 0.02, -0.075, -0.05); paintForm(c, cup, T.accent, { sd: 0.03, rw: 0.01 });
        c.strokeStyle = css(T.accent); c.lineWidth = 0.014; c.beginPath(); c.moveTo(0.072, -0.03); c.quadraticCurveTo(0.12, -0.02, 0.07, 0.025); c.stroke();
        const sc = new Path2D(); sc.moveTo(-0.12, 0.05); sc.quadraticCurveTo(0, 0.035, 0.12, 0.05); sc.quadraticCurveTo(0, 0.085, -0.12, 0.05); paintForm(c, sc, T.accent, { sd: 0.02, rw: 0.008 }); c.restore();
      },
      tempo: { beat: [320, 520], size: 0.4 } },
    { id: 'bea', name: 'Bea', species: 'Bulldog', role: 'Bus 45 driver', title: 'Hold Tight, Love', wall: [98, 122, 112], floor: [66, 84, 76],
      note: '<b>Signature:</b> the driver\'s cap with its little badge, and jowls that wobble a beat late. Cheerful and brisk: bouncy beats and a nod to send you off.',
      base: [196, 164, 124], dark: [40, 30, 28], mark: [150, 118, 86], accent: [52, 62, 86], face: [236, 228, 214],
      half: [[0, 0], [0.22, -0.004], [0.34, -0.07], [0.372, -0.22], [0.352, -0.4], [0.3, -0.54], [0.33, -0.62], [0.36, -0.7], [0.335, -0.79], [0.286, -0.862], [0.262, -0.89, 1], [0.336, -0.925, 1], [0.31, -0.962, 1], [0.21, -0.945, 1], [0.1, -0.945], [0, -0.945]],
      ear: { pivot: [0.25, -0.9], rest: 0.0, inner: null },
      head: [0.52, 0.72, -0.6], eyes: { x: 0.15, y: -0.81, w: 0.03, h: 0.036 }, nose: { y: -0.75, w: 0.08, h: 0.04 },
      arms: { sh: 0.25, shy: -0.5, rest: [0.1, -0.24], up: [0.36, -0.55], L: 0.18, w: 0.1, paw: 'base' }, feet: 'base',
      marks(c, d, P, T) {
        const f = P.turn * 0.03; c.fillStyle = css(T.face);
        c.fill(catmull([[0, -0.86], [0.05, -0.8], [0.18, -0.74], [0.24, -0.66], [0.14, -0.6], [0, -0.62], [-0.14, -0.6], [-0.24, -0.66], [-0.18, -0.74], [-0.05, -0.8]].map(([x, y]) => d(x + f, y))));
        c.fill(catmull([[0, -0.56], [0.12, -0.5], [0.13, -0.3], [0, -0.22], [-0.13, -0.3], [-0.12, -0.5]].map(([x, y]) => d(x, y))));
      },
      front(c, d, P, T) { // driver's cap with a badge
        const f = P.turn * 0.02, pts = [[-0.2, -0.9], [-0.18, -0.98], [0, -1.01], [0.18, -0.98], [0.2, -0.9], [0.27, -0.88], [0, -0.87], [-0.27, -0.88]].map(([x, y]) => d(x + f, y));
        paintForm(c, catmull(pts), T.accent, { sd: 0.04, rw: 0.012 });
        const b = d(f, -0.94); c.save(); c.translate(b[0], b[1]); c.rotate(P.tilt); c.fillStyle = css([226, 200, 130]); c.fill(seed(0.05, 0.04)); c.restore();
      },
      tempo: { beat: [180, 280], size: 0.6, jowl: true } },
    { id: 'dex', name: 'Dex', species: 'Bison', role: 'The interview room', title: 'Can You Give Me A Number?', wall: [118, 112, 92], floor: [80, 74, 60], scale: 1.12,
      note: '<b>Signature:</b> the hump, small pale horns and a mustard tie. Measured: deep, slow nods, still while you answer, one nod when it\'s good.',
      base: [78, 58, 48], dark: [30, 22, 20], mark: [52, 38, 32], accent: [190, 150, 72], face: [138, 112, 92], horn: [222, 210, 186],
      half: [[0, 0], [0.26, -0.004], [0.4, -0.08], [0.455, -0.25], [0.465, -0.45], [0.43, -0.6], [0.37, -0.7], [0.3, -0.76], [0.24, -0.8], [0.25, -0.88], [0.23, -0.96], [0.16, -1.02], [0.08, -1.045], [0, -1.05]],
      head: [0.66, 0.84, -0.76], eyes: { x: 0.1, y: -0.875, w: 0.026, h: 0.032, light: true }, nose: { y: -0.8, w: 0.08, h: 0.035 },
      arms: { sh: 0.3, shy: -0.56, rest: [0.13, -0.22], up: [0.38, -0.56], L: 0.21, w: 0.12, paw: 'dark' }, feet: 'dark',
      marks(c, d, P, T) {
        const f = P.turn * 0.03;
        c.save(); c.filter = blurU(0.02); c.fillStyle = css(T.mark); c.fill(catmull([[-0.46, -0.45], [-0.3, -0.72], [0, -0.82], [0.3, -0.72], [0.46, -0.45], [0.4, -0.38], [0, -0.6], [-0.4, -0.38]].map(([x, y]) => d(x, y)))); c.restore();
        c.fillStyle = css(T.face); c.fill(catmull([[0, -0.93], [0.14, -0.9], [0.15, -0.8], [0.09, -0.74], [0, -0.73], [-0.09, -0.74], [-0.15, -0.8], [-0.14, -0.9]].map(([x, y]) => d(x + f, y))));
      },
      back(c, d, P, T) { // horns sit behind the wool
        [-1, 1].forEach((s) => { const a = d(s * 0.2 + P.turn * 0.02, -0.95), b = d(s * 0.3, -0.98), e = d(s * 0.33, -1.06); paintForm(c, ribbon([a, b, e], [0.06, 0.045, 0.02], 'point'), T.horn, { sd: 0.02, rw: 0.008 }); });
      },
      front(c, d, P, T) {
        const f = P.turn * 0.03; c.save(); c.filter = blurU(0.006); c.fillStyle = css(T.dark);
        c.fill(catmull([[-0.08, -0.74], [0.08, -0.74], [0.06, -0.66], [0.02, -0.6], [0, -0.58], [-0.02, -0.6], [-0.06, -0.66]].map(([x, y]) => d(x + f * 0.5, y)))); c.restore();
        paintForm(c, poly([[-0.025, -0.6], [0.025, -0.6], [0.04, -0.42], [0, -0.37], [-0.04, -0.42]].map(([x, y]) => d(x, y))), T.accent, { sd: 0.02, rw: 0.008 });
      },
      tempo: { beat: [360, 600], size: 0.55 } },
    { id: 'mags', name: 'Mags', species: 'Heron', role: 'The property office', title: 'Does Anyone Want To Speak?', wall: [128, 136, 146], floor: [88, 94, 104], legs: 0.3, scale: 1.3,
      note: '<b>Signature:</b> a black crest, long legs and spectacles. Formal and fair: a stately, slow tilt of the head, one small nod per point.',
      base: [156, 166, 176], dark: [28, 28, 34], mark: [70, 76, 88], accent: [206, 168, 92], face: [226, 226, 222],
      half: [[0, 0], [0.13, -0.004], [0.2, -0.06], [0.22, -0.2], [0.2, -0.34], [0.15, -0.46], [0.095, -0.56], [0.072, -0.68], [0.08, -0.8], [0.105, -0.88], [0.098, -0.95], [0.06, -0.99], [0, -1.0]],
      head: [0.74, 0.86, -0.8], eyes: { x: 0.04, y: -0.905, w: 0.018, h: 0.024, ring: true }, nose: null,
      marks(c, d, P, T) {
        c.fillStyle = css(T.face); c.fill(catmull([[0, -0.97], [0.07, -0.92], [0.06, -0.75], [0.03, -0.55], [0, -0.5], [-0.03, -0.55], [-0.06, -0.75], [-0.07, -0.92]].map(([x, y]) => d(x, y))));
        [-1, 1].forEach((s) => { c.fillStyle = css(T.mark); c.fill(catmull([[s * 0.12, -0.42], [s * 0.21, -0.3], [s * 0.21, -0.12], [s * 0.15, -0.02], [s * 0.11, -0.2]].map(([x, y]) => d(x, y)))); });
      },
      back(c, d, P, T, st) { // crest plume streams back
        const h = d(-0.03, -0.985), sw = Math.sin(st.t / 700) * 0.02 + P.tilt * 0.3; c.fillStyle = css(T.dark);
        c.fill(ribbon([h, [h[0] - 0.08, h[1] - 0.01 + sw * 0.4], [h[0] - 0.17, h[1] + 0.03 + sw], [h[0] - 0.24, h[1] + 0.08 + sw * 1.5]], [0.03, 0.022, 0.014, 0.006], 'point'));
      },
      front(c, d, P, T) {
        const f = P.turn * 0.02, a = d(0.06 + f, -0.9), b = d(0.36 + f, -0.88 + P.nod * 0.02), u = d(0.06 + f, -0.935);
        const beak = new Path2D(); beak.moveTo(u[0], u[1]); beak.quadraticCurveTo((u[0] + b[0]) / 2, u[1] + 0.005, b[0], b[1]); beak.quadraticCurveTo((a[0] + b[0]) / 2, a[1] + 0.012, a[0], a[1]); beak.closePath();
        paintForm(c, beak, T.accent, { sd: 0.015, rw: 0.006, grain: false });
        // spectacles: two soft rectangles and a bridge
        c.strokeStyle = css(T.dark, 0.85); c.lineWidth = 0.007; [-1, 1].forEach((s) => { const e = d(s * 0.04 + f * 1.4, -0.905); c.beginPath(); c.roundRect(e[0] - 0.026, e[1] - 0.02, 0.052, 0.04, 0.012); c.stroke(); });
        const l = d(-0.014 + f * 1.4, -0.91), r = d(0.014 + f * 1.4, -0.91); c.beginPath(); c.moveTo(l[0], l[1]); c.lineTo(r[0], r[1]); c.stroke();
      },
      tempo: { beat: [340, 560], size: 0.3 } },
  ];

  // ---------- shading ----------
  let LT = {}, PX = 50;
  const blurU = (u) => canFilter ? `blur(${Math.max(0.4, u * PX).toFixed(2)}px)` : 'none';
  function paintForm(ctx, p, base, o = {}) {
    ctx.fillStyle = css(base); ctx.fill(p);
    ctx.save(); ctx.clip(p);
    if (o.inner) o.inner();
    const sd = o.sd ?? 0.09;
    ctx.globalCompositeOperation = 'multiply'; ctx.filter = blurU(sd * 0.55); ctx.fillStyle = LT.shade; ctx.fill(outside(p, LT.lx * sd, LT.ly * sd), 'evenodd');
    if (o.ao) { ctx.fillStyle = LT.ao; ctx.fillRect(-2, -o.ao, 4, 1); }
    ctx.globalCompositeOperation = 'source-over'; ctx.filter = blurU(0.012); ctx.globalAlpha = LT.rimA * (o.rim ?? 1); ctx.fillStyle = LT.rim;
    const rw = o.rw ?? 0.022; ctx.fill(outside(p, -LT.lx * rw, -LT.ly * rw), 'evenodd');
    ctx.filter = 'none'; ctx.globalAlpha = 1;
    if (o.grain !== false) { const pat = ctx.createPattern(grain, 'repeat'); pat.setTransform(ctx.getTransform().inverse()); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = LT.grainA; ctx.fillStyle = pat; ctx.fill(p); }
    ctx.restore();
  }
  // ---------- one critter: springs, pose, draw ----------
  class Critter {
    constructor(spec) {
      this.s = spec; this.R = { tilt: new Spring(130, 13), nod: new Spring(320, 15), turn: new Spring(80, 15), bend: new Spring(46, 9), lookX: new Spring(700, 52), lookY: new Spring(700, 52), earL: new Spring(240, 10), earR: new Spring(240, 10), stretch: new Spring(210, 11), jump: new Spring(150, 10), lean: new Spring(34, 11), arm: new Spring(120, 12), sleep: new Spring(70, 12), squint: new Spring(220, 20), jowl: new Spring(90, 5) };
      this.mode = 'idle'; this.hold = {}; this.bph = Math.random() * 6; this.blinkAt = -1; this.nextBlink = 800 + Math.random() * 3000; this.nextIdle = 1000 + Math.random() * 2000; this.nextBeat = 0; this.env = 0; this.tail = null; this.scarf = null; this.t = 0; this.phrase = 0;
      this.OUT = mirrorHalf(spec.half);
    }
    deform(x, y, e = 0) {
      const P = this.P, s = this.s;
      if (e && s.ear) { const d = e === 1 ? 1 : -1; x -= P.turn * 0.02; [x, y] = rot(x, y, d * s.ear.pivot[0], s.ear.pivot[1], d * P.ear[e - 1]); }
      const t = clamp(-y, 0, 1.3), [h0, h1, py] = s.head, wH = smooth(h0, h1, t);
      if (wH > 0) { [x, y] = rot(x, y, 0, py, P.tilt * wH); y += P.nod * 0.05 * wH; x += P.turn * 0.012 * wH; }
      x += P.bend * t * t * 0.24; y += Math.abs(P.bend) * t * t * 0.04;
      const ls = 1 + P.lean * 0.07 * smooth(0.35, 1, t); x *= ls; y = y * ls + P.lean * 0.045 * t * t;
      return [x * P.sx, y * P.sy + P.jump - (s.legs || 0) * (1 - P.sleep * 0.6)];
    }
    gesture(kind) {
      const R = this.R, h = this.hold, t = this.t, z = this.s.tempo.size;
      if (kind === 'beat') { R.nod.kick(5 * z); R.stretch.kick(0.5 * z); R.earL.kick(-3 * z); R.earR.kick(-2.4 * z); R.squint.kick(4 * z); R.bend.kick((Math.random() - 0.5) * 0.8 * z); R.jowl.kick(3 * z); if (this.tail && Math.random() < 0.3) this.tail.kick = 0.6; }
      if (kind === 'question') { h.tilt = (Math.random() < 0.5 ? -1 : 1) * 0.17; h.tiltUntil = t + 1200; h.arm = 0.85; h.armUntil = t + 1100; R.earL.kick(5); R.earR.kick(5); }
      if (kind === 'exclaim') { R.jump.kick(-1.4 * (0.6 + z)); R.stretch.kick(2 * z); R.earL.kick(6); R.earR.kick(6); h.arm = 0.6; h.armUntil = t + 600; R.jowl.kick(6); }
      if (kind === 'laugh') { for (let i = 0; i < 3; i++) setTimeout(() => { R.jump.kick(-0.8); R.squint.kick(5); R.jowl.kick(4); }, i * 130); h.squintUntil = t + 600; }
      if (kind === 'nod') R.nod.kick(2.6);
      if (kind === 'poke') { R.jump.kick(-1.8); R.stretch.kick(2.2); R.earL.kick(-8); R.earR.kick(-6); h.lx = 0; h.ly = 0.1; h.lookUntil = t + 900; if (this.tail) this.tail.kick = 1.2; }
    }
    step(dt, now) {
      const R = this.R, s = this.s, h = this.hold, m = this.mode; this.t = now;
      R.sleep.t = m === 'sleep' ? 1 : 0;
      const perk = m === 'listen' ? 1 : m === 'speak' ? 0.5 : 0, er = s.ear ? s.ear.rest : (s.sideEars ? s.sideEars.rest : 0);
      const earRest = R.sleep.x > 0.5 ? er + (s.sleepEar ?? 0.35) : er - perk * 0.1; R.earL.t = earRest; R.earR.t = earRest;
      R.lean.t = m === 'listen' ? 1 : m === 'speak' ? 0.25 : 0;
      R.tilt.t = now < (h.tiltUntil || 0) ? h.tilt : m === 'listen' ? 0.15 : 0; if (R.sleep.x > 0.3) R.tilt.t = -0.2;
      R.arm.t = now < (h.armUntil || 0) ? h.arm : 0;
      if (now < (h.lookUntil || 0)) { R.lookX.t = h.lx; R.lookY.t = h.ly; R.turn.t = h.lx * 0.7; } else if (m !== 'idle') { R.lookX.t = 0; R.lookY.t = 0.1; R.turn.t = 0; }
      if (now > this.nextIdle && R.sleep.x < 0.5) {
        const r = Math.random();
        if (m === 'idle' && r < 0.4) { h.lx = Math.random() * 2 - 1; h.ly = Math.random() * 0.6 - 0.35; h.lookUntil = now + 900 + Math.random() * 1600; }
        else if (r < 0.62) (Math.random() < 0.5 ? R.earL : R.earR).kick(-7);
        else if (r < 0.8) R.bend.t = (Math.random() - 0.5) * 0.12;
        else if (r < 0.92 && this.tail) this.tail.kick = 1;
        else { this.blinkAt = now; this.dbl = true; }
        this.nextIdle = now + 1300 + Math.random() * 2800;
      }
      // talking: each neighbour's own rhythm, phrases with pauses, and a question now and then
      if (m === 'speak') {
        if (now > this.nextBeat) {
          const [a, b] = s.tempo.beat; this.phrase++;
          if (this.phrase % 9 === 0) { this.nextBeat = now + 900; const r = Math.random(); this.gesture(r < 0.45 ? 'question' : s.tempo.laugh && r < 0.7 ? 'laugh' : r < 0.8 ? 'exclaim' : 'beat'); }
          else { this.gesture('beat'); this.env = 0.6 + Math.random() * 0.4; this.nextBeat = now + a + Math.random() * (b - a); }
        }
      } else if (m === 'listen' && now > this.nextBeat) { this.gesture('nod'); this.nextBeat = now + 1600 + Math.random() * 1800; }
      this.env *= Math.pow(0.02, dt);
      if (now > this.nextBlink && R.sleep.x < 0.5) { this.blinkAt = now; this.dbl = Math.random() < 0.18; this.nextBlink = now + 2400 + Math.random() * 3600; }
      let blink = 0; const bt = now - this.blinkAt; const bl = (u) => u < 70 ? ease(u / 70) : u < 110 ? 1 : 1 - ease((u - 110) / 130);
      if (bt >= 0 && bt < 240) blink = bl(bt); else if (this.dbl && bt >= 300 && bt < 540) blink = bl(bt - 300);
      this.bph += dt * Math.PI * 2 * (R.sleep.x > 0.5 ? 0.17 : 0.25 + 0.05 * noise(now / 3000, 2));
      const br = Math.sin(this.bph) + 0.22 * Math.sin(this.bph * 2);
      for (const k in R) R[k].step(dt);
      R.earL.v -= R.tilt.v * 0.25 * dt * 60; R.earR.v += R.tilt.v * 0.25 * dt * 60; R.bend.t *= 0.995;
      const sl = clamp(R.sleep.x, -0.2, 1.2), squash = s.sleepSquash ?? (s.legs ? 0.3 : 0.44);
      this.P = { sx: (1 - br * 0.005 - R.stretch.x * 0.5) * (1 + sl * squash * 0.8), sy: (1 + br * 0.016 + R.stretch.x) * (1 - sl * squash) + br * 0.02 * sl, tilt: R.tilt.x, nod: R.nod.x + this.env * 0.15, turn: R.turn.x,
        bend: R.bend.x + noise(now / 2600, 5) * 0.025 - sl * 0.1, lean: R.lean.x, jump: R.jump.x, ear: [R.earR.x, R.earL.x], lookX: R.lookX.x, lookY: R.lookY.x,
        open: sl > 0.45 ? 0 : clamp(1 - blink, 0, 1), squint: clamp(R.squint.x + (now < (h.squintUntil || 0) ? 0.5 : 0), 0, 0.7), arm: clamp(R.arm.x, -0.1, 1.2), sleep: clamp(sl, 0, 1), env: this.env, jowl: R.jowl.x };
      const P = this.P;
      if (s.tail) {
        const tr = s.tail.rest, root = this.deform(...s.tail.root);
        const len = tr.map((q, i) => i ? Math.hypot(q[0] - tr[i - 1][0], q[1] - tr[i - 1][1]) : 0);
        if (!this.tail) this.tail = { p: tr.map((q) => [root[0] + q[0], root[1] + q[1]]), v: tr.map(() => [0, 0]), len, kick: 0 };
        const sway = noise(now / 1800, s.id.length) * 0.12 * (1 - P.sleep * 0.7) + this.tail.kick * 0.5 + P.sleep * 0.5;
        this.tail.kick *= Math.pow(0.04, dt);
        chainStep(this.tail, tr.map((q, i) => { const f = i / (tr.length - 1); const [x, y] = rot(q[0], q[1], 0, 0, -sway * f * f * 1.6); return [root[0] + x, root[1] + y]; }), dt, 260, 16);
      }
      if (s.id === 'pip') {
        const knot = this.deform(0.13, -0.6);
        if (!this.scarf) this.scarf = { p: [0, 1, 2, 3].map((i) => [knot[0] + i * 0.012, knot[1] + i * 0.055]), v: [0, 1, 2, 3].map(() => [0, 0]), len: [0, 0.055, 0.055, 0.05], g: 2.6 };
        chainStep(this.scarf, [0, 1, 2, 3].map((i) => [knot[0] + i * 0.016, knot[1] + i * 0.05]), dt, 90, 7);
      }
    }
    draw(ctx, T) {
      const s = this.s, P = this.P, d = (x, y, e) => this.deform(x, y, e), sl = P.sleep;
      const C = { base: T.lit(s.base), dark: T.lit(s.dark), mark: T.lit(s.mark), accent: T.lit(s.accent), face: T.lit(s.face || s.base), inner: T.lit(s.inner || s.mark), horn: T.lit(s.horn || s.accent) };
      // cast shadow away from the light, and a soft contact shadow
      ctx.save(); ctx.filter = blurU(0.05); ctx.fillStyle = 'rgba(10,8,14,.36)'; const cl = -T.lx * 0.7, wb = (s.half[3][0] + 0.04) * P.sx;
      ctx.beginPath(); ctx.moveTo(-wb, 0.005); ctx.bezierCurveTo(-wb + cl * 0.4, 0.07, wb + cl, 0.08, wb + cl * 0.95, 0.03); ctx.bezierCurveTo(wb + cl * 0.6, -0.02, 0, -0.01, -wb, 0.005); ctx.fill();
      ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.ellipse(0, 0.005, wb * 1.05, 0.03, 0, 0, 7); ctx.fill(); ctx.restore();
      // legs (heron)
      if (s.legs) { ctx.strokeStyle = css(mix(C.accent, C.dark, 0.35)); ctx.lineWidth = 0.022; ctx.lineCap = 'round'; [-1, 1].forEach((k) => { const top = d(k * 0.06, -0.02), sh = s.legs * (1 - sl * 0.6); ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.lineTo(k * 0.065, -sh * 0.45); ctx.lineTo(k * 0.07, 0); ctx.lineTo(k * 0.13, 0.004); ctx.stroke(); }); }
      const tailP = s.tail ? ribbon(this.tail.p, s.tail.w, s.tail.point ? 'point' : 'round') : null;
      const tailDraw = () => { if (!tailP) return; paintForm(ctx, tailP, C.base, { sd: 0.05, rw: 0.015, inner: s.tail.bands ? () => { ctx.strokeStyle = css(C[s.tail.band]); ctx.lineWidth = 0.5; ctx.lineCap = 'butt'; ctx.lineJoin = 'round'; s.tail.bands.forEach(([f0, f1]) => { const q = seg(this.tail.p, f0, f1); ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) ctx.lineTo(q[i][0], q[i][1]); ctx.stroke(); }); } : null }); };
      if (sl < 0.5) tailDraw();
      // side ears (koala) and other pieces behind the body
      if (s.sideEars) [-1, 1].forEach((k) => {
        const a = d(k * s.sideEars.at[0], s.sideEars.at[1]); ctx.save(); ctx.translate(a[0], a[1]); ctx.scale(k, 1); ctx.rotate(P.ear[k > 0 ? 0 : 1] - 0.15 + P.tilt * k * 0.5);
        const ear = catmull([[-0.04, 0.06], [0.02, -0.1], [0.12, -0.14], [0.2, -0.08], [0.21, 0.04], [0.15, 0.12], [0.05, 0.11]]); paintForm(ctx, ear, C.base, { sd: 0.05, rw: 0.015, inner: () => { ctx.fillStyle = css(C.face); ctx.fill(catmull([[0.03, 0.04], [0.07, -0.06], [0.13, -0.07], [0.16, 0.0], [0.13, 0.07], [0.07, 0.07]])); } }); ctx.restore();
      });
      if (s.back) s.back(ctx, d, P, C, this);
      const pts = this.OUT.map(([x, y, e]) => d(x, y, e)), body = catmull(pts); this.body = body;
      paintForm(ctx, body, C.base, { sd: 0.11, ao: 0.07, inner: () => {
        if (s.ear && s.ear.inner) [1, 2].forEach((e) => { const k = e === 1 ? 1 : -1; ctx.fillStyle = css(s.id === 'sol' ? C.inner : mix(C.dark, C.base, 0.18)); ctx.fill(catmull(s.ear.inner.map(([x, y]) => d(x * k, y, e)))); });
        if (s.marks) s.marks(ctx, d, P, C, this);
      } });
      // feet and arms
      if (sl < 0.6 && s.arms) {
        const footC = css(s.feet === 'dark' ? C.dark : mix(C.base, C.dark, 0.25));
        if (!s.legs) [-1, 1].forEach((k) => { const f = d(k * (s.half[1][0] * 0.7), -0.006); ctx.save(); ctx.translate(f[0], f[1]); ctx.scale(k * (1 - sl), 1 - sl); ctx.fillStyle = footC; ctx.fill(FOOT); ctx.restore(); });
        const A = s.arms;
        [-1, 1].forEach((k) => {
          const lift = k > 0 ? P.arm : P.arm * 0.15, sh = d(k * A.sh, A.shy), rest = d(k * A.rest[0], A.rest[1]), up = d(k * A.up[0], A.up[1]);
          const tx = rest[0] + (up[0] - rest[0]) * lift, ty = rest[1] + (up[1] - rest[1]) * lift, L1 = A.L * P.sy, L2 = A.L * 0.95 * P.sy;
          const dx = tx - sh[0], dy = ty - sh[1], dd = clamp(Math.hypot(dx, dy), 0.04, L1 + L2 - 0.001), ang = Math.atan2(dy, dx), bend = Math.acos(clamp((L1 * L1 + dd * dd - L2 * L2) / (2 * L1 * dd), -1, 1)), e = ang - k * bend;
          const el = [sh[0] + Math.cos(e) * L1, sh[1] + Math.sin(e) * L1], hand = [sh[0] + Math.cos(ang) * dd, sh[1] + Math.sin(ang) * dd], mid = [(sh[0] + el[0]) / 2, (sh[1] + el[1]) / 2], low = [(el[0] + hand[0]) / 2, (el[1] + hand[1]) / 2];
          const armP = ribbon([sh, mid, el, low, hand], [A.w, A.w * 0.95, A.w * 0.85, A.w * 0.78, A.w * 0.75]);
          ctx.globalAlpha = 1 - sl;
          ctx.save(); ctx.clip(body); ctx.globalCompositeOperation = 'multiply'; ctx.filter = blurU(0.022); ctx.fillStyle = T.shade; ctx.translate(-T.lx * 0.03, -T.ly * 0.03 + 0.012); ctx.fill(armP); ctx.restore();
          paintForm(ctx, armP, C.base, { sd: 0.04, rw: 0.012, rim: 0.7 });
          ctx.save(); ctx.translate(hand[0], hand[1]); ctx.rotate(Math.atan2(hand[1] - low[1], hand[0] - low[0]) - Math.PI / 2); ctx.translate(0, 0.01); ctx.fillStyle = css(A.paw === 'dark' ? C.dark : mix(C.base, C.dark, 0.2)); ctx.fill(seed(A.w * 0.85, A.w)); ctx.restore();
          ctx.globalAlpha = 1;
        });
      }
      if (s.front && !(s.held && sl > 0.4)) s.front(ctx, d, P, C, this);
      // face: seed eyes, a nose, no mouth
      const fx = P.turn * 0.035 + P.lookX * 0.016, fy = P.lookY * 0.01 + P.nod * 0.012, E = s.eyes;
      [-1, 1].forEach((k) => {
        const c = d(k * E.x + fx, E.y + fy); ctx.save(); ctx.translate(c[0], c[1]); ctx.rotate(P.tilt);
        if (P.open < 0.16) { ctx.strokeStyle = css(E.light ? C.face : C.dark); ctx.lineWidth = E.big ? 0.02 : 0.013; ctx.lineCap = 'round'; const wv = E.w * 0.75; ctx.beginPath(); ctx.moveTo(-wv, 0.002); ctx.quadraticCurveTo(0, sl > 0.5 ? 0.02 : 0.012, wv, 0.002); ctx.stroke(); }
        else {
          ctx.save(); ctx.translate(0, E.h * 0.45); ctx.scale(1, P.open); ctx.translate(0, -E.h * 0.45); ctx.translate(0, -E.h * 0.45); ctx.scale(1, 1 - P.squint * 0.4); ctx.translate(0, E.h * 0.45);
          if (E.big) { ctx.fillStyle = css(mix(C.dark, C.base, 0.3)); ctx.fill(seed(E.w * 1.1, E.h * 1.08)); ctx.fillStyle = css(T.lit([200, 150, 70])); ctx.fill(seed(E.w, E.h)); ctx.fillStyle = css(C.dark); ctx.fill(seed(E.w * 0.42, E.h * 0.5)); }
          else {
          if (E.ring) { ctx.fillStyle = css([214, 180, 90]); ctx.fill(seed(E.w * 1.5, E.h * 1.4)); }
          ctx.fillStyle = css(C.dark); ctx.fill(seed(E.w, E.h)); }
          ctx.restore();
          if (P.open > 0.6) { const hs = E.big ? 2.4 : 1; ctx.fillStyle = 'rgba(255,248,236,.85)'; ctx.beginPath(); ctx.moveTo(-0.009 * hs, -0.013 * hs); ctx.quadraticCurveTo(-0.002 * hs, -0.019 * hs, 0.004 * hs, -0.014 * hs); ctx.quadraticCurveTo(-0.002 * hs, -0.009 * hs, -0.009 * hs, -0.013 * hs); ctx.fill(); }
        }
        ctx.restore();
      });
      if (s.nose) { const N = s.nose, n = d(fx * 1.1, N.y + fy); ctx.save(); ctx.translate(n[0], n[1]); ctx.rotate(P.tilt); ctx.fillStyle = css(C.dark);
        if (N.big) { ctx.fill(seed(N.w, N.h)); ctx.fillStyle = 'rgba(255,248,236,.25)'; ctx.fill(seed(N.w * 0.3, N.h * 0.4)); }
        else { const w = N.w / 2, h = N.h; ctx.beginPath(); ctx.moveTo(-w, -h * 0.35); ctx.quadraticCurveTo(0, -h * 0.7, w, -h * 0.35); ctx.quadraticCurveTo(w * 0.8, h * 0.35, 0, h * 0.6); ctx.quadraticCurveTo(-w * 0.8, h * 0.35, -w, -h * 0.35); ctx.fill(); }
        ctx.restore(); }
      if (sl >= 0.5) tailDraw();
    }
  }
  const FOOT = (() => { const p = new Path2D(); p.moveTo(-0.07, 0.005); p.bezierCurveTo(-0.075, -0.045, 0.06, -0.06, 0.075, -0.012); p.quadraticCurveTo(0.07, 0.012, 0, 0.012); p.quadraticCurveTo(-0.06, 0.014, -0.07, 0.005); return p; })();
  function chainStep(ch, targets, dt, stiff, damp) {
    for (let i = 1; i < ch.p.length; i++) { const k = stiff * (1 - i / (ch.p.length + 2)); const ax = -k * (ch.p[i][0] - targets[i][0]) - damp * ch.v[i][0], ay = -k * (ch.p[i][1] - targets[i][1]) - damp * ch.v[i][1] + (ch.g || 0); ch.v[i][0] += ax * dt; ch.v[i][1] += ay * dt; ch.p[i][0] += ch.v[i][0] * dt; ch.p[i][1] += ch.v[i][1] * dt; }
    ch.p[0] = targets[0].slice();
    for (let it = 0; it < 2; it++) for (let i = 1; i < ch.p.length; i++) { const a = ch.p[i - 1], b = ch.p[i], dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1e-6; b[0] = a[0] + dx / m * ch.len[i]; b[1] = a[1] + dy / m * ch.len[i]; }
  }
  function scarf(c, d, P, T, st, yt, yb, hw) {
    const sc = [[-hw, yt], [0, yt + 0.024], [hw, yt], [hw + 0.005, yb], [0, yb + 0.024], [-hw - 0.005, yb]].map(([x, y]) => d(x, y));
    const band = new Path2D(); band.moveTo(sc[0][0], sc[0][1]); band.quadraticCurveTo(sc[1][0] * 2 - (sc[0][0] + sc[2][0]) / 2, sc[1][1] * 2 - (sc[0][1] + sc[2][1]) / 2, sc[2][0], sc[2][1]); band.quadraticCurveTo(sc[2][0] + 0.02, (sc[2][1] + sc[3][1]) / 2, sc[3][0], sc[3][1]); band.quadraticCurveTo(sc[4][0] * 2 - (sc[3][0] + sc[5][0]) / 2, sc[4][1] * 2 - (sc[3][1] + sc[5][1]) / 2, sc[5][0], sc[5][1]); band.quadraticCurveTo(sc[5][0] - 0.02, (sc[5][1] + sc[0][1]) / 2, sc[0][0], sc[0][1]); band.closePath();
    paintForm(c, ribbon(st.scarf.p, [0.07, 0.066, 0.062, 0.06], 'cut'), T.accent, { sd: 0.04, rw: 0.01, rim: 0.6 });
    paintForm(c, band, T.accent, { sd: 0.05, rw: 0.012, rim: 0.6 });
  }
