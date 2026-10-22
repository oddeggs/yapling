/*
 * What the call heard the learner say, handed from the call screen to the after-call card when the
 * call ends, so the Visitor's card can give the learner's own sentences back without sending the
 * transcript anywhere. It lives as long as the app does: after a restart the card falls back to
 * the lines the server kept for the call.
 */

/** Only the latest few calls are kept; the card is shown right after its call. */
const KEEP = 5;

const said = new Map<string, readonly string[]>();

/** The call's heard turns, in order (the call screen's `heard` texts). */
export function keepWhatWasSaid(callId: string, lines: readonly string[]): void {
  said.delete(callId);
  said.set(callId, [...lines]);
  while (said.size > KEEP) {
    const oldest = said.keys().next().value;
    if (oldest === undefined) break;
    said.delete(oldest);
  }
}

/** What the call heard, or null when the call screen didn't hand it over. */
export function whatWasSaid(callId: string): readonly string[] | null {
  return said.get(callId) ?? null;
}
