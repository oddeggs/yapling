/**
 * The browser globals the prototype's scripts read, as the art runtime provides them (a `Path2D`
 * and canvases that record onto Skia, a clock, and stand-ins for what the art never uses).
 */
export interface PrototypeGlobals {
  window: Record<string, unknown>;
  document: {
    createElement(tag: string): object;
    getElementById(id: string): unknown;
    head: { appendChild(node: unknown): void };
  };
  // The scripts pass a path string or another of these paths.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Path2D: new (init?: any) => object;
  DOMMatrix: new (init?: readonly number[]) => object;
  setTimeout: (fn: () => void, ms?: number) => unknown;
  clearTimeout: (id: unknown) => void;
  performance: { now(): number };
  fetch: (url: string) => Promise<{ ok: boolean; json(): Promise<unknown> }>;
  Audio: unknown;
  speechSynthesis: unknown;
  SpeechSynthesisUtterance: unknown;
}
