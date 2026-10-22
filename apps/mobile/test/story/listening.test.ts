import { describe, expect, it } from '@jest/globals';
import { seasonEpisodes } from '@yapling/domain';

import { SEASON_WEEKS } from '../../src/data/season';
import {
  episodeEndModel,
  glossRevealFor,
  isFirstWeekScene,
  isRecapId,
  mailboxPlan,
  panelTexts,
  recapModel,
} from '../../src/features/story/listening';
import { laterWeekPreview } from '../../src/features/story/learner';
import { listenPlan, namedCaption } from '../../src/features/story/plan';
import { lineEnded, startFlow } from '../../src/features/story/story-model';
import {
  listenItems,
  reachedItems,
  speakerOf,
  storyDurationMs,
  storyPlayedBeforeMs,
} from '../../src/features/story/week-listen-model';

const NOW = Date.UTC(2026, 9, 22, 5, 0);

const plan = (id: string, name: string | null = null) => {
  const p = listenPlan(id, 'vi', name);
  if (!p) throw new Error(`no plan for ${id}`);
  return p;
};

describe('the later weeks’ stories and postcards', () => {
  it("plays week 3's story line by line, then Linh's postcard the same day", () => {
    const p = plan('s1-e3-story');
    expect(p.weekNumber).toBe(3);
    expect(p.scenes.map((s) => s.id)).toEqual(['s1-e3-story', 's1-e3-postcard']);
    const items = listenItems(p);
    expect(items.filter((i) => i.kind === 'line')).toHaveLength(6);
    const card = items.at(-1);
    expect(card).toMatchObject({ kind: 'postcard', from: 'linh' });
    expect(card?.kind === 'postcard' ? card.line?.lineId : null).toBe('s1-e3-postcard-linh');
    for (const step of p.steps) if (step.kind === 'line') expect(step.gloss).toBeTruthy();
  });

  it('shows each story line as Pip starts it, and the postcard once its card is passed', () => {
    const p = plan('s1-e4-story');
    let flow = startFlow(p);
    expect(reachedItems(p, flow)).toHaveLength(1);
    for (let i = 0; i < 6; i++) flow = lineEnded(p, flow, flow.step);
    const reached = reachedItems(p, flow);
    expect(reached.map((r) => r.kind)).toEqual([...Array<string>(6).fill('line'), 'postcard']);
    expect(speakerOf(p)).toBe('pip');
  });

  it('fills the player over the whole story, line after line', () => {
    const p = plan('s1-e2-story');
    const total = storyDurationMs(p);
    expect(total).toBeGreaterThan(20_000);
    expect(storyPlayedBeforeMs(p, 0)).toBe(0);
    expect(storyPlayedBeforeMs(p, p.steps.length)).toBe(total);
  });

  it('plays a postcard that comes alone, from its sender', () => {
    const p = plan('s1-e2-postcard');
    expect(p.scenes.map((s) => s.id)).toEqual(['s1-e2-postcard']);
    expect(speakerOf(p)).toBe('sol');
  });

  it("stacks week 6's six good-luck postcards", () => {
    const p = plan('s1-e6-postcards');
    const cards = listenItems(p).filter((i) => i.kind === 'postcard');
    expect(cards).toHaveLength(6);
    expect(cards.every((c) => c.kind === 'postcard' && c.line !== null)).toBe(true);
  });

  it("tells Bunting Week's season story with the learner's name, and Mei's postcard", () => {
    const story = plan('s1-fest-story', 'Lan');
    expect(story.weekNumber).toBe(7);
    const first = story.steps[0];
    expect(first?.kind === 'line' ? first.caption : null).toBe(
      'Lan! This is the story of our season.',
    );
    expect(first?.kind === 'line' ? first.gloss : null).toMatch(/^Lan ơi, /);
    const nameless = plan('s1-fest-story').steps[0];
    expect(nameless?.kind === 'line' ? nameless.caption : null).toBe(
      'This is the story of our season.',
    );
    expect(nameless?.kind === 'line' ? nameless.gloss : null).not.toContain('{name}');
    expect(listenItems(plan('s1-fest-postcard'))).toMatchObject([
      { kind: 'postcard', from: 'mei' },
    ]);
  });

  it("keeps the first week's story and postcard as they were", () => {
    const p = plan('s1-e1-story');
    expect(p.scenes.map((s) => s.id)).toEqual(['s1-e1-story', 's1-e1-postcard']);
    expect(isFirstWeekScene('s1-e1-story')).toBe(true);
    expect(isFirstWeekScene('s1-e3-story')).toBe(false);
  });

  it('fills a name into a gloss only where the line asks for it', () => {
    const line = { caption: 'Hello.', nameSplice: null };
    expect(namedCaption(line, 'xin chào', 'Lan')).toEqual({ caption: 'Hello.', gloss: 'xin chào' });
  });
});

describe('how the Vietnamese shows, by stage', () => {
  it('sits under each line at Visitor and is a tap away from Newcomer', () => {
    expect(glossRevealFor('visitor', 'vi')).toBe('shown');
    expect(glossRevealFor('newcomer', 'vi')).toBe('marked');
    expect(glossRevealFor('neighbour', 'vi')).toBe('on_tap');
    expect(glossRevealFor('newcomer', 'other')).toBe('none');
    expect(glossRevealFor('local', 'vi')).toBe('none');
  });
});

describe('the recorded voicemails', () => {
  it("plays week 5's voicemail from Mei as a message, with no turn", () => {
    const m = mailboxPlan('s1-e5-voicemail', 'vi');
    expect(m).toMatchObject({ weekNumber: 5, from: 'mei', beep: null });
    expect(m?.message.lineId).toBe('s1-e5-06');
  });

  it('carries the message’s Vietnamese where the story writes it', () => {
    expect(mailboxPlan('s1-e2-voicemail', 'vi')?.message.gloss).toBeTruthy();
    expect(mailboxPlan('s1-e2-voicemail', 'other')?.message.gloss).toBeNull();
  });

  it("ends week 3's voicemail on the beep, as the message is cut off", () => {
    expect(mailboxPlan('s1-e3-voicemail', 'vi')?.beep).toBe('s1-sfx-voicemail-beep');
  });

  it("plays Bea's boat voicemail in Bunting Week", () => {
    expect(mailboxPlan('s1-fest-voicemail', 'vi')).toMatchObject({ weekNumber: 7, from: 'bea' });
  });

  it("leaves the first week's voicemail to its call: it has a fix in it", () => {
    expect(mailboxPlan('s1-e1-voicemail', 'vi')).toBeNull();
    expect(mailboxPlan('s1-e3-story', 'vi')).toBeNull();
  });
});

describe('the card that closes an episode’s week', () => {
  const datedFor = (week: number, dow: number, missed: number | null = null) => {
    const learner = laterWeekPreview(week, dow, missed, 'newcomer', NOW);
    return seasonEpisodes({
      season: SEASON_WEEKS,
      weeks: learner.weeks,
      dayIndex: learner.day,
      startedOn: learner.startedOn,
    });
  };

  it('teases Episode 3 after week 2, on the day the map gives it', () => {
    const episodes = datedFor(2, 5);
    const m = episodeEndModel(2, episodes);
    expect(m).toMatchObject({ season: 1, episode: 2, title: 'Help Wanted' });
    const e3 = episodes.find((e) => e.week === 3);
    expect(m?.next).toMatchObject({
      kind: 'episode',
      episode: 3,
      title: 'Cheaper Beans',
      face: 'hank',
      opensOn: e3?.opensOn,
      open: false,
    });
  });

  it('says the next episode is ready when its day has passed (missed weeks wait)', () => {
    const m = episodeEndModel(3, datedFor(5, 1, 4));
    expect(m?.next).toMatchObject({ kind: 'episode', episode: 4, open: true });
  });

  it('leads into Bunting Week after the last episode', () => {
    expect(episodeEndModel(6, datedFor(6, 5))?.next).toEqual({
      kind: 'festival',
      title: 'Bunting Week',
    });
  });

  it('has no card for the festival week itself', () => {
    expect(episodeEndModel(7, datedFor(7, 5))).toBeNull();
  });
});

describe('Pip’s recap for a learner coming back', () => {
  it('tells the last finished episode and leads into the one waiting', () => {
    expect(isRecapId('s1-e2.recap')).toBe(true);
    expect(isRecapId('s1-e2')).toBe(false);
    const m = recapModel('s1-e2.recap', 'vi');
    expect(m?.line.lineId).toBe('s1-e2-08');
    expect(m?.waiting.id).toBe('s1-e3');
    expect(m?.panels.length).toBeGreaterThan(1);
    expect(m?.panels.length).toBeLessThanOrEqual(4);
    expect(m?.panels.at(-1)).toMatchObject({ place: 'lantern-cafe', character: 'pip' });
  });

  it("leads the finale's own recap into the finale", () => {
    expect(recapModel('s1-e6.recap', 'vi')?.waiting.id).toBe('s1-e6');
  });

  it('has nothing for an unknown key', () => {
    expect(recapModel('nope.recap', 'vi')).toBeNull();
  });

  it('splits the line into at most four panels, in order, each where it starts', () => {
    const caption = 'One. Two! Three? Four. Five. Six.';
    const panels = panelTexts(caption);
    expect(panels).toHaveLength(3);
    expect(panels.map((p) => p.text)).toEqual(['One. Two!', 'Three? Four.', 'Five. Six.']);
    expect(panels.map((p) => caption.slice(p.start, p.start + 3))).toEqual(['One', 'Thr', 'Fiv']);
  });
});
