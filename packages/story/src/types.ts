import type { CallKind, CharacterId, FirstLanguage, Id, Stage } from '@yapling/contracts';

/*
 * The content model: a season holds episodes, an episode holds scenes, a scene is a list of beats.
 *
 * A beat is one of:
 * - `rec`: a written line, played from its recording (or spoken by TTS from the same text while
 *   the recording is still pending);
 * - `gen`: a slot the live model fills, with an intent, constraints and a fixed outcome;
 * - `learner`: an expected learner turn;
 * - `ui`: something the app shows (the letter, the notebook, the phone, the fluency mirror).
 *
 * A `gen` beat may also wait for the learner's answer; `learner` beats always do. Every answer has
 * exits for each outcome, and tries that don't get there always end in a guaranteed fallback, so
 * no scene stalls on a learner who keeps trying. Silence is thinking time: it waits, for as long as
 * the learner likes, and never counts as a try. The learner can take longer, never lose.
 */

/** A first language with glosses. `other` learners get none. */
export type GlossLanguage = Exclude<FirstLanguage, 'other'>;

/**
 * A short, natural gloss in the learner's first language. `reviewed: true` marks glosses taken
 * verbatim from the approved design prototype; `false` marks glosses written here, still awaiting
 * a native reviewer.
 */
export interface Gloss {
  readonly text: string;
  readonly reviewed: boolean;
}

export type Glosses = Readonly<Partial<Record<GlossLanguage, Gloss>>>;

/** English shown on screen with its glosses (empty where no L1 is allowed, as in Pass it on). */
export interface GlossedText {
  readonly en: string;
  readonly glosses: Glosses;
}

/**
 * What a scene is. All but `story` and `postcard` run as live calls; those two play on the phone.
 * `settling` is a Settling-in chapter with Linh, before the story starts. `daily` is Pip's minute:
 * two card turns in the burrow, built from a phrase (`pipsMinuteScene`), never a ring slot and
 * never metered.
 */
export const SCENE_KINDS = [
  'settling',
  'placement',
  'episode',
  'real_week',
  'practice',
  'voicemail',
  'story',
  'postcard',
  'daily',
] as const;
export type SceneKind = (typeof SCENE_KINDS)[number];

export const PLACES = [
  'burrow',
  'lantern-cafe',
  'hollowbrook-office',
  'lantern-inn',
  'bus-45',
  'town-square',
] as const;
export type Place = (typeof PLACES)[number];

/** Kinds of written line, as in `audio/season-1/lines.json`. */
export const LINE_KINDS = ['scene', 'postcard', 'voicemail', 'recap', 'story', 'reaction'] as const;
export type LineKind = (typeof LINE_KINDS)[number];

/** Where a written line's audio lives, relative to `audio/season-1/lines/`. */
export interface LineAudio {
  readonly mp3: string;
  readonly timing: string;
  readonly durationMs: number;
}

/** The language a written line is spoken in: English, or Linh's Vietnamese in Settling in. */
export const LINE_LANGUAGES = ['en', 'vi'] as const;
export type LineLanguage = (typeof LINE_LANGUAGES)[number];

/**
 * A written line of the season: recorded already (`audio` set) or waiting to be recorded. Scenes
 * name lines by id only, so a line moves from `pending` to `lines` in `audio/season-1/lines.json`
 * (and through `pnpm --filter @yapling/story gen`) without touching any scene.
 */
export interface StoryLine {
  readonly id: Id;
  readonly character: CharacterId;
  /** The voice text with Eleven v4 tags (`[whispers]`). */
  readonly text: string;
  /** The plain caption shown on screen. */
  readonly caption: string;
  readonly kind: LineKind;
  /** Recorded for these stages only (Hank's opener has a Newcomer and a Local take). */
  readonly take: Stage | null;
  /** The learner's name is spliced in with the character's TTS voice. */
  readonly nameSplice: 'before' | null;
  /** Null until recorded (`tools/voice`, `yap_voice.py render <id>`). */
  readonly audio: LineAudio | null;
  /** The language the line is spoken in; TTS uses it while the line is pending. */
  readonly language: LineLanguage;
  /** The render speed from `lines.json` (Visitor lines are slow), or null for the voice's default. */
  readonly speed: number | null;
  /** The on-screen gloss of an English line; empty for a line not spoken in English. */
  readonly glosses: Glosses;
  /** For a line not spoken in English (Linh's Vietnamese), what it says in English. */
  readonly english: string | null;
  /** Tap-to-gloss segments for a long line (a story); the caption split into sentences. */
  readonly segments: readonly GlossedText[];
  /** The "What does that mean?" answer for this line, when written by hand. */
  readonly meaning: Meaning | null;
}

/** A simple-English explanation, with the L1 one tap deeper. */
export interface Meaning {
  readonly simple: string;
  readonly glosses: Glosses;
}

/** A target phrase (chunk) of the season. */
export interface TargetPhrase {
  readonly id: Id;
  readonly en: string;
  readonly glosses: Glosses;
}

/** A per-stage number (a timer, a count): `base`, or the stage's own value. */
export interface StageValue {
  readonly base: number;
  readonly byStage?: Readonly<Partial<Record<Stage, number>>>;
}

/** What the target-error outcome does in an answer. */
export type TargetErrorMode =
  /** The listener repeats the error back as a gentle question; the next try resolves it. */
  | 'correct'
  /** Counts as a try and shows the hint (the learner is correcting Pip, say). */
  | 'hint'
  /** Recast silently and move on (fluency rounds). */
  | 'accept';

/** The guaranteed way forward when the learner stays stuck. */
export interface Fallback {
  readonly speaker: CharacterId;
  readonly intent: string;
  /** Where to go after it; the beat's own next by default. */
  readonly to?: Id;
}

/**
 * What again and slowly do on a turn. `replay` (most turns): the last line again, never a try.
 * `pass`: saying it is the answer (the turn teaches "Sorry? Again, please."). `replay_and_pass`:
 * the character says the last line again, slower, and that answers the turn (a card offers it).
 */
export type ReplayMode = 'replay' | 'pass' | 'replay_and_pass';

/** An expected learner turn and what each outcome does. */
export interface Answer {
  /** Who reacts to the learner (corrections and nudges come from them). */
  readonly listener: CharacterId;
  /** What a fine answer looks like, for the director's judge. */
  readonly expects: string;
  /** Target phrases the turn can evidence (the phrases the beat tries to elicit). */
  readonly phrases: readonly Id[];
  /** The can-do the turn evidences, if any. */
  readonly canDo: Id | null;
  /** A timer ring for timed rounds; `timer_end` closes the turn. */
  readonly timer: StageValue | null;
  /**
   * Say-this cards: the words to read aloud, at most two, each glossed. `{name}` stands for the
   * learner's name and `…` for their own words. Empty: the turn has the single phrase hint only.
   */
  readonly choices: readonly GlossedText[];
  /**
   * Words that pass the turn by a word match on the transcript (lower case; `{name}` is the
   * learner's name), judged without the model. Empty: the director's judge decides. A turn with
   * words is generous: an English try without them asks again, and the second such try passes.
   */
  readonly accept: readonly string[];
  /** `always`: the card is up from the start for the whole turn. `stage`: as the stage hints. */
  readonly showHint: 'always' | 'stage';
  /**
   * The written line that says the answer first (model, then ask): the card's tap-to-hear, and
   * what plays again after an English miss. Null: the miss replays the last line spoken.
   */
  readonly model: Id | null;
  /** Lines one is picked from after a pass (a word match or the generous pass). Empty: none. */
  readonly praise: readonly Id[];
  /** What the listener says back after the generous pass (the card, said properly); null: praise. */
  readonly recast: string | null;
  readonly onReplay: ReplayMode;
  /** The task in the learner's first language, on a card when a new kind of turn starts. */
  readonly task: GlossedText | null;
  /** Counted by the placement rule. False for the placement's warm-up box. */
  readonly scored: boolean;
  readonly exits: AnswerExits;
}

export interface AnswerExits {
  readonly fine: { readonly to?: Id };
  readonly targetError: { readonly mode: TargetErrorMode };
  /** Not there yet: an unclear try, a hinted error, or (for the hint offer alone) a long quiet. */
  readonly silent: {
    /**
     * The phrase hint: shown after a try at stages that hint, offered once after a long quiet,
     * and when asked (null: the listener asks again in simpler words instead).
     */
    readonly hint: GlossedText | null;
    /** Tries (unclear answers, hinted errors; never silence) before the fallback. */
    readonly maxTries: number;
    readonly fallback: Fallback;
  };
  /** A hand-written answer to "What does that mean?" during this turn. */
  readonly meaning: Meaning | null;
}

interface BeatBase {
  /** Unique within its scene. */
  readonly id: Id;
  /** The beat after this one; the next active beat in order by default. */
  readonly next?: Id;
  /** Only at this stage and above. */
  readonly minStage?: Stage;
  /** Only at this stage and below. */
  readonly maxStage?: Stage;
  /** An outline still to be written in full. */
  readonly draft?: boolean;
}

export interface RecBeat extends BeatBase {
  readonly kind: 'rec';
  readonly line: Id;
  /** Said again one speed step slower (the live voice reads it), after someone asked. */
  readonly slower?: boolean;
}

export interface GenBeat extends BeatBase {
  readonly kind: 'gen';
  readonly speaker: CharacterId;
  /** What this line must do, for the model. */
  readonly intent: string;
  readonly constraints: readonly string[];
  /** A line in the right spirit (from the script or the prototype), never to be read verbatim. */
  readonly example: string | null;
  /** The outcome that is fixed whatever the learner says ("a meeting on Friday"). */
  readonly resolution: string | null;
  /** When set, the beat waits for the learner after speaking. */
  readonly answer: Answer | null;
}

export interface LearnerBeat extends BeatBase {
  readonly kind: 'learner';
  readonly answer: Answer;
}

/** A line of the letter, tappable for its gloss; tapping drops `seed` as a seed packet. */
export interface LetterLine extends GlossedText {
  readonly seed: GlossedText | null;
}

export interface Letter {
  readonly id: Id;
  readonly lines: readonly LetterLine[];
}

/** What a `ui` beat shows. The app draws it; the runner never waits on it. */
export type UiSpec =
  | { readonly type: 'letter'; readonly letter: Letter }
  | { readonly type: 'notebook'; readonly word: string }
  | { readonly type: 'phone'; readonly state: 'ringing' | 'ended' }
  | { readonly type: 'knock' }
  | { readonly type: 'dusk_letter' }
  | { readonly type: 'postcard'; readonly from: CharacterId }
  | { readonly type: 'voicemail'; readonly from: CharacterId }
  | { readonly type: 'fluency_mirror'; readonly round: number }
  | { readonly type: 'phrase_grows'; readonly phrase: Id }
  | { readonly type: 'timer'; readonly seconds: number }
  /** A sound effect from `audio/season-1/sfx/`. */
  | { readonly type: 'sfx'; readonly sound: SfxId };

export const SFX_IDS = [
  's1-e6-sfx-crowd-murmur',
  's1-e6-sfx-crowd-cheer',
  's1-sfx-voicemail-beep',
] as const;
export type SfxId = (typeof SFX_IDS)[number];

export interface UiBeat extends BeatBase {
  readonly kind: 'ui';
  readonly ui: UiSpec;
}

export type Beat = RecBeat | GenBeat | LearnerBeat | UiBeat;

export interface Scene {
  /** Sent as `sceneId` in `hello` for live calls. */
  readonly id: Id;
  readonly kind: SceneKind;
  readonly title: string;
  readonly place: Place;
  readonly cast: readonly CharacterId[];
  /** One or two sentences for the persona prompt. */
  readonly summary: string;
  /** The learner's goal, for the persona prompt. */
  readonly goal: string;
  readonly canDos: readonly Id[];
  readonly phrases: readonly Id[];
  readonly beats: readonly Beat[];
  readonly draft: boolean;
}

/** Which day of the episode's week a scene arrives (1 is the first day of the week). */
export interface WeekSlot {
  readonly day: number;
  readonly scene: Id;
}

/**
 * A week of the season with no episode of its own (the festival): what it opens, day by day. Its
 * ring slots name no scene, so each takes any call of its kind.
 */
export interface StoryWeek {
  readonly id: Id;
  /** The week of the season it is (the festival follows the sixth episode: week 7). */
  readonly number: number;
  readonly title: string;
  readonly scenes: readonly Scene[];
  readonly week: readonly WeekSlot[];
}

/**
 * An episode and its week. Its `week` slots name what opens on days 1–7 (ring calls on the days
 * their slots open); the learning model reads them (`StoryWeekShape` in `@yapling/domain`).
 */
export interface Episode {
  readonly id: Id;
  readonly number: number;
  readonly title: string;
  readonly place: Place;
  readonly cast: readonly CharacterId[];
  readonly logline: string;
  readonly learningFocus: string;
  readonly canDos: { readonly life: Id; readonly work: Id };
  readonly phrases: readonly Id[];
  readonly realWeek: string;
  readonly practice: string;
  readonly stageScaling: string;
  /** Every written line of the episode, in script order. */
  readonly lines: readonly Id[];
  readonly cliffhanger: Id;
  /** Pip's recap when the learner comes back after missing the week. */
  readonly recap: Id;
  /** The episode call, then the between-call content and the other calls of the week. */
  readonly scenes: readonly Scene[];
  readonly week: readonly WeekSlot[];
  readonly draft: boolean;
}

export interface Season {
  readonly id: Id;
  readonly number: number;
  readonly title: string;
  /** Onboarding, day one. */
  readonly prologue: readonly Scene[];
  /** Settling in: Visitors' short chapters with Linh before the story, in order. */
  readonly settling: readonly Scene[];
  readonly episodes: readonly Episode[];
  /** The festival week after the last episode, if the season has one. */
  readonly festival: StoryWeek | null;
}

/** The season's weeks in order, week 1 first: each episode's week, then the festival. */
export const seasonWeeks = (season: Season): readonly (Episode | StoryWeek)[] => [
  ...season.episodes,
  ...(season.festival === null ? [] : [season.festival]),
];

/** The live-call kind a scene runs as, or null for content played on the phone. */
export const callKindOf = (kind: SceneKind): CallKind | null => {
  switch (kind) {
    case 'placement':
    case 'episode':
    case 'real_week':
    case 'practice':
      return kind;
    case 'settling':
      return 'settling';
    case 'voicemail':
      return 'voicemail_reply';
    case 'story':
    case 'postcard':
      return null;
    // Pip's minute runs in the call frame as the `daily` call kind once `CallKind` has it; until
    // then the call takes its kind from the hello.
    case 'daily':
      return null;
  }
};

/** A line of `audio/season-1/lines.json`, compiled by `pnpm --filter @yapling/story gen`. */
export interface WrittenLineData {
  readonly id: Id;
  readonly character: CharacterId;
  readonly text: string;
  readonly caption: string;
  readonly kind: LineKind;
  readonly take: Stage | null;
  readonly nameSplice: 'before' | null;
  readonly language: LineLanguage;
  readonly speed: number | null;
  /** The Vietnamese gloss written beside the line in `lines.json` (`_vi`), or null. */
  readonly vi: string | null;
  readonly audio: LineAudio | null;
}

/** A recorded line, with its timing file's caption and its audio. */
export interface RecordedLineData extends WrittenLineData {
  readonly audio: LineAudio;
}

/** A line written in `pending`, not recorded yet: its caption is the voice text without tags. */
export interface PendingLineData extends WrittenLineData {
  readonly audio: null;
}

/** A recorded line's timing file: per-character alignment of the caption (seconds). */
export interface LineTiming {
  readonly id: string;
  readonly char: string;
  readonly text: string;
  readonly caption: string;
  readonly alignment: {
    readonly characters: readonly string[];
    readonly character_start_times_seconds: readonly number[];
    readonly character_end_times_seconds: readonly number[];
  };
}
