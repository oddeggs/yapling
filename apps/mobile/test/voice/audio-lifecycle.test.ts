import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ListenPlayer } from '../../src/features/story/listen-player';
import { audioOwner, claimAudio, ownsAudio, releaseAudio } from '../../src/voice/audio-owner';
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

const engine = () =>
  new VoiceEngine({
    url: 'ws://call',
    hello: HELLO,
    createSocket: () => ({
      binaryType: 'arraybuffer',
      readyState: 0,
      send: () => undefined,
      close: () => undefined,
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
    }),
  });

const at = (entry: string) => mockLog.indexOf(entry);

beforeEach(() => {
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

  it('starts a stopped engine again by suspending and resuming the graph', async () => {
    mockAudio.engineRunning = false;
    const e = engine();
    await e.prepare();
    expect(at('context suspend')).toBeGreaterThan(at('voice processing on'));
    expect(mockLog.lastIndexOf('context resume')).toBeGreaterThan(at('context suspend'));
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
