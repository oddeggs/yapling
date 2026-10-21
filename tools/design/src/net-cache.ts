import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { type Session } from './cdp.ts';

/** Headers worth replaying: the type, and CORS so fonts and SRI-checked scripts still load. */
const KEPT_HEADERS = ['content-type', 'access-control-allow-origin', 'timing-allow-origin'];

interface CachedResponse {
  url: string;
  status: number;
  headers: Record<string, string>;
}

interface RequestPaused {
  requestId: string;
  request: { url: string; method: string; headers: Record<string, string> };
}

export interface NetCacheOptions {
  dir: string;
  offline: boolean;
}

/**
 * Routes every request that leaves the local server (Google Fonts, the React and Babel scripts
 * the design runtime loads from unpkg) through a disk cache: fetched once, then replayed byte for
 * byte, so renders are stable and work offline.
 */
export async function routeThroughCache(session: Session, options: NetCacheOptions): Promise<void> {
  mkdirSync(options.dir, { recursive: true });
  session.on('Fetch.requestPaused', (event: RequestPaused) => {
    fulfil(session, event, options).catch((error: unknown) => {
      console.warn(`  network: ${event.request.url}: ${String(error)}`);
      session
        .send('Fetch.failRequest', { requestId: event.requestId, errorReason: 'Failed' })
        .catch(() => {});
    });
  });
  await session.send('Fetch.enable', {
    patterns: [{ urlPattern: 'https://*', requestStage: 'Request' }],
  });
}

async function fulfil(session: Session, event: RequestPaused, options: NetCacheOptions) {
  const { url, method, headers } = event.request;
  if (method !== 'GET') {
    await session.send('Fetch.failRequest', { requestId: event.requestId, errorReason: 'Aborted' });
    return;
  }
  const key = createHash('sha256').update(url).digest('hex').slice(0, 32);
  const metaPath = join(options.dir, `${key}.json`);
  const bodyPath = join(options.dir, `${key}.body`);
  let meta: CachedResponse | undefined;
  let body: Buffer | undefined;
  try {
    meta = JSON.parse(readFileSync(metaPath, 'utf8')) as CachedResponse;
    body = readFileSync(bodyPath);
  } catch {
    meta = undefined;
  }
  if (!meta || !body) {
    if (options.offline) {
      console.warn(`  offline and not cached: ${url}`);
      await session.send('Fetch.failRequest', {
        requestId: event.requestId,
        errorReason: 'InternetDisconnected',
      });
      return;
    }
    // The browser's own headers (its user agent above all: Google Fonts serves by browser).
    const forwarded = Object.fromEntries(
      Object.entries(headers).filter(([name]) => !/^(host|accept-encoding)$/i.test(name)),
    );
    const response = await fetch(url, { headers: forwarded });
    body = Buffer.from(await response.arrayBuffer());
    const kept: Record<string, string> = {};
    for (const name of KEPT_HEADERS) {
      const value = response.headers.get(name);
      if (value) kept[name] = value;
    }
    meta = { url, status: response.status, headers: kept };
    if (response.ok) {
      writeAtomic(bodyPath, body);
      writeAtomic(metaPath, JSON.stringify(meta, null, 2));
    }
  }
  await session.send('Fetch.fulfillRequest', {
    requestId: event.requestId,
    responseCode: meta.status,
    responseHeaders: Object.entries(meta.headers).map(([name, value]) => ({ name, value })),
    body: body.toString('base64'),
  });
}

function writeAtomic(path: string, data: string | Buffer): void {
  const temp = `${path}.${process.pid}.${Math.random().toString(36).slice(2)}`;
  writeFileSync(temp, data);
  renameSync(temp, path);
}
