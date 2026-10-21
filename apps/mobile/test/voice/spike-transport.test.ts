import { describe, expect, it } from '@jest/globals';

import { base64ToBytes } from '../../src/voice/lab/spike-transport';

describe('the dev lab spike adapter', () => {
  it('decodes base64 audio with and without padding', () => {
    const bytes = Uint8Array.from([0, 1, 2, 250, 251, 252, 253]);
    const b64 = Buffer.from(bytes).toString('base64');
    expect(Array.from(base64ToBytes(b64))).toEqual(Array.from(bytes));
    expect(Array.from(base64ToBytes(b64.replace(/=+$/, '')))).toEqual(Array.from(bytes));
    expect(base64ToBytes('')).toHaveLength(0);
  });
});
