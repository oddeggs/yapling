import { readDesign } from '../../scripts/css';

export { readDesign };

export const week1 = 'Yapling Week 1.dc.html';
export const brandBoard = 'boards/Yapling R4 Brand.dc.html';

const voidTags = new Set(['br', 'img', 'input', 'meta', 'link', 'hr', 'source', 'wbr']);

/**
 * The inline styles inside the phone of a prototype file (an element sized 390 × 844), without
 * the facilitator panel (test-build only) and without the styles' template parts (`{{ }}`).
 */
export function phoneStyles(file: string): string[] {
  const html = readDesign(file)
    .replace(/<script\b[\s\S]*?<\/script>/g, '')
    .replace(/<style\b[\s\S]*?<\/style>/g, '')
    .replace(/<sc-if value="\{\{ fac\.[\s\S]*?<\/sc-if>/g, '');
  const out: string[] = [];
  const stack: boolean[] = [];
  const tag = /<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  for (const m of html.matchAll(tag)) {
    const [, closing, name = '', attrs = '', selfClosing] = m;
    if (closing) {
      stack.pop();
      continue;
    }
    const style = /\bstyle="([^"]*)"/.exec(attrs)?.[1] ?? '';
    const inPhone = stack.at(-1) === true || /width:\s*390px;\s*height:\s*844px/.test(style);
    if (inPhone && !/width:\s*390px;\s*height:\s*844px/.test(style)) out.push(style);
    if (!selfClosing && !voidTags.has(name.toLowerCase())) stack.push(inPhone);
  }
  return out;
}

/** Every inline style of a prototype file, phone or not. */
export function allStyles(file: string): string[] {
  return [...readDesign(file).matchAll(/\bstyle="([^"]*)"/g)].map((m) => m[1] ?? '');
}

/** One CSS declaration's value in an inline style, or undefined. */
export function decl(style: string, property: string): string | undefined {
  const m = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`).exec(style);
  return m?.[1]?.trim();
}

/** The one match of `pattern` in `text`, or a failure naming what the design no longer says. */
export function first(text: string, pattern: RegExp): string {
  const m = pattern.exec(text);
  if (!m) throw new Error(`design text not found: ${pattern.source}`);
  return m[1] ?? '';
}

/** Numbers in px out of a CSS value (`8px 14px 8px 8px` → [8, 14, 8, 8]). */
export function pxValues(value: string): number[] {
  return [...value.matchAll(/(-?[\d.]+)px/g)].map((m) => Number(m[1]));
}

/** `#RRGGBB`, `#RGB` or `rgba(r,g,b,a)` as [r, g, b, a] (0–255, alpha 0–1). */
export function rgba(colour: string): [number, number, number, number] {
  const c = colour.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c);
  if (hex) {
    const h = hex[1] ?? '';
    const full = h.length === 3 ? [...h].map((x) => x + x).join('') : h;
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).concat(1) as [
      number,
      number,
      number,
      number,
    ];
  }
  const fn = /^rgba?\(([^)]+)\)$/.exec(c);
  if (fn) {
    const [r = 0, g = 0, b = 0, a = 1] = (fn[1] ?? '').split(',').map(Number);
    return [r, g, b, a];
  }
  throw new Error(`cannot read colour ${colour}`);
}
