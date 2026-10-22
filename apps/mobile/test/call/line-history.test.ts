import { describe, expect, it } from '@jest/globals';
import type { CallServerFrame } from '@yapling/contracts';
import { getLine, getScene } from '@yapling/story';

import { layoutFor } from '../../src/features/call/scene-layout';
import {
  LOCAL_STREAMS_FROM,
  noteShown,
  saidLines,
  transcriptOf,
  turnPage,
  type SpokenLine,
} from '../../src/features/call/line-history';
import {
  initialTracker,
  reduceTracker,
  type TrackerEvent,
  type TrackerState,
} from '../../src/features/call/tracker';
import { callView } from '../../src/features/call/view-model';
import {
  initialCallState,
  update,
  type CallState,
  type CaptionLine,
} from '../../src/voice/call-state';

const episode = getScene('s1-e1');
const practice = getScene('s1-e1-practice');

type FrameBody = CallServerFrame extends infer F
  ? F extends { seq: number }
    ? Omit<F, 'seq'>
    : never
  : never;
let seq = 0;
const frame = (body: FrameBody): TrackerEvent => ({
  type: 'frame',
  frame: { ...body, seq: ++seq } as CallServerFrame,
  now: 0,
});

const cap = (streamId: number, character: 'pip' | 'mei', text: string): CaptionLine => ({
  streamId,
  character,
  source: 'live',
  text,
});
const shown = (c: CaptionLine): TrackerEvent => ({ type: 'line_shown', caption: c });
const heard = (turn: number, text: string): TrackerEvent =>
  frame({ type: 'heard', turn, text, words: [] });

function track(events: TrackerEvent[], scene = episode, from: TrackerState = initialTracker) {
  return events.reduce((s, e) => reduceTracker(s, e, { scene, stage: 'newcomer' }), from);
}

const ctx = { recorded: {}, reactions: [], heardCount: 0 };

describe('the line history', () => {
  it('adds a line once it shows and keeps its caption up to date as it grows', () => {
    let lines: readonly SpokenLine[] = [];
    lines = noteShown(lines, cap(3, 'mei', ''), ctx);
    lines = noteShown(lines, cap(3, 'mei', 'Oh, hello'), ctx);
    lines = noteShown(lines, cap(3, 'mei', 'Oh, hello there.'), ctx);
    expect(lines).toEqual([
      { streamId: 3, speaker: 'mei', text: 'Oh, hello there.', lineId: null, turn: 0 },
    ]);
    // A caption that empties (the next line's audio not in yet) keeps the words.
    expect(noteShown(lines, cap(3, 'mei', ''), ctx)).toBe(lines);
  });

  it('leaves out reaction clips and lines the phone replays on its own', () => {
    const lines = noteShown([], cap(5, 'pip', 'Ooh,'), { ...ctx, reactions: [5] });
    expect(lines).toEqual([]);
    expect(noteShown([], cap(LOCAL_STREAMS_FROM + 1, 'mei', 'Hi'), ctx)).toEqual([]);
  });

  it('pages through the lines of one turn only', () => {
    const lines: SpokenLine[] = [
      { streamId: 1, speaker: 'mei', text: 'A', lineId: null, turn: 0 },
      { streamId: 2, speaker: 'pip', text: 'B', lineId: null, turn: 0 },
      { streamId: 4, speaker: 'mei', text: 'C', lineId: null, turn: 1 },
      { streamId: 5, speaker: 'pip', text: '', lineId: null, turn: 1 },
      { streamId: 6, speaker: 'pip', text: 'D', lineId: null, turn: 1 },
    ];
    expect(turnPage(lines, 2)).toEqual({ index: 1, count: 2, prev: 1, next: null });
    // A line with no words isn't a page.
    expect(turnPage(lines, 4)).toEqual({ index: 0, count: 2, prev: null, next: 6 });
    expect(turnPage(lines, 5)).toBeNull();
    expect(saidLines(lines).map((l) => l.text)).toEqual(['A', 'B', 'C', 'D']);
  });

  it("lists the call with the learner's turns between the lines", () => {
    const lines: SpokenLine[] = [
      { streamId: 1, speaker: 'mei', text: 'A', lineId: null, turn: 0 },
      { streamId: 2, speaker: 'pip', text: 'B', lineId: null, turn: 0 },
      { streamId: 4, speaker: 'mei', text: 'C', lineId: null, turn: 2 },
    ];
    const turns = [
      { beatId: null, turn: 1, text: "What's wrong?", words: [] },
      { beatId: null, turn: 2, text: '', words: [] },
    ];
    expect(transcriptOf(lines, turns)).toEqual([
      { kind: 'line', line: lines[0] },
      { kind: 'line', line: lines[1] },
      { kind: 'you', turn: 0, text: "What's wrong?" },
      { kind: 'line', line: lines[2] },
    ]);
  });
});

describe('the tracker keeps the history', () => {
  it('groups lines by the learner turns heard before them, with recorded line ids', () => {
    const s = track([
      frame({ type: 'play_rec', streamId: 1, lineId: 's1-e1-02', character: 'mei' }),
      shown({ ...cap(1, 'mei', getLine('s1-e1-02').caption), source: 'recorded' }),
      shown(cap(2, 'pip', 'She looks sad.')),
      heard(1, "What's wrong?"),
      shown(cap(3, 'mei', 'The rent doubled!')),
    ]);
    expect(s.lines.map((l) => [l.streamId, l.turn, l.lineId])).toEqual([
      [1, 0, 's1-e1-02'],
      [2, 0, null],
      [3, 1, null],
    ]);
  });

  it('goes back to an earlier line until a new line plays or the learner talks', () => {
    const base = track([shown(cap(1, 'mei', 'One.')), shown(cap(2, 'pip', 'Two.'))]);
    const back = track([{ type: 'browse', streamId: 1 }], episode, base);
    expect(back.browsing).toBe(1);
    // The caption growing doesn't take the bubble back; a new line does.
    expect(track([shown(cap(2, 'pip', 'Two, three.'))], episode, back).browsing).toBe(1);
    expect(track([shown(cap(3, 'mei', 'Four.'))], episode, back).browsing).toBeNull();
    expect(track([{ type: 'speech_started' }], episode, back).browsing).toBeNull();
  });

  it("keeps the call's resume token from ready", () => {
    const s = track([
      frame({
        type: 'ready',
        sessionId: 'call_1',
        secondsLeft: 600,
        recordedLineBaseUrl: null,
        resumeToken: 'abc.def',
        resumed: false,
      }),
    ]);
    expect(s.callToken).toBe('abc.def');
  });
});

describe('the bubble pages and translates', () => {
  const connected = (patch: Partial<CallState> = {}) =>
    update(update(initialCallState('hold_to_talk'), { phase: 'connecting' }), {
      connected: true,
      ...patch,
    });
  const view = (call: CallState, tracker: TrackerState, scene = episode, stage = 'newcomer') =>
    callView({
      call,
      tracker,
      scene,
      layout: layoutFor(scene),
      stage: stage as 'newcomer',
      firstLanguage: 'vi',
      now: 0,
      micDenied: false,
      connectFailed: false,
    });

  const twoLines = track([shown(cap(1, 'mei', 'One.')), shown(cap(2, 'pip', 'Two.'))]);
  const after = connected({ caption: cap(2, 'pip', 'Two.'), playing: false });

  it('shows "2 of 2" once the last line has played, and none while it plays', () => {
    expect(view(after, twoLines).bubble?.page).toEqual({ index: 1, count: 2, prev: 1, next: null });
    expect(view({ ...after, playing: true }, twoLines).bubble?.page).toBeNull();
  });

  it("shows the earlier line, still, in its speaker's place, without the meaning chip", () => {
    const back = track([{ type: 'browse', streamId: 1 }], episode, twoLines);
    const v = view(after, back);
    expect(v.bubble).toMatchObject({
      speaker: 'mei',
      text: 'One.',
      playing: false,
      earlier: true,
      page: { index: 0, count: 2, next: 2 },
    });
    expect(v.meaningChip).toBe(false);
  });

  it('offers a generated line in Vietnamese at Newcomer, not from Regular, not in Pass it on', () => {
    expect(view(after, twoLines).bubble).toMatchObject({ gloss: null, translatable: true });
    expect(view(after, twoLines, episode, 'regular').bubble?.translatable).toBe(false);
    expect(view(after, twoLines, practice).bubble?.translatable).toBe(false);
  });
});
