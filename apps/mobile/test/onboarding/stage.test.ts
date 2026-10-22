import { describe, expect, it } from '@jest/globals';
import type { Profile, StageRequest } from '@yapling/contracts';

import { DataError } from '../../src/data/errors';
import type { Http, RequestSpec } from '../../src/data/http';
import { outcomeOfError, postStageRequest } from '../../src/features/onboarding/stage';

const request: StageRequest = { to: 'visitor', reason: 'self_select' };
const profile = { revision: 2, stage: 'visitor' } as unknown as Profile;

/** An API that answers each request with `answer(spec)`. */
const fakeHttp = (answer: (spec: RequestSpec<unknown, unknown>) => unknown): Http => ({
  origin: 'http://api',
  send: <Req, Res>(spec: RequestSpec<Req, Res>) =>
    Promise.resolve().then(() => answer(spec as RequestSpec<unknown, unknown>) as Res),
});

const token = (value: string) => () => Promise.resolve(value);

describe('sending a stage request', () => {
  it('posts the request to the stage route with the session’s bearer', async () => {
    const sent: RequestSpec<unknown, unknown>[] = [];
    const http = fakeHttp((spec) => {
      sent.push(spec);
      return profile;
    });
    const answer = await postStageRequest(http, token('tok'), token('renewed'), request);
    expect(answer).toBe(profile);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      method: 'POST',
      path: '/api/me/stage',
      body: request,
      token: 'tok',
    });
  });

  it('renews an ended session once and sends again', async () => {
    const tokens: (string | null | undefined)[] = [];
    const http = fakeHttp((spec) => {
      tokens.push(spec.token);
      if (spec.token === 'old') throw new DataError('unauthorized', 401);
      return profile;
    });
    await postStageRequest(http, token('old'), token('new'), request);
    expect(tokens).toEqual(['old', 'new']);
  });
});

describe('what a failed send means', () => {
  it('keeps the choice to send later when the server can’t take it now', () => {
    expect(outcomeOfError(new DataError('network'))).toBe('later');
    // An API from before the route answers 404.
    expect(outcomeOfError(new DataError('not_found', 404))).toBe('later');
    expect(outcomeOfError(new DataError('unavailable', 503))).toBe('later');
    expect(outcomeOfError(new DataError('server', 500))).toBe('later');
  });

  it('drops a choice that no longer fits the learner’s stage', () => {
    expect(outcomeOfError(new DataError('server', 409, 'stage_conflict'))).toBe('refused');
    expect(outcomeOfError(new DataError('server', 400))).toBe('refused');
    expect(outcomeOfError(new DataError('validation'))).toBe('refused');
  });
});
