import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { type AddressInfo } from 'node:net';
import { extname, join, normalize, sep } from 'node:path';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
};

export interface StaticServer {
  origin: string;
  close(): Promise<void>;
}

/**
 * Serves folders read-only on 127.0.0.1 at a free port: `mounts` maps a URL prefix (`/` or
 * `/__tools/`) to a folder. The longest matching prefix wins.
 */
export async function serveFolders(mounts: Record<string, string>): Promise<StaticServer> {
  const entries = Object.entries(mounts)
    .map(([prefix, root]) => ({ prefix, base: normalize(root + sep) }))
    .sort((a, b) => b.prefix.length - a.prefix.length);
  const server = createServer((req, res) => {
    let path: string;
    try {
      path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    const mount = entries.find((m) => path.startsWith(m.prefix));
    const file = mount ? normalize(join(mount.base, path.slice(mount.prefix.length))) : '';
    const stat =
      mount && file.startsWith(mount.base) ? statSync(file, { throwIfNoEntry: false }) : undefined;
    if (!stat?.isFile()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {
      'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'content-length': stat.size,
      'cache-control': 'no-store',
    });
    createReadStream(file).pipe(res);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    origin: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.closeAllConnections();
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
