/**
 * pnpm --filter @yapling/art-sync sync      rewrites packages/art/src/generated from design/prototype/art
 * pnpm --filter @yapling/art-sync check     fails when packages/art/src/generated is out of date
 */
import { sync } from './sync';

const check = process.argv.includes('--check');
const { stale, written, removed } = sync({ check });

if (check && stale.length > 0) {
  console.error(
    `packages/art/src/generated is out of date with design/prototype/art: ${stale.join(', ')}.\n` +
      'Run `pnpm --filter @yapling/art-sync sync`.',
  );
  process.exit(1);
}
for (const name of written) console.log(`synced packages/art/src/generated/${name}`);
for (const name of removed) console.log(`removed packages/art/src/generated/${name}`);
if (stale.length === 0) console.log('packages/art/src/generated is up to date');
