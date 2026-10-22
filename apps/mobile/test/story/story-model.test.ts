import { describe, expect, it } from '@jest/globals';

import { listenPlan, segmentsOf } from '../../src/features/story/plan';
import {
  currentLine,
  formatDuration,
  isDone,
  lineEnded,
  playedFraction,
  postcardOf,
  seedEventFor,
  startFlow,
  storyLine,
  togglePause,
  visibleSegments,
  waveBars,
} from '../../src/features/story/story-model';

const plan = () => {
  const p = listenPlan('s1-e1-story', 'vi');
  if (!p) throw new Error('no plan');
  return p;
};

describe('the listening plan', () => {
  it("plays Pip's story, then the postcard that arrives the same day", () => {
    const p = plan();
    expect(p.scenes.map((s) => s.id)).toEqual(['s1-e1-story', 's1-e1-postcard']);
    expect(p.steps.map((s) => (s.kind === 'line' ? s.lineId : s.ui.type))).toEqual([
      's1-e1-story-seagull',
      'postcard',
      's1-e1-01',
    ]);
    expect(p.phrases.map((x) => x.id)).toEqual(['can-i-help']);
  });

  it('plays a postcard alone when the route names it', () => {
    const p = listenPlan('s1-e1-postcard', 'vi');
    expect(p?.scenes.map((s) => s.id)).toEqual(['s1-e1-postcard']);
  });

  it('has no plan for a scene that runs as a call', () => {
    expect(listenPlan('s1-e1-voicemail', 'vi')).toBeNull();
    expect(listenPlan('s1-e1', 'vi')).toBeNull();
    expect(listenPlan('nope', 'vi')).toBeNull();
  });

  it('splits the story into its glossed segments, each placed in the caption', () => {
    const segments = segmentsOf('s1-e1-story-seagull', 'vi');
    expect(segments.length).toBeGreaterThan(1);
    expect(segments[0]?.start).toBe(0);
    const starts = segments.map((s) => s.start);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
    for (const s of segments) expect(s.gloss).not.toBeNull();
    expect(segmentsOf('s1-e1-story-seagull', 'other').every((s) => s.gloss === null)).toBe(true);
  });

  it('gives a line without segments one segment: the whole caption', () => {
    const [only, ...rest] = segmentsOf('s1-e1-01', 'vi');
    expect(rest).toEqual([]);
    expect(only?.start).toBe(0);
    expect(only?.gloss).toBeTruthy();
  });
});

describe('the story flow', () => {
  it('starts on the story line and moves past the postcard card to its line', () => {
    const p = plan();
    let flow = startFlow(p);
    expect(currentLine(p, flow)?.lineId).toBe('s1-e1-story-seagull');
    expect(flow.step > (postcardOf(p)?.index ?? 0)).toBe(false);
    flow = lineEnded(p, flow, 0);
    expect(currentLine(p, flow)?.lineId).toBe('s1-e1-01');
    expect(flow.step > (postcardOf(p)?.index ?? 99)).toBe(true);
    expect(isDone(p, flow)).toBe(false);
    flow = lineEnded(p, flow, flow.step);
    expect(isDone(p, flow)).toBe(true);
    expect(currentLine(p, flow)).toBeNull();
  });

  it('ignores a late or repeated end', () => {
    const p = plan();
    const flow = lineEnded(p, startFlow(p), 0);
    expect(lineEnded(p, flow, 0)).toBe(flow);
    const done = lineEnded(p, flow, flow.step);
    expect(lineEnded(p, done, done.step)).toBe(done);
  });

  it('pauses and carries on where it was', () => {
    const p = plan();
    const paused = togglePause(startFlow(p));
    expect(paused.paused).toBe(true);
    expect(togglePause(paused)).toEqual(startFlow(p));
  });

  it('names the postcard sender and the line read from it', () => {
    const card = postcardOf(plan());
    expect(card?.from).toBe('linh');
    expect(card?.line?.lineId).toBe('s1-e1-01');
  });
});

describe('what the story shows as it plays', () => {
  const story = storyLine(plan());
  const segments = story?.line.segments ?? [];

  it('shows the first segment before a word is heard, and each next one as Pip reaches it', () => {
    expect(visibleSegments(segments, 0, false)).toHaveLength(1);
    const second = segments[1]?.start ?? 0;
    expect(visibleSegments(segments, second, false)).toHaveLength(1);
    expect(visibleSegments(segments, second + 1, false)).toHaveLength(2);
    expect(visibleSegments(segments, 0, true)).toHaveLength(segments.length);
  });

  it('fills the waveform with the audio clock', () => {
    expect(playedFraction(0, 29_120)).toBe(0);
    expect(playedFraction(14_560, 29_120)).toBeCloseTo(0.5);
    expect(playedFraction(40_000, 29_120)).toBe(1);
    expect(playedFraction(1_000, null)).toBe(0);
  });

  it("draws the prototype's waveform", () => {
    expect(waveBars(4, 22)).toEqual([6, 21, 14, 7]);
  });

  it('formats a duration as minutes and seconds', () => {
    expect(formatDuration(29_120)).toBe('0:29');
    expect(formatDuration(40_000)).toBe('0:40');
    expect(formatDuration(65_400)).toBe('1:05');
  });
});

describe('tapping a line for its gloss', () => {
  const p = plan();
  const line = storyLine(p)?.line;
  if (!line) throw new Error('no story line');

  it('drops the target phrase the line carries as a seed', () => {
    const withPhrase = line.segments.find((s) => s.en.includes('Can I help'));
    if (!withPhrase) throw new Error('no segment with the phrase');
    expect(seedEventFor(p, line, withPhrase)).toEqual({
      scene: 's1-e1-story',
      lineId: 's1-e1-story-seagull',
      text: withPhrase.en,
      phraseId: 'can-i-help',
      phrase: 'Can I help?',
    });
  });

  it('reports a line without a target phrase as a plain reveal', () => {
    const first = line.segments[0];
    if (!first) throw new Error('no segment');
    expect(seedEventFor(p, line, first).phraseId).toBeNull();
  });
});
