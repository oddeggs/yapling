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
