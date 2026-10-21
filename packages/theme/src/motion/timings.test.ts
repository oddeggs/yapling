import { describe, expect, it } from 'vitest';

import {
  animationUsages,
  parseEasing,
  parseShorthand,
  readDesign,
  type Usage,
} from '../../scripts/css';
import { callMotion, critterMotion, screenMotion, screenTransitions } from './animations';
import { curves } from './easing';
import { type Animation } from './keyframes';
import { screenKeyframes } from './keyframes/screens.generated';
import { sharedKeyframes } from './keyframes/shared.generated';
import { transitions } from './transitions';

const week1 = readDesign('Yapling Week 1.dc.html');
const dc = readDesign('art/yap-dc.js');

/** Every token, with its path (`screens.toast`). */
function tokens(node: unknown, path: string[] = []): { path: string; animation: Animation }[] {
  if (Array.isArray(node)) return node.flatMap((n, i) => tokens(n, [...path, String(i)]));
  if (node === null || typeof node !== 'object') return [];
  if ('keyframes' in node && 'durationMs' in node)
    return [{ path: path.join('.'), animation: node as Animation }];
  return Object.entries(node).flatMap(([k, v]) => tokens(v, [...path, k]));
}

const same = (a: Animation, u: Usage) =>
  a.keyframes.name === u.name &&
  a.durationMs === u.durationMs &&
  a.delayMs === u.delayMs &&
  a.easing.join() === u.easing.join() &&
  a.iterations === u.iterations &&
  a.fill === u.fill;

const describeToken = (a: Animation) =>
  `${a.keyframes.name} ${a.durationMs}ms +${a.delayMs}ms [${a.easing.join(',')}] ×${a.iterations} ${a.fill}`;

describe('the first week’s animations', () => {
  const names = Object.keys(screenKeyframes);
  const usages = animationUsages(week1, names);
  const literal = usages.filter((u) => !u.built);
  const played = tokens({ screenMotion, callMotion, critterMotion, screenTransitions });

  it('give every literal shorthand in the prototype a token', () => {
    expect(literal.length).toBeGreaterThan(50);
    const unmatched = literal.filter((u) => !played.some((t) => same(t.animation, u)));
    expect(unmatched.map((u) => u.text)).toEqual([]);
  });

  it('give every token a shorthand in the prototype or a dedicated check', () => {
    // The critter's come from the shared helper (checked below); these three are built by script.
    const dedicated = new Set([
      'screenMotion.sprout',
      'screenMotion.residencyStrength',
      'callMotion.micBars',
    ]);
    const orphans = played
      .filter((t) => !t.path.startsWith('critterMotion') && !dedicated.has(t.path))
      .filter((t) => !literal.some((u) => same(t.animation, u)));
    expect(orphans.map((t) => `${t.path}: ${describeToken(t.animation)}`)).toEqual([]);
  });

  it('stagger the sprouts by 150 ms on the house pop', () => {
    expect(week1).toContain("animation:'ypop .6s '+(i*0.15)+'s cubic-bezier(.34,1.56,.64,1) both'");
    expect(screenMotion.sprout).toMatchObject({
      durationMs: 600,
      staggerMs: 150,
      easing: curves.pop,
      fill: 'both',
    });
  });

  it('stagger the strengths from 0.6 s by 0.15 s', () => {
    expect(week1).toContain("d:(0.6+i*0.15)+'s'");
    expect(week1).toContain('animation:yin .4s ease-out both;animation-delay:{{ g.d }}');
    expect(screenMotion.residencyStrength).toMatchObject({
      delayMs: 600,
      staggerMs: 150,
      durationMs: 400,
    });
  });

  it('stagger the mic bars by 0.15 s', () => {
    expect(week1).toContain("barA:rec?'ybar .8s ease-in-out infinite':'none'");
    expect(week1).toContain('animation-delay:.15s');
    expect(week1).toContain('animation-delay:.3s');
    expect(callMotion.micBars).toMatchObject({
      durationMs: 800,
      staggerMs: 150,
      iterations: Infinity,
    });
  });
});

describe('screen transitions', () => {
  it('match the navigator’s table, including which screen stays on top', () => {
    const table = /const ANIM=\{([\s\S]*?)\};/.exec(week1)?.[1] ?? '';
    for (const [kind, t] of Object.entries(screenTransitions)) {
      const m = new RegExp(`${kind}:\\['([^']+)','([^']+)',(\\d)\\]`).exec(table);
      expect(m, kind).not.toBeNull();
      expect(same(t.enter, parseShorthand(m?.[1] ?? '')), `${kind} enter`).toBe(true);
      expect(same(t.exit, parseShorthand(m?.[2] ?? '')), `${kind} exit`).toBe(true);
      expect(t.exitOnTop, kind).toBe(m?.[3] === '1');
    }
  });

  it('fade the first screen in', () => {
    expect(week1).toContain("a:'fIn .4s both'");
    expect(screenMotion.launch.durationMs).toBe(400);
  });
});

describe('critter motion', () => {
  it('idles by mood as the shared helper does, on ease-in-out loops offset up to 1.6 s', () => {
    const table = /const IDLE=\{([^}]*)\}/.exec(dc)?.[1] ?? '';
    const idle: Record<string, [string, number]> = Object.fromEntries(
      [...table.matchAll(/(\w+):'(\w+) ([\d.]+)s'/g)].map((m): [string, [string, number]] => [
        m[1] ?? '',
        [m[2] ?? '', Number(m[3]) * 1000],
      ]),
    );
    expect(Object.keys(idle).sort()).toEqual(Object.keys(critterMotion.idle).sort());
    for (const [mood, a] of Object.entries(critterMotion.idle))
      expect([a.keyframes.name, a.durationMs], mood).toEqual(idle[mood]);
    expect(dc).toContain("idle+' ease-in-out infinite'");
    expect(dc).toContain("animationDelay:(-(hs%17)/10)+'s'");
    for (const a of [
      ...Object.values(critterMotion.idle),
      ...critterMotion.rest,
      critterMotion.talking,
    ])
      expect(a).toMatchObject({
        iterations: Infinity,
        jitterMs: 1600,
        keyframes: sharedKeyframes[a.keyframes.name as keyof typeof sharedKeyframes],
      });
  });

  it('rests, talks, jumps and pops word objects as the helper says', () => {
    const rest =
      /\['(ybreathe [\d.]+s)','(ylook [\d.]+s)','(ybreathe [\d.]+s)','(ysway [\d.]+s)'\]/.exec(dc);
    expect(critterMotion.rest.map((a) => `${a.keyframes.name} ${a.durationMs / 1000}s`)).toEqual(
      rest?.slice(1),
    );
    expect(dc).toContain("'ytalk .45s'");
    expect(critterMotion.talking.durationMs).toBe(450);
    const [jump] = animationUsages(dc, ['yjump']);
    const [object] = animationUsages(dc, ['ypop']);
    expect(jump && same(critterMotion.jump, jump)).toBe(true);
    expect(object && same(critterMotion.wordObject, object)).toBe(true);
  });
});

describe('CSS transitions', () => {
  it('match every transition the screens set', () => {
    const written = [...week1.matchAll(/transition:([^;"]+)/g)].map((m) => m[1] ?? '');
    const read = written.map((w) => {
      const [, ms, easing] = /^\w+ ([\d.]+)s(?: (.+))?$/.exec(w) ?? [];
      return { durationMs: Number(ms) * 1000, easing: parseEasing(easing ?? 'ease') };
    });
    expect(read.sort((a, b) => a.durationMs - b.durationMs)).toEqual(
      Object.values(transitions).sort((a, b) => a.durationMs - b.durationMs),
    );
  });
});

describe('curves', () => {
  it('name every cubic-bezier in the prototype files, and each is used', () => {
    const files = [week1, dc, readDesign('Yapling Prototype.dc.html')];
    const written = new Set(
      files.flatMap((f) =>
        [...f.matchAll(/cubic-bezier\([^)]*\)/g)].map((m) => parseEasing(m[0]).join()),
      ),
    );
    expect([...written].sort()).toEqual(
      Object.values(curves)
        .map((c) => c.join())
        .sort(),
    );
  });
});
