/**
 * pnpm --filter @yapling/art golden:report [filter]
 *
 * Compares every art state (or those whose name contains `filter`) with its render, prints the
 * worst differences by kind, and writes renders and diff pictures of failures to golden/out.
 */
import { GOLDEN_MEAN_LIMIT } from './compare';
import {
  compareState,
  goldenArt,
  rendersPresent,
  SKIP_MESSAGE,
  writeFailure,
  type GoldenResult,
} from './run';
import { artStates, stateId } from './states';

const filter = process.argv[2] ?? '';
const states = artStates().filter((s) => stateId(s).includes(filter));
if (!rendersPresent(states)) {
  console.log(SKIP_MESSAGE);
  process.exit(0);
}
const g = await goldenArt();
const results: GoldenResult[] = [];
let failed = 0;
for (const s of states) {
  const r = compareState(g, s);
  results.push(r);
  if (r.mean > GOLDEN_MEAN_LIMIT) {
    failed++;
    writeFailure(g, s);
    console.log(`FAIL ${stateId(s)} mean ${r.mean.toFixed(3)} tile ${r.worstTile.toFixed(2)}`);
  }
}
for (const kind of ['critter', 'face', 'scene', 'object'] as const) {
  const of = results.filter((r) => r.state.kind === kind).sort((a, b) => b.mean - a.mean);
  if (!of.length) continue;
  const mean = of.reduce((n, r) => n + r.mean, 0) / of.length;
  console.log(`\n${kind}: ${of.length} states, average ${mean.toFixed(3)}, worst:`);
  for (const r of of.slice(0, 5)) {
    console.log(
      `  ${stateId(r.state).padEnd(34)} mean ${r.mean.toFixed(3)}  tile ${r.worstTile.toFixed(2)}  >16 ${(r.over16 * 100).toFixed(2)}%`,
    );
  }
}
console.log(
  failed
    ? `\n${failed} of ${states.length} failing`
    : `\nall ${states.length} pass (≤ ${GOLDEN_MEAN_LIMIT}/255 mean)`,
);
