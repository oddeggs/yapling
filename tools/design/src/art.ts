import { type ScreenContext } from './screens.ts';
import { Page } from './page.ts';

/** The cast as the app shows it: Pip in each starter species, then the neighbours (cast bible). */
export const CAST: { character: string; species: string }[] = [
  { character: 'pip-redpanda', species: 'redpanda' },
  { character: 'pip-capybara', species: 'capybara' },
  { character: 'pip-cat', species: 'cat' },
  { character: 'linh', species: 'pangolin' },
  { character: 'mei', species: 'otter' },
  { character: 'sol', species: 'tarsier' },
  { character: 'hank', species: 'raccoon' },
  { character: 'nell', species: 'koala' },
  { character: 'bea', species: 'bulldog' },
  { character: 'dex', species: 'bison' },
  { character: 'arjun', species: 'tiger' },
];

/** `rest` draws the mood's own mouth; the others are the talking visemes (yap-dc `mouthFor`). */
export const MOUTHS = ['rest', 'A', 'E', 'O', 'U', 'M', 'F', 'L'];

const TIMES_OF_DAY = ['morning', 'afternoon', 'evening', 'night', 'rain'];
const DESK_KINDS = ['mug', 'notes', 'stapler', 'headphones', 'sticker'];
/** The prototype paints every art canvas at 2x (the art bridge caps devicePixelRatio at 2). */
const SCALE = 2;

export interface ArtState {
  /** Path under `design/renders/`. */
  file: string;
  kind: 'critter' | 'face' | 'scene' | 'object';
  /** The generator: `YapArt[fn](ctx, w, h, o)`. */
  fn: string;
  w: number;
  h: number;
  o: Record<string, unknown>;
  /** Transparent margin on every side, CSS px. */
  pad: number;
  scale: number;
  /** The PNG's size in pixels. */
  canvas: { width: number; height: number };
  /** `ctx.setTransform(...)` before the call. */
  transform: [number, number, number, number, number, number];
  character?: string;
  species?: string;
  mood?: string;
  mouth?: string;
}

function state(
  file: string,
  kind: ArtState['kind'],
  fn: string,
  w: number,
  h: number,
  o: Record<string, unknown>,
  pad: number,
  extra: Partial<ArtState> = {},
): ArtState {
  return {
    file: `art/${file}.png`,
    kind,
    fn,
    w,
    h,
    o,
    pad,
    scale: SCALE,
    canvas: { width: Math.round((w + 2 * pad) * SCALE), height: Math.round((h + 2 * pad) * SCALE) },
    transform: [SCALE, 0, 0, SCALE, pad * SCALE, pad * SCALE],
    ...extra,
  };
}

/**
 * Every art state: each cast member in every mood and mouth (the sticker critter the screens
 * draw, `s_critter`, at rest with t = 0), their faces in every mood, the scenes, and the burrow
 * objects at each stage.
 */
export function artStates(moods: string[], species: string[]): ArtState[] {
  const out: ArtState[] = [];
  for (const { character, species: sp } of CAST) {
    if (!species.includes(sp)) throw new Error(`The cast rig has no ${sp} (for ${character})`);
    for (const mood of moods) {
      for (const mouth of MOUTHS) {
        out.push(
          state(
            `${character}-${mood}-${mouth}`,
            'critter',
            's_critter',
            200,
            240,
            { sp, mood, mouth, t: 0 },
            16,
            {
              character,
              species: sp,
              mood,
              mouth,
            },
          ),
        );
      }
      out.push(
        state(
          `face-${character}-${mood}`,
          'face',
          's_face',
          96,
          96,
          { sp, mood, bg: '#F9DAFB' },
          0,
          {
            character,
            species: sp,
            mood,
          },
        ),
      );
    }
  }
  const scene = (name: string, fn: string, o: Record<string, unknown> = {}, w = 390, h = 844) =>
    out.push(state(`scene-${name}`, 'scene', fn, w, h, { t: 0, ...o }, 0));
  scene('burrow', 's_burrow2');
  for (const tod of TIMES_OF_DAY) scene(`burrow-${tod}`, 's_burrow2', { tod });
  scene('burrow-day1', 's_burrowDay1');
  scene('burrow-v1', 's_burrow');
  scene('cafe', 's_cafe');
  scene('cafe-warm', 's_cafeWarm');
  scene('cafe-front', 's_cafeFront');
  scene('bus', 's_bus');
  scene('bus-front', 's_bus', { layer: 'front' });
  scene('town', 's_town');
  for (const tod of TIMES_OF_DAY) scene(`town-${tod}`, 's_townT', { tod });
  scene('lock', 's_town', {}, 430, 884);
  scene('office', 's_office');
  scene('office-front', 's_office', { layer: 'front' });
  scene('office-crisp', 's_officeCrisp');
  scene('night', 's_night');
  scene('harbour', 's_harbour');
  scene('street', 's_street');
  scene('square', 's_square');
  scene('confetti', 's_confetti');
  scene('festival-boat', 's_fboat', {}, 300, 220);
  const object = (name: string, o: Record<string, unknown>) =>
    out.push(state(`obj-${name}`, 'object', 's_obj', 60, 80, { t: 0, ...o }, 8));
  for (const fam of ['jar', 'desk', 'plant', 'mail']) {
    for (const stage of [0, 1, 2]) object(`${fam}-${stage}`, { fam, stage });
  }
  for (const kind of DESK_KINDS) {
    for (const stage of [0, 1, 2]) object(`desk-${kind}-${stage}`, { fam: 'desk', kind, stage });
  }
  object('seed', { fam: 'seed', stage: 0 });
  return out;
}

/** Renders every art state from the generators in a bare page (no design runtime). */
export async function renderArt(
  ctx: ScreenContext,
  selected: (file: string) => boolean,
): Promise<ArtState[]> {
  const page = await Page.open(ctx.browser, { width: 800, height: 800, scale: 1, net: ctx.net });
  try {
    await page.goto(`${ctx.origin}/__tools/page/art.html`);
    await page.until('the art generators', 'window.__art && window.__art.ready()');
    await page.networkIdle();
    await page.eval('window.__render.loadFonts()');
    const info = await page.eval<{ moods: string[]; species: string[] }>('window.__art.info()');
    const states = artStates(info.moods, info.species).filter((s) => selected(s.file));
    const writes: Promise<void>[] = [];
    for (const s of states) {
      const spec = { fn: s.fn, w: s.w, h: s.h, pad: s.pad, scale: s.scale, o: s.o };
      const base64 = await page.eval<string>(`window.__art.draw(${JSON.stringify(spec)})`);
      writes.push(ctx.write(s.file, Buffer.from(base64, 'base64')));
    }
    await Promise.all(writes);
    if (page.errors.length) console.warn(`  art: page errors: ${page.errors.join(' | ')}`);
    return states;
  } finally {
    await page.close();
  }
}
