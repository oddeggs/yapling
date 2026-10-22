import type { CallData } from './finalize';
import type { FrameSender } from './frames';

/*
 * Guardrails (concept §14): the AI disclosure at the start of a session and every three hours of
 * cumulative call time, a break reminder after three hours of continuous use (back-to-back calls
 * count as one stretch), and the crisis hand-over with the learner's country's resources.
 */

export const AI_DISCLOSURE_EVERY_MS = 3 * 60 * 60_000;
export const BREAK_REMINDER_AFTER_MS = 3 * 60 * 60_000;
/** Calls closer together than this count as one stretch of use. */
export const CONTINUOUS_GAP_MS = 10 * 60_000;

/** Countries with crisis resources in the app; everyone else sees Vietnam's until theirs land. */
const CRISIS_COUNTRIES = new Set(['vn']);
const DEFAULT_COUNTRY = 'vn';

/** The safety sheet's resources key for a country code (`VN` → `crisis.vn`). */
export function crisisResourcesKey(country: string | null): string {
  const code = (country ?? '').toLowerCase();
  return `crisis.${CRISIS_COUNTRIES.has(code) ? code : DEFAULT_COUNTRY}`;
}

/** The AI disclosure, now: the `safety` frame, and when it was shown (cumulative call time). */
export function discloseAi(data: CallData, frames: FrameSender): void {
  frames.send({ type: 'safety', kind: 'ai_disclosure', resourcesKey: null });
  data.disclosedAtMs = data.priorCallSeconds * 1_000 + (Date.now() - data.meta.startedAt);
}

/** The disclosure again after three hours of call time, and the break reminder once. */
export function keepHouse(data: CallData, frames: FrameSender): void {
  const now = Date.now();
  const cumulative = data.priorCallSeconds * 1_000 + (now - data.meta.startedAt);
  if (cumulative - data.disclosedAtMs >= AI_DISCLOSURE_EVERY_MS) discloseAi(data, frames);
  if (!data.breakSent && now - data.continuousSince >= BREAK_REMINDER_AFTER_MS) {
    data.breakSent = true;
    frames.send({ type: 'safety', kind: 'break_reminder', resourcesKey: null });
  }
}
