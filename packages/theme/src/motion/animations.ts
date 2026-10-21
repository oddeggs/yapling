/**
 * Every animation the first-week prototype plays, named by where it plays. Each is the
 * prototype's `@keyframes` with the timing of its `animation` shorthand, so a Reanimated worklet
 * can play it exactly: `progressAt` turns elapsed time into progress, `sampleKeyframes` and
 * `transformAt` turn progress into values.
 */
import { cssEasing, curves, type Easing } from './easing';
import { type Animation, type Keyframes } from './keyframes';
import { screenKeyframes as k } from './keyframes/screens.generated';
import { sharedKeyframes as shared } from './keyframes/shared.generated';

interface Timing {
  delayMs?: number;
  iterations?: number;
  fill?: Animation['fill'];
  staggerMs?: number;
  jitterMs?: number;
}

function play(
  keyframes: Keyframes,
  durationMs: number,
  easing: Easing,
  timing: Timing = {},
): Animation {
  const out: Animation = {
    keyframes,
    durationMs,
    delayMs: timing.delayMs ?? 0,
    easing,
    iterations: timing.iterations ?? 1,
    fill: timing.fill ?? 'both',
  };
  return {
    ...out,
    ...(timing.staggerMs === undefined ? {} : { staggerMs: timing.staggerMs }),
    ...(timing.jitterMs === undefined ? {} : { jitterMs: timing.jitterMs }),
  };
}

const loop = (keyframes: Keyframes, durationMs: number, easing: Easing, delayMs = 0) =>
  play(keyframes, durationMs, easing, { delayMs, iterations: Infinity, fill: 'none' });

const { ease, easeIn, easeOut, easeInOut, linear } = cssEasing;

/** How one screen replaces another: the new screen enters while the old one exits. */
export interface ScreenTransition {
  readonly enter: Animation;
  readonly exit: Animation;
  /** True when the leaving screen stays on top while it goes (going back, sinking a sheet). */
  readonly exitOnTop: boolean;
}

/** The six ways a step replaces the last, as the prototype's navigator plays them. */
export const screenTransitions = {
  /** Forward: the new screen slides in from the right; the old one shifts left and dims. */
  push: {
    enter: play(k.pIn, 550, curves.glide),
    exit: play(k.pOut, 550, curves.glide),
    exitOnTop: false,
  },
  /** Back: the previous screen slides back in from the left; this one slides off to the right. */
  back: {
    enter: play(k.bIn, 500, curves.glide),
    exit: play(k.bOut, 500, curves.glideOut),
    exitOnTop: true,
  },
  /** A sheet-like screen rising from the bottom over a still one. */
  rise: {
    enter: play(k.rIn, 550, curves.rise),
    exit: play(k.hold, 550, ease),
    exitOnTop: false,
  },
  /** That sheet sinking away to reveal the screen beneath. */
  sink: {
    enter: play(k.hold, 500, ease),
    exit: play(k.sOut, 450, curves.sink),
    exitOnTop: true,
  },
  /** Into a scene (calls, the week, the paywall): zooms up from a rounded card. */
  zoom: {
    enter: play(k.zIn, 600, curves.zoom),
    exit: play(k.zOut, 450, easeIn),
    exitOnTop: false,
  },
  /** A cross-fade: lock screens, the safety sheet. */
  fade: {
    enter: play(k.fIn, 450, ease),
    exit: play(k.fOut, 450, ease),
    exitOnTop: false,
  },
} as const satisfies Record<string, ScreenTransition>;

/** Animations on the screens around the calls: lock screens, onboarding, the week, after a call. */
export const screenMotion = {
  /** The very first screen fading in at launch. */
  launch: play(k.fIn, 400, ease),
  /** A lock-screen notification sliding up into place. */
  lockNotification: play(k.yup, 600, curves.rise, { delayMs: 400 }),
  /** "Tap the notification to open" bobbing under it. */
  lockTapHint: loop(k.ybounce, 1600, easeInOut),
  /** The splash wordmark typing itself in, its letters closing up. */
  splashWordmark: play(k.ytype, 1400, easeOut),
  /** The first-language glass sheet rising on the splash. */
  splashSheet: play(k.yup, 600, curves.rise, { delayMs: 300 }),
  /** The roommate popping in above an info sheet (AI disclosure, notifications, errors). */
  infoHero: play(k.ypop, 600, easeOut, { delayMs: 150 }),
  /** An info sheet rising. */
  infoSheet: play(k.yup, 550, curves.rise, { delayMs: 100 }),
  /** The residency card flying in. */
  residencyCard: play(k.yfly, 1100, curves.fly),
  /** The residency sheet rising under it. */
  residencySheet: play(k.yup, 600, curves.rise, { delayMs: 350 }),
  /** "You already do these well" rows, one after another. */
  residencyStrength: play(k.yin, 400, easeOut, { delayMs: 600, staggerMs: 150 }),
  /** A row easing up into a list: the week's call slots, story lines, fluency-mirror rounds. */
  listIn: play(k.yin, 400, easeOut),
  /** "Done!" typing in after the first call. */
  postDone: play(k.ytype, 1000, easeOut),
  /** The weekly ring popping in after the call. */
  postRing: play(k.ypop, 600, easeOut, { delayMs: 400 }),
  /** The two wins easing in. */
  postWin: play(k.yin, 400, easeOut, { delayMs: 300 }),
  /** The one fix easing in after them. */
  postFix: play(k.yin, 400, easeOut, { delayMs: 600 }),
  /** Seed packets turning into sprouts, one after another. */
  sprout: play(k.ypop, 600, curves.pop, { staggerMs: 150 }),
  /** The unpacked box and ring sheet rising last. */
  postSheet: play(k.yup, 600, curves.rise, { delayMs: 1000 }),
  /** A round thing popping in whole: the full ring on the keepsake, the dusk window. */
  roundPop: play(k.ypop, 600, easeOut),
  /** The ring's last third filling. */
  ringFill: play(k.yring, 1400, easeOut, { delayMs: 300 }),
  /** The keepsake swaying on its string. */
  keepsakeSway: loop(k.ysway, 4000, easeInOut),
  /** The keepsake frame flying onto its string. */
  keepsakeFrame: play(k.yfly, 1100, curves.fly, { delayMs: 500 }),
  /** The roommate shaking on a crackly line (no connection). */
  crackly: loop(k.ywig, 400, linear),
  /** A toast dropping in under the status bar, holding, and lifting away. */
  toast: play(k.ytoast, 2800, easeOut),
} as const satisfies Record<string, Animation>;

/** Animations inside a call and the listening screens. */
export const callMotion = {
  /** "Calling Harbour Lane Office" pill rising. */
  phonePill: play(k.yup, 400, easeOut),
  /** The phone icon bouncing in that pill. */
  phoneIcon: loop(k.ybounce, 1000, easeInOut),
  /** The rent letter flying in. */
  letter: play(k.yfly, 900, curves.fly),
  /** Pip's voicemail card flying in. */
  voicemail: play(k.yfly, 1000, curves.fly),
  /** Linh's postcard flying in. */
  postcard: play(k.yfly, 1100, curves.fly),
  /** A Vietnamese gloss or the meaning chip easing in. */
  gloss: play(k.yin, 300, easeOut),
  /** A sticker popping onto the scene: the correction badges, "You fixed it", the new leaf, the fluency mirror. */
  sticker: play(k.ypop, 500, easeOut),
  /** The second correction badge, after the first. */
  stickerSecond: play(k.ypop, 500, easeOut, { delayMs: 300 }),
  /** The timer ring popping in. */
  timer: play(k.ypop, 400, easeOut),
  /** The three sparkles around "You fixed it", each starting a little later. */
  sparkles: [
    loop(k.ysp, 1200, easeOut),
    loop(k.ysp, 1200, easeOut, 400),
    loop(k.ysp, 1200, easeOut, 700),
  ],
  /** A letter slipping under the café door at dusk. */
  duskLetter: loop(k.yletter, 3200, easeInOut, 1000),
  /** The Episode 2 peek card rising. */
  peek: play(k.yup, 500, easeOut),
  /** Pip's whispered meaning rising. */
  whisper: play(k.yup, 350, easeOut),
  /** The hint card rising after the learner pauses. */
  hint: play(k.yup, 450, curves.rise),
  /** The mic glowing on the learner's turn (and the next episode's pin on the season map). */
  micGlow: loop(k.yglow, 1600, easeInOut),
  /** The mic's three bars while listening, each 150 ms after the last. */
  micBars: play(k.ybar, 800, easeInOut, { iterations: Infinity, fill: 'none', staggerMs: 150 }),
} as const;

/** The full idle of a critter: CSS loops on `ease-in-out`, each instance offset by up to 1.6 s. */
const idle = (keyframes: Keyframes, durationMs: number) =>
  play(keyframes, durationMs, easeInOut, { iterations: Infinity, fill: 'none', jitterMs: 1600 });

/**
 * How a critter moves (the prototype's `cr()` helper). An idle loop by mood, a talking bob while
 * a line plays, and the moods without their own loop cycle through `rest`, picked by a hash of
 * the instance (the prototype offsets each one by 0–1.6 s the same way).
 */
export const critterMotion = {
  idle: {
    excited: idle(shared.yhop, 1200),
    laugh: idle(shared.yhop, 1400),
    listen: idle(shared.ysway, 3200),
    think: idle(shared.ysway, 4200),
    confused: idle(shared.ysway, 2600),
    sleepy: idle(shared.ybreathe, 4800),
    worried: idle(shared.yshiver, 2400),
    surprised: idle(shared.ystartle, 2600),
    wave: idle(shared.ylook, 3400),
  },
  rest: [
    idle(shared.ybreathe, 3200),
    idle(shared.ylook, 4400),
    idle(shared.ybreathe, 2700),
    idle(shared.ysway, 3800),
  ],
  /** While the critter's line plays. */
  talking: idle(shared.ytalk, 450),
  /** The picked roommate jumping for joy. */
  jump: play(shared.yjump, 900, curves.jump),
  /** A word object (seed packet, sprout, leaf, jar) popping into place. */
  wordObject: play(k.ypop, 750, curves.pop),
} as const;
