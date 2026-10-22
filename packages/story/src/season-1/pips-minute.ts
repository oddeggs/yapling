import type { Id } from '@yapling/contracts';

import type { GlossedText } from '../types';
import type { S1PhraseId } from './phrases';
import { AGAIN_WORDS, card, SLOWLY_WORDS } from './visitor';

/*
 * Pip's minute for Season One (`season-1-script.md`, "Pip's minute"): for every phrase of the
 * season and of Settling in, Pip's set-up line and the card that answers it, and, where a natural
 * mistake exists, Pip's slightly-wrong line and the card that fixes it. Every line is Pip's, at
 * most 8 words, recorded once at the Visitor's speed and played at every stage. A fix card passes
 * only on the corrected words, so repeating Pip's mistake doesn't match.
 */

/** A line Pip says, and the card the learner reads back. */
export interface PipsMinuteTurn {
  readonly line: Id;
  readonly card: GlossedText;
  /** Whole words that pass the turn (lower case). */
  readonly accept: readonly string[];
}

export interface PipsMinutePhrase {
  /** The set-up: a small moment where the phrase fits. */
  readonly setUp: PipsMinuteTurn & {
    /** Fast on purpose: the answer is the lifesaver itself, and the line replays slower. */
    readonly lifesaver?: true;
  };
  /** Pip's slightly-wrong version and the fix; null when the phrase has no natural mistake. */
  readonly wrong: PipsMinuteTurn | null;
}

const t = (line: Id, en: string, vi: string, accept: readonly string[]): PipsMinuteTurn => ({
  line,
  card: card(en, vi),
  accept,
});

/** Pip's three openers and closers; one of each a day, never the same two days running. */
export const S1_PIPS_MINUTE_OPENS = ['s1-pm-open-1', 's1-pm-open-2', 's1-pm-open-3'] as const;
export const S1_PIPS_MINUTE_CLOSES = ['s1-pm-close-1', 's1-pm-close-2', 's1-pm-close-3'] as const;

export const S1_PIPS_MINUTE: Readonly<Record<S1PhraseId, PipsMinutePhrase>> = {
  'nice-to-meet-you': {
    setUp: t('s1-pm-nice-to-meet-you-setup', 'Nice to meet you!', 'Rất vui được gặp bạn!', [
      'nice',
      'meet',
    ]),
    wrong: t('s1-pm-nice-to-meet-you-wrong', 'Nice to meet you!', 'Rất vui được gặp bạn!', [
      'to meet',
    ]),
  },
  'yes-please': {
    setUp: t('s1-pm-yes-please-setup', 'Yes, please!', 'Có, cảm ơn nhé!', ['yes', 'please']),
    wrong: null,
  },
  'sorry-again-please': {
    setUp: {
      ...t(
        's1-pm-sorry-again-please-setup',
        'Sorry? Again, please.',
        'Xin lỗi? Nói lại giúp mình nhé.',
        [...AGAIN_WORDS],
      ),
      lifesaver: true,
    },
    wrong: t(
      's1-pm-sorry-again-please-wrong',
      'Sorry? Again, please.',
      'Xin lỗi? Nói lại giúp mình nhé?',
      ['again'],
    ),
  },
  'slowly-please': {
    setUp: {
      ...t('s1-pm-slowly-please-setup', 'Slowly, please.', 'Nói chậm giúp mình nhé.', [
        ...SLOWLY_WORDS,
      ]),
      lifesaver: true,
    },
    wrong: t('s1-pm-slowly-please-wrong', 'Slowly, please.', 'Nói chậm hơn chút nhé!', ['slowly']),
  },
  'how-much': {
    setUp: t('s1-pm-how-much-setup', 'How much?', 'Bao nhiêu tiền?', ['much', 'price']),
    wrong: t('s1-pm-how-much-wrong', 'How much is the cake?', 'Cái bánh này bao nhiêu tiền?', [
      'how much',
    ]),
  },
  'im-from': {
    setUp: t('s1-pm-im-from-setup', "I'm from …", 'Mình đến từ …', ['from']),
    wrong: t('s1-pm-im-from-wrong', "I'm from Far Meadow.", 'Mình đến từ Far Meadow!', [
      "i'm from",
      'i am from',
    ]),
  },
  'whats-wrong': {
    setUp: t('s1-pm-whats-wrong-setup', "What's wrong?", 'Có chuyện gì vậy?', ['wrong', 'okay']),
    wrong: t('s1-pm-whats-wrong-wrong', "What's wrong, Mei?", 'Có chuyện gì vậy, Mei?', [
      "what's wrong",
      'what is wrong',
    ]),
  },
  'i-need-a-plan': {
    setUp: t('s1-pm-i-need-a-plan-setup', 'I need a plan.', 'Mình cần một kế hoạch.', ['plan']),
    wrong: t('s1-pm-i-need-a-plan-wrong', 'I need a plan.', 'Mình cần một kế hoạch.', ['a plan']),
  },
  'can-i-help': {
    setUp: t('s1-pm-can-i-help-setup', 'Can I help?', 'Mình giúp được không?', ['help']),
    wrong: t('s1-pm-can-i-help-wrong', 'Can I help?', 'Mình giúp được không?', ['can i help']),
  },
  'i-think-you-should': {
    setUp: t('s1-pm-i-think-you-should-setup', 'I think you should …', 'Mình nghĩ bạn nên …', [
      'think',
      'should',
    ]),
    wrong: t(
      's1-pm-i-think-you-should-wrong',
      'I think you should sleep.',
      'Mình nghĩ bạn nên đi ngủ.',
      ['should sleep'],
    ),
  },
  'im-good-at': {
    setUp: t('s1-pm-im-good-at-setup', "I'm good at …", 'Mình giỏi …', ['good at']),
    wrong: t('s1-pm-im-good-at-wrong', "I'm good at drawing maps.", 'Mình giỏi vẽ bản đồ.', [
      'drawing',
    ]),
  },
  'for-example': {
    setUp: t('s1-pm-for-example-setup', 'For example, …', 'Ví dụ, …', ['example']),
    wrong: t('s1-pm-for-example-wrong', 'For example, I like tea!', 'Ví dụ, mình thích trà!', [
      'for example',
    ]),
  },
  'id-love-to': {
    setUp: t('s1-pm-id-love-to-setup', "I'd love to!", 'Có chứ, mình rất muốn!', ['love']),
    wrong: t('s1-pm-id-love-to-wrong', "I'd love to, Mei!", 'Có chứ, mình rất muốn, Mei ơi!', [
      "i'd love",
      'i would love',
    ]),
  },
  'just-to-confirm': {
    setUp: t(
      's1-pm-just-to-confirm-setup',
      'Just to confirm: nine?',
      'Cho mình xác nhận lại: chín giờ nhé?',
      ['confirm'],
    ),
    wrong: t(
      's1-pm-just-to-confirm-wrong',
      'Just to confirm: nine?',
      'Cho mình xác nhận lại: chín giờ nhé?',
      ['to confirm'],
    ),
  },
  'sorry-we-cant': {
    setUp: t(
      's1-pm-sorry-we-cant-setup',
      "I'm sorry, we can't do that.",
      'Xin lỗi, chúng tôi không làm vậy được.',
      ['sorry', "can't", 'cannot'],
    ),
    wrong: t(
      's1-pm-sorry-we-cant-wrong',
      "Sorry, we can't do that.",
      'Xin lỗi, chúng tôi không làm vậy được.',
      ["we can't", 'we cannot'],
    ),
  },
  'how-about': {
    setUp: t('s1-pm-how-about-setup', 'How about …?', 'Hay là … nhé?', ['how about']),
    wrong: t('s1-pm-how-about-wrong', 'How about a free cake?', 'Hay là tặng một cái bánh?', [
      'about a',
    ]),
  },
  'fair-point-but': {
    setUp: t(
      's1-pm-fair-point-but-setup',
      "That's a fair point, but …",
      'Ông nói cũng có lý, nhưng …',
      ['fair point'],
    ),
    wrong: t(
      's1-pm-fair-point-but-wrong',
      "That's a fair point, but I like Mei!",
      'Ông nói cũng có lý, nhưng mình thích quán Mei!',
      ['a fair point'],
    ),
  },
  deal: {
    setUp: t('s1-pm-deal-setup', 'Deal!', 'Chốt!', ['deal']),
    wrong: null,
  },
  'what-do-you-think': {
    setUp: t('s1-pm-what-do-you-think-setup', 'What do you think?', 'Bạn nghĩ sao?', ['think']),
    wrong: t('s1-pm-what-do-you-think-wrong', 'What do you think, Nell?', 'Nell nghĩ sao?', [
      'do you think',
    ]),
  },
  'good-idea-and': {
    setUp: t('s1-pm-good-idea-and-setup', 'Good idea, and …', 'Ý hay đó, và …', ['good idea']),
    wrong: t(
      's1-pm-good-idea-and-wrong',
      'Good idea, and cookies!',
      'Ý hay đó, thêm bánh quy nữa!',
      ['good idea'],
    ),
  },
  'lets-hear-from': {
    setUp: t('s1-pm-lets-hear-from-setup', "Let's hear from Linh.", 'Mời Linh nói nhé.', [
      'hear from',
    ]),
    wrong: t('s1-pm-lets-hear-from-wrong', "Let's hear from Linh.", 'Mời Linh nói nhé.', [
      "let's hear",
      'let us hear',
    ]),
  },
  'to-sum-up': {
    setUp: t('s1-pm-to-sum-up-setup', 'So, to sum up, …', 'Vậy, tóm lại, …', ['sum up']),
    wrong: t('s1-pm-to-sum-up-wrong', 'So, to sum up: a petition!', 'Tóm lại: một bản kiến nghị!', [
      'sum up',
    ]),
  },
  'heres-the-thing': {
    setUp: t('s1-pm-heres-the-thing-setup', "Here's the thing: …", 'Chuyện là thế này: …', [
      'the thing',
    ]),
    wrong: t(
      's1-pm-heres-the-thing-wrong',
      "Here's the thing: the café!",
      'Chuyện là thế này: quán cà phê!',
      ['the thing'],
    ),
  },
  'it-matters-because': {
    setUp: t('s1-pm-it-matters-because-setup', 'It matters because …', 'Điều đó quan trọng vì …', [
      'matters',
      'because',
    ]),
    wrong: t(
      's1-pm-it-matters-because-wrong',
      'It matters because Mei is kind!',
      'Điều đó quan trọng vì Mei tốt bụng!',
      ['it matters'],
    ),
  },
  'would-you-sign': {
    setUp: t('s1-pm-would-you-sign-setup', 'Would you sign?', 'Ông ký giúp được không?', ['sign']),
    wrong: t('s1-pm-would-you-sign-wrong', 'Would you sign?', 'Ông ký giúp được không?', [
      'would you',
    ]),
  },
  'thanks-for-listening': {
    setUp: t(
      's1-pm-thanks-for-listening-setup',
      'Thanks for listening!',
      'Cảm ơn bạn đã lắng nghe!',
      ['thanks', 'listening'],
    ),
    wrong: t(
      's1-pm-thanks-for-listening-wrong',
      'Thanks for listening, Bea!',
      'Cảm ơn Bea đã lắng nghe!',
      ['for listening'],
    ),
  },
  'a-few-words': {
    setUp: t(
      's1-pm-a-few-words-setup',
      "I'd like to say a few words.",
      'Tôi xin phép nói vài lời.',
      ['few words'],
    ),
    wrong: t(
      's1-pm-a-few-words-wrong',
      "I'd like to say a few words.",
      'Tôi xin phép nói vài lời.',
      ['a few'],
    ),
  },
  'first-second': {
    setUp: t('s1-pm-first-second-setup', 'First, … Second, …', 'Thứ nhất, … Thứ hai, …', [
      'first',
      'second',
    ]),
    wrong: t(
      's1-pm-first-second-wrong',
      'First, toast. Second, tea!',
      'Thứ nhất, bánh mì nướng. Thứ hai, trà!',
      ['second'],
    ),
  },
  'great-question': {
    setUp: t('s1-pm-great-question-setup', "That's a great question!", 'Câu hỏi hay quá!', [
      'great question',
    ]),
    wrong: t('s1-pm-great-question-wrong', "That's a great question!", 'Câu hỏi hay quá!', [
      'great question',
    ]),
  },
  'thank-you-all': {
    setUp: t('s1-pm-thank-you-all-setup', 'Thank you all!', 'Cảm ơn tất cả mọi người!', [
      'thank',
      'all',
      'everyone',
    ]),
    wrong: t('s1-pm-thank-you-all-wrong', 'Thank you all!', 'Cảm ơn tất cả mọi người!', [
      'thank you',
    ]),
  },
};
