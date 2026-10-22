import { describe, expect, it } from 'vitest';

import { PROTOCOL_VERSION } from '../primitives';
import { callRecordId, sessionId, token } from '../samples.test-data';
import { describeSchemas } from '../schema-runner.test-data';
import * as client from './client';
import { CALL_CLIENT_FRAME_TYPES, CallClientFrame } from './client';
import * as common from './common';
import { parseFrame, tolerant } from './common';
import * as server from './server';
import { CALL_SERVER_FRAME_TYPES, CallServerFrame } from './server';

const hello = {
  type: 'hello',
  seq: 1,
  protocol: PROTOCOL_VERSION,
  token,
  kind: 'episode',
  sceneId: 's1-e1',
  stage: 'newcomer',
  firstLanguage: 'vi',
  clientVersion: '1.0.0+12',
  turnMode: 'hands_free',
  resumeToken: null,
};
const helloResume = { ...hello, kind: 'voicemail_reply', sceneId: 's1-e1-vm', resumeToken: token };
const placement = { ...hello, kind: 'placement', sceneId: 'placement', turnMode: 'hold_to_talk' };
const helloSlower = { ...hello, pace: 'slower' };
const helloDaily = { ...hello, kind: 'daily', sceneId: 's1-pm.can-i-help', stage: 'visitor' };

const endTurn = { type: 'end_turn', seq: 40 };
const hold = { type: 'hold', seq: 41, seconds: 10 };
const holdOff = { type: 'hold', seq: 42, seconds: 0 };
const hintRequest = { type: 'hint_request', seq: 43 };
const meaningLast = { type: 'meaning_request', seq: 44, subject: { kind: 'last_line' } };
const meaningPhrase = {
  type: 'meaning_request',
  seq: 45,
  subject: { kind: 'phrase', text: 'push that to Friday' },
};
const played = { type: 'played', seq: 46, streamId: 3, interrupted: false, lagMs: 1_240 };
const playedRec = { type: 'played', seq: 47, streamId: 4, interrupted: true, lagMs: null };
const hangup = { type: 'hangup', seq: 48 };
const speechStart = { type: 'speech', seq: 49, state: 'start', atMs: 1_200 };
const speechEnd = { type: 'speech', seq: 50, state: 'end', atMs: 2_840 };
const hangupTooHard = { type: 'hangup', seq: 51, reason: 'too_hard' };
const replay = { type: 'replay', seq: 52, slower: false };
const replaySlower = { type: 'replay', seq: 53, slower: true };
const paceSlower = { type: 'pace', seq: 54, pace: 'slower' };
const paceOwn = { type: 'pace', seq: 55, pace: null };

const clientFrames = [
  hello,
  helloResume,
  placement,
  endTurn,
  hold,
  holdOff,
  hintRequest,
  meaningLast,
  meaningPhrase,
  played,
  playedRec,
  speechStart,
  speechEnd,
  hangup,
  hangupTooHard,
  replay,
  replaySlower,
  paceSlower,
  paceOwn,
];

const ready = {
  type: 'ready',
  seq: 1,
  sessionId,
  secondsLeft: 600,
  recordedLineBaseUrl: 'https://cdn.yapling.app/lines/season-1',
  resumeToken: token,
  resumed: false,
};
const readyResumed = { ...ready, recordedLineBaseUrl: null, resumed: true, secondsLeft: 0 };
const partial = { type: 'partial', seq: 2, text: 'I am Lan, I work' };
const word = { word: 'Lan', startMs: 420, endMs: 700 };
const heard = {
  type: 'heard',
  seq: 3,
  turn: 1,
  text: 'I am Lan',
  words: [{ word: 'I', startMs: 0, endMs: 120 }, { word: 'am', startMs: 140, endMs: 300 }, word],
};
const heardSilent = { type: 'heard', seq: 4, turn: 2, text: '', words: [] };
const sayStart = {
  type: 'say_start',
  seq: 5,
  streamId: 3,
  character: 'pip',
  codec: 'pcm16',
  sampleRateHz: 24_000,
};
const sayStartMp3 = { ...sayStart, character: 'office', codec: 'mp3', sampleRateHz: 44_100 };
const alignment = {
  type: 'alignment',
  seq: 6,
  streamId: 3,
  chars: ['H', 'i', '!'],
  startMs: [0, 90, 160],
  endMs: [90, 160, 160],
};
const sayEnd = {
  type: 'say_end',
  seq: 7,
  streamId: 3,
  character: 'pip',
  text: 'Hi! Nice to meet you.',
};
const playRec = { type: 'play_rec', seq: 8, streamId: 4, lineId: 's1-e1-03', character: 'pip' };
const beat = { type: 'beat', seq: 9, beatId: 's1-e1.b02', progress: 0.25 };
const hint = { type: 'hint', seq: 10, phrase: 'Could I get…?', gloss: 'Cho tôi…?' };
const hintOther = { ...hint, gloss: null };
const choiceTea = { phrase: 'Tea, please.', gloss: 'Cho mình trà.' };
const choiceCoffee = { phrase: 'Coffee, please.', gloss: 'Cho mình cà phê.' };
const hintChoices = {
  ...hint,
  phrase: choiceTea.phrase,
  gloss: choiceTea.gloss,
  choices: [choiceTea, choiceCoffee],
  modelLineId: 's1-set5-03',
  persistent: true,
};
const hintOneCard = {
  ...hint,
  phrase: 'Hi!',
  gloss: 'Chào!',
  choices: [{ phrase: 'Hi!', gloss: 'Chào!' }],
  persistent: false,
};
const correction = {
  type: 'correction',
  seq: 11,
  targetId: 'past_ed',
  original: 'Yesterday I fix the sink',
  prompt: 'You fix it… every day? Or yesterday?',
};
const resolved = { type: 'correction_resolved', seq: 12, targetId: 'past_ed', fixed: true };
const meaning = {
  type: 'meaning',
  seq: 13,
  about: 'push that to Friday',
  simple: 'Move it to a later day: Friday.',
  gloss: 'Dời sang thứ Sáu',
};
const minutes = { type: 'minutes', seq: 14, secondsLeft: 60, wrappingUp: true };
const crisis = { type: 'safety', seq: 15, kind: 'crisis', resourcesKey: 'crisis.vn' };
const breakReminder = { type: 'safety', seq: 16, kind: 'break_reminder', resourcesKey: null };
const disclosure = { type: 'safety', seq: 17, kind: 'ai_disclosure', resourcesKey: null };
const thinking = { type: 'thinking', seq: 18, state: 'start' };
const notHeard = { type: 'not_heard', seq: 21 };
const error = { type: 'error', seq: 19, code: 'tts_failed', fatal: false };
const ended = {
  type: 'ended',
  seq: 20,
  reason: 'scene_complete',
  summaryPending: true,
  callRecordId,
};

const serverFrames = [
  ready,
  readyResumed,
  partial,
  heard,
  heardSilent,
  notHeard,
  sayStart,
  sayStartMp3,
  alignment,
  sayEnd,
  playRec,
  beat,
  hint,
  hintOther,
  hintChoices,
  hintOneCard,
  correction,
  resolved,
  meaning,
  minutes,
  crisis,
  breakReminder,
  disclosure,
  thinking,
  { ...thinking, state: 'stop' },
  ...server.CALL_ERROR_CODES.map((code, i) => ({ ...error, seq: 30 + i, code, fatal: i > 3 })),
  ...server.CALL_END_REASONS.map((reason, i) => ({ ...ended, seq: 40 + i, reason })),
];

describeSchemas('call common', common, {
  Seq: [
    [1, 4_200, 0xffff_ffff],
    [0, -1, 1.5, 0x1_0000_0000],
  ],
});

describeSchemas('call client frames', client, {
  TurnMode: [['hold_to_talk', 'hands_free'], ['push_to_talk']],
  HelloFrame: [
    [hello, helloResume, placement, helloSlower, { ...hello, pace: null }, helloDaily],
    [
      { ...hello, seq: 0 },
      { ...hello, token: 'short' },
      { ...hello, kind: 'camera' },
      { ...hello, sceneId: 'S1 E1' },
      { ...hello, firstLanguage: 'en' },
      { ...hello, clientVersion: 'dev' },
      { ...hello, resumeToken: undefined },
      { ...hello, protocol: 0 },
      { ...hello, pace: 'both' },
    ],
  ],
  EndTurnFrame: [[endTurn], [{ type: 'end_turn' }]],
  HoldFrame: [
    [hold, holdOff, { ...hold, seconds: 30 }],
    [
      { ...hold, seconds: 31 },
      { ...hold, seconds: 2.5 },
      { ...hold, seconds: -1 },
    ],
  ],
  HintRequestFrame: [[hintRequest], [{ ...hintRequest, seq: 'x' }]],
  MeaningSubject: [
    [meaningLast.subject, meaningPhrase.subject],
    [{ kind: 'phrase' }, { kind: 'phrase', text: '' }, { kind: 'word', text: 'push' }],
  ],
  MeaningRequestFrame: [[meaningLast, meaningPhrase], [{ type: 'meaning_request', seq: 1 }]],
  PlayedFrame: [
    [played, playedRec],
    [
      { ...played, streamId: 0 },
      { ...played, lagMs: -5 },
      { ...played, interrupted: undefined },
    ],
  ],
  SpeechFrame: [
    [speechStart, speechEnd, { ...speechStart, atMs: 0 }],
    [
      { ...speechStart, state: 'pause' },
      { ...speechEnd, atMs: -20 },
      { ...speechEnd, atMs: 12.5 },
      { ...speechEnd, atMs: undefined },
      { ...speechStart, seq: 0 },
    ],
  ],
  HangupReason: [['too_hard'], ['too_easy', 'bored']],
  HangupFrame: [
    [hangup, hangupTooHard],
    [
      { type: 'hang_up', seq: 1 },
      { ...hangup, reason: 'bored' },
      { ...hangup, reason: null },
    ],
  ],
  ReplayFrame: [
    [replay, replaySlower],
    [
      { type: 'replay', seq: 1 },
      { ...replay, slower: 'yes' },
      { ...replay, seq: 0 },
    ],
  ],
  PaceFrame: [
    [paceSlower, paceOwn, { ...paceSlower, pace: 'faster' }],
    [
      { type: 'pace', seq: 1 },
      { ...paceSlower, pace: 'normal' },
    ],
  ],
  CallClientFrame: [
    clientFrames,
    [{ ...hello, stage: 'b1' }, { ...hold, seconds: 99 }, { seq: 1 }, 'hello', null],
  ],
});

describeSchemas('call server frames', server, {
  StreamId: [
    [1, 0xffff_ffff],
    [0, -1, 1.5],
  ],
  ReadyFrame: [
    [ready, readyResumed],
    [
      { ...ready, recordedLineBaseUrl: 'http://cdn.yapling.app/lines' },
      { ...ready, recordedLineBaseUrl: 'not a url' },
      { ...ready, secondsLeft: -1 },
      { ...ready, resumeToken: null },
    ],
  ],
  PartialFrame: [[partial, { ...partial, text: '' }], [{ ...partial, text: 'x'.repeat(2_001) }]],
  HeardWord: [
    [word, { word: 'a', startMs: 5, endMs: 5 }],
    [
      { word: 'a', startMs: 10, endMs: 5 },
      { word: '', startMs: 0, endMs: 1 },
    ],
  ],
  HeardFrame: [
    [heard, heardSilent],
    [
      { ...heard, turn: 0 },
      { ...heard, words: [{ word: 'a', startMs: 10, endMs: 5 }] },
    ],
  ],
  SayStartFrame: [
    [sayStart, sayStartMp3],
    [
      { ...sayStart, character: 'sari' },
      { ...sayStart, sampleRateHz: 48_000 },
      { ...sayStart, codec: 'opus' },
      { ...sayStart, streamId: 0 },
    ],
  ],
  AlignmentFrame: [
    [alignment, { ...alignment, chars: ['ệ'], startMs: [0], endMs: [40] }],
    [
      { ...alignment, endMs: [90, 160] },
      { ...alignment, startMs: [0, 90] },
      { ...alignment, endMs: [90, 80, 160] },
      { ...alignment, chars: [], startMs: [], endMs: [] },
    ],
  ],
  SayEndFrame: [
    [sayEnd],
    [
      { ...sayEnd, text: '' },
      { ...sayEnd, character: undefined },
    ],
  ],
  PlayRecFrame: [
    [playRec, { ...playRec, character: 'linh', lineId: 's1-pro-03' }],
    [{ ...playRec, lineId: 'S1 E1 03' }],
  ],
  BeatFrame: [
    [beat, { ...beat, progress: 0 }, { ...beat, progress: 1 }],
    [
      { ...beat, progress: 1.2 },
      { ...beat, progress: -0.1 },
    ],
  ],
  HintChoice: [
    [choiceTea, { phrase: 'Yes.', gloss: null }],
    [{ phrase: '', gloss: null }, { phrase: 'Yes.' }, { gloss: 'Có.' }],
  ],
  HintFrame: [
    [hint, hintOther, hintChoices, hintOneCard, { ...hint, persistent: true }],
    [
      { ...hint, phrase: '' },
      { ...hintChoices, choices: [] },
      { ...hintChoices, choices: [choiceTea, choiceCoffee, choiceTea] },
      { ...hintChoices, choices: [{ phrase: 'Tea, please.' }] },
      { ...hintChoices, modelLineId: 'S1 SET5' },
      { ...hintChoices, persistent: 'yes' },
      { ...hintChoices, choices: null },
    ],
  ],
  CorrectionFrame: [[correction], [{ ...correction, prompt: '' }]],
  CorrectionResolvedFrame: [
    [resolved, { ...resolved, fixed: false }],
    [{ ...resolved, fixed: 'yes' }],
  ],
  MeaningFrame: [[meaning, { ...meaning, gloss: null }], [{ ...meaning, simple: undefined }]],
  MinutesFrame: [
    [minutes, { ...minutes, secondsLeft: 540, wrappingUp: false }],
    [{ ...minutes, secondsLeft: 1.5 }],
  ],
  SafetyKind: [['crisis', 'break_reminder', 'ai_disclosure'], ['panic']],
  SafetyFrame: [
    [crisis, breakReminder, disclosure],
    [
      { ...crisis, resourcesKey: null },
      { ...breakReminder, resourcesKey: 'crisis.vn' },
    ],
  ],
  ThinkingFrame: [[thinking], [{ ...thinking, state: 'on' }]],
  NotHeardFrame: [[notHeard], [{ type: 'not_heard' }, { ...notHeard, seq: 0 }]],
  CallErrorCode: [[...server.CALL_ERROR_CODES], ['rate_limited']],
  ErrorFrame: [
    [error, { ...error, code: 'unauthorized', fatal: true }],
    [{ ...error, fatal: undefined }],
  ],
  CallEndReason: [[...server.CALL_END_REASONS], ['crashed']],
  EndedFrame: [
    [ended, { ...ended, reason: 'hangup', summaryPending: false }],
    [{ ...ended, callRecordId: '' }],
  ],
  CallServerFrame: [
    serverFrames,
    [{ ...ready, sessionId: '' }, { ...crisis, resourcesKey: null }, { seq: 1 }, 42],
  ],
});

describe('the frame unions', () => {
  it('cover every listed frame type', () => {
    const clientTypes = new Set(clientFrames.map((f) => f.type));
    expect([...CALL_CLIENT_FRAME_TYPES].filter((t) => !clientTypes.has(t))).toEqual([]);
    const serverTypes = new Set(serverFrames.map((f) => f.type));
    expect([...CALL_SERVER_FRAME_TYPES].filter((t) => !serverTypes.has(t))).toEqual([]);
  });

  it('turn a frame type they do not know into an unknown frame', () => {
    expect(CallServerFrame.parse({ type: 'confetti', seq: 9, colour: 'gold' })).toEqual({
      type: 'unknown',
      received: 'confetti',
    });
    expect(CallClientFrame.parse({ type: 'camera_on', seq: 9 })).toEqual({
      type: 'unknown',
      received: 'camera_on',
    });
  });

  it('give every frame a seq', () => {
    for (const frame of [...clientFrames, ...serverFrames]) {
      expect(frame.seq, frame.type).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('the beginner-path frames', () => {
  it('leave the hint as it was for apps and calls that know only the phrase', () => {
    expect(CallServerFrame.parse(hint)).toEqual(hint);
    // An older app's hint schema drops the new fields and keeps the first card.
    const older = server.HintFrame.pick({ type: true, seq: true, phrase: true, gloss: true });
    expect(older.parse(hintChoices)).toEqual({
      type: 'hint',
      seq: hint.seq,
      phrase: 'Tea, please.',
      gloss: 'Cho mình trà.',
    });
  });

  it('reach an older call as unknown frames it can ignore', () => {
    const older = tolerant(
      client.HangupFrame.pick({ type: true, seq: true }),
      CALL_CLIENT_FRAME_TYPES.filter((t) => t !== 'replay' && t !== 'pace'),
    );
    expect(older.parse(replay)).toEqual({ type: 'unknown', received: 'replay' });
    expect(older.parse(paceSlower)).toEqual({ type: 'unknown', received: 'pace' });
    expect(older.parse(hangupTooHard)).toEqual({ type: 'hangup', seq: hangupTooHard.seq });
  });

  it('end a too-hard call with its own reason', () => {
    expect(server.EndedFrame.parse({ ...ended, reason: 'too_hard' }).reason).toBe('too_hard');
  });
});

describe('parseFrame', () => {
  it('parses a text message into a frame', () => {
    expect(parseFrame(CallServerFrame, JSON.stringify(heard))).toEqual({ ok: true, frame: heard });
    expect(parseFrame(CallClientFrame, JSON.stringify(hello))).toEqual({ ok: true, frame: hello });
  });

  it('reports a message that is not JSON or not a frame, without throwing', () => {
    expect(parseFrame(CallClientFrame, 'ping')).toEqual({ ok: false, error: 'not_json' });
    expect(parseFrame(CallClientFrame, '{"type":"hold","seq":1}')).toEqual({
      ok: false,
      error: 'bad_frame',
    });
  });
});
