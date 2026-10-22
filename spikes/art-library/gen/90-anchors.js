// Spike: anchors for two EXISTING scenes, read off their generators (yap-r6 cafeWarm / yap-sticker cafe, yap-r4 burrow2).
// [x, y, scale] = ground-contact point on a surface. No change to the scene code is needed to accept props.
(function boot(){
const A=window.YapArt; if(!A||!A.K){ setTimeout(boot,60); return; } if(boot.done) return; boot.done=1;
const glow=(ctx,x,y,r,col)=>{ ctx.save(); ctx.globalCompositeOperation='lighter'; const g=ctx.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,col); g.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=g; ctx.fillRect(x-r,y-r,2*r,2*r); ctx.restore(); };
// cafeWarm = cafe + this light (yap-r6); split so placed props get the same warmth.
const cafeLight=(ctx,w,h)=>{ ctx.fillStyle='rgba(255,160,90,.13)'; ctx.fillRect(0,0,w,h); glow(ctx,w*0.16,90,140,'rgba(255,190,120,.45)'); glow(ctx,w*0.84,100,140,'rgba(255,190,120,.45)'); glow(ctx,w/2,170,160,'rgba(255,225,170,.35)'); };
A.SCENES.cafe={ fn:'s_cafe', light:cafeLight, front:'s_cafeFront', indoor:true, lights:[[62,90,140],[328,100,140]],
  anchors:{ 'counter-1':[166,410,1], 'counter-2':[224,410,1], 'counter-3':[262,410,.9],      // counter top y=410, between the pastry case (x≤132) and the coffee machine (x≥284)
    'table-l':[70,746,.85], 'table-r':[322,746,.85],                                           // table top (ellipse y=747), beside the cups
    'floor-l':[52,690,1], 'floor-r':[340,690,1] } };                                            // floor (y>520), in front of the counter
A.SCENES.burrow={ fn:'s_burrow2', indoor:true, lights:[[50,474,90],[82,250,90],[195,60,180],[336,474,60]],
  anchors:{ 'shelf-l1':[50,398,1], 'shelf-l2':[100,398,1], 'shelf-l3':[150,398,1],            // two wall shelves at y=398
    'shelf-r1':[246,398,1], 'shelf-r2':[292,398,1], 'shelf-r3':[338,398,1],
    'sill':[112,316,.9], 'desk-1':[104,520,1], 'desk-2':[142,520,.9],                            // window sill, desk top
    'floor-l':[70,700,1], 'floor-c':[195,742,1], 'floor-r':[250,690,1] } };                      // floor (fy=590), rug centre
// Review fix for the agent's market: its ground slots sat behind the stall's front layer. Move them in front of it.
const fixM=()=>{ const m=A.SCENES.market; if(!m){ setTimeout(fixM,60); return; } m.anchors['ground-l']=[60,700,1,'front']; m.anchors['ground-r']=[330,700,1,'front']; }; fixM();
})();
