/**
 * Writes `src/motion/keyframes/*.generated.ts` from the prototype's `@keyframes`. Run it after a
 * design sync: `pnpm --filter @yapling/theme gen`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { groupKeyframes, keyframeGroups, keyframeModuleSource } from './keyframe-sources';

const dir = join(import.meta.dirname, '../src/motion/keyframes');
mkdirSync(dir, { recursive: true });
let total = 0;
for (const group of keyframeGroups) {
  const keyframes = groupKeyframes(group);
  total += keyframes.length;
  writeFileSync(join(dir, `${group.file}.generated.ts`), keyframeModuleSource(group, keyframes));
}
console.log(`Wrote ${keyframeGroups.length} keyframe modules with ${total} keyframes.`);
