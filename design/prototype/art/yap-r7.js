// Yapling Round 7 art: the art-library spike (spikes/art-library/gen) ported for the canvas, in load order.
// Loaded after yap-art / yap-cast / yap-sticker / yap-r4 / yap-r5 / yap-r6 / yap-dc. Each block boots when what it needs exists.
// Adds: A.K kit, A.PROPS (catalogue props), A.SCENES with anchors, s_prop, s_place, s_market, s_park, s_platform,
// the wear-hook cast rig (o.wear) + A.WEAR, s_collect (rarity), s_shelfcard (share card), and the Round 7 additions.
// Ready flag: window.YapArt.r7.
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

// Reference prop for the style kit (not one of the 30): a teapot, size M, colour variant, steam over time.
(function boot(){
const A=window.YapArt; if(!A||!A.K){ setTimeout(boot,60); return; } if(boot.done) return; boot.done=1;
const {C,R,El,Pg,Pd,S,L,glint,steam,vc}=A.K;
A.PROPS['teapot']={ size:'M', word:'teapot', variants:['lilac','cyan','mint','butter','white'], draw(ctx,o,t){
  const [main,tint]=vc(o,'cyan');
  S(ctx,Pd('M70 50 C82 46 88 36 86 28'),null,{lw:0,sh:0});
  L(ctx,[72,48,86,40,88,28],6); L(ctx,[72,48,86,40,88,28],2.4,main);           // spout: ink line + colour core
  ctx.lineWidth=5; ctx.strokeStyle=C.INK; ctx.beginPath(); ctx.arc(22,60,13,Math.PI*0.6,Math.PI*1.45); ctx.stroke(); // handle
  S(ctx,Pd('M20 86 C14 74 16 50 30 42 L66 42 C80 50 82 74 76 86 Z'),main,{sh:4});  // body, sticker shadow
  S(ctx,R(26,84,44,6,3),C.WH,{sh:0,lw:2.4});                                        // foot (rests on ground y=90)
  S(ctx,El(48,42,20,5),tint,{sh:0,lw:2.6});                                          // lid rim
  S(ctx,Pd('M34 41 C36 30 60 30 62 41 Z'),tint,{sh:0,lw:2.6});                       // lid
  S(ctx,El(48,28,4.5),C.WH,{sh:0,lw:2.4});                                           // knob
  S(ctx,R(36,58,24,14,6),C.WH,{sh:0,lw:2.2});                                        // label patch
  glint(ctx,30,56,4,7,-0.3);
  if (o.steam!==false) steam(ctx,90,22,0.8);
}};
})();

// Batch A: Vietnamese food, kitchen and festival props (10). Sticker + Glass, kit A.K.
(function boot(){
const A=window.YapArt; if(!A||!A.K){ setTimeout(boot,60); return; } if(boot.done) return; boot.done=1;
const {C,R,El,Pg,Pd,S,L,glint,spark,vc}=A.K;
// Steam that breathes with o.t (seconds); fully visible at t=0 for catalogue renders.
const puff=(ctx,x,y,k,t)=>{ for(let i=0;i<2;i++){ ctx.globalAlpha=.65+.35*Math.cos(t*2+i*1.4); L(ctx,[x-4*k+i*8*k,y,x-10*k+i*8*k,y-10*k,x-3*k+i*8*k,y-22*k],2.4,C.GR); } ctx.globalAlpha=1; };
// The house leaf, scaled and rotated, stroke kept at ~2.2 on screen.
const leaf=(ctx,x,y,r,s,c)=>{ ctx.save(); ctx.translate(x,y); ctx.rotate(r); ctx.scale(s,s); S(ctx,Pd('M0 0 C6 -8 18 -8 24 0 C18 6 6 6 0 0 Z'),c||C.MI,{sh:0,lw:2.2/s}); ctx.restore(); };
// Ink rod with a colour core (spouts, straws, strings, chopsticks).
const rod=(ctx,a,w,c,core)=>{ L(ctx,a,w); L(ctx,a,core||w*0.45,c); };
// A tapered stick as a filled polygon from (x1,y1) width w1 to (x2,y2) width w2.
const stickPath=(x1,y1,x2,y2,w1,w2)=>{ const dx=x2-x1, dy=y2-y1, l=Math.hypot(dx,dy), nx=-dy/l, ny=dx/l;
  return Pg([x1+nx*w1/2,y1+ny*w1/2, x2+nx*w2/2,y2+ny*w2/2, x2-nx*w2/2,y2-ny*w2/2, x1-nx*w1/2,y1-ny*w1/2]); };

// 1. Bowl of phở: white bowl with a painted band, broth, noodles, beef, herbs, chopsticks across.
A.PROPS['pho-bowl']={ size:'S', word:'bowl of pho', variants:['cyan','lilac','mint','coral','butter'], draw(ctx,o,t){
  const [main]=vc(o,'cyan');
  const bowl=Pd('M6 30 C6 45 16 52 30 52 C44 52 54 45 54 30 Z');
  S(ctx,bowl,C.WH,{sh:3});
  ctx.save(); ctx.clip(bowl); ctx.fillStyle=main; ctx.fillRect(0,37,60,4.5); ctx.restore(); ctx.lineWidth=3; ctx.strokeStyle=C.INK; ctx.stroke(bowl);
  S(ctx,R(21,50,18,5,2.5),C.WH,{sh:0,lw:2.4});                                   // foot ring on the ground
  S(ctx,El(30,30,24,5.5),C.WH,{sh:0,lw:2.6});                                    // rim
  S(ctx,El(30,30,20,3.6),C.BU,{sh:0,lw:0});                                      // broth
  S(ctx,Pd('M12 30 C13 23 21 20 30 20 C39 20 47 23 48 30 Z'),C.WH,{sh:0,lw:2.4}); // noodle mound
  [[20,25.5,-0.25]].forEach(([x,y,r])=>{ ctx.save(); ctx.translate(x,y); ctx.rotate(r); S(ctx,El(0,0,6.5,3.2),C.PEACH,{sh:0,lw:2.2}); ctx.restore(); }); // beef
  leaf(ctx,26,23,-0.9,0.42); leaf(ctx,46,29,-0.2,0.34);                          // herbs
  [[36,18,33,24,36,30],[39.5,17,42,23,39,30],[43,15,46,22,43,29]].forEach(a=>rod(ctx,a,4.4,C.WH,2.2)); // noodles lifted
  rod(ctx,[27,20,56,3.5],4.6,C.WOOD,2.2); rod(ctx,[30,23,59,8],4.6,C.WOOD,2.2);   // chopsticks holding them
  if (o.steam!==false) puff(ctx,17,17,0.62,t);
}};

// 2. Bánh mì: split baguette with herbs, pork and a coral chilli slice.
A.PROPS['banh-mi']={ size:'S', word:'banh mi', variants:[], draw(ctx,o){
  ctx.save(); ctx.translate(30,42.4); ctx.rotate(-0.2); ctx.translate(-30,-40);
  S(ctx,Pd('M2 41 L58 41 C55 47.5 44 51 30 51 C16 51 5 47.5 2 41 Z'),C.PASTRY,{sh:3});    // bottom half, pointed ends
  leaf(ctx,49,39,-0.45,0.6); leaf(ctx,11,40,Math.PI+0.35,0.55); leaf(ctx,30,36,-1.2,0.5); // herbs poking out
  S(ctx,R(9,35,42,7,3),C.PEACH,{sh:0,lw:2.2});                                           // pork
  S(ctx,Pd('M13 37 C17 33 21 38 25 34 C29 38 33 33 37 37 C41 33 44 37 48 35 L47 40 L14 40 Z'),C.MI,{sh:0,lw:2.2}); // lettuce edge
  S(ctx,El(21,38.5,3.6),C.CORAL,{sh:0,lw:2}); S(ctx,El(38,38.5,3.4),C.CORAL,{sh:0,lw:2}); // chilli slices
  S(ctx,Pd('M1 35 C6 26 17 21.5 30 21.5 C43 21.5 54 26 59 35 C45 37.5 15 37.5 1 35 Z'),C.PASTRY,{sh:0,lw:2.8}); // top crust
  [[16,30,21,25.5],[27,29.5,32,25],[38,30,43,25.5]].forEach(a=>L(ctx,a,2.2));             // scores
  glint(ctx,12,29,3,1.6,-0.6);
  ctx.restore();
}};

// 3. Cà phê sữa đá: glass with milk at the bottom, coffee, ice; a phin filter sitting on top.
A.PROPS['iced-coffee']={ size:'S', word:'iced milk coffee', variants:[], draw(ctx,o){
  const glass=Pd('M14 22 L17.5 50 C18 52.5 19.8 54 22.5 54 L37.5 54 C40.2 54 42 52.5 42.5 50 L46 22 Z');
  S(ctx,glass,'rgba(207,240,253,.9)',{sh:3});
  ctx.save(); ctx.clip(glass);
  ctx.fillStyle=C.COFFEE; ctx.fill(Pd('M10 28 C20 26 40 30 50 27 L50 58 L10 58 Z'));
  ctx.fillStyle=C.APRI; ctx.fill(Pd('M10 45 C20 42 32 47 50 43 L50 58 L10 58 Z'));
  ctx.restore();
  [[24,31,-0.2],[35,32,0.25]].forEach(([x,y,r])=>{ ctx.save(); ctx.translate(x,y); ctx.rotate(r); S(ctx,R(-4.5,-4.5,9,9,2.5),'rgba(255,255,255,.8)',{sh:0,lw:2}); ctx.restore(); }); // ice
  ctx.lineWidth=3; ctx.strokeStyle=C.INK; ctx.stroke(glass);
  L(ctx,[19,27,21.5,47],2.6,'rgba(255,255,255,.7)');                                  // glass glint
  S(ctx,El(30,21.5,15,3.2),C.FOG,{sh:0,lw:2.4});                                     // phin plate on the rim
  S(ctx,R(21,8,18,13,[2,2,4,4]),C.FOG,{sh:0,lw:2.6});                                // phin chamber
  S(ctx,El(30,8,11,2.8),C.WH,{sh:0,lw:2.2});                                         // lid
  S(ctx,R(27.5,2.5,5,4,2),C.GR,{sh:0,lw:2});                                          // knob
}};

// 4. Bubble tea: clear cup of tea with pearls, dome lid, wide straw. v picks the flavour (straw + tea).
const TEA={ lilac:[C.LIL,C.LIL2], mint:[C.MI,C.MI2], butter:[C.BUT,C.BU], coral:[C.CORAL,C.APRI], cyan:[C.CY,C.CY2] };
A.PROPS['bubble-tea']={ size:'S', word:'bubble tea', variants:['milk','lilac','mint','butter','coral','cyan'], draw(ctx,o){
  const [straw,tea]=TEA[o.v]||[C.LIL,C.KR];
  const cup=Pd('M14 25 L18 50.5 C18.4 52.8 20 54 22.2 54 L37.8 54 C40 54 41.6 52.8 42 50.5 L46 25 Z');
  S(ctx,cup,tea,{sh:3});
  ctx.save(); ctx.clip(cup); ctx.fillStyle=C.WH; ctx.fillRect(0,24,60,5);
  ctx.fillStyle=C.SLATE; [[23,50],[29,51],[35,50],[26,45.5],[32,46],[38,45]].forEach(([x,y])=>{ ctx.beginPath(); ctx.arc(x,y,3,0,7); ctx.fill(); });
  ctx.restore(); ctx.lineWidth=3; ctx.strokeStyle=C.INK; ctx.stroke(cup);
  L(ctx,[19,31,21,44],2.6,'rgba(255,255,255,.7)');
  rod(ctx,[33,16,38,2],7,straw,3.4);                                                  // straw
  S(ctx,Pd('M15 24 C15 10 45 10 45 24 Z'),'rgba(255,255,255,.85)',{sh:0,lw:2.6});    // dome lid
  rod(ctx,[33.5,15,32,23],7,straw,3.4);                                               // straw through the dome
  S(ctx,R(12,22,36,5,2.5),C.WH,{sh:0,lw:2.4});                                        // lid rim
  glint(ctx,22,18,2.6,1.6,-0.7);
}};

// 5. Rice cooker (M): white body, coloured lid band, lid handle, front switch panel, a flower print.
A.PROPS['rice-cooker']={ size:'M', word:'rice cooker', variants:['lilac','cyan','mint','butter','coral'], draw(ctx,o,t){
  const [main,tint]=vc(o,'lilac'); ctx.translate(0,1.5);                             // sit the shadow just under the ground line
  S(ctx,R(5,47,10,7,3.5),C.WH,{sh:0,lw:2.4}); S(ctx,R(81,47,10,7,3.5),C.WH,{sh:0,lw:2.4}); // side handles
  S(ctx,R(12,44,72,42,[6,6,18,18]),C.WH,{sh:4});                                      // body
  S(ctx,Pd('M15 45 C15 23 81 23 81 45 Z'),tint,{sh:0,lw:2.8});                        // lid dome
  S(ctx,R(35,23,26,8,4),C.WH,{sh:0,lw:2.4});                                         // lid handle
  S(ctx,El(67,36,3.5,2.6),C.WH,{sh:0,lw:2.2});                                        // steam vent
  S(ctx,R(10,42,76,8,4),main,{sh:0,lw:2.6});                                          // band
  S(ctx,R(35,56,26,22,6),tint,{sh:0,lw:2.4});                                         // control panel
  S(ctx,R(42,66,12,7,3),main,{sh:0,lw:2.2});                                          // switch
  S(ctx,El(48,61,2.4),C.CORAL,{sh:0,lw:2});                                           // 'cooking' light
  const pet=new Path2D(), mid=new Path2D();                                           // flower print, one path each
  [[23,64],[73,64]].forEach(([x,y])=>{ [[0,-3.6],[3.6,0],[0,3.6],[-3.6,0]].forEach(([dx,dy])=>{ pet.moveTo(x+dx+2.8,y+dy); pet.ellipse(x+dx,y+dy,2.8,2.8,0,0,Math.PI*2); }); mid.moveTo(x+2,y); mid.ellipse(x,y,2,2,0,0,Math.PI*2); });
  S(ctx,pet,main,{sh:0,lw:1.8}); S(ctx,mid,C.BUT,{sh:0,lw:1.8});
  glint(ctx,26,36,4,2.4,-0.4);
  if (o.steam!==false) puff(ctx,67,30,0.7,t);
}};

// 6. Electric kettle (M) on its base: tapered jug, spout, lid, chunky handle, water window.
A.PROPS['kettle']={ size:'M', word:'kettle', variants:['mint','lilac','cyan','butter','coral','white'], draw(ctx,o,t){
  const [main,tint]=vc(o,'mint'); ctx.translate(0,1.5);
  rod(ctx,[66,34,88,34,86,60,70,72],7,main,3.2);                                      // handle
  S(ctx,Pd('M33 31 L18 24 C16.5 23.2 17 21 19 21 L38 24 Z'),main,{sh:0,lw:2.6});      // spout lip
  S(ctx,Pd('M24 80 L30 33 C30.5 29.5 33 27 36.5 27 L61.5 27 C65 27 67.5 29.5 68 33 L74 80 Z'),main,{sh:4}); // body
  S(ctx,R(35,20,28,8,[4,4,1,1]),tint,{sh:0,lw:2.4});                                  // lid
  S(ctx,R(44,15,10,6,3),C.WH,{sh:0,lw:2.2});                                          // lid knob
  const win=R(38,42,9,28,4.5); S(ctx,win,C.CY2,{sh:0,lw:0}); ctx.save(); ctx.clip(win); ctx.fillStyle=C.CY; ctx.fillRect(30,57,30,20); ctx.restore(); S(ctx,win,null,{sh:0,lw:2.2});
  glint(ctx,57,40,2.6,6,-0.1);
  S(ctx,R(16,77,66,10,5),C.WH,{sh:3,lw:2.8});                                         // base
  S(ctx,R(62,80,8,4,2),C.CORAL,{sh:0,lw:1.8});                                        // power light
  if (o.steam) puff(ctx,22,16,0.7,t);
}};

// 7. Chopsticks on a small rest: tips on the rest, coloured grip bands.
A.PROPS['chopsticks']={ size:'S', word:'chopsticks', variants:['coral','lilac','cyan','mint','butter'], draw(ctx,o){
  const [main,tint]=vc(o,'coral');
  S(ctx,R(5,43,17,11,[5,5,3,3]),tint,{sh:2,lw:2.6}); L(ctx,[10,44.5,17,44.5],2.2);           // rest with its groove
  [[4,37,55,49],[4,39,57,54]].forEach(([x1,y1,x2,y2])=>{ S(ctx,stickPath(x1,y1,x2,y2,2.6,5),C.KR,{sh:2,lw:2.2});
    const k0=.74, k1=.86; S(ctx,stickPath(x1+(x2-x1)*k0,y1+(y2-y1)*k0,x1+(x2-x1)*k1,y1+(y2-y1)*k1,4.4,4.8),main,{sh:0,lw:1.8}); });
}};

// 8. Bánh chưng (Tết): square sticky-rice cake in leaves, tied with bamboo strings in a # with a bow.
A.PROPS['banh-chung']={ size:'S', word:'banh chung', variants:[], draw(ctx,o){
  S(ctx,R(11,18,38,36,5),C.MI,{sh:3});
  [[14,21,21,28],[46,21,39,28],[14,51,21,44],[46,51,39,44]].forEach(a=>L(ctx,a,2.2,'rgba(255,255,255,.55)')); // leaf folds
  [[23,17,23,55],[37,17,37,55],[10,30,50,30],[10,42,50,42]].forEach(a=>rod(ctx,a,4.6,C.KR,2.2));          // strings
  rod(ctx,[37,17,31,8,36,10],3.6,C.KR,1.8); rod(ctx,[37,17,44,8,39,10],3.6,C.KR,1.8);                      // bow
}};

// 9. Lì xì (Tết): coral envelope, open flap, gold medallion, a note peeking out.
A.PROPS['li-xi']={ size:'S', word:'lucky money envelope', variants:[], draw(ctx,o){
  ctx.save(); ctx.translate(30,54); ctx.rotate(-0.06); ctx.translate(-30,-54);
  S(ctx,Pg([15,19,30,8,45,19]),C.APRI,{sh:0,lw:2.4});                                 // flap folded open
  ctx.save(); ctx.translate(31,20); ctx.rotate(0.12); S(ctx,R(-10,-12,20,22,2),C.MI2,{sh:0,lw:2.2}); S(ctx,El(0,-5,3.4),C.MI,{sh:0,lw:1.8}); ctx.restore(); // note
  S(ctx,R(15,18,30,36,4),C.CORAL,{sh:3});                                             // envelope
  ctx.lineWidth=1.8; ctx.strokeStyle=C.BUT; ctx.beginPath(); ctx.roundRect(19,22,22,28,2.5); ctx.stroke(); // gold border
  S(ctx,El(30,36,7),C.BUT,{sh:0,lw:2.2}); spark(ctx,30,36,4.4,C.CORAL);               // gold medallion
  ctx.restore();
}};

// 10. Mooncake (mid-autumn): fluted cake with a pressed top, on a plate; a cut slice shows the yolk.
A.PROPS['mooncake']={ size:'S', word:'mooncake', variants:[], draw(ctx,o){
  S(ctx,El(30,50,26,5),C.WH,{sh:2,lw:2.4});                                           // plate
  S(ctx,Pd('M8 30 L8 44 C8 48 16 50 25 50 C34 50 42 48 42 44 L42 30 Z'),C.PASTRY,{sh:2}); // drum side
  [13,19,25,31,37].forEach(x=>L(ctx,[x,36,x,47],2,C.WOOD));                           // flutes
  S(ctx,El(25,30,17,5.5),C.PASTRY,{sh:0,lw:2.6});                                     // top
  S(ctx,El(25,30,10,3.2),null,{sh:0,lw:2,ink:C.WOOD}); spark(ctx,25,30,2.6,C.WOOD);  // pressed pattern
  S(ctx,Pd('M34 50 L34 37 L53 40 L53 50 C47 52 40 52 34 50 Z'),C.PASTRY,{sh:2,lw:2.6}); // slice
  S(ctx,Pd('M36.5 48.5 L36.5 40 L50.5 42.2 L50.5 48.5 C46 50 41 50 36.5 48.5 Z'),C.APRI,{sh:0,lw:0}); // lotus paste
  S(ctx,El(40.5,45,3.6),C.BUT,{sh:0,lw:2});                                           // salted yolk
  glint(ctx,15,28,3,1.6,-0.2);
}};
})();

// Batch B: ten catalogue props (office/tech, travel, mid-autumn). Same idiom as 05-example.js.
(function boot(){
const A=window.YapArt; if(!A||!A.K){ setTimeout(boot,60); return; } if(boot.done) return; boot.done=1;
const {C,R,El,Pg,Pd,S,L,glint,spark,vc}=A.K;
const star5=(cx,cy,ro,ri,rot)=>{ const a=[]; for(let i=0;i<10;i++){ const r=i%2?ri:ro, t=(rot||-Math.PI/2)+i*Math.PI/5; a.push(cx+Math.cos(t)*r, cy+Math.sin(t)*r); } return Pg(a); };
// Soft light without gradients: stacked translucent discs in 'lighter' (as the night scene's glow()).
const halo=(ctx,x,y,r,n)=>{ ctx.save(); ctx.globalCompositeOperation='lighter'; for(let k=n;k>0;k--){ ctx.fillStyle=`rgba(255,214,107,${(0.09).toFixed(2)})`; ctx.beginPath(); ctx.arc(x,y,r*k/n,0,7); ctx.fill(); } ctx.restore(); };

// laptop (M): open, screen to the viewer, keyboard deck as a shallow slab.
A.PROPS['laptop']={ size:'M', word:'laptop', variants:['white','lilac','mint','butter'], draw(ctx,o){
  const [main,tint]=vc(o,'white');
  S(ctx,R(18,20,60,55,6),tint,{sh:4});                                   // lid
  S(ctx,R(23,25,50,44,3),C.CY2,{sh:0,lw:2.4});                          // screen
  S(ctx,R(28,30,26,20,3),C.WH,{sh:0,lw:2.2});                           // window card
  L(ctx,[32,36,49,36],2.2); L(ctx,[32,43,44,43],2.2);                   // text lines (no words)
  S(ctx,R(52,52,16,11,3),o.v&&o.v!=='white'?main:C.LIL,{sh:0,lw:2.2});  // chat bubble
  glint(ctx,28,58,2.5,5,-0.2);
  S(ctx,R(6,75,84,14,[3,3,7,7]),tint,{sh:3});                           // keyboard deck, rests on y=89
  L(ctx,[16,80.5,80,80.5],2.4,C.INK,[4,3.5]);                            // key row
  L(ctx,[40,86,56,86],2.2);                                              // trackpad notch
}};

// desk-lamp (M): articulated arm; tod 'night' lights it with a translucent cone and a halo (no glow on the body).
A.PROPS['desk-lamp']={ size:'M', word:'desk lamp', variants:['lilac','cyan','mint','butter','coral','white'], draw(ctx,o){
  const [main,tint]=vc(o,'lilac'), lit=o.tod==='night';
  ctx.save(); ctx.translate(-3,0);
  if (lit){ halo(ctx,74,56,15,3); ctx.fillStyle='rgba(255,214,107,.22)'; ctx.fill(Pg([58,51,84.4,36.5,96,89,50,89])); ctx.fillStyle='rgba(255,214,107,.3)'; ctx.beginPath(); ctx.ellipse(74,89,20,3.5,0,0,7); ctx.fill(); }
  S(ctx,Pd('M22 89 C22 81 29 78 38 78 C47 78 54 81 54 89 Z'),main,{sh:3});  // base
  L(ctx,[38,80,28,50],6); L(ctx,[38,80,28,50],2.4,C.WH);                    // lower arm
  L(ctx,[28,50,60,27],6); L(ctx,[28,50,60,27],2.4,C.WH);                    // upper arm
  S(ctx,El(28,50,4.5),tint,{sh:0,lw:2.4});                                   // elbow
  ctx.save(); ctx.translate(66,34); ctx.rotate(-0.5);
  S(ctx,Pd('M-6 -10 C-6 -15 6 -15 6 -10 L16 10 C8 14 -8 14 -16 10 Z'),main,{sh:3});  // shade
  S(ctx,El(0,11,14.5,4),lit?C.BU:C.WH,{sh:0,lw:2.4});                      // mouth
  S(ctx,Pd('M-6 12 C-6 18 6 18 6 12 Z'),lit?C.BUT:C.WH,{sh:0,lw:2.2});    // bulb
  ctx.restore();
  glint(ctx,30,82,2.5,1.6,0);
  ctx.restore();
}};

// clipboard (S): board, sheet with ink lines, metal clip.
A.PROPS['clipboard']={ size:'S', word:'clipboard', variants:['kraft','lilac','cyan','mint','butter'], draw(ctx,o){
  const board=(o.v&&o.v!=='kraft')?vc(o,'lilac')[0]:C.KR2;
  S(ctx,R(14,9,32,46,4),board,{sh:3,lw:2.8});                            // board, rests on y=55
  S(ctx,R(18,15,24,36,2),C.WH,{sh:0,lw:2.2});                            // sheet
  [[24,37],[30,38],[36,33],[42,36]].forEach(([y,x1])=>L(ctx,[22,y,x1,y],2.2));
  S(ctx,R(22,5,16,9,3),C.FOG,{sh:0,lw:2.4});                             // clip
  S(ctx,El(30,8.5,2),C.WH,{sh:0,lw:1.8});
}};

// smartphone (S): standing up, chat bubbles on the screen.
A.PROPS['smartphone']={ size:'S', word:'smartphone', variants:['lilac','cyan','mint','butter','white','coral'], draw(ctx,o){
  const [main]=vc(o,'lilac');
  S(ctx,R(16.5,7,27,48,6.5),main,{sh:3,lw:2.8});                         // case, rests on y=55
  S(ctx,R(19.5,12,21,38,3.5),C.CY2,{sh:0,lw:2.2});                        // screen
  S(ctx,R(26,8.6,8,2.6,1.3),C.INK,{sh:0,lw:0});                          // camera notch
  const bub=(x,y,w,c,right)=>{ const p=new Path2D(); p.roundRect(x,y,w,6,3); const tx=right?x+w-3:x+3; p.moveTo(tx-2,y+5); p.lineTo(right?tx+3:tx-3,y+9); p.lineTo(tx+2,y+5); S(ctx,p,c,{sh:0,lw:1.8}); };
  bub(22,16,13,C.WH,false);                                              // bubble in
  bub(25,26,13,o.v==='cyan'?C.LIL:C.CY,true);                            // bubble out
  bub(22,36,9,C.WH,false);
}};

// electric-fan (M): the Vietnamese table fan: round guard with ink spokes, three blades, piano-key base.
A.PROPS['electric-fan']={ size:'M', word:'electric fan', variants:['cyan','lilac','mint','butter','white'], draw(ctx,o){
  const [main,tint]=vc(o,'cyan'), cx=48, cy=34;
  S(ctx,R(44,54,8,28,3),C.FOG,{sh:0,lw:2.6});                            // pole
  S(ctx,Pd('M20 89 C20 81 30 78 48 78 C66 78 76 81 76 89 Z'),C.WH,{sh:3}); // base, rests on y=89
  S(ctx,R(35,81,7,4.5,1.5),main,{sh:0,lw:2}); S(ctx,R(44.5,81,7,4.5,1.5),C.WH,{sh:0,lw:2}); S(ctx,R(54,81,7,4.5,1.5),C.WH,{sh:0,lw:2});
  S(ctx,El(cx,cy,26),C.WH,{sh:4,lw:3.2});                                // guard
  for(let i=0;i<3;i++){ ctx.save(); ctx.translate(cx,cy); ctx.rotate(i*2.094+0.4);
    S(ctx,Pd('M0 -4 C-10 -8 -12 -20 -2 -22 C8 -23 12 -12 4 -4 Z'),tint,{sh:0,lw:2.2}); ctx.restore(); }   // blades
  ctx.beginPath(); for(let i=0;i<12;i++){ const a=i*Math.PI/6; ctx.moveTo(cx+Math.cos(a)*8,cy+Math.sin(a)*8); ctx.lineTo(cx+Math.cos(a)*26,cy+Math.sin(a)*26); }
  ctx.lineWidth=2; ctx.lineCap='round'; ctx.strokeStyle=C.INK; ctx.stroke();                           // spokes
  S(ctx,El(cx,cy,26),null,{sh:0,lw:3.2});                                // rim over the spokes
  S(ctx,El(cx,cy,7),main,{sh:0,lw:2.4}); S(ctx,El(cx,cy,2.5),C.WH,{sh:0,lw:0});  // hub badge
}};

// suitcase (M): rolling case with telescopic handle, wheels and a tag.
A.PROPS['suitcase']={ size:'M', word:'suitcase', variants:['lilac','cyan','mint','butter','coral'], draw(ctx,o){
  const [main,tint]=vc(o,'lilac');
  L(ctx,[37,30,37,16],4); L(ctx,[59,30,59,16],4);                        // handle rods
  S(ctx,R(32,11,32,7,3.5),C.WH,{sh:0,lw:2.4});                           // grip
  [[34,86.5],[62,86.5]].forEach(([x,y])=>{ S(ctx,El(x,y,4),C.INK,{sh:0,lw:0}); });   // wheels, rest on y=89
  S(ctx,R(24,26,48,56,8),main,{sh:4});                                   // body
  S(ctx,R(34,32,6,44,3),tint,{sh:0,lw:2.2}); S(ctx,R(56,32,6,44,3),tint,{sh:0,lw:2.2});   // ribs
  glint(ctx,29,34,2.5,4,-0.2);
  L(ctx,[68,30,74,40],2);                                                // tag string
  ctx.save(); ctx.translate(76,46); ctx.rotate(-0.2); S(ctx,R(-5,-6,10,13,2.5),C.BUT,{sh:0,lw:2.2}); ctx.restore();
}};

// backpack (M): school/travel pack, top loop, flap, front pocket, shoulder straps at the sides.
A.PROPS['backpack']={ size:'M', word:'backpack', variants:['lilac','cyan','mint','butter','coral'], draw(ctx,o){
  const [main,tint]=vc(o,'cyan');
  [[30,30,8,52,23,84],[66,30,88,52,73,84]].forEach(a=>{ L(ctx,a,7); L(ctx,a,3.4,tint); });   // shoulder straps
  L(ctx,[41,24,48,8,55,24],4.5);                                         // top loop
  S(ctx,Pd('M22 84 C22 88 25 89 30 89 L66 89 C71 89 74 88 74 84 L74 42 C74 27 64 20 48 20 C32 20 22 27 22 42 Z'),main,{sh:3}); // body
  S(ctx,Pd('M23 40 C24 28 34 22 48 22 C62 22 72 28 73 40 Q48 50 23 40 Z'),tint,{sh:0,lw:2.4}); // flap
  S(ctx,R(44.5,42,7,7,2),C.WH,{sh:0,lw:2});                              // buckle
  S(ctx,R(30,58,36,26,[5,5,9,9]),tint,{sh:0,lw:2.4});                    // pocket
  L(ctx,[34,64.5,62,64.5],2.2); S(ctx,R(54,64,4.5,8,2),C.WH,{sh:0,lw:1.8});  // zip + pull
  glint(ctx,28,50,2.5,5,-0.2);
}};

// helmet (M): Vietnamese half helmet in side elevation, peak visor at the front, chin strap lying on the ground.
A.PROPS['helmet']={ size:'M', word:'helmet', variants:['lilac','cyan','mint','butter','coral','white'], draw(ctx,o){
  const [main,tint]=vc(o,'butter');
  ctx.save(); ctx.translate(-2,0);
  L(ctx,[26,84,16,90,6,89],4);                                           // chin strap lying on the ground
  S(ctx,R(5,85,10,6,2),C.WH,{sh:0,lw:2.2});                               // buckle
  S(ctx,Pd('M12 82 C12 50 30 32 50 32 C71 32 84 49 84 72 L84 82 Z'),main,{sh:4});   // half shell
  L(ctx,[21,74,21,54,31,43,45,39],5,o.v==='white'?C.GR:C.WH);            // decal stripe
  S(ctx,Pd('M61 39 C80 41 93 53 94 69 C94 76 91 80 86 80 C84 67 76 56 61 51 Z'),C.CY2,{sh:3,lw:2.6}); // clear visor
  L(ctx,[72,47,83,53,87,66],2.4,'rgba(255,255,255,.9)');                 // glass highlight
  S(ctx,El(63,45.5,3.8),C.WH,{sh:0,lw:2.2});                             // visor pivot
  S(ctx,R(10,80,76,9,4.5),C.WH,{sh:3,lw:2.8});                            // rim, rests on y=89
  ctx.restore();
}};

// passport (S): closed booklet, emblem and abstract title bars, no words.
A.PROPS['passport']={ size:'S', word:'passport', variants:['plum','coral','cyan','mint','lilac'], draw(ctx,o){
  const v=o.v&&o.v!=='plum'?vc(o,'lilac'):[C.PLUM,C.BUT], cover=v[0], gold=v[1];
  S(ctx,R(15,12,30,43,[2,5,5,2]),cover,{sh:3,lw:2.8});                   // cover, rests on y=55
  L(ctx,[19.5,14,19.5,53],2.2,'rgba(255,255,255,.35)');                  // spine fold
  ctx.fillStyle=gold; ctx.beginPath(); ctx.roundRect(25,17,13,2.8,1.4); ctx.fill();   // title bar
  S(ctx,El(31.5,31,7.5),null,{sh:0,lw:2,ink:gold}); ctx.fillStyle=gold; ctx.fill(star5(31.5,31,4.6,1.9));   // emblem
  ctx.fillStyle=gold; ctx.beginPath(); ctx.roundRect(24,43,15,2.8,1.4); ctx.fill();
  S(ctx,R(28,48,7,4.5,1.5),null,{sh:0,lw:1.8,ink:gold});                 // e-chip mark
}};

// star-lantern (M): Mid-Autumn den ong sao on a stick, side tassels; tod 'night' lights it from inside.
A.PROPS['star-lantern']={ size:'M', word:'star lantern', variants:['coral','butter','lilac','cyan','mint'], draw(ctx,o){
  const [main,tint]=vc(o,'coral'), lit=o.tod==='night', cx=48, cy=35, ro=27, ri=ro*0.5;
  if (lit) halo(ctx,cx,cy,34,3);
  L(ctx,[48,40,48,88],6); L(ctx,[48,40,48,88],2.6,C.WOOD);               // stick, rests on y≈89
  const pt=[]; for(let i=0;i<5;i++){ const a=-Math.PI/2+i*2*Math.PI/5; pt.push([cx+Math.cos(a)*ro, cy+Math.sin(a)*ro]); }
  const tassel=(x,y,s)=>{ [-1,0,1].forEach(i=>{ const a=[x,y,x+i*3+s*1.5,y+12,x+i*4.5+s*2,y+24]; L(ctx,a,4.6); L(ctx,a,2,C.BUT); }); };
  tassel(pt[4][0]+2,pt[4][1]+2,-1); tassel(pt[1][0]-2,pt[1][1]+2,1);       // paper tassels on the side arms
  S(ctx,star5(cx,cy,ro,ri),main,{sh:4,lw:3});                            // star
  const p=[]; for(let i=0;i<5;i++){ const a=-Math.PI/2+Math.PI/5+i*2*Math.PI/5; p.push(cx+Math.cos(a)*ri, cy+Math.sin(a)*ri); }
  S(ctx,Pg(p),lit?C.BU:tint,{sh:0,lw:0});                                 // lit core
  ctx.beginPath(); [0,2,4,1,3].forEach((k,i)=>{ const [x,y]=pt[k]; i?ctx.lineTo(x,y):ctx.moveTo(x,y); }); ctx.closePath();
  ctx.lineWidth=2.2; ctx.lineJoin='round'; ctx.strokeStyle=C.INK; ctx.stroke();   // bamboo pentagram frame
  if (lit){ spark(ctx,14,14,3.5,C.BUT); spark(ctx,84,12,3,C.WH); }
}};
})();

// Batch C catalogue props: cactus, lotus, monstera, watermelon, non-la, sneakers, t-shirt, armchair, plastic-stool, bookshelf.
(function boot(){
const A=window.YapArt; if(!A||!A.K){ setTimeout(boot,60); return; } if(boot.done) return; boot.done=1;
const {C,R,El,Pg,Pd,S,L,glint,spark,vc}=A.K;
// One flat sticker shadow for a prop built from several parts (so no part shadows onto another).
const shadow=(ctx,paths,sh)=>{ ctx.save(); ctx.translate(sh*0.35,sh); ctx.fillStyle=C.INK; paths.forEach(p=>ctx.fill(p)); ctx.restore(); };
// Ink rod with a colour core (stems, cords).
const rod=(ctx,a,w,c,core)=>{ L(ctx,a,w); L(ctx,a,core||w-3,c); };

// ---------- cactus (S) ----------
A.PROPS['cactus']={ size:'S', word:'cactus', variants:['coral','lilac','cyan','butter','white'], draw(ctx,o){
  ctx.translate(0,-2); const [main,tint]=vc(o,'coral');
  const armL=Pd('M26 32 C20 32 16 30 16 25 L16 19 C16 15.5 21 15.5 21 19 L21 24 C21 26 23 27 26 27 Z');
  const armR=Pd('M34 27 C40 27 44 25 44 20 L44 15 C44 11.5 39 11.5 39 15 L39 19 C39 21 37 22 34 22 Z');
  const body=R(24,9,12,32,6);
  S(ctx,armL,C.MI,{sh:0,lw:2.6}); S(ctx,armR,C.MI,{sh:0,lw:2.6}); S(ctx,body,C.MI,{sh:0,lw:2.6});
  [[27,16],[33,22],[27,28],[33,33]].forEach(([x,y])=>L(ctx,[x-1.2,y,x+1.2,y],1.8));
  glint(ctx,26.8,22,1.3,2.6,0);
  if (o.season==='spring'||o.flower){ for(let i=0;i<5;i++){ const a=-Math.PI/2+i*Math.PI*2/5; S(ctx,El(30+Math.cos(a)*3.6,8+Math.sin(a)*3.6,3,2.4),C.LIL,{sh:0,lw:1.8}); } S(ctx,El(30,8,2.2),C.BUT,{sh:0,lw:1.8}); }
  S(ctx,Pd('M18 41 L20.5 52 C21 54.5 23 56 25.5 56 L34.5 56 C37 56 39 54.5 39.5 52 L42 41 Z'),tint,{sh:3,lw:2.8});
  S(ctx,R(16,37,28,7,3.5),main,{sh:0,lw:2.4});
}};

// ---------- lotus (M), in a ceramic bowl ----------
A.PROPS['lotus']={ size:'M', word:'lotus', variants:['cyan','lilac','mint','butter','coral','white'], draw(ctx,o){
  ctx.translate(0,-2); const [main]=vc(o,'cyan');
  const bowl=Pd('M12 62 C14 80 28 90 48 90 C68 90 82 80 84 62 Z');
  S(ctx,bowl,C.WH,{sh:4,lw:3});
  ctx.save(); ctx.clip(bowl); ctx.fillStyle=main; ctx.fillRect(0,72,96,7); ctx.restore(); L(ctx,[13.5,72,82.5,72],2.2); L(ctx,[17,79,79,79],2.2); ctx.lineWidth=3; ctx.strokeStyle=C.INK; ctx.stroke(bowl);
  S(ctx,El(48,62,36,6.5),C.CY2,{sh:0,lw:2.6});
  // upright pad at the back left, bud at the right
  rod(ctx,[26,61,24,48,22,38],4.4,C.MI,1.6);
  S(ctx,Pd('M8 38 C12 30 32 30 36 38 C28 42 16 42 8 38 Z'),C.MI,{sh:0,lw:2.4});
  rod(ctx,[68,61,72,50,72,40],4.4,C.MI,1.6);
  S(ctx,Pd('M72 22 C79 29 79 38 72 42 C65 38 65 29 72 22 Z'),C.LIL,{sh:0,lw:2.4});
  // flower
  rod(ctx,[50,61,48,52,49,42],4.6,C.MI,1.6);
  S(ctx,Pd('M49 44 C38 46 28 41 24 33 C34 31 44 36 49 44 Z'),C.LIL,{sh:0,lw:2.4});
  S(ctx,Pd('M49 44 C60 46 70 41 74 33 C64 31 54 36 49 44 Z'),C.LIL,{sh:0,lw:2.4});
  S(ctx,Pd('M49 42 C40 40 33 30 33 20 C42 23 48 32 49 42 Z'),C.LIL2,{sh:0,lw:2.4});
  S(ctx,Pd('M49 42 C58 40 65 30 65 20 C56 23 50 32 49 42 Z'),C.LIL2,{sh:0,lw:2.4});
  S(ctx,Pd('M49 12 C57 20 57 34 49 42 C41 34 41 20 49 12 Z'),C.LIL2,{sh:0,lw:2.4});
  // floating pads
  S(ctx,Pd('M30 58 C20 58 16 61 16 63 C16 66 24 68 32 68 C40 68 44 66 44 63 C44 61 40 59 34 58 L33 62 Z'),C.MI,{sh:0,lw:2.4});
  S(ctx,Pd('M64 60 C58 60 54 62 54 64.5 C54 67 60 68.5 66 68.5 C73 68.5 78 67 78 64.5 C78 62 74 60.5 70 60 L67 63.5 Z'),C.MI,{sh:0,lw:2.4});
  /* review fix: bowl glint removed (it sat on the outline as a grey dot) */
}};

// ---------- monstera (M) ----------
function monLeaf(){ const p=new Path2D(), e=u=>15*Math.sin(Math.PI*(0.14+0.86*u)), y=u=>-30*u+4*Math.pow(1-u,3);
  const notch=[0.3,0.52,0.72], pts=s=>{ const a=[]; for(let i=0;i<=20;i++){ const u=i/20; let hit=null; notch.forEach(n=>{ if(Math.abs(u-n)<0.026) hit=n; }); if(hit!==null){ if(u<hit) { a.push([s*e(hit-0.03),y(hit-0.03)]); a.push([s*3.2,y(hit)+1.5]); a.push([s*e(hit+0.03),y(hit+0.03)]); } continue; } a.push([s*e(u),y(u)]); } return a; };
  p.moveTo(0,-2); pts(1).forEach(([x,yy])=>p.lineTo(x,yy)); p.lineTo(0,-30); pts(-1).reverse().forEach(([x,yy])=>p.lineTo(x,yy)); p.closePath(); return p; }
const MLEAF=monLeaf();
A.PROPS['monstera']={ size:'M', word:'monstera', variants:['cyan','lilac','mint','butter','coral','white'], draw(ctx,o){
  ctx.translate(0,-2); const [main,tint]=vc(o,'cyan');
  const leaf=(x,y,r,k)=>{ ctx.save(); ctx.translate(x,y); ctx.rotate(r); ctx.scale(k,k); S(ctx,MLEAF,C.MI,{sh:0,lw:2.5/k}); L(ctx,[0,-2,1,-14,0,-26],2/k); ctx.restore(); };
  rod(ctx,[44,58,36,52,32,46],4.4,C.MI,1.6); rod(ctx,[52,58,60,50,64,44],4.4,C.MI,1.6); rod(ctx,[48,58,47,50,48,42],4.4,C.MI,1.6);
  leaf(32,46,-1.0,0.95); leaf(64,44,0.95,1.0); leaf(48,42,0.05,1.05);
  S(ctx,Pd('M28 58 L31 84 C31.5 88 34 90 38 90 L58 90 C62 90 64.5 88 65 84 L68 58 Z'),tint,{sh:4,lw:2.8});
  S(ctx,R(25,53,46,9,4.5),main,{sh:0,lw:2.6});
  glint(ctx,35,68,2.4,4.5,-0.15);
}};

// ---------- watermelon (S), a wedge ----------
A.PROPS['watermelon']={ size:'S', word:'watermelon', variants:['coral','butter'], draw(ctx,o){
  ctx.translate(0,-2.5); const flesh=(o.v==='butter')?C.BUT:C.CORAL;
  const w=Pd('M30 9 C31.5 9 32.5 10 33.5 11.5 L55 43 C42 61 18 61 5 43 L26.5 11.5 C27.5 10 28.5 9 30 9 Z');
  S(ctx,w,flesh,{sh:3,lw:0});
  ctx.save(); ctx.clip(w); ctx.fillStyle=C.MI; ctx.fill(Pd('M0 43 C16 53 44 53 60 43 L60 62 L0 62 Z')); ctx.fillStyle=C.MI2; ctx.fill(Pd('M0 40 C16 50 44 50 60 40 L60 43 C44 53 16 53 0 43 Z')); ctx.restore();
  L(ctx,[5,40.5,18,48.5,42,48.5,55,40.5],2.2);
  ctx.lineWidth=2.8; ctx.strokeStyle=C.INK; ctx.lineJoin='round'; ctx.stroke(w);
  ctx.fillStyle=C.INK; [[30,24,0],[24,33,0.5],[36,33,-0.5],[19,41,0.7],[30,41,0],[41,41,-0.7]].forEach(([x,y,r])=>{ ctx.beginPath(); ctx.ellipse(x,y,1.3,2.2,r,0,7); ctx.fill(); });
  glint(ctx,26,20,1.6,3,0.5);
}};

// ---------- non la (M), conical hat with its chin ribbon hanging in a loop ----------
A.PROPS['non-la']={ size:'M', word:'conical hat', variants:['lilac','cyan','coral','mint','butter'], draw(ctx,o){
  const [main]=vc(o,'lilac');
  const hat=Pd('M48 12 C50 12 51 13 52 14.5 L90 62 C70 68 26 68 6 62 L44 14.5 C45 13 46 12 48 12 Z');
  const under=Pd('M6 62 C26 68 70 68 90 62 C82 76 14 76 6 62 Z');
  shadow(ctx,[hat,under],4);
  rod(ctx,[27,67,29,93,67,93,69,67],6.4,main,3.2);
  S(ctx,under,C.KR2,{sh:0,lw:2.6});
  S(ctx,hat,C.APRI,{sh:0,lw:0});
  ctx.save(); ctx.clip(hat);
  [0.3,0.5,0.7,0.88].forEach(f=>{ const y=12+f*52, hw=f*42, sag=f*5; L(ctx,[48-hw-2,y,48-hw*0.5,y+sag,48+hw*0.5,y+sag,48+hw+2,y],2,C.WOOD); });
  ctx.restore();
  ctx.lineWidth=3; ctx.strokeStyle=C.INK; ctx.lineJoin='round'; ctx.stroke(hat);
  glint(ctx,39,34,2.2,6,0.6);
}};

// ---------- sneakers (S), a pair, side view ----------
const SN_UP=Pd('M3 22 L3 8 C3 4 5 2 9 2 L15 2 C17 5 19 7 22 7 C26 7 28 8 30 9.5 C37 12 42 14 44 18 L45 22 Z');
const SN_TONGUE=Pd('M20 8 L21.5 1.5 C22.5 -0.5 26 -0.5 26.5 1.5 L28 9 Z');
const SN_TOE=Pd('M36 12.6 C41 14.2 43.4 16 44.2 19 L45 21.5 L36 21.5 C35.5 18 35.5 15 36 12.6 Z');
const SN_SOLE=R(1,21,46,8,[2,2,4,4]);
A.PROPS['sneakers']={ size:'S', word:'sneakers', variants:['cyan','lilac','mint','butter','coral','white'], draw(ctx,o){
  const [main,tint]=vc(o,'cyan');
  const at=(x,y,f)=>{ ctx.save(); ctx.translate(x,y); f(); ctx.restore(); };
  at(12,23,()=>shadow(ctx,[SN_UP,SN_SOLE],3)); at(1,26,()=>shadow(ctx,[SN_UP,SN_SOLE],3));
  const shoe=full=>{ if(full) S(ctx,SN_TONGUE,tint,{sh:0,lw:2.4}); S(ctx,SN_UP,tint,{sh:0,lw:2.6}); S(ctx,SN_TOE,C.WH,{sh:0,lw:2});
    if (full){ S(ctx,R(1.5,5,6,11,3),main,{sh:0,lw:2}); S(ctx,Pd('M19 6.5 C25 6.5 30 8 35.5 11 L34 15.5 C29 12.8 24 11.5 19 11.5 Z'),main,{sh:0,lw:2});
      ctx.fillStyle=C.WH; [[23,9.2],[27.5,10.2],[32,12.4]].forEach(([lx,ly])=>{ ctx.beginPath(); ctx.arc(lx,ly,1.4,0,7); ctx.fill(); }); }
    S(ctx,SN_SOLE,C.WH,{sh:0,lw:2.6}); if(full) L(ctx,[5,25,43,25],1.8,C.GR); };
  at(12,23,()=>shoe(false)); at(1,26,()=>shoe(true));
  glint(ctx,9,34,1.4,2.6,0);
}};

// ---------- t-shirt (M), laid flat ----------
A.PROPS['t-shirt']={ size:'M', word:'T-shirt', variants:['cyan','lilac','mint','butter','coral','white'], draw(ctx,o){
  ctx.translate(0,-2); const [main,tint]=vc(o,'cyan');
  const tee=Pd('M36 18 C40 23 56 23 60 18 L74 21 C80 23 84 28 89 36 L80 45 L74 41 L74 86 C74 88.5 72.5 90 70 90 L26 90 C23.5 90 22 88.5 22 86 L22 41 L16 45 L7 36 C12 28 16 23 22 21 Z');
  S(ctx,tee,tint,{sh:4,lw:3});
  ctx.save(); ctx.clip(tee); ctx.fillStyle=main; ctx.fill(Pg([88,33,78,43,83,48,94,38])); ctx.fill(Pg([8,33,18,43,13,48,2,38])); ctx.restore();
  L(ctx,[85,32,77,41],2.2); L(ctx,[11,32,19,41],2.2);
  S(ctx,Pd('M36 18 C40 23 56 23 60 18 L57 17 C52 21 44 21 39 17 Z'),main,{sh:0,lw:2.2});
  S(ctx,Pd('M48 50 C40 44 41.5 38 45 38 C46.8 38 48 39.5 48 40.8 C48 39.5 49.2 38 51 38 C54.5 38 56 44 48 50 Z'),main,{sh:0,lw:2.2});
  L(ctx,[26,84,70,84],2,'rgba(23,19,28,.35)',[3,4]);
  glint(ctx,29,30,2.6,5,0.3);
}};

// ---------- armchair (L), frontal ----------
A.PROPS['armchair']={ size:'L', word:'armchair', variants:['lilac','cyan','mint','butter','coral','white'], draw(ctx,o){
  const [main,tint]=vc(o,'lilac');
  const back=R(36,26,88,86,[32,32,6,6]), base=R(18,110,124,28,8), armL=R(12,62,36,72,[18,18,6,6]), armR=R(112,62,36,72,[18,18,6,6]), seat=R(44,96,72,24,10);
  L(ctx,[32,136,30,149],5); L(ctx,[128,136,130,149],5);
  shadow(ctx,[back,base,armL,armR],6);
  S(ctx,back,tint,{sh:0,lw:3.2}); S(ctx,base,main,{sh:0,lw:3});
  S(ctx,seat,tint,{sh:0,lw:2.6});
  S(ctx,armL,main,{sh:0,lw:3}); S(ctx,armR,main,{sh:0,lw:3});
  L(ctx,[65,40,65,96],2.2); L(ctx,[95,40,95,96],2.2);
  L(ctx,[54,112,106,112],2,'rgba(23,19,28,.25)',[4,5]);
  glint(ctx,52,44,5,9,-0.5); glint(ctx,22,76,3,6,-0.3);
}};

// ---------- plastic stool (M), the street-food ghe nhua ----------
A.PROPS['plastic-stool']={ size:'M', word:'plastic stool', variants:['coral','cyan','lilac','mint','butter'], draw(ctx,o){
  ctx.translate(0,-2); const [main,tint]=vc(o,'coral');
  const body=Pd('M24 38 L14.5 86 C14 88.5 15 90 17.5 90 L25 90 C27 90 28 89 28.5 87 L33 66 C35 58 61 58 63 66 L67.5 87 C68 89 69 90 71 90 L78.5 90 C81 90 82 88.5 81.5 86 L72 38 Z');
  const seat=R(16,28,64,12,6);
  shadow(ctx,[body,seat],4);
  S(ctx,body,main,{sh:0,lw:3});
  L(ctx,[26,50,20.5,82],2.2); L(ctx,[70,50,75.5,82],2.2);
  S(ctx,R(38,45,20,6,3),C.INK,{sh:0,lw:0});
  S(ctx,seat,main,{sh:0,lw:3});
  L(ctx,[22,33,74,33],2.2,'rgba(255,255,255,.6)');
  glint(ctx,29,46,1.8,4,0.2);
}};

// ---------- bookshelf (L) ----------
const BOOKS=[ // [colour, width, height, lean]
  [[C.LIL,10,30],[C.CY2,8,34],[C.MI,11,28],[C.WH,8,32],[C.BUT,10,26,0.2]],
  [[C.CY,10,30],[C.LIL2,9,26],[C.CORAL,8,32],[C.MI2,12,28]],
  [[C.WH,10,32],[C.LIL,8,28],[C.CY2,11,30]] ];
A.PROPS['bookshelf']={ size:'L', word:'bookshelf', variants:['wood','white','lilac','cyan','mint','butter'], draw(ctx,o){
  const fr=(o.v&&o.v!=='wood')?vc(o,'white'):[C.KR,C.KR2], frame=R(26,22,108,124,8);
  L(ctx,[36,144,35,147.5],5); L(ctx,[124,144,125,147.5],5);
  S(ctx,frame,fr[0],{sh:6,lw:3.2});
  S(ctx,R(34,30,92,108,4),fr[1],{sh:0,lw:2.4});
  const shelfY=[64,101,138];
  // books stand on each shelf
  BOOKS.forEach((row,r)=>{ let x=38; const g=shelfY[r];
    row.forEach(([c,bw,bh,lean])=>{ ctx.save(); if(lean){ ctx.translate(x,g); ctx.rotate(lean); ctx.translate(-x,-g); x+=4; }
      S(ctx,R(x,g-bh,bw,bh,[2,2,1,1]),c,{sh:0,lw:2.2}); L(ctx,[x+2.5,g-bh+6,x+bw-2.5,g-bh+6],2); ctx.restore(); x+=bw+1.5; });
  });
  // a little plant on the middle shelf, a box on the bottom shelf
  S(ctx,R(100,90,16,11,[2,2,5,5]),C.WH,{sh:0,lw:2.2});
  [[-0.5,-1],[0.5,1]].forEach(([r,s])=>{ ctx.save(); ctx.translate(108,90); ctx.rotate(r); S(ctx,El(s*3,-8,4.5,8),C.MI,{sh:0,lw:2}); ctx.restore(); });
  S(ctx,R(80,118,40,20,3),C.KR,{sh:0,lw:2.2}); S(ctx,R(95,118,10,8,1),C.WH,{sh:0,lw:0});
  [64,101].forEach(y=>S(ctx,R(30,y,100,6,2),fr[0],{sh:0,lw:2.4}));
  glint(ctx,31,40,1.6,6,0);
}};
})();

// Review fix pass (lead reviewer, after the batch agents): helmet, sneakers, chopsticks redrawn. Overrides the batch entries.
(function boot(){
const A=window.YapArt; if(!A||!A.K||!A.PROPS['helmet']){ setTimeout(boot,60); return; } if(boot.done) return; boot.done=1;
const {C,R,El,Pg,Pd,S,L,glint,vc}=A.K;
// helmet: it read as a food cloche (dome on a plate). Now: no plate; dome with a short front peak, ear flaps and a hanging U strap.
A.PROPS['helmet'].draw=function(ctx,o){ const [main]=vc(o,'butter');
  ctx.fillStyle=C.INK; ctx.save(); ctx.translate(1.4,4); ctx.fill(Pd('M16 66 C16 38 32 22 50 22 C68 22 82 36 84 60 L92 64 C94 66 92 70 88 70 L16 70 Z')); ctx.restore();
  L(ctx,[24,66,22,84,36,88],3.4); L(ctx,[74,66,76,84,62,88],3.4); S(ctx,R(42,84,14,8,3),C.WH,{sh:0,lw:2.2});    // strap and buckle
  S(ctx,Pd('M16 66 C16 38 32 22 50 22 C68 22 82 36 84 60 L84 70 L16 70 Z'),main,{sh:0,lw:3});                  // shell
  S(ctx,Pd('M80 58 C86 58 92 62 94 66 C94 69 92 70 88 70 L80 70 Z'),main,{sh:0,lw:2.8});                       // peak
  S(ctx,R(13,64,74,9,4.5),C.WH,{sh:0,lw:2.8});                                                                // rim band
  S(ctx,Pd('M58 32 C70 34 78 44 80 56 L64 56 C62 46 60 38 58 32 Z'),C.CY2,{sh:0,lw:2.4});                      // visor window
  L(ctx,[66,40,71,48],2.2,'rgba(255,255,255,.9)'); L(ctx,[30,58,30,46,40,34],5,o.v==='white'?C.GR:C.WH);       // highlight, decal
  [[22,68],[78,68]].forEach(([x,y])=>S(ctx,El(x,y,3.2),C.WH,{sh:0,lw:2}));                                      // strap rivets
};
// sneakers: the overlapping pair was muddled. Now: one clear sneaker in front, the partner peeking behind as a plain shape.
const UP='M8 44 L8 30 C8 26 11 24 15 24 L24 24 C28 30 34 32 40 33 C48 34 54 38 54 44 Z', SOLE='M5 44 L56 44 C57 44 57 50 54 50 L8 50 C5 50 4 48 5 44 Z';
A.PROPS['sneakers'].draw=function(ctx,o){ const [main,tint]=vc(o,'cyan');
  ctx.save(); ctx.translate(4,-5); ctx.fillStyle=C.INK; ctx.save(); ctx.translate(1,3); ctx.fill(Pd(UP)); ctx.fill(Pd(SOLE)); ctx.restore();
  S(ctx,Pd(UP),tint,{sh:0,lw:2.6}); S(ctx,Pd(SOLE),C.WH,{sh:0,lw:2.6}); ctx.restore();          // the partner, behind
  ctx.translate(-3,4); ctx.fillStyle=C.INK; ctx.save(); ctx.translate(1,3); ctx.fill(Pd(UP)); ctx.fill(Pd(SOLE)); ctx.restore();
  S(ctx,Pd(UP),tint,{sh:0,lw:2.8});
  S(ctx,Pd('M8 44 L8 36 C14 36 18 40 20 44 Z'),main,{sh:0,lw:2.2});                               // heel patch
  S(ctx,Pd('M40 33 C48 34 54 38 54 44 L44 44 C44 39 42 36 38 34 Z'),C.WH,{sh:0,lw:2.2});          // toe cap
  L(ctx,[22,28,38,36],2.4,main); [[25,30],[30,33],[35,35]].forEach(([x,y])=>{ ctx.fillStyle=C.INK; ctx.beginPath(); ctx.arc(x,y,1.5,0,7); ctx.fill(); }); // laces
  S(ctx,Pd(SOLE),C.WH,{sh:0,lw:2.8}); L(ctx,[10,47,52,47],1.8,C.GR);
};
// chopsticks: they lay off-centre on a blob. Now: a centred pair rising left to right, tips on a small rest, coloured ends.
A.PROPS['chopsticks'].draw=function(ctx,o){ const [main,tint]=vc(o,'coral');
  const stick=(x1,y1,x2,y2,w1,w2)=>{ const a=Math.atan2(y2-y1,x2-x1), nx=-Math.sin(a), ny=Math.cos(a);
    return Pg([x1+nx*w1,y1+ny*w1,x2+nx*w2,y2+ny*w2,x2-nx*w2,y2-ny*w2,x1-nx*w1,y1-ny*w1]); };
  S(ctx,Pd('M34 56 C34 49 46 49 46 56 Z'),tint,{sh:2,lw:2.4});                                     // rest
  [[8,30,42,52],[12,22,46,49]].forEach(([x1,y1,x2,y2])=>{ S(ctx,stick(x1,y1,x2,y2,2.8,1.4),C.KR,{sh:2.5,lw:2.2});
    S(ctx,stick(x1,y1,x1+(x2-x1)*0.22,y1+(y2-y1)*0.22,2.8,2.5),main,{sh:0,lw:1.8}); });
};
A.fx35=1;
})();

// Spike scenes: market stall (chợ), park bench, train platform. 390 x 844, call composition
// (top 90 under the header, bottom 170 under the call bar, centre x100-290 y300-700 kept calm).
//   s_market(ctx,w,h,o)    o.tod morning|afternoon|dusk, o.season 'tet', o.awning 'lilac'|'cyan', o.layer 'front'
//   s_park(ctx,w,h,o)      o.tod afternoon|dusk|night, o.season spring|summer|autumn|winter
//   s_platform(ctx,w,h,o)  o.weather rain|clear, o.tod afternoon|dusk|night, o.layer 'front' (canopy posts)
(function boot(){
const A=window.YapArt; if(!A||!A.K){ setTimeout(boot,60); return; } if(boot.done) return; boot.done=1;
const K=A.K, {C,R,El,Pg,Pd,S,G,L,spark,rnd,dots,glint}=K;
// The front layer gets the same time-of-day tint as the back, clipped to its own shapes.
// Each front sticker is washed right after its fill (before its ink), so every visible pixel is tinted exactly once.
const SW=cols=>{ cols=cols.filter(Boolean); return (ctx,p,fill,o)=>{ o=o||{}; if(!cols.length) return S(ctx,p,fill,o); const lw=o.lw==null?3:o.lw;
  S(ctx,p,fill,Object.assign({},o,{lw:0})); cols.forEach(c=>{ ctx.fillStyle=c; ctx.fill(p); }); if (lw) S(ctx,p,null,{lw,sh:0,ink:o.ink}); }; };
function cloud(ctx,x,y,s){ const p=new Path2D(); p.moveTo(x-30*s,y+8*s); p.bezierCurveTo(x-42*s,y+8*s,x-40*s,y-12*s,x-24*s,y-10*s); p.bezierCurveTo(x-20*s,y-28*s,x+8*s,y-30*s,x+12*s,y-14*s); p.bezierCurveTo(x+30*s,y-20*s,x+42*s,y+8*s,x+28*s,y+8*s); p.closePath(); S(ctx,p,C.WH,{lw:2.6,sh:3}); }
// Five-petal blossom (peach đào in LIL, apricot mai in BUT): one path of petals, butter or ink heart.
function bloom(ctx,x,y,r,c){ const p=new Path2D(); for(let i=0;i<5;i++){ const a=-Math.PI/2+i*Math.PI*2/5, px=x+Math.cos(a)*r*0.9, py=y+Math.sin(a)*r*0.9; p.moveTo(px+r*0.62,py); p.arc(px,py,r*0.62,0,7); }
  S(ctx,p,c,{sh:0,lw:1.9}); ctx.fillStyle=c===C.BUT?C.CORAL:C.BUT; ctx.beginPath(); ctx.arc(x,y,r*0.42,0,7); ctx.fill(); }
// Ink rod with a coloured core (the teapot-spout idiom), for branches.
const rod=(ctx,a,w,c)=>{ L(ctx,a,w); L(ctx,a,w-3.2,c); };
// Several circles read as one sticker blob: shadow pass, double-width ink pass, fill pass (only the outer half of the ink shows).
function blob(ctx,cs,fills,sh){ ctx.fillStyle=C.INK; cs.forEach(([x,y,r])=>{ ctx.beginPath(); ctx.arc(x+sh*0.35,y+sh,r,0,7); ctx.fill(); });
  ctx.lineWidth=6; ctx.strokeStyle=C.INK; cs.forEach(([x,y,r])=>{ ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.stroke(); });
  cs.forEach(([x,y,r],i)=>{ ctx.fillStyle=fills[i%fills.length]; ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fill(); }); }
const leaf=(ctx,x,y,r,k,c)=>{ ctx.save(); ctx.translate(x,y); ctx.rotate(r); ctx.scale(k,k); S(ctx,Pd('M0 0 C6 -8 18 -8 24 0 C18 6 6 6 0 0 Z'),c,{sh:0,lw:2.2/k}); ctx.restore(); };

// ---------------------------------------------------------------- market stall (chợ)
const M={ CT:514, GY:676 };
function market(ctx,w,h,o){ const t=(o.t||0)/1000, tod=o.tod||'afternoon', tet=o.season==='tet', dusk=tod==='dusk', CT=M.CT;
  const stripe=o.awning==='cyan'?C.CY:C.LIL;
  if (o.layer==='front') return marketFront(ctx,w,h,o,tod,tet);
  ctx.fillStyle=tod==='morning'?'#E4F7FE':dusk?C.LIL2:'#F4FCFF'; ctx.fillRect(0,0,w,h);
  if (dusk) S(ctx,El(196,300,30),C.BU,{sh:0,lw:3}); else cloud(ctx,196,236,.7);
  // far market, grey line art: roofs, then a row of little stalls
  [[-20,300,112,C.WH,1],[88,318,96,C.LIL2,0],[180,306,116,C.WH,0],[292,296,120,C.CY2,1]].forEach(([x,y,bw,c,win])=>{ G(ctx,R(x,y,bw,200,4),c); G(ctx,Pg([x-4,y,x+bw/2,y-24,x+bw+4,y]),C.WH); if(win){ G(ctx,R(x+bw/2-24,y+18,14,16,3),C.WH); G(ctx,R(x+bw/2+10,y+18,14,16,3),C.WH); } });
  for(let i=0;i<5;i++){ const x=-24+i*86, tint=[C.MI2,C.LIL2,C.CY2,C.BU,C.MI2][i];
    L(ctx,[x+8,420,x+8,470],2.5,C.GR); L(ctx,[x+72,420,x+72,470],2.5,C.GR);
    const aw=new Path2D(); aw.moveTo(x,404); aw.lineTo(x+80,404); aw.lineTo(x+80,420); for(let k=0;k<4;k++) aw.quadraticCurveTo(x+80-k*20-10,432,x+80-(k+1)*20,420); aw.closePath(); G(ctx,aw,tint);
    G(ctx,R(x+6,446,68,30,3),C.WH); }
  ctx.fillStyle=C.FOG; ctx.fillRect(0,470,w,h-470); L(ctx,[0,470,w,470],3); [724,784].forEach(y=>L(ctx,[0,y,w,y],2,'rgba(23,19,28,.07)'));
  // posts and awning
  [14,362].forEach(x=>S(ctx,R(x,168,14,CT-160,3),C.WOOD,{sh:0,lw:3}));
  const ay=78, ab=166; const aw=new Path2D(); aw.moveTo(-10,ay); aw.lineTo(400,ay); aw.lineTo(400,ab);
  for(let x=400;x>-20;x-=30) aw.quadraticCurveTo(x-15,ab+22,x-30,ab); aw.closePath();
  S(ctx,aw,C.WH,{sh:6,lw:0}); ctx.save(); ctx.clip(aw); ctx.fillStyle=stripe; for(let x=-20;x<400;x+=60) ctx.fillRect(x,ay,30,120); ctx.restore();
  ctx.lineWidth=3.2; ctx.strokeStyle=C.INK; ctx.lineJoin='round'; ctx.stroke(aw); L(ctx,[-10,ab-8,400,ab-8],2.2,'rgba(23,19,28,.15)');
  // hanging scale (left): dial without numbers, pan with two oranges
  L(ctx,[64,174,64,202],3); S(ctx,El(64,222,20),C.WH,{sh:3,lw:3}); [0,1,2,3,4].forEach(i=>{ const a=Math.PI*(1.15+i*0.175); L(ctx,[64+Math.cos(a)*14,222+Math.sin(a)*14,64+Math.cos(a)*17,222+Math.sin(a)*17],2,C.STEAM); });
  L(ctx,[64,222,73,211],2.6); S(ctx,El(64,222,3.2),C.CORAL,{sh:0,lw:0});
  L(ctx,[64,242,64,252],3); L(ctx,[64,252,40,288],2.2); L(ctx,[64,252,88,288],2.2);
  S(ctx,El(54,281,9.5,8.5),C.PASTRY,{sh:0,lw:2.2}); S(ctx,El(73,280,9.5,8.5),C.PASTRY,{sh:0,lw:2.2});
  S(ctx,Pd('M34 287 L94 287 C92 301 80 307 64 307 C48 307 36 301 34 287 Z'),C.FOG,{sh:3,lw:2.8});
  // banana bunch (right)
  L(ctx,[332,174,332,194],3); [-2,-1,0,1,2].forEach(k=>{ ctx.save(); ctx.translate(332,204); ctx.rotate(k*0.3); S(ctx,Pd('M-4 0 C-11 20 -7 42 5 56 C1 40 4 20 4 0 Z'),C.BUT,{sh:3,lw:2.4}); ctx.restore(); });
  S(ctx,R(326,192,12,14,3),C.BROWN,{sh:0,lw:2.4});
  // bulbs (lit at dusk)
  [112,280].forEach(x=>{ L(ctx,[x,176,x,204],2.4); S(ctx,R(x-5,202,10,8,2),C.SLATE,{sh:0,lw:2.2}); S(ctx,El(x,219,8.5,10.5),dusk?C.BUT:C.WH,{sh:0,lw:2.4}); });
  if (tet){
    [156,236].forEach((x,i)=>{ const sw=Math.sin(t*1.3+i)*0.04; ctx.save(); ctx.translate(x,176); ctx.rotate(sw); ctx.translate(-x,-176);
      L(ctx,[x,176,x,196],2.4); S(ctx,R(x-8,194,16,6,2),C.BUT,{sh:0,lw:2.2}); S(ctx,El(x,214,15,17),C.CORAL,{sh:3,lw:2.8});
      L(ctx,[x-5,199,x-11,214,x-5,229],2); L(ctx,[x+5,199,x+11,214,x+5,229],2); glint(ctx,x-7,207,2.5,4,-0.3);
      S(ctx,R(x-7,229,14,6,2),C.BUT,{sh:0,lw:2.2}); L(ctx,[x,236,x,252],3.5,C.BUT); ctx.restore(); });
    tetBranch(ctx,21,432,1,C.LIL); tetBranch(ctx,369,432,-1,C.BUT);
  }
  const lights=[[112,219,46],[280,219,46]]; // review fix: smaller bulb glows
  K.post(ctx,w,h,tod,lights,t,'out');
}
function tetBranch(ctx,x,y,dir,fc){ ctx.save(); ctx.translate(x,y); ctx.scale(dir,1);
  const arms=[[0,0,-8,-34,-26,-76],[0,0,12,-44,8,-92],[0,0,22,-30,52,-62],[0,0,-18,-12,-30,-34],[0,0,30,-10,64,-26]];
  arms.forEach(a=>rod(ctx,a,5.4,C.COFFEE));
  [[-26,-76],[8,-92],[52,-62],[-30,-34],[64,-26],[-14,-50],[10,-58],[30,-44],[40,-20],[-4,-72]].forEach(([bx,by],i)=>bloom(ctx,bx,by,i<5?6:5,fc));
  S(ctx,R(-7,-6,14,10,3),C.CORAL,{sh:0,lw:2.2}); ctx.restore(); }
function marketFront(ctx,w,h,o,tod,tet){ const CT=M.CT, S=SW([K.TOD[tod]]);
  // counter: front panel with planks, white top slab
  S(ctx,R(-10,CT+12,w+20,M.GY-CT-12,0),'#F6DCBC',{sh:0,lw:3});
  [CT+60,CT+108].forEach(y=>L(ctx,[0,y,w,y],2,'rgba(23,19,28,.12)')); for(let x=36;x<w;x+=78) L(ctx,[x,CT+16,x,M.GY-4],2,'rgba(23,19,28,.08)');
  if (tet){ S(ctx,R(-10,CT+14,w+20,20,0),C.CORAL,{sh:0,lw:2.6}); for(let x=28;x<w;x+=56) S(ctx,Pg([x,CT+18,x+8,CT+24,x,CT+30,x-8,CT+24]),C.BUT,{sh:0,lw:2}); }
  S(ctx,R(-10,CT,w+20,14,4),C.WH,{sh:5,lw:3.2});
  // left crate of oranges (fruit heap first, crate in front)
  [[26,-48],[44,-48],[62,-48],[80,-48],[98,-48],[35,-60],[53,-60],[71,-60],[89,-60],[53,-71],[71,-71]].forEach(([x,dy])=>S(ctx,El(x,CT+dy,10,9),C.PASTRY,{sh:0,lw:2.2}));
  [[56,CT-79,-0.6],[76,CT-79,-2.4]].forEach(([x,y,r])=>leaf(ctx,x,y,r,.5,C.MI));
  S(ctx,R(12,CT-46,98,46,4),C.KR2,{sh:4}); L(ctx,[16,CT-24,106,CT-24],2,'rgba(23,19,28,.18)'); S(ctx,R(48,CT-38,26,14,3),C.WH,{sh:0,lw:2.2});
  // right basket of dragon fruit
  [[302,-52],[326,-54],[350,-52],[314,-66],[340,-66]].forEach(([x,dy])=>{ const y=CT+dy; S(ctx,El(x,y,13,11),C.LIL,{sh:0,lw:2.4}); [[-12,-2,-1],[12,-2,1],[0,-11,0]].forEach(([fx,fy,s])=>S(ctx,Pg([x+fx,y+fy,x+fx+s*7-(s?0:3),y+fy-6,x+fx+s*2+(s?0:3),y+fy+(s?2:-1)]),C.MI,{sh:0,lw:1.9})); });
  const bk=Pd(`M284 ${CT-44} L380 ${CT-44} L372 ${CT-6} C370 ${CT-1} 366 ${CT} 360 ${CT} L304 ${CT} C298 ${CT} 294 ${CT-1} 292 ${CT-6} Z`);
  S(ctx,bk,C.KR2,{sh:4}); ctx.save(); ctx.clip(bk); for(let x=270;x<400;x+=14) L(ctx,[x,CT-44,x+16,CT],2,'rgba(23,19,28,.12)'); ctx.restore(); S(ctx,R(280,CT-48,104,10,5),C.WOOD,{sh:0,lw:2.6});
  // price tags: shapes, no words
  [[96,CT-50],[364,CT-50]].forEach(([x,y])=>{ L(ctx,[x,y,x,y-36],2.6); S(ctx,R(x-17,y-56,34,22,4),C.WH,{sh:3,lw:2.6}); L(ctx,[x-10,y-49,x+6,y-49],3,C.CORAL); L(ctx,[x-10,y-41,x+1,y-41],2.4,C.GR); });
}

// ---------------------------------------------------------------- park bench
function park(ctx,w,h,o){ const t=(o.t||0)/1000, tod=o.tod||'dusk', ss=o.season||'summer', win=ss==='winter', night=tod==='night', lit=tod!=='afternoon';
  const HZ=470, BY=600, PT=626, PB=704;
  ctx.fillStyle=night?'#3E3470':tod==='dusk'?C.LIL2:'#F4FCFF'; ctx.fillRect(0,0,w,h);
  if (night){} else if (tod==='dusk') S(ctx,El(132,HZ-74,30),C.BU,{sh:0,lw:3});
  else { cloud(ctx,120,160,.8); cloud(ctx,230,118,.6); }
  // far hill and lollipop trees in line art
  const far=win?C.WH:ss==='spring'?C.LIL2:ss==='autumn'?C.APRI:C.MI2;
  G(ctx,Pd(`M-10 ${HZ} C60 ${HZ-46} 150 ${HZ-56} 206 ${HZ-26} C262 ${HZ-60} 340 ${HZ-52} 400 ${HZ-18} L400 ${HZ} Z`),win?C.WH:C.MI2);
  [[196,HZ-58],[238,HZ-70],[280,HZ-60]].forEach(([x,y],i)=>{ L(ctx,[x,y+10,x,y+26],2.5,C.GR); G(ctx,El(x,y,13,15),i===1?C.WH:far); });
  // grass and path
  ctx.fillStyle=win?C.WH:C.MI2; ctx.fillRect(0,HZ,w,h-HZ); L(ctx,[0,HZ,w,HZ],3);
  ctx.fillStyle=win?C.FOG:'#F6DCBC'; ctx.fillRect(0,PT,w,PB-PT); L(ctx,[0,PT,w,PT],3); L(ctx,[0,PB,w,PB],3); dots(ctx,14,PT+14,w,PB-4,.08);
  // hedge behind the bench
  // bushes: circles clipped flat at the ground
  [[[2,566,34],[44,574,26]],[[296,574,26],[336,562,34],[380,570,30]]].forEach(cs=>{ ctx.save(); ctx.beginPath(); ctx.rect(-10,0,w+20,BY); ctx.clip(); blob(ctx,cs,[C.MI],4); ctx.restore();
    const [x,y,r]=cs[1]; glint(ctx,x-r*0.4,y-r*0.5,4,2.6,-0.4);
    if (win) cs.forEach(([x,y,r])=>S(ctx,Pd(`M${x-r*0.75} ${y-r*0.6} Q${x} ${y-r*1.3} ${x+r*0.75} ${y-r*0.6} Q${x+r*0.3} ${y-r*0.78} ${x} ${y-r*0.7} Q${x-r*0.3} ${y-r*0.78} ${x-r*0.75} ${y-r*0.6} Z`),C.WH,{sh:0,lw:2.2})); });
  // tree (right), seasonal
  S(ctx,Pd('M318 602 C324 540 320 460 326 380 L346 380 C350 460 346 540 354 602 Z'),C.WOOD,{sh:4,lw:3});
  if (win){ [[336,392,286,300],[336,384,374,286],[336,380,332,250],[308,330,282,322],[352,320,388,318],[334,300,312,262]].forEach(([x0,y0,x1,y1])=>rod(ctx,[x0,y0,(x0+x1)/2,(y0+y1)/2-6,x1,y1],7,C.WOOD));
    S(ctx,Pd('M322 384 Q336 372 350 384 Q343 380 336 382 Q329 380 322 384 Z'),C.WH,{sh:0,lw:2});
  } else {
    const cs=[[296,300,52],[360,282,56],[318,224,52],[372,206,40],[262,256,34],[340,338,40]];
    const fills=ss==='spring'?[C.LIL2]:ss==='autumn'?[C.PASTRY,C.PEACH,C.BUT,C.PASTRY,C.BUT,C.PEACH]:[C.MI];
    blob(ctx,cs,fills,4); glint(ctx,290,206,8,5,-0.5); glint(ctx,268,244,5,3.5,-0.5);
    if (ss==='spring'){ [[282,262],[318,288],[350,232],[300,196],[370,300],[334,330],[260,300],[386,252],[332,190]].forEach(([x,y])=>bloom(ctx,x,y,5,C.LIL));
      for(let i=0;i<6;i++){ const k=((t*0.12+i/6)%1), x=300-k*170+Math.sin(t+i)*10, y=330+k*250; ctx.fillStyle=C.LIL; ctx.beginPath(); ctx.ellipse(x,y,3.2,2,i,0,7); ctx.fill(); } }
    if (ss==='autumn'){ for(let i=0;i<4;i++){ const k=((t*0.1+i/4)%1); leaf(ctx,320-k*150,330+k*230,i+k*4,.45,i%2?C.BUT:C.PASTRY); }
      [[40,PT+18,0.4,C.PASTRY],[150,PB+20,2.6,C.BUT],[272,PT+30,-0.5,C.PEACH],[352,PB+26,1.2,C.PASTRY],[232,PB+44,0.1,C.BUT]].forEach(([x,y,r,c])=>leaf(ctx,x,y,r,.55,c)); }
  }
  // bench, frontal: slats in KR, iron rods in INK
  const bx=80, bw=230;
  [bx+22,bx+bw-22].forEach(x=>L(ctx,[x,494,x,560],5));
  S(ctx,R(bx,494,bw,16,5),C.KR,{sh:4,lw:3}); S(ctx,R(bx,518,bw,16,5),C.KR,{sh:4,lw:3});
  [[bx+18,bx+10],[bx+bw-18,bx+bw-10]].forEach(([x0,x1])=>L(ctx,[x0,566,x1,BY],5)); [bx+10,bx+bw-10].forEach(x=>S(ctx,El(x,BY,6,2.4),C.INK,{sh:0,lw:0}));
  S(ctx,R(bx-8,554,bw+16,14,5),C.KR,{sh:5,lw:3});
  L(ctx,[bx-2,555,bx-10,532,bx+16,532],5); L(ctx,[bx+bw+2,555,bx+bw+10,532,bx+bw-16,532],5);
  if (win){ S(ctx,Pd(`M${bx+4} 495 Q${bx+bw/2} 482 ${bx+bw-4} 495 Z`),C.WH,{sh:0,lw:2.2}); S(ctx,Pd(`M${bx-4} 556 Q${bx+30} 546 ${bx+70} 556 Z`),C.WH,{sh:0,lw:2.2}); S(ctx,Pd(`M${bx+bw-80} 556 Q${bx+bw-30} 544 ${bx+bw+6} 556 Z`),C.WH,{sh:0,lw:2.2}); }
  // streetlamp (left)
  if (lit){ ctx.fillStyle='rgba(255,226,154,.35)'; ctx.beginPath(); ctx.ellipse(52,PT+40,70,16,0,0,7); ctx.fill(); }
  L(ctx,[44,BY+8,44,224],6); S(ctx,R(32,BY-6,24,14,4),C.SLATE,{sh:3,lw:2.6});
  S(ctx,Pg([26,200,62,200,53,184,35,184]),C.SLATE,{sh:3,lw:2.6}); S(ctx,R(31,199,26,28,4),lit?C.BUT:C.CY2,{sh:0,lw:2.6});
  S(ctx,R(29,224,30,6,3),C.SLATE,{sh:0,lw:2.4}); S(ctx,El(44,179,4.5),C.SLATE,{sh:0,lw:2.2}); if(!lit) glint(ctx,38,207,2.5,5,-0.2);
  if (win) S(ctx,Pd('M28 186 Q44 168 60 186 Q52 182 44 184 Q36 182 28 186 Z'),C.WH,{sh:0,lw:2});
  if (win){ const r=rnd(21); ctx.fillStyle=C.WH; for(let i=0;i<26;i++){ const x=(r()*w+Math.sin(t*0.8+i)*8), y=90+((r()*560+t*30)%560); ctx.beginPath(); ctx.arc(x,y,2+r()*1.6,0,7); ctx.fill(); } }
  K.post(ctx,w,h,tod==='afternoon'?null:tod,tod==='night'?[[44,212,90],[44,PT+30,70]]:[[44,212,44],[44,PT+30,40]],t,'in'); // review fix: dusk glow was a haze blob
  if (night){ const r=rnd(8); for(let i=0;i<18;i++){ const x=r()*w, y=96+r()*200; if(x>240&&y>150) continue; spark(ctx,x,y,2+r()*3,i%4?C.WH:C.LIL); }
    S(ctx,El(150,150,18),'#FFF3C4',{sh:0,lw:3,ink:C.WH}); ctx.fillStyle='rgba(255,226,154,.6)'; ctx.beginPath(); ctx.arc(144,146,4,0,7); ctx.arc(156,157,3,0,7); ctx.fill(); }
}

// ---------------------------------------------------------------- train platform
const P={ CB:122, ED:580, FL:606 };
function platform(ctx,w,h,o){ const t=(o.t||0)/1000, tod=o.tod||'afternoon', rain=(o.weather||'rain')==='rain', night=tod==='night', lit=tod!=='afternoon'||rain, {CB,ED,FL}=P;
  if (o.layer==='front') return platformFront(ctx,w,h,o,tod,rain);
  ctx.fillStyle=night?'#3E3470':tod==='dusk'?C.LIL2:rain?C.FOG:'#E4F7FE'; ctx.fillRect(0,0,w,h);
  if (night&&!rain){ const r=rnd(5); for(let i=0;i<14;i++) spark(ctx,r()*w,CB+40+r()*120,2+r()*3,i%4?C.WH:C.LIL); }
  // far city, line art
  [[-16,300,70],[58,262,58],[120,320,84],[208,280,64],[276,306,60],[340,250,70]].forEach(([x,y,bw],i)=>{ G(ctx,R(x,y,bw,480-y+4,4),night?C.PLUM:[C.WH,C.CY2,C.LIL2,C.WH,C.MI2,C.CY2][i]);
    const side=x<100||x>270; for(let wy=y+18;wy<(side?400:y+40);wy+=34) for(let wx=x+bw/2-15;wx<x+bw/2+15;wx+=20) G(ctx,R(wx,wy,10,13,2),night?(((wx+wy)>>3)%3?C.BU:C.PLUM):C.WH); });
  G(ctx,R(-10,436,w+20,44,0),night?C.DUSK:C.WH); for(let x=12;x<w;x+=30) L(ctx,[x,440,x,476],2,C.GR);
  // track bed: two rails seen from the side
  ctx.fillStyle=C.GR; ctx.fillRect(0,480,w,ED-480); L(ctx,[0,480,w,480],3);
  [508,552].forEach(ry=>{ for(let x=6;x<w;x+=34) S(ctx,R(x,ry+1,22,7,2),C.KR2,{sh:0,lw:2}); L(ctx,[0,ry,w,ry],3.4); });
  // the train, nose arriving from the right
  const tb=Pd('M420 330 L322 330 C292 330 274 360 272 402 L270 522 C270 532 276 538 286 538 L420 538 Z');
  S(ctx,tb,C.WH,{sh:6,lw:3.4}); ctx.save(); ctx.clip(tb); ctx.fillStyle=C.CY; ctx.fillRect(260,436,170,18); ctx.fillStyle=C.LIL; ctx.fillRect(260,458,170,6);
  L(ctx,[260,436,420,436],2.4); L(ctx,[260,454,420,454],2.4); ctx.restore(); ctx.lineWidth=3.4; ctx.strokeStyle=C.INK; ctx.stroke(tb);
  S(ctx,Pd('M302 346 L334 346 L334 404 L284 404 C286 376 292 356 302 346 Z'),C.CY2,{sh:0,lw:2.6}); glint(ctx,300,366,3,7,0.3);
  S(ctx,R(350,350,50,54,8),C.CY2,{sh:0,lw:2.6}); L(ctx,[408,340,408,530],2.4,'rgba(23,19,28,.3)');
  S(ctx,El(288,488,7.5),lit?C.BUT:C.WH,{sh:0,lw:2.4}); S(ctx,R(278,520,150,14,4),C.SLATE,{sh:0,lw:2.6});
  [316,380].forEach(x=>{ S(ctx,El(x,542,10),C.INK,{sh:0,lw:0}); S(ctx,El(x,542,4),C.GR,{sh:0,lw:0}); });
  // rain beyond the platform edge (drawn before the canopy so the roof hides it)
  if (rain){ ctx.save(); ctx.beginPath(); ctx.rect(0,CB,w,ED-CB); ctx.clip(); ctx.strokeStyle='rgba(34,150,220,.5)'; ctx.lineWidth=2; ctx.lineCap='round';
    const r=rnd(3); for(let i=0;i<70;i++){ const x=r()*w, y=CB+((r()*(ED-CB)+t*380)%(ED-CB)); ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x-4,y+14); ctx.stroke(); } ctx.restore(); }
  // platform: coping edge, safety stripe, floor
  S(ctx,R(-10,ED-6,w+20,14,3),C.WH,{sh:0,lw:3});
  S(ctx,R(-10,ED+8,w+20,18,0),C.BUT,{sh:0,lw:3}); ctx.fillStyle='rgba(23,19,28,.18)'; for(let x=8;x<w;x+=13){ ctx.beginPath(); ctx.arc(x,ED+17,1.8,0,7); ctx.fill(); }
  ctx.fillStyle='#F4F1F7'; ctx.fillRect(0,FL,w,h-FL); L(ctx,[0,FL,w,FL],3); for(let y=FL+40;y<h;y+=44) L(ctx,[0,y,w,y],2,'rgba(23,19,28,.07)');
  if (rain){ [[236,700,46],[120,780,34],[330,640,26]].forEach(([x,y,rx])=>{ S(ctx,El(x,y,rx,6),C.CY2,{sh:0,lw:2.2,ink:C.GR}); L(ctx,[x-rx*0.5,y-1,x-rx*0.1,y-1],2.2,C.WH); }); }
  // canopy: glass roof, cyan fascia, lamps, drips
  ctx.save(); ctx.beginPath(); ctx.rect(-10,-10,w+20,108); ctx.fillStyle=C.CY2; ctx.fill(); ctx.clip(); for(let x=20;x<w;x+=56) L(ctx,[x,0,x-24,98],2.5,C.GR);
  ctx.fillStyle='rgba(255,255,255,.55)'; ctx.beginPath(); ctx.moveTo(60,0); ctx.lineTo(96,0); ctx.lineTo(70,98); ctx.lineTo(34,98); ctx.fill(); ctx.restore();
  S(ctx,R(-10,96,w+20,26,4),C.CY,{sh:6,lw:3.2}); L(ctx,[0,104,w,104],2.2,'rgba(255,255,255,.6)');
  if (rain) for(let x=24;x<w;x+=46){ const k=((t*0.9+x*0.013)%1); ctx.fillStyle=C.CY; ctx.beginPath(); ctx.ellipse(x,CB+12+k*40,2.2,3.4,0,0,7); ctx.fill(); }
  [128,262].forEach(x=>S(ctx,R(x-18,CB+4,36,9,[0,0,7,7]),lit?C.BUT:C.WH,{sh:0,lw:2.4}));
  // destination board (shapes, no words) and clock (no numbers)
  [70,170].forEach(x=>L(ctx,[x,CB+6,x,152],3));
  S(ctx,R(52,150,138,56,8),C.SLATE,{sh:4,lw:3});
  S(ctx,R(64,162,26,11,3),C.BUT,{sh:0,lw:0}); L(ctx,[100,167.5,176,167.5],4.5,'rgba(255,255,255,.85)');
  S(ctx,El(71,190,5),C.CY,{sh:0,lw:0}); L(ctx,[86,190,148,190],4.5,'rgba(255,255,255,.85)'); L(ctx,[160,190,176,190],4.5,C.LIL);
  L(ctx,[316,CB+6,316,148],3); S(ctx,El(316,176,27),C.WH,{sh:4,lw:3.2});
  [0,1,2,3].forEach(i=>{ const a=i*Math.PI/2; L(ctx,[316+Math.cos(a)*18,176+Math.sin(a)*18,316+Math.cos(a)*22,176+Math.sin(a)*22],2.6); });
  L(ctx,[316,176,316,160],3); L(ctx,[316,176,328,182],3); S(ctx,El(316,176,3.4),C.CORAL,{sh:0,lw:0});
  // bench (left)
  const bx=34, bw=104, sy=640;
  [bx+12,bx+bw-12].forEach(x=>L(ctx,[x,602,x,sy],4.5));
  S(ctx,R(bx,600,bw,13,4),C.KR,{sh:3,lw:3}); S(ctx,R(bx,618,bw,13,4),C.KR,{sh:3,lw:3});
  [[bx+12,bx+8],[bx+bw-12,bx+bw-8]].forEach(([x0,x1])=>L(ctx,[x0,sy+10,x1,668],4.5));
  S(ctx,R(bx-6,sy,bw+12,12,4),C.KR,{sh:4,lw:3});
  if (rain) ctx.fillStyle='rgba(110,130,170,.16)', ctx.fillRect(0,0,w,h);
  if (tod!=='afternoon') K.post(ctx,w,h,tod,[[128,CB+10,54],[262,CB+10,54],[288,488,44]],t,'in'); // review fix: canopy glows were haze blobs
  else if (rain){ ctx.save(); ctx.globalCompositeOperation='lighter'; [[288,488,60]].forEach(([x,y,r])=>{ const g=ctx.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,'rgba(255,205,150,.28)'); g.addColorStop(1,'rgba(255,205,150,0)'); ctx.fillStyle=g; ctx.fillRect(x-r,y-r,2*r,2*r); }); ctx.restore(); }
}
function platformFront(ctx,w,h,o,tod,rain){ const {CB}=P, S=SW([rain?K.TOD.rain:null,K.TOD[tod]]);
  [[6,22],[362,22]].forEach(([x,pw])=>{ S(ctx,R(x,CB-2,pw,600,[0,0,4,4]),C.WH,{sh:5,lw:3.2}); S(ctx,R(x-3,CB+20,pw+6,12,3),C.CY,{sh:0,lw:2.6}); S(ctx,R(x-5,CB+584,pw+10,16,4),C.SLATE,{sh:3,lw:2.8}); });
}

Object.assign(A,{s_market:market,s_park:park,s_platform:platform});
A.SCENES['market']={ fn:'s_market', front:'s_market', indoor:false, lights:[[112,219,110],[280,219,110]],
  anchors:{ 'counter-l':[140,513,1], 'counter-c':[195,513,1], 'counter-r':[250,513,1], 'ground-l':[62,730,1], 'ground-r':[328,730,1] } };
A.SCENES['park']={ fn:'s_park', front:null, indoor:false, lights:[[44,212,130]],
  anchors:{ 'bench-l':[112,553,1], 'bench-r':[278,553,1], 'path-l':[70,690,1], 'path-r':[322,690,1], 'path-c':[195,700,1] } };
A.SCENES['platform']={ fn:'s_platform', front:'s_platform', indoor:false, lights:[[128,132,120],[262,132,120],[288,488,70]],
  anchors:{ 'bench-l':[60,639,1], 'bench-r':[112,639,1], 'floor-l':[86,740,1], 'floor-c':[195,724,1], 'floor-r':[316,700,1] } };
})();

// SPIKE COPY of design/prototype/art/yap-cast.js with five wear hooks (o.wear). Identical output when o.wear is absent.
// Yapling cast v4: one rig, nine species. Starters: red panda, capybara, cat.
// Neighbours by country: otter (Singapore), tiger (India), bulldog (Britain), bison (USA), tarsier (Philippines), koala (Australia).
// Parts: back/tail, feet, ears, body, face markings, outfit, paws, eyes+lids, brows, nose, mouth (8 visemes over 14 moods), props, fx.
(function boot(){
const A = window.YapArt; if(!A||!A._||!A.K){ (window.__yapQ=window.__yapQ||[]).push(boot); setTimeout(boot,60); return; } if(boot.done) return; boot.done=1;
const {ell, fill, clipDo, mir, shaded, P} = A._; const lipMouth = A._.mouth;
const INK='#2E2833', LIP='#5A2A24', TG='#F07B6E';
const E=(cx,cy,rx,ry)=>{ry=ry==null?rx:ry;return `M${cx-rx} ${cy}a${rx} ${ry} 0 1 0 ${2*rx} 0a${rx} ${ry} 0 1 0 ${-2*rx} 0Z`;};
const RR=(x,y,w,h,r)=>`M${x+r} ${y}H${x+w-r}A${r} ${r} 0 0 1 ${x+w} ${y+r}V${y+h-r}A${r} ${r} 0 0 1 ${x+w-r} ${y+h}H${x+r}A${r} ${r} 0 0 1 ${x} ${y+h-r}V${y+r}A${r} ${r} 0 0 1 ${x+r} ${y}Z`;
const f=n=>Math.round(n*10)/10;
function bean(top,wt,wb){ const bot=208,h=bot-top,c=100,y=k=>f(top+h*k);
  return `M${c} ${top}C${f(c+wt*.62)} ${top} ${c+wt} ${y(.14)} ${c+wt} ${y(.38)}C${c+wt} ${y(.56)} ${c+wb} ${y(.66)} ${c+wb} ${y(.82)}C${c+wb} ${y(.96)} ${f(c+wb*.55)} ${bot} ${c} ${bot}C${f(c-wb*.55)} ${bot} ${c-wb} ${y(.96)} ${c-wb} ${y(.82)}C${c-wb} ${y(.66)} ${c-wt} ${y(.56)} ${c-wt} ${y(.38)}C${c-wt} ${y(.14)} ${f(c-wt*.62)} ${top} ${c} ${top}Z`; }
function rot(ctx,x,y,a,fn){ ctx.save(); ctx.translate(x,y); ctx.rotate(a); ctx.translate(-x,-y); fn(); ctx.restore(); }
function rr(ctx,x,y,w,h,r,c){ ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fillStyle=c; ctx.fill(); }
function seg(ctx,a,w,c){ ctx.beginPath(); ctx.moveTo(a[0],a[1]); if(a.length===4) ctx.lineTo(a[2],a[3]); else ctx.quadraticCurveTo(a[2],a[3],a[4],a[5]); ctx.lineWidth=w; ctx.lineCap='round'; ctx.strokeStyle=c; ctx.stroke(); }
const segM=(ctx,a,w,c)=>{ seg(ctx,a,w,c); seg(ctx,a.map((v,i)=>i%2?v:200-v),w,c); };
const ellM=(ctx,x,y,rx,ry,c,r)=>{ ell(ctx,x,y,rx,ry,c,r||0); ell(ctx,200-x,y,rx,ry,c,-(r||0)); };
const pair=(ctx,px,py,perk,draw)=>{ rot(ctx,px,py,perk,()=>draw(false)); rot(ctx,200-px,py,-perk,()=>draw(true)); };
const M=(d,m)=>m?mir(d):d, X=(x,m)=>m?200-x:x;
function crescent(ctx,d,col,dx,dy){ const p=P(d), q=new Path2D(); q.addPath(p); q.addPath(p,new DOMMatrix().translate(dx,dy)); ctx.save(); ctx.clip(p); ctx.fillStyle=col; ctx.fill(q,'evenodd'); ctx.restore(); }
function star(ctx,x,y,r,c){ ctx.beginPath(); for(let i=0;i<8;i++){ const a=i*Math.PI/4, q=i%2?r*0.34:r; ctx.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q);} ctx.closePath(); ctx.fillStyle=c; ctx.fill(); }

const SP = {
  redpanda:{ label:'Red panda', c:{b:'#C9562C',s:'#A94420',l:'#FFF4E8',ls:'#EEDFCF',d:'#3E2420',p:'#3E2420',bel:'#4A2A22',n:INK},
    top:54,wt:66,wb:70, ey:106,ex:24, ny:134,my:150,
    back(ctx,c,t){ const d='M140 192 C178 198 194 162 187 126 C182 104 165 100 158 112 C169 132 165 162 138 178 Z';
      rot(ctx,146,188,Math.sin(t*1.6)*0.04,()=>{ shaded(ctx,d,c.b,c.s,-4,-3); clipDo(ctx,d,()=>{ [[178,114,-0.3],[184,142,0.12],[172,168,0.7]].forEach(([x,y,r])=>ell(ctx,x,y,30,8,'#EAA36E',r)); ell(ctx,180,104,20,9,c.d,-0.3); }); }); },
    ears(ctx,c,perk){ pair(ctx,64,70,perk,m=>{ fill(ctx,M('M42 88 C32 64 36 40 52 32 C68 26 86 42 92 62 Z',m),c.b); fill(ctx,M('M47 80 C40 62 44 45 54 40 C65 36 78 48 84 62 Z',m),c.l); fill(ctx,M('M55 70 C52 60 54 51 60 49 C66 47 73 54 76 62 Z',m),c.d); }); },
    face(ctx,c){ fill(ctx,'M34 112 C26 128 30 148 46 156 C58 144 58 126 50 112 Z',c.l); fill(ctx,mir('M34 112 C26 128 30 148 46 156 C58 144 58 126 50 112 Z'),c.l);
      ellM(ctx,76,77,12,7.5,c.l); shaded(ctx,E(100,145,34,24),c.l,c.ls,-4,-3);
      segM(ctx,[82,126,80,134,76,140],5,'#B44A24'); } },
  capybara:{ label:'Capybara', c:{b:'#A97B52',s:'#8D6340',l:'#C9A27B',ls:'#B48C66',d:'#5E4130',p:'#8D6340',bel:'#B98E66',n:'#3B2A22'},
    top:50,wt:70,wb:74, ey:98,ex:30,er:.8,lid:.24, ny:128,my:156, nose:'capy',
    ears(ctx,c,perk){ pair(ctx,56,64,perk,m=>{ ell(ctx,X(56,m),58,10.5,9,c.s); ell(ctx,X(56,m),59,5,4.5,'#6E4A34'); }); },
    face(ctx,c){ shaded(ctx,RR(50,112,100,64,30),c.l,c.ls,-5,-4); ellM(ctx,62,64,3,2,'rgba(255,255,255,.0)'); },
    top2(ctx,c,t){ shaded(ctx,E(100,38,17,15.5),'#F6AE34','#DE861A',-4,-3); ell(ctx,94,32,4.5,2.8,'rgba(255,255,255,.6)');
      rot(ctx,101,24,Math.sin(t*2)*0.1,()=>fill(ctx,'M101 24 C104 14 115 13 120 17 C114 24 107 26 101 24 Z','#5FA55A')); ell(ctx,100,24,2.2,2.2,'#5E4130'); } },
  cat:{ label:'Cat', c:{b:'#8E97A7',s:'#768090',l:'#F6F1EA',ls:'#E5DDD2',d:'#4C5464',n:'#E5868A'},
    top:58,wt:64,wb:66, ey:110,ex:24, ny:137,my:151, nose:'heart', whisk:[[80,146,62,140,44,141],[80,152,62,154,46,160]],
    back(ctx,c,t){ const s=Math.sin(t*1.5)*5; ctx.save(); ctx.translate(4,4); seg(ctx,[148,198,192,196,182,142+s],17,c.s); ctx.restore(); seg(ctx,[148,198,192,196,182,142+s],16,c.b); seg(ctx,[188,168,186,156,182,143+s],16,c.d); },
    ears(ctx,c,perk){ pair(ctx,62,70,perk,m=>{ fill(ctx,M('M38 98 C34 72 38 48 48 30 C62 40 80 56 92 68 Z',m),c.b); fill(ctx,M('M48 86 C46 68 49 52 54 43 C63 51 73 59 80 68 Z',m),'#F2A9A3'); }); },
    face(ctx,c){ const T=58; seg(ctx,[100,T+4,100,T+24],5.5,c.d); segM(ctx,[87,T+8,86,T+16,89,T+24],4.5,c.d);
      segM(ctx,[36,118,46,119,55,124],4.5,c.d); segM(ctx,[36,132,46,132,54,134],4.5,c.d); segM(ctx,[30,170,40,170,48,166],5,c.d);
      ellM(ctx,88,147,17,13,c.l); ell(ctx,100,156,12,9,c.l); } },
  otter:{ label:'Otter', c:{b:'#8E5E3C',s:'#744B2E',l:'#F1DFC4',ls:'#E0C8A6',d:'#4E3222',p:'#7A5034',n:INK},
    top:50,wt:54,wb:58,tall:34,size:.94, ey:104,ex:24, ny:134,my:153, nk:1.3, whisk:[[66,146,48,140,34,141],[66,153,48,156,36,161]],
    back(ctx,c){ shaded(ctx,'M150 196 C176 200 191 190 193 168 C184 180 170 186 152 182 Z',c.b,c.s,-3,-3); },
    ears(ctx,c,perk){ pair(ctx,40,104,perk,m=>{ ell(ctx,X(40,m),100,11.5,11.5,c.s); ell(ctx,X(40,m),100,5.5,5.5,'#5E3C26'); }); },
    face(ctx,c){ shaded(ctx,'M100 120 C132 120 156 132 156 150 C156 168 130 178 100 178 C70 178 44 168 44 150 C44 132 68 120 100 120 Z',c.l,c.ls,-5,-4); ellM(ctx,74,80,10,5,'#A8754E'); },
    acc(ctx,c){ rr(ctx,60,178,80,50,14,'#4E9C95'); rr(ctx,82,190,36,15,6,'#3F857F'); seg(ctx,[60,186,100,190,140,186],4,'#3F857F'); ell(ctx,100,197,5,3.5,'#F7C548'); } },
  tiger:{ label:'Tiger', c:{b:'#EF8B30',s:'#D2701F',l:'#FFF6EA',ls:'#EEDFCC',d:'#3A2A2A',n:'#E27D6C'},
    top:52,wt:66,wb:70,tall:28, ey:108,ex:25, ny:135,my:153, whisk:[[72,148,54,143,40,144]],
    ears(ctx,c,perk){ pair(ctx,56,70,perk,m=>{ ell(ctx,X(54,m),62,17,17,c.d); ell(ctx,X(54,m),63,15,15,c.b); ell(ctx,X(55,m),65,8.5,8.5,c.l); }); },
    face(ctx,c){ ellM(ctx,76,79,12,7.5,c.l); ellM(ctx,82,148,24,18,c.l); ell(ctx,100,162,15,10,c.l);
      seg(ctx,[100,56,100,76],6,c.d); segM(ctx,[86,60,83,68,88,76],5,c.d); segM(ctx,[33,110,44,110,54,116],5,c.d); segM(ctx,[32,124,44,124,52,127],5,c.d); segM(ctx,[34,140,44,138,49,135],4.5,c.d); segM(ctx,[30,168,40,168,46,164],5,c.d); },
    acc(ctx,c){ ctx.fillStyle='#2F6F6A'; ctx.fillRect(0,170,200,60); fill(ctx,'M88 170 L112 170 L106 214 L94 214 Z',c.l); rr(ctx,82,166,36,9,4.5,'#FFF6EA'); [184,198].forEach(y=>{ell(ctx,88,y,2.8,2.8,'#F4B42A');ell(ctx,112,y,2.8,2.8,'#F4B42A');}); fill(ctx,'M134 186 C140 182 150 184 152 190 C146 194 138 193 134 186 Z','#F4B42A'); } },
  bulldog:{ label:'Bulldog', c:{b:'#D9A874',s:'#BD8C59',l:'#FFF6EC',ls:'#EEDFCC',d:'#5A3A2A',n:'#3A2A26'},
    top:60,wt:84,wb:82, ey:116,ex:27,er:.92, ny:138,my:161, nose:'bull', teeth:1,
    ears(ctx,c,perk){ pair(ctx,46,74,perk,m=>fill(ctx,M('M30 90 C22 78 26 64 40 62 C54 60 62 70 60 80 Z',m),'#7E5238')); },
    face(ctx,c){ fill(ctx,'M92 62 C95 78 92 100 88 118 L112 118 C108 100 105 78 108 62 Z',c.l); ellM(ctx,80,156,29,21,c.l); ell(ctx,100,170,18,10,c.l); segM(ctx,[66,132,74,136,82,134],2.6,'rgba(110,70,45,.35)'); },
    acc(ctx,c){ ctx.fillStyle='#8A3A3A'; ctx.fillRect(0,176,200,60); fill(ctx,'M78 174 L100 190 L98 174 Z','#FFFFFF'); fill(ctx,'M122 174 L100 190 L102 174 Z','#FFFFFF'); rr(ctx,96,186,8,24,3,'#2F3D5C'); },
    top2(ctx,c){ shaded(ctx,RR(52,36,96,32,16),'#2F3D5C','#22304A',-4,-3); rr(ctx,54,58,92,8,4,'#22304A'); fill(ctx,'M48 66 C72 80 128 80 152 66 L152 72 C128 88 72 88 48 72 Z','#1E2840'); shaded(ctx,E(100,48,7.5,6.5),'#F7C548','#D99A1C',-2,-2); } },
  bison:{ label:'Bison', c:{b:'#7C5639',s:'#644430',l:'#A8835F',ls:'#967253',d:'#3A271C',p:'#644430',n:INK,br:'#2A1C14'},
    top:56,wt:84,wb:90, ey:118,ex:28,er:.88, ny:0,my:163, nose:'none',
    ears(ctx,c,perk){ pair(ctx,40,84,perk,m=>{ shaded(ctx,M('M50 80 C28 80 14 62 18 40 C28 56 40 62 58 64 Z',m),'#EFE3CF','#D3C1A6',-3,-2); ell(ctx,X(30,m),104,12,7.5,c.s,m?0.3:-0.3); }); },
    face(ctx,c){ ctx.fillStyle=c.d; ctx.fillRect(0,0,200,66); [[50,76,18],[68,82,16],[86,86,15],[114,86,15],[132,82,16],[150,76,18],[100,74,20],[34,88,14],[166,88,14]].forEach(([x,y,r])=>ell(ctx,x,y,r,r,c.d));
      [[70,64],[100,58],[130,64]].forEach(([x,y])=>seg(ctx,[x-8,y+4,x,y-4,x+8,y+4],3,'#523828'));
      shaded(ctx,RR(56,132,88,48,24),c.l,c.ls,-5,-4); ellM(ctx,86,146,6,4.5,'#3A271C'); },
    acc(ctx,c){ ctx.fillStyle='#4F5D7A'; ctx.fillRect(0,184,200,50); fill(ctx,'M84 184 L100 212 L116 184 Z','#FFFFFF'); fill(ctx,'M97 192 L103 192 L106 206 L100 212 L94 206 Z','#C9482A'); },
    late(ctx,c){ fill(ctx,'M80 176 C84 192 94 198 100 198 C106 198 116 192 120 176 Z',c.d); } },
  tarsier:{ label:'Tarsier', c:{b:'#B89F82',s:'#9E8569',l:'#EADCCB',ls:'#DACAB6',d:'#5E4C3C',n:'#5E4C3C',iris:'#E3A63A'},
    top:62,wt:68,wb:58,size:.64, ey:112,ex:33,er:1.32, ny:148,my:162, nk:.7, mk:.8,
    ears(ctx,c,perk){ pair(ctx,44,80,perk,m=>rot(ctx,X(40,m),62,m?0.38:-0.38,()=>{ ell(ctx,X(40,m),60,19,27,c.b); ell(ctx,X(41,m),62,11,19,'#EDAA9C'); })); },
    face(ctx,c){ shaded(ctx,E(100,157,22,15),c.l,c.ls,-3,-3); },
    acc(ctx,c){ seg(ctx,[78,172,100,206,122,172],4,'#F2643D'); rr(ctx,90,194,20,25,4,'#FFFFFF'); rr(ctx,93,198,14,6,2,'#5BA6A0'); } },
  raccoon:{ label:'Raccoon', c:{b:'#9AA0AA',s:'#7F8591',l:'#F4F2F0',ls:'#E2DED8',d:'#3A3540',n:INK},
    top:56,wt:68,wb:72, ey:110,ex:25, ny:138,my:154, whisk:[[74,146,56,141,42,142]],
    back(ctx,c,t){ const d='M140 192 C178 198 194 162 187 126 C182 104 165 100 158 112 C169 132 165 162 138 178 Z'; rot(ctx,146,188,Math.sin(t*1.4)*0.04,()=>{ fill(ctx,d,c.b); clipDo(ctx,d,()=>{ [[178,114,-0.3],[184,142,0.12],[172,168,0.7]].forEach(([x,y,r])=>ell(ctx,x,y,30,8,c.d,r)); }); }); },
    ears(ctx,c,perk){ pair(ctx,56,72,perk,m=>{ ell(ctx,X(54,m),62,17,17,c.d); ell(ctx,X(54,m),63,14,14,c.b); ell(ctx,X(55,m),65,8,8,c.l); }); },
    face(ctx,c){ ellM(ctx,74,80,13,8,c.l); fill(ctx,'M34 104 C50 86 86 94 100 106 C114 94 150 86 166 104 C172 118 156 132 132 128 C116 126 108 120 100 118 C92 120 84 126 68 128 C44 132 28 118 34 104 Z',c.d); shaded(ctx,'M100 120 C124 120 140 132 140 148 C140 164 122 172 100 172 C78 172 60 164 60 148 C60 132 76 120 100 120 Z',c.l,c.ls,-4,-3); seg(ctx,[100,64,100,98],7,'#7F8591'); },
    top2(ctx,c){ shaded(ctx,'M48 66 C52 42 82 34 106 36 C134 38 152 50 150 64 C130 70 72 72 48 66 Z','#C9A27A','#B08860',-4,-3); fill(ctx,'M40 66 C70 74 132 74 160 64 L162 70 C132 82 70 82 40 72 Z','#8C6A4E'); ell(ctx,100,38,5,4,'#8C6A4E'); },
    acc(ctx,c){ ctx.fillStyle='#5B4A8C'; ctx.fillRect(0,178,200,60); fill(ctx,'M84 176 L100 192 L116 176 Z','#F4F2F0'); } },
  pangolin:{ label:'Pangolin', c:{b:'#B98A5E',s:'#9A6F48',l:'#F3DDC2',ls:'#E6CBA8',d:'#5E4130',n:INK},
    top:56,wt:64,wb:70, ey:122,ex:23,er:.88, ny:148,my:162, nk:.8,
    back(ctx,c,t){ const d='M146 192 C182 198 196 168 188 138 C184 122 171 120 167 132 C175 152 169 174 146 178 Z'; rot(ctx,150,186,Math.sin(t*1.2)*0.04,()=>{ fill(ctx,d,c.b); clipDo(ctx,d,()=>{ for(let i=0;i<6;i++){ const y=122+i*12; seg(ctx,[158,y,174,y+9,190,y],2.6,c.s);} }); }); },
    ears(ctx,c,perk){ pair(ctx,46,108,perk,m=>ell(ctx,X(40,m),110,8,6,c.l)); },
    face(ctx,c){ for(let r=0;r<4;r++){ const y=54+r*12, off=(r%2)*9; for(let x=22+off;x<190;x+=18) seg(ctx,[x-9,y,x,y+12,x+9,y],2.6,c.s); }
      for(let r=0;r<6;r++){ const y=112+r*14; [30,170].forEach(x0=>seg(ctx,[x0-9,y,x0,y+12,x0+9,y],2.6,c.s)); }
      shaded(ctx,'M100 98 C134 98 152 118 150 142 C148 162 128 178 100 178 C72 178 52 162 50 142 C48 118 66 98 100 98 Z',c.l,c.ls,-4,-3);
      shaded(ctx,E(100,152,16,13),c.ls,'#D8BA94',-2,-2); },
    acc(ctx,c){ fill(ctx,'M60 178 C80 192 120 192 140 178 L136 192 C116 204 84 204 64 192 Z','#5FD98A'); fill(ctx,'M112 188 L128 214 L106 210 Z','#4BC276'); } },
  koala:{ label:'Koala', c:{b:'#9BA4AD',s:'#848D97',l:'#F2F3F4',ls:'#DDE0E4',d:'#59616B',n:'#3A3A46'},
    top:64,wt:78,wb:82, ey:112,ex:29,er:.76, ny:138,my:164, nose:'koala',
    ears(ctx,c,perk){ pair(ctx,44,92,perk,m=>{ shaded(ctx,E(X(40,m),80,32,30),c.b,c.s,-4,-3); ell(ctx,X(43,m),83,20,18,'#F7F7F8'); ell(ctx,X(20,m),70,7,6,'#F7F7F8'); ell(ctx,X(26,m),98,6,5,'#F7F7F8'); }); },
    face(ctx,c){ ellM(ctx,76,148,18,12,'#ACB4BC'); },
    acc(ctx,c){ rr(ctx,40,170,120,20,10,'#F4B42A'); [62,96,130].forEach(x=>{ ctx.fillStyle='#3E8E5E'; ctx.fillRect(x,170,10,20); }); rr(ctx,118,184,22,32,8,'#F4B42A'); ctx.fillStyle='#3E8E5E'; ctx.fillRect(118,198,22,7); } }
};
const MOODS = {
  happy:{eye:'open',br:[0.06,0],mouth:'smile',pose:'rest'},
  laugh:{eye:'arc',br:[0.16,-7],mouth:'laugh',blush:.75,pose:'belly'},
  excited:{eye:'sparkle',br:[0.18,-10],mouth:'grin',fx:'spark',pose:'up',pupil:1.12},
  surprised:{eye:'wide',br:[0.1,-13],mouth:'O',pose:'rest'},
  confused:{eye:'open',br:[[0.28,-10],[0.22,3]],look:[5,-1],mouth:'wobble',fx:'q',tilt:7,pose:'scratch'},
  think:{eye:'squint',br:[[-0.24,-9],[0.12,1]],look:[-5,-6],mouth:'smirk',pose:'chin',tilt:-6},
  listen:{eye:'open',br:[-0.16,-5],look:[3,-1],mouth:'rest',tilt:8,perk:1,pose:'rest'},
  shy:{eye:'half',lid:.4,br:[-0.22,-3],look:[1,6],mouth:'U',blush:.95,pose:'cheeks',tilt:-5},
  proud:{eye:'half',lid:.46,br:[0.14,-6],mouth:'smirk',pose:'chest',tilt:-4},
  worried:{eye:'open',br:[-0.4,-6],mouth:'wobble',fx:'sweat',pupil:.82,pose:'chest'},
  sleepy:{eye:'half',lid:.66,br:[0.02,1],mouth:'U',fx:'zz',tilt:6,pose:'rest'},
  warm:{eye:'arc',br:[-0.12,-3],mouth:'smile',blush:.8,fx:'heart',pose:'chest'},
  patient:{eye:'half',lid:.22,br:[-0.12,-3],mouth:'smile',tilt:4,pose:'rest'},
  wave:{eye:'open',br:[0.12,-6],mouth:'grin',pose:'wave'}
};
const POSES = { rest:[[46,172,0.35],[154,172,-0.35]], belly:[[62,184,0.6],[138,184,-0.6]], up:[[26,96,-0.55],[174,96,0.55]],
  cheeks:[[58,150,-0.2],[142,150,0.2]], chin:[[46,172,0.35],[112,170,-0.9]], chest:[[84,180,0.9],[116,180,-0.9]],
  scratch:[[46,172,0.35],[166,74,0.3]], wave:[[46,172,0.35],[172,92,0.4]], phone:[[46,172,0.35],[156,142,-0.4]],
  book:[[60,178,0.5],[140,178,-0.5]], mug:[[82,186,0.9],[118,186,-0.9]] };
const FRONT = {cheeks:1,chin:1,phone:1,book:1,mug:1};
const PROPS = {
  phone(ctx){ rot(ctx,152,116,0.28,()=>{ rr(ctx,140,90,26,46,7,INK); rr(ctx,143,94,20,36,4,'#7CC6C0'); ell(ctx,153,99,3,1.5,'rgba(255,255,255,.6)'); }); },
  book(ctx){ shaded(ctx,RR(58,146,84,58,9),'#F2643D','#C9482A',-3,-3); rr(ctx,58,146,11,58,[9,0,0,9],'#C9482A'); shaded(ctx,E(112,172,10,10),'#F7C548','#E0A82A',-2,-2); ell(ctx,96,160,12,3,'rgba(255,255,255,.35)'); },
  mug(ctx,c,t){ ctx.lineWidth=5; ctx.strokeStyle='#FFF4E5'; ctx.beginPath(); ctx.arc(118,176,8,-1.3,1.3); ctx.stroke(); rr(ctx,82,160,34,34,[4,4,12,12],'#FFF4E5'); ell(ctx,99,162,15,3.5,'#7A4E33'); rr(ctx,88,172,22,8,4,'#F2643D');
    ctx.strokeStyle='rgba(255,255,255,.85)'; ctx.lineWidth=3; for(let k=0;k<2;k++){ const ph=t*2+k*1.7; ctx.globalAlpha=.5+.5*Math.sin(ph); seg(ctx,[93+k*12,154,87+k*12,144,94+k*12,134],3,'rgba(255,255,255,.85)'); } ctx.globalAlpha=1; }
};
function moodMouth(ctx,m){
  if (m==='laugh'){ const d='M-17 -5 C-9 -3 9 -3 17 -5 C15 10 8 18 0 18 C-8 18 -15 10 -17 -5 Z'; fill(ctx,d,LIP); clipDo(ctx,d,()=>{ ell(ctx,0,15,10,6.5,TG); ctx.fillStyle='#fff'; ctx.fillRect(-18,-8,36,6); }); return; }
  if (m==='grin'){ const d='M-16 -4 C-8 -1 8 -1 16 -4 C13 7 7 12 0 12 C-7 12 -13 7 -16 -4 Z'; fill(ctx,d,LIP); clipDo(ctx,d,()=>{ ctx.fillStyle='#fff'; ctx.fillRect(-17,-7,34,7); ell(ctx,0,11,7,4,TG); }); return; }
  ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle=LIP; ctx.lineWidth=4.5;
  if (m==='wobble'){ ctx.beginPath(); ctx.moveTo(-11,2); ctx.quadraticCurveTo(-6,-3,-2,1); ctx.quadraticCurveTo(2,5,6,0); ctx.quadraticCurveTo(9,-3,11,1); ctx.stroke(); return; }
  if (m==='smirk'){ ctx.beginPath(); ctx.moveTo(-10,1); ctx.quadraticCurveTo(3,7,12,-4); ctx.stroke(); return; }
  lipMouth(ctx,m);
}
function eyeDraw(ctx,x,ey,i,mo,o,c,er,lx,ly){
  let mode = o.blink && mo.eye!=='arc' ? 'blink' : (mo.eye==='squint' ? (i?'half':'open') : mo.eye);
  let lid = mo.eye==='squint' ? .55 : (mo.lid||.4);
  if (mode==='open' && c.lid){ mode='half'; lid=c.lid; } else if (mode==='half' && c.lid) lid=Math.max(lid,c.lid+.1);
  const lw=Math.max(4.4,5.2*er); ctx.lineCap='round';
  if (mode==='blink'){ ctx.beginPath(); ctx.moveTo(x-15*er,ey+2); ctx.quadraticCurveTo(x,ey+11*er,x+15*er,ey+2); ctx.lineWidth=lw; ctx.strokeStyle=INK; ctx.stroke(); return; }
  if (mode==='arc'){ ctx.beginPath(); ctx.moveTo(x-14*er,ey+6*er); ctx.quadraticCurveTo(x,ey-13*er,x+14*er,ey+6*er); ctx.lineWidth=lw*1.1; ctx.strokeStyle=INK; ctx.stroke(); return; }
  const wide=mode==='wide', rx=(wide?21:19.5)*er, ry=(wide?25:22.5)*er, k=(mo.pupil||1)*(wide?.72:1);
  ell(ctx,x,ey,rx,ry,'#FFFFFF');
  ctx.save(); ctx.beginPath(); ctx.ellipse(x,ey,rx,ry,0,0,Math.PI*2); ctx.clip();
  ell(ctx,x+rx*.3,ey+ry*.55,rx*.9,ry*.35,'rgba(46,40,51,.06)');
  const px=x+lx*er, py=ey+ly*er+1;
  if (c.iris){ ell(ctx,px,py,rx*.8,ry*.76,c.iris); ell(ctx,px,py+ry*.25,rx*.8,ry*.4,'rgba(160,90,20,.22)'); const pr=8.5*er*k; ell(ctx,px,py,pr,pr,INK); }
  else { const pw=13*k*er, ph=21*k*er; rr(ctx,px-pw/2,py-ph/2,pw,ph,pw/2,INK); }
  if (mode==='sparkle'){ star(ctx,px+2.5*er,py-5*er,5.8*er,'#FFFFFF'); ell(ctx,px-2.8*er,py+5.5*er,1.9*er,1.9*er,'#FFFFFF'); }
  else { const s=3.5*er*Math.max(k,.8); ell(ctx,px+2.6*er,py-4.6*er,s,s,'#FFFFFF'); ell(ctx,px-2.8*er,py+5.4*er,1.5*er,1.5*er,'#FFFFFF'); }
  if (mode==='half'){ const yl=ey-ry+2*ry*lid; ctx.fillStyle=c.b; ctx.beginPath(); ctx.moveTo(x-rx-2,ey-ry-2); ctx.lineTo(x+rx+2,ey-ry-2); ctx.lineTo(x+rx+2,yl-2); ctx.quadraticCurveTo(x,yl+5*er,x-rx-2,yl-2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x-rx,yl-1); ctx.quadraticCurveTo(x,yl+6*er,x+rx,yl-1); ctx.lineWidth=3.6*er; ctx.strokeStyle=INK; ctx.stroke(); }
  ctx.restore();
  if (o.flat){ ctx.beginPath(); ctx.ellipse(x,ey,rx,ry,0,0,Math.PI*2); ctx.lineWidth=3; ctx.strokeStyle=INK; ctx.stroke(); }
}
function paw(ctx,x,y,r,c,fl){ rot(ctx,x,y,r,()=>{ ell(ctx,x+2,y+2,11.5,15.5,c.s); ell(ctx,x,y,11.5,15.5,c.p||c.b); if(fl){ ctx.beginPath(); ctx.ellipse(x,y,11.5,15.5,0,0,Math.PI*2); ctx.lineWidth=3; ctx.strokeStyle=INK; ctx.stroke(); } ell(ctx,x-2,y-7,4,3,'rgba(255,255,255,.16)'); }); }
function nose(ctx,S,c){
  const t=S.nose||'heart', y=S.ny;
  if (t==='none') return;
  if (t==='capy'){ rr(ctx,76,y-7,48,15,7.5,c.n); ell(ctx,88,y-3,7,2,'rgba(255,255,255,.3)'); return; }
  if (t==='bull'){ rr(ctx,82,y-8,36,17,8.5,c.n); ell(ctx,92,y+1,3.4,2.2,'#1E1612'); ell(ctx,108,y+1,3.4,2.2,'#1E1612'); ell(ctx,92,y-4,5,1.8,'rgba(255,255,255,.35)'); return; }
  if (t==='koala'){ shaded(ctx,E(100,y,15,19),c.n,'#24242E',-3,-3); ell(ctx,95,y-8,3.6,5.5,'rgba(255,255,255,.28)'); return; }
  ctx.save(); ctx.translate(100,y); const k=S.nk||1; ctx.scale(k,k); fill(ctx,'M-7 -3 Q0 -7.5 7 -3 Q4.5 4 0 5 Q-4.5 4 -7 -3 Z',c.n); ell(ctx,-2.4,-3.2,2.2,1.3,'rgba(255,255,255,.55)'); ctx.restore();
}
function fx(ctx,kind,t){
  const s=Math.sin(t*4);
  if (kind==='sweat'){ ctx.save(); ctx.translate(162,74+((t*30)%10)); fill(ctx,'M0 -11 C4 -4 7 0 7 4 C7 8 4 11 0 11 C-4 11 -7 8 -7 4 C-7 0 -4 -4 0 -11 Z','#7CC6F0'); ell(ctx,-2.5,3,2,3,'rgba(255,255,255,.7)'); ctx.restore(); }
  if (kind==='spark'){ star(ctx,24,60,9+s*3,'#F7C548'); star(ctx,178,46,7-s*2,'#F7C548'); star(ctx,184,108,5+s*1.5,'#F2643D'); }
  if (kind==='q'){ ctx.save(); ctx.translate(176,46); ctx.rotate(0.2+s*0.06); ctx.font='900 38px ui-rounded, Nunito, sans-serif'; ctx.fillStyle='#F2643D'; ctx.textAlign='center'; ctx.fillText('?',0,0); ctx.restore(); }
  if (kind==='heart'){ ctx.save(); ctx.translate(170,58-((t*14)%14)); ctx.scale(1.5+s*.1,1.5+s*.1); fill(ctx,'M0 6 C-8 0 -6 -6 -2.5 -6 C-1 -6 0 -5 0 -3.5 C0 -5 1 -6 2.5 -6 C6 -6 8 0 0 6 Z','#F2643D'); ctx.restore(); }
  if (kind==='zz'){ ctx.font='900 20px ui-rounded, Nunito, sans-serif'; ctx.fillStyle='#8A7A6E'; ctx.fillText('z',160,62+s*2); ctx.font='900 14px ui-rounded, Nunito, sans-serif'; ctx.fillText('z',176,44-s*2); }
}
function critter(ctx,w,h,o){
  const sp=SP[o.sp]?o.sp:'redpanda', S=SP[sp], c=o.pal?Object.assign({},S.c,o.pal):S.c, mo=MOODS[o.mood]||MOODS.happy, t=(o.t||0)/1000, acc=o.acc!==false;
  const er=S.er||1, ex=S.ex, ey=S.ey, lk=mo.look||[0,0], lx=(o.look||0)+lk[0], ly=lk[1], dh=S.tall||0, sz=S.size||1;
  const body=S.bodyD||(S.bodyD=bean(S.top-dh,S.wt,S.wb));
  const up=fn=>{ ctx.save(); ctx.translate(0,-dh); fn(); ctx.restore(); };
  const wear=(o.wear||[]).map(id=>A.WEAR&&A.WEAR[id]).filter(Boolean), WG={sp, S, c, mo, er, ex, ey, dh, body, flat:!!o.flat, pose:o.pose||mo.pose||'rest'};
  const W=slot=>{ if(o.back) return; wear.forEach(it=>{ if(it[slot]){ ctx.save(); it[slot](ctx,WG,t); ctx.restore(); } }); };
  const hatOn=wear.some(it=>it.head);
  ctx.scale(w/200,h/240); ctx.translate(0,12);
  if (!o.noShadow) ell(ctx,100,214,60*sz,6,'rgba(43,35,32,.12)');
  if (sz!==1){ ctx.translate(100,214); ctx.scale(sz,sz); ctx.translate(-100,-214); }
  const tilt=o.tilt!=null?o.tilt:(mo.tilt||0);
  rot(ctx,100,206,tilt*Math.PI/300,()=>{
    if (S.back && !o.back && !o.noTail) S.back(ctx,c,t);
    [[73,0.42],[127,-0.42]].forEach(([x,r])=>rot(ctx,x,206,r,()=>rr(ctx,x-15,200,30,13,6.5,c.d)));
    const perk = mo.perk?-0.15:(o.mood==='sleepy'||o.mood==='worried'||o.mood==='shy'?0.12:0);
    if (S.ears) up(()=>S.ears(ctx,c,perk,t));
    fill(ctx,body,c.b);
    if (!o.back) clipDo(ctx,body,()=>{ ell(ctx,100,202,S.wb*.62,34,c.bel||c.l); if (S.face) up(()=>S.face(ctx,c,t)); if (acc&&S.acc) S.acc(ctx,c,t); W('torso'); }); else { clipDo(ctx,body,()=>{ ell(ctx,100,206,S.wb*.9,40,c.s); }); if (S.back) S.back(ctx,c,t); }
    if (S.late && !o.back) up(()=>S.late(ctx,c,t));
    if (!o.flat){ crescent(ctx,body,'rgba(80,36,16,.13)',-11,-7); clipDo(ctx,body,()=>ell(ctx,74,S.top-dh+22,32,12,'rgba(255,255,255,.16)',-0.35)); }
    else { ctx.lineWidth=3.2; ctx.strokeStyle='rgba(23,19,28,.9)'; ctx.lineJoin='round'; ctx.stroke(P(body)); }
    W('neck');
    const pk=o.pose||mo.pose||'rest', pose=(POSES[pk]||POSES.rest).map(([x,y,r])=>[x,y<165?y-dh:y,r]), front=FRONT[pk], wv=pk==='wave'?Math.sin(t*9)*0.35:0;
    if (!front) pose.forEach(([x,y,r],i)=>paw(ctx,x,y,r+(i?wv:0),c,o.flat));
    if (!o.back) up(()=>{
      const ry=22.5*er, bl=mo.blush||.42, bx=ex+22;
      ell(ctx,100-bx,ey+ry+5,11+bl*3,6.5+bl*2,`rgba(240,118,104,${bl})`); ell(ctx,100+bx,ey+ry+5,11+bl*3,6.5+bl*2,`rgba(240,118,104,${bl})`);
      [100-ex,100+ex].forEach((x,i)=>eyeDraw(ctx,x,ey,i,mo,o,c,er,lx,ly));
      const br = Array.isArray(mo.br[0]) ? mo.br : [mo.br,mo.br];
      [100-ex,100+ex].forEach((x,i)=>{ const g=i?-1:1, by=ey-ry-9+br[i][1]-(mo.eye==='wide'?3:0), bw=11*Math.max(er,.9);
        rot(ctx,x,by,br[i][0]*g,()=>{ ctx.beginPath(); ctx.moveTo(x-bw,by+1.5); ctx.quadraticCurveTo(x,by-3.5,x+bw,by+1.5); ctx.lineWidth=5.5; ctx.lineCap='round'; ctx.strokeStyle=c.br||c.d; ctx.stroke(); }); });
      W('face');
      nose(ctx,S,c);
      if (S.whisk) S.whisk.forEach(a=>segM(ctx,a,2.2,'rgba(46,40,51,.3)'));
      const talking = o.mouth && o.mouth!=='rest', mk=(S.mk||.92)*(talking&&mo.eye==='sparkle'?1.12:1);
      ctx.save(); ctx.translate(100,S.my); ctx.scale(mk,mk);
      if (talking) lipMouth(ctx,o.mouth); else moodMouth(ctx,mo.mouth);
      if (S.teeth && (!talking || o.mouth==='M')){ fill(ctx,'M-15 3 L-12 -5 L-9 3 Z','#FFFFFF'); fill(ctx,'M15 3 L12 -5 L9 3 Z','#FFFFFF'); }
      ctx.restore();
      if (o.prop==='phone') PROPS.phone(ctx,c,t);
    });
    if (o.prop && !o.back && o.prop!=='phone' && PROPS[o.prop]) PROPS[o.prop](ctx,c,t);
    if (front && !o.back) pose.forEach(([x,y,r])=>paw(ctx,x,y,r,c,o.flat));
    if (acc && S.top2 && !hatOn) up(()=>S.top2(ctx,c,t));
    W('head');
    if (mo.fx && !o.noFx) up(()=>fx(ctx,mo.fx,t));
  });
}
function faceGeo(sp){ const S=SP[sp]||SP.redpanda, sz=S.size||1; return {sz, fy:214+(S.ey-(S.tall||0)-214)*sz+16}; }
function face(ctx,w,h,o){ const G=faceGeo(o.sp), k=w/138/G.sz*(o.zoom||1); ctx.translate(w/2-100*k, h*0.5-G.fy*k); critter(ctx,200*k,240*k,Object.assign({},o,{noShadow:true,noFx:true})); }
A.critter=critter; A.face=face; A.wearRig=true; A.faceGeo=faceGeo; (window.__yapQ||[]).splice(0).forEach(f=>f()); A.MOODS=Object.keys(MOODS); A.SPECIES=Object.keys(SP).reduce((m,k)=>(m[k]=SP[k].label,m),{});
})();

// Spike: wearables for the cast rig (needs the wear hooks in 50-cast-wear.js).
// An item draws in one or more slots; the rig calls each slot at its layer:
//   torso : inside the body clip, after the species' own outfit   -> fits every body shape for free
//   neck  : over the body outline, UNDER the paws (arms stay on top)
//   face  : after eyes and brows, before nose and mouth          -> glasses sit over the eyes; blink/lipsync parts unchanged
//   head  : last, over ears (hides capybara's orange)             -> needs the eye/brow line to sit right
// Every anchor below is derived from the rig's own species numbers (S.top, S.wt, S.wb, S.ey, S.ex, S.er, S.my),
// so a new species fits without a table unless its ears or face break the rule (see FIT).
(function boot(){
const A=window.YapArt; if(!A||!A.K){ setTimeout(boot,60); return; } if(boot.done) return; boot.done=1;
const {C,R,El,Pg,Pd,S,L,spark,glint,vc}=A.K;
// The bean body's half-width at height y (same curve as yap-cast bean()).
function halfW(Sp,dh,y){ const top=Sp.top-dh, k=Math.max(0,Math.min(1,(y-top)/(208-top)));
  if (k<.38) return Sp.wt*Math.sin(Math.min(1,k/.38)*Math.PI/2);
  if (k<.82){ const u=(k-.38)/.44, s=u*u*(3-2*u); return Sp.wt+(Sp.wb-Sp.wt)*s; } return Sp.wb*Math.cos((k-.82)/.18*Math.PI/2*0.75); }
// Per-species exceptions. Empty for the starters except where the rule-of-thumb was visibly off.
const FIT={ redpanda:{}, capybara:{ hatK:1.06 }, cat:{ hatDy:2 } };
// Neck line: 21 below the mouth centre, never closer than 23 (a grin reaches ~14 below).
const neckY=g=>g.S.my-g.dh+21, collarY=g=>Math.max(neckY(g)-3,g.S.my-g.dh+26);
const fit=g=>FIT[g.sp]||{};
const W={};
W.scarf={ slots:['neck'], neck(ctx,g){ const y=neckY(g), hw=halfW(g.S,g.dh,y)+3, [m,t]=vc(g.o||{},'lilac');
  const band=Pd(`M${100-hw} ${y-9} Q100 ${y+6} ${100+hw} ${y-9} L${100+hw} ${y+6} Q100 ${y+22} ${100-hw} ${y+6} Z`);
  S(ctx,band,C.LIL,{sh:0,lw:3}); ctx.save(); ctx.clip(band); for(let x=100-hw+10;x<100+hw;x+=22){ ctx.fillStyle=C.WH; ctx.fillRect(x,y-20,7,50); } ctx.restore(); ctx.lineWidth=3; ctx.strokeStyle=C.INK; ctx.stroke(band);
  const tx=100+hw*0.42; const tail=Pd(`M${tx-9} ${y+8} L${tx+9} ${y+8} L${tx+12} ${y+42} L${tx-6} ${y+44} Z`); S(ctx,tail,C.LIL,{sh:0,lw:3});
  ctx.save(); ctx.clip(tail); ctx.fillStyle=C.WH; ctx.fillRect(tx-14,y+20,30,7); ctx.restore(); ctx.lineWidth=3; ctx.strokeStyle=C.INK; ctx.stroke(tail);
  for(let i=0;i<4;i++) L(ctx,[tx-5+i*5.5,y+43-i*0.5,tx-5+i*5.5,y+50],2.4); } };
W['sun-hat']={ slots:['head'], head(ctx,g){ const f=fit(g), k=(g.S.wt/66)*(f.hatK||1), y=g.ey-g.dh-42+(f.hatDy||0);
  ctx.translate(100,y); ctx.scale(k,k);
  S(ctx,El(0,0,62,12),C.KR,{sh:0,lw:3.2});
  S(ctx,Pd('M-34 2 C-36 -30 -20 -40 0 -40 C20 -40 36 -30 34 2 Z'),C.KR,{sh:0,lw:3.2});
  ctx.save(); ctx.clip(Pd('M-34 2 C-36 -30 -20 -40 0 -40 C20 -40 36 -30 34 2 Z')); ctx.fillStyle=C.LIL; ctx.fillRect(-40,-12,80,11); ctx.restore();
  L(ctx,[-35,-12,35,-12],2.4); L(ctx,[-35,-1,35,-1],2.4);
  S(ctx,El(26,-8,7,6),C.WH,{sh:0,lw:2.4}); S(ctx,El(26,-8,2.6),C.BUT,{sh:0,lw:1.8});
  glint(ctx,-16,-28,6,4,-0.4); } };
W.necklace={ slots:['neck'], neck(ctx,g){ const y=neckY(g)-4, hw=halfW(g.S,g.dh,y)*0.5;
  for(let i=0;i<=10;i++){ const u=i/10, x=100-hw+2*hw*u, yy=y+Math.sin(u*Math.PI)*16; S(ctx,El(x,yy,3.6),i%2?C.WH:C.LIL2,{sh:0,lw:1.8}); }
  S(ctx,Pd(`M100 ${y+18} C106 ${y+24} 108 ${y+30} 100 ${y+36} C92 ${y+30} 94 ${y+24} 100 ${y+18} Z`),C.BUT,{sh:0,lw:2.4}); spark(ctx,104,y+24,3.5,C.WH); } };
W.glasses={ slots:['face'], face(ctx,g){ const r=Math.min(21*g.er+4,g.ex-2.5), y=g.ey;
  [100-g.ex,100+g.ex].forEach(x=>{ ctx.fillStyle='rgba(207,240,253,.35)'; ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fill(); L(ctx,[x-r*0.5,y-r*0.35,x-r*0.15,y-r*0.65],2.2,'rgba(255,255,255,.9)'); });
  ctx.lineWidth=4; ctx.strokeStyle=C.INK; [100-g.ex,100+g.ex].forEach(x=>{ ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.stroke(); });
  ctx.lineWidth=4; ctx.strokeStyle=C.CY; [100-g.ex,100+g.ex].forEach(x=>{ ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.stroke(); });
  ctx.lineWidth=1.6; ctx.strokeStyle=C.INK; [100-g.ex,100+g.ex].forEach(x=>{ ctx.beginPath(); ctx.arc(x,y,r+2.6,0,7); ctx.stroke(); ctx.beginPath(); ctx.arc(x,y,r-2.6,0,7); ctx.stroke(); });
  const gap=100-g.ex+r; if (gap<100) L(ctx,[gap,y-4,100,y-9,200-gap,y-4],3.2);
  L(ctx,[100-g.ex-r,y-3,100-g.ex-r-12,y-6],3.2); L(ctx,[100+g.ex+r,y-3,100+g.ex+r+12,y-6],3.2); } };
// Tết top inspired by the áo dài: torso in CORAL with a butter print, a mandarin collar and the side closure.
W['tet-top']={ slots:['torso','neck'], torso(ctx,g){ const y=collarY(g); ctx.fillStyle=C.CORAL; ctx.fillRect(0,y,200,240);
    const r=A.K.rnd(4); for(let i=0;i<14;i++){ const x=40+r()*120, yy=y+10+r()*36; for(let p=0;p<4;p++){ ctx.fillStyle=C.BUT; ctx.beginPath(); ctx.ellipse(x+Math.cos(p*Math.PI/2)*3,yy+Math.sin(p*Math.PI/2)*3,2.4,2.4,0,0,7); ctx.fill(); } }
    L(ctx,[0,y,200,y],3); },
  neck(ctx,g){ const y=collarY(g), hw=halfW(g.S,g.dh,y)*0.42;
    S(ctx,R(100-hw,y-9,2*hw,12,[6,6,2,2]),C.CORAL,{sh:0,lw:3}); L(ctx,[100-hw+4,y-3,100+hw-4,y-3],2,C.BUT);
    L(ctx,[100+hw*0.3,y+3,100+hw*0.7,y+16,100+hw*1.15,y+20],2.6); [[100+hw*0.55,y+10],[100+hw*0.95,y+19]].forEach(([x,yy])=>S(ctx,El(x,yy,3),C.BUT,{sh:0,lw:1.8})); } };
W.raincoat={ slots:['torso','neck','head'], torso(ctx,g){ const y=neckY(g)-5; ctx.fillStyle=C.BUT; ctx.fillRect(0,y,200,240); L(ctx,[0,y,200,y],3);
    L(ctx,[100,y,100,212],2.6); [y+14,y+30].forEach(yy=>S(ctx,R(94,yy-3,12,6,3),C.WH,{sh:0,lw:2})); [[64,y+26],[136,y+26]].forEach(([x,yy])=>S(ctx,R(x-12,yy,24,10,3),C.BU,{sh:0,lw:2.4})); },
  neck(ctx,g){ const y=neckY(g)-5, hw=halfW(g.S,g.dh,y)*0.5;
    S(ctx,Pg([100,y+14,100-hw,y-6,100-hw*0.25,y-8]),C.BUT,{sh:0,lw:2.8}); S(ctx,Pg([100,y+14,100+hw,y-6,100+hw*0.25,y-8]),C.BUT,{sh:0,lw:2.8}); },
  head(ctx,g){ const f=fit(g), k=(g.S.wt/66)*(f.hatK||1), y=g.ey-g.dh-40+(f.hatDy||0); ctx.translate(100,y); ctx.scale(k,k);
    S(ctx,Pd('M-58 6 C-50 -6 -40 -8 -30 -6 C-30 -34 -16 -42 0 -42 C16 -42 30 -34 30 -6 C40 -8 54 -2 62 12 C30 4 -26 -2 -58 6 Z'),C.BUT,{sh:0,lw:3.2});
    L(ctx,[-30,-6,0,-9,30,-6],2.4); glint(ctx,-12,-30,6,3.6,-0.4); } };
// Pass item colour options through (o.v) by reading it off the call: kept simple here.
A.WEAR=W;
// A fitted critter with items: s_wear(ctx,w,h,{sp, mood, wear:[ids]}) = the sticker critter with the wear list.
A.s_wear=(ctx,w,h,o)=>A.s_critter(ctx,w,h,o);
})();

// Spike: collectible rarity as a die-cut sticker around any catalogue prop, built the way yap-sticker's
// outline() builds the critter outline (silhouette copies on offscreen canvases), so it costs no new art per prop.
//   s_collect(ctx, w, h, { id, v, rarity: 'common'|'rare'|'limited', season })
//   common  : white die-cut rim + ink edge + flat shadow (a plain sticker)
//   rare    : foil rim (diagonal lilac/cyan/mint/butter bands) + 3 sparkles
//   limited : butter (gold) rim, warm 'lighter' glow behind (as the night jar), and a coral season tag (Natterwick festival seal)
(function boot(){
const A=window.YapArt; if(!A||!A.K){ setTimeout(boot,60); return; } if(boot.done) return; boot.done=1;
const {C,R,El,Pg,Pd,S,L,spark}=A.K;
const pool={};
function buf(k,w,h){ let c=pool[k]; if(!c) c=pool[k]=document.createElement('canvas'); if(c.width!==w||c.height!==h){ c.width=w; c.height=h; } return c; }
function sil(src,dst,col,W,H){ const x=dst.getContext('2d'); x.setTransform(1,0,0,1,0,0); x.globalCompositeOperation='source-over'; x.clearRect(0,0,W,H); x.drawImage(src,0,0); x.globalCompositeOperation='source-in'; x.fillStyle=col; x.fillRect(0,0,W,H); x.globalCompositeOperation='source-over'; }
function ring(ctx,img,r,dx,dy,n){ for(let i=0;i<n;i++){ const t=i/n*Math.PI*2; ctx.drawImage(img,Math.cos(t)*r+(dx||0),Math.sin(t)*r+(dy||0)); } }
function collect(ctx,w,h,o){ const d=A.PROPS[o.id]; if(!d) return; const rar=o.rarity||'common', t=(o.t||0)/1000;
  const m=ctx.getTransform(), k=m.a, W=Math.ceil(w*k), H=Math.ceil(h*k), u=w*0.8/A.K.BOX[d.size]*k; // u: device px per prop unit
  const pad=Math.round(W*0.14), PW=W+2*pad, PH=H+2*pad;
  const a=buf('a',PW,PH), b=buf('b',PW,PH), c=buf('c',PW,PH), e=buf('e',PW,PH);
  const ax=a.getContext('2d'); ax.setTransform(1,0,0,1,0,0); ax.clearRect(0,0,PW,PH); ax.setTransform(k,0,0,k,pad,pad); ax.translate(w*0.1,h*0.1); A.s_prop(ax,w*0.8,h*0.8,Object.assign({},o,{t:0,steam:false,fx:false})); // inset so the die-cut stays inside w x h; no steam/sparkle in the cut
  const r1=5.5*u, r2=r1+2.8*u, sh=4*u;
  // The rim: the prop's silhouette grown by r1 in the rim colour, then (rare) banded.
  sil(a,b,C.WH,PW,PH); const cx=c.getContext('2d'); cx.setTransform(1,0,0,1,0,0); cx.clearRect(0,0,PW,PH); ring(cx,b,r1,0,0,16); cx.drawImage(b,0,0);
  if (rar==='rare'){ cx.globalCompositeOperation='source-atop'; const cols=[C.LIL2,C.CY2,C.MI2,C.BU]; for(let i=-PH;i<PW;i+=9*u){ cx.fillStyle=cols[Math.abs(Math.round(i/(9*u)))%4]; cx.beginPath(); cx.moveTo(i,0); cx.lineTo(i+9*u,0); cx.lineTo(i+9*u+PH,PH); cx.lineTo(i+PH,PH); cx.closePath(); cx.fill(); } cx.globalCompositeOperation='source-over'; }
  if (rar==='limited'){ cx.globalCompositeOperation='source-atop'; cx.fillStyle=C.BUT; cx.fillRect(0,0,PW,PH); cx.globalCompositeOperation='source-over'; }
  sil(c,e,C.INK,PW,PH);
  ctx.save(); ctx.setTransform(1,0,0,1,m.e-pad,m.f-pad);
  if (rar==='limited'){ ctx.save(); ctx.globalCompositeOperation='lighter'; const g=ctx.createRadialGradient(PW/2,PH/2,0,PW/2,PH/2,PW*0.62); g.addColorStop(0,'rgba(255,214,107,.55)'); g.addColorStop(1,'rgba(255,214,107,0)'); ctx.fillStyle=g; ctx.fillRect(0,0,PW,PH); ctx.restore(); }
  ring(ctx,e,r2-r1,sh*0.35,sh,12); ring(ctx,e,r2-r1,0,0,12); ctx.drawImage(c,0,0); ctx.drawImage(a,0,0);
  ctx.restore();
  // Badges in the prop's own units.
  const B=A.K.BOX[d.size]; ctx.save(); ctx.scale(w/B,h/B);
  if (rar==='rare'){ const s=B/60; [[B*0.1,B*0.12,6],[B*0.9,B*0.2,4.5],[B*0.86,B*0.78,3.5]].forEach(([x,y,r],i)=>{ const p=new Path2D(); const rr=r*s*(1+0.12*Math.sin(t*4+i)); p.moveTo(x,y-rr); p.quadraticCurveTo(x,y,x+rr,y); p.quadraticCurveTo(x,y,x,y+rr); p.quadraticCurveTo(x,y,x-rr,y); p.quadraticCurveTo(x,y,x,y-rr); S(ctx,p,i===1?C.CY:C.BUT,{sh:0,lw:1.8}); }); }
  if (rar==='limited'){ const s=B/60*0.8; ctx.translate(B*0.84,B*0.84); ctx.scale(s,s);
    S(ctx,El(0,0,10),C.CORAL,{sh:2,lw:2.2}); ctx.lineWidth=1.4; ctx.strokeStyle=C.BUT; ctx.setLineDash([2,2.4]); ctx.beginPath(); ctx.arc(0,0,7.4,0,7); ctx.stroke(); ctx.setLineDash([]);
    const ss=o.season||'cold-night'; // Natterwick's own festivals: rain-fair, cold-night, year-lights, harbour
    if (ss==='rain-fair'){ S(ctx,Pd('M0 -6.5 C3 -2.5 5 0.5 5 3 C5 5.8 2.7 7.5 0 7.5 C-2.7 7.5 -5 5.8 -5 3 C-5 0.5 -3 -2.5 0 -6.5 Z'),C.BUT,{sh:0,lw:1.4}); }
    else if (ss==='harbour'){ L(ctx,[-6.5,1.5,-3.2,-3,0,1.5],1.8,C.BUT); L(ctx,[0,1.5,3.2,-3,6.5,1.5],1.8,C.BUT); L(ctx,[-5,5,0,3,5,5],1.6,C.BUT); }
    else if (ss==='year-lights'){ spark(ctx,0,0,6.5,C.BUT); }
    else { S(ctx,El(0,0.6,4.8,4.4),C.BUT,{sh:0,lw:1.4}); L(ctx,[-2.4,-4.6,2.4,-4.6],1.6); L(ctx,[-2.4,5.8,2.4,5.8],1.6); L(ctx,[0,-4.6,0,-7],1.4); } }
  ctx.restore();
}
A.s_collect=collect;
})();

// Spike: a shareable "collection shelf" card: 3 shelves x 4 props, each labelled with its English word and gloss,
// rarity shown with s_collect. s_shelfcard(ctx, w=390, h=640, { title, sub, sp, items:[{ id, v?, rarity?, season?, word, vi }] })
(function boot(){
const A=window.YapArt; if(!A||!A.K||!A.s_collect){ setTimeout(boot,60); return; } if(boot.done) return; boot.done=1;
const {C,R,El,S,L,dots,spark}=A.K;
function card(ctx,w,h,o){
  ctx.fillStyle=C.LIL2; ctx.fillRect(0,0,w,h); dots(ctx,9,9,w,h,.08);
  S(ctx,R(16,16,w-32,h-40,22),C.WH,{lw:3.2,sh:7});
  ctx.font='800 22px Lexend,sans-serif'; ctx.fillStyle=C.INK; ctx.textAlign='left'; ctx.fillText(o.title||'My word shelf',36,58);
  ctx.font='500 12px Lexend,sans-serif'; ctx.fillStyle='#5D5366'; ctx.fillText(o.sub||'',36,78);
  ctx.save(); ctx.beginPath(); ctx.arc(w-67,55,29,0,7); ctx.clip(); ctx.translate(w-96,26); A.s_face(ctx,58,58,{sp:o.sp||'redpanda',mood:'excited',bg:C.LIL2}); ctx.restore();
  ctx.lineWidth=3; ctx.strokeStyle=C.INK; ctx.beginPath(); ctx.arc(w-67,55,29,0,7); ctx.stroke();
  const items=o.items||[], rows=3, cols=4, x0=34, cw=(w-68)/cols, top=92, rh=(h-64-top)/rows;
  for(let r=0;r<rows;r++){ const sy=top+rh*(r+1)-52;
    // shelf plank, as the burrow shelves (white, ink, flat shadow, two brackets)
    S(ctx,R(28,sy,w-56,10,3),C.KR,{sh:3}); L(ctx,[34,sy+10,34,sy+18],3); L(ctx,[w-34,sy+10,w-34,sy+18],3);
    for(let c=0;c<cols;c++){ const it=items[r*cols+c]; if(!it) continue; const d=A.PROPS[it.id]; if(!d) continue;
      const s=66, cx=x0+cw*c+cw/2, B=A.K.BOX[d.size], g=A.K.GROUND[d.size];
      ctx.save();
      if (it.rarity){ const k=s/B; ctx.translate(cx-s/2, sy-(0.1*B+0.8*g)*k-7*k*B/60); A.s_collect(ctx,s,s,Object.assign({t:0},it)); }
      else { const k=s/B*0.86; ctx.translate(cx-B*k/2, sy-g*k); A.s_prop(ctx,B*k,B*k,Object.assign({t:0,steam:false},it)); }
      ctx.restore();
      ctx.textAlign='center'; ctx.font='700 11px Lexend,sans-serif'; ctx.fillStyle=C.INK; ctx.fillText(it.word,cx,sy+28);
      ctx.font='500 9.5px Lexend,sans-serif'; ctx.fillStyle=C.PLUM; ctx.fillText(it.vi,cx,sy+40); } }
  // footer legend
  const fy=h-46; ctx.font='600 10px Lexend,sans-serif'; ctx.textAlign='left'; ctx.fillStyle='#5D5366';
  [[C.WH,'thường',40],[C.CY2,'hiếm',120],[C.BUT,'theo mùa',178]].forEach(([c,t,x])=>{ S(ctx,R(x,fy-9,12,12,3),c,{sh:0,lw:2}); ctx.fillStyle='#5D5366'; ctx.fillText(t,x+17,fy+1); });
  ctx.textAlign='right'; ctx.font='800 13px Lexend,sans-serif'; ctx.fillStyle=C.INK; ctx.fillText('yapling',w-38,fy+2); spark(ctx,w-104,fy-3,5,C.LIL);
}
A.s_shelfcard=card;
})();

// Spike: anchors for two EXISTING scenes, read off their generators (yap-r6 cafeWarm / yap-sticker cafe, yap-r4 burrow2).
// [x, y, scale] = ground-contact point on a surface. No change to the scene code is needed to accept props.
(function boot(){
const A=window.YapArt; if(!A||!A.K){ setTimeout(boot,60); return; } if(boot.done) return; boot.done=1;
const glow=(ctx,x,y,r,col)=>{ ctx.save(); ctx.globalCompositeOperation='lighter'; const g=ctx.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,col); g.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=g; ctx.fillRect(x-r,y-r,2*r,2*r); ctx.restore(); };
// cafeWarm = cafe + this light (yap-r6); split so placed props get the same warmth.
const cafeLight=(ctx,w,h)=>{ ctx.fillStyle='rgba(255,160,90,.13)'; ctx.fillRect(0,0,w,h); glow(ctx,w*0.16,90,140,'rgba(255,190,120,.45)'); glow(ctx,w*0.84,100,140,'rgba(255,190,120,.45)'); glow(ctx,w/2,170,160,'rgba(255,225,170,.35)'); };
A.SCENES.cafe={ fn:'s_cafe', light:cafeLight, front:'s_cafeFront', indoor:true, lights:[[62,90,140],[328,100,140]],
  anchors:{ 'counter-1':[166,410,1], 'counter-2':[224,410,1], 'counter-3':[262,410,.9],      // counter top y=410, between the pastry case (x≤132) and the coffee machine (x≥284)
    'table-l':[70,746,.85], 'table-r':[322,746,.85],                                           // table top (ellipse y=747), beside the cups
    'floor-l':[52,690,1], 'floor-r':[340,690,1] } };                                            // floor (y>520), in front of the counter
A.SCENES.burrow={ fn:'s_burrow2', indoor:true, lights:[[50,474,90],[82,250,90],[195,60,180],[336,474,60]],
  anchors:{ 'shelf-l1':[50,398,1], 'shelf-l2':[100,398,1], 'shelf-l3':[150,398,1],            // two wall shelves at y=398
    'shelf-r1':[246,398,1], 'shelf-r2':[292,398,1], 'shelf-r3':[338,398,1],
    'sill':[112,316,.9], 'desk-1':[104,520,1], 'desk-2':[142,520,.9],                            // window sill, desk top
    'floor-l':[70,700,1], 'floor-c':[195,742,1], 'floor-r':[250,690,1] } };                      // floor (fy=590), rug centre
// Review fix for the agent's market: its ground slots sat behind the stall's front layer. Move them in front of it.
const fixM=()=>{ const m=A.SCENES.market; if(!m){ setTimeout(fixM,60); return; } m.anchors['ground-l']=[60,700,1,'front']; m.anchors['ground-r']=[330,700,1,'front']; }; fixM();
})();

// ---------------------------------------------------------------- Round 7 additions
// Two new word props (umbrella, lantern), the café in three new looks (morning, rainy evening, First Cold Night),
// the market stall dressed for the rainy-season fair, the lantern square for the town goal, and the ready flag A.r7.
// Festival content is Natterwick's own (rainy-season fair, First Cold Night, end-of-year lights, the harbour festival):
// the spike's Tết and Mid-Autumn items are removed below.
(function boot(){
const A=window.YapArt;
if(!A||!A.K||!A.SCENES||!A.SCENES.cafe||!A.SCENES.market||!A.SCENES.market.anchors['ground-l']||A.SCENES.market.anchors['ground-l'][3]!=='front'
  ||!A.s_collect||!A.s_shelfcard||!A.WEAR||!A.wearRig||!A.fx35||!A.PROPS['pho-bowl']||!A.PROPS['laptop']||!A.PROPS['cactus']||!A.PROPS['teapot']){ setTimeout(boot,60); return; }
if(boot.done) return; boot.done=1;
const {C,R,El,Pg,Pd,S,L,spark,rnd,glint,vc}=A.K;
const glow=(ctx,x,y,r,col)=>{ ctx.save(); ctx.globalCompositeOperation='lighter'; const g=ctx.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,col); g.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=g; ctx.fillRect(x-r,y-r,2*r,2*r); ctx.restore(); };
const qy=(y0,sag,k)=>y0+4*k*(1-k)*sag;

// umbrella: open canopy with a scalloped hem, ink shaft and J handle. S box.
A.PROPS['umbrella']={ size:'S', word:'umbrella', variants:['butter','cyan','lilac','mint','coral'], draw(ctx,o){ const [m]=vc(o,'butter');
  L(ctx,[30,28,30,48],3.4); L(ctx,[30,48,30,55,23,55,23,50],3.2);
  S(ctx,Pd('M7 30 C7 13 53 13 53 30 Q45.5 25.5 38 30 Q30 25.5 22 30 Q14.5 25.5 7 30 Z'),m,{lw:3,sh:3});
  L(ctx,[30,14,24,20,22,30],2.2); L(ctx,[30,14,36,20,38,30],2.2); L(ctx,[30,14,30,8],3);
  glint(ctx,17,22,4,2.6,-0.6); } };

// lantern: a round paper lantern standing on its tassel; o.lit warms it. S box.
A.PROPS['lantern']={ size:'S', word:'lantern', variants:['butter','lilac','cyan','coral'], draw(ctx,o){ const [m]=vc(o,'butter');
  if (o.lit) glow(ctx,30,32,30,'rgba(255,205,120,.55)');
  L(ctx,[30,4,30,11],2.6);
  const body=Pd('M30 14 C46 14 50 24 50 32 C50 41 46 49 30 49 C14 49 10 41 10 32 C10 24 14 14 30 14 Z');
  S(ctx,body,o.lit?C.BU:m,{lw:3,sh:3});
  L(ctx,[24,15,15,32,24,48],2,'rgba(23,19,28,.35)'); L(ctx,[36,15,45,32,36,48],2,'rgba(23,19,28,.35)'); L(ctx,[30,15,30,48],2,'rgba(23,19,28,.35)');
  S(ctx,R(21,10,18,6,2),C.KR2,{sh:0,lw:2.4}); S(ctx,R(21,47,18,5,2),C.KR2,{sh:0,lw:2.4}); L(ctx,[30,53,30,55],2.6,C.CORAL);
  glint(ctx,19,24,4,2.6,-0.6); } };

// café looks: the same café, new glass and light. o.look = 'day' | 'morning' | 'rain' | 'coldnight'.
function cafe7(ctx,w,h,o){ if (o.layer==='front') return A.s_cafeFront(ctx,w,h,o);
  A.s_cafe(ctx,w,h,o); const look=o.look||'day', t=(o.t||0)/1000, wx=w/2-84, wy=84, win=R(wx,wy,168,160,[84,84,6,6]);
  if (look==='day') return;
  ctx.save(); ctx.clip(win);
  if (look==='morning'){ ctx.fillStyle='rgba(255,214,107,.3)'; ctx.fillRect(wx,wy,168,112); ctx.fillStyle=C.BU; ctx.beginPath(); ctx.arc(wx+40,wy+98,15,0,7); ctx.fill(); ctx.lineWidth=2.6; ctx.strokeStyle=C.INK; ctx.stroke(); }
  if (look==='rain'){ ctx.fillStyle='rgba(59,49,96,.55)'; ctx.fillRect(wx,wy,168,160); ctx.strokeStyle='rgba(207,240,253,.9)'; ctx.lineWidth=2; ctx.lineCap='round'; const r=rnd(5);
    for(let i=0;i<26;i++){ const x=wx+r()*168, y=wy+((r()*160+t*160)%160); ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x-3,y+11); ctx.stroke(); } }
  if (look==='coldnight'){ ctx.fillStyle=C.DUSK; ctx.fillRect(wx,wy,168,160); ctx.fillStyle='#FFF3C4'; ctx.beginPath(); ctx.arc(wx+122,wy+46,13,0,7); ctx.fill();
    const r=rnd(9); for(let i=0;i<9;i++) spark(ctx,wx+12+r()*144,wy+18+r()*80,2+r()*2.5,i%3?C.WH:C.BU); ctx.fillStyle='#3E3470'; ctx.fillRect(wx,wy+112,168,48); }
  ctx.restore();
  L(ctx,[wx+84,wy,wx+84,wy+160],3); L(ctx,[wx,wy+104,wx+168,wy+104],3); ctx.lineWidth=3.2; ctx.strokeStyle=C.INK; ctx.stroke(win); S(ctx,R(wx-12,wy+158,192,10,3),C.WH,{sh:3});
  if (look==='coldnight'){ const y0=262, sag=18; L(ctx,[6,y0,w/2,y0+2*sag,w-6,y0],2.4);
    for(let i=0;i<8;i++){ const k=(i+0.5)/8, x=6+(w-12)*k, y=qy(y0,sag,k), sw=Math.sin(t*1.4+i)*1.5;
      glow(ctx,x,y+15,26,'rgba(255,205,120,.4)'); L(ctx,[x,y,x+sw*0.3,y+6],2); S(ctx,El(x+sw*0.3,y+15,9,9),[C.BU,C.LIL2,C.BU,C.APRI][i%4],{sh:2,lw:2.4}); L(ctx,[x+sw*0.3-5,y+7,x+sw*0.3+5,y+7],2.2); } }
}
function cafeLight7(ctx,w,h,o){ const look=o.look||'day';
  if (look==='rain'){ ctx.fillStyle='rgba(110,130,170,.15)'; ctx.fillRect(0,0,w,h); glow(ctx,w*0.16,80,150,'rgba(255,190,120,.5)'); glow(ctx,w*0.84,90,150,'rgba(255,190,120,.5)'); glow(ctx,w/2,640,170,'rgba(255,215,160,.22)'); return; }
  if (look==='coldnight'){ ctx.fillStyle='rgba(28,20,52,.2)'; ctx.fillRect(0,0,w,h); glow(ctx,w*0.16,80,150,'rgba(255,190,120,.55)'); glow(ctx,w*0.84,90,150,'rgba(255,190,120,.55)'); glow(ctx,w/2,300,190,'rgba(255,205,140,.3)'); return; }
  ctx.fillStyle=look==='morning'?'rgba(255,170,130,.10)':'rgba(255,160,90,.13)'; ctx.fillRect(0,0,w,h);
  glow(ctx,w*0.16,90,140,look==='morning'?'rgba(255,214,150,.3)':'rgba(255,190,120,.45)'); glow(ctx,w*0.84,100,140,look==='morning'?'rgba(255,214,150,.3)':'rgba(255,190,120,.45)'); glow(ctx,w/2,170,160,'rgba(255,225,170,.35)'); }
A.SCENES.cafe7=Object.assign({},A.SCENES.cafe,{fn:'s_cafe7',light:cafeLight7,front:'s_cafeFront'});

// market stall at the rainy-season fair: bunting under the awning (o.fair) over any time of day; pass tod:'rain' for rain.
function market7(ctx,w,h,o){ A.s_market(ctx,w,h,o); if (o.layer==='front'||!o.fair) return; const t=(o.t||0)/1000, x0=24, x1=w-24, y0=188, sag=12;
  L(ctx,[x0,y0,w/2,y0+2*sag,x1,y0],2.4);
  for(let i=0;i<11;i++){ const k=(i+0.5)/11, x=x0+(x1-x0)*k, y=qy(y0,sag,k), sw=Math.sin(t*3+i)*1.5; S(ctx,Pg([x-8,y,x+8,y,x+sw,y+15]),[C.LIL,C.CY,C.BUT,C.MI][i%4],{sh:0,lw:2.2}); } }
A.SCENES.market7=Object.assign({},A.SCENES.market,{fn:'s_market7',front:'s_market7'});
// Call screens draw the critters between the back and the front, so each scene also comes without its front layer (…b),
// and the café front comes tinted to match the look.
A.SCENES.cafe7b=Object.assign({},A.SCENES.cafe7,{front:null}); A.SCENES.market7b=Object.assign({},A.SCENES.market7,{front:null});
function cafeFront7(ctx,w,h,o){ A.s_cafeFront(ctx,w,h,o); const k={rain:'rgba(110,130,170,.15)',coldnight:'rgba(28,20,52,.2)',morning:'rgba(255,170,130,.10)',day:'rgba(255,160,90,.13)'}[o.look||'day']; if (k){ ctx.fillStyle=k; ctx.fillRect(-10,408,w+20,114); } }

// the lantern square on First Cold Night: o.lit = share of the town's lanterns lit (0..1).
function lanternSq(ctx,w,h,o){ const t=(o.t||0)/1000, lit=o.lit==null?0.8:o.lit;
  ctx.fillStyle='#3E3470'; ctx.fillRect(0,0,w,h); const r=rnd(4); for(let i=0;i<30;i++) spark(ctx,r()*w,40+r()*170,1.6+r()*2.4,i%5?C.WH:C.BU);
  ctx.fillStyle='#FFF3C4'; ctx.beginPath(); ctx.arc(w-70,124,20,0,7); ctx.fill(); ctx.lineWidth=2.6; ctx.strokeStyle=C.INK; ctx.stroke();
  [[-10,340,90,140],[70,306,80,170],[140,326,110,150],[240,296,90,180],[320,320,90,155]].forEach(([x,y,bw,bh],i)=>{
    S(ctx,R(x,y,bw,bh+200,4),i%2?C.SLATE:C.DUSK,{sh:0,lw:2.6}); S(ctx,Pg([x-6,y+2,x+bw/2,y-bw*0.38,x+bw+6,y+2]),C.SLATE,{sh:0,lw:2.6});
    [0,1].forEach(j=>S(ctx,R(x+14+j*(bw-42),y+30,14,18,3),j===i%2?C.BU:C.PLUM,{sh:0,lw:2})); });
  ctx.fillStyle=C.PLUM; ctx.fillRect(0,560,w,h-560); L(ctx,[0,560,w,560],3); for(let y=594;y<h;y+=34) L(ctx,[0,y,w,y],2,'rgba(255,255,255,.08)');
  const rows=[[150,40],[230,34],[310,30],[390,26],[470,22]], tot=rows.length*9, on=Math.round(tot*lit); let n=0;
  rows.forEach(([y0,sag],ri)=>{ L(ctx,[-10,y0,w/2,y0+2*sag,w+10,y0],2,C.GR);
    for(let i=0;i<9;i++){ const k=(i+0.5)/9, x=-10+(w+20)*k, y=qy(y0,sag,k), isOn=n++<on, sw=Math.sin(t*1.5+i+ri)*1.6;
      if (isOn) glow(ctx,x,y+14,26,'rgba(255,205,120,.45)'); L(ctx,[x,y,x+sw*0.3,y+5],2,C.GR); S(ctx,El(x+sw*0.3,y+14,8,9),isOn?C.BU:C.PLUM,{sh:0,lw:2.2,ink:isOn?C.INK:C.GR}); } });
}

['banh-chung','li-xi','mooncake','star-lantern'].forEach(k=>{ delete A.PROPS[k]; }); delete A.WEAR['tet-top'];
Object.assign(A,{s_cafeFront7:cafeFront7,s_cafe7:cafe7,s_market7:market7,s_lanternSq:lanternSq}); A.r7=true;
})();
