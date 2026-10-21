import { readFileSync } from 'node:fs';

/**
 * Pulls one face out of a TrueType collection (`.ttc`) as a standalone font file, for the system
 * fonts the prototype's Chrome falls back to on this Mac (CanvasKit reads only a collection's
 * first face).
 */
interface Face {
  offset: number;
  weight: number;
  italic: boolean;
}

function faces(view: DataView): Face[] {
  if (view.getUint32(0) !== 0x74746366) return [{ offset: 0, ...style(view, 0) }];
  const n = view.getUint32(8);
  return Array.from({ length: n }, (_, i) => {
    const offset = view.getUint32(12 + i * 4);
    return { offset, ...style(view, offset) };
  });
}

function tableDir(view: DataView, at: number): { tag: string; offset: number; length: number }[] {
  const count = view.getUint16(at + 4);
  return Array.from({ length: count }, (_, i) => {
    const r = at + 12 + i * 16;
    const tag = String.fromCharCode(...[0, 1, 2, 3].map((k) => view.getUint8(r + k)));
    return { tag, offset: view.getUint32(r + 8), length: view.getUint32(r + 12) };
  });
}

function style(view: DataView, at: number): { weight: number; italic: boolean } {
  const os2 = tableDir(view, at).find((t) => t.tag === 'OS/2');
  if (!os2) return { weight: 400, italic: false };
  return {
    weight: view.getUint16(os2.offset + 4),
    italic: (view.getUint16(os2.offset + 62) & 1) === 1,
  };
}

/** The upright face nearest `weight` from a font file or collection, as a standalone font. */
export function extractFace(file: string, weight: number): Uint8Array {
  const bytes = new Uint8Array(readFileSync(file));
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const all = faces(view).filter((f) => !f.italic);
  const face = all.sort((a, b) => Math.abs(a.weight - weight) - Math.abs(b.weight - weight))[0];
  if (!face) throw new Error(`@yapling/art: no upright face in ${file}`);
  if (face.offset === 0 && view.getUint32(0) !== 0x74746366) return bytes;
  const dir = tableDir(view, face.offset);
  const head = 12 + dir.length * 16;
  const size = dir.reduce((n, t) => n + ((t.length + 3) & ~3), head);
  const out = new Uint8Array(size);
  const ov = new DataView(out.buffer);
  out.set(bytes.subarray(face.offset, face.offset + 12), 0);
  let at = head;
  dir.forEach((t, i) => {
    const r = 12 + i * 16;
    out.set(bytes.subarray(face.offset + 12 + i * 16, face.offset + 12 + i * 16 + 8), r);
    ov.setUint32(r + 8, at);
    ov.setUint32(r + 12, t.length);
    out.set(bytes.subarray(t.offset, t.offset + t.length), at);
    at += (t.length + 3) & ~3;
  });
  return out;
}
