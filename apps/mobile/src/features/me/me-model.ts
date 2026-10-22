import type {
  CallMetrics,
  CanDoProgress,
  MemoryCategory,
  MemoryItem,
  MinutesSummary,
  QuietHours,
  Stage,
  Track,
} from '@yapling/contracts';
import { MEMORY_CATEGORIES, RESIDENCY_STAGES, STAGES } from '@yapling/contracts';
import { SEASON_1_CAN_DOS, type CanDoTrack } from '@yapling/domain';
import type { StringKey, Translate } from '@yapling/i18n';

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
}

export interface CanDoItem {
  readonly id: string;
  readonly title: string;
  readonly ticked: boolean;
}

export interface CanDoGroup {
  readonly track: CanDoTrack;
  readonly name: string;
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

export interface MeView {
  readonly name: string;
  readonly stage: {
    readonly label: string;
    readonly step: number;
    readonly of: number;
    readonly a11y: string;
  };
  readonly canDoTitle: string;
  readonly groups: readonly CanDoGroup[];
  readonly progress: { readonly title: string; readonly note: string };
  readonly minutes: MinutesRow;
  readonly memory: { readonly title: string; readonly count: string };
  readonly notifications: { readonly title: string; readonly value: string };
  readonly help: string;
  readonly aiExplainer: string;
  readonly deleteData: string;
}

const STAGE_KEYS = {
  // Visitor: Newcomer's label until its own is written.
  visitor: 'me.stage.newcomer',
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
        ticked: ticked.has(d.id),
      })),
    };
  });
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

export function meView(inputs: MeInputs, copy: Translate): MeView {
  // "Chặng N/5" counts the residency stages from Newcomer; Visitor shows as Newcomer for now.
  const step = Math.max(1, STAGES.indexOf(inputs.stage) - STAGES.indexOf('newcomer') + 1);
  const name = { name: inputs.roommateName };
  return {
    name: inputs.displayName,
    stage: {
      label: copy(STAGE_KEYS[inputs.stage]),
      step,
      of: RESIDENCY_STAGES.length,
      a11y: copy('me.a11y.stageOf', { n: step, total: RESIDENCY_STAGES.length }),
    },
    canDoTitle: copy('me.canDoTitle'),
    groups: canDoGroups(inputs.track, inputs.canDos, copy),
    progress: { title: copy('me.progress'), note: progressNote(inputs.fluency, copy) },
    minutes: minutesRow(inputs.minutes, copy),
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
