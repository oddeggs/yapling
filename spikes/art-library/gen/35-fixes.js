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
})();
