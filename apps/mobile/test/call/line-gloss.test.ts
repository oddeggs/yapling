import { describe, expect, it, jest } from '@jest/globals';

import { callGlossFetcher, LineGlosses, translateUrl } from '../../src/features/call/line-gloss';

/** A promise and its settle functions, to answer a fetch when the test says so. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('the line gloss cache', () => {
  it('asks once per line, whatever the spacing, and keeps the answer', async () => {
    const answer = deferred<string | null>();
    const fetchGloss = jest.fn((_: string) => answer.promise);
    const glosses = new LineGlosses(fetchGloss);
    glosses.request('Oh, thank  you!');
    glosses.request(' Oh, thank you! ');
    expect(glosses.entry('Oh, thank you!')).toEqual({ state: 'loading' });
    answer.resolve('Ồ, cảm ơn bạn!');
    await flush();
    glosses.request('Oh, thank you!');
    expect(fetchGloss).toHaveBeenCalledTimes(1);
    expect(fetchGloss).toHaveBeenCalledWith('Oh, thank you!');
    expect(glosses.entry('Oh, thank you!')).toEqual({ state: 'ready', gloss: 'Ồ, cảm ơn bạn!' });
  });

  it('asks again after a failure, and tells its subscribers', async () => {
    let calls = 0;
    const glosses = new LineGlosses(() => {
      calls += 1;
      return calls === 1 ? Promise.reject(new Error('offline')) : Promise.resolve(null);
    });
    const seen: string[] = [];
    glosses.store.subscribe(() => seen.push(glosses.entry('Hi')?.state ?? 'none'));
    glosses.request('Hi');
    await flush();
    expect(glosses.entry('Hi')).toEqual({ state: 'failed' });
    glosses.request('Hi');
    await flush();
    expect(glosses.entry('Hi')).toEqual({ state: 'ready', gloss: null });
    expect(seen).toEqual(['loading', 'failed', 'loading', 'ready']);
    glosses.request('   ');
    expect(calls).toBe(2);
  });
});

describe('asking the call', () => {
  it('turns the socket URL into the translate route', () => {
    expect(translateUrl('wss://api.yapling.app/api/calls/socket?clock=1790000000000')).toBe(
      'https://api.yapling.app/api/calls/translate',
    );
    expect(translateUrl('ws://127.0.0.1:8787/api/calls/socket')).toBe(
      'http://127.0.0.1:8787/api/calls/translate',
    );
  });

  it('posts the line with the session and the call, and reads the gloss', async () => {
    const fetchMock = jest.fn((_url: string, _init: RequestInit) =>
      Promise.resolve(new Response(JSON.stringify({ gloss: 'Xin chào' }), { status: 200 })),
    );
    const fetcher = callGlossFetcher({
      socketUrl: 'wss://api.test/api/calls/socket',
      getToken: () => Promise.resolve('session-token'),
      callToken: () => 'call-token',
      fetch: fetchMock as unknown as typeof fetch,
    });
    await expect(fetcher('Hello')).resolves.toBe('Xin chào');
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://api.test/api/calls/translate');
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>).authorization).toBe('Bearer session-token');
    expect(JSON.parse(init?.body as string)).toEqual({ call: 'call-token', text: 'Hello' });
  });

  it('fails before the call is ready, and on an error answer', async () => {
    const fetchMock = jest.fn(() =>
      Promise.resolve(new Response('{"error":{"code":"no_call"}}', { status: 404 })),
    );
    const base = {
      socketUrl: 'wss://api.test/api/calls/socket',
      getToken: () => Promise.resolve('t'),
      fetch: fetchMock as unknown as typeof fetch,
    };
    await expect(callGlossFetcher({ ...base, callToken: () => null })('Hi')).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(callGlossFetcher({ ...base, callToken: () => 'c' })('Hi')).rejects.toThrow('404');
  });
});
