import { readFileSync } from 'node:fs';

import { type Browser, Session } from './cdp.ts';
import { type NetCacheOptions, routeThroughCache } from './net-cache.ts';

const INIT_SCRIPT = readFileSync(new URL('../page/init.js', import.meta.url), 'utf8');

export interface PageOptions {
  width: number;
  height: number;
  scale: number;
  net: NetCacheOptions;
}

export interface Clip {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A page in its own browser context, on the virtual clock from `page/init.js`. */
export class Page {
  readonly session: Session;
  readonly #browser: Browser;
  readonly #contextId: string;
  readonly #errors: string[] = [];
  #inflight = new Set<string>();
  #lastNetwork = Date.now();

  private constructor(browser: Browser, session: Session, contextId: string) {
    this.#browser = browser;
    this.session = session;
    this.#contextId = contextId;
    session.on('Runtime.exceptionThrown', (e) => {
      this.#errors.push(
        String(e.exceptionDetails?.exception?.description ?? e.exceptionDetails?.text),
      );
    });
    session.on('Network.requestWillBeSent', (e) => {
      this.#inflight.add(e.requestId);
      this.#lastNetwork = Date.now();
    });
    const done = (e: { requestId: string }) => {
      this.#inflight.delete(e.requestId);
      this.#lastNetwork = Date.now();
    };
    session.on('Network.loadingFinished', done);
    session.on('Network.loadingFailed', done);
  }

  static async open(browser: Browser, options: PageOptions): Promise<Page> {
    const { connection } = browser;
    const { browserContextId } = await connection.send('Target.createBrowserContext', {
      disposeOnDetach: true,
    });
    const { targetId } = await connection.send('Target.createTarget', {
      url: 'about:blank',
      browserContextId,
    });
    const { sessionId } = await connection.send('Target.attachToTarget', {
      targetId,
      flatten: true,
    });
    const session = new Session(connection, sessionId);
    const page = new Page(browser, session, browserContextId);
    await Promise.all([
      session.send('Page.enable'),
      session.send('Runtime.enable'),
      session.send('Network.enable'),
      session.send('Network.setCacheDisabled', { cacheDisabled: false }),
      session.send('Emulation.setDeviceMetricsOverride', {
        width: options.width,
        height: options.height,
        deviceScaleFactor: options.scale,
        mobile: false,
      }),
      session.send('Emulation.setEmulatedMedia', {
        media: 'screen',
        features: [
          { name: 'prefers-color-scheme', value: 'light' },
          { name: 'prefers-reduced-motion', value: 'no-preference' },
        ],
      }),
      session.send('Emulation.setTimezoneOverride', { timezoneId: 'UTC' }),
      session.send('Emulation.setLocaleOverride', { locale: 'en-US' }),
      session.send('Page.addScriptToEvaluateOnNewDocument', { source: INIT_SCRIPT }),
    ]);
    await routeThroughCache(session, options.net);
    return page;
  }

  /** Errors the page threw so far. */
  get errors(): readonly string[] {
    return this.#errors;
  }

  async goto(url: string): Promise<void> {
    const loaded = this.session.once('Page.loadEventFired', 90_000);
    const { errorText } = await this.session.send('Page.navigate', { url });
    if (errorText) throw new Error(`${url}: ${errorText}`);
    await loaded;
  }

  /** Evaluates an expression in the page, awaiting a promise, and returns its JSON value. */
  async eval<T = unknown>(expression: string): Promise<T> {
    const { result, exceptionDetails } = await this.session.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (exceptionDetails) {
      const detail = exceptionDetails.exception?.description ?? exceptionDetails.text;
      throw new Error(`In page: ${detail}`);
    }
    return result.value as T;
  }

  /** Waits (in real time) until `expression` is truthy. */
  async until(what: string, expression: string, timeoutMs = 60_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (!(await this.eval<boolean>(`!!(${expression})`))) {
      if (Date.now() > deadline) {
        const errors = this.#errors.length ? `; page errors: ${this.#errors.join(' | ')}` : '';
        throw new Error(`Timed out waiting for ${what}${errors}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  /** Waits until no request has been in flight for `quietMs` of real time. */
  async networkIdle(quietMs = 300, timeoutMs = 60_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (this.#inflight.size > 0 || Date.now() - this.#lastNetwork < quietMs) {
      if (Date.now() > deadline) throw new Error('Timed out waiting for the network');
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  /**
   * Opens a design file and waits, with the virtual clock still at zero, until it has fully
   * loaded: the runtime booted, every script and font fetched, every font face loaded.
   */
  async openDesign(url: string, ready = 'true'): Promise<void> {
    await this.goto(url);
    await this.until('the design runtime', 'window.__render.booted()');
    await this.until('the art scripts', ready);
    await this.networkIdle();
    const failed = await this.eval<number>('window.__render.loadFonts()');
    if (failed > 0) console.warn(`  ${failed} font faces failed to load on ${url}`);
    await this.networkIdle();
  }

  /** Advances the virtual clock. */
  advance(ms: number): Promise<void> {
    return this.eval(`window.__render.advance(${ms})`);
  }

  /**
   * Captures a box of the viewport at the page's scale. Now and then one capture of a still page
   * comes out with a few antialiased edge pixels a level apart; captures repeat until one image
   * has come out `agree` times, and that image wins.
   */
  async capture(clip: Clip, agree = 3, tries = 9): Promise<Buffer> {
    const seen: { png: Buffer; count: number }[] = [];
    for (let i = 0; i < tries; i++) {
      const { data } = await this.session.send('Page.captureScreenshot', {
        format: 'png',
        clip: { ...clip, scale: 1 },
        fromSurface: true,
        captureBeyondViewport: false,
        optimizeForSpeed: false,
      });
      const png = Buffer.from(data as string, 'base64');
      const match = seen.find((s) => s.png.equals(png));
      if (match) match.count++;
      else seen.push({ png, count: 1 });
      const best = seen.reduce((a, b) => (b.count > a.count ? b : a));
      if (best.count >= agree) return best.png;
    }
    console.warn(`  no capture came out ${agree} times in ${tries}`);
    return seen.reduce((a, b) => (b.count > a.count ? b : a)).png;
  }

  async close(): Promise<void> {
    await this.#browser.connection
      .send('Target.disposeBrowserContext', { browserContextId: this.#contextId })
      .catch(() => {});
  }
}

/** Runs `jobs` with at most `limit` running at once, keeping results in order. */
export async function pool<T, R>(
  items: T[],
  limit: number,
  job: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await job(items[i] as T);
    }
  });
  await Promise.all(workers);
  return results;
}
