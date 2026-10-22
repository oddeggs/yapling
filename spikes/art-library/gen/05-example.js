// Reference prop for the style kit (not one of the 30): a teapot, size M, colour variant, steam over time.
(function boot(){
const A=window.YapArt; if(!A||!A.K){ setTimeout(boot,60); return; } if(boot.done) return; boot.done=1;
const {C,R,El,Pg,Pd,S,L,glint,steam,vc}=A.K;
A.PROPS['teapot']={ size:'M', word:'teapot', variants:['lilac','cyan','mint','butter','white'], draw(ctx,o,t){
  const [main,tint]=vc(o,'cyan');
  S(ctx,Pd('M70 50 C82 46 88 36 86 28'),null,{lw:0,sh:0});
  L(ctx,[72,48,86,40,88,28],6); L(ctx,[72,48,86,40,88,28],2.4,main);           // spout: ink line + colour core
  ctx.lineWidth=5; ctx.strokeStyle=C.INK; ctx.beginPath(); ctx.arc(22,60,13,Math.PI*0.6,Math.PI*1.45); ctx.stroke(); // handle
  S(ctx,Pd('M20 86 C14 74 16 50 30 42 L66 42 C80 50 82 74 76 86 Z'),main,{sh:4});  // body, sticker shadow
  S(ctx,R(26,84,44,6,3),C.WH,{sh:0,lw:2.4});                                        // foot (rests on ground y=90)
  S(ctx,El(48,42,20,5),tint,{sh:0,lw:2.6});                                          // lid rim
  S(ctx,Pd('M34 41 C36 30 60 30 62 41 Z'),tint,{sh:0,lw:2.6});                       // lid
  S(ctx,El(48,28,4.5),C.WH,{sh:0,lw:2.4});                                           // knob
  S(ctx,R(36,58,24,14,6),C.WH,{sh:0,lw:2.2});                                        // label patch
  glint(ctx,30,56,4,7,-0.3);
  if (o.steam!==false) steam(ctx,90,22,0.8);
}};
})();
