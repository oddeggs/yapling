// Round 4 art: burrow v2, word-object families (jar / desk / plant / mail), party square, time-of-day pass, silhouettes, app icon.
(function boot(){
const A=window.YapArt; if(!A||!A.sticker){ setTimeout(boot,60); return; } if(boot.done) return; boot.done=1;
const INK='#17131C', LIL='#EFA3F4', LIL2='#F9DAFB', CY='#22BFF2', CY2='#CFF0FD', MI='#5FD98A', MI2='#D7F7E2', GR='#D3CCDC', WH='#FFFFFF', KR='#F2CFA8';
const R=(x,y,w,h,r)=>{ const p=new Path2D(); p.roundRect(x,y,w,h,r); return p; };
const El=(x,y,rx,ry)=>{ const p=new Path2D(); p.ellipse(x,y,rx,ry==null?rx:ry,0,0,Math.PI*2); return p; };
const Pg=a=>{ const p=new Path2D(); p.moveTo(a[0],a[1]); for(let i=2;i<a.length;i+=2) p.lineTo(a[i],a[i+1]); p.closePath(); return p; };
const Pd=d=>new Path2D(d);
function S(ctx,p,fill,o){ o=o||{}; const lw=o.lw!=null?o.lw:3, sh=o.sh!=null?o.sh:4, ink=o.ink||INK;
  if (sh){ ctx.save(); ctx.translate(sh*0.35,sh); ctx.fillStyle=o.shc||ink; ctx.fill(p); ctx.restore(); }
  if (fill){ ctx.fillStyle=fill; ctx.fill(p); } if (lw){ ctx.lineWidth=lw; ctx.lineJoin='round'; ctx.lineCap='round'; ctx.strokeStyle=ink; ctx.stroke(p); } }
const G=(ctx,p,fill)=>S(ctx,p,fill,{ink:GR,sh:0,lw:2.5});
function L(ctx,a,w,c,dash){ ctx.beginPath(); ctx.moveTo(a[0],a[1]); if(a.length===4) ctx.lineTo(a[2],a[3]); else if(a.length===6) ctx.quadraticCurveTo(a[2],a[3],a[4],a[5]); else ctx.bezierCurveTo(a[2],a[3],a[4],a[5],a[6],a[7]); ctx.lineWidth=w; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle=c||INK; if(dash) ctx.setLineDash(dash); ctx.stroke(); ctx.setLineDash([]); }
function spark(ctx,x,y,r,c){ const p=new Path2D(); p.moveTo(x,y-r); p.quadraticCurveTo(x,y,x+r,y); p.quadraticCurveTo(x,y,x,y+r); p.quadraticCurveTo(x,y,x-r,y); p.quadraticCurveTo(x,y,x,y-r); ctx.fillStyle=c; ctx.fill(p); }
const rnd=s=>()=>((s=(s*16807)%2147483647)/2147483647);
const dots=(ctx,x0,y0,x1,y1,a)=>{ ctx.fillStyle=`rgba(23,19,28,${a})`; for(let y=y0;y<y1;y+=18) for(let x=x0;x<x1;x+=18){ ctx.beginPath(); ctx.arc(x,y,1.3,0,7); ctx.fill(); } };
// growth: 0 sprout, 1 leaf, 2 bloom
function growth(ctx,x,y,st,t,s){ s=s||1; ctx.save(); ctx.translate(x,y); ctx.scale(s,s); ctx.rotate(Math.sin(t*1.7+x)*0.05);
  const top=[-11,-19,-27][st]; L(ctx,[0,0,2,top/2,0,top],4.5); L(ctx,[0,0,2,top/2,0,top],1.8,MI);
  const leaf=(lx,ly,r,k)=>{ ctx.save(); ctx.translate(lx,ly); ctx.rotate(r); ctx.scale(k,k); S(ctx,Pd('M0 0 C6 -8 18 -8 24 0 C18 6 6 6 0 0 Z'),MI,{sh:0,lw:2.6/k}); ctx.restore(); };
  if (st===0){ leaf(1,top+2,-0.7,.42); leaf(-1,top+2,Math.PI+0.7,.42); }
  if (st===1){ leaf(1,top*0.45,-0.25,.62); leaf(-1,top*0.45,Math.PI+0.25,.62); leaf(1,top+2,-0.8,.42); leaf(-1,top+2,Math.PI+0.8,.42); }
  if (st===2){ leaf(1,-6,-0.2,.6); leaf(-1,-12,Math.PI+0.2,.58);
    ctx.save(); ctx.translate(0,top-1); const pul=1+Math.sin(t*2.2)*0.04; ctx.scale(pul,pul);
    for(let i=0;i<5;i++){ const ang=-Math.PI/2+i*Math.PI*2/5; ctx.save(); ctx.rotate(ang); S(ctx,El(6.2,0,5.2,4.2),LIL,{sh:0,lw:1.9}); ctx.restore(); }
    S(ctx,El(0,0,3.6),'#FFD66B',{sh:0,lw:1.9}); ctx.restore(); }
  ctx.restore(); }
function obj(ctx,w,h,o){ const st=Math.max(0,Math.min(2,o.stage||0)), t=(o.t||0)/1000, f=o.fam||'jar'; ctx.scale(w/60,h/80);
  if (f==='jar'){ S(ctx,R(14,34,32,40,9),'rgba(207,240,253,.85)',{sh:3}); const lv=[0.3,0.6,0.9][st]; ctx.save(); ctx.clip(R(14,34,32,40,9)); ctx.fillStyle=o.fill||'#E0B07C'; ctx.fillRect(14,74-40*lv,32,40*lv); ctx.restore(); ctx.lineWidth=3; ctx.strokeStyle=INK; ctx.stroke(R(14,34,32,40,9));
    S(ctx,R(18,48,24,12,3),WH,{sh:0,lw:2.2}); S(ctx,R(12,27,36,9,3),o.lid||LIL,{sh:0,lw:2.6}); growth(ctx,30,27,st,t,.95); L(ctx,[20,40,20,66],3,'rgba(255,255,255,.7)'); }
  if (f==='desk'){ S(ctx,R(16,40,28,34,[3,3,9,9]),o.fill||CY,{sh:3}); L(ctx,[22,40,18,22],4); L(ctx,[22,40,18,22],2,'#FFD66B'); if(st>=1){ L(ctx,[38,40,42,24],4); L(ctx,[38,40,42,24],2,LIL); } growth(ctx,30,40,st,t,1.05); S(ctx,R(20,52,20,8,3),WH,{sh:0,lw:2}); }
  if (f==='plant'){ S(ctx,Pd('M14 48 L18 72 C19 75 21 76 24 76 L36 76 C39 76 41 75 42 72 L46 48 Z'),o.fill||WH,{sh:3}); S(ctx,R(12,44,36,8,4),o.lid||MI,{sh:0,lw:2.6}); growth(ctx,30,45,st,t,1.45); }
  if (f==='mail'){ L(ctx,[30,48,30,78],5); S(ctx,Pd('M8 48 L8 34 C8 20 52 20 52 34 L52 48 Z'),CY,{sh:3}); S(ctx,R(16,30,26,4,2),INK,{sh:0,lw:0});
    if (st>=1){ ctx.save(); ctx.translate(28,26); ctx.rotate(-0.25); S(ctx,R(-10,-10,22,15,2),WH,{sh:0,lw:2.2}); L(ctx,[-10,-10,1,-2,12,-10],2); ctx.restore(); }
    L(ctx,[52,40,58,40],3); L(ctx,[58,40,58,st?22:38],3); S(ctx,R(56,st?18:34,10,8,2),LIL,{sh:0,lw:2.2}); }
}
function burrow2(ctx,w,h,o){
  const t=(o.t||0)/1000, fy=590, sky=o.sky||CY2;
  const arch=Pd('M0 '+h+' L0 120 C0 44 70 22 '+w/2+' 22 C'+(w-70)+' 22 '+w+' 44 '+w+' 120 L'+w+' '+h+' Z');
  ctx.fillStyle=LIL2; ctx.fillRect(0,0,w,h); dots(ctx,8,8,w,140,.09);
  ctx.save(); ctx.clip(arch); ctx.fillStyle='#FFFDFE'; ctx.fillRect(0,0,w,h); dots(ctx,10,40,w,fy,.05);
  for(let i=0;i<11;i++){ const k=i/10, x=20+k*(w-40), y=44+Math.pow(Math.abs(k-.5)*2,2)*42; if(i){ const k0=(i-1)/10; L(ctx,[20+k0*(w-40),44+Math.pow(Math.abs(k0-.5)*2,2)*42,x,y],2); } S(ctx,El(x,y+7,4,5),i%2?LIL:CY,{sh:0,lw:2}); }
  const wd=Pd('M24 318 L24 254 A58 58 0 0 1 140 254 L140 318 Z'); ctx.fillStyle=sky; ctx.fill(wd);
  ctx.save(); ctx.clip(wd); if (o.tod==='night'){ ctx.fillStyle='#FFF3C4'; ctx.beginPath(); ctx.arc(108,240,11,0,7); ctx.fill(); [[40,230],[60,250],[124,270],[86,222]].forEach(([x,y])=>spark(ctx,x,y,3.5,WH)); } else { ctx.fillStyle=o.tod==='evening'?'#FFE0A8':WH; ctx.beginPath(); ctx.arc(108,o.tod==='morning'?280:240,12,0,7); ctx.fill(); }
    ctx.fillStyle=o.tod==='night'?'#3E3470':'#A8E4FA'; ctx.fillRect(24,290,116,30); if (o.tod==='rain'){ ctx.strokeStyle='rgba(34,191,242,.7)'; ctx.lineWidth=2; for(let i=0;i<14;i++){ const x=30+i*8, y=((i*37+t*260)%100)+200; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x-3,y+10); ctx.stroke(); } } ctx.restore();
  ctx.lineWidth=3.2; ctx.strokeStyle=INK; ctx.stroke(wd); L(ctx,[82,196,82,318],3); L(ctx,[24,268,140,268],3); S(ctx,R(14,316,136,10,3),WH,{sh:3});
  S(ctx,R(156,206,96,78,6),KR); G(ctx,R(162,212,84,66,4),'#F6DCBC');
  S(ctx,Pd('M176 236 C190 222 222 222 232 236 C240 250 224 266 204 266 C184 266 168 252 176 236 Z'),WH,{sh:0,lw:2.4}); L(ctx,[182,248,204,240,226,252],2,LIL,[4,4]);
  [[186,244,LIL],[214,238,CY],[222,258,MI]].forEach(([x,y,c])=>{ S(ctx,El(x,y,4.5),c,{sh:0,lw:2}); L(ctx,[x,y+4,x,y+10],2); });
  S(ctx,R(264,186,104,132,6),WH,{sh:5,lw:3.5}); S(ctx,R(274,196,84,112,3),LIL,{sh:0,lw:2.6});
  ctx.save(); ctx.translate(316,256); S(ctx,R(-26,-6,52,36,3),WH,{sh:0,lw:2.4}); S(ctx,Pg([-30,-4,0,-26,30,-4]),CY,{sh:0,lw:2.4}); S(ctx,R(-7,12,14,18,[7,7,0,0]),LIL2,{sh:0,lw:2}); ctx.restore();
  ctx.font='800 12px Lexend,sans-serif'; ctx.fillStyle=INK; ctx.textAlign='center'; ctx.fillText('SEASON 1',316,214); ctx.font='800 10px Lexend,sans-serif'; ctx.fillText('THE CAFÉ',316,226);
  S(ctx,R(14,398,170,9,3),WH,{sh:3}); L(ctx,[30,407,30,420],3); L(ctx,[168,407,168,420],3);
  S(ctx,R(208,398,166,9,3),WH,{sh:3}); L(ctx,[224,407,224,420],3); L(ctx,[358,407,358,420],3);
  ctx.fillStyle=LIL2; ctx.fillRect(0,fy,w,h-fy); L(ctx,[0,fy,w,fy],3); for(let y=fy+34;y<h;y+=34) L(ctx,[0,y,w,y],2,'rgba(23,19,28,.08)');
  S(ctx,R(10,520,160,12,4),WH,{sh:3}); S(ctx,R(20,532,8,58,2),WH,{sh:0,lw:2.6}); S(ctx,R(118,532,44,48,4),WH,{sh:0,lw:2.6}); S(ctx,R(130,548,20,5,2),INK,{sh:0,lw:0});
  L(ctx,[32,520,32,486],3); L(ctx,[32,486,46,472],3); S(ctx,Pg([40,470,62,462,66,480,48,486]),CY,{sh:0,lw:2.6});
  S(ctx,R(300,436,72,154,[36,36,2,2]),KR,{sh:0,lw:3.2}); S(ctx,El(336,474,12),CY2,{sh:0,lw:2.6}); S(ctx,El(358,520,3.5),INK,{sh:0,lw:0}); S(ctx,R(292,588,88,8,4),LIL,{sh:0,lw:2.6});
  const ry=742; S(ctx,El(w/2,ry,150,30),LIL,{sh:5}); ctx.lineWidth=2.4; ctx.strokeStyle=INK; ctx.setLineDash([6,7]); ctx.beginPath(); ctx.ellipse(w/2,ry,118,22,0,0,7); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore(); ctx.lineWidth=4; ctx.strokeStyle=INK; ctx.stroke(arch);
  post(ctx,w,h,o.tod,[[50,474,90],[82,250,90],[195,60,180],[336,474,60]],t,'in');
}
const TOD={morning:'rgba(255,170,130,.10)',afternoon:null,evening:'rgba(240,110,150,.15)',night:'rgba(28,20,52,.5)',rain:'rgba(110,130,170,.16)'};
function post(ctx,w,h,tod,lights,t,where){ if(!tod||!TOD[tod]) return; ctx.fillStyle=TOD[tod]; ctx.fillRect(0,0,w,h);
  if (tod==='night'||tod==='evening'||tod==='rain'){ ctx.save(); ctx.globalCompositeOperation='lighter'; const a=tod==='night'?.5:.28; lights.forEach(([x,y,r])=>{ const g=ctx.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,`rgba(255,205,150,${a})`); g.addColorStop(1,'rgba(255,205,150,0)'); ctx.fillStyle=g; ctx.fillRect(x-r,y-r,2*r,2*r); }); ctx.restore(); }
  if (tod==='rain' && where!=='in'){ ctx.strokeStyle='rgba(34,150,220,.5)'; ctx.lineWidth=2; ctx.lineCap='round'; const r=rnd(3); for(let i=0;i<80;i++){ const x=r()*w, y=(r()*h+t*380)%h; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x-4,y+14); ctx.stroke(); } }
  if (tod==='night' && where!=='in'){ const r=rnd(8); for(let i=0;i<24;i++){ spark(ctx,r()*w,60+r()*80,2+r()*3,i%4?WH:LIL); } ctx.fillStyle='#FFF3C4'; ctx.beginPath(); ctx.arc(320,90,16,0,7); ctx.fill(); }
}
function townT(ctx,w,h,o){ A.s_town(ctx,w,h,o); post(ctx,w,h,o.tod,[[78,250,60],[300,230,70],[86,490,70],[192,470,70],[297,490,60],[186,630,90]],(o.t||0)/1000,'out'); }
function mini(ctx,w,h,o){ ctx.scale(w/390,h/844); const fn=o.fn==='town'?townT:burrow2; fn(ctx,390,844,o); if (o.pip){ ctx.save(); ctx.translate(105,o.fn==='town'?560:497); A.s_critter(ctx,180,216,{sp:o.pip,mood:o.mood||'happy'}); ctx.restore(); } }
function square(ctx,w,h,o){ const t=(o.t||0)/1000;
  [[-10,190,80,LIL2],[66,170,70,CY2],[132,200,92,WH],[222,176,74,MI2],[292,192,104,LIL2]].forEach(([x,y,bw,c])=>{ G(ctx,R(x,y,bw,260,4),c); G(ctx,Pg([x-4,y,x+bw/2,y-30,x+bw+4,y]),WH); G(ctx,R(x+12,y+22,14,18,3),WH); G(ctx,R(x+bw-26,y+22,14,18,3),WH); });
  ctx.fillStyle=WH; ctx.fillRect(0,440,w,h-440); L(ctx,[0,440,w,440],3); dots(ctx,10,456,w,h,.07);
  S(ctx,El(w/2,610,230,92),LIL2,{sh:0,lw:3}); ctx.lineWidth=2.4; ctx.strokeStyle=INK; ctx.setLineDash([7,8]); ctx.beginPath(); ctx.ellipse(w/2,610,190,72,0,0,7); ctx.stroke(); ctx.setLineDash([]);
  S(ctx,El(w/2,588,58,20),CY2,{sh:4}); S(ctx,R(w/2-7,540,14,48,4),WH,{sh:0,lw:2.6}); S(ctx,El(w/2,540,24,8),CY2,{sh:0,lw:2.6});
  for(let i=0;i<6;i++){ const k=(t*1.2+i/6)%1, a=i*Math.PI/3; ctx.fillStyle=CY; ctx.beginPath(); ctx.arc(w/2+Math.cos(a)*k*26,536+k*k*40-k*16,2.6,0,7); ctx.fill(); }
  [[6,180],[384,180]].forEach(([x])=>{ L(ctx,[x,120,x,440],5); });
  [[118,26],[166,40],[214,26]].forEach(([y,sag],j)=>{ L(ctx,[6,y,w/2,y+sag*2,384,y],2.2); for(let i=1;i<14;i++){ const k=i/14, x=6+378*k, yy=(1-k)*(1-k)*y+2*k*(1-k)*(y+sag*2)+k*k*y, sw=Math.sin(t*2+i+j)*1.5; S(ctx,Pg([x-8,yy,x+8,yy,x+sw,yy+16]),[LIL,CY,MI,WH][(i+j)%4],{sh:0,lw:2}); } });
  [[34,300,LIL],[60,276,CY],[352,290,MI],[330,266,LIL]].forEach(([x,y,c],i)=>{ const b=Math.sin(t*1.4+i)*4; L(ctx,[x,y+b+22,x+4,y+b+60,x,440],2); S(ctx,El(x,y+b,16,20),c,{sh:3}); ctx.fillStyle='rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(x-5,y+b-7,4,6,-.4,0,7); ctx.fill(); });
}
function sil(ctx,w,h,o){ const m=ctx.getTransform(), d=m.a, W=Math.ceil(w*d), H=Math.ceil(h*d); const c=document.createElement('canvas'); c.width=W; c.height=H; const x=c.getContext('2d'); x.setTransform(d,0,0,d,0,0); A.critter(x,w,h,{sp:o.sp,mood:'happy',flat:true,noShadow:true,noFx:true}); x.setTransform(1,0,0,1,0,0); x.globalCompositeOperation='source-in'; x.fillStyle=o.color||INK; x.fillRect(0,0,W,H); ctx.save(); ctx.setTransform(1,0,0,1,m.e,m.f); ctx.drawImage(c,0,0); ctx.restore(); }
function icon(ctx,w,h,o){ ctx.beginPath(); ctx.rect(0,0,w,h); ctx.clip(); ctx.fillStyle=o.bg||LIL; ctx.fillRect(0,0,w,h); const k=w/60; ctx.fillStyle='rgba(23,19,28,.12)'; for(let y=k*4;y<h;y+=k*6) for(let x=k*4;x<w;x+=k*6){ ctx.beginPath(); ctx.arc(x,y,k*0.45,0,7); ctx.fill(); }
  ctx.save(); ctx.translate(0,h*0.1); A.s_face(ctx,w,h,{sp:o.sp||'redpanda',mood:o.mood||'happy',bg:'rgba(0,0,0,0)',zoom:0.78}); ctx.restore(); }
A.r4={obj,burrow2,townT,mini,square,sil,icon};
Object.assign(A,{s_obj:obj,s_burrow2:burrow2,s_townT:townT,s_mini:mini,s_square:square,s_sil:sil,s_icon:icon});
})();
