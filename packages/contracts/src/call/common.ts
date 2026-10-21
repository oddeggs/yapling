import { z } from 'zod';

/*
 * The call socket: `GET /v1/calls/socket`, one WebSocket per live call between the phone and its
 * call object. The phone's first frame is `hello` (it carries the token; never put it in the URL);
 * the call answers `ready` or `error` and closes.
 *
 * Text messages are JSON frames, one object per message, a union on `type`. Binary messages are
 * audio (see `audio.ts`). Each side numbers every frame it sends, JSON and binary alike, from 1 with
 * a monotonic `seq`; a gap means a lost frame. A reconnect starts a new socket and new counters.
 *
 * Keep-alive: the phone sends the bare text message `ping`; the call answers `pong`. They are
 * never JSON frames.
 */

export const PING = 'ping';
export const PONG = 'pong';

/** A frame's position in its sender's stream: 1, 2, 3… */
export const Seq = z.int().min(1).max(0xffff_ffff);
export type Seq = z.infer<typeof Seq>;

/** A frame type this app doesn't know. Parsed into this shape so a receiver can ignore it. */
export type UnknownFrame = { readonly type: 'unknown'; readonly received: string };

/**
 * Accepts the known frames and turns any other `type` into an `unknown` frame, so an older app
 * keeps working when the call adds a frame. A known type with a bad body still fails.
 */
export const tolerant = <T extends z.ZodType>(known: T, types: readonly string[]) =>
  z.union([
    known,
    z
      .looseObject({ type: z.string().max(64) })
      .refine((f) => !types.includes(f.type), { message: 'A known frame type with a bad body' })
      .transform((f): UnknownFrame => ({ type: 'unknown', received: f.type })),
  ]);

export type FrameParse<T> =
  | { readonly ok: true; readonly frame: T }
  | { readonly ok: false; readonly error: 'not_json' | 'bad_frame' };

/** Parses one text message with a frame schema. Never throws; `ping`/`pong` are not frames. */
export const parseFrame = <T extends z.ZodType>(
  schema: T,
  message: string,
): FrameParse<z.output<T>> => {
  let raw: unknown;
  try {
    raw = JSON.parse(message);
  } catch {
    return { ok: false, error: 'not_json' };
  }
  const parsed = schema.safeParse(raw);
  return parsed.success ? { ok: true, frame: parsed.data } : { ok: false, error: 'bad_frame' };
};
