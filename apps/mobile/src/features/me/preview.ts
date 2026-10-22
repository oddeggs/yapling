import type { CanDoProgress, MemoryItem, Stage, TurnMode } from '@yapling/contracts';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';

import type { MeActions } from './me-container';
import type { MeInputs } from './me-model';

/*
 * Development builds only: a learner on day 7, for looking at the sheet before the app's data
 * layer feeds it (`yapling-dev://me?preview=1`), or a Visitor four chapters into Settling in
 * (`yapling-dev://me?preview=visitor`), or a Newcomer in week 5 with can-dos from across the season
 * (`yapling-dev://me?preview=season`). Edits change this copy only, nothing is sent.
 */

const DAY = 24 * 60 * 60_000;

const SAMPLE_MEMORY: readonly MemoryItem[] = [
  {
    id: 'sample-job',
    text: 'You work in marketing at a bank in District 1.',
    category: 'about_you',
    createdAt: Date.UTC(2026, 9, 16),
    sourceCallId: null,
  },
  {
    id: 'sample-goal',
    text: 'You want to speak up more in the Monday stand-up.',
    category: 'about_you',
    createdAt: Date.UTC(2026, 9, 17),
    sourceCallId: null,
  },
  {
    id: 'sample-interview',
    text: 'Your interview with the Singapore team is on Thursday.',
    category: 'coming_up',
    createdAt: Date.UTC(2026, 9, 18),
    sourceCallId: null,
  },
];

const sampleVisitor = (memory: readonly MemoryItem[], stage: Stage): MeInputs => ({
  ...sampleInputs(memory),
  stage,
  canDos: [
    {
      id: 'say-hello-and-your-name',
      stage: 'visitor',
      status: 'ticked',
      evidence: [{ callRecordId: 'sample-call', quote: 'Hi! I’m Lan.', at: Date.now() - DAY }],
      witness: 'linh',
      tickedOn: '2026-10-21',
    },
  ],
  minutes: {
    plan: 'free',
    periodStart: Date.now() - 2 * DAY,
    periodEnd: Date.now() + 5 * DAY,
    allowanceSeconds: 600,
    usedSeconds: 120,
    leftSeconds: 480,
    firstWeek: false,
  },
  fluency: null,
  firstLanguage: 'vi',
  settlingDone: [1, 2, 3, 4],
});

const sampleInputs = (memory: readonly MemoryItem[]): MeInputs => ({
  displayName: 'Lan',
  roommateName: 'Pip',
  stage: 'newcomer',
  track: 'both',
  canDos: [
    {
      id: 'introduce-yourself-30s',
      stage: 'newcomer',
      status: 'ticked',
      evidence: [{ callRecordId: 'sample-call', quote: 'Hi, I’m Lan.', at: Date.now() - DAY }],
      witness: 'mei',
      tickedOn: '2026-10-21',
    },
  ],
  minutes: {
    plan: 'free',
    periodStart: Date.now() - 2 * DAY,
    periodEnd: Date.now() + 5 * DAY,
    allowanceSeconds: 600,
    usedSeconds: 240,
    leftSeconds: 360,
    firstWeek: false,
  },
  fluency: { flowSeconds: 48, paceWpm: 112, pausesPerMin: 3 },
  memory,
  quietHours: { start: '22:00', end: '08:00' },
});

const seasonTick = (id: string, witness: CanDoProgress['witness'], day: string): CanDoProgress => ({
  id,
  stage: 'newcomer',
  status: 'ticked',
  evidence: [{ callRecordId: 'sample-call', quote: 'Sample line', at: Date.now() - DAY }],
  witness,
  tickedOn: day,
});

/** Week 5: can-dos ticked in Episodes 1–4. */
const SEASON_CAN_DOS: readonly CanDoProgress[] = [
  seasonTick('ask-whats-wrong', 'mei', '2026-09-08'),
  seasonTick('introduce-yourself-30s', 'mei', '2026-09-10'),
  seasonTick('tell-me-about-yourself', 'sol', '2026-09-14'),
  seasonTick('say-no-politely', 'hank', '2026-09-21'),
  seasonTick('push-back-offer-alternative', 'hank', '2026-09-21'),
  seasonTick('agree-disagree-kindly', 'nell', '2026-09-28'),
];

/** The sample learner and actions that edit it in place; null when not previewing. */
export function useMePreview(on: boolean): { inputs: MeInputs; actions: MeActions } | null {
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const [memory, setMemory] = useState<readonly MemoryItem[]>(SAMPLE_MEMORY);
  const [stage, setStage] = useState<Stage>('visitor');
  const [turnMode, setTurnMode] = useState<TurnMode>('hold_to_talk');
  const visitor = preview === 'visitor';
  const season = preview === 'season';
  return useMemo(() => {
    if (!on) return null;
    const actions: MeActions = {
      updateMemory: (id, text) => {
        setMemory((m) => m.map((i) => (i.id === id ? { ...i, text } : i)));
        return Promise.resolve();
      },
      deleteMemory: (id) => {
        setMemory((m) => m.filter((i) => i.id !== id));
        return Promise.resolve();
      },
      deleteAccount: () => Promise.reject(new Error('the preview has no account to delete')),
      requestStage: (request) => setStage(request.to),
      setTurnMode,
    };
    const inputs = visitor ? sampleVisitor(memory, stage) : sampleInputs(memory);
    return {
      inputs: { ...inputs, turnMode, ...(season ? { canDos: SEASON_CAN_DOS } : {}) },
      actions,
    };
  }, [on, memory, visitor, season, stage, turnMode]);
}
