import type { Env } from "./call-do";

export { CallDO } from "./call-do";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/") return new Response("yapling voice spike\n");
    if (url.pathname !== "/call") return new Response("not found", { status: 404 });
    if (!env.SPIKE_TOKEN || url.searchParams.get("token") !== env.SPIKE_TOKEN) {
      return new Response("unauthorized", { status: 401 });
    }
    // Placement: a DO created from Vietnam lands in Hong Kong, where the Anthropic API answers
    // 403, so calls default to US West. ?where=none|apac|oc|... overrides for experiments.
    const where = url.searchParams.get("where") ?? "wnam";
    const hint = where === "none" ? {} : { locationHint: where as DurableObjectLocationHint };
    const stub = env.CALL.get(env.CALL.newUniqueId(), hint);
    return stub.fetch(request);
  },
} satisfies ExportedHandler<Env>;
