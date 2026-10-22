import type { CallEndReason, CallKind, Stage, StartPath, TurnMode } from '@yapling/contracts';

/*
 * Every event the app sends, with its properties. Nothing else goes out: no autocapture, no
 * screens, no text the learner said or typed. Each event also carries the super properties
 * (`SuperProperties`), so test sessions can be told apart from real use.
 */

/** The first-week funnel, in order (see `funnel.ts`). */
export const FUNNEL_EVENTS = {
  install: 'app_installed',
  language: 'language_picked',
  placement: 'placement_call_done',
  firstEpisode: 'first_episode_call_done',
  ringFull: 'ring_full',
  day8: 'day8_back',
} as const;
export type FunnelStep = keyof typeof FUNNEL_EVENTS;
export type FunnelEvent = (typeof FUNNEL_EVENTS)[FunnelStep];

/** Why a call couldn't go on, as the learner saw it. */
export type CallProblem =
  /** No connection: the phone never reached the call, or it dropped for good. */
  | 'no_connection'
  /** The microphone is off for Yapling. */
  | 'mic_denied'
  /** The learner spoke and nothing was heard. */
  | 'not_heard'
  /** A live reply came later than the latency budget allows. */
  | 'slow_reply'
  /** A reply failed and the call recovered. */
  | 'reply_failed';

/** What a time-travel menu action was. */
export type TimeTravelAction =
  | 'opened'
  | 'jump_day'
  | 'real_clock'
  | 'came_back_after_away'
  | 'knock'
  | 'reset'
  | 'cost_page'
  /** A new learner who starts with Linh, onboarding skipped. */
  | 'start_visitor'
  /** A Settling-in chapter next (`day` is the chapter). */
  | 'jump_chapter'
  /** All six chapters done, the clock on the letter's day. */
  | 'letter_day';

export interface CallProperties {
  readonly kind: CallKind;
  readonly scene_id: string;
  /** The Settling-in chapter the call plays, 1 to 6; null for any other call. */
  readonly chapter: number | null;
  /** Hold to talk or hands-free, when the call answered (or at its end); null when unknown. */
  readonly turn_mode: TurnMode | null;
}

/** Where the learner said "too hard" ("Khó quá"). */
export type TooHardPlace = 'residency_card' | 'call_exit' | 'after_call' | 'me';

/**
 * What they chose on the "too hard" sheet: `slower` ("Nói chậm hơn", the pace from the next line),
 * `practise_with_linh` ("Tập với Linh trước", Visitor and Settling in), `closed` (neither).
 */
export type TooHardChoice = 'slower' | 'practise_with_linh' | 'closed';

/** A Settling-in chapter's call (the `settling` kind). */
interface ChapterProperties {
  readonly chapter: number;
  readonly scene_id: string;
  /** The chapter was done before this call: a replay from the list or the Me sheet. */
  readonly replay: boolean;
  readonly turn_mode: TurnMode | null;
}

export interface AnalyticsEvents {
  readonly app_installed: { readonly funnel_step: number };
  readonly language_picked: { readonly funnel_step: number };
  readonly placement_call_done: { readonly funnel_step: number };
  readonly first_episode_call_done: { readonly funnel_step: number };
  readonly ring_full: { readonly funnel_step: number };
  readonly day8_back: { readonly funnel_step: number };
  /** The call answered (the socket is up). */
  readonly call_started: CallProperties;
  readonly call_ended: CallProperties & {
    readonly ended_reason: CallEndReason;
    readonly duration_seconds: number;
    /** From the call record; null when it couldn't be read. */
    readonly learner_seconds: number | null;
    readonly character_seconds: number | null;
  };
  readonly call_error: CallProperties & {
    readonly problem: CallProblem;
    /** The server's error code, or the latency in milliseconds for a slow reply. */
    readonly code: string | null;
  };
  readonly paywall_viewed: { readonly store_available: boolean };

  // --- The beginner path. Turn outcomes, pass kinds (match, generous, skip), spoken "again" and
  // "slowly" and first-word times are in the call's turn log on the server, not here. ---

  /** The onboarding level question's answer, once per install (from the profile). */
  readonly path_chosen: { readonly path: StartPath };
  /** The stage the placement call's end left, once per install (the server sets it). */
  readonly placement_result: { readonly stage: Stage; readonly path: StartPath | null };
  /** A Settling-in chapter's call answered. */
  readonly chapter_started: ChapterProperties;
  /** A Settling-in chapter's call ended; `complete` when its scene played to the end. */
  readonly chapter_ended: ChapterProperties & {
    readonly ended_reason: CallEndReason;
    readonly complete: boolean;
    readonly duration_seconds: number;
    readonly learner_seconds: number | null;
  };
  /** "Nói lại" or "Chậm thôi" tapped during a call (said aloud: the turn log). */
  readonly replay_tapped: CallProperties & { readonly slower: boolean };
  /** The "too hard" sheet opened. */
  readonly too_hard_opened: { readonly place: TooHardPlace; readonly stage: Stage };
  /** What the learner chose on it. */
  readonly too_hard_chosen: {
    readonly place: TooHardPlace;
    readonly stage: Stage;
    readonly choice: TooHardChoice;
  };
  /** Linh's Newcomer card offered (the stage-up rule met at the end of a week's ring). */
  readonly stage_up_offered: { readonly week: number };
  /** The answer: the card taken, or "Ở lại thêm". */
  readonly stage_up_answered: { readonly week: number; readonly accepted: boolean };
  /** The learner switched between hold to talk and hands-free during a call. */
  readonly turn_mode_switched: CallProperties & { readonly to: TurnMode };
  readonly time_travel_used: {
    readonly action: TimeTravelAction;
    /** The day jumped to, for a jump. */
    readonly day: number | null;
  };
}
export type AnalyticsEvent = keyof AnalyticsEvents;

/** On every event. */
export interface SuperProperties {
  readonly app_variant: 'dev' | 'prd';
  /** The time-travel menu was used on this install: its days aren't real days. */
  readonly test_session: boolean;
  /** The app's clock is moved right now. */
  readonly debug_clock: boolean;
}
