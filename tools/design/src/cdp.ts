import { type ChildProcess, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Google Chrome on this Mac; `CHROME_PATH` overrides it. */
export const CHROME_PATH =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/**
 * Chrome flags for repeatable pixels: software raster on one thread, one sRGB profile, no partial
 * re-raster, no off-thread animation or scrolling, and every compositor stage run before a frame
 * is drawn. Sound is muted.
 */
const FLAGS = [
  '--headless',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--disable-sync',
  '--disable-component-update',
  '--disable-default-apps',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--disable-features=Translate,MediaRouter,OptimizationHints,AutofillServerCommunication',
  '--hide-scrollbars',
  '--mute-audio',
  '--font-render-hinting=none',
  '--force-color-profile=srgb',
  '--disable-gpu',
  '--disable-accelerated-2d-canvas',
  '--disable-partial-raster',
  '--num-raster-threads=1',
  '--memory-pressure-off',
  '--run-all-compositor-stages-before-draw',
  '--disable-threaded-animation',
  '--disable-threaded-scrolling',
  '--disable-checker-imaging',
  '--disable-image-animation-resync',
  '--remote-debugging-port=0',
];

type Params = Record<string, unknown>;
// CDP results are untyped JSON.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Result = any;

interface Pending {
  resolve: (value: Result) => void;
  reject: (error: Error) => void;
  method: string;
}

/** One WebSocket to the browser; sessions (pages) share it, flattened. */
export class Connection {
  readonly #ws: WebSocket;
  #nextId = 1;
  readonly #pending = new Map<number, Pending>();
  readonly #listeners = new Map<string, Set<(params: Result) => void>>();

  constructor(ws: WebSocket) {
    this.#ws = ws;
    ws.addEventListener('message', (event) => this.#receive(String(event.data)));
    ws.addEventListener('close', () => {
      for (const pending of this.#pending.values()) {
        pending.reject(new Error(`Connection closed during ${pending.method}`));
      }
      this.#pending.clear();
    });
  }

  send(method: string, params: Params = {}, sessionId?: string): Promise<Result> {
    const id = this.#nextId++;
    const message = sessionId ? { id, method, params, sessionId } : { id, method, params };
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject, method });
      this.#ws.send(JSON.stringify(message));
    });
  }

  on(sessionId: string, method: string, listener: (params: Result) => void): () => void {
    const key = `${sessionId}|${method}`;
    let set = this.#listeners.get(key);
    if (!set) this.#listeners.set(key, (set = new Set()));
    set.add(listener);
    return () => set.delete(listener);
  }

  close(): void {
    this.#ws.close();
  }

  #receive(text: string): void {
    const message = JSON.parse(text) as {
      id?: number;
      method?: string;
      params?: Result;
      result?: Result;
      error?: { message: string; data?: string };
      sessionId?: string;
    };
    if (message.id !== undefined) {
      const pending = this.#pending.get(message.id);
      if (!pending) return;
      this.#pending.delete(message.id);
      if (message.error) {
        const detail = message.error.data ? ` (${message.error.data})` : '';
        pending.reject(new Error(`${pending.method}: ${message.error.message}${detail}`));
      } else pending.resolve(message.result);
      return;
    }
    if (!message.method) return;
    const set = this.#listeners.get(`${message.sessionId ?? ''}|${message.method}`);
    if (set) for (const listener of [...set]) listener(message.params);
  }
}

/** A page target attached in flat mode. */
export class Session {
  readonly connection: Connection;
  readonly id: string;

  constructor(connection: Connection, id: string) {
    this.connection = connection;
    this.id = id;
  }

  send(method: string, params: Params = {}): Promise<Result> {
    return this.connection.send(method, params, this.id);
  }

  on(method: string, listener: (params: Result) => void): () => void {
    return this.connection.on(this.id, method, listener);
  }

  once(method: string, timeoutMs = 60_000): Promise<Result> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        off();
        reject(new Error(`Timed out waiting for ${method}`));
      }, timeoutMs);
      const off = this.on(method, (params) => {
        clearTimeout(timer);
        off();
        resolve(params);
      });
    });
  }
}

export interface Browser {
  connection: Connection;
  version: string;
  close(): Promise<void>;
}

async function waitForPort(dir: string, child: ChildProcess): Promise<string> {
  const file = join(dir, 'DevToolsActivePort');
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Chrome exited with code ${child.exitCode}`);
    try {
      const [port, path] = readFileSync(file, 'utf8').trim().split('\n');
      if (port && path) return `ws://127.0.0.1:${port}${path}`;
    } catch {
      // Not written yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('Chrome did not open its DevTools port');
}

/** Starts headless Chrome with a throwaway profile and connects to it over the DevTools protocol. */
export async function launchChrome(): Promise<Browser> {
  const dir = mkdtempSync(join(tmpdir(), 'yapling-design-chrome-'));
  const child = spawn(CHROME_PATH, [...FLAGS, `--user-data-dir=${dir}`, 'about:blank'], {
    stdio: 'ignore',
  });
  const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
  try {
    const url = await waitForPort(dir, child);
    const ws = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      ws.addEventListener('open', () => resolve(), { once: true });
      ws.addEventListener('error', () => reject(new Error(`Cannot connect to ${url}`)), {
        once: true,
      });
    });
    const connection = new Connection(ws);
    const { product } = (await connection.send('Browser.getVersion')) as { product: string };
    return {
      connection,
      version: product,
      async close() {
        try {
          await Promise.race([
            connection.send('Browser.close'),
            new Promise((resolve) => setTimeout(resolve, 3000)),
          ]);
        } catch {
          // Already closing.
        }
        connection.close();
        const killed = setTimeout(() => child.kill('SIGKILL'), 5000);
        await exited;
        clearTimeout(killed);
        rmSync(dir, { recursive: true, force: true });
      },
    };
  } catch (error) {
    child.kill('SIGKILL');
    await exited;
    rmSync(dir, { recursive: true, force: true });
    throw error;
  }
}
