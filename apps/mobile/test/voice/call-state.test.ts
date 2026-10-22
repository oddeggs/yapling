import { describe, expect, it } from '@jest/globals';

import { initialCallState, update } from '../../src/voice/call-state';

describe('the call phase', () => {
  it('runs idle → connecting → your turn → listening → thinking → character speaking', () => {
    let s = initialCallState('hands_free');
    expect(s.phase).toBe('idle');
    s = update(s, { phase: 'connecting' });
    expect(s.phase).toBe('connecting');
    s = update(s, { connected: true });
    expect(s.phase).toBe('your_turn');
    s = update(s, { learnerSpeaking: true });
    expect(s.phase).toBe('listening');
    s = update(s, { learnerSpeaking: false, awaitingReply: true });
    expect(s.phase).toBe('thinking');
    s = update(s, { playing: true, awaitingReply: false });
    expect(s.phase).toBe('character_speaking');
    s = update(s, { playing: false });
    expect(s.phase).toBe('your_turn');
  });

  it('listens in hold-to-talk only while the button is held', () => {
    let s = update(initialCallState('hold_to_talk'), { phase: 'connecting', connected: true });
    s = update(s, { learnerSpeaking: true });
    expect(s.phase).toBe('your_turn');
    s = update(s, { talkHeld: true });
    expect(s.phase).toBe('listening');
  });

  it('shows connecting while reconnecting, and the held mic as listening', () => {
    let s = update(initialCallState('hold_to_talk'), { phase: 'connecting', connected: true });
    s = update(s, { talkHeld: true });
    expect(s.phase).toBe('listening');
    s = update(s, { connected: false, reconnecting: true });
    expect(s.phase).toBe('connecting');
  });

  it('ends for good, and a fatal error wins over everything but the end', () => {
    let s = update(initialCallState('hands_free'), { phase: 'connecting', connected: true });
    s = update(s, { error: 'no_connection' });
    expect(s.phase).toBe('error');
    s = update(s, { endReason: 'error' });
    expect(s.phase).toBe('ended');
    expect(update(s, { connected: true, playing: true }).phase).toBe('ended');
  });

  it('treats the server thinking as thinking', () => {
    const s = update(
      update(initialCallState('hands_free'), { phase: 'connecting', connected: true }),
      {
        serverThinking: true,
      },
    );
    expect(s.phase).toBe('thinking');
  });
});
