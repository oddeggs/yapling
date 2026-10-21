import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { keyframeBodies, readDesign } from '../../scripts/css';
import {
  groupKeyframes,
  keyframeGroups,
  keyframeModuleSource,
} from '../../scripts/keyframe-sources';
import { cssEasing } from './easing';
import { progressAt, sampleKeyframes, sampleTrack, transformAt, type Animation } from './keyframes';
import { hubKeyframes } from './keyframes/hub.generated';
import { screenKeyframes } from './keyframes/screens.generated';
import { sharedKeyframes } from './keyframes/shared.generated';

describe('the generated keyframes', () => {
  it('are up to date with the prototype (run `pnpm --filter @yapling/theme gen`)', () => {
    for (const group of keyframeGroups) {
      const file = join(import.meta.dirname, 'keyframes', `${group.file}.generated.ts`);
      expect(readFileSync(file, 'utf8'), group.file).toBe(
        keyframeModuleSource(group, groupKeyframes(group)),
      );
    }
  });

  it('cover every @keyframes of the first week, the shared helpers and the hub', () => {
    const names = (file: string) => [...keyframeBodies(readDesign(file)).keys()].sort();
    expect(Object.keys(screenKeyframes).sort()).toEqual(names('Yapling Week 1.dc.html'));
    expect(Object.keys(sharedKeyframes).sort()).toEqual(
      [...names('art/yap-dc.js'), 'yjump'].sort(),
    );
    expect(Object.keys(hubKeyframes).sort()).toEqual(names('Yapling Prototype.dc.html'));
    expect(Object.keys(screenKeyframes)).toHaveLength(26);
    expect(Object.keys(sharedKeyframes)).toHaveLength(16);
  });
});

/** Values read off the prototype by hand, independent of the parser. */
describe('keyframe stops equal the prototype', () => {
  it('pop squashes to 1.2 × 0.84 at 45 % and settles through 0.9 × 1.1 and 1.04 × 0.97', () => {
    const { scaleX, scaleY } = screenKeyframes.ypop.tracks;
    expect(scaleX.map((s) => [s.at, s.value])).toEqual([
      [0, 0],
      [0.45, 1.2],
      [0.65, 0.9],
      [0.82, 1.04],
      [1, 1],
    ]);
    expect(scaleY.map((s) => s.value)).toEqual([0, 0.84, 1.1, 0.97, 1]);
  });

  it('zoom starts at 86 % with 40-point corners and no opacity', () => {
    const { tracks } = screenKeyframes.zIn;
    expect(tracks.scaleX[0]?.value).toBe(0.86);
    expect(tracks.borderRadius[0]?.value).toBe(40);
    expect(tracks.opacity.map((s) => s.value)).toEqual([0, 1]);
  });

  it('push and back shift the old screen 28 % and dim it to 0.82', () => {
    expect(screenKeyframes.pOut.tracks.translateXPercent.at(-1)?.value).toBe(-28);
    expect(screenKeyframes.pOut.tracks.filter.at(-1)?.value).toEqual({ brightness: 0.82 });
    expect(screenKeyframes.bIn.tracks.translateXPercent[0]?.value).toBe(-28);
  });

  it('the toast holds from 10 % to 86 %, centred on its own width', () => {
    const { tracks } = screenKeyframes.ytoast;
    expect(tracks.opacity.map((s) => [s.at, s.value])).toEqual([
      [0, 0],
      [0.1, 1],
      [0.86, 1],
      [1, 0],
    ]);
    expect(new Set(tracks.translateXPercent.map((s) => s.value))).toEqual(new Set([-50]));
    expect(tracks.translateY.map((s) => s.value)).toEqual([-24, 0, 0, -10]);
  });

  it('the mic glow breathes its lilac ring from 8 to 20 points over a 4-point ink lip', () => {
    const glow = screenKeyframes.yglow.tracks.boxShadow;
    expect(glow.map((s) => s.value[1]?.spread)).toEqual([8, 20, 8]);
    expect(glow[0]?.value[0]).toEqual({ x: 0, y: 4, blur: 0, spread: 0, colour: '#17131C' });
  });

  it('the wordmark types in by closing its letters from -0.2 em to -0.065 em', () => {
    expect(screenKeyframes.ytype.tracks.letterSpacingEm.map((s) => s.value)).toEqual([
      -0.2, -0.04, -0.065,
    ]);
  });

  it('a panel keeps its own tilt (`--r`, 0 when unset)', () => {
    expect(sharedKeyframes.ypanel.tracks.rotate[0]?.value).toEqual({ var: 'r', fallback: 0 });
  });
});

describe('sampling', () => {
  const pop: Animation = {
    keyframes: screenKeyframes.ypop,
    durationMs: 600,
    delayMs: 150,
    easing: cssEasing.easeOut,
    iterations: 1,
    fill: 'both',
  };

  it('hits every stop exactly and eases between them per segment', () => {
    const track = screenKeyframes.ypop.tracks.scaleX;
    expect(sampleTrack(track, 0.45, cssEasing.linear)).toBeCloseTo(1.2);
    expect(sampleTrack(track, 0.225, cssEasing.linear)).toBeCloseTo(0.6);
    expect(sampleTrack(track, 0.225, cssEasing.easeOut)).toBeGreaterThan(0.6);
    expect(sampleKeyframes(screenKeyframes.ypop, 1, cssEasing.easeOut)).toEqual({
      scaleX: 1,
      scaleY: 1,
    });
  });

  it('turns percent translations into points for a known box', () => {
    expect(transformAt(screenKeyframes.pIn, 0, cssEasing.linear)).toEqual([{ translateX: '100%' }]);
    expect(
      transformAt(screenKeyframes.pIn, 0, cssEasing.linear, { box: { width: 390, height: 844 } }),
    ).toEqual([{ translateX: 390 }]);
    expect(transformAt(sharedKeyframes.ypanel, 1, cssEasing.linear, { vars: { r: -3 } })).toEqual([
      { translateY: 0 },
      { rotate: '-3deg' },
    ]);
  });

  it('holds the first frame during the delay and the last after the end', () => {
    expect(progressAt(pop, 0)).toBe(0);
    expect(progressAt(pop, 450)).toBeCloseTo(0.5);
    expect(progressAt(pop, 2000)).toBe(1);
    expect(progressAt({ ...pop, fill: 'none' }, 0)).toBeNull();
  });

  it('loops, staggers and jitters', () => {
    const loop: Animation = {
      ...pop,
      delayMs: 0,
      iterations: Infinity,
      fill: 'none',
      staggerMs: 150,
      jitterMs: 1600,
    };
    expect(progressAt(loop, 900)).toBeCloseTo(0.5);
    expect(progressAt(loop, 300, 0, 1)).toBeCloseTo(0.25);
    expect(progressAt(loop, 0, 0.5)).toBeCloseTo((800 % 600) / 600);
  });
});
