import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { generate, PACKAGE_DIR } from './generate';

for (const [path, content] of Object.entries(generate())) {
  writeFileSync(join(PACKAGE_DIR, path), content);
  console.log(`wrote ${path}`);
}
