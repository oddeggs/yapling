import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ListenPlayer } from '../../src/features/story/listen-player';
import { audioOwner, claimAudio, ownsAudio, releaseAudio } from '../../src/voice/audio-owner';
import type { SocketLike } from '../../src/voice/call-socket';
import { VoiceEngine } from '../../src/voice/engine';

/*
 * The shared audio session across a story, a call and the next call: the order the call sets the
 * session, its graph and echo cancellation up in, and who may deactivate the session afterwards.
 * The native audio library and the voice-processing module are stood in for by recorders (the
 * mocks are hoisted above the imports).
 */

const mockLog: string[] = [];
const mockAudio = { failResumes: 0, engineRunning: true };

/** A recording stand-in for the playback graph. */
function mockContextClass() {
  return class {
    state = 'suspended';
    currentTime = 0;
    sampleRate: number;
    destination = {};
    constructor(options?: { sampleRate?: number }) {
      this.sampleRate = options?.sampleRate ?? 48_000;
      mockLog.push(`context ${this.sampleRate}`);
    }
    resume() {
      if (mockAudio.failResumes > 0) {
        mockAudio.failResumes -= 1;
        mockLog.push('context resume failed');
        return Promise.reject(new Error('Exception in HostFunction: <unknown>'));
      }
      this.state = 'running';
      mockLog.push('context resume');
      return Promise.resolve();
    }
    suspend() {
      this.state = 'suspended';
      mockLog.push('context suspend');
      return Promise.resolve();
    }
    close() {
      this.state = 'closed';
      mockLog.push('context close');
      return Promise.resolve();
    }
    decodeAudioData() {
      return new Promise(() => undefined);
    }
  };
}

jest.mock('react-native-audio-api', () => ({
  // Built when first imported, so it is defined inside the hoisted factory.
  AudioContext: mockContextClass(),
  AudioRecorder: class {},
  decodeAudioData: () => new Promise(() => undefined),
  AudioManager: {
    setAudioSessionOptions: (o: { iosCategory: string }) =>
      mockLog.push(`options ${o.iosCategory}`),
    setAudioSessionActivity: (on: boolean) => {
      mockLog.push(on ? 'activate' : 'deactivate');
      return Promise.resolve();
    },
    observeAudioInterruptions: () => undefined,
    addSystemEventListener: () => ({ remove: () => undefined }),
    checkRecordingPermissions: () => Promise.resolve('Denied'),
    requestRecordingPermissions: () => Promise.resolve('Denied'),
  },
}));

jest.mock('../../modules/voice-session', () => ({
  VoiceSession: {
    setVoiceProcessing: (on: boolean) => {
      mockLog.push(`voice processing ${on ? 'on' : 'off'}`);
      return null;
    },
    setPreferredIOBufferDuration: () => 0.01,
    status: () => ({
      engineRunning: mockAudio.engineRunning,
      outputLatency: 0,
      ioBufferDuration: 0.01,
    }),
  },
}));

jest.mock('react-native-reanimated', () => ({
  makeMutable: <T>(value: T) => ({ value }),
  useFrameCallback: () => undefined,
}));

jest.mock('@yapling/story/assets', () => ({ RECORDED_LINE_ASSETS: {} }));

const HELLO = {
  token: 'session-token-0123456789',
  kind: 'episode',
  sceneId: 's1-e1',
  stage: 'newcomer',
  firstLanguage: 'vi',
  clientVersion: '0.1.0',
  turnMode: 'hold_to_talk',
} as const;

/** A socket the test opens, feeds and drops; it keeps the JSON frames the phone sent. */
class TestSocket implements SocketLike {
  binaryType = 'blob';
  readyState = 0;
  sent: Record<string, unknown>[] = [];
  onopen: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: ((ev: { code?: number; reason?: string }) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  send(data: string | ArrayBuffer | ArrayBufferView): void {
    if (typeof data === 'string' && data.startsWith('{'))
      this.sent.push(JSON.parse(data) as Record<string, unknown>);
  }
  close(): void {
    this.readyState = 3;
  }
  open(): void {
    this.readyState = 1;
    this.onopen?.({});
  }
  receive(frame: Record<string, unknown>): void {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }
  drop(): void {
    this.readyState = 3;
    this.onclose?.({ code: 1006 });
  }
}

let sockets: TestSocket[] = [];

const engine = () =>
  new VoiceEngine({
    url: 'ws://call',
    hello: HELLO,
    createSocket: () => {
      const s = new TestSocket();
      sockets.push(s);
      return s;
    },
  });

let serverSeq = 0;
const READY = {
  type: 'ready',
  sessionId: 'call_1',
  secondsLeft: 600,
  recordedLineBaseUrl: null,
  resumeToken: 'resume-token-aaaaaaaa',
  resumed: false,
};

/** An engine with its audio up and its call answered. */
async function liveCall() {
  const e = engine();
  e.connect();
  const socket = sockets.at(-1)!;
  socket.open();
  socket.receive({ ...READY, seq: ++serverSeq });
  await e.prepare();
  return {
    e,
    socket,
    say: (f: Record<string, unknown>) => socket.receive({ ...f, seq: ++serverSeq }),
  };
}

const at = (entry: string) => mockLog.indexOf(entry);

beforeEach(() => {
  sockets = [];
  mockLog.length = 0;
  mockAudio.failResumes = 0;
  mockAudio.engineRunning = true;
});

describe('who owns the audio session', () => {
  it('lets only the latest claim release it', () => {
    const story = claimAudio('listen');
    const call = claimAudio('call');
    expect(ownsAudio(story)).toBe(false);
    expect(releaseAudio(story)).toBe(false);
    expect(audioOwner()).toEqual(call);
    expect(releaseAudio(call)).toBe(true);
    expect(audioOwner()).toBeNull();
    expect(releaseAudio(call)).toBe(false);
  });
});

describe('a call starting its audio', () => {
  it('turns echo cancellation on only once its graph runs', async () => {
    const e = engine();
    await e.prepare();
    expect(mockLog.slice(0, 4)).toEqual([
      'options playAndRecord',
      'activate',
      'context 24000',
      'context resume',
    ]);
    expect(at('voice processing on')).toBeGreaterThan(at('context resume'));
    await e.dispose();
  });

  it('sets the session up again when the graph will not start, and goes on', async () => {
    mockAudio.failResumes = 1;
    const e = engine();
    await e.prepare();
    expect(mockLog).toContain('context resume failed');
    expect(mockLog.filter((l) => l === 'context resume')).toHaveLength(1);
    expect(e.state.get().error).toBeNull();
    await e.dispose();
  });

  it('ends with no connection rather than going on silent when the graph never starts', async () => {
    mockAudio.failResumes = 2;
    const e = engine();
    await e.prepare();
    expect(e.state.get().error).toBe('no_connection');
    await e.dispose();
  });

  it('starts a stopped engine again by suspending and resuming the graph on coming back', async () => {
    const e = engine();
    await e.prepare();
    mockLog.length = 0;
    await e.foregrounded();
    expect(mockLog).toEqual([]);
    mockAudio.engineRunning = false;
    await e.foregrounded();
    expect(mockLog).toEqual(['context suspend', 'context resume']);
    await e.dispose();
  });

  it('restarts the engine after a phone call or Siri ends', async () => {
    const e = engine();
    await e.prepare();
    mockLog.length = 0;
    await e.simulateInterruption('began');
    expect(e.state.get().interrupted).toBe(true);
    await e.simulateInterruption('ended');
    expect(mockLog).toEqual(['activate', 'context suspend', 'context resume']);
    expect(e.state.get().interrupted).toBe(false);
    await e.dispose();
  });
});

describe('a story and a call sharing the session', () => {
  it('leaves the session to a call that started before the story closed', async () => {
    const story = new ListenPlayer({ ended: () => undefined, failed: () => undefined });
    await story.start();
    const call = engine();
    await call.prepare();
    mockLog.length = 0;
    await story.dispose();
    expect(mockLog).toEqual(['context close']);
    await call.dispose();
    expect(mockLog).toContain('deactivate');
  });

  it('leaves the session to the next call when the last call is torn down late', async () => {
    const first = engine();
    await first.prepare();
    const second = engine();
    await second.prepare();
    mockLog.length = 0;
    await first.dispose();
    expect(mockLog).not.toContain('deactivate');
    expect(mockLog).not.toContain('voice processing off');
    await second.dispose();
    expect(mockLog).toContain('deactivate');
  });

  it('turns echo cancellation off for a story after a call', async () => {
    const call = engine();
    await call.prepare();
    await call.dispose();
    mockLog.length = 0;
    const story = new ListenPlayer({ ended: () => undefined, failed: () => undefined });
    await story.start();
    expect(mockLog.slice(0, 3)).toEqual(['voice processing off', 'options playback', 'activate']);
    await story.dispose();
    expect(mockLog).toContain('deactivate');
  });
});

describe('a turn that gets no answer', () => {
  it('gives the turn back with "didn\'t catch that" when the reply fails', async () => {
    const { e, say } = await liveCall();
    e.pressTalk();
    e.releaseTalk();
    expect(e.state.get().phase).toBe('thinking');
    say({ type: 'thinking', state: 'start' });
    say({ type: 'error', code: 'llm_failed', fatal: false });
    expect(e.state.get()).toMatchObject({
      phase: 'your_turn',
      awaitingReply: false,
      serverThinking: false,
      notice: 'didnt_catch',
      warning: 'llm_failed',
    });
    // Speaking again clears it.
    e.pressTalk();
    expect(e.state.get().notice).toBeNull();
    await e.dispose();
  });

  it('gives the turn back when nothing at all comes after the learner lets go', async () => {
    jest.useFakeTimers();
    const { e } = await liveCall();
    e.pressTalk();
    e.releaseTalk();
    jest.advanceTimersByTime(5_000);
    expect(e.state.get().phase).toBe('thinking');
    jest.advanceTimersByTime(2_000);
    expect(e.state.get()).toMatchObject({ phase: 'your_turn', notice: 'didnt_catch' });
    jest.useRealTimers();
    await e.dispose();
  });

  it('leaves a failed explanation without a notice when no turn was waiting', async () => {
    const { e, say } = await liveCall();
    say({ type: 'error', code: 'llm_failed', fatal: false });
    expect(e.state.get().notice).toBeNull();
    await e.dispose();
  });
});

describe('a dropped line', () => {
  it('stops waiting on the old socket and says it is reconnecting', async () => {
    jest.useFakeTimers();
    const { e, socket } = await liveCall();
    e.pressTalk();
    e.releaseTalk();
    socket.drop();
    expect(e.state.get()).toMatchObject({
      connected: false,
      reconnecting: true,
      awaitingReply: false,
      serverThinking: false,
    });
    jest.advanceTimersByTime(1_000);
    const again = sockets.at(-1)!;
    expect(again).not.toBe(socket);
    again.open();
    expect(again.sent[0]).toMatchObject({ type: 'hello', resumeToken: 'resume-token-aaaaaaaa' });
    again.receive({ ...READY, resumed: true, seq: ++serverSeq });
    expect(e.state.get()).toMatchObject({ connected: true, reconnecting: false });
    jest.useRealTimers();
    await e.dispose();
  });
});

describe('a phone call or Siri', () => {
  it('holds the scene while it lasts and lets go after', async () => {
    const { e, socket } = await liveCall();
    await e.simulateInterruption('began');
    expect(socket.sent.at(-1)).toMatchObject({ type: 'hold' });
    expect((socket.sent.at(-1)?.['seconds'] as number) > 0).toBe(true);
    await e.simulateInterruption('ended');
    expect(socket.sent.at(-1)).toMatchObject({ type: 'hold', seconds: 0 });
    expect(e.state.get()).toMatchObject({ interrupted: false, onHold: false });
    await e.dispose();
  });
});
