import type { PlacementSummary } from './residency';

/*
 * Development builds only: the residency card with a summary in each state, to look at without
 * a placement call (`/onboarding/card?preview=pending|partial|full|none`). Release builds never
 * read it.
 */

const WINS = ['You said what you do at work in a full sentence', 'You asked Pip a question back'];

const PREVIEWS: Readonly<Record<string, PlacementSummary>> = {
  pending: { kind: 'pending' },
  partial: { kind: 'ready', wins: WINS.slice(0, 1) },
  full: { kind: 'ready', wins: WINS },
  none: { kind: 'none' },
};

export const previewSummary = (kind: string | undefined): PlacementSummary | null =>
  (kind !== undefined ? PREVIEWS[kind] : undefined) ?? null;
