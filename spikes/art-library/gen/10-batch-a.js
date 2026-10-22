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
