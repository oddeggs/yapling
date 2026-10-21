import type { ScheduledPushJob } from '../user';

/*
 * Scheduled pushes (voicemails, incoming calls) from the learners' objects. Until the push lane
 * sends through Expo, this sender only records the push as sent (once per id) and logs it.
 */

export async function sendScheduledPush(
  db: D1Database,
  job: ScheduledPushJob,
  now: number,
): Promise<boolean> {
  const result = await db
    .prepare(
      `INSERT INTO push_sends (id, user_id, kind, sent_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`,
    )
    .bind(job.id, job.userId, job.kind, now)
    .run();
  const first = result.meta.changes > 0;
  if (first) console.log('scheduled push (not delivered yet)', { id: job.id, kind: job.kind });
  return first;
}
