import type { CallEndReason, CallKind } from '@yapling/contracts';

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
  'opened' | 'jump_day' | 'real_clock' | 'came_back_after_away' | 'knock' | 'reset' | 'cost_page';

interface CallProperties {
  readonly kind: CallKind;
  readonly scene_id: string;
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
