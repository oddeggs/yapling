// Metro loads this file with Node's CommonJS loader, so it uses require and module.exports.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- CommonJS, see above
const path = require('node:path');
// eslint-disable-next-line @typescript-eslint/no-require-imports -- CommonJS, see above
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// The workspace packages export TypeScript source, and `@yapling/story/assets` requires the
// recorded lines from `audio/season-1/lines/` at the repo root: Metro has to watch the whole
// workspace, not just this app, to bundle them.
config.watchFolders = [...new Set([...(config.watchFolders ?? []), workspaceRoot])];

// pnpm links each package's dependencies beside it; the app's and the root's node_modules are the
// fallbacks for files outside any package (the audio folder has none).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
