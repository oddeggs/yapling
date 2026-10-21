// Draws one art state into a transparent canvas and returns it as PNG base64.
// The call is exactly what the manifest records: a canvas of (w + 2 pad) × (h + 2 pad) CSS px at
// `scale`, the transform [scale, 0, 0, scale, pad × scale, pad × scale], then YapArt[fn](ctx, w, h, o).
window.__art = {
  ready: () => !!(window.YapArt && window.YapArt.r6 && window.YapArt.s_critter),
  info: () => ({ moods: window.YapArt.MOODS.slice(), species: Object.keys(window.YapArt.SPECIES) }),
  draw(spec) {
    const { fn, w, h, pad, scale, o } = spec;
    const draw = window.YapArt[fn];
    if (typeof draw !== 'function') throw new Error('No generator YapArt.' + fn);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round((w + 2 * pad) * scale);
    canvas.height = Math.round((h + 2 * pad) * scale);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(scale, 0, 0, scale, pad * scale, pad * scale);
    draw(ctx, w, h, o);
    return canvas.toDataURL('image/png').slice('data:image/png;base64,'.length);
  },
};
