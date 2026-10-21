import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { AudioContext } from 'react-native-audio-api';

import type { Lipsync } from '../../src/voice/lipsync';
import { CallPlayer, type LineInfo } from '../../src/voice/player';

/** A recording stand-in for the audio graph: a settable clock and the starts it was asked for. */
class FakeContext {
  sampleRate = 24_000;
  currentTime = 0;
  state = 'running';
  destination = {};
  starts: { at: number; frames: number }[] = [];
  decodes: ((b: unknown) => void)[] = [];

  createBuffer(_ch: number, length: number, rate: number) {
    return { length, duration: length / rate, sampleRate: rate, copyToChannel: () => undefined };
  }
  createBufferSource() {
    const node = {
      buffer: null as { length: number } | null,
      connect: () => undefined,
      disconnect: () => undefined,
      stop: () => undefined,
      start: (when: number) => this.starts.push({ at: when, frames: node.buffer?.length ?? 0 }),
    };
    return node;
  }
  decodeAudioData() {
    return new Promise((resolve) => this.decodes.push(resolve));
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
}

const lipsync = () => ({ source: { value: null } }) as unknown as Lipsync;
const pcm = (ms: number) => new Uint8Array((24_000 * ms * 2) / 1000);

function setup() {
  const ctx = new FakeContext();
  const events: string[] = [];
  const name = (l: LineInfo) => `${l.kind}:${l.streamId}`;
  const player = new CallPlayer({
    context: ctx as unknown as AudioContext,
    lipsync: lipsync(),
    recorded: (id) => (id === 'react-pip-ooh' ? { audio: 1, timing: null } : null),
    outputLatency: () => 0.01,
    playout: { prebufferMs: 120, leadMs: 30, maxWaitMs: 150 },
    events: {
      scheduled: (l) => events.push(`scheduled ${name(l)}`),
      ended: (l, interrupted) => events.push(`${interrupted ? 'cut' : 'ended'} ${name(l)}`),
      idle: () => events.push('idle'),
      failed: (l, why) => events.push(`failed ${name(l)} ${why}`),
    },
  });
  const advance = (seconds: number) => {
    ctx.currentTime += seconds;
    jest.advanceTimersByTime(seconds * 1000);
  };
  return { ctx, player, events, advance };
}

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe('character playback', () => {
  it('plays streamed TTS chunks back to back, sample-exact, then ends the line', () => {
    const { ctx, player, events, advance } = setup();
    player.startLive(5, 'pip', 'pcm16', 24_000);
    player.pushAudio(5, 2, pcm(100));
    expect(ctx.starts).toHaveLength(0); // waiting for the prebuffer
    player.pushAudio(5, 3, pcm(100));
    expect(ctx.starts).toHaveLength(2);
    const [a, b] = ctx.starts;
    // The second chunk starts on the sample after the first ends.
    expect(Math.floor((b?.at ?? 0) * 24_000) - Math.floor((a?.at ?? 0) * 24_000)).toBe(2400);
    expect(events).toEqual(['scheduled live:5']);
    player.endLive(5);
    advance(0.1);
    expect(events).not.toContain('ended live:5');
    advance(0.2);
    expect(events.slice(-2)).toEqual(['ended live:5', 'idle']);
  });

  it('plays a recorded reaction first and the streamed reply right after it', async () => {
    const { ctx, player, events, advance } = setup();
    player.playRecorded(1, 'react-pip-ooh', 'pip');
    player.startLive(2, 'pip', 'pcm16', 24_000);
    player.pushAudio(2, 1, pcm(300));
    player.endLive(2);
    advance(0.02);
    expect(ctx.starts).toHaveLength(0); // the reaction is still decoding
    ctx.decodes[0]?.({ length: 9600, duration: 0.4 });
    await Promise.resolve();
    advance(0.02);
    expect(ctx.starts.map((s) => s.frames)).toEqual([9600, 7200]);
    const [reaction, reply] = ctx.starts;
    expect((reply?.at ?? 0) - (reaction?.at ?? 0)).toBeCloseTo(0.4, 3);
    expect(events.slice(0, 2)).toEqual(['scheduled recorded:1', 'scheduled live:2']);
    advance(1);
    expect(events.filter((e) => e.startsWith('ended'))).toEqual([
      'ended recorded:1',
      'ended live:2',
    ]);
  });

  it('reports a recorded line it cannot find, and does not hold later lines behind it', async () => {
    const { ctx, player, events, advance } = setup();
    player.playRecorded(1, 'missing-line', 'pip');
    player.startLive(2, 'pip', 'pcm16', 24_000);
    player.pushAudio(2, 1, pcm(200));
    await Promise.resolve();
    await Promise.resolve();
    advance(0.02);
    expect(events[0]).toMatch(/^failed recorded:1/);
    expect(events).toContain('cut recorded:1');
    expect(ctx.starts).toHaveLength(1);
  });

  it('starts the graph again before scheduling when it was stopped', async () => {
    const { ctx, player, advance } = setup();
    ctx.state = 'suspended';
    player.startLive(3, 'pip', 'pcm16', 24_000);
    player.pushAudio(3, 1, pcm(200));
    expect(ctx.starts).toHaveLength(0);
    await Promise.resolve();
    advance(0.02);
    expect(ctx.state).toBe('running');
    expect(ctx.starts).toHaveLength(1);
  });

  it('cuts everything at once and says so for each line', () => {
    const { player, events } = setup();
    player.startLive(1, 'pip', 'pcm16', 24_000);
    player.startLive(2, 'mei', 'pcm16', 24_000);
    player.stopAll();
    expect(events).toEqual(['cut live:1', 'cut live:2', 'idle']);
  });
});
