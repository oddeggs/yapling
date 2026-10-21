import { EpochMs, OpaqueId } from '@yapling/contracts';
import { z } from 'zod';

/** Pushes the server sends later: a character's voicemail, an incoming call. */
export const SCHEDULED_PUSH_KINDS = ['voicemail', 'incoming_call'] as const;
export const ScheduledPushKind = z.enum(SCHEDULED_PUSH_KINDS);
export type ScheduledPushKind = z.infer<typeof ScheduledPushKind>;

/** What the push carries for the app (a voicemail id, a scene); small, and never secret. */
export const PushPayload = z
  .record(z.string().max(64), z.unknown())
  .refine((payload) => JSON.stringify(payload).length <= 4_096, {
    message: 'At most 4 KB of payload',
  });
export type PushPayload = z.infer<typeof PushPayload>;

/**
 * The `jobs` queue message a learner's object sends when a scheduled push is due and outside the
 * learner's quiet hours. The push sender consumes it.
 */
export const ScheduledPushJob = z.object({
  type: z.literal('scheduled_push'),
  /** The scheduled push's id: a consumer that sees it twice sends it once. */
  id: OpaqueId,
  userId: OpaqueId,
  kind: ScheduledPushKind,
  payload: PushPayload,
  /** When it was asked for; quiet hours can move the send later. */
  scheduledFor: EpochMs,
  firedAt: EpochMs,
});
export type ScheduledPushJob = z.infer<typeof ScheduledPushJob>;
