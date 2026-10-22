import { Store } from '../../voice/store';

/*
 * A spoken line's gloss on a tap, for lines the story wrote none for (a generated line, a line
 * still waiting for its written gloss, "didn't catch that"). Asked once per line and kept for the
 * call: a second tap, the bubble and the "What was said" sheet all read the same answer. A failed
 * ask can be tapped again. The call answers it (`POST /api/calls/translate`), so the request
 * needs the session token and the call's resume token.
 */

export type GlossEntry =
  | { readonly state: 'loading' }
  | { readonly state: 'ready'; readonly gloss: string | null }
  | { readonly state: 'failed' };

export type GlossFetcher = (text: string) => Promise<string | null>;

const keyOf = (text: string) => text.replace(/\s+/g, ' ').trim();

export class LineGlosses {
  readonly store = new Store<Readonly<Record<string, GlossEntry>>>({});

  constructor(private readonly fetchGloss: GlossFetcher) {}

  /** What is known about a line: nothing yet, on its way, its gloss, or a failed ask. */
  entry(text: string): GlossEntry | null {
    return this.store.get()[keyOf(text)] ?? null;
  }

  /** Asks for a line's gloss unless it is known or on its way; a failed one is asked again. */
  request(text: string): void {
    const key = keyOf(text);
    if (key === '') return;
    const known = this.store.get()[key];
    if (known && known.state !== 'failed') return;
    this.put(key, { state: 'loading' });
    this.fetchGloss(key).then(
      (gloss) => this.put(key, { state: 'ready', gloss }),
      () => this.put(key, { state: 'failed' }),
    );
  }

  private put(key: string, entry: GlossEntry): void {
    this.store.set({ ...this.store.get(), [key]: entry });
  }
}

/** `ws(s)://<api>/api/calls/socket?…` → `http(s)://<api>/api/calls/translate`. */
export function translateUrl(socketUrl: string): string {
  const [base = ''] = socketUrl.split('?');
  return base.replace(/^ws/, 'http').replace(/\/calls\/socket\/?$/, '/calls/translate');
}

/** How long a tap waits for its gloss before it shows the try-again note. */
const TRANSLATE_TIMEOUT_MS = 12_000;

/** Asks the call for a line's gloss. */
export function callGlossFetcher(options: {
  readonly socketUrl: string;
  readonly getToken: () => Promise<string>;
  /** The live call's resume token, read at the time of the tap. */
  readonly callToken: () => string | null;
  readonly fetch?: typeof fetch;
}): GlossFetcher {
  const url = translateUrl(options.socketUrl);
  const doFetch = options.fetch ?? fetch;
  return async (text) => {
    const call = options.callToken();
    if (call === null) throw new Error('no call yet');
    const token = await options.getToken();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TRANSLATE_TIMEOUT_MS);
    try {
      const response = await doFetch(url, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ call, text }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`translate answered ${response.status}`);
      const body = (await response.json()) as { gloss?: unknown };
      return typeof body.gloss === 'string' && body.gloss.trim() !== '' ? body.gloss : null;
    } finally {
      clearTimeout(timer);
    }
  };
}
