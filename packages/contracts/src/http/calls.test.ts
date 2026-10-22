import { at, callRecordId, memoryId } from '../samples.test-data';
import { describeSchemas } from '../schema-runner.test-data';
import * as calls from './calls';

const fix = {
  from: 'Yesterday I fix the sink',
  to: 'Yesterday I fixed the sink',
  targetId: 'past_ed',
  explanation: 'Việc đã xong hôm qua: thêm -ed.',
};
const metrics = { flowSeconds: 48, paceWpm: 112, pausesPerMin: 3.2 };
const summary = {
  version: calls.CALL_SUMMARY_VERSION,
  wins: ['You ordered and changed your order.', 'You asked Mei to slow down.'],
  fix,
  phraseEvents: [
    { phraseId: 'could-i-get', text: 'Could I get…?', event: 'sprouted' },
    { phraseId: 'push-to-friday', text: 'Could we push that to Friday?', event: 'met' },
  ],
  canDoEvidence: [
    { canDoId: 'order-and-change', quote: 'Could I get a kaya toast?', witness: 'mei' },
  ],
  metrics,
  memoryItemIds: [memoryId],
};
const record = {
  id: callRecordId,
  kind: 'episode',
  sceneId: 's1-e1',
  character: 'mei',
  startedAt: at,
  endedAt: at + 9 * 60_000,
  learnerSeconds: 290,
  characterSeconds: 170,
  endReason: 'scene_complete',
  summaryPending: false,
  summary,
};
const pendingRecord = {
  ...record,
  kind: 'placement',
  character: 'pip',
  summaryPending: true,
  summary: null,
};

describeSchemas('calls', calls, {
  CallFix: [[fix, { ...fix, targetId: null, explanation: null }], [{ ...fix, to: '' }]],
  PhraseEventKind: [[...calls.PHRASE_EVENT_KINDS], ['wilted']],
  PhraseEvent: [[summary.phraseEvents[0]], [{ phraseId: 'x', text: 'x', event: 'wilted' }]],
  CallCanDoEvidence: [[summary.canDoEvidence[0]], [{ canDoId: 'x', quote: 'x', witness: 'me' }]],
  CallMetrics: [
    [metrics, { flowSeconds: 0, paceWpm: 0, pausesPerMin: 0 }],
    [
      { ...metrics, paceWpm: -1 },
      { ...metrics, flowSeconds: undefined },
    ],
  ],
  CallSummary: [
    [
      summary,
      { ...summary, wins: [], fix: null, phraseEvents: [], canDoEvidence: [], memoryItemIds: [] },
    ],
    [
      { ...summary, wins: ['a', 'b', 'c'] },
      { ...summary, version: 0 },
      { ...summary, metrics: undefined },
    ],
  ],
  CallRecord: [
    [
      record,
      pendingRecord,
      { ...record, kind: 'voicemail_reply', endReason: 'hangup' },
      { ...record, kind: 'settling', sceneId: 's1-set1', character: 'linh', endReason: 'too_hard' },
    ],
    [
      { ...record, endedAt: at - 1 },
      { ...record, summaryPending: true },
      { ...record, endReason: 'crashed' },
      { ...record, character: 'sari' },
    ],
  ],
  CallRecordList: [
    [{ calls: [record, pendingRecord] }, { calls: [] }],
    [{ calls: [{ ...record, id: '' }] }],
  ],
});
