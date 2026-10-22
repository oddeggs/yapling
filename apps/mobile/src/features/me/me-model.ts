import type {
  CallMetrics,
  CanDoProgress,
  FirstLanguage,
  MemoryCategory,
  MemoryItem,
  MinutesSummary,
  QuietHours,
  Stage,
  Track,
} from '@yapling/contracts';
import { MEMORY_CATEGORIES, RESIDENCY_STAGES, STAGES } from '@yapling/contracts';
import {
  SEASON_1_CAN_DOS,
  SETTLING_CAN_DOS,
  SETTLING_SCENES,
  type CanDoTrack,
} from '@yapling/domain';
import { isLanguage, translator, type StringKey, type Translate } from '@yapling/i18n';

/*
 * The Me sheet as data, from what the app knows about the learner: their stage, the can-dos they
 * have shown (and the next one to aim for), their live minutes, how their speaking is moving,
 * what their roommate remembers, and their quiet hours. Trends only, never a grade.
 */

/** What the Me sheet needs; the app's data layer provides it. */
export interface MeInputs {
  readonly displayName: string;
  readonly roommateName: string;
  readonly stage: Stage;
  readonly track: Track;
  readonly canDos: readonly CanDoProgress[];
  /** The ledger's current period; null until it has loaded. */
  readonly minutes: MinutesSummary | null;
  /** The latest call's fluency numbers; null before the first call. */
  readonly fluency: CallMetrics | null;
  readonly memory: readonly MemoryItem[];
  readonly quietHours: QuietHours | null;
  /** The learner's first language, for the meanings under a Visitor's can-dos. */
  readonly firstLanguage?: FirstLanguage;
  /** Settling-in chapters done (`progress.settlingChaptersDone`). */
  readonly settlingDone?: readonly number[];
}

export interface CanDoItem {
  readonly id: string;
  readonly title: string;
  /** The meaning in the learner's language, under a Visitor's English can-do; null otherwise. */
  readonly gloss: string | null;
  readonly ticked: boolean;
}

export interface CanDoGroup {
  readonly track: CanDoTrack;
  /** The group's header; null for the Visitor's single list. */
  readonly name: string | null;
  readonly items: readonly CanDoItem[];
}

export interface MinutesRow {
  readonly title: string;
  /** "6 of 10 left"; null until the ledger has loaded. */
  readonly value: string | null;
  /** "Get more with Plus" on the free plan only. */
  readonly plusLink: string | null;
}

export interface MemoryGroup {
  readonly category: MemoryCategory;
  readonly name: string;
  readonly items: readonly MemoryItem[];
}

export interface SettlingRow {
  readonly title: string;
  readonly sub: string;
}

/** The Settling-in card: replay a chapter, move up a pace, or "too hard". */
export interface SettlingCard {
  readonly title: string;
  readonly replay: SettlingRow | null;
  readonly faster: SettlingRow | null;
  readonly tooHard: SettlingRow | null;
}

export interface MeView {
  readonly name: string;
  readonly stage: {
    readonly label: string;
    /** Sky for a Visitor, mint from Newcomer on. */
    readonly visitor: boolean;
    /** "Chặng N/5" as dots, from Newcomer on; null for a Visitor, whose stage counts no number. */
    readonly steps: { readonly step: number; readonly of: number } | null;
    /** "Làm quen 4/6" beside a Visitor's chip; null from Newcomer on. */
    readonly settling: string | null;
    readonly a11y: string;
  };
  readonly canDoTitle: string;
  readonly groups: readonly CanDoGroup[];
  readonly settling: SettlingCard | null;
  /** Null for a Visitor: the numbers start with the story. */
  readonly progress: { readonly title: string; readonly note: string } | null;
  readonly minutes: MinutesRow;
  readonly memory: { readonly title: string; readonly count: string };
  readonly notifications: { readonly title: string; readonly value: string };
  readonly help: string;
  readonly aiExplainer: string;
  readonly deleteData: string;
}

const STAGE_KEYS = {
  visitor: 'me.stage.visitor',
  newcomer: 'me.stage.newcomer',
  neighbour: 'me.stage.neighbour',
  regular: 'me.stage.regular',
  local: 'me.stage.local',
  voice: 'me.stage.voiceOfNatterwick',
} as const satisfies Record<Stage, StringKey>;

const GROUP_KEYS = {
  life: 'me.group.life',
  work: 'me.group.work',
} as const satisfies Record<CanDoTrack, StringKey>;

const MEMORY_KEYS = {
  about_you: 'me.memory.about_you',
  coming_up: 'me.memory.coming_up',
  about_us: 'me.memory.about_us',
} as const satisfies Record<MemoryCategory, StringKey>;

const tracksOf = (track: Track): readonly CanDoTrack[] =>
  track === 'both' ? ['life', 'work'] : [track];

/**
 * The can-dos to show, per track the learner chose: every one they have ticked, then the next one
 * to aim for, in the season's order.
 */
export function canDoGroups(
  track: Track,
  progress: readonly CanDoProgress[],
  copy: Translate,
): CanDoGroup[] {
  const ticked = new Set(progress.filter((p) => p.status === 'ticked').map((p) => p.id));
  return tracksOf(track).map((t) => {
    const season = SEASON_1_CAN_DOS.filter((d) => d.track === t);
    const done = season.filter((d) => ticked.has(d.id));
    const next = season.find((d) => !ticked.has(d.id));
    const shown = next === undefined ? done : [...done, next];
    return {
      track: t,
      name: copy(GROUP_KEYS[t]),
      items: shown.map((d) => ({
        id: d.id,
        // `@yapling/i18n`'s completeness test keeps a title for every season can-do.
        title: copy(d.titleKey as Extract<StringKey, `cando.${string}`>),
        gloss: null,
        ticked: ticked.has(d.id),
      })),
    };
  });
}

type CanDoKey = Extract<StringKey, `cando.${string}`>;

/**
 * A Visitor's can-dos, one list: every Settling-in can-do ticked, then the next to aim for, each
 * in English with its meaning in the learner's language under it.
 */
export function visitorCanDos(
  progress: readonly CanDoProgress[],
  language: FirstLanguage | undefined,
): CanDoGroup {
  const en = translator('en');
  const local = language !== undefined && isLanguage(language) ? translator(language) : null;
  const ticked = new Set(progress.filter((p) => p.status === 'ticked').map((p) => p.id));
  const done = SETTLING_CAN_DOS.filter((d) => ticked.has(d.id));
  const next = SETTLING_CAN_DOS.find((d) => !ticked.has(d.id));
  const shown = next === undefined ? done : [...done, next];
  return {
    track: 'life',
    name: null,
    items: shown.map((d) => {
      const title = en(d.titleKey as CanDoKey);
      const meaning = local ? local(d.titleKey as CanDoKey) : null;
      return {
        id: d.id,
        title,
        gloss: meaning !== null && meaning !== title ? meaning : null,
        ticked: ticked.has(d.id),
      };
    }),
  };
}

/** The Settling-in card's rows for the learner's stage. */
export function settlingCard(
  stage: Stage,
  chaptersDone: number,
  copy: Translate,
): SettlingCard | null {
  const row = (title: StringKey, sub: StringKey): SettlingRow => ({
    title: copy(title as 'me.settling.replay'),
    sub: copy(sub as 'me.settling.replaySub'),
  });
  const replay = row('me.settling.replay', 'me.settling.replaySub');
  const tooHard = row('me.settling.tooHard', 'me.settling.tooHardSub');
  if (stage === 'visitor')
    return {
      title: copy('me.settling.title'),
      replay,
      faster: row('me.settling.faster', 'me.settling.fasterSub'),
      tooHard,
    };
  // A Newcomer can still practise with Linh, and play again the chapters they settled in with.
  if (stage === 'newcomer')
    return {
      title: copy('me.settling.title'),
      replay: chaptersDone > 0 ? replay : null,
      faster: null,
      tooHard,
    };
  return null;
}

/** Seconds on the wire, whole minutes on screen; never more left than there is. */
export function minutesRow(minutes: MinutesSummary | null, copy: Translate): MinutesRow {
  const monthly = minutes?.plan === 'plus';
  return {
    title: copy(monthly ? 'me.liveMinutesMonth' : 'me.liveMinutes'),
    value:
      minutes === null
        ? null
        : copy('me.minutesLeft', {
            left: Math.floor(minutes.leftSeconds / 60),
            total: Math.round(minutes.allowanceSeconds / 60),
          }),
    plusLink: minutes === null || monthly ? null : copy('me.moreWithPlus'),
  };
}

/** Whole numbers only: flow in seconds, pace in words a minute, pauses a minute. */
export function progressNote(fluency: CallMetrics | null, copy: Translate): string {
  if (fluency === null) return copy('me.progressEmpty');
  return copy('me.progressStats', {
    flow: Math.round(fluency.flowSeconds),
    pace: Math.round(fluency.paceWpm),
    pauses: Math.round(fluency.pausesPerMin),
  });
}

/** What the roommate remembers, by section, newest first; empty sections left out. */
export function memoryGroups(items: readonly MemoryItem[], copy: Translate): MemoryGroup[] {
  return MEMORY_CATEGORIES.map((category) => ({
    category,
    name: copy(MEMORY_KEYS[category]),
    items: items.filter((i) => i.category === category).sort((a, b) => b.createdAt - a.createdAt),
  })).filter((g) => g.items.length > 0);
}

/** The stage chip: "Visitor · Khách mới đến" for a Visitor, the stage's own name from Newcomer on. */
function stageLabel(stage: Stage, copy: Translate): string {
  const local = copy(STAGE_KEYS[stage]);
  if (stage !== 'visitor') return local;
  const en = translator('en')(STAGE_KEYS[stage]);
  return en === local ? en : copy('me.stageBoth', { en, local });
}

export function meView(inputs: MeInputs, copy: Translate): MeView {
  const visitor = inputs.stage === 'visitor';
  // "Chặng N/5" counts the residency stages from Newcomer; a Visitor's stage has no number.
  const step = Math.max(1, STAGES.indexOf(inputs.stage) - STAGES.indexOf('newcomer') + 1);
  const done = new Set(inputs.settlingDone ?? []).size;
  const total = SETTLING_SCENES.length;
  const name = { name: inputs.roommateName };
  const label = stageLabel(inputs.stage, copy);
  return {
    name: inputs.displayName,
    stage: {
      label,
      visitor,
      steps: visitor ? null : { step, of: RESIDENCY_STAGES.length },
      settling: visitor ? copy('me.settlingCount', { done, total }) : null,
      a11y: visitor
        ? `${label}. ${copy('me.a11y.settlingCount', { done, total })}`
        : `${label}. ${copy('me.a11y.stageOf', { n: step, total: RESIDENCY_STAGES.length })}`,
    },
    canDoTitle: copy('me.canDoTitle'),
    groups: visitor
      ? [visitorCanDos(inputs.canDos, inputs.firstLanguage)]
      : canDoGroups(inputs.track, inputs.canDos, copy),
    settling: settlingCard(inputs.stage, done, copy),
    progress: visitor
      ? null
      : { title: copy('me.progress'), note: progressNote(inputs.fluency, copy) },
    // Settling in costs no minutes: a Visitor isn't offered more of them.
    minutes: visitor
      ? { ...minutesRow(inputs.minutes, copy), plusLink: null }
      : minutesRow(inputs.minutes, copy),
    memory: {
      title: copy('me.memory', name),
      count: copy('me.memoryNotes', { count: inputs.memory.length }),
    },
    notifications: {
      title: copy('me.notifications'),
      value:
        inputs.quietHours === null
          ? copy('me.quietOff')
          : copy('common.timeRange', { from: inputs.quietHours.start, to: inputs.quietHours.end }),
    },
    help: copy('me.help'),
    aiExplainer: copy('me.aiExplainer', name),
    deleteData: copy('me.deleteData'),
  };
}
