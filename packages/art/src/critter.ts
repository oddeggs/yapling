import { recordArt } from './art';
import type { Mat } from './canvas/matrix';
import type { Op } from './canvas/ops';
import type { Prototype } from './runtime/prototype';
import type { SkiaApi } from './skia/api';

/** The cast as the app shows it: who each character is in the prototype's rig. */
export const CAST = {
  pip: 'redpanda',
  linh: 'pangolin',
  mei: 'otter',
  sol: 'tarsier',
  hank: 'raccoon',
  nell: 'koala',
  bea: 'bulldog',
  dex: 'bison',
  arjun: 'tiger',
} as const;

export type Character = keyof typeof CAST;

/** Pip's three starter species (the learner picks one). */
export const PIP_SPECIES = ['redpanda', 'capybara', 'cat'] as const;
export type PipSpecies = (typeof PIP_SPECIES)[number];

export type Species = (typeof CAST)[Character] | PipSpecies;

/** The cast rig's 14 moods (`YapArt.MOODS`). */
export const MOODS = [
  'happy',
  'laugh',
  'excited',
  'surprised',
  'confused',
  'think',
  'listen',
  'shy',
  'proud',
  'worried',
  'sleepy',
  'warm',
  'patient',
  'wave',
] as const;
export type Mood = (typeof MOODS)[number];

/** `rest` is the mood's own mouth; the others are the talking visemes. */
export const MOUTHS = ['rest', 'A', 'E', 'O', 'U', 'M', 'F', 'L'] as const;
export type Mouth = (typeof MOUTHS)[number];

export function speciesOf(character: Character, pip: PipSpecies = 'redpanda'): Species {
  return character === 'pip' ? pip : CAST[character];
}

/**
 * A sticker critter cut into the parts that change on their own. `outline` is its shadow and ink
 * outline (copies of its silhouette), `body` the rest in three runs around the eyes and the mouth.
 * Drawn in order — outline, body[0], eyes, body[1], mouth, body[2] — the parts make the critter
 * exactly; a blink swaps the eyes and lipsync swaps the mouth.
 */
export interface CritterParts {
  /** Width and height of the critter's box (the generator's `w` and `h`). */
  readonly width: number;
  readonly height: number;
  readonly outline: readonly Op[];
  readonly body: readonly [readonly Op[], readonly Op[], readonly Op[]];
  /** Open and closed eyes; null for moods whose eyes do not blink (laughing and warm arcs). */
  readonly eyes: { readonly open: readonly Op[]; readonly closed: readonly Op[] } | null;
  readonly mouths: Readonly<Record<Mouth, readonly Op[]>>;
}

export interface CritterSpec {
  species: Species;
  mood: Mood;
  /** The critter's width in points; it is 1.2 × as tall. */
  size: number;
}

/** What the sticker critter generator records for one variant, in points, at rest (`t = 0`). */
export function recordCritter(
  proto: Prototype,
  skia: SkiaApi,
  spec: CritterSpec,
  extra: { mouth?: Mouth; blink?: boolean } = {},
  transform?: Mat,
): readonly Op[] {
  const o = {
    sp: spec.species,
    mood: spec.mood,
    mouth: extra.mouth ?? 'rest',
    t: 0,
    ...(extra.blink ? { blink: true } : {}),
  };
  return recordArt(
    proto,
    skia,
    { fn: 's_critter', w: spec.size, h: spec.size * 1.2, o },
    transform,
  );
}

/** How many leading operations every list shares. */
function commonPrefix(lists: readonly (readonly Op[])[]): number {
  const [first, ...rest] = lists;
  if (!first) return 0;
  const max = Math.min(...lists.map((l) => l.length));
  let i = 0;
  while (i < max && rest.every((l) => l[i]?.key === first[i]?.key)) i++;
  return i;
}

/** How many trailing operations every list shares, leaving at least `prefix` in front. */
function commonSuffix(lists: readonly (readonly Op[])[], prefix: number): number {
  const [first, ...rest] = lists;
  if (!first) return 0;
  const max = Math.min(...lists.map((l) => l.length)) - prefix;
  let i = 0;
  const at = (l: readonly Op[], k: number) => l[l.length - 1 - k]?.key;
  while (i < max && rest.every((l) => at(l, i) === at(first, i))) i++;
  return i;
}

/**
 * Cuts the critter into its parts by drawing it once per mouth and once blinking, and finding
 * the run of operations each change touches: everything before and after is shared. The
 * silhouette copies of the outline compare by colour alone (a mouth or a blink never changes the
 * outline), so the outline is shared too.
 */
export function critterParts(
  proto: Prototype,
  skia: SkiaApi,
  spec: CritterSpec,
  transform?: Mat,
): CritterParts {
  const rec = (extra: { mouth?: Mouth; blink?: boolean }) =>
    recordCritter(proto, skia, spec, extra, transform);
  const variants = MOUTHS.map((mouth) => rec({ mouth }));
  const base = variants[0] ?? [];
  const p = commonPrefix(variants);
  const s = commonSuffix(variants, p);
  const mouths = {} as Record<Mouth, readonly Op[]>;
  MOUTHS.forEach((m, i) => {
    const v = variants[i] ?? [];
    mouths[m] = v.slice(p, v.length - s);
  });

  const blink = rec({ blink: true });
  const pe = commonPrefix([base, blink]);
  const se = commonSuffix([base, blink], pe);
  const eyeEnd = base.length - se;
  const blinks = pe < base.length || pe < blink.length;
  if (blinks && eyeEnd > p) {
    throw new Error(
      `@yapling/art: ${spec.species} ${spec.mood}: the eyes are not drawn before the mouth`,
    );
  }

  // The outline: the leading shadow and silhouette copies, up to the last of them.
  let outlineEnd = 0;
  const lead = blinks ? pe : p;
  for (let i = 0; i < lead; i++) {
    const op = base[i];
    if (op && (op.kind === 'layer' || op.kind === 'image') && op.mask) outlineEnd = i + 1;
  }

  return {
    width: spec.size,
    height: spec.size * 1.2,
    outline: base.slice(0, outlineEnd),
    body: blinks
      ? [base.slice(outlineEnd, pe), base.slice(eyeEnd, p), base.slice(base.length - s)]
      : [base.slice(outlineEnd, p), [], base.slice(base.length - s)],
    eyes: blinks
      ? { open: base.slice(pe, eyeEnd), closed: blink.slice(pe, blink.length - se) }
      : null,
    mouths,
  };
}

/** The parts in drawing order for one state. */
export function critterOps(parts: CritterParts, mouth: Mouth = 'rest', blink = false): Op[] {
  return [
    ...parts.outline,
    ...parts.body[0],
    ...(parts.eyes ? (blink ? parts.eyes.closed : parts.eyes.open) : []),
    ...parts.body[1],
    ...parts.mouths[mouth],
    ...parts.body[2],
  ];
}
