/** Golden comparison of two premultiplied RGBA buffers, in 0–255 units. */
export interface Diff {
  /** Mean absolute difference over every channel of every pixel. */
  mean: number;
  /** The worst 32-px tile's mean difference over RGB (a local fault a whole-image mean dilutes). */
  worstTile: number;
  /** Share of pixels where some channel differs by more than 16. */
  over16: number;
}

/** The pass mark: mean difference ≤ 2/255. */
export const GOLDEN_MEAN_LIMIT = 2;
export const TILE = 32;

export function diff(a: Uint8Array, b: Uint8Array, width: number, height: number): Diff {
  if (a.length !== b.length) throw new Error(`size mismatch: ${a.length} vs ${b.length} bytes`);
  let sum = 0;
  let over = 0;
  for (let i = 0; i < a.length; i += 4) {
    let px = 0;
    for (let c = 0; c < 4; c++) {
      const d = Math.abs((a[i + c] ?? 0) - (b[i + c] ?? 0));
      sum += d;
      if (d > px) px = d;
    }
    if (px > 16) over++;
  }
  let worst = 0;
  for (let ty = 0; ty < height; ty += TILE) {
    for (let tx = 0; tx < width; tx += TILE) {
      let s = 0;
      let n = 0;
      for (let y = ty; y < Math.min(height, ty + TILE); y++) {
        for (let x = tx; x < Math.min(width, tx + TILE); x++) {
          const i = (y * width + x) * 4;
          for (let c = 0; c < 3; c++) s += Math.abs((a[i + c] ?? 0) - (b[i + c] ?? 0));
          n += 3;
        }
      }
      if (n > 0 && s / n > worst) worst = s / n;
    }
  }
  return {
    mean: sum / Math.max(1, a.length),
    worstTile: worst,
    over16: over / Math.max(1, a.length / 4),
  };
}

/** A picture of the difference: the reference greyed, differences in red. */
export function diffImage(a: Uint8Array, b: Uint8Array, gain = 8): Uint8Array {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i += 4) {
    let d = 0;
    for (let c = 0; c < 4; c++) d = Math.max(d, Math.abs((a[i + c] ?? 0) - (b[i + c] ?? 0)));
    const grey = ((a[i] ?? 0) + (a[i + 1] ?? 0) + (a[i + 2] ?? 0)) / 12 + 160;
    out[i] = Math.min(255, grey + d * gain);
    out[i + 1] = Math.max(0, grey - d * gain);
    out[i + 2] = Math.max(0, grey - d * gain);
    out[i + 3] = 255;
  }
  return out;
}
