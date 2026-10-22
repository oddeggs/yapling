import type { CallEndReason, CharacterId } from '@yapling/contracts';
import type { RunnerState, Scene, SceneEffect } from '@yapling/story';

import type { Control, Outcome } from './control';
import type { Director, ReplyPlan } from './director';
import type { CallData } from './finalize';
import type { FrameSender } from './frames';
import type { AgainAsk, Judgement } from './judge';
import type { LearnerTurn } from './learner-turn';
import type { LineHost, LineSource, SpokenLine } from './line';
import type { TtsVoice } from './tts';

/* The answer to one learner turn, as plain state: the reply, Jev's side of it, and the host. */

/** The line now playing, waiting for the phone's `played`. */
export interface Active {
  readonly streamId: number;
  after: 'rec_played' | 'gen_done' | null;
  durationMs: number;
  ready: boolean;
  played: boolean;
  timer: ReturnType<typeof setTimeout> | null;
  /** Ends the call when done (the wrap-up). */
  endAfter: CallEndReason | null;
}

export interface ReplyHost {
  readonly data: CallData;
  readonly director: Director;
  readonly scene: Scene;
  /** Jev's key; the line's own case stands for every turn without it. */
  readonly judgeKey: string | undefined;
  frames(): FrameSender;
  learner(): LearnerTurn | null;
  active(): Active | null;
  accepting(): boolean;
  lineHost(): LineHost;
  voice(character: CharacterId): TtsVoice;
  thinking(on: boolean): void;
  newActive(streamId: number, after: Active['after']): Active;
  ready(active: Active, silent: boolean): void;
  run(effects: readonly SceneEffect[]): void;
  enqueue(effects: readonly SceneEffect[]): void;
  pump(): void;
  crisis(): void;
  end(reason: CallEndReason): void;
  addUsage(line: SpokenLine): void;
  pushCharacterLine(speaker: CharacterId, text: string, beatId: string | null): void;
  nextStreamId(): number;
}

/** Jev's side of one turn. */
export interface TurnJudge {
  readonly startedAt: number;
  readonly abort: AbortController;
  status: 'pending' | 'answered' | 'failed' | 'late';
  /** Jev's answer, when it came before the turn was committed. */
  judgement: Judgement | null;
  /** Jev's outcome, even one too late to count (for the log). */
  outcome: Outcome | null;
  ms: number | null;
  /** The first line's case; undefined until its first word is in. */
  tag: Outcome | null | undefined;
  /** The line written for Jev's case, held until the first line's case is known. */
  alt: SpokenLine | null;
  /** Jev's case was compared with the line's (or the line's case can't be known). */
  settled: boolean;
  /** The voiced line was written for Jev's case: Jev's outcome is applied. */
  decided: boolean;
  /** Whether the line's case and Jev's led to the same runner event. */
  agree: boolean | null;
  /** The line written for Jev's case was voiced in place of the first. */
  switched: boolean;
}

export class Reply {
  /** The line answering the turn: the first, or the one that replaced it. */
  line!: SpokenLine;
  committed = false;
  control: Control | null = null;
  applied = false;
  /** The runner event the outcome was applied as, for the turn's log line. */
  event: string | null = null;
  learnerLine = -1;
  /** The line is the last character line said again: no outcome, no try. */
  replay: AgainAsk | null = null;
  /** The hold ended before Jev answered: the recorded reaction waits for its answer. */
  reactionDue = false;
  /** The runner's last pass before the turn, to tell the pass this turn made. */
  passBefore: RunnerState['lastTurn'];
  readonly judge: TurnJudge = {
    startedAt: Date.now(),
    abort: new AbortController(),
    status: 'pending',
    judgement: null,
    outcome: null,
    ms: null,
    tag: undefined,
    alt: null,
    settled: false,
    decided: false,
    agree: null,
    switched: false,
  };

  constructor(
    readonly plan: ReplyPlan,
    /** Who speaks the line: the listener, or for a replay whoever said the last line. */
    public speaker: CharacterId,
    readonly speechEndAt: number,
    readonly said: string,
    /** The recorded reaction's words, when one plays before the line. */
    readonly reaction: string | null,
    passBefore: RunnerState['lastTurn'] = undefined,
  ) {
    this.passBefore = passBefore;
  }
}

export interface LineSpec {
  readonly speaker: CharacterId;
  readonly voice: TtsVoice;
  readonly source: LineSource;
  readonly gated: boolean;
  readonly afterReaction: boolean;
  readonly maxWords?: number;
}
