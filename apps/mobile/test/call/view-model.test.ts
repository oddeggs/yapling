import { describe, expect, it } from '@jest/globals';
import type { CallServerFrame, HeardWord } from '@yapling/contracts';
import { getScene } from '@yapling/story';

import { layoutFor } from '../../src/features/call/scene-layout';
import {
  FIXED_SHOWN_MS,
  initialTracker,
  reduceTracker,
  type TrackerEvent,
  type TrackerState,
} from '../../src/features/call/tracker';
import { callView, type CallViewInput } from '../../src/features/call/view-model';
import { initialCallState, update, type CallState } from '../../src/voice/call-state';

const episode = getScene('s1-e1');
const practice = getScene('s1-e1-practice');
const teach = getScene('s1-e1-real-week');

type FrameBody = CallServerFrame extends infer F
  ? F extends { seq: number }
    ? Omit<F, 'seq'>
    : never
  : never;

let seq = 0;
const frame = (body: FrameBody, now = 0): TrackerEvent => ({
  type: 'frame',
  frame: { ...body, seq: ++seq } as CallServerFrame,
  now,
});

function track(scene = episode, events: TrackerEvent[], from: TrackerState = initialTracker) {
  return events.reduce((s, e) => reduceTracker(s, e, { scene, stage: 'newcomer' }), from);
}

const connected = (patch: Partial<CallState> = {}, mode: CallState['turnMode'] = 'hold_to_talk') =>
  update(update(initialCallState(mode), { phase: 'connecting' }), { connected: true, ...patch });

function view(
  call: CallState,
  tracker: TrackerState,
  scene = episode,
  extra: Partial<CallViewInput> = {},
) {
  return callView({
    call,
    tracker,
    scene,
    layout: layoutFor(scene),
    stage: 'newcomer',
    firstLanguage: 'vi',
    now: 0,
    micDenied: false,
    connectFailed: false,
    ...extra,
  });
}

const caption = (streamId: number, character: 'pip' | 'mei', text: string) =>
  ({ streamId, character, source: 'live', text }) as const;

describe('ringing and errors', () => {
  it('rings while the socket opens, then goes live', () => {
    const ringing = update(initialCallState('hold_to_talk'), { phase: 'connecting' });
    expect(view(ringing, initialTracker).mode).toBe('ringing');
    expect(view(connected(), initialTracker).mode).toBe('live');
    // Retrying before the first answer still rings; a drop mid-call doesn't.
    expect(view(update(ringing, { reconnecting: true }), initialTracker).mode).toBe('ringing');
    const dropped = update(connected({ sessionId: 'abc' }), {
      connected: false,
      reconnecting: true,
    });
    expect(view(dropped, initialTracker).mode).toBe('live');
  });

  it('shows no connection when the socket is lost or never came up', () => {
    expect(view(connected({ error: 'no_connection' }), initialTracker).mode).toBe('error_net');
    const ringing = update(initialCallState('hold_to_talk'), { phase: 'connecting' });
    expect(view(ringing, initialTracker, episode, { connectFailed: true }).mode).toBe('error_net');
  });

  it('explains the microphone when it is off for the app', () => {
    expect(view(connected(), initialTracker, episode, { micDenied: true }).mode).toBe('error_mic');
  });

  it('ends in the kind wrap-up when the minutes run out, not an error sheet', () => {
    const v = view(connected({ endReason: 'minutes_exhausted' }), initialTracker);
    expect(v.mode).toBe('live');
    expect(v.sceneDone).toBe(true);
    expect(v.mic).toBe('idle');
  });

  it('ends without an error sheet when the call has no such scene', () => {
    const v = view(connected({ error: 'unknown_scene' }), initialTracker);
    expect(v.mode).toBe('live');
    expect(v.sceneDone).toBe(true);
  });

  it('counts the seconds while the scene wraps up', () => {
    const v = view(connected({ wrappingUp: true, secondsLeft: 48 }), initialTracker);
    expect(v.wrapUpSeconds).toBe(48);
    expect(view(connected({ secondsLeft: 300 }), initialTracker).wrapUpSeconds).toBeNull();
  });

  it('opens the safety sheet on a crisis', () => {
    expect(view(connected({ safety: 'crisis' }), initialTracker).safety).toBe(true);
  });
});

describe('the mic', () => {
  const onAnswerBeat = track(episode, [
    frame({ type: 'beat', beatId: 'ask-whats-wrong', progress: 0.1 }),
  ]);
  const onRecBeat = track(episode, [frame({ type: 'beat', beatId: 'notice', progress: 0.05 })]);

  it('says who is talking while a line plays', () => {
    const v = view(
      connected({ playing: true, caption: caption(3, 'pip', 'She looks sad.') }),
      onRecBeat,
    );
    expect(v.mic).toBe('speaking');
    expect(v.talking).toBe('pip');
  });

  it("is the learner's turn only on a beat that waits for them", () => {
    expect(view(connected(), onAnswerBeat).mic).toBe('yourTurn');
    expect(view(connected(), onRecBeat).mic).toBe('idle');
  });

  it('listens while held, and listens on its own in hands-free once the learner speaks', () => {
    expect(view(connected({ talkHeld: true }), onAnswerBeat).mic).toBe('listening');
    expect(view(connected({}, 'hands_free'), onAnswerBeat).mic).toBe('yourTurn');
    expect(view(connected({ learnerSpeaking: true }, 'hands_free'), onAnswerBeat).mic).toBe(
      'listening',
    );
  });

  it('says a hands-free turn with no words quietly, never with the tip to hold', () => {
    const quiet = view(connected({ notice: 'not_heard' }, 'hands_free'), onAnswerBeat);
    expect(quiet).toMatchObject({ tip: null, notHeardQuietly: true });
    const held = view(connected({ notice: 'not_heard' }), onAnswerBeat);
    expect(held).toMatchObject({ tip: 'not_heard', notHeardQuietly: false });
  });

  it('waits while "Chờ chút" is on', () => {
    expect(view(connected({ onHold: true }), onAnswerBeat).mic).toBe('paused');
  });
});

describe('the bubble', () => {
  it("follows the live caption, with the written line's gloss", () => {
    const t = track(episode, [
      frame({ type: 'play_rec', streamId: 2, lineId: 's1-e1-03', character: 'pip' }),
    ]);
    const v = view(
      connected({
        playing: true,
        caption: { ...caption(2, 'pip', 'She looks sad.'), source: 'recorded' },
      }),
      t,
    );
    expect(v.bubble?.text).toBe('She looks sad.');
    expect(v.bubble?.playing).toBe(true);
    expect(v.bubble?.gloss).toBeTruthy();
  });

  it('shows the dots, not the reaction clip, until the reply has words', () => {
    const t = track(episode, [
      frame({ type: 'play_rec', streamId: 5, lineId: 's1-react-mei-ooh', character: 'mei' }),
    ]);
    expect(t.reactions).toEqual([5]);
    const v = view(connected({ playing: true, caption: caption(5, 'mei', 'Ooh,') }), t);
    expect(v.bubble?.thinking).toBe(true);
    expect(v.bubble?.text).toBe('');
    expect(view(connected({ playing: true, caption: caption(6, 'mei', '') }), t).bubble).toBeNull();
  });

  it('thinks and shows the dots while the server thinks', () => {
    const t = track(episode, [frame({ type: 'beat', beatId: 'ask-whats-wrong', progress: 0.1 })]);
    const v = view(connected({ awaitingReply: true, serverThinking: true }), t);
    expect(v.bubble?.thinking).toBe(true);
    expect(v.thinker).toBe('mei');
    // A face the rig moves: the thinking is her act.
    expect(v.moods.mei).toBe('listen');
  });
});

describe("the learner's caption", () => {
  it("shows this turn's words, never the last turn's line", () => {
    const heardOnce = track(episode, [
      frame({ type: 'beat', beatId: 'ask-whats-wrong', progress: 0.1 }),
      { type: 'speech_started' },
      frame({ type: 'heard', turn: 1, text: "Mei, what's wrong?", words: [] }),
    ]);
    const thinking = connected({
      awaitingReply: true,
      learnerText: "Mei, what's wrong?",
      learnerFinal: true,
    });
    expect(view(thinking, heardOnce).you).toEqual({ text: "Mei, what's wrong?", heard: true });
    // The next turn starts: the old line stays in the engine until a partial arrives.
    const again = track(episode, [{ type: 'speech_started' }], heardOnce);
    const held = connected({
      talkHeld: true,
      learnerText: "Mei, what's wrong?",
      learnerFinal: true,
    });
    expect(view(held, again).you).toBeNull();
    const partial = connected({ talkHeld: true, learnerText: 'Can I', learnerFinal: false });
    expect(view(partial, again).you).toEqual({ text: 'Can I', heard: false });
  });
});

describe('hints', () => {
  const asked = track(episode, [
    frame({ type: 'beat', beatId: 'ask-whats-wrong', progress: 0.1 }),
    frame({ type: 'hint', phrase: "What's wrong?", gloss: 'Có chuyện gì vậy?' }),
  ]);

  it('slides up on the learner turn after the pause', () => {
    expect(view(connected(), asked).hint).toEqual({
      phrase: "What's wrong?",
      gloss: 'Có chuyện gì vậy?',
    });
  });

  it('hides on a tap, while the learner talks, once heard, and on the next beat', () => {
    expect(track(episode, [{ type: 'hint_dismissed' }], asked).hint).toBeNull();
    const talking = track(episode, [{ type: 'speech_started' }], asked);
    expect(view(connected({ talkHeld: true }), talking).hint).toBeNull();
    // A tap or a hold with no words: the hint is still there for the next try.
    const notHeard = track(episode, [frame({ type: 'not_heard' })], talking);
    expect(view(connected({ notice: 'not_heard' }), notHeard).hint).not.toBeNull();
    expect(
      track(episode, [frame({ type: 'heard', turn: 1, text: 'Hi', words: [] })], talking).hint,
    ).toBeNull();
    expect(
      track(episode, [frame({ type: 'beat', beatId: 'mei-deflects', progress: 0.2 })], asked).hint,
    ).toBeNull();
  });

  it('stays hidden while a character talks', () => {
    expect(
      view(connected({ playing: true, caption: caption(1, 'mei', 'Hi') }), asked).hint,
    ).toBeNull();
  });
});

describe('the correction, in two beats', () => {
  const asking = track(episode, [
    frame({ type: 'beat', beatId: 'office-answers', progress: 0.5 }),
    frame({
      type: 'correction',
      targetId: 'present-progressive',
      original: "Hi, I'm Lan. I calling for Mei.",
      prompt: "You… calling? Or you're calling?",
    }),
  ]);

  it('first asks it back and waits, showing what the learner said', () => {
    const v = view(connected(), asking);
    expect(v.correcting).toBe(true);
    expect(v.you).toEqual({ text: "Hi, I'm Lan. I calling for Mei.", heard: true });
    expect(v.mic).toBe('yourTurn');
  });

  it('sparkles only after the learner fixes it themselves', () => {
    const fixed = track(
      episode,
      [frame({ type: 'correction_resolved', targetId: 'x', fixed: true }, 1000)],
      asking,
    );
    const v = view(connected(), fixed, episode, { now: 1500 });
    expect(v.correcting).toBe(false);
    expect(v.fixed).toBe(true);
    expect(view(connected(), fixed, episode, { now: 1000 + FIXED_SHOWN_MS + 1 }).fixed).toBe(false);
  });

  it('moves on quietly when the second try still has it', () => {
    const notFixed = track(
      episode,
      [frame({ type: 'correction_resolved', targetId: 'x', fixed: false })],
      asking,
    );
    const v = view(connected(), notFixed, episode, { now: 10 });
    expect(v.correcting).toBe(false);
    expect(v.fixed).toBe(false);
  });
});

describe('what does that mean', () => {
  const line = { speaker: 'mei', text: 'Aiyah, nothing lah.', lineId: null };
  const said = connected({ caption: caption(4, 'mei', 'Aiyah, nothing lah.') });

  it('offers the chip under a generated line, and the tap-to-gloss under a written one', () => {
    const t = track(episode, [frame({ type: 'beat', beatId: 'mei-deflects', progress: 0.2 })]);
    expect(view(said, t).meaningChip).toBe(true);
    const written = track(episode, [
      frame({ type: 'play_rec', streamId: 2, lineId: 's1-e1-03', character: 'pip' }),
    ]);
    const v = view(
      connected({ caption: { ...caption(2, 'pip', 'She looks sad.'), source: 'recorded' } }),
      written,
    );
    expect(v.meaningChip).toBe(false);
    expect(v.bubble?.gloss).toBeTruthy();
  });

  it('shows simple English first, and the translation only on a further tap', () => {
    const asked = track(episode, [{ type: 'meaning_requested', line }]);
    expect(view(said, asked).meaning?.phase).toBe('asked');
    const answered = track(
      episode,
      [
        frame({
          type: 'meaning',
          about: line.text,
          simple: 'She says it is nothing.',
          gloss: 'Không có gì đâu.',
        }),
      ],
      asked,
    );
    const v = view(connected({ caption: caption(5, 'pip', 'She says it is nothing.') }), answered);
    expect(v.meaning?.phase).toBe('shown');
    expect(v.meaning?.simple).toBe('She says it is nothing.');
    // The line asked about stays in the bubble while Pip explains.
    expect(v.bubble?.text).toBe('Aiyah, nothing lah.');
    expect(v.meaningChip).toBe(false);
    // The explanation is spoken; the line after it takes the bubble again.
    const spoken = track(
      episode,
      [
        frame({
          type: 'say_start',
          streamId: 5,
          character: 'pip',
          codec: 'pcm16',
          sampleRateHz: 24000,
        }),
      ],
      answered,
    );
    expect(
      view(connected({ caption: caption(5, 'pip', 'She says it is nothing.') }), spoken).bubble
        ?.text,
    ).toBe('Aiyah, nothing lah.');
    expect(
      view(connected({ caption: caption(6, 'mei', 'Okay, it is this letter.') }), spoken).bubble
        ?.text,
    ).toBe('Okay, it is this letter.');
    expect(view(connected(), spoken).meaning?.phase).toBe('shown');
    const revealed = track(episode, [{ type: 'translation_shown' }], answered);
    expect(revealed.meaning?.phase).toBe('translated');
    // "Hide translation" folds it back to the simple English.
    expect(track(episode, [{ type: 'translation_hidden' }], revealed).meaning?.phase).toBe('shown');
    expect(track(episode, [{ type: 'meaning_closed' }], revealed).meaning).toBeNull();
  });

  it('has no translation to reveal without a gloss', () => {
    const answered = track(episode, [
      { type: 'meaning_requested', line },
      frame({ type: 'meaning', about: line.text, simple: 'Nothing.', gloss: null }),
      { type: 'translation_shown' },
    ]);
    expect(answered.meaning?.phase).toBe('shown');
  });
});

describe('in-call beats', () => {
  it('shows the letter, then the phone, and clears both when the call hangs up', () => {
    const letter = track(episode, [frame({ type: 'beat', beatId: 'letter', progress: 0.3 })]);
    expect(view(connected(), letter).letter?.lines.length).toBeGreaterThan(0);
    const ringing = track(
      episode,
      [frame({ type: 'beat', beatId: 'dial', progress: 0.5 })],
      letter,
    );
    expect(view(connected(), ringing).phone).toBe(true);
    const hungUp = track(
      episode,
      [frame({ type: 'beat', beatId: 'hang-up', progress: 0.8 })],
      ringing,
    );
    expect(view(connected(), hungUp).phone).toBe(false);
    expect(view(connected(), hungUp).letter).toBeNull();
  });

  it('puts a 30 s ring on the teach-back and starts it when the learner talks', () => {
    const t = track(teach, [frame({ type: 'beat', beatId: 'intro-1', progress: 0.2 })]);
    const v = view(connected(), t, teach);
    expect(v.timer?.total).toBe(30);
    expect(v.timer?.running).toBe(false);
    const talking = track(teach, [{ type: 'speech_started' }], t);
    expect(view(connected({ talkHeld: true }), talking, teach).timer?.running).toBe(true);
    // Thinking time is never on the clock: the ring holds while the learner is quiet.
    expect(view(connected(), talking, teach).timer?.running).toBe(false);
    expect(view(connected({ learnerSpeaking: true }), talking, teach).timer?.running).toBe(false);
    const handsFree = (patch: Partial<CallState>) =>
      view(connected(patch, 'hands_free'), talking, teach).timer?.running;
    expect(handsFree({ learnerSpeaking: true })).toBe(true);
    expect(handsFree({ learnerSpeaking: false })).toBe(false);
    const done = track(teach, [{ type: 'timer_done' }], talking);
    expect(view(connected(), done, teach).timer).toBeNull();
  });

  it('gives a fresh ring to a second round of the same length', () => {
    const first = track(teach, [frame({ type: 'beat', beatId: 'intro-1', progress: 0.2 })]);
    const second = track(
      teach,
      [
        frame({ type: 'beat', beatId: 'pip-tries', progress: 0.4 }),
        frame({ type: 'beat', beatId: 'intro-2', progress: 0.6 }),
      ],
      first,
    );
    expect(view(connected(), second, teach).timer?.key).not.toBe(
      view(connected(), first, teach).timer?.key,
    );
  });
});

describe('Pass it on', () => {
  const words = (startMs: number, n: number, gapMs = 100, wordMs = 300): HeardWord[] =>
    Array.from({ length: n }, (_, i) => ({
      word: 'word',
      startMs: startMs + i * (wordMs + gapMs),
      endMs: startMs + i * (wordMs + gapMs) + wordMs,
    }));

  it('runs the rounds 90, 60, 45 s with Pip, Linh, then Bea listening', () => {
    const t = track(practice, [frame({ type: 'beat', beatId: 'round-1', progress: 0.1 })]);
    const v = view(connected(), t, practice);
    expect(v.rounds?.map((r) => [r.listener, r.seconds, r.state])).toEqual([
      ['pip', 90, 'now'],
      ['linh', 60, 'next'],
      ['bea', 45, 'next'],
    ]);
    expect(v.timer?.total).toBe(90);
    const third = track(practice, [frame({ type: 'beat', beatId: 'round-3', progress: 0.8 })], t);
    expect(view(connected(), third, practice).rounds?.map((r) => r.state)).toEqual([
      'done',
      'done',
      'now',
    ]);
    expect(view(connected(), third, practice).timer?.total).toBe(45);
  });

  it('mirrors Flow, Pace and Pauses from the heard word timings after each round', () => {
    const t = track(practice, [
      frame({ type: 'beat', beatId: 'round-1', progress: 0.1 }),
      // Ten words, 300 ms each with 100 ms gaps: one 3.9 s run, 10 words in 3.9 s.
      frame({ type: 'heard', turn: 1, text: 'one', words: words(0, 10) }),
      frame({ type: 'beat', beatId: 'mirror-1', progress: 0.2 }),
    ]);
    const v = view(connected(), t, practice);
    expect(v.mirror?.rows).toEqual([
      { round: 1, flowSeconds: 3.9, paceWpm: 154, pausesPerMin: 0, share: 1 },
    ]);
    expect(v.mirror?.smoother).toBe(false);
  });

  it('says round three is smoother only when it is', () => {
    const base = [
      frame({ type: 'beat', beatId: 'round-1', progress: 0.1 }),
      // Two runs broken by a 1.2 s pause mid-sentence.
      frame({ type: 'heard', turn: 1, text: 'a', words: [...words(0, 4), ...words(2_800, 4)] }),
      frame({ type: 'beat', beatId: 'round-2', progress: 0.4 }),
      frame({ type: 'heard', turn: 2, text: 'b', words: words(0, 6) }),
      frame({ type: 'beat', beatId: 'round-3', progress: 0.7 }),
      frame({ type: 'heard', turn: 3, text: 'c', words: words(0, 8) }),
      frame({ type: 'beat', beatId: 'mirror-3', progress: 0.9 }),
    ];
    const v = view(connected(), track(practice, base), practice);
    const rows = v.mirror?.rows ?? [];
    expect(rows.map((r) => r.round)).toEqual([1, 2, 3]);
    expect(rows[0]?.pausesPerMin).toBeGreaterThan(0);
    expect(rows[2]?.share).toBe(1);
    expect(v.mirror?.smoother).toBe(true);
    // A new round clears the mirror.
    const next = track(
      practice,
      [frame({ type: 'beat', beatId: 'round-1', progress: 0 })],
      track(practice, base),
    );
    expect(view(connected(), next, practice).mirror).toBeNull();
  });
});

describe('a turn with no answer, a dropped line, a phone call', () => {
  const onTurn = () =>
    track(episode, [frame({ type: 'beat', beatId: 'ask-whats-wrong', progress: 0.1 })]);

  it("says the character didn't catch that, confused, and gives the turn back", () => {
    const v = view(connected({ notice: 'didnt_catch' }), onTurn());
    expect(v.bubble).toMatchObject({ speaker: 'mei', didntCatch: true, thinking: false });
    expect(v.mic).toBe('yourTurn');
    expect(v.moods.mei).toBe('confused');
  });

  it('shows the hold tip after a tap and the not-heard tip after a hold with no words', () => {
    expect(view(connected({ notice: 'hold_longer' }), onTurn()).tip).toBe('hold_longer');
    const notHeard = view(connected({ notice: 'not_heard' }), onTurn());
    expect(notHeard).toMatchObject({ tip: 'not_heard', mic: 'yourTurn' });
    // No character speaks for it: no bubble, nobody confused.
    expect(notHeard.bubble).toBeNull();
    expect(notHeard.moods.mei).not.toBe('confused');
    expect(view(connected({ notice: 'didnt_catch' }), onTurn()).tip).toBeNull();
    expect(view(connected(), onTurn()).tip).toBeNull();
  });

  it('keeps the beat and the turn on a not-heard frame', () => {
    const t = track(episode, [frame({ type: 'not_heard' })], onTurn());
    expect(t.beatId).toBe('ask-whats-wrong');
    expect(t.heard).toEqual([]);
  });

  it('shows the next line instead once a character speaks', () => {
    const v = view(
      connected({ notice: null, playing: true, caption: caption(9, 'mei', 'Oh! Sorry.') }),
      onTurn(),
    );
    expect(v.bubble?.didntCatch).toBeUndefined();
  });

  it('says the line is reconnecting, or paused for a phone call', () => {
    const live = connected({ sessionId: 'sess_1' });
    expect(view(update(live, { connected: false, reconnecting: true }), onTurn()).paused).toBe(
      'reconnecting',
    );
    expect(view(update(live, { interrupted: true }), onTurn()).paused).toBe('interrupted');
    expect(view(live, onTurn()).paused).toBeNull();
  });
});
