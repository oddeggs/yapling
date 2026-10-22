import { CallServerFrame, parseFrame } from '@yapling/contracts';

import type { SocketFactory, SocketLike } from '../../voice/call-socket';

/*
 * The voice engine keeps what playback needs from the call's frames; the screen also needs some it
 * folds away (a correction's outcome, the heard turn's word timings, which recorded line a stream
 * is). This wraps the engine's socket so the screen sees every JSON frame first, unchanged; the
 * engine still parses and handles each one itself.
 */

const SKIPPED = /"type":"(alignment|partial)"/;

export type FrameListener = (frame: CallServerFrame) => void;

/** A socket factory whose sockets show each server frame to `listener` before the engine. */
export function tapSocket(make: SocketFactory, listener: FrameListener): SocketFactory {
  return (url) => tapped(make(url), listener);
}

function tapped(socket: SocketLike, listener: FrameListener): SocketLike {
  let handler: SocketLike['onmessage'] = null;
  socket.onmessage = (ev) => {
    // Alignment and partials arrive many times a second and the screen reads them from the engine.
    if (typeof ev.data === 'string' && ev.data.startsWith('{') && !SKIPPED.test(ev.data)) {
      const parsed = parseFrame(CallServerFrame, ev.data);
      if (parsed.ok) listener(parsed.frame);
    }
    handler?.(ev);
  };
  return new Proxy(socket, {
    get(target, key) {
      if (key === 'onmessage') return handler;
      const value: unknown = Reflect.get(target, key, target);
      return typeof value === 'function'
        ? (value as (...a: unknown[]) => unknown).bind(target)
        : value;
    },
    set(target, key, value) {
      if (key === 'onmessage') {
        handler = value as SocketLike['onmessage'];
        return true;
      }
      return Reflect.set(target, key, value, target);
    },
  });
}
