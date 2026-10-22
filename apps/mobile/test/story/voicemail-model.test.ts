import { describe, expect, it } from '@jest/globals';
import { seedPhrase, toPhraseProgress, usePhrase } from '@yapling/domain';
import { getScene } from '@yapling/story';

import {
  growthOfFix,
  initialVoicemail,
  reduceVoicemail,
  saysFix,
  voicemailScript,
  type VoicemailEvent,
  type VoicemailState,
} from '../../src/features/story/voicemail-model';

const scene = getScene('s1-e1-voicemail');
const script = voicemailScript(scene);
const run = (events: readonly VoicemailEvent[], from: VoicemailState = initialVoicemail) =>
  events.reduce((s, e) => reduceVoicemail(script, s, e), from);
/** Every learner turn is answered by Pip before the call knows how it went. */
const reply: VoicemailEvent = { type: 'line', source: 'live' };

/** The call's frames up to the learner's turn: the card, the message, the slip. */
const toTurn: VoicemailEvent[] = [
  { type: 'beat', beatId: 'voicemail' },
  { type: 'beat', beatId: 'news' },
  { type: 'line', source: 'recorded' },
  { type: 'beat', beatId: 'oops' },
  { type: 'line', source: 'recorded' },
  { type: 'beat', beatId: 'fix-pip' },
];
const grows: VoicemailEvent[] = [
  { type: 'beat', beatId: 'leaf' },
  { type: 'beat', beatId: 'thanks' },
  { type: 'line', source: 'recorded' },
];

describe('the voicemail scene', () => {
  it('reads each beat of the scene for what it shows', () => {
    expect(script.fix).toBe('Can I help you?');
    expect(Object.fromEntries(script.roles)).toEqual({
      voicemail: 'card',
      news: 'message',
      oops: 'oops',
      'fix-pip': 'turn',
      leaf: 'grows',
      thanks: 'after',
    });
  });

  it('opens, plays the message on the card, then the slip, then the turn', () => {
    expect(initialVoicemail.phase).toBe('opening');
    expect(run(toTurn.slice(0, 3)).phase).toBe('message');
    expect(run(toTurn.slice(0, 5)).phase).toBe('oops');
    expect(run(toTurn).phase).toBe('turn');
  });
});

describe('the fix', () => {
  it('grows the phrase when the learner fixes it', () => {
    const s = run([
      ...toTurn,
      { type: 'heard', text: 'Almost. We say, "Can I help you?"' },
      reply,
      ...grows,
    ]);
    expect(s.phase).toBe('grown');
    expect(s.outcome).toBe('fixed');
    expect(s.heard).toBe('Almost. We say, "Can I help you?"');
    expect(run([{ type: 'ended', reason: 'scene_complete' }], s).phase).toBe('done');
  });

  it("counts the learner's fix after a hint or a nudge", () => {
    const s = run([
      ...toTurn,
      { type: 'heard', text: 'Can I helping you?' },
      reply,
      { type: 'hint', phrase: "We say: 'Can I help you?'", gloss: 'Mình nói là "Can I help you?"' },
      { type: 'heard', text: 'can I help you' },
      reply,
      ...grows,
    ]);
    expect(s.hint?.phrase).toBe("We say: 'Can I help you?'");
    expect(s.outcome).toBe('fixed');
  });

  it('lets Pip work it out when the learner stays quiet, and still ends kindly', () => {
    const s = run([
      ...toTurn,
      { type: 'hint', phrase: "We say: 'Can I help you?'", gloss: null },
      { type: 'line', source: 'live' },
      ...grows,
      { type: 'ended', reason: 'scene_complete' },
    ]);
    expect(s.outcome).toBe('worked_out');
    expect(s.phase).toBe('done');
    expect(s.error).toBeNull();
  });

  it('lets Pip work it out when the learner tried but never said the fix', () => {
    const s = run([...toTurn, { type: 'heard', text: 'Can I helping you?' }, reply, ...grows]);
    expect(s.outcome).toBe('worked_out');
  });

  it('only counts words said on the turn', () => {
    const s = run([
      ...toTurn.slice(0, 5),
      { type: 'heard', text: 'Can I help you?' },
      { type: 'beat', beatId: 'fix-pip' },
      ...grows,
    ]);
    expect(s.outcome).toBe('worked_out');
  });

  it('hears the fix inside a longer answer, not a near miss', () => {
    expect(saysFix('Almost! We say: Can I help you?', 'Can I help you?')).toBe(true);
    expect(saysFix('can i help you', 'Can I help you?')).toBe(true);
    expect(saysFix('Can I helping you?', 'Can I help you?')).toBe(false);
    expect(saysFix('', 'Can I help you?')).toBe(false);
    expect(saysFix('Can I help you?', null)).toBe(false);
  });

  it('counts the phrase as the story writes it, as the call does', () => {
    expect(script.fixes).toEqual(['Can I help you?', 'Can I help?']);
    expect(saysFix('Are you okay? Can I help?', script.fixes)).toBe(true);
    expect(saysFix('Oh Pip, you say can I help', script.fixes)).toBe(true);
    expect(saysFix('Can I helping you?', script.fixes)).toBe(false);
    expect(saysFix('I can help you', script.fixes)).toBe(false);
    const s = run([
      ...toTurn,
      { type: 'heard', text: 'Are you okay? Can I help?' },
      reply,
      ...grows,
    ]);
    expect(s.outcome).toBe('fixed');
  });

  it('ignores empty words', () => {
    const s = run([...toTurn, { type: 'heard', text: '  ' }, ...grows]);
    expect(s.outcome).toBe('worked_out');
  });
});

describe('a dropped line', () => {
  it('waits, offline, when it drops before the fix', () => {
    const s = run([...toTurn, { type: 'error', code: 'no_connection' }]);
    expect(s.phase).toBe('offline');
    expect(s.error).toBe('no_connection');
    expect(run([{ type: 'beat', beatId: 'leaf' }], s).phase).toBe('offline');
    expect(run([{ type: 'reset' }], s)).toEqual(initialVoicemail);
  });

  it('ends warmly when it drops after the phrase grew', () => {
    const s = run([...toTurn, { type: 'heard', text: 'Can I help you?' }, reply, ...grows]);
    expect(run([{ type: 'error', code: 'no_connection' }], s).phase).toBe('done');
  });
});

describe('how the fix grows the phrase', () => {
  const tz = 'Asia/Ho_Chi_Minh';
  const day = 86_400_000;
  const met = Date.UTC(2026, 8, 21, 3);
  const target = { id: 'can-i-help', text: 'Can I help?' };
  const sprouted = usePhrase(
    seedPhrase(target.id, target.text, met),
    { at: met + day, correct: true, prompted: true, contextId: 's1-e1' },
    tz,
  ).phrase;

  it('turns a sprout from an earlier day into a leaf', () => {
    expect(
      growthOfFix(toPhraseProgress(sprouted), target, 's1-e1-voicemail', met + 5 * day, tz),
    ).toEqual({ from: 'sprout', to: 'leaf' });
  });

  it('keeps a sprout used today a sprout', () => {
    expect(
      growthOfFix(toPhraseProgress(sprouted), target, 's1-e1-voicemail', met + day + 60_000, tz),
    ).toEqual({ from: 'sprout', to: 'sprout' });
  });

  it('sprouts a phrase never met before', () => {
    expect(growthOfFix(undefined, target, 's1-e1-voicemail', met, tz)).toEqual({
      from: 'seed',
      to: 'sprout',
    });
  });
});
