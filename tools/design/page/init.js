// Runs in every rendered page before any page script (Page.addScriptToEvaluateOnNewDocument).
// It makes a design page a pure function of virtual time, and exposes `window.__render` for the
// renderer to drive it. Plain browser JavaScript: it is injected as text.
(() => {
  if (window.__render) return;
  const R = (window.__render = {});

  // Seeded Math.random (mulberry32).
  let seed = 0x79617031;
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Virtual clock. Nothing timed runs until the renderer advances it: timers, intervals,
  // animation frames, performance.now() and Date all read virtual time, so every page reaches the
  // same state at the same virtual instant however long loading took in real time.
  const nativeRaf = window.requestAnimationFrame.bind(window);
  const nativeTimeout = window.setTimeout.bind(window);
  /** Waits `n` real frames and `ms` real time: lets the compositor settle a frozen page. */
  R.frames = (n = 10, ms = 100) =>
    new Promise((resolve) => {
      let left = n;
      const frame = () => (--left <= 0 ? nativeTimeout(resolve, ms) : nativeRaf(frame));
      nativeRaf(frame);
    });
  const EPOCH = Date.UTC(2026, 8, 22, 9, 41, 0); // Tue 22 Sep 2026, 9:41, the prototype's day 1
  let now = 0;
  let nextId = 1;
  let order = 0;
  const timers = new Map();
  const add = (fn, delay, args, repeat) => {
    const id = nextId++;
    const ms = Math.max(0, Number(delay) || 0);
    timers.set(id, { id, at: now + ms, fn, args, every: repeat ? Math.max(1, ms) : 0, n: order++ });
    return id;
  };
  window.setTimeout = (fn, delay, ...args) => add(fn, delay, args, false);
  window.setInterval = (fn, delay, ...args) => add(fn, delay, args, true);
  window.clearTimeout = (id) => void timers.delete(id);
  window.clearInterval = (id) => void timers.delete(id);
  window.requestAnimationFrame = (cb) => add(() => cb(now), 16 - (now % 16), [], false);
  window.cancelAnimationFrame = (id) => void timers.delete(id);
  window.requestIdleCallback = (cb) =>
    add(() => cb({ didTimeout: false, timeRemaining: () => 50 }), 1, [], false);
  window.cancelIdleCallback = (id) => void timers.delete(id);
  Performance.prototype.now = () => now;
  const NativeDate = Date;
  class VirtualDate extends NativeDate {
    constructor(...args) {
      if (args.length === 0) super(EPOCH + now);
      else super(...args);
    }
    static now() {
      return EPOCH + now;
    }
  }
  window.Date = VirtualDate;

  const nextTimer = (end) => {
    let best = null;
    for (const t of timers.values()) {
      if (t.at > end) continue;
      if (!best || t.at < best.at || (t.at === best.at && t.n < best.n)) best = t;
    }
    return best;
  };
  const runTimer = (t) => {
    now = Math.max(now, t.at);
    if (t.every) {
      t.at += t.every;
      t.n = order++;
    } else timers.delete(t.id);
    try {
      if (typeof t.fn === 'function') t.fn(...t.args);
      else (0, eval)(String(t.fn));
    } catch (error) {
      console.error(error);
    }
  };

  // Lets queued React work (scheduled on a MessageChannel, not on timers) run to completion.
  R.flush = (rounds = 6) =>
    new Promise((resolve) => {
      const channel = new MessageChannel();
      let n = 0;
      channel.port1.onmessage = () => {
        if (++n >= rounds) {
          channel.port1.close();
          resolve();
        } else channel.port2.postMessage(0);
      };
      channel.port2.postMessage(0);
    });

  /** Advances virtual time by `ms`, one timer at a time, letting renders settle between timers. */
  R.advance = async (ms) => {
    const end = now + ms;
    for (let t = nextTimer(end); t; t = nextTimer(end)) {
      runTimer(t);
      await R.flush();
    }
    now = end;
    await R.flush();
  };
  R.now = () => now;

  /**
   * Advances in `step` ms until `done()` holds and at least `min` ms have passed (at most `max`).
   * Returns the virtual time spent, negative when `max` ran out first.
   */
  R.settle = async (min, max, step, done) => {
    let spent = 0;
    while (spent < max) {
      await R.advance(step);
      spent += step;
      if (spent >= min && done()) return spent;
    }
    return -spent;
  };

  /**
   * The design files blink their critters from a tick counter (`state.bt`, one tick per
   * interval). Advances one tick at a time until no blinker is closed, so no render catches a
   * critter mid-blink. Returns the ticks advanced.
   */
  R.unblink = async (logic, step) => {
    const closed = () => {
      const bt = logic && logic.state && logic.state.bt;
      if (typeof bt !== 'number' || !window.__yapdc) return false;
      const b = window.__yapdc.blinkers(bt);
      return b.b1 || b.b2 || b.b3;
    };
    let n = 0;
    while (closed() && n < 60) {
      await R.advance(step);
      n++;
    }
    return n;
  };

  // Dynamic scripts (the runtime injects the <helmet> scripts) execute in insertion order, as
  // written, instead of in whatever order they finish loading.
  const ordered = (node) => {
    if (node instanceof HTMLScriptElement && node.src && !node.hasAttribute('async')) {
      node.async = false;
    }
    return node;
  };
  const appendChild = Node.prototype.appendChild;
  const insertBefore = Node.prototype.insertBefore;
  Node.prototype.appendChild = function (node) {
    return appendChild.call(this, ordered(node));
  };
  Node.prototype.insertBefore = function (node, ref) {
    return insertBefore.call(this, ordered(node), ref);
  };

  // Silence: media never plays (the prototype then falls back to timed captions), and speech
  // synthesis and recognition are absent.
  HTMLMediaElement.prototype.play = function () {
    return Promise.reject(new DOMException('Renders are silent', 'NotAllowedError'));
  };
  try {
    delete window.speechSynthesis;
    Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true });
    Object.defineProperty(window, 'SpeechRecognition', { value: undefined, configurable: true });
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: undefined,
      configurable: true,
    });
  } catch {
    // Left as is.
  }
  // The voice engine plays every line in its silent timed mode.
  let voice;
  Object.defineProperty(window, 'YapVoice', {
    configurable: true,
    get: () => voice,
    set(v) {
      if (v && typeof v.play === 'function') {
        const play = v.play;
        v.play = (line, opt) => play(line, Object.assign({}, opt, { sound: false }));
      }
      voice = v;
    },
  });

  // Every logic class the design runtime compiles is wrapped so its instances are recorded:
  // the renderer sets their state (language, step, facilitator) directly.
  R.logic = [];
  R.wrapLogic = (Base) =>
    class extends Base {
      constructor(props) {
        super(props);
        R.logic.push(this);
      }
    };
  const NativeFunction = Function;
  const ending = '\n;return (typeof Component';
  window.Function = new Proxy(NativeFunction, {
    construct(target, args) {
      const body = args[args.length - 1];
      if (typeof body === 'string' && body.includes('DCLogic') && body.includes(ending)) {
        const at = body.lastIndexOf(ending);
        const wrap =
          '\n;try{if(typeof Component!=="undefined"&&window.__render)' +
          'Component=window.__render.wrapLogic(Component)}catch(e){}';
        args = [...args.slice(0, -1), body.slice(0, at) + wrap + body.slice(at)];
      }
      return Reflect.construct(target, args);
    },
  });

  // The art bridge's canvas component is patched so every mounted canvas can be repainted once
  // the web fonts have loaded (a canvas paints text in whatever font is ready at that moment).
  R.canvases = new Set();
  let bridge;
  Object.defineProperty(window, '__yapdc', {
    configurable: true,
    get: () => bridge,
    set(v) {
      const proto = v && v.Cv && v.Cv.prototype;
      if (proto && !proto.__renderPatched) {
        proto.__renderPatched = true;
        const mount = proto.componentDidMount;
        const unmount = proto.componentWillUnmount;
        proto.componentDidMount = function () {
          R.canvases.add(this);
          return mount.call(this);
        };
        proto.componentWillUnmount = function () {
          R.canvases.delete(this);
          return unmount.call(this);
        };
      }
      bridge = v;
    },
  });
  R.repaint = () => {
    for (const c of R.canvases) {
      try {
        c.paint();
      } catch (error) {
        console.error(error);
      }
    }
    return R.canvases.size;
  };

  // No CSS animation runs in real time: every one starts paused and transitions take no time.
  // `freeze` later holds each at a fixed instant.
  const still = document.createElement('style');
  still.textContent =
    '*,*::before,*::after{animation-play-state:paused!important;' +
    'transition-duration:0s!important;transition-delay:0s!important;caret-color:transparent!important}';
  const addStill = () => (document.head || document.documentElement).appendChild(still);
  if (document.documentElement) addStill();
  else document.addEventListener('DOMContentLoaded', addStill, { once: true });

  /** True once the runtime has rendered and no placeholder or missing component is left. */
  R.booted = () => {
    const root = document.getElementById('dc-root');
    return (
      document.readyState === 'complete' &&
      !!root &&
      root.childElementCount > 0 &&
      !document.querySelector('.sc-placeholder, .sc-missing, .sc-logic-error') &&
      [...document.images].every((img) => img.complete)
    );
  };

  /** Loads every declared font face (all unicode ranges); returns how many failed. */
  R.loadFonts = async () => {
    const faces = [...document.fonts];
    await Promise.all(faces.map((face) => face.load().catch(() => null)));
    await document.fonts.ready;
    return faces.filter((face) => face.status !== 'loaded').length;
  };

  /**
   * Holds every animation at one instant: finite ones at their end (as they rest on screen),
   * infinite ones at the start of their first cycle with any delay dropped, so a phase offset
   * never shows. Returns how many were held.
   */
  R.freeze = () => {
    let held = 0;
    for (const animation of document.getAnimations()) {
      const effect = animation.effect;
      const iterations = effect ? effect.getComputedTiming().iterations : 1;
      if (Number.isFinite(iterations)) {
        try {
          animation.finish();
        } catch {
          animation.cancel();
        }
      } else {
        if (effect) effect.updateTiming({ delay: 0 });
        animation.pause();
        animation.currentTime = 0;
      }
      held++;
    }
    // Then each held value is written into the element's own style and every animation goes, so
    // nothing is left on an animated compositor layer whose raster depends on when it was caught.
    for (const animation of document.getAnimations()) {
      try {
        animation.commitStyles();
      } catch {
        // A pseudo-element's animation cannot be committed; it rests at its unanimated style.
      }
    }
    const none = document.createElement('style');
    none.textContent = '*,*::before,*::after{animation:none!important}';
    document.head.appendChild(none);
    return held;
  };

  /**
   * Readies an element for capture as a bare screen: no device corners or bezel shadow, scrolled
   * to the top left of the viewport. Returns its box in document CSS px.
   */
  R.prepare = (el) => {
    el.style.borderRadius = '0';
    el.style.boxShadow = 'none';
    // Rebuilds the screen's layers from scratch in their final state.
    const display = el.style.display;
    el.style.display = 'none';
    void el.offsetHeight;
    el.style.display = display;
    void el.offsetHeight;
    const r0 = el.getBoundingClientRect();
    window.scrollTo({
      left: Math.max(0, Math.round(r0.left + scrollX - 8)),
      top: Math.max(0, Math.round(r0.top + scrollY - 8)),
      behavior: 'instant',
    });
    const r = el.getBoundingClientRect();
    // Capture boxes are in document coordinates; `inView` says the box is wholly on screen.
    const inView =
      r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5;
    return {
      x: Math.round(r.left + scrollX),
      y: Math.round(r.top + scrollY),
      width: Math.round(r.width),
      height: Math.round(r.height),
      inView,
    };
  };
})();
