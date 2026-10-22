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
