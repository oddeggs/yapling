import type { SettlingChapter } from '@yapling/domain';
import { MINUTE_MS, instantOf, localDateOf } from '@yapling/domain';
import { colours } from '@yapling/theme';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import type { TimeTravelAction } from '../../observability';
import { ChoiceChip } from '../../ui/chip';
import { useLocale } from '../../ui/locale';
import { StickerButton } from '../../ui/sticker-button';
import { Txt } from '../../ui/text';
import { letterDayOf, nextSettlingChapter, settlingCallPath, type KnockedChapter } from '../knocks';
import { settlingKnockOf } from '../knocks/plan';
import { fireTestKnock } from '../knocks/scheduler';
import { jumpToInstant, now } from './debug-clock';
import { KnockPreview } from './knock-preview';
import { jumpToChapter, jumpToLetterDay } from './settling-tools';
import { letterAhead, settlingOf, type TestLearner } from './test-learner';

const CHAPTERS: readonly SettlingChapter[] = [1, 2, 3, 4, 5, 6];
const KNOCKED: readonly KnockedChapter[] = [2, 3, 4, 5, 6];

function Heading({ children }: { readonly children: string }) {
  return (
    <Txt variant="noteStrong" colour={colours.textMuted}>
      {children}
    </Txt>
  );
}

function Row({ children }: { readonly children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>;
}

/**
 * The test menu's Settling-in part: where the learner is, a new Visitor, a jump to any chapter or
 * to the letter's day, and each chapter's morning knock to preview, ring or fire.
 */
export function SettlingSection({
  learner,
  onUsed,
  onStartVisitor,
}: {
  readonly learner: TestLearner;
  /** Counts the action and marks the install a test session. */
  readonly onUsed: (action: TimeTravelAction, day?: number | null) => void;
  /** Clears the phone's learner and makes a new Visitor. */
  readonly onStartVisitor: () => void;
}) {
  const { language, t } = useLocale();
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { settling } = learner;
  const next = nextSettlingChapter(settling.chapters);
  const [previewChapter, setPreviewChapter] = useState<KnockedChapter>(() =>
    next !== null && next > 1 ? (next as KnockedChapter) : 2,
  );
  const canJump = learner.known && settling.visitorPath && !busy;
  const preview = settlingKnockOf(previewChapter, learner, language);

  const status = !learner.known
    ? t('devmenu.settling.status.none')
    : !settling.visitorPath
      ? t('devmenu.settling.status.notVisitor')
      : settlingOf(learner)
        ? t('devmenu.settling.status.settling', {
            done: settling.chapters.length,
            next: next ?? 6,
          })
        : letterAhead(learner, localDateOf(now(), learner.timezone))
          ? t('devmenu.settling.status.letterAhead', { date: letterDayOf(settling) ?? '' })
          : t('devmenu.settling.status.letter', { date: letterDayOf(settling) ?? '' });

  /** Runs a jump with a note while it works and after. */
  const run = (task: () => Promise<string>) => {
    if (!canJump) {
      setNote(t('devmenu.settling.needsVisitor'));
      return;
    }
    setBusy(true);
    setNote(t('devmenu.settling.working'));
    task()
      .then(
        (done) => setNote(done),
        (e: unknown) => setNote(t('devmenu.settling.failed', { reason: String(e) })),
      )
      .finally(() => setBusy(false));
  };

  const chapterJump = (chapter: SettlingChapter) =>
    run(async () => {
      onUsed('jump_chapter', chapter);
      await jumpToChapter(chapter, learner);
      return t('devmenu.settling.done.chapter', { chapter });
    });

  const letterJump = () =>
    run(async () => {
      onUsed('letter_day');
      await jumpToLetterDay(learner);
      return t('devmenu.settling.done.letter');
    });

  // A minute before the chapter's scheduled morning knock, with that chapter next.
  const ringSoon = () =>
    run(async () => {
      onUsed('knock', previewChapter);
      await jumpToChapter(previewChapter, learner);
      jumpToInstant(instantOf(preview.date, preview.time, learner.timezone) - MINUTE_MS);
      return t('devmenu.settling.ringNote', { chapter: previewChapter });
    });

  const fire = () => {
    onUsed('knock', previewChapter);
    fireTestKnock(preview).then(
      () => setNote(t('devmenu.settling.fireNote', { chapter: previewChapter })),
      (e: unknown) => setNote(t('devmenu.settling.failed', { reason: String(e) })),
    );
  };

  // As a tapped knock would: the chapter's call, with the chapters before it done.
  const openChapter = () =>
    run(async () => {
      onUsed('jump_chapter', previewChapter);
      await jumpToChapter(previewChapter, learner);
      router.dismissAll();
      router.navigate(settlingCallPath(previewChapter));
      return t('devmenu.settling.done.chapter', { chapter: previewChapter });
    });

  return (
    <View style={{ gap: 8 }}>
      <Heading>{t('devmenu.settling.heading')}</Heading>
      <Txt variant="note" colour={colours.textBody}>
        {status}
      </Txt>
      <StickerButton
        label={t('devmenu.settling.startVisitor')}
        tone="primary"
        disabled={busy}
        accessibilityHint={t('devmenu.settling.startVisitorHint')}
        onPress={onStartVisitor}
      />
      <Txt variant="note" colour={colours.textMuted}>
        {t('devmenu.settling.startVisitorHint')}
      </Txt>

      <Heading>{t('devmenu.settling.jumpHeading')}</Heading>
      <Row>
        {CHAPTERS.map((c) => (
          <ChoiceChip
            key={c}
            label={`${c}`}
            selected={settlingOf(learner) && c === next}
            accessibilityLabel={t('devmenu.settling.a11y.jumpChapter', { chapter: c })}
            onPress={() => chapterJump(c)}
          />
        ))}
      </Row>
      <StickerButton
        label={t('devmenu.settling.letterDay')}
        tone="secondary"
        disabled={busy}
        accessibilityHint={t('devmenu.settling.letterDayHint')}
        onPress={letterJump}
      />

      <Heading>{t('devmenu.settling.knocksHeading')}</Heading>
      <Row>
        {KNOCKED.map((c) => (
          <ChoiceChip
            key={c}
            label={t('devmenu.settling.knockChip', { chapter: c })}
            selected={c === previewChapter}
            accessibilityLabel={t('devmenu.settling.a11y.knockChip', { chapter: c })}
            onPress={() => setPreviewChapter(c)}
          />
        ))}
      </Row>
      <View accessibilityHint={t('devmenu.settling.previewHint', { chapter: previewChapter })}>
        <KnockPreview
          day={previewChapter}
          date={preview.date}
          time={preview.time}
          title={preview.title}
          body={preview.body}
          language={language}
          t={t}
          tag={t('devmenu.settling.tag', { chapter: previewChapter })}
          onPress={openChapter}
        />
      </View>
      <StickerButton
        label={t('devmenu.settling.ringSoon', { chapter: previewChapter })}
        tone="secondary"
        disabled={busy}
        accessibilityHint={t('devmenu.settling.ringSoonHint', { chapter: previewChapter })}
        onPress={ringSoon}
      />
      <StickerButton
        label={t('devmenu.settling.fire', { chapter: previewChapter })}
        tone="glass"
        onPress={fire}
      />
      {note === null ? null : (
        <Txt variant="note" colour={colours.textMuted}>
          {note}
        </Txt>
      )}

      {__DEV__ ? <Previews /> : null}
    </View>
  );
}

/** The sample screens other features show in development builds (their own `?preview=` links). */
const PREVIEWS = [
  { label: 'devmenu.previews.afterCall', path: '/post?callId=preview&preview=visitor' },
  { label: 'devmenu.previews.stageUp', path: '/keepsake?callId=preview&preview=stage-up' },
  { label: 'devmenu.previews.me', path: '/me?preview=visitor' },
] as const;

function Previews() {
  const { t } = useLocale();
  return (
    <>
      <Heading>{t('devmenu.previews.heading')}</Heading>
      <Row>
        {PREVIEWS.map((p) => (
          <StickerButton
            key={p.path}
            label={t(p.label)}
            tone="glass"
            size="small"
            accessibilityHint={t('devmenu.previews.hint')}
            onPress={() => {
              router.dismissAll();
              router.push(p.path);
            }}
          />
        ))}
      </Row>
    </>
  );
}
