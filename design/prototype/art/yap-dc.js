// Shared DC helpers for Yapling Round 4 files. Call window.YapDC(React) from a DC logic class.
window.YapDC = function(React){
  if (window.__yapdc) return window.__yapdc;
  if (!document.getElementById('yapdc-kf')){ const s=document.createElement('style'); s.id='yapdc-kf'; s.textContent="@keyframes ybreathe{0%,100%{transform:scale(1,1)}50%{transform:scale(.99,1.025)}}\n@keyframes ysway{0%,100%{transform:rotate(-2.5deg)}50%{transform:rotate(2.5deg)}}\n@keyframes ylook{0%,100%{transform:translateX(0) rotate(0)}30%{transform:translateX(-4px) rotate(-1.5deg)}60%{transform:translateX(3px) rotate(1deg)}}\n@keyframes yhop{0%,60%,100%{transform:translateY(0) scale(1,1)}10%{transform:scale(1.08,.92)}25%{transform:translateY(-16px) scale(.95,1.06)}40%{transform:translateY(0) scale(1.06,.94)}50%{transform:scale(1,1)}}\n@keyframes yshiver{0%,60%,100%{transform:translateX(0)}10%,30%,50%{transform:translateX(-1.5px)}20%,40%{transform:translateX(1.5px)}}\n@keyframes ystartle{0%,70%,100%{transform:scale(1)}75%{transform:translateY(-8px) scale(.96,1.05)}85%{transform:translateY(0) scale(1.04,.96)}}\n@keyframes ytalk{0%,100%{transform:scale(1,1)}50%{transform:scale(1.012,.99) translateY(-1px)}}\n@keyframes yflyin{0%{transform:translate(160px,-120px) rotate(24deg) scale(.7);opacity:0}14%{transform:translate(-6px,4px) rotate(-5deg) scale(1.02);opacity:1}20%,88%{transform:translate(0,0) rotate(-3deg) scale(1);opacity:1}100%{transform:translate(0,0) rotate(-3deg);opacity:1}}\n@keyframes ystamp{0%,8%{transform:scale(2.6) rotate(-30deg);opacity:0}16%{transform:scale(.92) rotate(-12deg);opacity:1}22%,100%{transform:scale(1) rotate(-12deg);opacity:1}}\n@keyframes ypanel{0%{transform:translateY(24px) rotate(var(--r,0deg));opacity:0}12%,100%{transform:translateY(0) rotate(var(--r,0deg));opacity:1}}\n@keyframes ydoor{0%,15%{transform:perspective(500px) rotateY(0)}35%,80%{transform:perspective(500px) rotateY(-70deg)}100%{transform:perspective(500px) rotateY(0)}}\n@keyframes ytype{0%{transform:scale(.4) rotate(-8deg);opacity:0}18%{transform:scale(1.12) rotate(-4deg);opacity:1}26%,100%{transform:scale(1) rotate(-4deg);opacity:1}}\n@keyframes yflag{0%,100%{transform:skewY(0)}50%{transform:skewY(-6deg)}}\n@keyframes ywind{0%{transform:translateX(-120px);opacity:0}20%{opacity:.9}100%{transform:translateX(420px);opacity:0}}\n@keyframes ylet{0%,6%{transform:translateY(-14px);opacity:0}14%,100%{transform:translateY(0);opacity:1}}"; document.head.appendChild(s); }
  const h = React.createElement;
  const ready = fn => window.YapArt && window.YapArt.r4 && window.YapArt[fn];
  class Cv extends React.Component {
    shouldComponentUpdate(np){ return JSON.stringify(np.o)!==this.last || np.w!==this.props.w || np.hh!==this.props.hh; }
    componentDidMount(){ this.paint(); }
    componentDidUpdate(){ this.paint(); }
    componentWillUnmount(){ clearTimeout(this.to); }
    paint(){
      const c=this.el; if(!c) return; const {fn,w,hh}=this.props;
      if(!ready(fn)){ clearTimeout(this.to); this.to=setTimeout(()=>this.paint(),120); return; }
      this.last=JSON.stringify(this.props.o);
      const d=Math.min(2,Math.max(1.5,window.devicePixelRatio||1));
      if(c.width!==Math.round(w*d)||c.height!==Math.round(hh*d)){ c.width=Math.round(w*d); c.height=Math.round(hh*d); }
      const ctx=c.getContext('2d'); ctx.setTransform(d,0,0,d,0,0); ctx.clearRect(0,0,w,hh); ctx.save(); window.YapArt[fn](ctx,w,hh,this.props.o||{}); ctx.restore();
    }
    render(){ return h('canvas',{ref:e=>this.el=e,style:{width:this.props.w,height:this.props.hh,display:'block'}}); }
  }
  const ANIM={excited:1,confused:1,warm:1,worried:1,sleepy:1};
  const tk=ms=>Math.round(performance.now()/ms)*ms;
  function cr(sp,o){ o=o||{}; const s=o.size, mood=o.mood||'happy';
    const oo={sp,mood,mouth:o.mouth||'rest',blink:!!o.blink,look:o.look||0,pose:o.pose,prop:o.prop,tilt:o.tilt,pal:o.pal};
    if (ANIM[mood]||mood==='wave'||o.prop==='mug'||o.live) oo.t=tk(100);
    oo.back=!!o.back; oo.noTail=!!o.noTail;
    const IDLE={excited:'yhop 1.2s',laugh:'yhop 1.4s',listen:'ysway 3.2s',think:'ysway 4.2s',confused:'ysway 2.6s',sleepy:'ybreathe 4.8s',worried:'yshiver 2.4s',surprised:'ystartle 2.6s',wave:'ylook 3.4s'};
    let hs=0; const key=sp+(o.k||'')+s; for(let i=0;i<key.length;i++) hs=(hs*31+key.charCodeAt(i))>>>0;
    const idle=o.anim||(o.mouth&&o.mouth!=='rest'?'ytalk .45s':(IDLE[mood]||['ybreathe 3.2s','ylook 4.4s','ybreathe 2.7s','ysway 3.8s'][hs%4]));
    const anim=o.jumpKey!=null?'yjump .9s cubic-bezier(.3,.7,.4,1) both':(o.still?'none':idle+' ease-in-out infinite');
    return h('div',{key:(o.jumpKey!=null?'j'+o.jumpKey:'b')+(o.k||''),style:{width:s,height:s*1.2,animation:anim,animationDelay:(-(hs%17)/10)+'s',transformOrigin:'50% 100%'}},h(Cv,{fn:'s_critter',w:s,hh:s*1.2,o:oo}));
  }
  const fc=(sp,s,mood,bg)=>h(Cv,{key:sp+'f'+s,fn:'s_face',w:s,hh:s,o:{sp,mood:mood||'happy',bg:bg||'#F9DAFB'}});
  const sc=(fn,w,hh,o)=>h(Cv,{fn:'s_'+fn,w,hh,o:o||{}});
  const obj=(fam,stage,key,size,extra)=>h('div',{key,style:{animation:'ypop .75s cubic-bezier(.34,1.56,.64,1) both',transformOrigin:'50% 100%'}},h(Cv,{fn:'s_obj',w:size||56,hh:(size||56)*4/3,o:Object.assign({fam,stage,t:tk(200)},extra||{})}));
  function mouthFor(t,i){
    const c=(t[i]||' ').toLowerCase(), n=(t[i+1]||'').toLowerCase();
    if (c==='t'&&n==='h') return 'L'; if ('aiáàạ'.includes(c)) return 'A'; if (c==='e'||c==='y'||c==='ê') return 'E';
    if (c==='o'||c==='ô') return 'O'; if ('uwư'.includes(c)) return 'U'; if ('mbp'.includes(c)) return 'M';
    if ('fv'.includes(c)) return 'F'; if ('ltdn'.includes(c)) return 'L'; if ('sczkgrjh'.includes(c)) return 'E'; return 'rest';
  }
  function makeSfx(isOn){ let ac=null;
    const tone=(f,t0,dur,type,g,f2)=>{ try{ if(!ac) ac=new (window.AudioContext||window.webkitAudioContext)(); const t=ac.currentTime+t0,o=ac.createOscillator(),v=ac.createGain(); o.type=type||'sine'; o.frequency.setValueAtTime(f,t); if(f2) o.frequency.exponentialRampToValueAtTime(f2,t+dur*.6); v.gain.setValueAtTime(.0001,t); v.gain.exponentialRampToValueAtTime(g||.15,t+.012); v.gain.exponentialRampToValueAtTime(.0001,t+dur); o.connect(v); v.connect(ac.destination); o.start(t); o.stop(t+dur+.05);}catch(e){} };
    const sfx=k=>{ if(!isOn()) return;
      if(k==='pop'){ tone(380,0,.14,'sine',.22,980); tone(1400,.06,.08,'triangle',.05); }
      if(k==='chime'){ [659,784,988,1319].forEach((f,i)=>tone(f,i*.08,.55,'triangle',.09)); }
      if(k==='soft'){ tone(523,0,.3,'sine',.08); tone(392,.12,.4,'sine',.07); }
      if(k==='ring'){ [0,.5].forEach(o=>[784,988,784,988].forEach((f,i)=>tone(f,o+i*.09,.12,'triangle',.08))); }
      if(k==='tick'){ tone(1200,0,.04,'square',.03); }
      if(k==='sparkle'){ [1319,1568,2093].forEach((f,i)=>tone(f,i*.06,.25,'sine',.06)); }
      if(k==='fanfare'){ [523,659,784,1047].forEach((f,i)=>tone(f,i*.11,.4,'triangle',.1)); tone(1568,.5,.6,'sine',.06); }
      if(k==='van'){ tone(196,0,.18,'square',.04); tone(196,.24,.3,'square',.04); }
      if(k==='yawn'){ tone(440,0,.8,'sine',.06,220); } };
    sfx.tone=tone; return sfx; }
  const blinkers=bt=>({b1:(bt%40)<2, b2:((bt+17)%46)<2, b3:((bt+29)%52)<2});
  return window.__yapdc={h,Cv,tk,cr,fc,sc,obj,mouthFor,makeSfx,blinkers};
};
