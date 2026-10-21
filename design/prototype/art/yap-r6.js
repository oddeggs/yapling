// Polish pass art: places with their own light. Harbour (breezy), street (move-in), warm café, crisp office.
(function boot(){
const A=window.YapArt; if(!A||!A.r5){ setTimeout(boot,60); return; } if(boot.done) return; boot.done=1;
const INK='#17131C', LIL='#EFA3F4', LIL2='#F9DAFB', CY='#22BFF2', CY2='#CFF0FD', MI='#5FD98A', MI2='#D7F7E2', WH='#FFFFFF', KR='#F2CFA8', GR='#D3CCDC', BU='#FFE48A';
const R=(x,y,w,h,r)=>{ const p=new Path2D(); p.roundRect(x,y,w,h,r); return p; };
const El=(x,y,rx,ry)=>{ const p=new Path2D(); p.ellipse(x,y,rx,ry==null?rx:ry,0,0,Math.PI*2); return p; };
const Pg=a=>{ const p=new Path2D(); p.moveTo(a[0],a[1]); for(let i=2;i<a.length;i+=2) p.lineTo(a[i],a[i+1]); p.closePath(); return p; };
function S(ctx,p,fill,o){ o=o||{}; const lw=o.lw!=null?o.lw:3, sh=o.sh!=null?o.sh:4, ink=o.ink||INK;
  if (sh){ ctx.save(); ctx.translate(sh*0.35,sh); ctx.fillStyle=ink; ctx.fill(p); ctx.restore(); }
  if (fill){ ctx.fillStyle=fill; ctx.fill(p); } if (lw){ ctx.lineWidth=lw; ctx.lineJoin='round'; ctx.lineCap='round'; ctx.strokeStyle=ink; ctx.stroke(p); } }
const G=(ctx,p,fill)=>S(ctx,p,fill,{ink:GR,sh:0,lw:2.5});
function L(ctx,a,w,c){ ctx.beginPath(); ctx.moveTo(a[0],a[1]); if(a.length===4) ctx.lineTo(a[2],a[3]); else ctx.quadraticCurveTo(a[2],a[3],a[4],a[5]); ctx.lineWidth=w; ctx.lineCap='round'; ctx.strokeStyle=c||INK; ctx.stroke(); }
function cloud(ctx,x,y,s){ const p=new Path2D(); p.moveTo(x-30*s,y+8*s); p.bezierCurveTo(x-42*s,y+8*s,x-40*s,y-12*s,x-24*s,y-10*s); p.bezierCurveTo(x-20*s,y-28*s,x+8*s,y-30*s,x+12*s,y-14*s); p.bezierCurveTo(x+30*s,y-20*s,x+42*s,y+8*s,x+28*s,y+8*s); p.closePath(); S(ctx,p,WH,{lw:2.6,sh:3}); }
function glow(ctx,x,y,r,col){ ctx.save(); ctx.globalCompositeOperation='lighter'; const g=ctx.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,col); g.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=g; ctx.fillRect(x-r,y-r,2*r,2*r); ctx.restore(); }
function harbour(ctx,w,h,o){ const t=(o.t||0)/1000, hz=o.horizon||360;
  ctx.fillStyle='#E4F7FE'; ctx.fillRect(0,0,w,hz); ctx.fillStyle='#F4FCFF'; ctx.fillRect(0,hz-90,w,90);
  ctx.fillStyle='rgba(255,236,170,.7)'; ctx.beginPath(); ctx.arc(300,150,34,0,7); ctx.fill(); ctx.lineWidth=3; ctx.strokeStyle=INK; ctx.stroke();
  [[40,110,1,8],[230,80,.8,5],[340,200,.6,11]].forEach(([x,y,s,v])=>{ cloud(ctx,((x+t*v)%(w+140))-70,y,s); });
  S(ctx,new Path2D(`M0 ${hz} C40 ${hz-40} 110 ${hz-54} 150 ${hz} Z`),MI2,{sh:0,lw:3});
  S(ctx,R(54,hz-120,18,74,[6,6,2,2]),WH,{sh:0}); ctx.fillStyle=LIL; ctx.fillRect(55.5,hz-100,15,9); ctx.fillRect(55.5,hz-78,15,9); S(ctx,Pg([50,hz-120,63,hz-136,76,hz-120]),LIL,{sh:0});
  const a=Math.sin(t*0.8)*0.5; ctx.save(); ctx.translate(63,hz-124); ctx.rotate(a); ctx.fillStyle='rgba(255,230,140,.35)'; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(160,-20); ctx.lineTo(160,20); ctx.fill(); ctx.restore();
  ctx.fillStyle='#A8E4FA'; ctx.fillRect(0,hz,w,h-hz); L(ctx,[0,hz,w,hz],3);
  for(let i=0;i<9;i++){ const y=hz+20+i*28, x=((i*71+t*14*(i%2?1:-1))%460+460)%460-40; ctx.lineWidth=2.4; ctx.strokeStyle=i%3?WH:CY; ctx.beginPath(); ctx.moveTo(x,y); ctx.quadraticCurveTo(x+10,y-6,x+20,y); ctx.quadraticCurveTo(x+30,y+6,x+40,y); ctx.stroke(); }
  const boat=(x,y,c,ph,s)=>{ const b=Math.sin(t*1.6+ph)*3; ctx.save(); ctx.translate(x,y+b); ctx.scale(s,s); ctx.rotate(Math.sin(t*1.1+ph)*0.05); S(ctx,Pg([-30,0,30,0,21,14,-21,14]),c,{lw:2.8,sh:3}); L(ctx,[12,0,12,-38],2.8); S(ctx,Pg([14,-36,34,-6,14,-6]),WH,{sh:0,lw:2.4}); ctx.save(); ctx.translate(12,-38); ctx.rotate(Math.sin(t*5+ph)*0.15); S(ctx,Pg([0,0,14,4,0,8]),c,{sh:0,lw:2}); ctx.restore(); ctx.restore(); };
  boat(250,hz+60,LIL,0,1); boat(110,hz+120,WH,1.3,.85); boat(330,hz+150,CY,2.6,.7);
  for(let i=0;i<3;i++){ const gx=((i*130+t*30)%(w+80))-40, gy=hz-160+i*40+Math.sin(t*2+i)*8, f=Math.sin(t*7+i)*4; L(ctx,[gx-9,gy+f*.3,gx-4,gy-5-f,gx,gy],2.6); L(ctx,[gx,gy,gx+4,gy-5-f,gx+9,gy+f*.3],2.6); }
  for(let i=0;i<5;i++){ const k=((t*0.35+i/5)%1), x=-60+k*520, y=120+i*70; ctx.globalAlpha=Math.sin(k*Math.PI)*.8; L(ctx,[x,y,x+30,y-6,x+60,y],2.4,WH); ctx.globalAlpha=1; }
  if (o.pier!==false){ const py=o.pierY||640; const deck=Pg([-20,h,w+20,h,w-40,py,40,py]); S(ctx,deck,KR,{sh:0,lw:3.2}); ctx.save(); ctx.clip(deck); for(let i=-6;i<=6;i++){ L(ctx,[w/2+i*18,py,w/2+i*60,h],2.2,'rgba(23,19,28,.25)'); } for(let y=py+30;y<h;y+=36) L(ctx,[0,y,w,y],2,'rgba(23,19,28,.12)'); ctx.restore();
    [[30,py-10],[w-30,py-10]].forEach(([x,y],i)=>{ S(ctx,R(x-8,y-60,16,90,4),'#E6BE93',{sh:3}); ctx.save(); ctx.translate(x,y-60); ctx.rotate(Math.sin(t*4+i)*0.08); S(ctx,Pg([0,0,i?-34:34,6,0,14]),i?CY:LIL,{sh:0,lw:2.4}); ctx.restore(); });
    L(ctx,[30,py-40,w/2,py-10,w-30,py-40],2.6); }
}
function street(ctx,w,h,o){ const t=(o.t||0)/1000;
  ctx.fillStyle='#F4FCFF'; ctx.fillRect(0,0,w,h); cloud(ctx,((60+t*6)%(w+140))-70,90,.8); cloud(ctx,((280+t*4)%(w+140))-70,60,.6);
  const house=(x,y,bw,bh,wall,roof,door)=>{ S(ctx,R(x,y,bw,bh,4),wall,{sh:5}); S(ctx,Pg([x-8,y+2,x+bw/2,y-bw*0.42,x+bw+8,y+2]),roof,{sh:4}); return {x,y,bw,bh}; };
  house(-30,220,120,300,LIL2,CY); house(270,200,150,320,MI2,LIL); S(ctx,R(312,244,56,62,6),CY2,{sh:0,lw:2.6}); S(ctx,R(24,324,56,62,6),CY2,{sh:0,lw:2.6});
  const hx=96, hy=170, hw=176, hh=350; S(ctx,R(hx,hy,hw,hh,6),WH,{sh:6,lw:3.4}); S(ctx,Pg([hx-12,hy+2,hx+hw/2,hy-80,hx+hw+12,hy+2]),'#FFE9C2',{sh:5,lw:3.4});
  S(ctx,El(hx+hw/2,hy-30,14),CY2,{sh:0,lw:2.6});
  [[hx+18,hy+40],[hx+hw-62,hy+40]].forEach(([x,y])=>{ S(ctx,R(x,y,44,52,6),CY2,{sh:0,lw:2.6}); L(ctx,[x+22,y,x+22,y+52],2.4); });
  S(ctx,R(hx+hw/2-34,hy+hh-130,68,130,[34,34,0,0]),'#5B4A8C',{sh:0,lw:3}); ctx.fillStyle='rgba(255,230,160,.9)'; ctx.beginPath(); ctx.roundRect(hx+hw/2-28,hy+hh-124,56,124,[28,28,0,0]); ctx.fill();
  S(ctx,R(hx+hw/2-52,hy+hh-4,104,10,3),LIL,{sh:0,lw:2.4});
  ctx.fillStyle=WH; ctx.fillRect(0,520,w,60); L(ctx,[0,520,w,520],3); L(ctx,[0,580,w,580],3); ctx.fillStyle='#E8E4EE'; ctx.fillRect(0,580,w,h-580); for(let x=-20;x<w;x+=60) L(ctx,[x,700,x+30,700],4,WH);
  S(ctx,R(90,300,6,220,3),INK,{sh:0,lw:0}); S(ctx,R(80,286,26,20,6),BU,{sh:0,lw:2.6});
  [[40,486,KR],[64,494,'#E6BE93'],[300,480,KR]].forEach(([x,y,c])=>{ S(ctx,R(x,y,36,32,3),c,{sh:3}); ctx.fillStyle=WH; ctx.fillRect(x+13,y+1.5,10,14); });
  const vx=o.vanX!=null?o.vanX:Math.min(230,-260+((t*120)%900)), vy=652, b=Math.abs(Math.sin(t*9))*-1.5;
  ctx.save(); ctx.translate(vx,vy+b); ctx.scale(.8,.8);
  S(ctx,R(-150,-110,210,120,14),WH,{sh:6,lw:3.4}); S(ctx,R(60,-80,80,90,[8,26,8,8]),LIL,{sh:6,lw:3.4}); S(ctx,R(78,-66,46,34,6),CY2,{sh:0,lw:2.6});
  ctx.font='800 22px Lexend,sans-serif'; ctx.fillStyle=INK; ctx.textAlign='center'; ctx.fillText('MOVING DAY',-45,-48); S(ctx,R(-130,-34,170,10,5),LIL,{sh:0,lw:2.2});
  [[-100,14],[100,14]].forEach(([x,y])=>{ S(ctx,El(x,y,24),INK,{sh:0,lw:0}); S(ctx,El(x,y,10),'#D3CCDC',{sh:0,lw:2}); });
  ctx.restore();
}
function cafeWarm(ctx,w,h,o){ A.s_cafe(ctx,w,h,o); ctx.fillStyle='rgba(255,160,90,.13)'; ctx.fillRect(0,0,w,h); glow(ctx,w*0.16,90,140,'rgba(255,190,120,.45)'); glow(ctx,w*0.84,100,140,'rgba(255,190,120,.45)'); glow(ctx,w/2,170,160,'rgba(255,225,170,.35)'); }
function officeCrisp(ctx,w,h,o){ if(o.layer==='front') return A.s_office(ctx,w,h,o); ctx.fillStyle='#F2FAFF'; ctx.fillRect(0,0,w,h); for(let x=0;x<w;x+=26) L(ctx,[x,0,x,510],1,'rgba(34,191,242,.12)'); A.s_office(ctx,w,h,o);
  ctx.save(); ctx.globalAlpha=.45; ctx.fillStyle=WH; ctx.beginPath(); ctx.moveTo(222,88); ctx.lineTo(362,88); ctx.lineTo(260,520); ctx.lineTo(80,520); ctx.closePath(); ctx.fill(); ctx.restore(); }
Object.assign(A,{s_harbour:harbour,s_street:street,s_cafeWarm:cafeWarm,s_officeCrisp:officeCrisp}); A.r6=true;
})();
