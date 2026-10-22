import { describe, expect, it } from '@jest/globals';
import type { CallServerFrame } from '@yapling/contracts';

import { tapSocket } from '../../src/features/call/frame-tap';
import type { SocketLike } from '../../src/voice/call-socket';

class FakeSocket implements SocketLike {
  binaryType = 'blob';
  readyState = 1;
  sent: unknown[] = [];
  onopen: SocketLike['onopen'] = null;
  onmessage: SocketLike['onmessage'] = null;
  onclose: SocketLike['onclose'] = null;
  onerror: SocketLike['onerror'] = null;
  send(data: string | ArrayBuffer | ArrayBufferView) {
    this.sent.push(data);
  }
  close() {
    this.readyState = 3;
  }
}

describe('the frame tap', () => {
  it('shows the screen each frame before the engine, and passes everything through', () => {
    const raw = new FakeSocket();
    const seen: CallServerFrame[] = [];
    const order: string[] = [];
    const socket = tapSocket(
      () => raw,
      (f) => {
        seen.push(f);
        order.push('screen');
      },
    )('ws://x');
    const engine: unknown[] = [];
    socket.onmessage = (ev) => {
      engine.push(ev.data);
      order.push('engine');
    };
    socket.binaryType = 'arraybuffer';
    expect(raw.binaryType).toBe('arraybuffer');
    socket.send('hello');
    expect(raw.sent).toEqual(['hello']);

    const fixed = JSON.stringify({
      type: 'correction_resolved',
      seq: 4,
      targetId: 'past-ed',
      fixed: true,
    });
    raw.onmessage?.({ data: fixed });
    raw.onmessage?.({
      data: JSON.stringify({
        type: 'alignment',
        seq: 5,
        streamId: 1,
        chars: ['a'],
        startMs: [0],
        endMs: [1],
      }),
    });
    raw.onmessage?.({ data: 'pong' });
    const audio = new ArrayBuffer(8);
    raw.onmessage?.({ data: audio });

    expect(seen).toEqual([
      { type: 'correction_resolved', seq: 4, targetId: 'past-ed', fixed: true },
    ]);
    expect(engine).toHaveLength(4);
    expect(engine[3]).toBe(audio);
    expect(order.slice(0, 2)).toEqual(['screen', 'engine']);
  });
});
