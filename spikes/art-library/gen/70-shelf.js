// Spike: a shareable "collection shelf" card: 3 shelves x 4 props, each labelled with its English word and gloss,
// rarity shown with s_collect. s_shelfcard(ctx, w=390, h=640, { title, sub, sp, items:[{ id, v?, rarity?, season?, word, vi }] })
(function boot(){
const A=window.YapArt; if(!A||!A.K||!A.s_collect){ setTimeout(boot,60); return; } if(boot.done) return; boot.done=1;
const {C,R,El,S,L,dots,spark}=A.K;
function card(ctx,w,h,o){
  ctx.fillStyle=C.LIL2; ctx.fillRect(0,0,w,h); dots(ctx,9,9,w,h,.08);
  S(ctx,R(16,16,w-32,h-40,22),C.WH,{lw:3.2,sh:7});
  ctx.font='800 22px Lexend,sans-serif'; ctx.fillStyle=C.INK; ctx.textAlign='left'; ctx.fillText(o.title||'My word shelf',36,58);
  ctx.font='500 12px Lexend,sans-serif'; ctx.fillStyle='#5D5366'; ctx.fillText(o.sub||'',36,78);
  ctx.save(); ctx.beginPath(); ctx.arc(w-67,55,29,0,7); ctx.clip(); ctx.translate(w-96,26); A.s_face(ctx,58,58,{sp:o.sp||'redpanda',mood:'excited',bg:C.LIL2}); ctx.restore();
  ctx.lineWidth=3; ctx.strokeStyle=C.INK; ctx.beginPath(); ctx.arc(w-67,55,29,0,7); ctx.stroke();
  const items=o.items||[], rows=3, cols=4, x0=34, cw=(w-68)/cols, top=92, rh=(h-64-top)/rows;
  for(let r=0;r<rows;r++){ const sy=top+rh*(r+1)-52;
    // shelf plank, as the burrow shelves (white, ink, flat shadow, two brackets)
    S(ctx,R(28,sy,w-56,10,3),C.KR,{sh:3}); L(ctx,[34,sy+10,34,sy+18],3); L(ctx,[w-34,sy+10,w-34,sy+18],3);
    for(let c=0;c<cols;c++){ const it=items[r*cols+c]; if(!it) continue; const d=A.PROPS[it.id]; if(!d) continue;
      const s=66, cx=x0+cw*c+cw/2, B=A.K.BOX[d.size], g=A.K.GROUND[d.size];
      ctx.save();
      if (it.rarity){ const k=s/B; ctx.translate(cx-s/2, sy-(0.1*B+0.8*g)*k-7*k*B/60); A.s_collect(ctx,s,s,Object.assign({t:0},it)); }
      else { const k=s/B*0.86; ctx.translate(cx-B*k/2, sy-g*k); A.s_prop(ctx,B*k,B*k,Object.assign({t:0,steam:false},it)); }
      ctx.restore();
      ctx.textAlign='center'; ctx.font='700 11px Lexend,sans-serif'; ctx.fillStyle=C.INK; ctx.fillText(it.word,cx,sy+28);
      ctx.font='500 9.5px Lexend,sans-serif'; ctx.fillStyle=C.PLUM; ctx.fillText(it.vi,cx,sy+40); } }
  // footer legend
  const fy=h-46; ctx.font='600 10px Lexend,sans-serif'; ctx.textAlign='left'; ctx.fillStyle='#5D5366';
  [[C.WH,'common',40],[C.CY2,'rare',120],[C.BUT,'limited',184]].forEach(([c,t,x])=>{ S(ctx,R(x,fy-9,12,12,3),c,{sh:0,lw:2}); ctx.fillStyle='#5D5366'; ctx.fillText(t,x+17,fy+1); });
  ctx.textAlign='right'; ctx.font='800 13px Lexend,sans-serif'; ctx.fillStyle=C.INK; ctx.fillText('yapling',w-38,fy+2); spark(ctx,w-104,fy-3,5,C.LIL);
}
A.s_shelfcard=card;
})();
