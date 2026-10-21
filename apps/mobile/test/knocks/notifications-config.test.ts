import { describe, expect, it } from '@jest/globals';

import { buildConfig } from '../../app.config';

describe('notifications in the app config', () => {
  it('builds local notifications into both variants, without APNs until pushes arrive', () => {
    for (const variant of ['dev', 'prd'] as const) {
      const config = buildConfig({}, variant, { easProjectId: undefined, apiBase: undefined });
      expect(config.plugins).toContainEqual([
        'expo-notifications',
        { enableRemoteNotifications: false },
      ]);
    }
  });
});
