  // =====================================================================
  // twelve places; each one is its own painting with one small red thing,
  // a resident who keeps hours, three story variants, and its own music
  // =====================================================================
  const between = (h, a, b) => a < b ? h >= a && h < b : h >= a || h < b;
  const WARM = [242, 196, 128];

  function house(g, x, y, s, c, lit, L) {
    g.fillStyle = c; g.fillRect(x, y - s, s * 1.3, s); g.beginPath(); g.moveTo(x - s * 0.1, y - s); g.lineTo(x + s * 0.65, y - s * 1.55); g.lineTo(x + s * 1.4, y - s); g.fill();
    if (lit) { g.fillStyle = 'rgba(242,198,130,.9)'; g.fillRect(x + s * 0.45, y - s * 0.65, s * 0.35, s * 0.3); glow(g, x + s * 0.6, y - s * 0.5, s * 2, [242, 198, 130], 0.18); }
  }
  function busPass(g, w, h, y, L, t, bw) {
    if (t < 0 || t > 10) return; const stopX = w * 0.5; bw = bw || w * 0.5; const bh = h * 0.055;
    const x = t < 3.5 ? w + bw * 0.1 - (w + bw * 0.1 - stopX) * ease(t / 3.5) : t < 6.5 ? stopX : stopX - (stopX + bw * 1.2) * ease((t - 6.5) / 3.5);
    g.fillStyle = 'rgba(8,6,10,.35)'; g.beginPath(); g.ellipse(x, y, bw * 0.55, h * 0.005, 0, 0, 7); g.fill();
    g.fillStyle = css(mix(L.gnd[1], [12, 10, 14], 0.4)); g.beginPath(); g.roundRect(x - bw / 2, y - bh, bw, bh * 0.9, [10, 6, 4, 4]); g.fill();
    const lit = 0.35 + 0.65 * L.dark; for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(242,205,150,${0.25 + 0.6 * lit})`; g.fillRect(x - bw / 2 + bw * (0.08 + i * 0.145), y - bh * 0.82, bw * 0.11, bh * 0.36); }
    g.fillStyle = '#0a080c'; [0.18, 0.8].forEach((f) => { g.beginPath(); g.arc(x - bw / 2 + bw * f, y - bh * 0.08, bh * 0.13, 0, 7); g.fill(); });
    if (L.dark > 0.3) glow(g, x - bw / 2, y - bh * 0.3, w * 0.12, [255, 220, 170], 0.25 * L.dark);
  }
  function lantern(g, x, y, r, lit, sway) {
    g.save(); g.translate(x, y); g.rotate(sway);
    g.strokeStyle = 'rgba(20,14,16,.9)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -r * 2.2); g.lineTo(0, -r); g.stroke();
    if (lit > 0.05) { glow(g, 0, 0, r * 10, [255, 110, 80], 0.4 * lit); glow(g, 0, 0, r * 3, [255, 150, 110], 0.4 * lit); }
    g.fillStyle = css(mix([150, 40, 34], [236, 84, 62], lit)); g.beginPath(); g.ellipse(0, 0, r, r * 1.15, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(30,14,14,.8)'; g.fillRect(-r * 0.45, -r * 1.25, r * 0.9, r * 0.22); g.fillRect(-r * 0.45, r * 1.05, r * 0.9, r * 0.22);
    g.strokeStyle = `rgba(255,214,170,${0.2 + 0.3 * lit})`; g.lineWidth = 0.6; [-0.5, 0, 0.5].forEach((k) => { g.beginPath(); g.ellipse(0, 0, r * Math.abs(k) * 1.2 + 0.1, r * 1.12, 0, -1.4, 1.4); g.stroke(); });
    g.restore();
  }
  function steam(g, x, y, now, s, a = 0.22) {
    for (let i = 0; i < 3; i++) { const t = ((now / 2400 + i / 3) % 1); g.strokeStyle = `rgba(240,236,228,${a * (1 - t) * Math.min(1, t * 4)})`; g.lineWidth = s * 0.12; g.lineCap = 'round'; g.beginPath(); const yy = y - t * s * 2.4; g.moveTo(x + Math.sin(now / 500 + i) * s * 0.2, yy); g.quadraticCurveTo(x + Math.sin(now / 400 + i * 2) * s * 0.4, yy - s * 0.4, x + Math.sin(now / 600 + i) * s * 0.2, yy - s * 0.8); g.stroke(); }
  }
  function paper(g, x, y, wd, ht, text, rot = 0, a = 1) {
    g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = `rgba(236,228,212,${0.92 * a})`; g.fillRect(-wd / 2, -ht / 2, wd, ht);
    if (text) { g.fillStyle = `rgba(40,30,30,${0.85 * a})`; g.font = `600 ${ht * 0.24}px ${SF}`; g.textAlign = 'center'; text.split('\n').forEach((t, i, all) => g.fillText(t, 0, (i - (all.length - 1) / 2) * ht * 0.3 + ht * 0.08)); }
    g.restore();
  }
  const pipAt = (x, y, s, src, mode = 'idle', warm = 0) => ({ who: 'pip', x, y, s, src, mode, warm });

  const PLACES = [
    // ---------------------------------------------------------------- the bus stop
    { id: 'bus', name: 'The bus stop', who: 'Pip', hours: 'The 45 comes at :00, :20 and :40', variants: ['Waiting', 'A red umbrella', 'Late bus'],
      title(h, v) { return ['Waiting For The 45', 'Someone Forgot Their Umbrella', 'Nobody Told The Bus'][v]; },
      story: 'The stop at the edge of town. Pip has never been on a bus and keeps asking where it goes.',
      music: 'bus', amb: 'field',
      paint(g, w, h, L) {
        const hz = h * 0.6; this.hz = hz; sky(g, w, hz, L, 3);
        hills(g, w, hz, h * 0.07, L.hill[0], 11); const near = hills(g, w, hz + 1, h * 0.035, L.hill[1], 5); const r = rng(19);
        [0.08, 0.17, 0.55, 0.88].forEach((fx, i) => { const x = w * fx; house(g, x, near(x) + 2, w * (0.03 + r() * 0.015), css(mix(L.hill[1], [8, 6, 10], 0.45)), L.dark > 0.3 + i * 0.15, L); });
        ground(g, w, h, hz, L); g.fillStyle = css(mix(L.gnd[0], [10, 8, 12], 0.35)); g.fillRect(0, hz + h * 0.028, w, h * 0.02); finish(g, w, h);
      },
      front(g, w, h, L, now, v) {
        const hz = this.hz, bx = w * 0.74, by = hz + h * 0.07, k = ink(L), wet = L.wx === 'rain';
        // the 45 keeps its timetable: it pulls in at :00, :20 and :40 on the town clock
        if (v !== 2) busPass(g, w, h, hz + h * 0.045, L, (L.h * 3600) % 1200);
        g.fillStyle = 'rgba(10,6,12,.4)'; g.beginPath(); g.ellipse(bx, by, w * 0.13, h * 0.006, 0, 0, 7); g.fill();
        g.fillStyle = k; g.fillRect(bx - w * 0.11, by - h * 0.075, w * 0.15, h * 0.008); g.fillRect(bx - w * 0.105, by - h * 0.075, w * 0.006, h * 0.075); g.fillRect(bx + w * 0.03, by - h * 0.075, w * 0.006, h * 0.075);
        g.fillStyle = css(mix(L.gnd[1], [6, 4, 8], 0.4), 0.55); g.fillRect(bx - w * 0.1, by - h * 0.067, w * 0.13, h * 0.05);
        const lx = w * 0.12, lampA = 0.32 * L.dark * (0.97 + 0.03 * Math.sin(now / 90));
        glow(g, lx + w * 0.03, hz - h * 0.03, w * 0.3, [242, 200, 140], lampA);
        if (wet) reflect(g, lx + w * 0.045, hz + h * 0.03, h * 0.98, w * 0.05, [242, 200, 140], 0.35 * L.dark);
        g.fillStyle = `rgba(242,200,140,${0.09 * L.dark})`; g.beginPath(); g.ellipse(lx + w * 0.04, hz + h * 0.1, w * 0.16, h * 0.02, 0, 0, 7); g.fill();
        g.fillStyle = k; g.fillRect(lx, hz - h * 0.04, w * 0.006, h * 0.15); g.fillRect(lx, hz - h * 0.04, w * 0.05, h * 0.004);
        g.fillStyle = L.dark > 0.2 ? '#f6dcaa' : k; g.beginPath(); g.ellipse(lx + w * 0.045, hz - h * 0.034, w * 0.014, h * 0.004, 0, 0, 7); g.fill();
        const nx = bx + w * 0.079, ny = by - h * 0.126; g.fillStyle = k; g.fillRect(bx + w * 0.075, by - h * 0.12, w * 0.007, h * 0.12);
        const on = v === 1 ? 0 : v === 2 ? (Math.sin(now / 160) > -0.2 ? 1 : 0.15) : 1;
        if (on > 0.2) { glow(g, nx, ny - h * 0.012, w * 0.14, [229, 72, 59], (0.08 + 0.18 * L.dark) * on); if (wet) reflect(g, nx, hz + h * 0.08, h, w * 0.04, [229, 72, 59], 0.3 * on); }
        g.save(); g.font = `700 ${w * 0.07}px ${SF}`; g.textAlign = 'center'; g.shadowColor = '#ff4a3a'; g.shadowBlur = on > 0.2 ? w * 0.012 * (0.4 + L.dark) : 0; g.fillStyle = on > 0.2 ? (L.dark > 0.3 ? '#ff9282' : '#d4574a') : 'rgba(60,40,44,.85)'; g.fillText('45', nx, ny); g.restore();
        if (v === 2) paper(g, bx + w * 0.079, by - h * 0.06, w * 0.05, h * 0.03, 'LATE\nSORRY', 0.06);
        if (v === 1) { // a red umbrella leaning on the shelter
          g.save(); g.translate(bx - w * 0.115, by - h * 0.002); g.rotate(-0.32); g.strokeStyle = k; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -h * 0.07); g.stroke();
          g.fillStyle = '#d4483a'; g.beginPath(); g.moveTo(0, -h * 0.085); g.quadraticCurveTo(w * 0.02, -h * 0.06, w * 0.012, -h * 0.022); g.lineTo(-w * 0.012, -h * 0.022); g.quadraticCurveTo(-w * 0.02, -h * 0.06, 0, -h * 0.085); g.fill(); g.restore();
        }
        const s = sunPos(w, hz, L.h), src = L.dark > 0.5 ? { x: lx + w * 0.045, y: hz - h * 0.034 } : s || { x: w * 0.3, y: 0 };
        return { cast: [pipAt(w * 0.4, hz + h * 0.115, w * 0.2, src, 'idle', 0)] };
      } },

    // ---------------------------------------------------------------- the burrow
    { id: 'room', name: 'The burrow', who: 'Pip', hours: 'Home. Pip sleeps from about 11', variants: ['Home', 'A burnt loaf', 'A postcard'], interior: true,
      title(h, v) { if (v === 0 && (h >= 23 || h < 6.5)) return 'Out Like A Light'; return ['Home, More Or Less', 'Pip Tried To Bake', 'Wish You Were Here, Roughly'][v]; },
      story: 'Your burrow, shared with Pip: a lamp, a red sofa and one window onto the field.',
      music: 'room', amb: 'room',
      paint(g, w, h, L) {
        const fl = h * 0.64, cx = w * 0.15; this.fl = fl;
        g.fillStyle = vgrad(g, 0, fl, [[0, css(L.wall[0])], [1, css(L.wall[1])]]); g.fillRect(0, 0, w, fl); wash(g, 0, 0, w, fl, 21, 10);
        g.fillStyle = vgrad(g, fl, h, [[0, css(L.floor[0])], [1, css(L.floor[1])]]); g.fillRect(0, fl, w, h - fl);
        g.fillStyle = css(mix(L.wall[0], [8, 6, 12], 0.32)); g.beginPath(); g.moveTo(0, 0); g.lineTo(cx, 0); g.lineTo(cx, fl); g.lineTo(0, fl + h * 0.085); g.closePath(); g.fill();
        g.fillStyle = 'rgba(236,230,220,.06)'; g.fillRect(cx, fl, w - cx, 1); g.fillRect(cx, 0, 1, fl);
        const wx = w * 0.58, wy = h * 0.2, ww = w * 0.26, wh = h * 0.16; this.win = [wx, wy, ww, wh];
        g.save(); g.beginPath(); g.rect(wx, wy, ww, wh); g.clip(); g.translate(wx, wy); sky(g, ww, wh, L, 8, [0.72, 0.3]); hills(g, ww, wh, wh * 0.18, L.hill[1], 5); g.restore();
        g.strokeStyle = 'rgba(236,230,220,.3)'; g.lineWidth = 1.2; g.strokeRect(wx, wy, ww, wh); g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); g.stroke();
        const sunny = L.h > 7 && L.h < 18.8 && L.wx !== 'rain' && L.wx !== 'fog' ? 1 - L.dark : 0;
        if (sunny > 0.05) { const warm = L.h > 16 ? 1 : 0.2; g.fillStyle = css(mix([255, 245, 230], [255, 200, 150], warm), 0.11 * sunny); const sk = (L.h - 12.5) * w * 0.03; g.beginPath(); g.moveTo(wx, fl + h * 0.01); g.lineTo(wx + ww, fl + h * 0.01); g.lineTo(wx + ww - sk + w * 0.05, h * 0.86); g.lineTo(wx - sk - w * 0.05, h * 0.86); g.fill(); }
        g.strokeStyle = 'rgba(236,230,220,.22)'; g.strokeRect(w * 0.34, h * 0.3, w * 0.08, w * 0.1); finish(g, w, h);
      },
      front(g, w, h, L, now, v) {
        const fl = this.fl, lx = w * 0.25, on = L.dark, k = css(mix(L.floor[1], [4, 4, 8], 0.5));
        glow(g, lx, h * 0.39, w * 0.62, [242, 194, 122], 0.28 * on * (0.98 + 0.02 * Math.sin(now / 70)));
        g.fillStyle = `rgba(242,194,122,${0.1 * on})`; g.beginPath(); g.ellipse(lx + w * 0.06, fl + h * 0.06, w * 0.3, h * 0.035, 0, 0, 7); g.fill();
        g.strokeStyle = k; g.lineWidth = w * 0.007; g.beginPath(); g.moveTo(lx, h * 0.39); g.lineTo(lx, fl + h * 0.05); g.stroke(); g.fillStyle = k; g.fillRect(lx - w * 0.035, fl + h * 0.048, w * 0.07, h * 0.004);
        g.fillStyle = on > 0.2 ? '#efdcb8' : css(mix(L.wall[1], [236, 220, 190], 0.5)); g.beginPath(); g.moveTo(lx - w * 0.035, h * 0.36); g.lineTo(lx + w * 0.035, h * 0.36); g.lineTo(lx + w * 0.06, h * 0.395); g.lineTo(lx - w * 0.06, h * 0.395); g.fill();
        const sx = w * 0.38, sw = w * 0.46, sy = fl + h * 0.05, lit = 0.55 + 0.45 * Math.max(on * 0.6, 1 - L.dark);
        g.fillStyle = 'rgba(5,7,12,.45)'; g.beginPath(); g.ellipse(sx + sw / 2, sy + h * 0.004, sw * 0.6, h * 0.008, 0, 0, 7); g.fill();
        g.fillStyle = css(mix([30, 10, 14], [77, 27, 34], lit)); g.beginPath(); g.roundRect(sx, sy - h * 0.095, sw, h * 0.06, 10); g.fill();
        g.fillStyle = css(mix([36, 12, 16], [94, 34, 42], lit)); g.beginPath(); g.roundRect(sx, sy - h * 0.045, sw, h * 0.04, 6); g.fill();
        g.fillStyle = css(mix([26, 9, 12], [67, 23, 29], lit)); g.beginPath(); g.roundRect(sx - w * 0.025, sy - h * 0.065, w * 0.05, h * 0.06, 8); g.roundRect(sx + sw - w * 0.025, sy - h * 0.065, w * 0.05, h * 0.06, 8); g.fill();
        if (v === 1) { // a little side table, a loaf a shade too dark, still smoking
          const tx = w * 0.2, ty = fl + h * 0.06; g.fillStyle = k; g.fillRect(tx - w * 0.06, ty - h * 0.055, w * 0.12, h * 0.006); g.fillRect(tx - w * 0.004, ty - h * 0.055, w * 0.008, h * 0.055);
          g.fillStyle = 'rgba(46,30,24,.95)'; g.beginPath(); g.ellipse(tx, ty - h * 0.064, w * 0.035, h * 0.012, 0, Math.PI, 0); g.fill(); steam(g, tx, ty - h * 0.07, now, w * 0.03, 0.3);
        }
        if (v === 2) paper(g, w * 0.62, fl + h * 0.13, w * 0.09, h * 0.045, '', 0.2);
        const asleep = v === 0 && (L.h >= 23 || L.h < 6.5);
        return { cast: [pipAt(sx + sw * 0.46, sy - h * 0.044, w * 0.19, L.dark > 0.5 ? { x: lx, y: h * 0.38 } : { x: w * 0.71, y: h * 0.28 }, asleep ? 'sleep' : 'idle', 0.08 * on)], clip: [this.win] };
      } },

    // ---------------------------------------------------------------- the café, seen from the street
    { id: 'cafe', name: 'The Lantern Café', who: 'Mei', hours: 'Open 7 am to 10 pm', variants: ['Open', 'Help wanted', 'Closed early'],
      title(h, v) { if (!between(h, 7, 22)) return 'Closed For The Night'; return ['Kaya Toast, Probably', 'Help Wanted, Ask Inside', 'Closed For Thinking'][v]; },
      story: 'Mei’s café, from across the street. The rent went up, and Mei hasn’t told anyone yet.',
      music: 'cafe', amb: 'street',
      paint(g, w, h, L) {
        const base = h * 0.77; this.base = base;
        sky(g, w, h * 0.2, L, 43, [0.8, 0.45]);
        // the roofline: a chimney and the next house along, then the café's plain face
        const wall = mix(L.wall[1], L.hill[1], 0.4), wallD = mix(wall, [10, 8, 12], 0.38);
        g.fillStyle = css(mix(wallD, [8, 6, 10], 0.3)); g.fillRect(0, h * 0.1, w * 0.12, base); g.fillRect(w * 0.7, h * 0.07, w * 0.06, h * 0.06);
        g.fillStyle = css(wall); g.fillRect(w * 0.1, h * 0.12, w * 0.9, base - h * 0.12); wash(g, 0, h * 0.12, w, base, 41, 8);
        g.fillStyle = css(mix(wall, [255, 255, 255], 0.07)); g.fillRect(w * 0.1, h * 0.12, w * 0.9, h * 0.01);
        [[0.3, 0.2], [0.66, 0.2]].forEach(([x, y], i) => { const lit = L.dark > 0.4 && i === 1; g.fillStyle = lit ? 'rgba(242,198,130,.85)' : css(mix(L.sky[1], [10, 10, 16], 0.55)); g.fillRect(w * x, h * y, w * 0.14, h * 0.09); if (lit) { glow(g, w * (x + 0.07), h * (y + 0.045), w * 0.2, WARM, 0.2); g.fillStyle = 'rgba(40,40,30,.6)'; g.beginPath(); g.ellipse(w * (x + 0.04), h * (y + 0.085), w * 0.02, h * 0.012, 0, Math.PI, 0); g.fill(); } g.strokeStyle = css(wallD); g.lineWidth = 2.5; g.strokeRect(w * x, h * y, w * 0.14, h * 0.09); });
        g.fillStyle = css(mix(wallD, [20, 30, 34], 0.5)); g.beginPath(); g.moveTo(w * 0.27, h * 0.415); g.lineTo(w * 0.95, h * 0.415); g.lineTo(w * 0.975, h * 0.45); g.lineTo(w * 0.245, h * 0.45); g.fill();
        for (let x = w * 0.245; x < w * 0.97; x += w * 0.061) { g.beginPath(); g.arc(x + w * 0.0305, h * 0.45, w * 0.0305, 0, Math.PI); g.fill(); }
        ground(g, w, h, base, L, 12); g.fillStyle = css(mix(L.gnd[0], [255, 255, 255], 0.07)); g.fillRect(0, base, w, 2);
        g.fillStyle = css(mix(L.gnd[1], [0, 0, 0], 0.35)); g.fillRect(0, h * 0.85, w, h * 0.01); g.fillStyle = 'rgba(230,224,210,.08)'; for (let x = w * 0.05; x < w; x += w * 0.2) g.fillRect(x, h * 0.93, w * 0.1, 2);
        finish(g, w, h, 0.45);
        this.win = [w * 0.27, h * 0.465, w * 0.68, h * 0.25]; this.door = [w * 0.08, h * 0.44, w * 0.14, h * 0.33]; this.wallD = wallD;
      },
      front(g, w, h, L, now, v) {
        const [x, y, ww, wh] = this.win, [dx, dy, dw, dh] = this.door, open = between(L.h, 7, 22) && v !== 2, lit = open ? 1 : 0.15, wet = L.wx === 'rain';
        // inside: warm room, two pendant lamps, a counter
        g.save(); g.beginPath(); g.rect(x, y, ww, wh); g.clip();
        const inside = open ? mix([230, 196, 150], [255, 214, 160], L.dark) : mix([40, 44, 60], [26, 28, 40], L.dark);
        g.fillStyle = vgrad(g, y, y + wh, [[0, css(mix(inside, [80, 60, 50], 0.25))], [1, css(inside)]]); g.fillRect(x, y, ww, wh);
        if (open) [0.3, 0.72].forEach((f) => { const px = x + ww * f; g.strokeStyle = 'rgba(40,30,26,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(px, y); g.lineTo(px, y + wh * 0.22); g.stroke(); g.fillStyle = '#3a2c26'; g.beginPath(); g.moveTo(px - ww * 0.04, y + wh * 0.3); g.lineTo(px + ww * 0.04, y + wh * 0.3); g.lineTo(px + ww * 0.02, y + wh * 0.22); g.lineTo(px - ww * 0.02, y + wh * 0.22); g.fill(); glow(g, px, y + wh * 0.32, ww * 0.3, [255, 220, 170], 0.35); });
        g.strokeStyle = css(mix(inside, [60, 40, 30], 0.4), 0.6); g.lineWidth = 1; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(x + ww * 0.05, y + wh * (0.18 + i * 0.1)); g.lineTo(x + ww * 0.3, y + wh * (0.18 + i * 0.1)); g.stroke(); }
        if (v === 2 || !open) { g.fillStyle = 'rgba(14,14,22,.8)'; [0.25, 0.55, 0.8].forEach((f) => { const cx = x + ww * f, cy = y + wh * 0.72; g.fillRect(cx - ww * 0.06, cy, ww * 0.12, wh * 0.025); g.fillRect(cx - ww * 0.05, cy - wh * 0.14, ww * 0.008, wh * 0.14); g.fillRect(cx + ww * 0.042, cy - wh * 0.14, ww * 0.008, wh * 0.14); }); }
        g.restore();
        this.inside = inside;
        // the door with its little window, and the lantern
        g.fillStyle = css(mix(this.wallD, [10, 8, 10], 0.5)); g.fillRect(dx, dy, dw, dh);
        g.fillStyle = open ? css(inside, 0.9) : 'rgba(30,32,46,.9)'; g.fillRect(dx + dw * 0.18, dy + dh * 0.1, dw * 0.64, dh * 0.34);
        if (v === 2 && between(L.h, 7, 22)) paper(g, dx + dw / 2, dy + dh * 0.56, dw * 0.56, dh * 0.12, 'BACK\nSOON', -0.05);
        lantern(g, dx + dw / 2, dy - h * 0.035, w * 0.022, open ? 0.6 + 0.4 * L.dark : 0.1, Math.sin(now / 1300) * 0.06 * (L.wx === 'wind' ? 3 : 1));
        if (open) glow(g, x + ww / 2, y + wh / 2, ww * 0.9, WARM, 0.12 + 0.2 * L.dark);
        if (wet) { reflect(g, x + ww * 0.5, this.base + 2, h, ww * 0.85, inside, 0.24 * lit); reflect(g, dx + dw / 2, this.base + 2, h * 0.95, w * 0.03, [236, 84, 62], 0.3 * (open ? 1 : 0.2)); }
        // a little table outside with a cup going cold or steaming
        // a street lamp at the edge of the frame
        const lp = { x: w * 0.035, y: h * 0.34 }; g.fillStyle = ink(L, 0.6); g.fillRect(lp.x - 2, lp.y, 4, this.base - lp.y + h * 0.02); g.fillRect(lp.x - 2, lp.y, w * 0.04, 3);
        glow(g, lp.x + w * 0.035, lp.y + 6, w * 0.32, [242, 200, 140], 0.3 * L.dark); g.fillStyle = L.dark > 0.2 ? '#f6dcaa' : ink(L, 0.5); g.beginPath(); g.ellipse(lp.x + w * 0.035, lp.y + 5, w * 0.014, 3, 0, 0, 7); g.fill();
        if (wet) reflect(g, lp.x + w * 0.035, this.base + 4, h, w * 0.04, [242, 200, 140], 0.3 * L.dark);
        const tx = w * 0.86, ty = this.base + h * 0.045; g.fillStyle = ink(L, 0.55); g.fillRect(tx - w * 0.05, ty - h * 0.05, w * 0.1, h * 0.005); g.fillRect(tx - w * 0.003, ty - h * 0.05, w * 0.006, h * 0.05); g.fillRect(tx - w * 0.025, ty - 1, w * 0.05, 2);
        g.fillStyle = 'rgba(236,228,214,.85)'; g.fillRect(tx - w * 0.01, ty - h * 0.06, w * 0.02, h * 0.01); if (open) steam(g, tx, ty - h * 0.064, now, w * 0.018);
        const cast = []; const meiThere = open;
        const glass = () => { // the window glass: frame, mullions, a cool reflection sweep, then the sign if there is one
          g.save(); g.beginPath(); g.rect(x, y, ww, wh); g.clip();
          const gr = g.createLinearGradient(x, y, x + ww, y + wh); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.45, 'rgba(220,230,255,.07)'); gr.addColorStop(0.5, 'rgba(220,230,255,.13)'); gr.addColorStop(0.56, 'rgba(220,230,255,.04)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x, y, ww, wh);
          g.fillStyle = css(mix(inside, [70, 50, 40], 0.55)); g.fillRect(x, y + wh * 0.76, ww, wh * 0.24); g.fillStyle = 'rgba(255,240,220,.18)'; g.fillRect(x, y + wh * 0.76, ww, 1.5); if (open) { g.fillStyle = 'rgba(236,228,214,.9)'; g.fillRect(x + ww * 0.2, y + wh * 0.72, ww * 0.03, wh * 0.04); g.fillRect(x + ww * 0.85, y + wh * 0.7, ww * 0.025, wh * 0.06); }
          g.restore();
          g.strokeStyle = css(mix(this.wallD, [6, 4, 6], 0.5)); g.lineWidth = w * 0.012; g.strokeRect(x, y, ww, wh); g.lineWidth = w * 0.006; g.beginPath(); g.moveTo(x + ww / 2, y); g.lineTo(x + ww / 2, y + wh); g.stroke();
          g.save(); g.font = `italic 400 ${w * 0.04}px ${SERIF}`; g.fillStyle = open ? 'rgba(80,46,30,.75)' : 'rgba(200,200,210,.25)'; g.textAlign = 'center'; g.fillText('The Lantern Café', x + ww * 0.25, y + wh * 0.12); g.restore();
          if (v === 1 && open) paper(g, x + ww * 0.85, y + wh * 0.62, ww * 0.16, wh * 0.26, 'HELP\nWANTED', 0.04);
        };
        if (meiThere) cast.push({ who: 'mei', x: x + ww * 0.66, y: y + wh * 1.02, s: w * 0.2, src: { x: x + ww * 0.72, y: y + wh * 0.3 }, mode: 'idle', warm: 0.12, clip: [x, y, ww, wh] });
        return { cast, after: glass };
      } },

    // ---------------------------------------------------------------- the harbour
    { id: 'harbour', name: 'The harbour', who: 'Mags', hours: 'Mags walks the pier from 5 am to 10 pm', variants: ['Evening tide', 'A crate with no label', 'Lantern boats'],
      title(h, v) { if (!between(h, 5, 22) && v === 0) return 'The Lighthouse Does The Night Shift'; return ['The Tide Keeps Its Own Hours', 'Still Life With Unlabelled Crate', 'Somebody Has To Light Them'][v]; },
      story: 'A long thin pier, a lighthouse, and Mags, who counts the boats twice before she goes home.',
      music: 'harbour', amb: 'sea',
      paint(g, w, h, L) {
        const hz = h * 0.56; this.hz = hz; sky(g, w, hz, L, 5, [0.24, 0.2]);
        const far = mix(L.hill[1], L.haze, 0.35); g.fillStyle = css(far); g.beginPath(); g.moveTo(w * 0.55, hz); g.quadraticCurveTo(w * 0.7, hz - h * 0.018, w * 0.78, hz - h * 0.012); g.quadraticCurveTo(w * 0.9, hz - h * 0.024, w, hz - h * 0.01); g.lineTo(w, hz); g.fill();
        g.fillStyle = vgrad(g, hz, h, [[0, css(mix(L.sea[0], L.haze, 0.25))], [0.35, css(L.sea[0])], [1, css(L.sea[1])]]); g.fillRect(0, hz, w, h - hz); wash(g, 0, hz, w, h - hz, 33, 5);
        // lighthouse on its rock
        const lx = w * 0.84, k = ink(L, 0.5, L.sea[1]); g.fillStyle = k; g.beginPath(); g.moveTo(lx - w * 0.07, hz + 2); g.quadraticCurveTo(lx - w * 0.03, hz - h * 0.02, lx, hz - h * 0.022); g.quadraticCurveTo(lx + w * 0.05, hz - h * 0.016, lx + w * 0.08, hz + 2); g.fill();
        const tw = css(mix([226, 220, 208], L.sky[1], 0.35 + 0.35 * L.dark)); g.fillStyle = tw; g.beginPath(); g.moveTo(lx - w * 0.016, hz - h * 0.02); g.lineTo(lx - w * 0.01, hz - h * 0.12); g.lineTo(lx + w * 0.01, hz - h * 0.12); g.lineTo(lx + w * 0.016, hz - h * 0.02); g.fill();
        g.fillStyle = k; g.fillRect(lx - w * 0.013, hz - h * 0.133, w * 0.026, h * 0.013); g.beginPath(); g.moveTo(lx - w * 0.014, hz - h * 0.133); g.lineTo(lx, hz - h * 0.145); g.lineTo(lx + w * 0.014, hz - h * 0.133); g.fill();
        this.lamp = { x: lx, y: hz - h * 0.127 };
        // the pier
        const py = h * 0.69; this.py = py; g.fillStyle = ink(L, 0.62, L.sea[1]);
        g.fillRect(0, py, w * 0.6, h * 0.011); for (let x = w * 0.02; x < w * 0.6; x += w * 0.06) { g.fillRect(x, py, w * 0.007, h * 0.05); g.fillStyle = css(mix(L.sea[1], [0, 0, 0], 0.4), 0.4); g.fillRect(x - 1, py + h * 0.05, w * 0.01, h * 0.03); g.fillStyle = ink(L, 0.62, L.sea[1]); }
        g.fillRect(w * 0.56, py - h * 0.04, w * 0.006, h * 0.04); finish(g, w, h, 0.45);
      },
      front(g, w, h, L, now, v) {
        const hz = this.hz, night = L.dark > 0.5, fog = L.wx === 'fog';
        // light on the water: a moon or sun column of short glints that come and go
        const col = night ? w * 0.24 : (sunPos(w, hz, L.h) || { x: w * 0.4 }).x, gl = night ? [230, 230, 240] : [255, 236, 210];
        const r = rng(77); for (let i = 0; i < 60; i++) { const t = r(), yy = hz + 4 + Math.pow(t, 1.6) * (h - hz) * 0.9, spread = w * (0.02 + t * 0.12), xx = col + (r() - 0.5) * spread * 2, a = (0.5 + 0.5 * Math.sin(now / (400 + r() * 500) + r() * 6)) * (night ? 0.35 * L.stars + 0.08 : 0.3) * (fog ? 0.3 : 1); g.fillStyle = css(gl, a); g.fillRect(xx, yy, w * (0.01 + t * 0.03), 1 + t); }
        // the lighthouse beam turns slowly after dark
        if (L.dark > 0.3) { const a = now / 2600, c = Math.cos(a), lp = this.lamp, len = w * 1.1, side = Math.sign(c) || 1; glow(g, lp.x, lp.y, w * 0.05, [255, 236, 190], 0.6);
          g.save(); g.globalCompositeOperation = 'screen'; const gr = g.createLinearGradient(lp.x, lp.y, lp.x - side * len, lp.y); gr.addColorStop(0, `rgba(255,236,190,${(fog ? 0.35 : 0.22) * Math.abs(c)})`); gr.addColorStop(1, 'rgba(255,236,190,0)'); g.fillStyle = gr;
          g.beginPath(); g.moveTo(lp.x, lp.y); g.lineTo(lp.x - side * len, lp.y - h * 0.06 * Math.abs(c) - h * 0.01); g.lineTo(lp.x - side * len, lp.y + h * 0.06 * Math.abs(c) + h * 0.01); g.fill(); g.restore(); }
        // the one red: a lamp at the top of the lighthouse that blinks every few seconds
        const blink = (now % 4000) < 500 ? 1 : 0.25; glow(g, this.lamp.x, this.lamp.y - h * 0.022, w * 0.04, [240, 70, 56], 0.35 * blink); g.fillStyle = css([236, 72, 56], 0.6 + 0.4 * blink); g.beginPath(); g.arc(this.lamp.x, this.lamp.y - h * 0.022, w * 0.004, 0, 7); g.fill();
        // a rowboat, bobbing
        const by = this.py + h * 0.09 + Math.sin(now / 1100) * h * 0.004, bx = w * 0.3; g.save(); g.translate(bx, by); g.rotate(Math.sin(now / 1500) * 0.03); g.fillStyle = ink(L, 0.5, L.sea[1]); g.beginPath(); g.moveTo(-w * 0.07, 0); g.quadraticCurveTo(0, h * 0.02, w * 0.07, 0); g.lineTo(w * 0.06, -h * 0.008); g.lineTo(-w * 0.06, -h * 0.008); g.fill(); g.restore();
        g.strokeStyle = ink(L, 0.6, L.sea[1]); g.lineWidth = 0.7; g.beginPath(); g.moveTo(bx + w * 0.05, by - h * 0.006); g.quadraticCurveTo(bx + w * 0.1, this.py + h * 0.06, w * 0.38, this.py + h * 0.01); g.stroke();
        if (v === 2) { const r2 = rng(9); for (let i = 0; i < 7; i++) { const lx = ((r2() * w * 1.2 + now * 0.004 * (0.5 + r2())) % (w * 1.2)) - w * 0.1, ly = hz + h * (0.04 + r2() * 0.3) + Math.sin(now / 900 + i) * 1.5, s = w * (0.006 + (ly - hz) / h * 0.02); glow(g, lx, ly, s * 6, WARM, 0.25 + 0.3 * L.dark); g.fillStyle = 'rgba(255,214,150,.95)'; g.beginPath(); g.arc(lx, ly, s, 0, 7); g.fill(); reflect(g, lx, ly + s, ly + s * 8, s * 2, WARM, 0.3); } }
        if (v === 1) { const cx = w * 0.43, cy = this.py; g.fillStyle = css(mix([150, 120, 86], L.sea[1], 0.35 + 0.4 * L.dark)); g.fillRect(cx - w * 0.04, cy - h * 0.045, w * 0.08, h * 0.045); g.strokeStyle = 'rgba(30,20,16,.5)'; g.lineWidth = 1; g.strokeRect(cx - w * 0.04, cy - h * 0.045, w * 0.08, h * 0.045); g.beginPath(); g.moveTo(cx - w * 0.04, cy - h * 0.045); g.lineTo(cx + w * 0.04, cy); g.stroke(); g.fillStyle = 'rgba(30,20,16,.55)'; g.font = `700 ${w * 0.03}px ${SF}`; g.textAlign = 'center'; g.fillText('?', cx, cy - h * 0.014); }
        const magsThere = between(L.h, 5, 22) || v !== 0, src = night ? { x: this.lamp.x, y: this.lamp.y } : (sunPos(w, hz, L.h) || { x: w * 0.3, y: 0 });
        return { cast: magsThere ? [{ who: 'mags', x: w * 0.52, y: this.py + 1, s: w * 0.13, src, mode: 'idle', warm: 0 }] : [] };
      } },

    // ---------------------------------------------------------------- the night noodle stall
    { id: 'noodles', name: 'The noodle stall', who: 'Hank', hours: 'Opens at dark. Hank eats here after his shift', variants: ['Last bowl', 'Sixty buns', 'Saving you a seat'],
      title(h, v, L) { if (L.dark < 0.45) return 'Opens At Dark'; return ['Ten Percent And We’re Friends', 'Sixty Buns, Final Offer', 'Saving You A Seat'][v]; },
      story: 'A cart in an empty lot with one red lantern. Hank will haggle over anything, even soup.',
      music: 'noodles', amb: 'stall',
      paint(g, w, h, L) {
        const base = h * 0.68; this.base = base;
        g.fillStyle = vgrad(g, 0, base, [[0, css(L.sky[0])], [0.7, css(L.sky[1])], [1, css(L.sky[2])]]); g.fillRect(0, 0, w, base); stars(g, 0, 0, w, h * 0.3, 14, 22, L.stars); glow(g, w * 0.5, base, w, L.haze, L.hazeA);
        if (L.wx !== 'rain' && L.wx !== 'fog' && L.stars > 0.15) moon(g, w * 0.82, h * 0.1, w * 0.02, L.stars);
        // the back wall of a building, one window lit high up, a drainpipe
        const wall = mix(L.hill[1], [12, 10, 14], 0.35); g.fillStyle = css(wall); g.fillRect(0, h * 0.4, w * 0.7, base - h * 0.4); g.fillRect(w * 0.7, h * 0.48, w * 0.3, base - h * 0.48); wash(g, 0, h * 0.4, w, base - h * 0.4, 51, 4);
        const lit = L.dark > 0.4; g.fillStyle = lit ? 'rgba(242,198,130,.85)' : css(mix(wall, [0, 0, 0], 0.3)); g.fillRect(w * 0.18, h * 0.45, w * 0.07, h * 0.05); if (lit) glow(g, w * 0.215, h * 0.475, w * 0.12, WARM, 0.15);
        g.fillStyle = css(mix(wall, [0, 0, 0], 0.4)); g.fillRect(w * 0.62, h * 0.4, w * 0.012, base - h * 0.4);
        // power lines sag across the sky
        g.strokeStyle = ink(L, 0.5, L.sky[0]); g.lineWidth = 1; [0.12, 0.16, 0.2].forEach((y, i) => { g.beginPath(); g.moveTo(-5, h * y); g.quadraticCurveTo(w * 0.5, h * (y + 0.07 + i * 0.01), w + 5, h * (y - 0.02)); g.stroke(); });
        g.fillStyle = ink(L, 0.55, L.sky[0]); g.fillRect(w * 0.9, h * 0.08, w * 0.012, base - h * 0.08); g.fillRect(w * 0.86, h * 0.1, w * 0.09, h * 0.006);
        ground(g, w, h, base, L, 13); finish(g, w, h, 0.5);
      },
      front(g, w, h, L, now, v) {
        const base = this.base, k = ink(L, 0.55), open = L.dark >= 0.45, cx = w * 0.62, top = base - h * 0.08, wet = L.wx === 'rain';
        g.fillStyle = 'rgba(8,6,10,.4)'; g.beginPath(); g.ellipse(cx, base + h * 0.06, w * 0.3, h * 0.012, 0, 0, 7); g.fill();
        if (!open) { // covered for the day
          g.fillStyle = css(mix([96, 108, 120], L.gnd[0], 0.35)); g.beginPath(); g.moveTo(cx - w * 0.26, base + h * 0.05); g.quadraticCurveTo(cx - w * 0.27, top - h * 0.03, cx - w * 0.1, top - h * 0.05); g.quadraticCurveTo(cx + w * 0.2, top - h * 0.06, cx + w * 0.26, top); g.lineTo(cx + w * 0.27, base + h * 0.05); g.fill();
          g.strokeStyle = 'rgba(20,20,30,.3)'; g.lineWidth = 1; [0.3, 0.6].forEach((f) => { g.beginPath(); g.moveTo(cx - w * 0.26 + w * 0.52 * f, top - h * 0.05); g.lineTo(cx - w * 0.24 + w * 0.52 * f, base + h * 0.05); g.stroke(); });
          lantern(g, cx - w * 0.2, top - h * 0.1, w * 0.024, 0, 0); return { cast: [] };
        }
        // the cart: body, counter, wheels, a slanted roof on two poles
        g.fillStyle = k; g.fillRect(cx - w * 0.25, top - h * 0.17, w * 0.008, h * 0.17); g.fillRect(cx + w * 0.24, top - h * 0.17, w * 0.008, h * 0.17);
        g.fillStyle = css(mix([60, 46, 40], L.gnd[1], 0.3)); g.beginPath(); g.moveTo(cx - w * 0.29, top - h * 0.17); g.lineTo(cx + w * 0.29, top - h * 0.19); g.lineTo(cx + w * 0.3, top - h * (wet ? 0.15 : 0.165)); g.lineTo(cx - w * 0.3, top - h * 0.145); g.fill();
        if (wet) for (let i = 0; i < 9; i++) { const dx = cx - w * 0.28 + i * w * 0.07, t = ((now / 700 + i * 0.37) % 1); g.fillStyle = `rgba(210,220,236,${0.5 * (1 - t)})`; g.fillRect(dx, top - h * 0.145 + t * h * 0.2, 1.2, 3); }
        g.fillStyle = css(mix([86, 64, 52], [40, 30, 26], 0.4 + 0.3 * (1 - L.dark))); g.fillRect(cx - w * 0.26, top, w * 0.52, base + h * 0.03 - top);
        g.fillStyle = css(mix([150, 116, 90], [60, 44, 36], 0.3)); g.fillRect(cx - w * 0.28, top - h * 0.008, w * 0.56, h * 0.012);
        g.fillStyle = '#0c0a0c'; [-0.18, 0.18].forEach((f) => { g.beginPath(); g.arc(cx + w * f, base + h * 0.04, w * 0.035, 0, 7); g.fill(); });
        // the pot, steaming; a bare bulb on a cord; the red lantern
        g.fillStyle = 'rgba(132,134,142,.95)'; g.beginPath(); g.moveTo(cx + w * 0.055, top - h * 0.04); g.lineTo(cx + w * 0.185, top - h * 0.04); g.lineTo(cx + w * 0.175, top - h * 0.004); g.lineTo(cx + w * 0.065, top - h * 0.004); g.fill(); g.fillStyle = 'rgba(200,200,206,.5)'; g.fillRect(cx + w * 0.055, top - h * 0.04, w * 0.13, 1.5); g.fillStyle = 'rgba(60,60,66,.9)'; g.beginPath(); g.ellipse(cx + w * 0.12, top - h * 0.042, w * 0.06, h * 0.006, 0, Math.PI, 0); g.fill(); steam(g, cx + w * 0.12, top - h * 0.05, now, w * 0.04, 0.3);
        const bulb = { x: cx + w * 0.02, y: top - h * 0.115 }; g.strokeStyle = k; g.lineWidth = 0.8; g.beginPath(); g.moveTo(bulb.x, top - h * 0.17); g.lineTo(bulb.x, bulb.y); g.stroke();
        glow(g, bulb.x, bulb.y, w * 0.55, [255, 222, 170], 0.42 * (0.97 + 0.03 * Math.sin(now / 60))); g.fillStyle = 'rgba(255,222,170,.1)'; g.beginPath(); g.ellipse(cx, top + h * 0.002, w * 0.3, h * 0.012, 0, 0, 7); g.fill(); g.fillStyle = '#fff1d6'; g.beginPath(); g.arc(bulb.x, bulb.y + 3, w * 0.008, 0, 7); g.fill();
        lantern(g, cx - w * 0.2, top - h * 0.1, w * 0.024, 0.8 + 0.2 * Math.sin(now / 900), Math.sin(now / 1500) * 0.05 * (L.wx === 'wind' ? 3 : 1));
        if (wet) { reflect(g, bulb.x, base + h * 0.07, h, w * 0.08, [255, 222, 170], 0.25); reflect(g, cx - w * 0.2, base + h * 0.07, h, w * 0.04, [236, 84, 62], 0.3); }
        if (v === 1) { for (let i = 0; i < 6; i++) { const yy = top - h * 0.012 - i * h * 0.017; g.fillStyle = css(mix([200, 168, 120], [120, 96, 70], i % 2 ? 0.2 : 0)); g.beginPath(); g.roundRect(cx - w * 0.16, yy - h * 0.016, w * 0.12, h * 0.016, 3); g.fill(); g.fillStyle = 'rgba(60,40,30,.35)'; g.fillRect(cx - w * 0.16, yy - 2, w * 0.12, 1); } steam(g, cx - w * 0.1, top - h * 0.12, now + 900, w * 0.03, 0.2); }
        // stools; a waiting bowl when Hank is saving you a seat
        const stool = (x) => { g.fillStyle = k; g.fillRect(x - w * 0.035, base - h * 0.03, w * 0.07, h * 0.008); g.fillRect(x - w * 0.028, base - h * 0.022, w * 0.006, h * 0.08); g.fillRect(x + w * 0.022, base - h * 0.022, w * 0.006, h * 0.08); };
        stool(w * 0.16); if (v === 2) { stool(w * 0.3); g.fillStyle = 'rgba(236,228,214,.9)'; g.beginPath(); g.ellipse(cx - w * 0.18, top - h * 0.012, w * 0.03, h * 0.008, 0, 0, Math.PI); g.fill(); steam(g, cx - w * 0.18, top - h * 0.02, now + 400, w * 0.02, 0.25); }
        return { cast: [{ who: 'hank', x: w * 0.16, y: base - h * 0.03, s: w * 0.16, src: bulb, mode: 'idle', warm: 0.16 }] };
      } },

    // ---------------------------------------------------------------- the far field and its phone booth
    { id: 'field', name: 'The far field', who: 'Pip', hours: 'Pip comes out here to call nobody in particular', variants: ['Calling home', 'It’s ringing', 'A red glove'],
      title(h, v) { return ['Long Distance', 'Somebody Is Ringing The Field', 'One Glove, Waiting'][v]; },
      story: 'A phone booth in the middle of a field. Nobody knows who put it there, but it still works.',
      music: 'field', amb: 'field',
      paint(g, w, h, L) {
        const hz = h * 0.6; this.hz = hz; sky(g, w, hz, L, 11, [0.2, 0.24]);
        const fr = rng(4), tl = css(mix(L.hill[1], L.haze, 0.25)); g.fillStyle = tl; g.beginPath(); g.moveTo(0, hz); for (let x = 0; x <= w; x += w * 0.02) g.lineTo(x, hz - h * (0.006 + fr() * 0.014)); g.lineTo(w, hz); g.fill();
        const winter = L.wx === 'snow' ? L.gnd : L.gnd.map((c) => mix(c, [118, 122, 112].map((v) => v * (1 - 0.7 * L.dark)), 0.35));
        g.fillStyle = vgrad(g, hz, h, [[0, css(winter[0])], [1, css(winter[1])]]); g.fillRect(0, hz, w, h - hz); wash(g, 0, hz, w, h - hz, 15, 6);
        const k = ink(L, 0.7, L.hill[1]); tree(g, w * 0.13, hz + h * 0.07, h * 0.1, -Math.PI / 2, w * 0.016, 7, rng(3), k); tree(g, w * 0.92, hz + h * 0.02, h * 0.05, -Math.PI / 2 - 0.1, w * 0.008, 6, rng(8), k);
        if (L.wx === 'snow') { g.fillStyle = 'rgba(250,250,255,.25)'; g.fillRect(0, hz, w, h - hz); }
        finish(g, w, h, 0.42);
      },
      front(g, w, h, L, now, v) {
        const hz = this.hz, bx = w * 0.6, base = hz + h * 0.13, bw = w * 0.15, bh = h * 0.3, top = base - bh, k = ink(L, 0.72, L.hill[1]);
        const ring = v === 1 ? (Math.sin(now / 90) > 0 && (now % 2400) < 1200 ? 1 : 0) : 0, lit = Math.max(0.25, L.dark) * (v === 1 ? 0.75 + 0.25 * ring : 1);
        // footprints from the bottom of the frame to the door
        if (v !== 1) { g.fillStyle = 'rgba(20,20,30,.22)'; for (let i = 0; i < 14; i++) { const t = i / 14, x = w * 0.38 + (bx - bw * 0.2 - w * 0.38) * t + Math.sin(t * 5) * w * 0.02 + (i % 2 ? w * 0.012 : -w * 0.012), y = h * 0.98 - (h * 0.98 - base - h * 0.01) * Math.pow(t, 0.8); g.beginPath(); g.ellipse(x, y, w * 0.008 * (1 - t * 0.6), h * 0.004 * (1 - t * 0.6), 0, 0, 7); g.fill(); } }
        g.fillStyle = 'rgba(10,8,14,.4)'; g.beginPath(); g.ellipse(bx, base, bw * 0.9, h * 0.008, 0, 0, 7); g.fill();
        glow(g, bx, top + bh * 0.4, w * 0.45, WARM, 0.22 * lit);
        if (L.wx === 'snow' || L.wx === 'clear') { g.fillStyle = `rgba(242,196,128,${0.1 * lit})`; g.beginPath(); g.ellipse(bx + w * 0.02, base + h * 0.02, w * 0.18, h * 0.02, 0, 0, 7); g.fill(); }
        // inside glow and the booth frame drawn after Pip, so Pip stands inside the glass
        g.fillStyle = css(mix([255, 226, 170], [120, 110, 100], 1 - lit), 0.92); g.fillRect(bx - bw / 2, top + bh * 0.08, bw, bh * 0.9);
        const frame = () => {
          g.fillStyle = 'rgba(255,240,210,.08)'; g.fillRect(bx - bw / 2, top + bh * 0.08, bw, bh * 0.9);
          g.strokeStyle = k; g.lineWidth = w * 0.012; g.strokeRect(bx - bw / 2, top + bh * 0.06, bw, bh * 0.94);
          g.lineWidth = w * 0.005; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(bx - bw / 2, top + bh * (0.06 + i * 0.235)); g.lineTo(bx + bw / 2, top + bh * (0.06 + i * 0.235)); g.stroke(); }
          g.fillStyle = k; g.fillRect(bx - bw / 2 - w * 0.008, top - h * 0.005, bw + w * 0.016, bh * 0.08);
          const signOn = v !== 2; if (signOn) glow(g, bx, top + bh * 0.02, w * 0.08, [236, 72, 56], 0.3 + 0.2 * L.dark);
          g.fillStyle = signOn ? '#e4523f' : 'rgba(70,50,50,.9)'; g.fillRect(bx - bw * 0.32, top + bh * 0.005, bw * 0.64, bh * 0.04);
          g.fillStyle = signOn ? 'rgba(255,236,226,.95)' : 'rgba(150,130,130,.5)'; g.font = `700 ${w * 0.022}px ${SF}`; g.textAlign = 'center'; g.fillText('PHONE', bx, top + bh * 0.038);
          if (ring) { g.strokeStyle = 'rgba(255,236,200,.7)'; g.lineWidth = 1.2; [1, 2].forEach((i) => { g.beginPath(); g.arc(bx + bw * 0.62, top + bh * 0.35, w * 0.02 * i, -0.8, 0.8); g.stroke(); }); }
        };
        if (v === 2) { g.fillStyle = '#c94a3c'; g.save(); g.translate(w * 0.3, h * 0.86); g.rotate(-0.4); g.beginPath(); g.roundRect(-w * 0.02, -h * 0.012, w * 0.04, h * 0.024, 4); g.fill(); [-1, 0, 1].forEach((f) => g.fillRect(f * w * 0.011 - 2, -h * 0.022, 3.5, h * 0.012)); g.restore(); }
        const cast = v === 0 ? [pipAt(bx - bw * 0.05, base - h * 0.004, w * 0.12, { x: bx, y: top + bh * 0.1 }, 'idle', 0.12 * lit)] : v === 1 ? [pipAt(bx - bw * 1.05, base + h * 0.01, w * 0.13, { x: bx, y: top + bh * 0.4 }, 'listen', 0.1)] : [];
        return { cast, after: frame };
      } },

    // ---------------------------------------------------------------- the empty cinema
    { id: 'cinema', name: 'The empty cinema', who: 'Pip', hours: 'One showing a night. Nobody else ever comes', variants: ['The film', 'A film about a bus', 'Intermission'], interior: true, noWindows: true,
      title(h, v) { return ['Front Row Was Taken', 'It’s About A Bus, Mostly', 'Intermission, Alone'][v]; },
      story: 'Rows of red seats and a film nobody else came to see. Pip likes to tell you the plot afterwards, wrongly.',
      music: 'cinema', amb: 'cinema',
      rows: 4,
      rowPath(i, w, h) { const t = i / (this.rows - 1), y = h * (0.62 + 0.11 * i + 0.05 * t * t), bow = h * (0.02 + 0.04 * t), x0 = -w * 0.14 * t, x1 = w * (1 + 0.14 * t), th = h * (0.03 + 0.05 * t); return { y, bow, x0, x1, th }; },
      drawRow(g, i, w, h, glowA) {
        const { y, bow, x0, x1, th } = this.rowPath(i, w, h), n = 5 + i, seatW = (x1 - x0) / n;
        for (let s = 0; s < n; s++) { const sx = x0 + s * seatW, cx = sx + seatW / 2, f = (cx - w / 2) / (w * 0.7), yy = y + bow * f * f;
          g.fillStyle = css(mix([22, 6, 10], [64, 16, 22], glowA * (1 - i * 0.12))); g.beginPath(); g.roundRect(sx + seatW * 0.05, yy - th, seatW * 0.9, th * 2.2, [th * 0.5, th * 0.5, 2, 2]); g.fill();
          g.save(); g.beginPath(); g.roundRect(sx + seatW * 0.05, yy - th, seatW * 0.9, th * 2.2, [th * 0.5, th * 0.5, 2, 2]); g.clip(); g.fillStyle = `rgba(186,200,236,${0.32 * glowA * (1 - i * 0.12)})`; g.fillRect(sx, yy - th, seatW, th * 0.22); g.fillStyle = `rgba(150,40,48,${0.5 * glowA})`; g.fillRect(sx, yy - th * 0.78, seatW, th * 0.4); g.restore(); }
      },
      paint(g, w, h, L, v) {
        const glowA = v === 2 ? 0.75 : 0.55; this.glowA = glowA;
        g.fillStyle = v === 2 ? '#2a1a24' : '#120c14'; g.fillRect(0, 0, w, h); wash(g, 0, 0, w, h, 61, 8);
        // the curtains frame the screen in deep folds
        const sx = w * 0.12, sy = h * 0.1, sw = w * 0.76, sh = h * 0.3; this.scr = [sx, sy, sw, sh];
        [[0, sx + w * 0.02], [sx + sw - w * 0.02, w]].forEach(([a, b]) => { for (let x = a; x < b; x += w * 0.025) { g.fillStyle = css(mix([40, 10, 16], [72, 20, 28], 0.5 + 0.5 * Math.sin(x / w * 40))); g.fillRect(x, 0, w * 0.026, h * 0.5); } });
        g.fillStyle = '#0a0709'; g.fillRect(0, h * 0.46, w, h * 0.06);
        for (let i = 0; i < 2; i++) this.drawRow(g, i, w, h, glowA);
        finish(g, w, h, 0.6);
      },
      front(g, w, h, L, now, v) {
        const [sx, sy, sw, sh] = this.scr, flick = 0.9 + 0.06 * Math.sin(now / 47) + 0.04 * Math.sin(now / 13);
        const scr = v === 2 ? [70, 66, 70] : [196, 208, 226]; g.fillStyle = css(scr.map((c) => c * (v === 2 ? 1 : flick))); g.fillRect(sx, sy, sw, sh);
        if (v === 0) { g.fillStyle = 'rgba(40,46,64,.35)'; g.beginPath(); g.moveTo(sx, sy + sh); g.quadraticCurveTo(sx + sw * 0.3, sy + sh * 0.6, sx + sw * 0.55, sy + sh * 0.75); g.quadraticCurveTo(sx + sw * 0.8, sy + sh * 0.85, sx + sw, sy + sh * 0.7); g.lineTo(sx + sw, sy + sh); g.fill(); }
        if (v === 1) { const t = (now / 9000) % 1; g.save(); g.beginPath(); g.rect(sx, sy, sw, sh); g.clip(); g.fillStyle = 'rgba(30,30,40,.7)'; const bxp = sx + sw * (1.2 - t * 1.6); g.beginPath(); g.roundRect(bxp, sy + sh * 0.55, sw * 0.4, sh * 0.22, 6); g.fill(); g.fillStyle = 'rgba(30,30,40,.8)'; [0.08, 0.32].forEach((f) => { g.beginPath(); g.arc(bxp + sw * f, sy + sh * 0.78, sh * 0.04, 0, 7); g.fill(); }); g.fillStyle = 'rgba(30,30,40,.35)'; g.fillRect(sx, sy + sh * 0.8, sw, 2); g.restore(); }
        if (v === 2) { [0.06, 0.94].forEach((f) => { glow(g, w * f, h * 0.32, w * 0.3, [255, 200, 150], 0.35); g.fillStyle = '#ffd9a8'; g.fillRect(w * f - 3, h * 0.31, 6, 8); }); g.fillStyle = 'rgba(240,230,214,.6)'; g.font = `italic 400 ${w * 0.05}px ${SERIF}`; g.textAlign = 'center'; g.fillText('Intermission', sx + sw / 2, sy + sh * 0.55); }
        glow(g, w / 2, sy + sh, w * 0.9, scr, 0.12 * flick);
        // the projector beam from behind us, with dust turning in it
        if (v !== 2) { g.save(); g.globalCompositeOperation = 'screen'; const gr = g.createLinearGradient(w * 0.5, h * 1.02, w * 0.5, sy); gr.addColorStop(0, 'rgba(210,220,240,.1)'); gr.addColorStop(1, 'rgba(210,220,240,.02)'); g.fillStyle = gr; g.beginPath(); g.moveTo(w * 0.47, -h * 0.02); g.lineTo(w * 0.53, -h * 0.02); g.lineTo(sx + sw, sy + sh); g.lineTo(sx, sy + sh); g.closePath(); g.fill(); g.restore();
          const r = rng(5); for (let i = 0; i < 26; i++) { const t = (r() + now / 30000 * (0.3 + r())) % 1, x = w * 0.5 + (r() - 0.5) * sw * t, y = sy + sh * 0.2 + (h * 0.5) * (1 - t) * r(); g.fillStyle = `rgba(230,236,250,${0.4 * Math.sin(now / 900 + i) ** 2})`; g.fillRect(x, y, 1.2, 1.2); } }
        const front = () => { for (let i = 2; i < this.rows; i++) this.drawRow(g, i, w, h, this.glowA); };
        const r2 = this.rowPath(1, w, h);
        return { cast: [pipAt(w * 0.57, r2.y + h * 0.1, w * 0.19, { x: w / 2, y: sy + sh }, 'idle', 0)], after: front };
      } },

    // ---------------------------------------------------------------- the laundromat at midnight
    { id: 'laundry', name: 'The laundromat', who: 'Nell', hours: 'Nell brings the inn’s towels at 8 pm and stays till 2', variants: ['Spin cycle', 'One red sock', 'Out of order'], interior: true,
      title(h, v) { if (!between(h, 20, 2) && v === 0) return 'Someone Left A Load In'; return ['No Worries, It’s Only Towels', 'Still Life With One Red Sock', 'Out Of Order, Like Me'][v]; },
      story: 'Open all night. The machines hum, and Nell folds towels for the inn and talks to whoever is waiting.',
      music: 'laundry', amb: 'laundry',
      paint(g, w, h, L, v) {
        const tile = mix([168, 180, 176], [92, 104, 108], 0.6 * L.dark); g.fillStyle = css(tile); g.fillRect(0, 0, w, h * 0.7);
        g.strokeStyle = 'rgba(80,90,90,.14)'; g.lineWidth = 1; for (let y = h * 0.3; y < h * 0.7; y += h * 0.03) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } for (let x = 0; x < w; x += h * 0.03) { g.beginPath(); g.moveTo(x, h * 0.3); g.lineTo(x, h * 0.7); g.stroke(); }
        // a long high window onto the street
        const wn = [w * 0.1, h * 0.08, w * 0.8, h * 0.17]; this.win = wn; g.save(); g.beginPath(); g.rect(...wn); g.clip(); g.translate(wn[0], wn[1]); sky(g, wn[2], wn[3] * 1.2, L, 71, [0.85, 0.35]);
        g.fillStyle = ink(L, 0.55, L.hill[1]); const r = rng(6); for (let x = 0; x < wn[2]; x += wn[2] * 0.12) { const bh = wn[3] * (0.3 + r() * 0.4); g.fillRect(x, wn[3] - bh, wn[2] * 0.1, bh); if (L.dark > 0.4 && r() < 0.6) { g.fillStyle = 'rgba(242,198,130,.8)'; g.fillRect(x + wn[2] * 0.03, wn[3] - bh * 0.7, wn[2] * 0.02, wn[3] * 0.08); g.fillStyle = ink(L, 0.55, L.hill[1]); } }
        g.restore(); g.strokeStyle = 'rgba(50,56,60,.9)'; g.lineWidth = w * 0.01; g.strokeRect(...wn); for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(wn[0] + wn[2] * i / 4, wn[1]); g.lineTo(wn[0] + wn[2] * i / 4, wn[1] + wn[3]); g.stroke(); }
        g.fillStyle = css(mix(tile, [30, 34, 38], 0.55)); g.fillRect(0, h * 0.6, w, h * 0.1); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, h * 0.6, w, 1.5);
        g.fillStyle = css(mix([52, 56, 60], [22, 24, 28], 0.5)); g.fillRect(0, h * 0.7, w, h * 0.3);
        g.strokeStyle = 'rgba(255,255,255,.04)'; for (let x = -h; x < w + h; x += w * 0.1) { g.beginPath(); g.moveTo(x, h * 0.7); g.lineTo(x - w * 0.2, h); g.stroke(); }
        // four machines
        this.mach = []; for (let i = 0; i < 4; i++) { const mx = w * (0.08 + i * 0.215), my = h * 0.44, mw = w * 0.2, mh = h * 0.25; this.mach.push([mx, my, mw, mh]);
          g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(mx + mw / 2, h * 0.7, mw * 0.6, h * 0.01, 0, 0, 7); g.fill();
          g.fillStyle = vgrad(g, my, my + mh, [[0, css(mix([232, 234, 228], tile, 0.2))], [1, css(mix([170, 176, 174], tile, 0.4))]]); g.beginPath(); g.roundRect(mx, my, mw, mh, 6); g.fill(); g.fillStyle = 'rgba(30,30,36,.14)'; g.fillRect(mx, my + mh * 0.18, mw, 1.5);
          g.save(); g.globalAlpha = 0.12; g.fillStyle = vgrad(g, h * 0.7, h * 0.7 + mh * 0.6, [[0, css([226, 230, 226])], [1, 'rgba(0,0,0,0)']]); g.fillRect(mx, h * 0.7, mw, mh * 0.6); g.restore();
          g.fillStyle = 'rgba(40,44,48,.85)'; g.beginPath(); g.arc(mx + mw / 2, my + mh * 0.58, mw * 0.33, 0, 7); g.fill(); g.strokeStyle = 'rgba(160,166,170,.9)'; g.lineWidth = mw * 0.05; g.stroke(); }
        g.fillStyle = `rgba(150,200,180,${0.06 + 0.06 * L.dark})`; g.fillRect(0, 0, w, h); finish(g, w, h, 0.4 + 0.3 * L.dark);
      },
      front(g, w, h, L, now, v) {
        // the strip light hums (and stutters over the broken machine)
        const fl = v === 2 && Math.sin(now / 70) * Math.sin(now / 230) > 0.6 ? 0.55 : 1; g.fillStyle = `rgba(240,248,244,${0.9 * fl})`; g.fillRect(w * 0.25, h * 0.285, w * 0.5, h * 0.008); glow(g, w * 0.5, h * 0.3, w * 0.7, [220, 236, 232], 0.18 * fl);
        this.mach.forEach(([mx, my, mw, mh], i) => {
          const cx = mx + mw / 2, cy = my + mh * 0.58, rr = mw * 0.3, spin = i === 1;
          if (spin) { g.save(); g.beginPath(); g.arc(cx, cy, rr, 0, 7); g.clip(); g.fillStyle = 'rgba(70,80,90,.9)'; g.fillRect(cx - rr, cy - rr, rr * 2, rr * 2); const a = now / 260;
            for (let j = 0; j < 7; j++) { const aj = a + j * 0.9, d = rr * (0.35 + (j % 3) * 0.15); g.fillStyle = v === 1 && j === 3 ? '#d44a3c' : css(mix([236, 232, 222], [150, 170, 190], (j % 3) / 3)); g.beginPath(); g.ellipse(cx + Math.cos(aj) * d, cy + Math.sin(aj) * d * 0.9 + rr * 0.2, rr * 0.3, rr * 0.18, aj, 0, 7); g.fill(); }
            g.restore(); }
          g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(cx - rr * 0.3, cy - rr * 0.35, rr * 0.35, rr * 0.18, -0.6, 0, 7); g.fill();
          g.fillStyle = spin && v !== 1 ? (Math.sin(now / 400) > 0 ? '#e4523f' : '#7a3a34') : 'rgba(60,64,70,.6)'; g.beginPath(); g.arc(mx + mw * 0.82, my + mh * 0.09, mw * 0.03, 0, 7); g.fill();
          if (v === 2 && i === 2) paper(g, cx, cy, mw * 0.6, mh * 0.2, 'OUT OF\nORDER', 0.08);
        });
        const shake = Math.sin(now / 45) * 0.6; this.mach[1] && (this.mach[1].shake = shake);
        // a bench, and a stack of folded towels
        const by = h * 0.82, k = 'rgba(30,26,24,.92)'; g.fillStyle = k; g.fillRect(w * 0.18, by - h * 0.012, w * 0.66, h * 0.014); g.fillRect(w * 0.22, by, w * 0.012, h * 0.06); g.fillRect(w * 0.78, by, w * 0.012, h * 0.06);
        for (let i = 0; i < 4; i++) { g.fillStyle = css(mix([236, 232, 222], [196, 200, 210], i % 2 ? 0.4 : 0)); g.beginPath(); g.roundRect(w * 0.66, by - h * 0.012 - (i + 1) * h * 0.016, w * 0.12, h * 0.016, 3); g.fill(); }
        const nellThere = between(L.h, 20, 2) || v !== 0;
        return { cast: nellThere ? [{ who: 'nell', x: w * 0.45, y: by - h * 0.012, s: w * 0.17, src: { x: w * 0.5, y: h * 0.29 }, mode: 'idle', warm: 0 }] : [], clip: [this.win] };
      } },

    // ---------------------------------------------------------------- the rooftop
    { id: 'roof', name: 'The rooftop', who: 'Pip', hours: 'Up the back stairs, any time', variants: ['Washing day', 'A kite stuck', 'Shooting stars'],
      title(h, v) { return ['Higher Than The 45', 'The Kite Isn’t Mine', 'Make One For Me'][v]; },
      story: 'Above the burrow: a water tower, a washing line and the whole town in lights. Pip comes up here to think.',
      music: 'roof', amb: 'wind',
      paint(g, w, h, L) {
        const hz = h * 0.66; this.hz = hz; sky(g, w, hz, L, 21, [0.7, 0.18]);
        // the town below: two bands of roofs, windows lighting up one by one
        [[0.0, 0.6, 31, 0.5], [0.04, 0.45, 32, 0.75]].forEach(([dy, tone, seed, sc]) => { const r = rng(seed), c = mix(L.hill[0], [8, 6, 10], tone); g.fillStyle = css(c); for (let x = -10; x < w; ) { const bw = w * (0.05 + r() * 0.08) * sc, bh = h * (0.03 + r() * 0.06) * sc; const y = hz + h * dy; g.fillRect(x, y - bh, bw, bh + h * 0.2); if (r() < 0.3) { g.beginPath(); g.moveTo(x, y - bh); g.lineTo(x + bw / 2, y - bh - bh * 0.4); g.lineTo(x + bw, y - bh); g.fill(); }
          for (let wy = y - bh + h * 0.012; wy < y + h * 0.02; wy += h * 0.016) for (let wx = x + bw * 0.15; wx < x + bw - 3; wx += bw * 0.25) if (r() < L.dark * 0.5) { g.fillStyle = 'rgba(242,198,130,.85)'; g.fillRect(wx, wy, 2.4 * sc + 0.5, 3 * sc + 0.5); g.fillStyle = css(c); }
          x += bw + w * 0.004; } });
        // the parapet we sit on
        const py = h * 0.8; this.py = py; g.fillStyle = css(mix(L.gnd[1], [10, 8, 12], 0.4)); g.fillRect(0, py, w, h - py); g.fillStyle = css(mix(L.gnd[0], [255, 255, 255], 0.08)); g.fillRect(0, py, w, h * 0.012); wash(g, 0, py, w, h - py, 23, 3);
        // the water tower
        const tx = w * 0.15, k = ink(L, 0.55, L.sky[0]); g.strokeStyle = k; g.lineWidth = w * 0.008; [[-0.06, 0.05], [0.06, -0.05]].forEach(([a, b]) => { g.beginPath(); g.moveTo(tx + w * a, py); g.lineTo(tx + w * b * 0.3, h * 0.44); g.stroke(); });
        g.lineWidth = w * 0.004; g.beginPath(); g.moveTo(tx - w * 0.05, h * 0.68); g.lineTo(tx + w * 0.04, h * 0.56); g.moveTo(tx + w * 0.05, h * 0.68); g.lineTo(tx - w * 0.04, h * 0.56); g.stroke();
        g.fillStyle = k; g.beginPath(); g.roundRect(tx - w * 0.09, h * 0.3, w * 0.18, h * 0.14, 4); g.fill(); g.beginPath(); g.moveTo(tx - w * 0.1, h * 0.3); g.lineTo(tx, h * 0.25); g.lineTo(tx + w * 0.1, h * 0.3); g.fill();
        g.fillRect(w * 0.9, h * 0.44, w * 0.008, py - h * 0.44); finish(g, w, h, 0.4);
      },
      front(g, w, h, L, now, v) {
        const wind = L.wx === 'wind' ? 2.4 : 1, a = { x: w * 0.2, y: h * 0.47 }, b = { x: w * 0.9, y: h * 0.45 }, sag = h * 0.05;
        const lineY = (x) => { const t = (x - a.x) / (b.x - a.x); return a.y + (b.y - a.y) * t + sag * 4 * t * (1 - t); };
        g.strokeStyle = ink(L, 0.4, L.sky[1]); g.lineWidth = 0.8; g.beginPath(); for (let x = a.x; x <= b.x; x += 4) x === a.x ? g.moveTo(x, lineY(x)) : g.lineTo(x, lineY(x)); g.stroke();
        if (v !== 2) { const items = v === 0 ? [[0.3, 0.12, 0.13, 0], [0.48, 0.1, 0.09, 1], [0.64, 0.14, 0.12, 0]] : [[0.36, 0.13, 0.12, 0], [0.6, 0.12, 0.1, 0]];
          items.forEach(([f, wd, ht, red], i) => { const x0 = a.x + (b.x - a.x) * f, ww = w * wd, hh = h * ht; const c = red ? [204, 70, 56] : mix([236, 234, 226], L.sky[1], 0.35 + 0.35 * L.dark);
            g.fillStyle = css(c, red ? 1 : 0.92); g.beginPath(); const steps = 10; for (let s = 0; s <= steps; s++) { const x = x0 + ww * s / steps; s ? g.lineTo(x, lineY(x)) : g.moveTo(x, lineY(x)); }
            for (let s = steps; s >= 0; s--) { const x = x0 + ww * s / steps, wave = Math.sin(now / 600 * wind + s * 0.7 + i) * h * 0.008 * wind * (s / steps + 0.3), lift = (wind - 1) * h * 0.02 * (s / steps); g.lineTo(x + wave * 0.6 + lift * 1.2, lineY(x) + hh - lift + wave); } g.closePath(); g.fill(); }); }
        if (v === 1) { const kx = w * 0.12, ky = h * 0.24; g.save(); g.translate(kx, ky); g.rotate(-0.3 + Math.sin(now / 700) * 0.06 * wind); g.fillStyle = '#d4483a'; g.beginPath(); g.moveTo(0, -h * 0.04); g.lineTo(w * 0.035, 0); g.lineTo(0, h * 0.05); g.lineTo(-w * 0.035, 0); g.closePath(); g.fill(); g.strokeStyle = 'rgba(120,40,30,.6)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, -h * 0.04); g.lineTo(0, h * 0.05); g.moveTo(-w * 0.035, 0); g.lineTo(w * 0.035, 0); g.stroke();
          g.strokeStyle = 'rgba(230,226,216,.6)'; g.beginPath(); g.moveTo(0, h * 0.05); for (let i = 1; i < 8; i++) g.lineTo(Math.sin(now / 300 * wind + i) * w * 0.015 + i * w * 0.01, h * 0.05 + i * h * 0.012); g.stroke(); g.restore(); }
        if (v === 2 && L.dark > 0.5) { const t = (now % 5000) / 5000; if (t < 0.18) { const u = t / 0.18, x0 = w * 0.75, y0 = h * 0.06; g.strokeStyle = `rgba(255,250,236,${0.8 * Math.sin(u * Math.PI)})`; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x0 - u * w * 0.4, y0 + u * h * 0.12); g.lineTo(x0 - u * w * 0.4 + w * 0.08, y0 + u * h * 0.12 - h * 0.024); g.stroke(); } }
        const src = L.dark > 0.5 ? { x: w * 0.7, y: h * 0.18 } : (sunPos(w, this.hz, L.h) || { x: w * 0.3, y: 0 });
        return { cast: [pipAt(w * 0.56, this.py, w * 0.16, src, v === 2 ? 'listen' : 'idle', 0.04 * L.dark)] };
      } },

    // ---------------------------------------------------------------- the train platform
    { id: 'platform', name: 'The train platform', who: 'Sol', hours: 'Sol takes the 6:40 home and arrives early, always', variants: ['Waiting', 'Delayed', 'A lost suitcase'],
      title(h, v) { return ['Just To Confirm, The 6:40', 'Delayed, Politely', 'Whose Suitcase Is This?'][v]; },
      story: 'A long platform that runs into the distance. Sol checks the clock, then checks it again.',
      music: 'platform', amb: 'platform',
      vp: [0.34, 0.5],
      paint(g, w, h, L) {
        const [vx, vy] = [w * this.vp[0], h * this.vp[1]];
        // open sky over the tracks on the right
        g.fillStyle = vgrad(g, 0, vy, [[0, css(L.sky[0])], [0.6, css(L.sky[1])], [1, css(L.sky[2])]]); g.fillRect(0, 0, w, vy + 2); stars(g, w * 0.4, 0, w * 0.6, vy * 0.6, 81, 18, L.stars); glow(g, vx, vy, w * 0.8, L.haze, L.hazeA + 0.08);
        hills(g, w, vy, h * 0.02, L.hill[1], 41);
        g.fillStyle = vgrad(g, vy, h, [[0, css(L.gnd[0])], [1, css(L.gnd[1])]]); g.fillRect(0, vy, w, h - vy);
        // the tracks run to the vanishing point
        g.strokeStyle = 'rgba(180,180,190,.35)'; g.lineWidth = 1; [0.82, 1.15].forEach((f) => { g.beginPath(); g.moveTo(vx, vy); g.lineTo(w * f, h); g.stroke(); });
        for (let i = 1; i < 14; i++) { const t = Math.pow(i / 14, 2), y = vy + (h - vy) * t, xa = vx + (w * 0.78 - vx) * t, xb = vx + (w * 1.2 - vx) * t; g.strokeStyle = `rgba(20,16,20,${0.3 + t * 0.4})`; g.lineWidth = 1 + t * 3; g.beginPath(); g.moveTo(xa, y); g.lineTo(xb, y); g.stroke(); }
        // the platform floor with its pale edge line
        g.fillStyle = css(mix(L.gnd[0], [200, 196, 188], 0.12)); g.beginPath(); g.moveTo(vx, vy); g.lineTo(w * 0.7, h); g.lineTo(0, h); g.lineTo(0, vy + h * 0.02); g.fill();
        g.strokeStyle = 'rgba(236,228,206,.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(vx, vy); g.lineTo(w * 0.66, h); g.stroke();
        g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1; for (let i = 1; i < 10; i++) { const t = Math.pow(i / 10, 1.8), y = vy + (h - vy) * t; g.beginPath(); g.moveTo(0, y + h * 0.02 * (1 - t)); g.lineTo(vx + (w * 0.66 - vx) * t, y); g.stroke(); } [0.2, 0.45].forEach((f) => { g.beginPath(); g.moveTo(vx, vy); g.lineTo(w * 0.66 * f, h); g.stroke(); });
        // the canopy overhead, its pillars marching away
        const k = ink(L, 0.65, L.gnd[1]); g.fillStyle = k; g.beginPath(); g.moveTo(0, 0); g.lineTo(w * 0.72, 0); g.lineTo(vx, vy - h * 0.06); g.lineTo(0, vy - h * 0.02); g.fill();
        for (let i = 0; i < 9; i++) { const t = Math.pow(0.78, i), x = vx + (w * 0.62 - vx) * t, top = vy - h * 0.06 + (-vy + h * 0.06) * t * 0.98, bot = vy + (h - vy) * t; g.fillRect(x - w * 0.008 * t, top, w * 0.016 * t + 1, bot - top); }
        for (let i = 1; i < 8; i++) { const t = Math.pow(0.72, i), x = vx + (w * 0.3 - vx) * t, y = vy - h * 0.05 + (h * 0.04 - vy) * t * 0.5; if (L.dark > 0.3) glow(g, x, y, w * 0.05 * t + 2, WARM, 0.5 * L.dark); g.fillStyle = L.dark > 0.3 ? 'rgba(255,224,170,.9)' : 'rgba(200,196,186,.4)'; g.fillRect(x - w * 0.02 * t, y, w * 0.04 * t + 1, 1.5); }
        g.fillStyle = k; g.fillRect(w * 0.06, h * 0.85, w * 0.2, h * 0.012); g.fillRect(w * 0.06, h * 0.81, w * 0.2, h * 0.008); g.fillRect(w * 0.08, h * 0.862, w * 0.008, h * 0.04); g.fillRect(w * 0.24, h * 0.862, w * 0.008, h * 0.04);
        finish(g, w, h, 0.45); this.k = k;
      },
      front(g, w, h, L, now, v) {
        const [vx, vy] = [w * this.vp[0], h * this.vp[1]];
        // a train's lights grow out of the distance now and then
        const t = (now % 28000) / 28000; if (t < 0.25) { const u = t / 0.25, s = w * (0.004 + u * u * 0.05); glow(g, vx + w * 0.06 * u, vy + h * 0.01 + u * h * 0.02, s * 12, [255, 244, 220], 0.2 + u * 0.5); g.fillStyle = 'rgba(255,248,230,.95)'; [-1, 1].forEach((d) => { g.beginPath(); g.arc(vx + w * 0.06 * u + d * s * 1.4, vy + h * 0.01 + u * h * 0.02, s * 0.5, 0, 7); g.fill(); }); }
        // the clock tells the real time; the second hand is the one red thing
        const cx = w * 0.6, cy = h * 0.2, r = w * 0.06; g.strokeStyle = this.k; g.lineWidth = 1.2; g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, cy - r); g.stroke();
        glow(g, cx, cy, r * 2.5, [255, 236, 210], 0.1 + 0.15 * L.dark); g.fillStyle = css(mix([236, 230, 216], [200, 190, 170], 0.2)); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); g.strokeStyle = this.k; g.lineWidth = r * 0.12; g.stroke();
        const hr = L.h % 12, mn = (L.h % 1) * 60, sec = (now / 1000) % 60, hand = (a, len, wd, c) => { g.strokeStyle = c; g.lineWidth = wd; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(a) * len, cy - Math.cos(a) * len); g.stroke(); };
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillStyle = '#2a2428'; g.fillRect(cx + Math.sin(a) * r * 0.8 - 1, cy - Math.cos(a) * r * 0.8 - 1, 2, 2); }
        hand(hr / 12 * Math.PI * 2, r * 0.5, r * 0.11, '#1e1a1e'); hand(mn / 60 * Math.PI * 2, r * 0.75, r * 0.07, '#1e1a1e'); hand(Math.floor(sec) / 60 * Math.PI * 2, r * 0.82, r * 0.03, '#d4483a');
        if (v === 1) { const bx = w * 0.84, by = h * 0.27; g.strokeStyle = this.k; g.beginPath(); g.moveTo(bx - w * 0.06, 0); g.lineTo(bx - w * 0.06, by); g.moveTo(bx + w * 0.06, 0); g.lineTo(bx + w * 0.06, by); g.stroke(); g.fillStyle = '#141014'; g.fillRect(bx - w * 0.1, by, w * 0.2, h * 0.045); g.fillStyle = (now % 1600) < 1100 ? '#f2b45a' : '#7a5a2e'; g.font = `700 ${w * 0.026}px ${SF}`; g.textAlign = 'center'; g.fillText('6:40 DELAYED', bx, by + h * 0.029); glow(g, bx, by + h * 0.025, w * 0.2, [242, 180, 90], 0.12); }
        if (v === 2) { const sx = w * 0.24, sy = h * 0.9; g.fillStyle = css(mix([120, 92, 70], L.gnd[1], 0.3)); g.beginPath(); g.roundRect(sx - w * 0.06, sy - h * 0.07, w * 0.12, h * 0.07, 5); g.fill(); g.strokeStyle = 'rgba(30,20,16,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(sx - w * 0.02, sy - h * 0.07); g.lineTo(sx - w * 0.02, sy - h * 0.085); g.lineTo(sx + w * 0.02, sy - h * 0.085); g.lineTo(sx + w * 0.02, sy - h * 0.07); g.stroke(); paper(g, sx + w * 0.03, sy - h * 0.035, w * 0.03, h * 0.02, '', 0.2); }
        return { cast: [{ who: 'sol', x: w * 0.46, y: h * 0.83, s: w * 0.21, src: { x: cx, y: cy }, mode: 'idle', warm: 0.02 }], clip: [[w * 0.45, 0, w * 0.55, h]] };
      } },

    // ---------------------------------------------------------------- the library after hours
    { id: 'library', name: 'The library', who: 'Linh', hours: 'Linh stays after closing, most nights till nine', variants: ['Closing time', 'A note in a book', 'Power cut'], interior: true,
      title(h, v) { return ['I Used To Freeze Too', 'Somebody Wrote In The Margin', 'Reading By Candle, Quietly'][v]; },
      story: 'Tall shelves and one lamp. Linh learned English as an adult, and she remembers every word she was afraid of.',
      music: 'library', amb: 'library',
      paint(g, w, h, L, v) {
        const wall = mix(L.wall[0], [40, 30, 28], 0.5); g.fillStyle = css(wall); g.fillRect(0, 0, w, h * 0.66); wash(g, 0, 0, w, h * 0.66, 91, 8);
        const wn = [w * 0.38, h * 0.08, w * 0.24, h * 0.4]; this.win = wn; g.save(); g.beginPath(); g.moveTo(wn[0], wn[1] + wn[3]); g.lineTo(wn[0], wn[1] + wn[2] / 2); g.arc(wn[0] + wn[2] / 2, wn[1] + wn[2] / 2, wn[2] / 2, Math.PI, 0); g.lineTo(wn[0] + wn[2], wn[1] + wn[3]); g.closePath(); g.clip(); g.translate(wn[0], wn[1]); sky(g, wn[2], wn[3] * 1.3, L, 93, [0.65, 0.3]); g.restore();
        g.strokeStyle = 'rgba(30,22,20,.9)'; g.lineWidth = w * 0.01; g.beginPath(); g.moveTo(wn[0], wn[1] + wn[3]); g.lineTo(wn[0], wn[1] + wn[2] / 2); g.arc(wn[0] + wn[2] / 2, wn[1] + wn[2] / 2, wn[2] / 2, Math.PI, 0); g.lineTo(wn[0] + wn[2], wn[1] + wn[3]); g.closePath(); g.stroke(); g.lineWidth = w * 0.005; g.beginPath(); g.moveTo(wn[0] + wn[2] / 2, wn[1]); g.lineTo(wn[0] + wn[2] / 2, wn[1] + wn[3]); g.moveTo(wn[0], wn[1] + wn[3] * 0.6); g.lineTo(wn[0] + wn[2], wn[1] + wn[3] * 0.6); g.stroke();
        // shelves on both sides, full of books in quiet colours
        const r = rng(12), shelf = css(mix(wall, [20, 14, 12], 0.55)); [[0, w * 0.32], [w * 0.68, w]].forEach(([x0, x1]) => { g.fillStyle = shelf; g.fillRect(x0, h * 0.04, x1 - x0, h * 0.62);
          for (let y = h * 0.1; y < h * 0.64; y += h * 0.075) { let x = x0 + w * 0.012; while (x < x1 - w * 0.02) { const bw = w * (0.008 + r() * 0.014), bh = h * (0.04 + r() * 0.025); g.fillStyle = css(mix([[120, 90, 70], [80, 96, 100], [140, 120, 96], [90, 80, 100], [110, 70, 64]][Math.floor(r() * 5)], wall, 0.3 + 0.4 * L.dark)); g.fillRect(x, y + h * 0.065 - bh, bw, bh); x += bw + 1; } g.fillStyle = 'rgba(10,8,8,.6)'; g.fillRect(x0, y + h * 0.065, x1 - x0, h * 0.008); } });
        g.fillStyle = css(mix(L.floor[1], [30, 20, 16], 0.4)); g.fillRect(0, h * 0.66, w, h * 0.34);
        finish(g, w, h, 0.55);
      },
      front(g, w, h, L, now, v) {
        const dy = h * 0.74, lamp = { x: w * 0.3, y: dy - h * 0.09 }, cut = v === 2;
        if (!cut) { glow(g, lamp.x, dy - h * 0.02, w * 0.6, [255, 214, 150], 0.32); g.fillStyle = 'rgba(255,214,150,.12)'; g.beginPath(); g.ellipse(lamp.x + w * 0.05, dy, w * 0.3, h * 0.025, 0, 0, 7); g.fill(); }
        const candle = { x: w * 0.47, y: dy - h * 0.05 }; if (cut) { const fl = 0.85 + 0.15 * Math.sin(now / 80) * Math.sin(now / 37); glow(g, candle.x, candle.y, w * 0.4 * fl, [255, 190, 120], 0.3 * fl); }
        const desk = () => {
          g.fillStyle = css(mix([86, 58, 44], [34, 24, 20], 0.45)); g.fillRect(w * 0.06, dy, w * 0.88, h * 0.03); g.fillStyle = 'rgba(255,220,170,.12)'; g.fillRect(w * 0.06, dy, w * 0.88, 1.5);
          g.fillStyle = css(mix([60, 40, 30], [20, 14, 12], 0.5)); g.fillRect(w * 0.08, dy + h * 0.03, w * 0.03, h * 0.2); g.fillRect(w * 0.89, dy + h * 0.03, w * 0.03, h * 0.2);
          // the lamp: brass foot, a muted teal shade
          g.fillStyle = '#6e5a3a'; g.fillRect(lamp.x - w * 0.025, dy - h * 0.006, w * 0.05, h * 0.006); g.fillRect(lamp.x - 1.5, dy - h * 0.08, 3, h * 0.075);
          g.fillStyle = cut ? '#2e3c3a' : '#3f6460'; g.beginPath(); g.moveTo(lamp.x - w * 0.06, lamp.y + h * 0.012); g.quadraticCurveTo(lamp.x, lamp.y - h * 0.02, lamp.x + w * 0.06, lamp.y + h * 0.012); g.fill();
          if (!cut) { g.fillStyle = 'rgba(255,232,190,.9)'; g.fillRect(lamp.x - w * 0.05, lamp.y + h * 0.01, w * 0.1, 2); }
          // the red book
          g.fillStyle = '#b8443a'; g.fillRect(w * 0.7, dy - h * 0.014, w * 0.11, h * 0.014); g.fillStyle = 'rgba(240,230,210,.8)'; g.fillRect(w * 0.7, dy - h * 0.004, w * 0.11, 1.5);
          if (v === 1) { paper(g, w * 0.76, dy - h * 0.028, w * 0.035, h * 0.02, '', -0.3); glow(g, w * 0.76, dy - h * 0.03, w * 0.06, [255, 240, 210], 0.25); }
          if (cut) { g.fillStyle = '#efe6d6'; g.fillRect(candle.x - 3, candle.y, 6, h * 0.05); g.fillStyle = '#ffd08a'; g.beginPath(); g.ellipse(candle.x, candle.y - 4 + Math.sin(now / 90), 2.4, 5, Math.sin(now / 200) * 0.2, 0, 7); g.fill(); }
        };
        return { cast: [{ who: 'linh', x: w * 0.56, y: dy + h * 0.07, s: w * 0.2, src: cut ? candle : lamp, mode: 'idle', warm: 0.14 }], after: desk, clip: [this.win] };
      } },

    // ---------------------------------------------------------------- the interview room
    { id: 'interview', name: 'The interview room', who: 'Dex', hours: 'Dex sees people from 8 to 8', variants: ['Your turn', 'Coffee gone cold', 'Tell me about a time'], interior: true,
      title(h, v) { if (!between(h, 8, 20) && v === 0) return 'Nobody Is Hiring At Midnight'; return ['Can You Give Me A Number?', 'The Coffee Went Cold', 'Tell Me About A Time'][v]; },
      story: 'A plain room with blinds and two chairs. Dex is fair, direct and secretly rooting for you.',
      music: 'interview', amb: 'office',
      paint(g, w, h, L) {
        const wall = mix(L.wall[1], [150, 140, 128], 0.45); g.fillStyle = css(wall); g.fillRect(0, 0, w, h * 0.72); wash(g, 0, 0, w, h * 0.72, 101, 7);
        const wn = [w * 0.6, h * 0.12, w * 0.3, h * 0.36]; this.win = wn; g.save(); g.beginPath(); g.rect(...wn); g.clip(); g.translate(wn[0], wn[1]); sky(g, wn[2], wn[3] * 1.4, L, 103, [0.5, 0.3]); g.fillStyle = ink(L, 0.5, L.hill[1]); const r = rng(3); for (let x = 0; x < wn[2]; x += wn[2] * 0.18) { const bh = wn[3] * (0.2 + r() * 0.3); g.fillRect(x, wn[3] - bh, wn[2] * 0.15, bh); } g.restore();
        g.strokeStyle = 'rgba(40,34,30,.9)'; g.lineWidth = w * 0.012; g.strokeRect(...wn);
        g.fillStyle = css(mix(L.floor[0], [60, 54, 50], 0.4)); g.fillRect(0, h * 0.72, w, h * 0.28); g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(0, h * 0.72, w, 1.5);
        finish(g, w, h, 0.4);
      },
      front(g, w, h, L, now, v) {
        const [x, y, ww, wh] = this.win, day = L.dark < 0.5 && L.wx !== 'rain' && L.wx !== 'fog', lc = day ? [255, 230, 190] : [200, 210, 236], la = day ? 0.18 * (1 - L.dark) : 0.08;
        // blinds over the window, and their stripes thrown across the wall and table
        g.fillStyle = 'rgba(46,40,36,.82)'; for (let i = 0; i < 12; i++) g.fillRect(x, y + wh * (i / 12), ww, wh * 0.045);
        g.save(); g.globalCompositeOperation = 'screen'; for (let i = 0; i < 9; i++) { const yy = y + h * 0.08 + i * h * 0.03; g.fillStyle = css(lc, la); g.beginPath(); g.moveTo(x, yy); g.lineTo(x - w * 0.5, yy + h * 0.16); g.lineTo(x - w * 0.5, yy + h * 0.172); g.lineTo(x, yy + h * 0.012); g.fill(); } g.restore();
        const ty = h * 0.66, dexThere = between(L.h, 8, 20) || v !== 0;
        const table = () => {
          g.fillStyle = css(mix([120, 100, 80], [50, 42, 36], 0.4)); g.beginPath(); g.moveTo(w * 0.12, ty); g.lineTo(w * 0.88, ty); g.lineTo(w * 0.96, ty + h * 0.06); g.lineTo(w * 0.04, ty + h * 0.06); g.fill(); g.fillStyle = css(mix([90, 74, 60], [30, 26, 22], 0.4)); g.fillRect(w * 0.04, ty + h * 0.06, w * 0.92, h * 0.018);
          g.fillStyle = 'rgba(30,26,22,.9)'; g.fillRect(w * 0.08, ty + h * 0.078, w * 0.02, h * 0.16); g.fillRect(w * 0.9, ty + h * 0.078, w * 0.02, h * 0.16);
          g.save(); g.globalCompositeOperation = 'screen'; for (let i = 0; i < 4; i++) { g.fillStyle = css(lc, la * 0.8); g.fillRect(w * (0.2 + i * 0.12), ty + h * 0.01, w * 0.05, h * 0.045); } g.restore();
          g.fillStyle = '#b8443a'; g.save(); g.translate(w * 0.36, ty + h * 0.03); g.rotate(-0.08); g.fillRect(-w * 0.07, -h * 0.012, w * 0.14, h * 0.024); g.fillStyle = 'rgba(240,230,210,.7)'; g.fillRect(-w * 0.07, h * 0.01, w * 0.14, 1.5); g.restore();
          g.fillStyle = 'rgba(220,232,240,.45)'; g.fillRect(w * 0.62, ty + h * 0.01, w * 0.03, h * 0.04); g.fillStyle = 'rgba(236,228,214,.95)'; g.beginPath(); g.roundRect(w * 0.7, ty + h * 0.012, w * 0.04, h * 0.035, 3); g.fill(); if (v !== 1) steam(g, w * 0.72, ty + h * 0.008, now, w * 0.02, 0.25);
          // our empty chair, from behind
          g.fillStyle = 'rgba(16,14,14,.94)'; g.beginPath(); g.roundRect(w * 0.08, h * 0.8, w * 0.3, h * 0.22, [14, 14, 0, 0]); g.fill(); g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(w * 0.1, h * 0.805, w * 0.26, 1.5);
        };
        return { cast: dexThere ? [{ who: 'dex', x: w * 0.55, y: ty + h * 0.07, s: w * 0.22, src: day ? { x: x + ww / 2, y: y + wh / 2 } : { x: w * 0.5, y: 0 }, mode: v === 2 ? 'listen' : 'idle', warm: 0.03 }] : [], after: table, clip: [this.win] };
      } },
  ];
