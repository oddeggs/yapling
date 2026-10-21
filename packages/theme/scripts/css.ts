/**
 * Reads `@keyframes` and `animation` shorthands out of the design prototype. The generator writes
 * the keyframes into `src/motion/keyframes/*.generated.ts` with it, and the tests read the
 * prototype's values with it. Node-only; nothing in `src` outside tests imports it.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { cssEasing, type Easing } from '../src/motion/easing';
import {
  identity,
  type Channel,
  type ChannelValues,
  type FilterValue,
  type Keyframes,
  type Num,
  type KeyframeShadow,
  type Stop,
  type TransformChannel,
} from '../src/motion/keyframes';

export const designDir = join(import.meta.dirname, '../../../design/prototype');

const entities: Record<string, string> = {
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': ' ',
  '&amp;': '&',
};

/**
 * A prototype file (path relative to `design/prototype/`) with the HTML entities the export uses
 * decoded; a script's `\n` escapes become line breaks, so CSS written into a JS string reads as CSS.
 */
export function readDesign(file: string): string {
  const text = readFileSync(join(designDir, file), 'utf8');
  if (file.endsWith('.js')) return text.replace(/\\n/g, '\n');
  return text.replace(/&(quot|#39|apos|lt|gt|nbsp|amp);/g, (m) => entities[m] ?? m);
}

/** Splits on `separator` at the top level only (not inside parentheses). */
export function splitTop(text: string, separator: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (depth === 0 && text.startsWith(separator, i)) {
      out.push(text.slice(start, i));
      start = i + separator.length;
    }
  }
  out.push(text.slice(start));
  return out.map((s) => s.trim()).filter((s) => s !== '');
}

/** The body of every literal `@keyframes name { ... }` in `source`, by name, in source order. */
export function keyframeBodies(source: string): Map<string, string> {
  const out = new Map<string, string>();
  const re = /@keyframes\s+([\w-]+)\s*\{/g;
  for (let m = re.exec(source); m; m = re.exec(source)) {
    const name = m[1] ?? '';
    let depth = 1;
    let i = re.lastIndex;
    while (depth > 0 && i < source.length) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') depth--;
      i++;
    }
    const body = source
      .slice(re.lastIndex, i - 1)
      .replace(/\s+/g, ' ')
      .trim();
    const seen = out.get(name);
    if (seen !== undefined && seen !== body) throw new Error(`@keyframes ${name} defined twice`);
    out.set(name, body);
  }
  return out;
}

/** An easing as CSS writes it: a keyword or `cubic-bezier()`. */
export function parseEasing(text: string): Easing {
  const t = text.trim();
  const bez = /^cubic-bezier\(([^)]+)\)$/.exec(t);
  if (bez) {
    const [x1 = 0, y1 = 0, x2 = 0, y2 = 0] = (bez[1] ?? '').split(',').map(Number);
    return [x1, y1, x2, y2];
  }
  const keywords: Record<string, Easing> = {
    linear: cssEasing.linear,
    ease: cssEasing.ease,
    'ease-in': cssEasing.easeIn,
    'ease-out': cssEasing.easeOut,
    'ease-in-out': cssEasing.easeInOut,
  };
  const k = keywords[t];
  if (!k) throw new Error(`unknown easing ${t}`);
  return k;
}

type Unit = 'px' | '%' | 'deg' | 'em' | '';
interface Raw {
  value: Num;
  unit: Unit;
}

function rawValue(text: string): Raw {
  const t = text.trim();
  const v = /^var\(--([\w-]+)\s*(?:,\s*(-?[\d.]+)(?:px|%|deg|em)?)?\)$/.exec(t);
  if (v) return { value: { var: v[1] ?? '', fallback: Number(v[2] ?? 0) }, unit: '' };
  const m = /^(-?[\d.]+)(px|%|deg|em)?$/.exec(t);
  if (!m) throw new Error(`cannot read value ${t}`);
  return { value: Number(m[1]), unit: (m[2] ?? '') as Unit };
}

type StepChannel = 'translateX' | 'translateY' | 'scaleX' | 'scaleY' | 'rotate' | 'rotateY';
type RawStep = { channel: StepChannel | 'skewY' | 'perspective'; raw: Raw };

function parseTransform(text: string): RawStep[] {
  if (text.trim() === 'none') return [];
  const out: RawStep[] = [];
  const re = /([a-zA-Z]+)\(/g;
  let rest = text.trim();
  while (rest !== '') {
    re.lastIndex = 0;
    const m = re.exec(rest);
    if (!m || m.index !== 0) throw new Error(`cannot read transform ${text}`);
    let depth = 1;
    let i = m[0].length;
    while (depth > 0) {
      if (rest[i] === '(') depth++;
      else if (rest[i] === ')') depth--;
      i++;
    }
    const fn = m[1] ?? '';
    const args = splitTop(rest.slice(m[0].length, i - 1), ',').map(rawValue);
    rest = rest.slice(i).trim();
    const [a, b] = args;
    if (a === undefined) throw new Error(`${fn}() needs an argument`);
    switch (fn) {
      case 'translate':
        out.push(
          { channel: 'translateX', raw: a },
          { channel: 'translateY', raw: b ?? { value: 0, unit: '' } },
        );
        break;
      case 'translateX':
      case 'translateY':
      case 'scaleX':
      case 'scaleY':
      case 'rotate':
      case 'rotateY':
      case 'skewY':
      case 'perspective':
        out.push({ channel: fn, raw: a });
        break;
      case 'scale':
        out.push({ channel: 'scaleX', raw: a }, { channel: 'scaleY', raw: b ?? a });
        break;
      default:
        throw new Error(`transform ${fn}() is not supported`);
    }
  }
  return out;
}

function parseFilter(text: string): FilterValue {
  if (text.trim() === 'none') return {};
  const out: { brightness?: number } = {};
  for (const m of text.matchAll(/([a-z-]+)\(([^)]+)\)/g)) {
    if (m[1] !== 'brightness') throw new Error(`filter ${m[1]}() is not supported`);
    out.brightness = parseFloat(m[2] ?? '');
  }
  return out;
}

/** A `box-shadow`, every layer: `0 4px 0 #17131C, 0 0 0 8px rgba(...)`. */
export function parseShadow(text: string): KeyframeShadow[] {
  return splitTop(text, ',').map((layer) => {
    const parts = splitTop(layer, ' ');
    const colour = parts.pop() ?? '';
    const [x = '0', y = '0', blur = '0', spread = '0'] = parts;
    return {
      x: parseFloat(x),
      y: parseFloat(y),
      blur: parseFloat(blur),
      spread: parseFloat(spread),
      colour,
    };
  });
}

function offsets(selector: string): number[] {
  return selector.split(',').map((s) => {
    const t = s.trim();
    if (t === 'from') return 0;
    if (t === 'to') return 1;
    if (!t.endsWith('%')) throw new Error(`cannot read keyframe selector ${t}`);
    return Number((Number(t.slice(0, -1)) / 100).toFixed(6));
  });
}

interface Block {
  at: number;
  decls: Map<string, string>;
}

function blocks(body: string): Block[] {
  const out: Block[] = [];
  for (const m of body.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const decls = new Map<string, string>();
    for (const d of splitTop(m[2] ?? '', ';')) {
      const i = d.indexOf(':');
      decls.set(d.slice(0, i).trim(), d.slice(i + 1).trim());
    }
    for (const at of offsets(m[1] ?? '')) out.push({ at, decls });
  }
  return out.sort((a, b) => a.at - b.at);
}

const transformChannels: readonly TransformChannel[] = [
  'translateX',
  'translateY',
  'translateXPercent',
  'translateYPercent',
  'scaleX',
  'scaleY',
  'rotate',
  'rotateY',
  'skewY',
];

type MutableTracks = { [C in Channel]?: Stop<ChannelValues[C]>[] };

function push<C extends Channel>(tracks: MutableTracks, channel: C, stop: Stop<ChannelValues[C]>) {
  const track = (tracks[channel] ??= []) as Stop<ChannelValues[C]>[];
  track.push(stop);
}

/** One `@keyframes` body as channels. */
export function parseKeyframes(name: string, body: string): Keyframes {
  const list = blocks(body);
  const steps = list.map((b) => {
    const t = b.decls.get('transform');
    return t === undefined ? null : parseTransform(t);
  });
  // `perspective()` is its own channel, not a step of the transform.
  const perspective = steps.map((fns) => fns?.find((f) => f.channel === 'perspective'));
  type Step = { channel: StepChannel | 'skewY'; raw: Raw };
  const parsed = steps.map(
    (fns) => fns?.filter((f): f is Step => f.channel !== 'perspective') ?? null,
  );
  // A translation goes to the percent channel when the keyframes ever translate that axis by a
  // percentage (a bare 0 then means 0%), so one channel never mixes units.
  const percentAxes = new Set<string>();
  for (const fns of parsed)
    for (const f of fns ?? []) if (f.raw.unit === '%') percentAxes.add(f.channel);
  const channelOf = (c: Step['channel']): TransformChannel => {
    if (c === 'translateX' && percentAxes.has(c)) return 'translateXPercent';
    if (c === 'translateY' && percentAxes.has(c)) return 'translateYPercent';
    return c;
  };
  const order: TransformChannel[] = [];
  for (const fns of [...parsed].sort((a, b) => (b?.length ?? 0) - (a?.length ?? 0))) {
    let last = -1;
    for (const f of fns ?? []) {
      const c = channelOf(f.channel);
      if (!order.includes(c)) order.splice(last + 1, 0, c);
      last = order.indexOf(c);
    }
  }
  const tracks: MutableTracks = {};
  list.forEach((b, i) => {
    const t = b.decls.get('animation-timing-function');
    const easing = t === undefined ? undefined : parseEasing(t);
    const stop = <V>(value: V): Stop<V> =>
      easing ? { at: b.at, value, easing } : { at: b.at, value };
    const fns = parsed[i];
    const p = perspective[i];
    if (p) push(tracks, 'perspective', stop(p.raw.value));
    if (fns) {
      for (const c of order) {
        const f = fns.find((x) => channelOf(x.channel) === c);
        const raw = f?.raw;
        if (raw && raw.unit === '%' && !c.endsWith('Percent'))
          throw new Error(`${name}: ${c} mixes units`);
        push(tracks, c, stop(raw ? raw.value : (identity[c] ?? 0)));
      }
    }
    for (const [prop, value] of b.decls) {
      switch (prop) {
        case 'transform':
        case 'animation-timing-function':
          break;
        case 'opacity':
          push(tracks, 'opacity', stop(rawValue(value).value));
          break;
        case 'border-radius':
          push(tracks, 'borderRadius', stop(rawValue(value).value));
          break;
        case 'stroke-dashoffset':
          push(tracks, 'strokeDashoffset', stop(rawValue(value).value));
          break;
        case 'letter-spacing': {
          const raw = rawValue(value);
          if (raw.unit !== 'em') throw new Error(`${name}: letter-spacing ${value} is not in em`);
          push(tracks, 'letterSpacingEm', stop(raw.value));
          break;
        }
        case 'filter':
          push(tracks, 'filter', stop(parseFilter(value)));
          break;
        case 'box-shadow':
          push(tracks, 'boxShadow', stop(parseShadow(value)));
          break;
        case 'clip-path':
          push(tracks, 'clipPath', stop(value));
          break;
        default:
          throw new Error(`${name}: property ${prop} is not supported`);
      }
    }
  });
  // CSS fills a missing 0% or 100% with the element's own value: the identity here.
  for (const channel of Object.keys(tracks) as Channel[]) {
    const track = tracks[channel] as Stop<unknown>[];
    const fill: unknown =
      channel === 'filter' ? {} : (identity[channel as keyof typeof identity] ?? undefined);
    if (track[0] && track[0].at > 0) {
      if (fill === undefined) throw new Error(`${name}: ${channel} has no 0% keyframe`);
      track.unshift({ at: 0, value: fill });
    }
    const last = track[track.length - 1];
    if (last && last.at < 1) {
      if (fill === undefined) throw new Error(`${name}: ${channel} has no 100% keyframe`);
      track.push({ at: 1, value: fill });
    }
  }
  const ordered: MutableTracks = {};
  for (const c of [
    ...order,
    ...(Object.keys(tracks) as Channel[]).filter(
      (c) => !transformChannels.includes(c as TransformChannel),
    ),
  ]) {
    const track = tracks[c];
    if (track) (ordered as Record<string, unknown>)[c] = track;
  }
  return { name, transform: order, tracks: ordered };
}

/** One `animation` shorthand as the prototype writes it. */
export interface Usage {
  name: string;
  durationMs: number;
  delayMs: number;
  easing: Easing;
  iterations: number;
  fill: 'none' | 'both';
  text: string;
  /**
   * True when the script builds the shorthand by concatenation (`'ypop .6s '+(i*0.15)+'s …'`),
   * so the literal text is only its start.
   */
  built: boolean;
}

const easingWord = /^(linear|ease|ease-in|ease-out|ease-in-out|cubic-bezier\([^)]*\))$/;

/** Reads one shorthand (`name 1s .2s ease-out infinite both`). */
export function parseShorthand(text: string, built = false): Usage {
  const [name = '', ...rest] = splitTop(text, ' ');
  const usage: Usage = {
    name,
    durationMs: 0,
    delayMs: 0,
    easing: cssEasing.ease,
    iterations: 1,
    fill: 'none',
    text,
    built,
  };
  let times = 0;
  for (const p of rest) {
    const time = /^(-?[\d.]+)(m?s)$/.exec(p);
    if (time) {
      const ms = Number(time[1]) * (time[2] === 's' ? 1000 : 1);
      if (times++ === 0) usage.durationMs = Math.round(ms * 1000) / 1000;
      else usage.delayMs = Math.round(ms * 1000) / 1000;
    } else if (easingWord.test(p)) usage.easing = parseEasing(p);
    else if (p === 'infinite') usage.iterations = Infinity;
    else if (p === 'both') usage.fill = p;
    else throw new Error(`cannot read "${p}" in animation "${text}"`);
  }
  return usage;
}

/**
 * Every literal `animation` shorthand naming one of `names` in a prototype file, from inline
 * styles and from the strings its scripts build.
 */
export function animationUsages(source: string, names: readonly string[]): Usage[] {
  const out: Usage[] = [];
  const re = new RegExp(
    `(?<![\\w-])(${names.join('|')})((?:\\s+(?:-?[\\d.]+m?s|cubic-bezier\\([^)]*\\)|linear|ease-in-out|ease-in|ease-out|ease|infinite|both))+)`,
    'g',
  );
  for (const m of source.matchAll(re)) {
    const end = (m.index ?? 0) + m[0].length;
    const built = /^\s*'\s*\+/.test(source.slice(end, end + 6));
    out.push(parseShorthand(`${m[1]}${m[2]}`.trim(), built));
  }
  return out;
}
