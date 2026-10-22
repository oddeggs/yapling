import { RING_SLOT_KINDS } from '@yapling/contracts';
import { recapFor, SEASON_1_CAN_DOS, SEASON_1_EPISODES } from '@yapling/domain';
import { describe, expect, it } from 'vitest';

import { EPISODES, findScene, RECAP_LINES, recapLine } from './catalogue';
import { findLine } from './lines';
import { SEASON_1 } from './season-1';
import { callKindOf } from './types';

describe('season 1', () => {
  it('uses the learning model episode ids, in order', () => {
    expect(SEASON_1.episodes.map((e) => e.id)).toEqual([...SEASON_1_EPISODES]);
  });

  it("maps the learning model's recap keys to Pip's recap lines", () => {
    expect(RECAP_LINES).toEqual({
      's1-e1.recap': 's1-e1-11',
      's1-e2.recap': 's1-e2-08',
      's1-e3.recap': 's1-e3-12',
      's1-e4.recap': 's1-e4-09',
      's1-e5.recap': 's1-e5-12',
      's1-e6.recap': 's1-e6-06',
    });
    const key = recapFor(['s1-e1']);
    expect(key && recapLine(key)).toBe('s1-e1-11');
    for (const id of Object.values(RECAP_LINES)) expect(findLine(id)?.kind).toBe('recap');
  });

  it("takes each episode's can-dos from the learning model", () => {
    for (const episode of EPISODES) {
      const own = SEASON_1_CAN_DOS.filter((c) => c.episode === episode.id);
      expect(episode.canDos).toEqual({
        life: own.find((c) => c.track === 'life')?.id,
        work: own.find((c) => c.track === 'work')?.id,
      });
    }
  });

  it('lists every written line of each episode, cliffhanger and recap included', () => {
    for (const episode of EPISODES) {
      for (const id of episode.lines) expect(findLine(id), id).toBeDefined();
      expect(episode.lines).toContain(episode.cliffhanger);
      expect(episode.lines).toContain(episode.recap);
    }
  });

  it("schedules each week's scenes, and runs the ring's calls as live calls", () => {
    for (const episode of EPISODES) {
      for (const slot of episode.week) {
        const scene = findScene(slot.scene);
        expect(scene, slot.scene).toBeDefined();
        expect(episode.scenes).toContain(scene);
      }
    }
    for (const scene of SEASON_1.episodes[0]?.scenes ?? []) {
      const kind = callKindOf(scene.kind);
      if ((RING_SLOT_KINDS as readonly string[]).includes(scene.kind))
        expect(kind).toBe(scene.kind);
    }
  });

  it('writes the prologue and every episode in full', () => {
    expect(SEASON_1.episodes.map((e) => e.draft)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
    const scenes = [...SEASON_1.prologue, ...SEASON_1.episodes.flatMap((e) => e.scenes)];
    for (const scene of scenes) {
      expect(scene.draft, scene.id).toBe(false);
      for (const beat of scene.beats)
        expect(beat.draft ?? false, `${scene.id}/${beat.id}`).toBe(false);
    }
  });
});
