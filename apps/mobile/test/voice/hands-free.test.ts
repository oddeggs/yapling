import { describe, expect, it } from '@jest/globals';

import { HandsFreeGate } from '../../src/voice/hands-free';
import type { VadEvent } from '../../src/voice/vad';

/** A 20 ms frame whose samples all carry `v`, so the test can see which frames went out. */
const frame = (v: number) => new Int16Array(320).fill(v);
const start = (atMs: number): VadEvent => ({ type: 'speech_start', atMs });
const end = (atMs: number): VadEvent => ({ type: 'speech_end', atMs });

function setup() {
  const sent: number[] = [];
  const flags: string[] = [];
  let endTurns = 0;
  const gate = new HandsFreeGate(
    {
      sendMic: (pcm) => {
        const view = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
        for (let i = 0; i < pcm.byteLength; i += 640) sent.push(view.getInt16(i, true));
      },
      speech: (state, backMs) => flags.push(`${state}@${backMs}`),
      endTurn: () => {
        endTurns += 1;
      },
    },
    { chunkMs: 20, prerollMs: 60, tailMs: 100, settleMs: 40 },
  );
  let ms = 0;
  /** Feeds frame `v` (ending 20 ms after the last). */
  const feed = (v: number, speaking: boolean, event: VadEvent | null = null) => {
    ms += 20;
    gate.frame(frame(v), ms, speaking, event);
  };
  return { gate, sent, flags, feed, endTurns: () => endTurns, now: () => ms };
}

describe('hands-free listening', () => {
  it('sends nothing while the learner thinks, however long', () => {
    const { gate, sent, flags, feed, endTurns } = setup();
    // A minute of quiet: 3,000 frames.
    for (let i = 0; i < 3_000; i++) feed(1, false);
    expect(sent).toEqual([]);
    expect(flags).toEqual([]);
    expect(endTurns()).toBe(0);
    expect(gate.sentMs).toBe(0);
    expect(gate.heardMs).toBe(60_000);
  });

  it('opens on speech with the pre-roll first, flagging the start before any audio', () => {
    const { sent, flags, feed } = setup();
    [1, 2, 3, 4, 5].forEach((v) => feed(v, false));
    feed(6, true, start(60));
    // The start went before the pre-roll (the last 60 ms) and the frame that started it.
    expect(flags).toEqual(['start@0']);
    expect(sent).toEqual([3, 4, 5, 6]);
    feed(7, true);
    expect(sent.at(-1)).toBe(7);
  });

  it('keeps streaming through a pause after speech, then closes without ending the turn', () => {
    const { gate, sent, flags, feed, endTurns } = setup();
    feed(1, true, start(0));
    feed(2, true);
    // The VAD ends speech 40 ms after the last voiced frame (its hangover).
    feed(3, false, end(40));
    expect(flags).toEqual(['start@0', 'end@20']);
    expect(gate.state).toBe('tail');
    // The tail is 100 ms: five more frames, then quiet again.
    [4, 5, 6, 7, 8].forEach((v) => feed(v, false));
    expect(gate.state).toBe('idle');
    feed(9, false);
    expect(sent).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    // The call decides the turn from the pause: the phone never ends it on silence.
    expect(endTurns()).toBe(0);
  });

  it('keeps a long mid-sentence pause in one stream when speech resumes within the tail', () => {
    const { sent, flags, feed } = setup();
    feed(1, true, start(0));
    feed(2, false, end(20));
    feed(3, false);
    feed(4, true, start(60));
    feed(5, true);
    expect(flags).toEqual(['start@0', 'end@20', 'start@0']);
    expect(sent).toEqual([1, 2, 3, 4, 5]);
  });

  it('ends the turn on a tap: what is held goes, the speech ends, then end_turn', () => {
    const { gate, flags, feed, endTurns } = setup();
    feed(1, true, start(0));
    feed(2, true);
    expect(gate.finish()).toBe(true);
    expect(flags).toEqual(['start@0', 'end@0']);
    expect(endTurns()).toBe(1);
    expect(gate.state).toBe('idle');
  });

  it('ends the turn on a tap in the pause after speech', () => {
    const { gate, flags, feed, endTurns } = setup();
    feed(1, true, start(0));
    feed(2, false, end(20));
    expect(gate.finish()).toBe(true);
    expect(flags).toEqual(['start@0', 'end@20']);
    expect(endTurns()).toBe(1);
  });

  it('does nothing on a tap before the learner has said anything', () => {
    const { gate, sent, flags, feed, endTurns } = setup();
    feed(1, false);
    expect(gate.finish()).toBe(false);
    expect(sent).toEqual([]);
    expect(flags).toEqual([]);
    expect(endTurns()).toBe(0);
  });

  it('never listens while a character speaks, and waits for the echo to settle after', () => {
    const { gate, sent, feed } = setup();
    gate.setListening(false);
    // The character's own voice on the speaker.
    feed(1, true, start(0));
    feed(2, true);
    expect(sent).toEqual([]);
    gate.setListening(true);
    // Two settle frames: the line's tail echo goes nowhere.
    feed(3, false, end(40));
    feed(4, false);
    feed(5, false);
    expect(sent).toEqual([]);
    feed(6, true, start(120));
    // The pre-roll starts after the settle.
    expect(sent).toEqual([5, 6]);
  });

  it('hears a learner already speaking as the line ends, once the echo has settled', () => {
    const { gate, sent, flags, feed } = setup();
    gate.setListening(false);
    gate.setListening(true);
    feed(1, true);
    feed(2, true);
    expect(flags).toEqual(['start@0']);
    expect(sent).toEqual([2]);
  });

  it('ends the speech where a line cuts in, without ending the turn', () => {
    const { gate, flags, feed, endTurns } = setup();
    feed(1, true, start(0));
    gate.setListening(false);
    expect(flags).toEqual(['start@0', 'end@0']);
    expect(endTurns()).toBe(0);
    expect(gate.state).toBe('idle');
  });

  it('costs only the speech, the pre-roll and the tail', () => {
    const { gate, feed } = setup();
    for (let i = 0; i < 500; i++) feed(1, false);
    feed(1, true, start(0));
    for (let i = 0; i < 49; i++) feed(1, true);
    feed(1, false, end(0));
    for (let i = 0; i < 500; i++) feed(1, false);
    // 60 ms pre-roll + 1 s of speech + the end frame + 100 ms tail, of 21 s heard.
    expect(gate.sentMs).toBe(60 + 1_000 + 20 + 100);
    expect(gate.heardMs).toBe(21_020);
  });
});
