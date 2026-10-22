import type {
  CallEndReason,
  CallErrorCode,
  EpochMs,
  Id,
  PhraseProgress,
  PhraseState,
  TimeZone,
} from '@yapling/contracts';
import { fromPhraseProgress, seedPhrase, usePhrase } from '@yapling/domain';
import type { BurrowObjectId } from '@yapling/art';
import type { Scene } from '@yapling/story';

/*
 * The voicemail with a fix in it: Pip's recorded message, then its slightly wrong phrase, then a
 * short live turn where the learner fixes it. The call runs the scene (its director judges the
 * turn, hints, and falls back kindly when the learner stays quiet); this follows the call's frames
 * to know what to show. Nothing here can fail: the fallback path ends the same warm way, only
 * without growing the phrase.
 */

export type VoicemailPhase =
  /** The line is opening. */
  | 'opening'
  /** The voicemail card, while the message plays. */
  | 'message'
  /** Pip says the phrase slightly wrong. */
  | 'oops'
  /** The learner's turn to fix it (hints, nudges and Pip's own try happen here too). */
  | 'turn'
  /** The phrase grew (or Pip worked it out), and Pip thanks the learner. */
  | 'grown'
  /** The scene is over. */
  | 'done'
  /** The line dropped or never opened; the voicemail waits. */
  | 'offline';

export type VoicemailOutcome = 'fixed' | 'worked_out';

export interface VoicemailState {
  readonly phase: VoicemailPhase;
  readonly beatId: Id | null;
  /** The learner's last words on the turn. */
  readonly heard: string;
  readonly hint: { readonly phrase: string; readonly gloss: string | null } | null;
  readonly outcome: VoicemailOutcome | null;
  readonly error: CallErrorCode | 'no_connection' | null;
}

export type VoicemailEvent =
  /** A new call opens (trying again after the line dropped). */
  | { readonly type: 'reset' }
  | { readonly type: 'beat'; readonly beatId: Id }
  /** A character line became audible (a recorded line or a live one). */
  | { readonly type: 'line'; readonly source: 'recorded' | 'live' }
  /** The learner's final words for a turn. */
  | { readonly type: 'heard'; readonly text: string }
  | { readonly type: 'hint'; readonly phrase: string; readonly gloss: string | null }
  | { readonly type: 'ended'; readonly reason: CallEndReason }
  | { readonly type: 'error'; readonly code: CallErrorCode | 'no_connection' };

export const initialVoicemail: VoicemailState = {
  phase: 'opening',
  beatId: null,
  heard: '',
  hint: null,
  outcome: null,
  error: null,
};

/** What each beat of a voicemail scene is for, from the scene itself. */
export type BeatRole = 'card' | 'message' | 'oops' | 'turn' | 'grows' | 'after';

export function beatRoles(scene: Scene): ReadonlyMap<Id, BeatRole> {
  const roles = new Map<Id, BeatRole>();
  const turn = scene.beats.findIndex((b) => b.kind === 'learner');
  scene.beats.forEach((beat, i) => {
    if (beat.kind === 'ui' && beat.ui.type === 'voicemail') roles.set(beat.id, 'card');
    else if (beat.kind === 'ui' && beat.ui.type === 'phrase_grows') roles.set(beat.id, 'grows');
    else if (beat.kind === 'learner' || (beat.kind === 'gen' && beat.answer)) {
      roles.set(beat.id, 'turn');
    } else if (turn === -1 || i < turn) {
      const lastBeforeTurn = turn > 0 && i === turn - 1;
      roles.set(beat.id, lastBeforeTurn ? 'oops' : 'message');
    } else roles.set(beat.id, 'after');
  });
  return roles;
}

/** The voicemail scene as this screen reads it: each beat's role, and the fix the turn asks for. */
export interface VoicemailScript {
  readonly roles: ReadonlyMap<Id, BeatRole>;
  /** The words of the fix (`Can I help you?`), from the turn's expectation; null when it names none. */
  readonly fix: string | null;
}

export function voicemailScript(scene: Scene): VoicemailScript {
  const turn = scene.beats.find((b) => b.kind === 'learner');
  const expects = turn?.kind === 'learner' ? turn.answer.expects : '';
  const quoted = /"([^"]+)"/.exec(expects)?.[1] ?? null;
  return { roles: beatRoles(scene), fix: quoted };
}

const normal = (s: string) =>
  ` ${s
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;

/**
 * Whether the learner's words carry the fix. Every turn is answered by the listener before the call
 * knows how it went, so the call's frames alone can't tell a fix from Pip working it out; the
 * learner's own words can.
 */
export const saysFix = (heard: string, fix: string | null): boolean =>
  fix !== null && heard.trim() !== '' && normal(heard).includes(normal(fix));

const PHASE_OF_ROLE: Readonly<Record<BeatRole, VoicemailPhase>> = {
  card: 'message',
  message: 'message',
  oops: 'oops',
  turn: 'turn',
  grows: 'grown',
  after: 'grown',
};

const settled = (s: VoicemailState) => s.phase === 'done' || s.phase === 'offline';

/** Applies one event from the call. */
export function reduceVoicemail(
  { roles, fix }: VoicemailScript,
  state: VoicemailState,
  event: VoicemailEvent,
): VoicemailState {
  switch (event.type) {
    case 'reset':
      return initialVoicemail;
    case 'beat': {
      if (settled(state)) return state;
      const phase = PHASE_OF_ROLE[roles.get(event.beatId) ?? 'message'];
      // Past the turn: the learner fixed it when their words carried the fix, else Pip worked it out.
      const outcome =
        phase === 'grown' && state.outcome === null
          ? saysFix(state.heard, fix)
            ? 'fixed'
            : 'worked_out'
          : state.outcome;
      return { ...state, phase, beatId: event.beatId, outcome };
    }
    case 'line':
      return state;
    case 'heard':
      return event.text.trim() === '' || state.phase !== 'turn'
        ? state
        : { ...state, heard: event.text };
    case 'hint':
      return { ...state, hint: { phrase: event.phrase, gloss: event.gloss } };
    case 'ended':
      return { ...state, phase: 'done' };
    case 'error':
      // After the phrase has grown the scene is as good as over: end it warmly, not as an error.
      return state.phase === 'grown' || state.phase === 'done'
        ? { ...state, phase: 'done' }
        : { ...state, phase: 'offline', error: event.code };
  }
}

/** The burrow object for each phrase stage, as the shelves draw them. */
export const PHRASE_OBJECT: Readonly<Record<PhraseState, BurrowObjectId>> = {
  seed: 'seed',
  sprout: 'plant-0',
  leaf: 'plant-1',
  bloom: 'plant-2',
};

export interface Growth {
  readonly from: PhraseState;
  readonly to: PhraseState;
}

/**
 * How the fix grows the phrase, by the learning model's own rule: a correct, prompted use in this
 * scene, now. A sprout used again on a new day becomes a leaf; a seed sprouts; the same day leaves
 * it as it is. The post-call job records the real use; this only shows what it will be.
 */
export function growthOfFix(
  phrase: PhraseProgress | undefined,
  target: { readonly id: Id; readonly text: string },
  sceneId: Id,
  now: EpochMs,
  timezone: TimeZone,
): Growth {
  const record = phrase ? fromPhraseProgress(phrase) : seedPhrase(target.id, target.text, now);
  const { phrase: after } = usePhrase(
    record,
    { at: now, correct: true, prompted: true, contextId: sceneId },
    timezone,
  );
  return { from: record.state, to: after.state };
}
