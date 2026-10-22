import { STAGES, type CharacterId, type Plan, type Stage } from '@yapling/contracts';

import { slotOpensOnDay } from './ring';
import { isStageAtLeast, ttsSpeedFactor } from './stages';

/*
 * The accent ladder and the exposure ladder: which voices the learner meets at each stage, and how
 * far from text towards real conversation they can go. Neither ladder has a failure: a listening
 * checkpoint is replayed slower with Pip, and every rung can be stepped down without losing anything.
 */

/** The new voices each stage brings (Voice of Natterwick: everyone, mixed, natural speed). */
export const NEW_VOICES_BY_STAGE: Readonly<Record<Stage, readonly CharacterId[]>> = {
  // Visitor: Newcomer's voices until its own are set.
  visitor: ['pip', 'linh', 'mei'],
  newcomer: ['pip', 'linh', 'mei'],
  neighbour: ['sol', 'bea', 'nell'],
  regular: ['arjun', 'dex'],
  local: ['hank'],
  voice: [],
};

/** Every voice a learner at this stage has met through the ladder. */
export const voicesUpTo = (stage: Stage): readonly CharacterId[] => [
  ...new Set(STAGES.filter((s) => isStageAtLeast(stage, s)).flatMap((s) => NEW_VOICES_BY_STAGE[s])),
];

/** Move-ins arrive about one every two weeks. */
export const MOVE_IN_EVERY_WEEKS = 2;

/** Each replay of a checkpoint voicemail is this much slower, down to the floor. */
export const CHECKPOINT_REPLAY_STEP = 0.1;
export const CHECKPOINT_SPEED_FLOOR = 0.7;
/**
 * After this many slower replays Pip helps the learner through and the van rolls in anyway, so a
 * checkpoint never becomes a wall. Founder-tunable.
 */
export const CHECKPOINT_MAX_REPLAYS = 2;

export type CheckpointOutcome =
  | { readonly kind: 'move_in'; readonly helped: boolean }
  | { readonly kind: 'replay_slower'; readonly ttsSpeed: number };

/**
 * A listening checkpoint before a move-in (a 40-second neighbour voicemail and a question about
 * it). Understood: the neighbour moves in. Not yet: Pip replays it slower with the learner. There
 * is no failure.
 */
export const listeningCheckpoint = (
  stage: Stage,
  understood: boolean,
  replaysSoFar: number,
): CheckpointOutcome => {
  if (understood) return { kind: 'move_in', helped: replaysSoFar > 0 };
  if (replaysSoFar >= CHECKPOINT_MAX_REPLAYS) return { kind: 'move_in', helped: true };
  const slower = ttsSpeedFactor(stage) - CHECKPOINT_REPLAY_STEP * (replaysSoFar + 1);
  return {
    kind: 'replay_slower',
    ttsSpeed: Math.max(CHECKPOINT_SPEED_FLOOR, Math.round(slower * 100) / 100),
  };
};

/** The exposure ladder's rungs, from the gentlest. */
export const EXPOSURE_RUNGS = [
  'text_and_voice_notes',
  'live_pip',
  'live_neighbours',
  'camera_call',
  'hard_mode',
  'real_humans',
] as const;
export type ExposureRung = (typeof EXPOSURE_RUNGS)[number];

export interface ExposureContext {
  readonly stage: Stage;
  readonly plan: Plan;
  /** The first chat (placement) is done. */
  readonly placementDone: boolean;
  readonly dayIndex: number;
  /** Hank has challenged the learner (after Season 1 Episode 3). */
  readonly hankChallenged: boolean;
}

/**
 * Which rungs are open. Text chat and voice notes always; live voice with Pip after the first
 * chat; live voice with neighbours from the first week's episode call; the camera call with Plus
 * from Neighbour; Hard mode from Local once Hank has challenged the learner. Real humans is a later
 * feature and never opens yet.
 */
export const openRungs = (ctx: ExposureContext): ReadonlySet<ExposureRung> => {
  const open = new Set<ExposureRung>(['text_and_voice_notes']);
  if (ctx.placementDone) open.add('live_pip');
  if (ctx.placementDone && ctx.dayIndex >= slotOpensOnDay(1, 'episode'))
    open.add('live_neighbours');
  if (ctx.plan === 'plus' && isStageAtLeast(ctx.stage, 'neighbour')) open.add('camera_call');
  if (ctx.hankChallenged && isStageAtLeast(ctx.stage, 'local')) open.add('hard_mode');
  return open;
};

/**
 * The rung a learner asks for, if it is open; otherwise the highest open rung below it. Stepping
 * down is always allowed and changes nothing else.
 */
export const chooseRung = (ctx: ExposureContext, wanted: ExposureRung): ExposureRung => {
  const open = openRungs(ctx);
  const index = EXPOSURE_RUNGS.indexOf(wanted);
  for (let i = index; i >= 0; i--) {
    const rung = EXPOSURE_RUNGS[i];
    if (rung !== undefined && open.has(rung)) return rung;
  }
  return 'text_and_voice_notes';
};
