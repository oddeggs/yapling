import type { Bindings } from '../env';
import { registerDeletionStep } from '../account';
import { JobMessage } from './messages';
import { runPostCall } from './post-call';
import { sendScheduledPush } from './push-sender';

export { PostCallJob, JobMessage } from './messages';

/** The clock the jobs use; tests move it. */
export const jobsClock = { now: (): number => Date.now() };

registerDeletionStep('push_sends', (db, userId) => [
  db.prepare('DELETE FROM push_sends WHERE user_id = ?').bind(userId),
]);
registerDeletionStep('progress_changes', (db, userId) => [
  db.prepare('DELETE FROM progress_changes WHERE user_id = ?').bind(userId),
]);

/**
 * The `jobs` queue's consumer: post-call summaries and scheduled pushes. A message that isn't a
 * known job is acked and logged; a job that throws is retried (then dead-lettered).
 */
export async function consumeJobs(batch: MessageBatch, env: Bindings): Promise<void> {
  for (const message of batch.messages) {
    const parsed = JobMessage.safeParse(message.body);
    if (!parsed.success) {
      console.warn('unknown job', { id: message.id });
      message.ack();
      continue;
    }
    try {
      const job = parsed.data;
      if (job.type === 'post_call') await runPostCall(env, job, jobsClock.now());
      else await sendScheduledPush(env.DB, job, jobsClock.now());
      message.ack();
    } catch (error) {
      console.error('job failed', { type: parsed.data.type, error: String(error).slice(0, 300) });
      message.retry();
    }
  }
}
