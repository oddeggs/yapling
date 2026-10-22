import { describe, expect, it } from '@jest/globals';
import { translator } from '@yapling/i18n';

import {
  buildVisitorAfterCall,
  isVisitorCall,
  saidLines,
  settlingChapterOf,
} from '../../src/features/payoff/visitor-model';
import { call, learner, progress, summary } from './fixtures';

const vi = translator('vi');

const chapterOne = call({
  id: 'call_set1',
  kind: 'settling',
  sceneId: 's1-set1',
  character: 'linh',
  summary: summary({
    wins: [],
    fix: null,
    phraseEvents: [{ phraseId: 'nice-to-meet-you', text: 'Nice to meet you', event: 'met' }],
    canDoEvidence: [
      { canDoId: 'say-hello-and-your-name', quote: 'Hi!', witness: 'linh' },
      { canDoId: 'say-hello-and-your-name', quote: "I'm Lan.", witness: 'linh' },
    ],
  }),
});

describe('the Visitor’s after-call card', () => {
  it('is for every Settling-in chapter and every call a Visitor makes', () => {
    expect(isVisitorCall({ kind: 'settling' }, 'newcomer')).toBe(true);
    expect(isVisitorCall({ kind: 'episode' }, 'visitor')).toBe(true);
    expect(isVisitorCall({ kind: 'episode' }, 'newcomer')).toBe(false);
    expect(settlingChapterOf('s1-set4')).toBe(4);
    expect(settlingChapterOf('s1-e1')).toBeNull();
  });

  it('gives the learner’s own sentences back, the chapter’s seed packet and the box unpacked', () => {
    const card = buildVisitorAfterCall(
      {
        call: chapterOne,
        progress: progress(),
        learner,
        firstLanguage: 'vi',
        heard: ['hi!', "I'm Lan.", 'Nice to meet you, too.'],
      },
      vi,
    );
    expect(card).toMatchObject({
      kicker: 'Làm quen · 1/6 · Hello',
      title: 'Xong rồi!',
      host: 'linh',
      said: { title: 'Bạn đã nói được:', lines: ['Hi!', "I'm Lan.", 'Nice to meet you, too.'] },
      seed: {
        tag: 'GÓI HẠT · CHƯƠNG 1',
        phrase: 'Nice to meet you',
        gloss: 'Rất vui được gặp bạn',
        sub: 'Nói lại vào hôm khác để nó nảy mầm.',
      },
      feel: {
        title: 'Cuộc gọi này thế nào?',
        justRight: 'Vừa sức',
        tooHard: 'Khó quá',
        replies: {
          justRight: 'Tuyệt! Linh sẽ giữ nhịp này nhé.',
          slower: 'Lần sau Linh nói chậm hơn, từng bước một.',
        },
      },
      box: 'Thùng "Hello" đã được dỡ trong hang',
      cta: 'Về hang',
    });
  });

  it('never scores or fixes: no wins, no fix, no receipt on the card', () => {
    const card = buildVisitorAfterCall(
      { call: chapterOne, progress: null, learner, firstLanguage: 'vi', heard: ['Hi!'] },
      vi,
    );
    expect(Object.keys(card)).not.toEqual(expect.arrayContaining(['wins', 'fix', 'receipt']));
  });

  it('falls back to the lines the server kept for the call when none were handed over', () => {
    expect(saidLines(null, chapterOne, null)).toEqual(['Hi!', "I'm Lan."]);
    expect(saidLines(['  ', ''], chapterOne, null)).toEqual(['Hi!', "I'm Lan."]);
  });

  it('leaves out repeats, empty turns and turns said in Vietnamese', () => {
    expect(
      saidLines(['hi', 'Hi!', '', 'Mình là Lan', "i'm Lan", 'Nice to meet you'], chapterOne, null),
    ).toEqual(['Hi', "I'm Lan", 'Nice to meet you']);
  });

  it('shows no seed for a chapter that seeds none, and no meaning without a language for it', () => {
    const busStop = { ...chapterOne, id: 'call_set4', sceneId: 's1-set4' };
    const card = buildVisitorAfterCall(
      { call: busStop, progress: null, learner, firstLanguage: 'vi', heard: ['Two, please.'] },
      vi,
    );
    expect(card.seed).toBeNull();
    expect(card.kicker).toBe('Làm quen · 4/6 · Bus 45');
    const other = buildVisitorAfterCall(
      { call: chapterOne, progress: null, learner, firstLanguage: 'other', heard: ['Hi!'] },
      vi,
    );
    expect(other.seed?.gloss).toBeNull();
  });

  it('names a Visitor’s story call by its kind and the phrase it seeded', () => {
    const card = buildVisitorAfterCall(
      { call: call(), progress: null, learner, firstLanguage: 'vi', heard: ["What's wrong?"] },
      vi,
    );
    expect(card.kicker).toBe('Tập truyện');
    expect(card.seed).toMatchObject({ tag: 'GÓI HẠT MỚI', phrase: "What's wrong?" });
    expect(card.host).toBe('mei');
  });
});
