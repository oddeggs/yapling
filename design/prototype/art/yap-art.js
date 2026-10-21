// Yapling art: Canvas 2D, authored SVG path data, flat 2.5D shading, separable parts.
(function(){
const PAL = {
  hedgehog:{fur:'#8A5B3C',shade:'#6E4630',light:'#A9764F',face:'#F7E0C2',faceSh:'#EAC6A0',ear:'#E9C29A',inner:'#F2A08A',foot:'#5E3F2A'},
  otter:{fur:'#A8744C',shade:'#8A5C3A',light:'#C28D62',face:'#F3DFC2',faceSh:'#E2C49E',ear:'#946240',inner:'#6E4A30',foot:'#6E4A30'},
  fox:{fur:'#EE8A3C',shade:'#D2702A',light:'#F8A866',face:'#FFF6EA',faceSh:'#EFDCC4',ear:'#EE8A3C',inner:'#5A3326',foot:'#4A2B20'},
  mei:{fur:'#71849A',shade:'#5A6C82',light:'#8EA0B4',face:'#F0EBE2',faceSh:'#DCD4C6',ear:'#63768C',inner:'#45546A',foot:'#45546A'}
};
const SHAPE = {mei:'otter'};
const INK='#2B2320', LIP='#5A2A24', TONGUE='#F07B6E', LIPLT='#C8705E';
const cache = {};
const P = d => cache[d] || (cache[d] = new Path2D(d));
const mir = d => { let n=0; return d.replace(/-?\d+(\.\d+)?/g, m => String((n++%2===0) ? 200-parseFloat(m) : parseFloat(m))); };
function fill(ctx, d, c){ ctx.fillStyle=c; ctx.fill(typeof d==='string'?P(d):d); }
function shaded(ctx, d, base, shade, dx, dy){
  const p = typeof d==='string'?P(d):d;
  ctx.fillStyle=shade; ctx.fill(p);
  ctx.save(); ctx.clip(p); ctx.translate(dx==null?-7:dx, dy==null?-6:dy); ctx.fillStyle=base; ctx.fill(p); ctx.restore();
}
function clipDo(ctx, d, fn){ ctx.save(); ctx.clip(typeof d==='string'?P(d):d); fn(); ctx.restore(); }
function ell(ctx,x,y,rx,ry,c,rot){ ctx.beginPath(); ctx.ellipse(x,y,rx,ry,rot||0,0,Math.PI*2); ctx.fillStyle=c; ctx.fill(); }

const BODY='M100 158 C136 158 158 188 156 212 C154 232 130 237 100 237 C70 237 46 232 44 212 C42 188 64 158 100 158 Z';
const BELLY='M100 182 C121 182 134 198 132 214 C130 229 117 234 100 234 C83 234 70 229 68 214 C66 198 79 182 100 182 Z';
const ARM='M56 184 C67 182 75 195 73 209 C71 222 61 225 54 219 C46 211 45 189 56 184 Z';
const FOOT='M60 229 C60 219 77 216 88 220 C97 224 97 237 84 239 C71 241 60 237 60 229 Z';
const H = {
  hedgehog:{ face:'M100 88 C110 75 128 70 143 80 C159 92 165 111 163 131 C161 163 134 181 100 181 C66 181 39 163 37 131 C35 111 41 92 57 80 C72 70 90 75 100 88 Z',
    ear:'M38 80 C31 61 45 45 60 49 C71 53 72 70 63 81 C56 88 43 88 38 80 Z', earIn:'M45 75 C42 64 50 56 58 59 C64 62 63 71 58 76 C54 80 48 80 45 75 Z', ey:122 },
  otter:{ head:'M100 52 C148 52 172 84 172 120 C172 158 142 182 100 182 C58 182 28 158 28 120 C28 84 52 52 100 52 Z',
    ear:'M35 94 C26 86 29 70 42 68 C53 66 59 77 55 87 C51 95 42 98 35 94 Z', earIn:'M40 88 C36 83 38 76 44 75 C49 74 51 80 49 85 C47 89 43 90 40 88 Z',
    muzzle:'M100 130 C128 130 150 140 150 157 C150 174 128 181 100 181 C72 181 50 174 50 157 C50 140 72 130 100 130 Z',
    patch:'M55 110 C55 96 66 90 76 90 C88 90 97 98 97 110 C97 122 87 128 76 128 C64 128 55 122 55 110 Z', ey:112 },
  fox:{ head:'M100 60 C140 60 166 82 170 112 C174 124 182 134 191 140 C177 144 168 148 160 154 C148 172 126 182 100 182 C74 182 52 172 40 154 C32 148 23 144 9 140 C18 134 26 124 30 112 C34 82 60 60 100 60 Z',
    muzzle:'M100 118 C114 118 126 128 138 141 C150 153 164 152 173 146 C161 166 132 182 100 182 C68 182 39 166 27 146 C36 152 50 153 62 141 C74 128 86 118 100 118 Z',
    ear:'M37 106 C29 73 35 41 54 22 C71 34 88 56 95 77 C78 83 54 93 37 106 Z', earIn:'M48 91 C44 71 48 51 56 39 C66 49 76 62 80 74 C70 78 58 84 48 91 Z',
    tuft:'M86 67 C83 51 90 38 100 27 C100 40 106 46 117 43 C112 52 114 61 112 69 C104 71 94 71 86 67 Z',
    tail:'M138 216 C171 216 192 190 188 155 C186 137 173 127 164 131 C171 150 163 177 136 191 Z', ey:116 }
};
let spines = null;
function spinePath(){
  if (spines) return spines;
  const p = new Path2D(), cx=100, cy=108, rx=82, ry=74, a0=Math.PI*0.86, a1=Math.PI*2.14, N=12, st=(a1-a0)/N;
  const pt=(a,r)=>[cx+Math.cos(a)*rx*r, cy+Math.sin(a)*ry*r];
  let s=pt(a0,0.92); p.moveTo(s[0],s[1]);
  for(let k=0;k<N;k++){
    const am=a0+st*(k+0.5)-0.1, b=pt(a0+st*(k+1),0.95), tip=pt(am,1.42);
    p.quadraticCurveTo(tip[0],tip[1],b[0],b[1]);
  }
  p.lineTo(150,175); p.lineTo(50,175); p.closePath();
  spines = {p, streaks: Array.from({length:N},(_,k)=>{const am=a0+st*(k+0.5)-0.06; return [pt(am,0.82),pt(am,1.06)];})};
  return spines;
}
const MOUTH = {
  rest:'M-11 -2 Q0 9 11 -2 Q0 4 -11 -2 Z',
  smile:'M-14 -4 C-8 -2 8 -2 14 -4 C12 8 6 13 0 13 C-6 13 -12 8 -14 -4 Z',
  A:'M-12 -6 C-6 -8 6 -8 12 -6 C12 6 6 13 0 13 C-6 13 -12 6 -12 -6 Z',
  E:'M-15 -4 C-8 -6 8 -6 15 -4 C12 4 6 7 0 7 C-6 7 -12 4 -15 -4 Z',
  O:'M0 -11 C6 -11 9 -5 9 0 C9 6 6 11 0 11 C-6 11 -9 6 -9 0 C-9 -5 -6 -11 0 -11 Z',
  F:'M-11 -2 C-6 -4 6 -4 11 -2 C9 4 5 6 0 6 C-5 6 -9 4 -11 -2 Z',
  L:'M-11 -5 C-6 -7 6 -7 11 -5 C11 5 6 11 0 11 C-6 11 -11 5 -11 -5 Z'
};
function mouth(ctx, m){
  if (m==='M'){ ctx.beginPath(); ctx.moveTo(-11,-1); ctx.quadraticCurveTo(0,3,11,-1); ctx.lineWidth=4.5; ctx.lineCap='round'; ctx.strokeStyle=LIP; ctx.stroke(); return; }
  if (m==='U'){ ell(ctx,0,0,8.5,9.5,LIPLT); ell(ctx,0,0.5,4.5,5.5,LIP); return; }
  const d = MOUTH[m]||MOUTH.rest; fill(ctx,d,LIP);
  if (m==='rest') return;
  clipDo(ctx,d,()=>{
    if (m==='A'||m==='smile'||m==='O') ell(ctx,0,11,8,5.5,TONGUE);
    if (m==='E'||m==='F'||m==='L'){ ctx.fillStyle='#fff'; ctx.fillRect(-16,-9,32,m==='L'?5:6); }
    if (m==='L') ell(ctx,0,1,6,4.5,TONGUE);
  });
  if (m==='F'){ ctx.beginPath(); ctx.moveTo(-9,5); ctx.quadraticCurveTo(0,10,9,5); ctx.lineWidth=3.5; ctx.lineCap='round'; ctx.strokeStyle=LIPLT; ctx.stroke(); }
}
function brow(ctx,x,y,rot,arch){
  ctx.save(); ctx.translate(x,y); ctx.rotate(rot); ctx.beginPath();
  ctx.moveTo(-12,2); ctx.quadraticCurveTo(0,-7-arch,12,2); ctx.quadraticCurveTo(0,-1-arch,-12,2); ctx.closePath();
  ctx.fillStyle=INK; ctx.fill(); ctx.restore();
}
const MOOD = { happy:{l:-0.06,r:0.06,dl:0,dr:0,a:2,lx:0,ly:0}, listen:{l:-0.24,r:0.24,dl:-5,dr:-5,a:3,lx:2,ly:0},
  think:{l:-0.3,r:0.05,dl:-8,dr:1,a:1,lx:-3,ly:-3}, patient:{l:-0.14,r:0.14,dl:-2,dr:-2,a:1,lx:0,ly:1} };

function critter(ctx, w, h, o){
  const sp=o.sp||'hedgehog', p=PAL[sp], s=SHAPE[sp]||sp, D=H[s], ey=D.ey, mo=MOOD[o.mood]||MOOD.happy;
  ctx.scale(w/200, h/240);
  ell(ctx,100,237,60,6.5,'rgba(43,35,32,.13)');
  if (s==='fox'){ shaded(ctx,D.tail,p.fur,p.shade,-5,-4); clipDo(ctx,D.tail,()=>ell(ctx,183,147,24,22,p.face)); }
  if (s==='otter') shaded(ctx,'M144 224 C172 228 192 214 197 194 C183 206 164 209 146 205 Z',p.fur,p.shade,-3,-3);
  shaded(ctx,BODY,p.fur,p.shade);
  fill(ctx,BELLY,p.face);
  clipDo(ctx,BELLY,()=>ell(ctx,122,226,30,20,p.faceSh));
  [FOOT,mir(FOOT)].forEach(d=>shaded(ctx,d,p.foot,'#3A261C',-2,-3));
  [ARM,mir(ARM)].forEach(d=>shaded(ctx,d,p.fur,p.shade,-3,-3));
  ctx.save();
  ctx.translate(100,172); ctx.rotate((o.tilt||0)*Math.PI/180); ctx.translate(-100,-172);
  const earRot = o.mood==='listen'?-0.12:0;
  const ears = (dOut, dIn, col) => [[dOut,dIn,1],[mir(dOut),mir(dIn),-1]].forEach(([a,b,sg])=>{
    ctx.save(); ctx.translate(100-sg*48,84); ctx.rotate(earRot*sg); ctx.translate(-(100-sg*48),-84);
    shaded(ctx,a,col,p.shade,-3,-3); fill(ctx,b,p.inner); ctx.restore(); });
  if (s==='hedgehog'){
    const S=spinePath();
    ctx.save(); ctx.translate(5,5); fill(ctx,S.p,p.shade); ctx.restore();
    fill(ctx,S.p,p.fur);
    ctx.lineCap='round'; ctx.lineWidth=3.2; ctx.strokeStyle=p.light;
    S.streaks.forEach(([a,b],k)=>{ if(k%2) return; ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]); ctx.stroke(); });
    ears(D.ear,D.earIn,p.ear);
    shaded(ctx,D.face,p.face,p.faceSh,-6,-5);
  } else if (s==='otter'){
    ears(D.ear,D.earIn,p.ear);
    shaded(ctx,D.head,p.fur,p.shade);
    clipDo(ctx,D.head,()=>ell(ctx,72,72,26,12,p.light,-0.4));
    fill(ctx,D.patch,p.face); fill(ctx,mir(D.patch),p.face);
    shaded(ctx,D.muzzle,p.face,p.faceSh,-5,-4);
  } else {
    ears(D.ear,D.earIn,p.ear);
    shaded(ctx,D.head,p.fur,p.shade);
    clipDo(ctx,D.head,()=>ell(ctx,70,80,26,11,p.light,-0.45));
    shaded(ctx,D.muzzle,p.face,p.faceSh,-5,-4);
    shaded(ctx,D.tuft,p.fur,p.shade,-3,-2);
  }
  ell(ctx,60,ey+27,11,7,'rgba(243,140,120,.5)'); ell(ctx,140,ey+27,11,7,'rgba(243,140,120,.5)');
  [76,124].forEach(x=>{
    const ex=x+(o.look||mo.lx), eyy=ey+mo.ly;
    if (o.blink){ ctx.beginPath(); ctx.moveTo(ex-11,eyy+1); ctx.quadraticCurveTo(ex,eyy+8,ex+11,eyy+1); ctx.lineWidth=4.5; ctx.lineCap='round'; ctx.strokeStyle=INK; ctx.stroke(); return; }
    ell(ctx,ex,eyy,11.5,14,INK); ell(ctx,ex+4,eyy-5,4.3,4.3,'#fff'); ell(ctx,ex-3.5,eyy+5.5,2,2,'#fff');
  });
  brow(ctx,76,ey-27+mo.dl,mo.l,mo.a); brow(ctx,124,ey-27+mo.dr,mo.r,mo.a);
  ctx.save(); ctx.translate(100,ey+19);
  fill(ctx,'M-9 -4 C-9 -8 9 -8 9 -4 C9 1 3 6 0 6 C-3 6 -9 1 -9 -4 Z',INK); ell(ctx,-3,-4,3,1.8,'rgba(255,255,255,.55)');
  ctx.restore();
  if (s==='otter'){ ctx.strokeStyle='rgba(43,35,32,.32)'; ctx.lineWidth=2.4; ctx.lineCap='round';
    [[64,148,34,141],[64,156,36,160],[136,148,166,141],[136,156,164,160]].forEach(l=>{ctx.beginPath();ctx.moveTo(l[0],l[1]);ctx.lineTo(l[2],l[3]);ctx.stroke();}); }
  ctx.save(); ctx.translate(100,ey+38); mouth(ctx,o.mouth||'rest'); ctx.restore();
  ctx.restore();
}

const LEAF='M0 0 C6 -8 18 -8 24 0 C18 6 6 6 0 0 Z';
function leaf(ctx,x,y,rot,sc){
  ctx.save(); ctx.translate(x,y); ctx.rotate(rot); ctx.scale(sc,sc);
  shaded(ctx,LEAF,'#62AE6C','#4A9056',0,-2);
  ctx.beginPath(); ctx.moveTo(3,0); ctx.lineTo(20,0); ctx.lineWidth=1.2; ctx.strokeStyle='rgba(255,255,255,.45)'; ctx.stroke();
  ctx.restore();
}
function plant(ctx, w, h, o){
  const st=o.stage||0, t=(o.t||0)/1000;
  ctx.scale(w/64, h/92);
  ell(ctx,32,90,22,3,'rgba(43,35,32,.12)');
  ctx.save(); ctx.translate(32,62); ctx.rotate(Math.sin(t*1.7+st)*0.05); ctx.translate(-32,-62);
  const top=[62,46,34,28][st];
  if (st===0){ ell(ctx,32,59,6,4.5,'#8A5A3A',-0.3); ell(ctx,30,57.5,2,1.2,'rgba(255,255,255,.35)'); }
  else {
    ctx.beginPath(); ctx.moveTo(32,62); ctx.quadraticCurveTo(34,(62+top)/2,32,top); ctx.lineWidth=3.4; ctx.lineCap='round'; ctx.strokeStyle='#4A9056'; ctx.stroke();
    leaf(ctx,33,top+3,-0.6,st===1?0.62:0.7); leaf(ctx,31,top+3,Math.PI+0.6,st===1?0.62:0.7);
    if (st>=2){ leaf(ctx,33,52,-0.25,0.95); leaf(ctx,31,52,Math.PI+0.25,0.95); }
    if (st===3){
      for(let i=0;i<6;i++){ const a=i*Math.PI/3+t*0.3; ell(ctx,32+Math.cos(a)*7,top-2+Math.sin(a)*7,6.2,5,i%2?'#F2643D':'#F47B57',a); }
      ell(ctx,32,top-2,4.6,4.6,'#F7C548'); ell(ctx,30.8,top-3.2,1.5,1.5,'rgba(255,255,255,.6)');
    }
  }
  ctx.restore();
  shaded(ctx,'M10 62 L14 85 C15 89 18 91 22 91 L42 91 C46 91 49 89 50 85 L54 62 Z','#DC7E54','#BE6440',-6,0);
  ell(ctx,32,62,23,6,'#EC9670'); ell(ctx,32,62,19,4.2,'#6B4430');
}

function burrow(ctx, w, h, o){
  const arch='M0 '+h+' L0 110 C0 40 70 14 '+w/2+' 14 C'+(w-70)+' 14 '+w+' 40 '+w+' 110 L'+w+' '+h+' Z';
  ctx.fillStyle='#DDB487'; ctx.fillRect(0,0,w,h);
  [[30,24,5],[340,34,4],[70,8,3],[300,10,3.5]].forEach(([x,y,r])=>ell(ctx,x,y,r,r*0.8,'#CFA477'));
  clipDo(ctx,arch,()=>{
    ctx.fillStyle='#F6E7D1'; ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#F0DDC3'; for(let x=18;x<w;x+=44) ctx.fillRect(x,0,2,h*0.68);
    const fy=h*0.68; ctx.fillStyle='#E7C49A'; ctx.fillRect(0,fy,w,h-fy); ctx.fillStyle='#D9B184'; ctx.fillRect(0,fy,w,6);
    const wx=34, wy=56, ww=128, wh=132, wd='M'+wx+' '+(wy+wh)+' L'+wx+' '+(wy+ww/2)+' A'+ww/2+' '+ww/2+' 0 0 1 '+(wx+ww)+' '+(wy+ww/2)+' L'+(wx+ww)+' '+(wy+wh)+' Z';
    ctx.save(); ctx.translate(-8,-8); ctx.lineWidth=0; ctx.restore();
    ctx.save(); ctx.lineJoin='round'; ctx.lineWidth=14; ctx.strokeStyle='#B97A4A'; ctx.stroke(P(wd)); ctx.restore();
    clipDo(ctx,wd,()=>{
      ctx.fillStyle='#CDE7EA'; ctx.fillRect(wx,wy,ww,wh);
      ell(ctx,wx+92,wy+40,14,14,'#FFE6A6');
      ell(ctx,wx+30,wy+108,70,28,'#A9D0A4'); ell(ctx,wx+110,wy+112,60,24,'#93C294');
      ctx.fillStyle='#6FB2BF'; ctx.fillRect(wx,wy+108,ww,40); ctx.fillStyle='#86C2CC'; ctx.fillRect(wx,wy+108,ww,4);
      ctx.fillStyle='#FFFFFF'; ctx.fillRect(wx+20,wy+72,10,36); ctx.fillStyle='#F2643D'; ctx.fillRect(wx+20,wy+84,10,7); ctx.fillRect(wx+18,wy+66,14,7);
      fill(ctx,'M'+(wx+70)+' '+(wy+118)+' L'+(wx+100)+' '+(wy+118)+' L'+(wx+94)+' '+(wy+126)+' L'+(wx+76)+' '+(wy+126)+' Z','#F7F1E6');
      ctx.fillStyle='#F7F1E6'; ctx.fillRect(wx+84,wy+100,2,18); fill(ctx,'M'+(wx+86)+' '+(wy+101)+' L'+(wx+98)+' '+(wy+115)+' L'+(wx+86)+' '+(wy+115)+' Z','#F2643D');
    });
    ctx.fillStyle='#B97A4A'; ctx.fillRect(wx-10,wy+wh-2,ww+20,10); ctx.fillStyle='#A0663B'; ctx.fillRect(wx-10,wy+wh+6,ww+20,4);
    const sy=o.shelfY||176; ctx.fillStyle='#C08350'; ctx.fillRect(198,sy,180,12); ctx.fillStyle='#A26A3E'; ctx.fillRect(198,sy+12,180,5);
    [[214],[358]].forEach(([x])=>{ ctx.fillStyle='#A26A3E'; ctx.fillRect(x,sy+17,6,14); });
    ctx.beginPath(); ctx.moveTo(w-64,0); ctx.lineTo(w-64,52); ctx.lineWidth=2; ctx.strokeStyle='#8C6A4E'; ctx.stroke();
    fill(ctx,'M'+(w-86)+' 70 C'+(w-86)+' 54 '+(w-42)+' 54 '+(w-42)+' 70 Z','#F2643D'); ell(ctx,w-64,72,9,5,'#FFE6A6');
    ctx.fillStyle='rgba(255,226,154,.18)'; ell(ctx,w-64,120,70,52,'rgba(255,226,154,.16)');
    const ry=h*0.86; ell(ctx,w/2,ry,150,30,'#E58F6A'); ell(ctx,w/2,ry-3,124,22,'#EFA987'); ell(ctx,w/2,ry-4,96,15,'#E58F6A');
    [['#5BA6A0',22,fy+60,64],['#F4B42A',26,fy+44,56],['#E8725A',20,fy+30,60]].forEach(([c,x,y,bw])=>{ ctx.fillStyle=c; ctx.beginPath(); ctx.roundRect(x,y,bw,13,4); ctx.fill(); ctx.fillStyle='rgba(255,255,255,.55)'; ctx.fillRect(x+bw-10,y+3,6,7); });
  });
}
window.YapArt = Object.assign(window.YapArt||{}, { plant, _:{ell,fill,shaded,clipDo,mir,mouth,P} }); if(!window.YapArt.critter) window.YapArt.critter=critter; if(!window.YapArt.burrow) window.YapArt.burrow=burrow; (window.__yapQ||[]).splice(0).forEach(f=>f());
})();
