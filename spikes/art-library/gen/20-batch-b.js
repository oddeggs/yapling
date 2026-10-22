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
