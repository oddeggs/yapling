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
