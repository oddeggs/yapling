import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { type Browser } from './cdp.ts';
import { type NetCacheOptions } from './net-cache.ts';
import { type Clip, Page, pool } from './page.ts';

/** One rendered PNG of a screen, as listed in the manifest. */
export interface ScreenRender {
  /** Path under `design/renders/`. */
  file: string;
  /** Design file under `design/prototype/`. */
  source: string;
  /** The URL query and the state set before settling. */
  query: string;
  state: Record<string, unknown>;
  /** What was captured: the phone screen of a frame, or a whole labelled frame. */
  target: string;
  width: number;
  height: number;
  scale: number;
  /** Virtual ms the page ran before capture. */
  settledMs: number;
}

export interface ScreenContext {
  browser: Browser;
  origin: string;
  prototypeDir: string;
  net: NetCacheOptions;
  scale: number;
  concurrency: number;
  write(file: string, png: Buffer): Promise<void>;
}

const ART_READY = 'window.YapArt && window.YapArt.r6 && window.YapDC';
/** Phone frames in the export are 390 × 844 CSS px. */
const PHONE = { width: 390, height: 844 };
/** The virtual tick of the prototypes' runners. */
const TICK = 90;

/** Ids of the Week 1 file: its FLOW, checked against the map's day list, plus the map's extras. */
export function week1Ids(prototypeDir: string): { flow: string[]; extras: string[] } {
  const week = readFileSync(join(prototypeDir, 'Yapling Week 1.dc.html'), 'utf8');
  const map = readFileSync(join(prototypeDir, 'Yapling Week 1 Map.dc.html'), 'utf8');
  const flowSrc = /const FLOW=\[([^\]]*)\]/.exec(week)?.[1];
  if (!flowSrc) throw new Error('No FLOW in Yapling Week 1.dc.html');
  const flow = [...flowSrc.matchAll(/'([^']+)'/g)].map((m) => m[1] as string);
  const days = /const D=\[([\s\S]*?)\];\n/.exec(map)?.[1] ?? '';
  const mapIds = [...days.matchAll(/\['(d\d-[a-z0-9]+|end)'/g)].map((m) => m[1] as string);
  const missing = flow.filter((id) => !mapIds.includes(id));
  const unknown = mapIds.filter((id) => !flow.includes(id));
  if (missing.length || unknown.length) {
    throw new Error(`Week 1 map and FLOW disagree: missing ${missing}, unknown ${unknown}`);
  }
  const extrasSrc = /extras:\[(.*?)\]\.map/.exec(map)?.[1] ?? '';
  const extras = [...extrasSrc.matchAll(/\['([a-z-]+)',/g)].map((m) => m[1] as string);
  return { flow, extras };
}

async function openAt(
  ctx: ScreenContext,
  path: string,
  query: string,
  width: number,
  height: number,
) {
  const page = await Page.open(ctx.browser, { width, height, scale: ctx.scale, net: ctx.net });
  await page.openDesign(`${ctx.origin}/${encodeURI(path)}${query}`, ART_READY);
  return page;
}

/** Repaints canvases now that fonts are in, then holds every animation. */
async function hold(page: Page): Promise<void> {
  await page.eval('window.__render.repaint()');
  await page.eval('window.__render.flush()');
  await page.eval('window.__render.freeze()');
}

/**
 * Readies `selector` as a bare screen scrolled into view, lets the compositor settle, and returns
 * its capture box (document CSS px). A phone screen must be 390 × 844 and wholly in view.
 */
async function prepare(page: Page, selector: string, label: string, phone: boolean): Promise<Clip> {
  const { inView, ...clip } = await page.eval<Clip & { inView: boolean }>(
    `window.__render.prepare(document.querySelector(${JSON.stringify(selector)}))`,
  );
  await page.eval('window.__render.frames()');
  if (!inView) throw new Error(`${label}: capture box ${JSON.stringify(clip)} leaves the viewport`);
  if (phone && (clip.width !== PHONE.width || clip.height !== PHONE.height)) {
    console.warn(`  ${label}: phone screen is ${clip.width}×${clip.height}`);
  }
  return clip;
}

interface PhoneJob {
  source: string;
  query: string;
  state: Record<string, unknown>;
  file: string;
  selector: string;
  /** Runs in the page with `L` (the root logic instance) after load, before the clock moves. */
  setup: string;
  /** In-page condition (with `L`) for a settled screen. */
  until: string;
}

const VIEWPORT = { width: 1000, height: 1000 };

async function renderPhone(ctx: ScreenContext, job: PhoneJob): Promise<ScreenRender> {
  const page = await openAt(ctx, job.source, job.query, VIEWPORT.width, VIEWPORT.height);
  try {
    const L = 'window.__render.logic[0]';
    await page.eval(
      `(() => { const L = ${L}; if (!L) throw new Error('no logic'); ${job.setup} })()`,
    );
    await page.eval('window.__render.flush()');
    const spent = await page.eval<number>(
      `(() => { const L = ${L}; return window.__render.settle(1500, 120000, ${TICK}, () => (${job.until})); })()`,
    );
    if (spent < 0) console.warn(`  ${job.file}: did not settle in ${-spent} ms`);
    const ticks = await page.eval<number>(`window.__render.unblink(${L}, 10)`);
    await hold(page);
    const clip = await prepare(page, job.selector, job.file, true);
    await page.capture(clip, 1, 1);
    await ctx.write(job.file, await page.capture(clip));
    if (page.errors.length) console.warn(`  ${job.file}: page errors: ${page.errors.join(' | ')}`);
    return {
      file: job.file,
      source: job.source,
      query: job.query,
      state: job.state,
      target: job.selector,
      width: clip.width,
      height: clip.height,
      scale: ctx.scale,
      settledMs: Math.abs(spent) + ticks * 10,
    };
  } finally {
    await page.close();
  }
}

/**
 * Every step of the clickable first week, Vietnamese chrome (`<id>.png`) and English
 * (`<id>.en.png`), facilitator hidden, voices off. A step with a script runs until it waits for
 * the learner (or ends); others run 1.5 s. Day 8 also renders "came back after three days".
 */
export async function renderWeek1(ctx: ScreenContext, selected: (file: string) => boolean) {
  const source = 'Yapling Week 1.dc.html';
  const { flow, extras } = week1Ids(ctx.prototypeDir);
  const jobs: PhoneJob[] = [];
  for (const id of [...flow, ...extras]) {
    const variants: { suffix: string; away: boolean }[] = [{ suffix: '', away: false }];
    if (id === 'd8-lock' || id === 'd8-back') variants.push({ suffix: '.away', away: true });
    for (const { suffix, away } of variants) {
      for (const lang of ['vi', 'en'] as const) {
        const state = {
          lang,
          sound: false,
          facDesk: false,
          facIn: false,
          ...(away ? { away } : {}),
        };
        jobs.push({
          source,
          query: `?step=${id}`,
          state,
          file: `week1/${id}${suffix}${lang === 'en' ? '.en' : ''}.png`,
          selector: '[data-screen-label="Week 1 prototype"]',
          setup: `L.setState(${JSON.stringify(state)}); ${away ? 'setTimeout(() => L.initRun(L.sid()), 0);' : ''}`,
          until: '!L.R || L.R.done || L.R.ph === "await"',
        });
      }
    }
  }
  const chosen = jobs.filter((j) => selected(j.file));
  return pool(chosen, ctx.concurrency, (job) => renderPhone(ctx, job));
}

/** The screen ids of the hub prototype, from its ORDER. */
export function hubIds(prototypeDir: string): string[] {
  const src = readFileSync(join(prototypeDir, 'Yapling Prototype.dc.html'), 'utf8');
  const order = /const ORDER=\[([^\]]*)\]/.exec(src)?.[1];
  if (!order) throw new Error('No ORDER in Yapling Prototype.dc.html');
  return [...order.matchAll(/'([^']+)'/g)].map((m) => m[1] as string);
}

/** Every screen of the hub prototype, opened directly (no transition, no auto-ring). */
export async function renderHub(ctx: ScreenContext, selected: (file: string) => boolean) {
  const source = 'Yapling Prototype.dc.html';
  const jobs: PhoneJob[] = hubIds(ctx.prototypeDir).map((id) => {
    const state = { scr: id, prev: null, sound: false };
    return {
      source,
      query: '',
      state,
      file: `hub/${id}.png`,
      selector: '[data-screen-label="Prototype"]',
      setup: `L.setState(${JSON.stringify(state)}); L.reset(${JSON.stringify(id)});`,
      // A scripted chat runs until the learner's turn; the first chat waits for the mic.
      until:
        '["await", "done", "none"].includes(L.sim.phase) || (L.state.scr === "chat1" && !L.state.micOk)',
    };
  });
  return pool(
    jobs.filter((j) => selected(j.file)),
    ctx.concurrency,
    (job) => renderPhone(ctx, job),
  );
}

export const slug = (text: string): string =>
  text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** `Yapling R5 Real week.dc.html` → `r5-real-week`. */
export const boardSlug = (boardFile: string): string =>
  slug(boardFile.replace(/\.dc\.html$/, '').replace(/^Yapling /, ''));

interface BoardFrame {
  index: number;
  label: string;
  badge: string;
  phone: boolean;
}

/**
 * Every frame labelled with `data-screen-label` on a board, as its phone screen (the frame's
 * 390 × 844 child, without the caption above it), or the whole frame when it has no phone.
 */
export async function renderBoard(
  ctx: ScreenContext,
  boardFile: string,
  selected: (file: string) => boolean,
): Promise<ScreenRender[]> {
  const source = `boards/${boardFile}`;
  const board = boardSlug(boardFile);
  const viewport = { width: 1600, height: 1000 };
  const page = await openAt(ctx, source, '', viewport.width, viewport.height);
  const out: ScreenRender[] = [];
  try {
    const L = 'window.__render.logic[0]';
    const spent = await page.eval<number>('window.__render.settle(1500, 1500, 10, () => true)');
    const ticks = await page.eval<number>(`window.__render.unblink(${L}, 10)`);
    await hold(page);
    const frames = await page.eval<BoardFrame[]>(`(() => {
      const out = [];
      const frames = [...document.querySelectorAll('[data-screen-label]')]
        .filter((el) => !el.parentElement.closest('[data-screen-label]'));
      frames.forEach((el, index) => {
        el.setAttribute('data-render-frame', String(index));
        const phone = [...el.querySelectorAll('div')].find(
          (d) => d.offsetWidth === ${PHONE.width} && d.offsetHeight === ${PHONE.height});
        if (phone) phone.setAttribute('data-render-phone', String(index));
        const badge = (el.querySelector('span') || {}).textContent || '';
        out.push({ index, label: el.getAttribute('data-screen-label'), badge: badge.trim(), phone: !!phone });
      });
      return out;
    })()`);
    const seen = new Set<string>();
    for (const frame of frames) {
      const named = /^[A-Z]+\d+[a-z]?\b/.test(frame.label)
        ? frame.label
        : `${frame.badge} ${frame.label}`;
      const file = `boards/${board}/${slug(named)}.png`;
      if (seen.has(file)) throw new Error(`${source}: two frames render to ${file}`);
      seen.add(file);
      if (!selected(file)) continue;
      const selector = frame.phone
        ? `[data-render-phone="${frame.index}"]`
        : `[data-render-frame="${frame.index}"]`;
      const clip = await prepare(page, selector, file, frame.phone);
      await page.capture(clip, 1, 1);
      await ctx.write(file, await page.capture(clip));
      out.push({
        file,
        source,
        query: '',
        state: {},
        target: frame.phone
          ? `phone of [data-screen-label="${frame.label}"]`
          : `[data-screen-label="${frame.label}"]`,
        width: clip.width,
        height: clip.height,
        scale: ctx.scale,
        settledMs: Math.abs(spent) + ticks * 10,
      });
    }
    if (page.errors.length) console.warn(`  ${source}: page errors: ${page.errors.join(' | ')}`);
  } finally {
    await page.close();
  }
  return out;
}
