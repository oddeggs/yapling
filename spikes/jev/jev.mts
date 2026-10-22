/* Minimal Jev client for the spike: one request, many questions. */
export const JEV_URL = 'https://api.typesafe.ai/v1/systemone';
export const JEV_MODEL = 'jev-1.13.0';

export type Q =
  | { type: 'choice'; instructions: unknown; criteria: Record<string, string> }
  | { type: 'noul'; instructions: unknown; criteria?: { true: string; false: string } }
  | { type: 'score'; instructions: unknown; criteria: string[] };

export interface JevResult {
  status: number;
  ms: number;
  answers: Record<string, any>;
  usage: { input_tokens: number; output_tokens: number } | null;
  model: string | null;
  error?: unknown;
}

export async function ask(state: unknown, questions: Record<string, Q>, timeoutMs = 5000): Promise<JevResult> {
  const t0 = performance.now();
  try {
    const res = await fetch(JEV_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.JEV_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: JEV_MODEL, state, questions }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body: any = await res.json().catch(() => null);
    const ms = performance.now() - t0;
    if (!res.ok) return { status: res.status, ms, answers: {}, usage: null, model: null, error: body };
    return { status: res.status, ms, answers: body.answers ?? {}, usage: body.usage ?? null, model: body.model ?? null };
  } catch (e) {
    return { status: 0, ms: performance.now() - t0, answers: {}, usage: null, model: null, error: String(e) };
  }
}

export const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  if (s.length === 0) return NaN;
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))];
};
