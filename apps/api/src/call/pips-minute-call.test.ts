import type { PhraseProgress, Stage } from '@yapling/contracts';
import { localDateOf } from '@yapling/domain';
import { allPipsMinuteScenes, findScene, type Answer } from '@yapling/story';
import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { call, newGuest } from '../auth/testing/client';
import { readProgress } from '../progress';
import { userObject } from '../user';
import { Phone } from '../../test/call/phone';
import { Providers, type CardAnswer } from '../../test/call/providers';
import { pipsMinuteMeta, storyPipsMinutes } from './daily';
import { cardWords, matchesCard } from './words';

/*
 * Pip's minute with the story's own scenes, rebuilt from their ids: the fix turn passes only on
 * the corrected words (Pip's mistake read back never does, by its words or by Jev), and a
 * lifesaver read back is the answer, not a request to hear the line again.
 */

const HCM = 'Asia/Ho_Chi_Minh';
const DAY = 24 * 60 * 60_000;

describe("the story's Pip's minutes", () => {
  it('are rebuilt from their ids, with Pip’s mistake kept on the fix turn', () => {
    const minute = storyPipsMinutes.find('s1-pm.2.whats-wrong.can-i-help');
    expect(minute).toMatchObject({ due: 'whats-wrong', reuse: 'can-i-help' });
    expect(minute?.scene.id).toBe('s1-pm.2.whats-wrong.can-i-help');
    expect(minute && pipsMinuteMeta(minute)?.turns).toEqual([
      { beatId: 'say', phrase: 'whats-wrong' },
      { beatId: 'fix', phrase: 'can-i-help', mistake: 'Can I to help?' },
    ]);
    expect(storyPipsMinutes.find('s1-pm.1i.yes-please')).toMatchObject({ reuse: null });
    // An id that names no minute, or a reuse with no wrong line, is none.
    for (const id of ['s1-e1', 's1-pm.4.whats-wrong', 's1-pm.1.whats-wrong.yes-please']) {
      expect(storyPipsMinutes.find(id), id).toBeNull();
    }
  });

  it('can all be played as daily calls, and no fix passes on the words of Pip’s mistake', () => {
    const scenes = allPipsMinuteScenes();
    expect(scenes.length).toBeGreaterThan(30);
    for (const scene of scenes) {
      const minute = storyPipsMinutes.find(scene.id);
      const meta = minute && pipsMinuteMeta(minute);
      expect(meta, scene.id).not.toBeNull();
      expect(findScene(scene.id)?.kind).toBe('daily');
      for (const turn of meta?.turns ?? []) {
        const beat = scene.beats.find((b) => b.id === turn.beatId);
        const answer = (beat as { answer: Answer } | undefined)?.answer;
        const words = cardWords(answer?.accept ?? [], 'Lan');
        expect(matchesCard(answer?.choices[0]?.en ?? '', words), scene.id).toBe(true);
        if (turn.mistake) expect(matchesCard(turn.mistake, words), turn.mistake).toBe(false);
      }
    }
  });
});

const seed = (id: string, text: string, at: number): PhraseProgress => ({
  id,
  text,
  state: 'seed',
  seedAt: at,
  sproutAt: null,
  leafAt: null,
  bloomAt: null,
  lastUsedAt: null,
  usedOn: [],
  contexts: [],
});

/** A learner with one phrase met yesterday and one used yesterday (for Pip to say wrong). */
async function learner(due: [string, string], reuse: [string, string], stage: Stage) {
  const session = await newGuest();
  const response = await call('/api/me/profile', {
    method: 'PUT',
    token: session.token,
    body: {
      displayName: 'Lan',
      firstLanguage: 'vi',
      roommate: { species: 'redpanda', name: 'Pip' },
      track: 'work',
      quietHours: null,
      timezone: HCM,
      notificationsAllowed: true,
      startPath: stage === 'visitor' ? 'visitor' : 'placement',
    },
  });
  expect(response.status).toBe(200);
  const yesterday = Date.now() - DAY;
  await readProgress(env.DB, session.userId, Date.now());
  const phrases = [
    seed(due[0], due[1], yesterday),
    {
      ...seed(reuse[0], reuse[1], yesterday - DAY),
      state: 'sprout',
      sproutAt: yesterday,
      lastUsedAt: yesterday,
      usedOn: [localDateOf(yesterday, HCM)],
      contexts: ['s1-e1'],
    },
  ];
  await env.DB.prepare('UPDATE progress SET phrases = ? WHERE user_id = ?')
    .bind(JSON.stringify(phrases), session.userId)
    .run();
  return session;
}

let providers: Providers;
beforeEach(() => {
  providers = new Providers().install();
  vi.spyOn(env.JOBS, 'send').mockResolvedValue(
    undefined as unknown as Awaited<ReturnType<Queue['send']>>,
  );
});
afterEach(() => {
  providers.uninstall();
  vi.restoreAllMocks();
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function say(phone: Phone, text: string) {
  providers.speech.push(text);
  const from = phone.frames.length;
  phone.speak(900);
  return phone.next('heard', () => true, { from });
}

const beat = (phone: Phone, beatId: string) =>
  phone.next('beat', (b) => b.beatId === beatId, { timeoutMs: 15_000 });

async function play(sceneId: string, stage: Stage, turns: readonly (readonly string[])[]) {
  const phone = await Phone.call(useToken, { kind: 'daily', sceneId, stage });
  await phone.next('ready');
  for (const [i, tries] of turns.entries()) {
    await beat(phone, i === 0 ? 'say' : 'fix');
    for (const text of tries) {
      await sleep(100);
      await say(phone, text);
    }
  }
  return phone.next('ended', () => true, { timeoutMs: 20_000 });
}
let useToken = '';

describe("Pip's minute with the story's scenes", () => {
  it('sprouts the seed and leafs the fixed phrase, unmetered, at Newcomer', async () => {
    const { token, userId } = await learner(
      ['whats-wrong', "What's wrong?"],
      ['can-i-help', 'Can I help?'],
      'newcomer',
    );
    useToken = token;
    const before = await userObject(env, userId).balance();
    const ended = await play('s1-pm.2.whats-wrong.can-i-help', 'newcomer', [
      ["What's wrong?"],
      ['Can I help?'],
    ]);
    expect(ended).toMatchObject({ reason: 'scene_complete', summaryPending: false });
    expect(providers.claudeRequests).toEqual([]);
    expect((await userObject(env, userId).balance()).usedSeconds).toBe(before.usedSeconds);
    const progress = await readProgress(env.DB, userId, Date.now());
    expect(progress.phrases.find((p) => p.id === 'whats-wrong')?.state).toBe('sprout');
    const fixed = progress.phrases.find((p) => p.id === 'can-i-help');
    expect(fixed?.state).toBe('leaf');
    expect(fixed?.pipReusedAt).toBeGreaterThan(0);
  }, 60_000);

  it("never passes Pip's mistake read back, even when Jev hears it as near the card", async () => {
    const { token, userId } = await learner(
      ['whats-wrong', "What's wrong?"],
      ['can-i-help', 'Can I help?'],
      'visitor',
    );
    useToken = token;
    const answers: CardAnswer[] = [];
    providers.jevCard = (request) => {
      // Pip's mistake is shown to Jev as the other card; the learner read it.
      const answer = request.state.card_b === 'Can I to help?' ? 'card_b' : 'card_a';
      answers.push(answer);
      return answer;
    };
    const ended = await play('s1-pm.1.whats-wrong.can-i-help', 'visitor', [
      ["What's wrong?"],
      ['Can I to help?', 'Can I to help?'],
    ]);
    expect(ended).toMatchObject({ reason: 'scene_complete' });
    expect(answers).toContain('card_b');
    const progress = await readProgress(env.DB, userId, Date.now());
    const reused = progress.phrases.find((p) => p.id === 'can-i-help');
    // Not fixed: no use, still a sprout; but Pip did say it wrong, so it rests a week.
    expect(reused).toMatchObject({ state: 'sprout' });
    expect(reused?.pipReusedAt).toBeGreaterThan(0);
  }, 60_000);

  it('takes a lifesaver read back on the fix turn as the answer', async () => {
    const { token, userId } = await learner(
      ['whats-wrong', "What's wrong?"],
      ['sorry-again-please', 'Sorry? Again, please.'],
      'visitor',
    );
    useToken = token;
    const ended = await play('s1-pm.3.whats-wrong.sorry-again-please', 'visitor', [
      ["What's wrong?"],
      ['Sorry? Again, please.'],
    ]);
    expect(ended).toMatchObject({ reason: 'scene_complete' });
    const progress = await readProgress(env.DB, userId, Date.now());
    expect(progress.phrases.find((p) => p.id === 'sorry-again-please')?.state).toBe('leaf');
  }, 60_000);
});
