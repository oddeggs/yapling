// Spike: collectible rarity as a die-cut sticker around any catalogue prop, built the way yap-sticker's
// outline() builds the critter outline (silhouette copies on offscreen canvases), so it costs no new art per prop.
//   s_collect(ctx, w, h, { id, v, rarity: 'common'|'rare'|'limited', season })
//   common  : white die-cut rim + ink edge + flat shadow (a plain sticker)
//   rare    : foil rim (diagonal lilac/cyan/mint/butter bands) + 3 sparkles
//   limited : butter (gold) rim, warm 'lighter' glow behind (as the night jar), and a coral season tag (lantern / blossom)
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
    if ((o.season||'tet')==='mid-autumn'){ S(ctx,Pd('M0 -6 L1.8 -1.8 L6 -1.6 L2.6 1.2 L3.8 5.4 L0 3 L-3.8 5.4 L-2.6 1.2 L-6 -1.6 L-1.8 -1.8 Z'),C.BUT,{sh:0,lw:1.4}); }
    else { for(let p=0;p<5;p++){ const an=p*Math.PI*2/5-Math.PI/2; S(ctx,El(Math.cos(an)*3,Math.sin(an)*3-1,2.4),C.BUT,{sh:0,lw:1.2}); } } }
  ctx.restore();
}
A.s_collect=collect;
})();
