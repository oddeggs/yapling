// Spike: the shared kit for catalogue props and scenes. The same primitives every prototype file
// redefines (yap-sticker / r4 / r5 / r6), defined once, plus the prop registry and two generators:
//   s_prop(ctx, w, h, o)   o = { id, v?: colour variant, season?, tod?, t? }   one prop in its box
//   s_place(ctx, w, h, o)  o = { scene, so?: scene options, props: [{ id, x, y, s?, v? }] }  a scene with props on its anchors
(function boot(){
const A=window.YapArt; if(!A||!A.r6){ setTimeout(boot,60); return; } if(boot.done) return; boot.done=1;
const C={ INK:'#17131C', LIL:'#EFA3F4', LIL2:'#F9DAFB', CY:'#22BFF2', CY2:'#CFF0FD', MI:'#5FD98A', MI2:'#D7F7E2', GR:'#D3CCDC', WH:'#FFFFFF',
  KR:'#F2CFA8', KR2:'#E6BE93', WOOD:'#C99A6E', BU:'#FFE48A', BUT:'#FFD66B', PASTRY:'#FFC27A', PEACH:'#F5B38A', CORAL:'#FF8D6B', APRI:'#FFE9C2',
  BROWN:'#8C6A4E', COFFEE:'#7A4E33', PLUM:'#5B4A8C', SLATE:'#2E2740', NIGHT:'#241B38', DUSK:'#3B3160', FOG:'#E8E4EE', STEAM:'#B9B0C4' };
const R=(x,y,w,h,r)=>{ const p=new Path2D(); p.roundRect(x,y,w,h,r); return p; };
const El=(x,y,rx,ry)=>{ const p=new Path2D(); p.ellipse(x,y,rx,ry==null?rx:ry,0,0,Math.PI*2); return p; };
const Pg=a=>{ const p=new Path2D(); p.moveTo(a[0],a[1]); for(let i=2;i<a.length;i+=2) p.lineTo(a[i],a[i+1]); p.closePath(); return p; };
const Pd=d=>new Path2D(d);
function S(ctx,p,fill,o){ o=o||{}; const lw=o.lw!=null?o.lw:3, sh=o.sh!=null?o.sh:4, ink=o.ink||C.INK;
  if (sh){ ctx.save(); ctx.translate(sh*0.35,sh); ctx.fillStyle=o.shc||ink; ctx.fill(p); ctx.restore(); }
  if (fill){ ctx.fillStyle=fill; ctx.fill(p); } if (lw){ ctx.lineWidth=lw; ctx.lineJoin='round'; ctx.lineCap='round'; ctx.strokeStyle=ink; ctx.stroke(p); } }
const G=(ctx,p,fill)=>S(ctx,p,fill,{ink:C.GR,sh:0,lw:2.5});
function L(ctx,a,w,c,dash){ ctx.beginPath(); ctx.moveTo(a[0],a[1]); if(a.length===4) ctx.lineTo(a[2],a[3]); else if(a.length===6) ctx.quadraticCurveTo(a[2],a[3],a[4],a[5]); else ctx.bezierCurveTo(a[2],a[3],a[4],a[5],a[6],a[7]); ctx.lineWidth=w; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle=c||C.INK; if(dash) ctx.setLineDash(dash); ctx.stroke(); ctx.setLineDash([]); }
function spark(ctx,x,y,r,c){ const p=new Path2D(); p.moveTo(x,y-r); p.quadraticCurveTo(x,y,x+r,y); p.quadraticCurveTo(x,y,x,y+r); p.quadraticCurveTo(x,y,x-r,y); p.quadraticCurveTo(x,y,x,y-r); ctx.fillStyle=c; ctx.fill(p); }
const rnd=s=>()=>((s=(s*16807)%2147483647)/2147483647);
const dots=(ctx,x0,y0,x1,y1,a)=>{ ctx.fillStyle=`rgba(23,19,28,${a})`; for(let y=y0;y<y1;y+=18) for(let x=x0;x<x1;x+=18){ ctx.beginPath(); ctx.arc(x,y,1.3,0,7); ctx.fill(); } };
// Highlight: the white glint every glossy sticker gets (top-left).
const glint=(ctx,x,y,rx,ry,rot)=>{ ctx.fillStyle='rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(x,y,rx,ry==null?rx*0.7:ry,rot==null?-0.5:rot,0,7); ctx.fill(); };
// Steam: two wavy grey strokes, as on the café cups.
const steam=(ctx,x,y,k)=>{ k=k||1; for(let i=0;i<2;i++) L(ctx,[x-4*k+i*8*k,y,x-10*k+i*8*k,y-10*k,x-3*k+i*8*k,y-22*k],2.4,C.GR); };
// Time of day: the burrow/town wash, copied from yap-r4 (post). Scenes call it last, with their lamp positions.
const TOD={morning:'rgba(255,170,130,.10)',afternoon:null,evening:'rgba(240,110,150,.15)',dusk:'rgba(240,110,150,.15)',night:'rgba(28,20,52,.5)',rain:'rgba(110,130,170,.16)'};
function post(ctx,w,h,tod,lights,t,where){ if(!tod||!TOD[tod]) return; ctx.fillStyle=TOD[tod]; ctx.fillRect(0,0,w,h);
  if (tod!=='morning'){ ctx.save(); ctx.globalCompositeOperation='lighter'; const a=tod==='night'?.5:.28; lights.forEach(([x,y,r])=>{ const g=ctx.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,`rgba(255,205,150,${a})`); g.addColorStop(1,'rgba(255,205,150,0)'); ctx.fillStyle=g; ctx.fillRect(x-r,y-r,2*r,2*r); }); ctx.restore(); }
  if (tod==='rain' && where!=='in'){ ctx.strokeStyle='rgba(34,150,220,.5)'; ctx.lineWidth=2; ctx.lineCap='round'; const r=rnd(3); for(let i=0;i<80;i++){ const x=r()*w, y=(r()*h+t*380)%h; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x-4,y+14); ctx.stroke(); } }
  if (tod==='night' && where!=='in'){ const r=rnd(8); for(let i=0;i<24;i++){ spark(ctx,r()*w,60+r()*80,2+r()*3,i%4?C.WH:C.LIL); } }
}
// Colour variants: a prop names its main colour slot; v picks the swap.
const VAR={ lilac:[C.LIL,C.LIL2], cyan:[C.CY,C.CY2], mint:[C.MI,C.MI2], butter:[C.BUT,C.BU], white:[C.WH,C.FOG], coral:[C.CORAL,C.APRI] };
const vc=(o,def)=>VAR[(o&&o.v)||def]||VAR[def];
// Size classes: box side in units (1 unit = 1 pt at nominal size). Stroke 3 / detail 2.2–2.6 / shadow 3–4 stay legible across a class.
const BOX={ S:60, M:96, L:160 }, GROUND={ S:56, M:90, L:150 };
A.PROPS=A.PROPS||{};
function prop(ctx,w,h,o){ const d=A.PROPS[o.id]; if(!d) return; const b=BOX[d.size]; ctx.save(); ctx.scale(w/b,h/b); d.draw(ctx,o,(o.t||0)/1000,b); ctx.restore(); }
// The scene registry: each scene names its anchors (where props may stand), so stories place props without coordinates.
A.SCENES=A.SCENES||{};
function place(ctx,w,h,o){ const sc=A.SCENES[o.scene]; const fn=sc?sc.fn:o.scene; const so=Object.assign({t:0},o.so||{});
  A[fn](ctx,w,h,sc&&sc.light?Object.assign({},so,{noLight:true}):so);
  // Anchor: [x, y, scale, layer?]. layer 'front' = in front of the scene's front layer (and of the critter).
  const drawProps=front=>(o.props||[]).forEach(p=>{ const d=A.PROPS[p.id]; if(!d) return; const a=sc&&p.at?sc.anchors[p.at]:null; if(!!(a&&a[3]==='front')!==front) return;
    const x=a?a[0]:p.x, y=a?a[1]:p.y, s=(p.s||(a&&a[2])||1), b=BOX[d.size], g=GROUND[d.size];
    if (p.at && /floor|ground|path/.test(p.at)){ ctx.fillStyle='rgba(23,19,28,.12)'; ctx.beginPath(); ctx.ellipse(x+2,y+3,b*s*0.36,Math.max(3,b*s*0.05),0,0,7); ctx.fill(); } // contact shadow, as critters have
    ctx.save(); ctx.translate(x-b*s/2, y-g*s); prop(ctx,b*s,b*s,Object.assign({t:0},p)); ctx.restore(); });
  drawProps(false);
  if (sc&&sc.light) sc.light(ctx,w,h,so);   // the scene's light (warm wash, time of day) goes over the props too
  if (sc&&sc.front) A[sc.front](ctx,w,h,Object.assign({},so,{layer:'front'}));
  drawProps(true);
}
// Contact sheet: a grid of generator calls with Lexend labels. cells: [{ fn, w, h, o, label, tag? }]
function sheet(ctx,w,h,o){ const cw=o.cw||150, ch=o.ch||180, cols=o.cols||6, top=o.top||64;
  ctx.fillStyle=o.bg||'#FBFAFD'; ctx.fillRect(0,0,w,h);
  ctx.font='800 22px Lexend,sans-serif'; ctx.fillStyle=C.INK; ctx.textAlign='left'; ctx.fillText(o.title||'',20,38);
  if (o.sub){ ctx.font='500 12px Lexend,sans-serif'; ctx.fillStyle='#5D5366'; ctx.fillText(o.sub,20,56); }
  o.cells.forEach((c,i)=>{ const col=i%cols, row=Math.floor(i/cols), x=10+col*cw, y=top+row*ch;
    ctx.save(); ctx.fillStyle=c.tag==='existing'?'#F4F1F7':C.WH; ctx.beginPath(); ctx.roundRect(x+4,y+4,cw-8,ch-8,10); ctx.fill(); ctx.lineWidth=1; ctx.strokeStyle=c.tag==='existing'?C.LIL:'#E4DEEA'; ctx.stroke(); ctx.restore();
    const k=Math.min((cw-30)/c.w,(ch-50)/c.h); ctx.save(); ctx.translate(x+cw/2-c.w*k/2, y+14+(ch-50-c.h*k)/2); ctx.scale(k,k); ctx.beginPath(); ctx.rect(-12,-12,c.w+24,c.h+24); ctx.clip(); A[c.fn](ctx,c.w,c.h,c.o); ctx.restore();
    ctx.font='700 11px Lexend,sans-serif'; ctx.fillStyle=C.INK; ctx.textAlign='center'; ctx.fillText(c.label,x+cw/2,y+ch-22);
    if (c.sub){ ctx.font='500 10px Lexend,sans-serif'; ctx.fillStyle=c.tag==='existing'?C.PLUM:'#5D5366'; ctx.fillText(c.sub,x+cw/2,y+ch-10); } });
}
A.K={C,R,El,Pg,Pd,S,G,L,spark,rnd,dots,glint,steam,VAR,vc,BOX,GROUND,TOD,post};
Object.assign(A,{s_prop:prop,s_place:place,s_sheet:sheet});
})();
