import { promisify } from 'node:util';
import { constants, crc32, deflate, inflate } from 'node:zlib';

const deflateAsync = promisify(deflate);
const inflateAsync = promisify(inflate);

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunk(type: string, body: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])) >>> 0, 0);
  return Buffer.concat([head, body, crc]);
}

/**
 * Re-deflates a PNG's image data at the highest zlib level, keeping every pixel, filter byte and
 * other chunk as Chrome wrote them: about a fifth smaller, and as deterministic as the input. Runs on
 * zlib's thread pool, off the event loop that carries the DevTools traffic.
 */
export async function recompressPng(png: Buffer): Promise<Buffer> {
  if (!png.subarray(0, 8).equals(SIGNATURE)) throw new Error('Not a PNG');
  const before: Buffer[] = [];
  const after: Buffer[] = [];
  const idat: Buffer[] = [];
  for (let at = 8; at < png.length;) {
    const length = png.readUInt32BE(at);
    const type = png.subarray(at + 4, at + 8).toString('latin1');
    const whole = png.subarray(at, at + 12 + length);
    if (type === 'IDAT') idat.push(png.subarray(at + 8, at + 8 + length));
    else (idat.length ? after : before).push(whole);
    at += 12 + length;
  }
  const raw = await inflateAsync(Buffer.concat(idat));
  const packed = await deflateAsync(raw, {
    level: 9,
    memLevel: 9,
    strategy: constants.Z_DEFAULT_STRATEGY,
  });
  return Buffer.concat([SIGNATURE, ...before, chunk('IDAT', packed), ...after]);
}
