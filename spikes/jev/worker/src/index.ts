// Throwaway: times Jev calls from a Durable Object placed in US West (as the CallDO is).
import { DurableObject } from 'cloudflare:workers';
interface Env { PROBE: DurableObjectNamespace<Probe>; JEV_API_KEY: string; PROBE_TOKEN: string }
const URL_ = 'https://api.typesafe.ai/v1/systemone';
export class Probe extends DurableObject<Env> {
  async run(bodies: unknown[]): Promise<unknown> {
    const trace = await (await fetch('https://cloudflare.com/cdn-cgi/trace')).text();
    const colo = /colo=(\w+)/.exec(trace)?.[1] ?? '?';
    const times: { ms: number; status: number; tokens: number }[] = [];
    for (const body of bodies) {
      const t0 = Date.now();
      const res = await fetch(URL_, { method: 'POST', headers: { authorization: `Bearer ${this.env.JEV_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const j = (await res.json().catch(() => ({}))) as { usage?: { input_tokens?: number } };
      times.push({ ms: Date.now() - t0, status: res.status, tokens: j.usage?.input_tokens ?? 0 });
    }
    const cfRay = (await fetch(URL_, { method: 'OPTIONS' })).headers.get('cf-ray');
    return { colo, jevRay: cfRay, times };
  }
}
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.headers.get('x-probe') !== env.PROBE_TOKEN) return new Response('no', { status: 403 });
    const bodies = (await req.json()) as unknown[];
    const stub = env.PROBE.get(env.PROBE.idFromName('p'), { locationHint: 'wnam' });
    return Response.json(await stub.run(bodies));
  },
};
