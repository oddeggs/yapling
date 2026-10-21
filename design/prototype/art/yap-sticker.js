// Yapling "sticker" art direction: ink outlines, hard drop shadows, flat pastel fills (lilac / cyan / mint) on paper.
// Characters reuse the cast rig (flat mode) and get a silhouette outline + hard shadow.
(function boot(){
const A = window.YapArt; if(!A||!A._||!A.faceGeo){ setTimeout(boot,60); return; } if(boot.done) return; boot.done=1;
const INK='#17131C', LIL='#EFA3F4', LIL2='#F9DAFB', CY='#22BFF2', CY2='#CFF0FD', MI='#5FD98A', MI2='#D7F7E2', GR='#D3CCDC', WH='#FFFFFF';
const PAL = { redpanda:{b:'#FF8D6B',s:'#EC7350',d:'#3B2633',p:'#3B2633',bel:'#3B2633'}, capybara:{b:'#DDAA7C',s:'#C8925F',l:'#F2CFA8',ls:'#E6BE93'},
  cat:{b:'#BBA8EE',s:'#A18DDC',d:'#5B4A8C',n:'#F48FB6'}, otter:{b:'#B9875F',s:'#A07048'}, tiger:{b:'#FFAA4C',s:'#F08F2C',d:INK},
  bulldog:{b:'#F3C690',s:'#DEAA6E'}, bison:{b:'#8E654A',s:'#77523A'}, tarsier:{b:'#D4BFA4',s:'#BCA587',iris:CY}, koala:{b:'#A9C6DE',s:'#8FB0CC',d:'#4C6680'}, raccoon:{b:'#B3B9C4',s:'#99A0AC',d:'#3A3540'}, pangolin:{b:'#D9A877',s:'#C08F5E',l:'#FFF1DE',ls:'#F2DDC1'} };
const pool={};
function buf(k,w,h){ let c=pool[k]; if(!c) c=pool[k]=document.createElement('canvas'); if(c.width!==w||c.height!==h){ c.width=w; c.height=h; } return c; }
function outline(ctx,w,h,o,draw){
  const m=ctx.getTransform(), d=m.a, W=Math.max(1,Math.ceil(w*d)), H=Math.max(1,Math.ceil(h*d));
  const a=buf('a',W,H), b=buf('b',W,H), ax=a.getContext('2d'), bx=b.getContext('2d');
  ax.setTransform(1,0,0,1,0,0); ax.clearRect(0,0,W,H); ax.setTransform(d,0,0,d,0,0); draw(ax);
  bx.setTransform(1,0,0,1,0,0); bx.globalCompositeOperation='source-over'; bx.clearRect(0,0,W,H); bx.drawImage(a,0,0); bx.globalCompositeOperation='source-in'; bx.fillStyle=INK; bx.fillRect(0,0,W,H); bx.globalCompositeOperation='source-over';
  const k=o.k||w/200, r=Math.max(1.4,3.2*k)*d, sh=(o.sh!=null?o.sh:Math.max(2,5*k))*d;
  ctx.save(); ctx.setTransform(1,0,0,1,m.e,m.f);
  if (o.ground){ ctx.fillStyle='rgba(23,19,28,.12)'; ctx.beginPath(); ctx.ellipse(W/2,H*0.94,W*0.3,Math.max(2,H*0.022),0,0,Math.PI*2); ctx.fill(); }
  if (sh) for(let i=0;i<12;i++){ const t=i/12*Math.PI*2; ctx.drawImage(b,Math.cos(t)*r+sh*0.35,Math.sin(t)*r+sh); }
  for(let i=0;i<12;i++){ const t=i/12*Math.PI*2; ctx.drawImage(b,Math.cos(t)*r,Math.sin(t)*r); }
  ctx.drawImage(a,0,0); ctx.restore();
}
const pal=o=>Object.assign({},PAL[o.sp]||{},o.pal||{});
function stk(ctx,w,h,o){ outline(ctx,w,h,{ground:!o.noShadow},x=>A.critter(x,w,h,Object.assign({},o,{flat:true,noShadow:true,pal:pal(o)}))); }
function stkFace(ctx,w,h,o){ const G=A.faceGeo(o.sp), k=w/138/G.sz*(o.zoom||1);
  ctx.fillStyle=o.bg||LIL2; ctx.fillRect(0,0,w,h); ctx.translate(w/2-100*k, h*0.5-G.fy*k); outline(ctx,200*k,240*k,{sh:0,k:k*0.8},x=>A.critter(x,200*k,240*k,Object.assign({},o,{flat:true,noShadow:true,noFx:true,pal:pal(o)}))); }
// primitives
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
function cloud(ctx,x,y,s){ const p=new Path2D(); p.moveTo(x-30*s,y+8*s); p.bezierCurveTo(x-42*s,y+8*s,x-40*s,y-12*s,x-24*s,y-10*s); p.bezierCurveTo(x-20*s,y-28*s,x+8*s,y-30*s,x+12*s,y-14*s); p.bezierCurveTo(x+30*s,y-20*s,x+42*s,y+8*s,x+28*s,y+8*s); p.closePath(); S(ctx,p,WH,{lw:2.6,sh:3}); }
function tree(ctx,x,y,s,c){ S(ctx,R(x-3*s,y,6*s,14*s,2*s),'#C99A6E',{lw:2.4,sh:0}); S(ctx,El(x,y-8*s,15*s,14*s),c||MI,{lw:2.8,sh:3}); ctx.fillStyle='rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(x-5*s,y-13*s,4*s,3*s,-.5,0,Math.PI*2); ctx.fill(); }
function house(ctx,x,y,w,h,wall,roof,o){ o=o||{}; S(ctx,R(x,y,w,h,4),wall); S(ctx,Pg([x-6,y+2,x+w/2,y-h*0.62,x+w+6,y+2]),roof);
  S(ctx,R(x+w/2-7,y+h-18,14,18,[7,7,0,0]),o.door||LIL,{sh:0,lw:2.4}); if (w>=40){ S(ctx,R(x+6,y+8,11,11,3),CY2,{sh:0,lw:2.2}); S(ctx,R(x+w-17,y+8,11,11,3),CY2,{sh:0,lw:2.2}); } }
function boat(ctx,x,y,c,t,ph,s){ s=s||1; const b=Math.sin(t*1.6+ph)*2.5; ctx.save(); ctx.translate(x,y+b); ctx.scale(s,s); ctx.rotate(Math.sin(t*1.2+ph)*0.05);
  S(ctx,Pg([-26,0,26,0,18,12,-18,12]),c,{lw:2.6,sh:3}); L(ctx,[10,0,10,-32],2.6); S(ctx,Pg([12,-30,28,-5,12,-5]),WH,{lw:2.4,sh:0}); ctx.restore(); }
function van(ctx,x,y,t){ ctx.save(); ctx.translate(x,y+Math.abs(Math.sin(t*8))*-1.2);
  S(ctx,R(-44,-30,62,46,8),WH); S(ctx,R(18,-14,26,30,[4,12,6,4]),LIL); S(ctx,R(24,-9,14,10,3),CY2,{sh:0,lw:2.2});
  S(ctx,R(-36,-42,22,12,3),'#F2CFA8',{sh:0,lw:2.2}); S(ctx,R(-12,-46,18,16,3),'#E6BE93',{sh:0,lw:2.2});
  ctx.font='800 10px Lexend,ui-rounded,sans-serif'; ctx.fillStyle=INK; ctx.textAlign='center'; ctx.fillText('MOVING',-13,-4);
  [[-26,18],[28,18]].forEach(([wx,wy])=>{ S(ctx,El(wx,wy,8.5),INK,{sh:0,lw:0}); ctx.fillStyle=WH; ctx.beginPath(); ctx.arc(wx,wy,3,0,7); ctx.fill(); }); ctx.restore(); }
function balloon(ctx,x,y,t,sp){ const b=Math.sin(t*0.9)*5; ctx.save(); ctx.translate(x,y+b);
  L(ctx,[-16,40,-11,62],2.2); L(ctx,[16,40,11,62],2.2);
  S(ctx,El(0,0,40,46),WH); ctx.save(); ctx.clip(El(0,0,40,46)); [-24,0,24].forEach((xx,i)=>{ ctx.fillStyle=i===1?LIL:CY2; ctx.beginPath(); ctx.ellipse(xx,0,9,48,0,0,7); ctx.fill(); }); ctx.restore(); ctx.lineWidth=3; ctx.strokeStyle=INK; ctx.stroke(El(0,0,40,46));
  if (sp){ ctx.save(); ctx.translate(-17,40); stkFace(ctx,34,34,{sp,mood:'excited',bg:'rgba(0,0,0,0)'}); ctx.restore(); }
  S(ctx,R(-15,60,30,20,[3,3,7,7]),'#E6BE93'); ctx.restore(); }
const PLACES = { burrow:[78,228,'Burrow',null], inn:[300,196,'Inn','koala'], bus:[338,316,'Bus stop','bulldog'], cafe:[84,436,'Café','otter'],
  office:[150,398,'Office','tarsier'], interview:[296,430,'Interview room','bison'], market:[316,578,'Market','tiger'], square:[180,586,'Town square',null] };
const ISLAND='M44 150 C130 122 262 132 348 152 C388 162 386 226 374 300 C364 380 386 470 372 560 C362 640 334 690 252 702 C172 714 82 708 42 682 C12 662 14 600 20 520 C26 440 8 360 16 280 C20 210 12 166 44 150 Z';
function town(ctx,w,h,o){
  const t=(o.t||0)/1000;
  [[60,82,1,6],[250,64,.8,4],[330,118,.6,9]].forEach(([x,y,s,v])=>{ const dx=((x+t*v)%(w+140))-70; cloud(ctx,dx,y,s); });
  if (o.balloon) balloon(ctx,o.balloon[0],o.balloon[1],t,o.balloonSp);
  for(let i=0;i<7;i++){ const y=740+i*14, x=((i*67)%320)+Math.sin(t*0.8+i)*10; L(ctx,[x,y,x+10,y-5,x+20,y,],2.4,CY); L(ctx,[x+20,y,x+30,y+5,x+40,y],2.4,CY); }
  boat(ctx,70,770,LIL,t,0); boat(ctx,300,786,CY2,t,1.7); boat(ctx,200,816,WH,t,3.1,.8);
  const I=Pd(ISLAND); S(ctx,I,WH,{lw:3.5,sh:7});
  ctx.save(); ctx.clip(I); ctx.fillStyle='rgba(23,19,28,.07)'; for(let y=150;y<720;y+=18) for(let x=10;x<390;x+=18){ ctx.beginPath(); ctx.arc(x,y,1.3,0,7); ctx.fill(); }
  ctx.fillStyle=MI2; [[60,300,70,40],[320,520,60,46],[110,640,80,40]].forEach(([x,y,rx,ry])=>{ ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,7); ctx.fill(); }); ctx.restore();
  const road=[18,344,120,300,250,380,378,330];
  L(ctx,road,22,INK); L(ctx,road,16,LIL2); L(ctx,road,2.5,WH,[8,8]);
  const lane=[196,350,170,440,214,520,186,600]; L(ctx,lane,20,INK); L(ctx,lane,14,LIL2);
  L(ctx,[78,256,82,280,92,312],14,INK); L(ctx,[78,256,82,280,92,312],8,LIL2);
  S(ctx,R(346,150,16,52,[6,6,2,2]),WH); ctx.fillStyle=LIL; ctx.fillRect(347.5,164,13,8); ctx.fillRect(347.5,182,13,8); ctx.lineWidth=3; ctx.strokeStyle=INK; ctx.strokeRect(347.5,164,13,8); ctx.strokeRect(347.5,182,13,8); S(ctx,R(342,138,24,14,4),CY2); S(ctx,Pg([340,138,354,124,368,138]),LIL);
  S(ctx,Pd('M30 262 C30 212 128 212 128 262 Z'),MI2); S(ctx,El(78,250,15),LIL,{sh:0}); ctx.fillStyle=INK; ctx.beginPath(); ctx.arc(84,252,2,0,7); ctx.fill(); S(ctx,El(108,244,6),CY2,{sh:0,lw:2.4}); L(ctx,[44,232,44,206],2.6); S(ctx,Pg([44,206,60,212,44,218]),CY,{sh:0,lw:2.4});
  house(ctx,150,232,40,34,WH,LIL); house(ctx,206,224,44,40,WH,CY2,{door:MI});
  house(ctx,270,206,62,54,WH,CY,{door:LIL}); L(ctx,[340,226,352,226],2.6); S(ctx,R(342,228,22,14,4),LIL,{sh:2,lw:2.4});
  tree(ctx,134,292,1); tree(ctx,262,300,.9); tree(ctx,40,330,1.1); tree(ctx,368,268,.8);
  const vx=o.vanX!=null?o.vanX:(((t*30)%(w+200))-100); const vy=(()=>{ const k=Math.max(0,Math.min(1,(vx-18)/360)); const u=1-k; return u*u*u*344+3*u*u*k*300+3*u*k*k*380+k*k*k*330; })(); van(ctx,vx,vy-6,t);
  L(ctx,[338,330,338,362],3); S(ctx,El(338,322,10),LIL,{sh:2}); ctx.font='800 9px Lexend,sans-serif'; ctx.fillStyle=INK; ctx.textAlign='center'; ctx.fillText('45',338,325.5);
  S(ctx,R(36,456,100,64,6),WH); S(ctx,Pg([30,458,86,424,142,458]),LIL2);
  for(let i=0;i<5;i++){ const x=34+i*20.8; ctx.fillStyle=i%2?WH:LIL; ctx.beginPath(); ctx.moveTo(x,458); ctx.lineTo(x+20.8,458); ctx.lineTo(x+20.8,470); ctx.quadraticCurveTo(x+10.4,478,x,470); ctx.closePath(); ctx.fill(); ctx.lineWidth=2.4; ctx.strokeStyle=INK; ctx.stroke(); }
  S(ctx,R(78,496,16,24,[8,8,0,0]),CY2,{sh:0,lw:2.4}); S(ctx,R(46,486,22,16,3),CY2,{sh:0,lw:2.2}); S(ctx,R(104,486,22,16,3),CY2,{sh:0,lw:2.2});
  S(ctx,R(160,420,64,100,6),CY2); for(let r=0;r<4;r++) for(let q=0;q<3;q++) S(ctx,R(168+q*18,430+r*19,11,11,3),(r*3+q)%4===1?LIL:WH,{sh:0,lw:2});
  S(ctx,R(262,440,70,110,6),WH); S(ctx,Pg([258,442,297,410,336,442]),LIL); S(ctx,El(297,464,13),CY2,{sh:0,lw:2.6}); L(ctx,[297,464,297,456],2.6); L(ctx,[297,464,303,467],2.6);
  for(let r=0;r<2;r++) for(let q=0;q<3;q++) S(ctx,R(272+q*19,486+r*22,12,13,3),(r+q)%2?LIL2:CY2,{sh:0,lw:2}); S(ctx,R(289,530,16,20,[8,8,0,0]),INK,{sh:0,lw:0});
  L(ctx,[297,410,297,390],2.6); S(ctx,Pg([297,390,316+Math.sin(t*3)*2,395,297,400]),MI,{sh:0,lw:2.2});
  tree(ctx,146,548,1.1); tree(ctx,240,560,1); tree(ctx,358,396,1);
  S(ctx,El(186,630,96,40),LIL2,{sh:0,lw:3}); S(ctx,El(186,632,30,12),CY2,{sh:3}); S(ctx,R(182,606,8,24,3),WH,{sh:0,lw:2.4}); S(ctx,El(186,606,13,5),CY2,{sh:0,lw:2.4});
  for(let i=0;i<4;i++){ const k=(t*1.2+i/4)%1, a=i*Math.PI/2+0.4; ctx.fillStyle=CY; ctx.beginPath(); ctx.arc(186+Math.cos(a)*k*16,604+k*k*24-k*10,2.2,0,7); ctx.fill(); }
  L(ctx,[102,566,190,592,270,566],2.2); for(let i=1;i<9;i++){ const k=i/9, x=102+168*k, y=(1-k)*(1-k)*566+2*k*(1-k)*592+k*k*566; S(ctx,Pg([x-5,y,x+5,y,x,y+11]),[LIL,CY,MI,WH][i%4],{sh:0,lw:2}); }
  L(ctx,[102,566,102,610],2.6); L(ctx,[270,566,270,610],2.6);
  [[296,604,MI],[336,624,LIL]].forEach(([x,y,c])=>{ S(ctx,R(x,y,36,22,3),WH); L(ctx,[x+3,y,x+3,y-14],2.4); L(ctx,[x+33,y,x+33,y-14],2.4); S(ctx,Pg([x-5,y-12,x+41,y-12,x+35,y-24,x+1,y-24]),c,{sh:2}); [0,1,2].forEach(k=>S(ctx,El(x+9+k*9,y+8,3.5),k%2?LIL:MI,{sh:0,lw:1.8})); });
  house(ctx,30,600,50,42,WH,CY2,{door:LIL}); tree(ctx,110,676,1); tree(ctx,260,684,.9);
  S(ctx,R(160,700,10,66,2),'#E6BE93',{sh:0,lw:2.6}); S(ctx,R(150,712,30,6,2),'#E6BE93',{sh:0,lw:2.2});
}
function cafe(ctx,w,h,o){
  const t=(o.t||0)/1000;
  const wx=w/2-84, wy=84;
  S(ctx,R(wx,wy,168,160,[84,84,6,6]),CY2,{lw:3.2,sh:0}); ctx.save(); ctx.clip(R(wx,wy,168,160,[84,84,6,6])); ctx.fillStyle=WH; ctx.beginPath(); ctx.ellipse(wx+120,wy+56,14,14,0,0,7); ctx.fill(); ctx.fillStyle='#A8E4FA'; ctx.fillRect(wx,wy+112,168,48); boat(ctx,wx+60,wy+124,LIL,t,0,.7); ctx.restore();
  L(ctx,[wx+84,wy,wx+84,wy+160],3); L(ctx,[wx,wy+104,wx+168,wy+104],3); S(ctx,R(wx-12,wy+158,192,10,3),WH,{sh:3});
  S(ctx,R(16,98,80,108,6),'#2E2740',{sh:4}); ctx.strokeStyle=WH; ctx.lineWidth=2.5; ctx.lineCap='round'; ctx.beginPath(); ctx.roundRect(32,114,24,20,[2,2,8,8]); ctx.stroke(); ctx.beginPath(); ctx.arc(58,122,5,-1.4,1.4); ctx.stroke();
  [[32,150,40],[32,162,30],[32,174,36],[32,186,22]].forEach(([x,y,l])=>L(ctx,[x,y,x+l,y],2.4,'rgba(255,255,255,.8)')); spark(ctx,76,150,5,LIL); spark(ctx,66,186,4,CY);
  [[w*0.16,0],[w*0.84,1]].forEach(([x,i])=>{ L(ctx,[x,0,x,42+i*12],2.4); S(ctx,Pd(`M${x-20} ${62+i*12} C${x-20} ${40+i*12} ${x+20} ${40+i*12} ${x+20} ${62+i*12} Z`),i?CY:LIL,{sh:3}); });
  [[300,124],[300,180]].forEach(([x,y])=>G(ctx,R(x,y,80,6,2),WH));
  [[LIL,304,124,18,26],[CY2,328,124,16,20],[MI2,350,124,22,30],[WH,306,180,20,22],[LIL2,332,180,14,28],[CY2,352,180,22,18]].forEach(([c,x,y,bw,bh])=>G(ctx,R(x,y-bh,bw,bh,[4,4,3,3]),c));
  G(ctx,R(-10,410,w+20,110,0),WH); L(ctx,[-10,410,w+10,410],3);
  for(let x=24;x<w;x+=34) L(ctx,[x,420,x,512],2,GR);
  S(ctx,R(20,350,112,58,[10,10,0,0]),'rgba(255,255,255,.65)',{sh:0,lw:3}); [[40,372,'#FFC27A'],[64,372,LIL],[88,370,'#FFC27A'],[110,372,CY2],[50,396,'#F5B38A'],[78,396,LIL2],[104,396,'#FFC27A']].forEach(([x,y,c])=>S(ctx,El(x,y,9.5,6),c,{sh:0,lw:2.2}));
  S(ctx,R(284,334,80,72,12),WH); S(ctx,R(300,358,48,22,6),INK,{sh:0,lw:0}); S(ctx,El(352,350,4),LIL,{sh:0,lw:2}); S(ctx,R(312,388,24,14,[2,2,6,6]),LIL2,{sh:0,lw:2.4});
  for(let k=0;k<2;k++){ const ph=t*1.6+k; ctx.globalAlpha=.4+.5*Math.sin(ph); L(ctx,[316+k*12,326,310+k*12,314,318+k*12,302],2.6,GR); } ctx.globalAlpha=1;
  ctx.fillStyle=LIL2; ctx.fillRect(0,520,w,h-520); L(ctx,[0,520,w,520],3);
  S(ctx,El(w/2,h*0.885,168,34),WH,{lw:3.2,sh:8}); S(ctx,R(w/2-6,h*0.92,12,80,3),WH,{sh:0});
  [[w*0.3,h*0.87,WH],[w*0.7,h*0.87,LIL]].forEach(([x,y,c],i)=>{ S(ctx,El(x,y+14,22,6),WH,{sh:0,lw:2.4}); S(ctx,R(x-14,y-8,28,22,[3,3,10,10]),c,{sh:2}); ctx.lineWidth=3; ctx.strokeStyle=INK; ctx.beginPath(); ctx.arc(x+16,y+2,6,-1.2,1.2); ctx.stroke();
    for(let k=0;k<2;k++){ const ph=t*2+k*1.6+i; ctx.globalAlpha=.5+.5*Math.sin(ph); L(ctx,[x-4+k*8,y-14,x-10+k*8,y-24,x-3+k*8,y-36],2.4,GR); } ctx.globalAlpha=1; });
  S(ctx,El(w/2,h*0.878,28,8),WH,{sh:0,lw:2.4}); S(ctx,R(w/2-20,h*0.862,18,13,4),'#FFC27A',{sh:0,lw:2.2}); S(ctx,R(w/2+2,h*0.864,18,13,4),'#FFC27A',{sh:0,lw:2.2});
}
function burrow(ctx,w,h,o){
  const t=(o.t||0)/1000, sy=o.shelfY||292, fy=h*0.68;
  const arch=Pd('M0 '+h+' L0 120 C0 44 70 22 '+w/2+' 22 C'+(w-70)+' 22 '+w+' 44 '+w+' 120 L'+w+' '+h+' Z');
  ctx.save(); ctx.fillStyle=LIL2; ctx.fillRect(0,0,w,h); ctx.fillStyle='rgba(23,19,28,.09)'; for(let y=8;y<120;y+=16) for(let x=8;x<w;x+=16){ ctx.beginPath(); ctx.arc(x,y,1.4,0,7); ctx.fill(); } ctx.restore();
  ctx.save(); ctx.clip(arch); ctx.fillStyle='#FFFDFE'; ctx.fillRect(0,0,w,h); ctx.fillStyle='rgba(23,19,28,.05)'; for(let y=40;y<fy;y+=18) for(let x=10;x<w;x+=18){ ctx.beginPath(); ctx.arc(x,y,1.2,0,7); ctx.fill(); }
    const wx=30, wy=74, ww=132, wh=136, wd=Pd('M'+wx+' '+(wy+wh)+' L'+wx+' '+(wy+ww/2)+' A'+ww/2+' '+ww/2+' 0 0 1 '+(wx+ww)+' '+(wy+ww/2)+' L'+(wx+ww)+' '+(wy+wh)+' Z');
    ctx.fillStyle=CY2; ctx.fill(wd); ctx.save(); ctx.clip(wd); ctx.fillStyle=WH; ctx.beginPath(); ctx.arc(wx+94,wy+40,13,0,7); ctx.fill(); ctx.fillStyle='#A8E4FA'; ctx.fillRect(wx,wy+104,ww,40); boat(ctx,wx+70,wy+114,LIL,t,0,.6); ctx.restore();
    ctx.lineWidth=3.2; ctx.strokeStyle=INK; ctx.stroke(wd); L(ctx,[wx+ww/2,wy,wx+ww/2,wy+wh],3); L(ctx,[wx,wy+90,wx+ww,wy+90],3); S(ctx,R(wx-12,wy+wh-2,ww+24,10,3),WH,{sh:3});
    [[wx+8,LIL],[wx+ww-26,CY2]].forEach(([x,c])=>{ S(ctx,R(x,wy+wh-22,18,18,[2,2,6,6]),c,{sh:0,lw:2.4}); S(ctx,El(x+9,wy+wh-28,11,8),MI,{sh:0,lw:2.4}); });
    for(let i=0;i<11;i++){ const k=i/10, x=20+k*(w-40), y=44+Math.pow(Math.abs(k-.5)*2,2)*42; if(i){ const k0=(i-1)/10; L(ctx,[20+k0*(w-40),44+Math.pow(Math.abs(k0-.5)*2,2)*42,x,y],2,INK); } const on=.5+.5*Math.sin(t*2+i);
      ctx.fillStyle=`rgba(239,163,244,${.35*on})`; ctx.beginPath(); ctx.arc(x,y+7,10,0,7); ctx.fill(); S(ctx,El(x,y+7,4,5),i%2?LIL:CY,{sh:0,lw:2}); }
    S(ctx,R(206,92,156,110,8),'#F2CFA8'); G(ctx,R(214,100,140,94,4),'#F6DCBC');
    S(ctx,R(176,sy,206,10,3),WH,{sh:3}); L(ctx,[194,sy+10,194,sy+26],3); L(ctx,[364,sy+10,364,sy+26],3);
    ctx.fillStyle=LIL2; ctx.fillRect(0,fy,w,h-fy); L(ctx,[0,fy,w,fy],3); for(let y=fy+34;y<h;y+=34) L(ctx,[0,y,w,y],2,'rgba(23,19,28,.08)');
    const ry=h*0.86; S(ctx,El(w/2,ry,150,30),LIL,{sh:5}); ctx.lineWidth=2.4; ctx.strokeStyle=INK; ctx.setLineDash([6,7]); ctx.beginPath(); ctx.ellipse(w/2,ry,118,22,0,0,7); ctx.stroke(); ctx.setLineDash([]);
    L(ctx,[42,fy+34,42,fy-150],3); S(ctx,El(42,fy+34,16,4),INK,{sh:0,lw:0}); S(ctx,Pg([22,fy-150,62,fy-150,54,fy-182,30,fy-182]),CY,{sh:3});
    [[296,fy+44,74,50],[304,fy-2,60,46]].forEach(([x,y,bw,bh])=>{ S(ctx,R(x,y,bw,bh,4),'#F2CFA8'); ctx.fillStyle=WH; ctx.fillRect(x+bw/2-6,y+1.5,12,bh*0.5); });
    S(ctx,Pg([304,fy-2,294,fy-18,330,fy-14,334,fy-2]),'#F6DCBC',{sh:0,lw:2.6}); S(ctx,El(334,fy-12,9,7),LIL,{sh:0,lw:2.4});
    S(ctx,R(30,fy+96,36,30,[3,3,10,10]),CY2); [[-14,-16,0.5],[6,-26,-0.2],[18,-10,-0.8],[-4,-6,0.1]].forEach(([dx,dy,r])=>{ ctx.save(); ctx.translate(48+dx,fy+96+dy); ctx.rotate(r); S(ctx,El(0,0,8,17),MI,{sh:0,lw:2.4}); ctx.restore(); });
  ctx.restore(); ctx.lineWidth=4; ctx.strokeStyle=INK; ctx.stroke(arch);
}
function bus(ctx,w,h,o){
  if (o.layer!=='front'){
    [[-10,170,78,LIL2],[70,190,70,CY2],[148,160,88,WH],[248,182,70,MI2],[328,168,80,LIL2]].forEach(([x,y,bw,c])=>{ G(ctx,R(x,y,bw,320,4),c); G(ctx,Pg([x-4,y,x+bw/2,y-32,x+bw+4,y]),WH); G(ctx,R(x+12,y+24,14,18,3),WH); G(ctx,R(x+bw-26,y+24,14,18,3),WH); });
    ctx.fillStyle=WH; ctx.fillRect(0,610,w,h-610); L(ctx,[0,610,w,610],3); ctx.fillStyle=LIL2; ctx.fillRect(0,700,w,h-700); L(ctx,[0,700,w,700],3);
    S(ctx,Pd('M70 232 H320 A44 44 0 0 1 364 276 V712 H26 V276 A44 44 0 0 1 70 232 Z'),WH,{lw:3.5,sh:8});
    S(ctx,R(26,566,338,32,0),LIL,{sh:0,lw:3}); S(ctx,R(108,246,174,36,10),INK,{sh:0,lw:0}); ctx.font='800 17px Lexend,ui-rounded,sans-serif'; ctx.fillStyle=LIL; ctx.textAlign='center'; ctx.fillText('45 · TOWN SQUARE',195,270);
    S(ctx,R(50,300,290,236,24),'#F5F1FA',{sh:0,lw:3}); G(ctx,R(62,326,70,80,12),CY2); G(ctx,R(258,326,70,80,12),CY2); G(ctx,R(140,330,110,140,18),LIL2);
  } else {
    ctx.save(); ctx.clip(R(50,300,290,236,24)); ctx.fillStyle='rgba(255,255,255,.28)'; ctx.beginPath(); ctx.moveTo(80,300); ctx.lineTo(130,300); ctx.lineTo(60,440); ctx.lineTo(50,440); ctx.fill(); ctx.restore();
    ctx.lineWidth=3.5; ctx.strokeStyle=INK; ctx.beginPath(); ctx.roundRect(50,300,290,236,24); ctx.stroke();
    S(ctx,R(50,488,290,48,[0,0,24,24]),'#2E2740',{sh:0,lw:3}); S(ctx,R(64,496,56,10,5),CY,{sh:0,lw:2}); S(ctx,R(270,496,50,10,5),LIL,{sh:0,lw:2});
    ctx.lineWidth=12; ctx.strokeStyle=INK; ctx.beginPath(); ctx.arc(196,514,50,Math.PI*1.08,Math.PI*1.92); ctx.stroke(); L(ctx,[196,514,196,492],8);
    [[84,632],[306,632]].forEach(([x,y])=>{ S(ctx,El(x,y,25),WH,{sh:3}); S(ctx,El(x,y,15),CY2,{sh:0,lw:2.4}); });
    for(let i=0;i<3;i++) S(ctx,R(146,616+i*14,98,7,3.5),LIL2,{sh:0,lw:2.2});
    S(ctx,R(150,664,90,26,6),WH,{sh:3}); ctx.font='800 14px Lexend,sans-serif'; ctx.fillStyle=INK; ctx.textAlign='center'; ctx.fillText('NW 045',195,682);
    S(ctx,R(20,694,350,30,15),INK,{sh:0,lw:0}); [[86,738],[304,738]].forEach(([x,y])=>S(ctx,El(x,y,32,20),INK,{sh:0,lw:0}));
    L(ctx,[26,322,8,302],4); S(ctx,R(-6,286,20,40,6),WH,{sh:3}); L(ctx,[364,322,382,302],4); S(ctx,R(376,286,20,40,6),WH,{sh:3});
  }
}
function office(ctx,w,h,o){
  if (o.layer!=='front'){
    G(ctx,R(222,88,140,176,6),CY2); ctx.save(); ctx.clip(R(222,88,140,176,6)); [[232,200,30,WH,LIL],[270,210,30,WH,CY],[308,194,36,WH,MI]].forEach(([x,y,bw,c,r])=>{ G(ctx,R(x,y,bw,80,2),c); G(ctx,Pg([x-3,y,x+bw/2,y-16,x+bw+3,y]),r); }); ctx.restore();
    L(ctx,[292,88,292,264],2.5,GR); L(ctx,[222,172,362,172],2.5,GR);
    G(ctx,R(24,124,104,226,6),WH); [180,236,292].forEach(y=>L(ctx,[24,y,128,y],2.5,GR));
    const B=[[LIL,12,44],[CY2,10,48],[MI2,14,40],[LIL2,10,46],[WH,12,42],[CY,9,48]]; [134,190,246].forEach((sy,r)=>{ let x=32; B.forEach(([c,bw,bh],i)=>{ if((i+r)%5===4) return; G(ctx,R(x,sy+44-bh,bw,bh,2),c); x+=bw+3; }); });
    G(ctx,R(150,100,52,40,4),LIL2); G(ctx,El(176,60,16),WH); L(ctx,[176,60,176,51],2.5,GR); L(ctx,[176,60,183,64],2.5,GR);
    G(ctx,R(334,414,40,44,[4,4,12,12]),LIL2); [[-18,-44,0.5],[0,-60,0],[18,-46,-0.5]].forEach(([dx,dy,r])=>{ ctx.save(); ctx.translate(354+dx,414+dy); ctx.rotate(r); G(ctx,El(0,0,10,24),MI2); ctx.restore(); });
  } else {
    S(ctx,R(-10,480,w+20,22,6),WH,{lw:3.2,sh:0}); S(ctx,R(8,502,w-16,260,0),LIL2,{lw:3.2,sh:0}); G(ctx,R(30,528,150,180,10),'rgba(255,255,255,.4)'); G(ctx,R(210,528,150,180,10),'rgba(255,255,255,.4)');
    S(ctx,R(252,420,100,62,[8,8,0,0]),WH,{sh:3}); S(ctx,R(240,478,124,6,3),WH,{sh:0,lw:2.4}); S(ctx,El(302,450,7),LIL,{sh:0,lw:2.4});
    S(ctx,R(40,450,30,32,[4,4,10,10]),CY,{sh:3}); ctx.lineWidth=3; ctx.strokeStyle=INK; ctx.beginPath(); ctx.arc(72,464,7,-1.3,1.3); ctx.stroke();
    ctx.save(); ctx.translate(118,466); ctx.rotate(-0.05); S(ctx,R(0,0,72,13,2),WH,{sh:2}); ctx.restore();
  }
}
function night(ctx,w,h,o){
  const t=(o.t||0)/1000, r=rnd(11);
  for(let i=0;i<46;i++){ const x=r()*w, y=60+r()*400, a=.35+.65*Math.abs(Math.sin(t*1.5+i)), s=2+r()*4; ctx.globalAlpha=a; spark(ctx,x,y,s,i%5===0?LIL:i%7===0?CY:WH); } ctx.globalAlpha=1;
  S(ctx,El(306,128,28),'#FFF3C4',{sh:0,lw:3,ink:WH}); ctx.fillStyle='rgba(255,226,140,.6)'; ctx.beginPath(); ctx.arc(298,122,5,0,7); ctx.arc(314,138,4,0,7); ctx.fill();
  ctx.strokeStyle='rgba(249,218,251,.55)'; ctx.lineWidth=2.4; [[0,480,50],[44,470,40],[80,488,60],[136,476,44],[176,490,70],[240,480,50],[286,492,50]].forEach(([x,y,bw],i)=>{ ctx.beginPath(); ctx.moveTo(x,y+60); ctx.lineTo(x,y); ctx.lineTo(x+bw/2,y-20); ctx.lineTo(x+bw,y); ctx.lineTo(x+bw,y+60); ctx.stroke(); ctx.fillStyle=i%2?LIL:'#FFE3A0'; ctx.fillRect(x+bw/2-4,y+14,8,8); });
  ctx.beginPath(); ctx.moveTo(344,540); ctx.lineTo(346,430); ctx.lineTo(358,430); ctx.lineTo(360,540); ctx.stroke(); ctx.fillStyle='#FFE3A0'; ctx.beginPath(); ctx.arc(352,424,5,0,7); ctx.fill();
  ctx.save(); ctx.translate(352,424); ctx.rotate(Math.sin(t*0.7)*1.2+Math.PI); ctx.fillStyle='rgba(255,227,160,.13)'; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(220,-26); ctx.lineTo(220,26); ctx.fill(); ctx.restore();
  L(ctx,[0,540,w,540],2.4,'rgba(249,218,251,.55)'); for(let i=0;i<6;i++){ const y=560+i*16, x=((i*61)%300)+Math.sin(t+i)*10; L(ctx,[x,y,x+10,y-4,x+20,y],2.2,'rgba(34,191,242,.55)'); L(ctx,[x+20,y,x+30,y+4,x+40,y],2.2,'rgba(34,191,242,.55)'); }
  S(ctx,R(-10,660,w+20,24,4),WH,{lw:3.2,sh:6,shc:'#0E0A14'});
  const jx=o.jarX||250, jb=660, glow=(x,y,rr,c)=>{ for(let k=3;k>0;k--){ ctx.fillStyle=c.replace('A',(0.1*k).toFixed(2)); ctx.beginPath(); ctx.arc(x,y,rr*(1+k*.6),0,7); ctx.fill(); } ctx.fillStyle=c.replace('A','1'); ctx.beginPath(); ctx.arc(x,y,rr,0,7); ctx.fill(); ctx.lineWidth=2.4; ctx.strokeStyle=INK; ctx.stroke(); };
  ctx.save(); ctx.clip(R(jx-52,jb-150,104,150,[30,30,22,22])); ctx.fillStyle='rgba(207,240,253,.14)'; ctx.fillRect(jx-60,jb-160,120,170);
  glow(jx-18,jb-48+Math.sin(t*1.3)*6,10,'rgba(34,191,242,A)'); glow(jx+16,jb-92+Math.sin(t*1.1+1)*6,14,'rgba(239,163,244,A)');
  for(let i=0;i<6;i++){ const k=(t*0.2+i/6)%1; ctx.globalAlpha=.8*(1-k); spark(ctx,jx-30+i*12,jb-10-k*120,3,WH); } ctx.globalAlpha=1; ctx.restore();
  ctx.lineWidth=3.2; ctx.strokeStyle=WH; ctx.beginPath(); ctx.roundRect(jx-52,jb-150,104,150,[30,30,22,22]); ctx.stroke();
  L(ctx,[jx-36,jb-126,jx-38,jb-40],5,'rgba(255,255,255,.35)'); S(ctx,R(jx-40,jb-168,80,22,6),'#F2CFA8',{ink:WH,sh:0,lw:3});
  ctx.save(); ctx.translate(jx+52,jb-112); ctx.rotate(0.2); S(ctx,R(-16,-10,32,20,4),LIL,{ink:WH,sh:0,lw:2.6}); ctx.restore(); L(ctx,[jx+30,jb-148,jx+46,jb-122],2,WH);
}
function confetti(ctx,w,h,o){ const t=(o.t||0)/1000, r=rnd(5), cols=[LIL,CY,MI,WH,LIL2,CY2];
  for(let i=0;i<56;i++){ const x0=r()*w, sp=40+r()*70, y=((r()*h+t*sp)%(h+40))-20, x=x0+Math.sin(t*1.5+i)*14, ro=t*(1+r()*3)+i;
    ctx.save(); ctx.translate(x,y); ctx.rotate(ro); ctx.scale(Math.cos(t*3+i),1); const p=i%3?R(-5,-3,10,6,1.5):El(0,0,4); S(ctx,p,cols[i%cols.length],{sh:0,lw:2}); ctx.restore(); } }
function plant(ctx,w,h,o){ const st=o.stage||0, t=(o.t||0)/1000; ctx.scale(w/64,h/92);
  ctx.save(); ctx.translate(32,62); ctx.rotate(Math.sin(t*1.7+st)*0.05); ctx.translate(-32,-62);
  const top=[62,46,34,28][st];
  if (st===0) S(ctx,El(32,58,6,4.5),'#C99A6E',{sh:0,lw:2.4});
  else { L(ctx,[32,62,34,(62+top)/2,32,top],5); L(ctx,[32,62,34,(62+top)/2,32,top],2,MI);
    const leaf=(x,y,r,s)=>{ ctx.save(); ctx.translate(x,y); ctx.rotate(r); ctx.scale(s,s); S(ctx,Pd('M0 0 C6 -8 18 -8 24 0 C18 6 6 6 0 0 Z'),MI,{sh:0,lw:2.6/s}); ctx.restore(); };
    leaf(33,top+3,-0.6,st===1?.62:.7); leaf(31,top+3,Math.PI+0.6,st===1?.62:.7);
    if (st>=2){ leaf(33,52,-0.25,.95); leaf(31,52,Math.PI+0.25,.95); }
    if (st===3){ for(let i=0;i<6;i++){ const a=i*Math.PI/3+t*0.3; S(ctx,El(32+Math.cos(a)*7,top-2+Math.sin(a)*7,5.6,4.4),LIL,{sh:0,lw:2}); } S(ctx,El(32,top-2,4.4),CY,{sh:0,lw:2}); } }
  ctx.restore(); S(ctx,Pd('M10 62 L14 85 C15 89 18 91 22 91 L42 91 C46 91 49 89 50 85 L54 62 Z'),WH,{sh:3,lw:2.8}); S(ctx,R(8,58,48,8,4),LIL,{sh:0,lw:2.6}); }
A.sticker={critter:stk,face:stkFace,town,cafe,burrow,bus,office,night,confetti,plant,PLACES};
['critter','face','town','cafe','burrow','bus','office','night','confetti','plant'].forEach(k=>A['s_'+k]=A.sticker[k]); A.S_PLACES=PLACES;
})();
