import type { MomentCard, Painting, SafetyKind } from '@yapling/contracts';
import { clockLabel, localTime, PLACES, pipAsleep, weatherAt, type PlaceId } from '@yapling/scene';

import { apiBase, clientVersion } from '../data/config';
import { createStore, type Store } from '../data/store';
import { reportError } from '../observability';
import {
  micPermissionStatus,
  requestMicPermission,
  VoiceEngine,
  type CallNotice,
  type CallPhase,
  type CallState,
} from '../voice';
import { releaseLine, takeLine } from '../voice/live-line';
import { deviceFirstLanguage, deviceTimeZone } from './device';
import type { Sound } from './sound';
import type { StageHandle, StageMessage } from './stage';
import type { World } from './world';

/*
 * One conversation at a time, from the scene's side: a moment begins (the call connects and the
 * resident opens), the learner holds the control while they talk, and when it ends the painting is kept and the
 * next moment is asked for. Everything the call says goes to the stage (words, who is speaking)
 * and to the sound (the music dips under a voice).
 */

export type TalkStage =
  /** Nothing playing: the scene lives on, a moment starts by itself when one is ready. */
  | 'idle'
  /** The call is connecting. */
  | 'connecting'
  | 'talking'
  /** The talk waits; the world keeps going. */
  | 'paused'
  /** The painting is kept: its card is up. */
  | 'kept'
  /** Today's free minutes are used. */
  | 'out';

export interface TalkView {
  readonly stage: TalkStage;
  readonly phase: CallPhase | null;
  /** The resident can't hear the learner: the microphone was refused. */
  readonly micDenied: boolean;
  readonly painting: Painting | null;
  /** The painting was kept as the day's free time ran out. */
  readonly outAfter: boolean;
  readonly safety: SafetyKind | null;
  readonly failed: boolean;
  /** The last turn's note: too short a press, or nothing heard. */
  readonly notice: CallNotice | null;
  /** The learner's finger is on the talk button right now. */
  readonly held: boolean;
}

const IDLE: TalkView = {
  stage: 'idle',
  phase: null,
  micDenied: false,
  painting: null,
  outAfter: false,
  safety: null,
  failed: false,
  notice: null,
  held: false,
};

/**
 * The shortest press that is a turn. "No." is half a second, so a press counts from a little under
 * that; shorter ones are slips and show the tip to hold while talking.
 */
const MIN_HOLD_MS = 350;

const socketUrl = () => `${apiBase().replace(/^http/, 'ws')}/calls/socket`;

const talkPhase = (p: CallPhase): Extract<StageMessage, { t: 'talk' }>['phase'] =>
  p === 'character_speaking'
    ? 'speak'
    : p === 'listening'
      ? 'listen'
      : p === 'thinking'
        ? 'think'
        : p === 'your_turn'
          ? 'turn'
          : 'idle';

export class Talk {
  readonly view: Store<TalkView> = createStore(IDLE);
  engine: VoiceEngine | null = null;
  private moment: MomentCard | null = null;
  private stop: (() => void) | null = null;
  private last: CallState | null = null;
  private asked = false;
  /** The painting's title has been shown for this moment. */
  private titled = false;

  constructor(
    private readonly world: World,
    private readonly stage: () => StageHandle | null,
    private readonly sound: Sound,
  ) {}

  get current(): TalkView {
    return this.view.get();
  }

  private patch(p: Partial<TalkView>): void {
    this.view.set((v) => ({ ...v, ...p }));
  }

  private send(m: StageMessage): void {
    this.stage()?.send(m);
  }

  /** Begins a moment: its place is painted, the call connects, the resident opens. */
  async begin(moment: MomentCard): Promise<void> {
    if (this.engine) return;
    this.moment = moment;
    this.world.paint(moment);
    this.patch({ ...IDLE, stage: 'connecting' });
    let token: string;
    try {
      token = await this.world.token();
    } catch {
      this.patch({ stage: 'idle', failed: true });
      return;
    }
    const engine = new VoiceEngine({
      url: socketUrl(),
      hello: {
        token,
        kind: 'moment',
        sceneId: moment.id,
        stage: moment.stage,
        firstLanguage: deviceFirstLanguage(),
        clientVersion: clientVersion(),
        turnMode: 'hold_to_talk',
        pace: null,
      },
      minHoldMs: MIN_HOLD_MS,
      ...(__DEV__ ? { onLog: (m: string) => console.log('voice', m) } : {}),
    });
    this.engine = engine;
    engine.onAudioRebuilt = (ctx) => {
      if (this.engine === engine) this.sound.setCallContext(ctx);
    };
    takeLine(engine);
    this.last = null;
    this.asked = false;
    this.titled = false;
    this.stop = engine.state.subscribe(() => this.onState(engine));
    engine.connect();
    try {
      // The scene's own sound lets go of the audio engine first: the call brings it up clean.
      await this.sound.handOff();
      await engine.prepare();
    } catch (error) {
      reportError(error, { where: 'talk.prepare' });
    }
    if (this.engine === engine) this.sound.setCallContext(engine.audioContext);
  }

  /** The control went down: the learner talks while they hold it. */
  press(): void {
    if (this.current.stage !== 'talking' || !this.engine) return;
    this.sound.setHushed(true);
    this.engine.pressTalk();
  }

  /** The control came up: the turn goes to the resident once the learner's last word ends. */
  release(): void {
    if (!this.engine?.talkHeld) return;
    this.sound.setHushed(false);
    this.engine.releaseTalk();
  }

  /** The control's "say it again": the resident says their last line again. */
  again(): void {
    this.engine?.requestReplay(false);
  }

  pause(): void {
    if (!this.engine || this.current.stage !== 'talking') return;
    this.engine.holdOn(3_600);
    this.patch({ stage: 'paused' });
    this.send({ t: 'talk', phase: 'idle' });
  }

  resume(): void {
    if (!this.engine || this.current.stage !== 'paused') return;
    this.engine.holdOn(0);
    this.patch({ stage: 'talking' });
    if (this.last)
      this.send({
        t: 'talk',
        phase: talkPhase(this.last.phase),
        who: this.moment?.speaker ?? null,
      });
  }

  /** Leaves the moment (the menu took the learner somewhere else). */
  leave(): void {
    this.engine?.hangup();
  }

  /** After the kept painting: the scene goes back to living, and the next moment is asked for. */
  dismissKept(): void {
    if (this.current.stage !== 'kept') return;
    const out = this.current.outAfter;
    this.patch({ stage: out ? 'out' : 'idle', painting: null });
  }

  /** Dev builds: shows the kept card for a painting, to check its look without a conversation. */
  previewKept(painting: Painting): void {
    if (!__DEV__) return;
    this.patch({ stage: 'kept', painting, outAfter: false });
  }

  /** The microphone was granted from the note: the call can hear now. */
  async allowMic(): Promise<boolean> {
    const granted = (await requestMicPermission()) === 'granted';
    if (granted) {
      await this.engine?.startMic();
      this.patch({ micDenied: false });
    }
    return granted;
  }

  // ---- the call's state, to the stage and the sound ----

  private onState(engine: VoiceEngine): void {
    if (this.engine !== engine) return;
    const s = engine.state.get();
    const before = this.last;
    this.last = s;
    const speaker = this.moment?.speaker ?? null;
    // Pip on the way in is a voice beside the learner, not a critter in this painting.
    const who = s.caption && s.caption.character !== speaker ? null : speaker;
    const settings = this.world.state.settings;

    if (s.connected && this.current.stage === 'connecting') {
      this.patch({ stage: 'talking' });
      const bridge = this.moment?.bridge;
      if (bridge) this.label(bridge.card, bridge.chapter ?? this.placeLine(), 5_200);
    }
    // The painting's title as its neighbour first speaks.
    if (!this.titled && s.caption && s.caption.character === speaker && this.moment) {
      this.titled = true;
      this.label(this.moment.titleOpen, this.placeLine(), 4_200);
    }
    if (s.phase !== before?.phase) {
      if (this.current.stage !== 'paused') this.send({ t: 'talk', phase: talkPhase(s.phase), who });
      this.patch({ phase: s.phase });
      // The microphone is asked for the moment the resident first waits for an answer.
      if (s.phase === 'your_turn' && !this.asked) {
        this.asked = true;
        void this.askMic(engine);
      }
    }
    // The resident's words: a new line, a line growing as its voice is written, its end.
    const gloss =
      settings.gloss && s.gloss && s.gloss.streamId === s.caption?.streamId
        ? s.gloss.text
        : undefined;
    if (s.caption && s.caption.streamId !== before?.caption?.streamId) {
      this.send({ t: 'clearYou' });
      this.send({
        t: 'line',
        id: s.caption.streamId,
        text: s.caption.text,
        ...(gloss ? { gloss } : {}),
      });
    } else if (s.caption && s.caption.text !== before?.caption?.text) {
      this.send({ t: 'line', id: s.caption.streamId, text: s.caption.text });
    }
    if (before?.playing && !s.playing) this.send({ t: 'lineDone' });
    if (gloss && s.gloss !== before?.gloss) this.send({ t: 'gloss', text: gloss });
    if (__DEV__ && (s.phase !== before?.phase || s.playing !== before?.playing)) {
      console.log('talk', s.phase, {
        playing: s.playing,
        caption: s.caption?.text.length ?? 0,
        connected: s.connected,
      });
    }
    // The learner's words: grey while heard, white once final.
    if (
      s.learnerText &&
      (s.learnerText !== before?.learnerText || s.learnerFinal !== before?.learnerFinal)
    ) {
      this.send({ t: 'you', text: s.learnerText, final: s.learnerFinal });
    }
    if (s.talkHeld !== before?.talkHeld) this.patch({ held: s.talkHeld });
    if (s.safety !== before?.safety) this.patch({ safety: s.safety });
    if (s.notice !== before?.notice) this.patch({ notice: s.notice });
    if (s.error === 'minutes_exhausted' && before?.error !== 'minutes_exhausted') {
      this.patch({ outAfter: true });
    }
    if (s.endReason !== null && before?.endReason == null) void this.ended(engine, s);
  }

  private label(title: string, sub: string, ms: number): void {
    this.send({ t: 'label', title, sub, ms });
  }

  /** "THE HARBOUR · 7:40 PM" for the moment's place on the learner's clock. */
  private placeLine(): string {
    const place = (this.moment?.place ?? 'room') as PlaceId;
    const { t } = placeWeather(place);
    return `${PLACES[place]?.name ?? ''} · ${clockLabel(t.hour)}`;
  }

  private async askMic(engine: VoiceEngine): Promise<void> {
    const status = await micPermissionStatus();
    if (status === 'granted') return;
    const granted = (await requestMicPermission()) === 'granted';
    if (this.engine !== engine) return;
    if (granted) await engine.startMic();
    this.patch({ micDenied: !granted });
  }

  private async ended(engine: VoiceEngine, s: CallState): Promise<void> {
    this.stop?.();
    this.stop = null;
    releaseLine(engine);
    // The scene's sound comes back on its own graph once the call has let the engine go.
    void engine.dispose().finally(() => this.sound.setCallContext(null));
    if (this.engine === engine) this.engine = null;
    if (this.moment) this.world.played(this.moment.id);
    this.send({ t: 'talk', phase: 'idle', sleepAgain: true });
    const out = s.endReason === 'minutes_exhausted' || this.current.outAfter;
    void this.world.refreshMinutes();
    if (s.callRecordId && s.summaryPending) {
      // The painting is kept now; its notes follow in a few seconds.
      const painting = await this.world.paintingFor(s.callRecordId, 2_500);
      if (painting) {
        this.send({ t: 'clearSay' });
        this.send({ t: 'clearYou' });
        this.patch({ stage: 'kept', painting, outAfter: out });
        void this.world.paintingFor(s.callRecordId).then((done) => {
          if (done && this.current.painting?.id === done.id) this.patch({ painting: done });
        });
        return;
      }
    }
    this.send({ t: 'clearSay' });
    this.send({ t: 'clearYou' });
    this.patch({ stage: out ? 'out' : 'idle', outAfter: out, failed: s.endReason === 'error' });
  }

  dispose(): void {
    this.stop?.();
    const engine = this.engine;
    this.engine = null;
    if (engine) {
      releaseLine(engine);
      void engine.dispose().finally(() => this.sound.setCallContext(null));
    }
  }
}

/** The place's sub-label: its name and the learner's clock. */
export function placeWeather(place: PlaceId, now = Date.now()) {
  const t = localTime(new Date(now), deviceTimeZone());
  return { t, weather: weatherAt(t), asleep: pipAsleep(place, 0, t.hour) };
}
