import { OpaqueId } from '@yapling/contracts';
import { z } from 'zod';

import { ScheduledPushJob } from '../user';

/** The `jobs` queue message a finished call sends: write its summary and update progress. */
export const PostCallJob = z.object({
  type: z.literal('post_call'),
  callId: OpaqueId,
  userId: OpaqueId,
});
export type PostCallJob = z.infer<typeof PostCallJob>;

/** Every message the `jobs` queue carries. */
export const JobMessage = z.discriminatedUnion('type', [PostCallJob, ScheduledPushJob]);
export type JobMessage = z.infer<typeof JobMessage>;
