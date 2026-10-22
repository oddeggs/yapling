import { describe, expect, it, jest } from '@jest/globals';

import {
  IDLE_WATCH,
  REPLY_WATCH,
  ReplyWatcher,
  replyOverdue,
  watchReply,
} from '../../src/voice/reply-watch';

describe('waiting for the answer to a turn', () => {
  it('gives the turn back when nothing comes after the learner stops', () => {
    const w = watchReply(IDLE_WATCH, { type: 'turn_ended', atMs: 1_000 });
    expect(replyOverdue(w, 1_000 + REPLY_WATCH.nothingMs - 1)).toBe(false);
    expect(replyOverdue(w, 1_000 + REPLY_WATCH.nothingMs)).toBe(true);
  });

  it('waits longer once the call heard the words or is thinking', () => {
    let w = watchReply(IDLE_WATCH, { type: 'turn_ended', atMs: 0 });
    w = watchReply(w, { type: 'answering', atMs: 2_000 });
    expect(replyOverdue(w, 2_000 + REPLY_WATCH.nothingMs)).toBe(false);
    expect(replyOverdue(w, 2_000 + REPLY_WATCH.answeringMs)).toBe(true);
  });

  it('stops waiting when a line plays or the learner speaks again', () => {
    const w = watchReply(watchReply(IDLE_WATCH, { type: 'turn_ended', atMs: 0 }), {
      type: 'settled',
    });
    expect(replyOverdue(w, 60_000)).toBe(false);
  });

  it('tells the engine once, on its clock, when the answer is overdue', () => {
    jest.useFakeTimers();
    let now = 0;
    const overdue = jest.fn();
    const watcher = new ReplyWatcher(overdue, 500, () => now);
    watcher.on({ type: 'turn_ended', atMs: 0 });
    expect(watcher.waiting).toBe(true);
    now = REPLY_WATCH.nothingMs - 500;
    jest.advanceTimersByTime(REPLY_WATCH.nothingMs - 500);
    expect(overdue).not.toHaveBeenCalled();
    now = REPLY_WATCH.nothingMs + 500;
    jest.advanceTimersByTime(1_000);
    expect(overdue).toHaveBeenCalledTimes(1);
    expect(watcher.waiting).toBe(false);
    now += 60_000;
    jest.advanceTimersByTime(60_000);
    expect(overdue).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
