/**
 * A 2D affine transform in Canvas 2D order: x' = a·x + c·y + e, y' = b·x + d·y + f (the six
 * numbers of `ctx.setTransform` and `DOMMatrix`).
 */
export type Mat = readonly [a: number, b: number, c: number, d: number, e: number, f: number];

export const IDENTITY: Mat = [1, 0, 0, 1, 0, 0];

/** `m` then `n` in the canvas sense: the result maps a point through `n` first, then `m`. */
export function multiply(m: Mat, n: Mat): Mat {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

export function invert(m: Mat): Mat | null {
  const det = m[0] * m[3] - m[1] * m[2];
  if (!det || !Number.isFinite(det)) return null;
  const [a, b, c, d, e, f] = m;
  return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det];
}

export const translation = (x: number, y: number): Mat => [1, 0, 0, 1, x, y];
export const scaling = (x: number, y: number): Mat => [x, 0, 0, y, 0, 0];
export function rotation(rad: number): Mat {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [c, s, -s, c, 0, 0];
}

export const isIdentity = (m: Mat) =>
  m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0;

export const sameMat = (m: Mat, n: Mat) =>
  m[0] === n[0] &&
  m[1] === n[1] &&
  m[2] === n[2] &&
  m[3] === n[3] &&
  m[4] === n[4] &&
  m[5] === n[5];

/** Skia's 3 × 3 row-major form, for `canvas.concat` and `path.transform`. */
export const toSk = (m: Mat): number[] => [m[0], m[2], m[4], m[1], m[3], m[5], 0, 0, 1];

/** The subset of `DOMMatrix` the generators use (`new DOMMatrix().translate(…)`, `getTransform()`). */
export class DOMMatrixShim {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;

  constructor(init?: readonly number[]) {
    const [a = 1, b = 0, c = 0, d = 1, e = 0, f = 0] = init ?? [];
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;
  }

  get mat(): Mat {
    return [this.a, this.b, this.c, this.d, this.e, this.f];
  }

  multiply(other: DOMMatrixShim): DOMMatrixShim {
    return new DOMMatrixShim(multiply(this.mat, other.mat));
  }

  translate(x = 0, y = 0): DOMMatrixShim {
    return new DOMMatrixShim(multiply(this.mat, translation(x, y)));
  }

  scale(x = 1, y = x): DOMMatrixShim {
    return new DOMMatrixShim(multiply(this.mat, scaling(x, y)));
  }

  rotate(deg = 0): DOMMatrixShim {
    return new DOMMatrixShim(multiply(this.mat, rotation((deg * Math.PI) / 180)));
  }

  inverse(): DOMMatrixShim {
    return new DOMMatrixShim(invert(this.mat) ?? [NaN, NaN, NaN, NaN, NaN, NaN]);
  }
}
