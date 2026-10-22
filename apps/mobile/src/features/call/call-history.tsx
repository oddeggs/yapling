import { BurrowObject } from '@yapling/art/native';
import type { Translate } from '@yapling/i18n';
import type { CharacterId } from '@yapling/contracts';
import { colours, controls, glass, motion, radii, translucent } from '@yapling/theme';
import { useEffect, useMemo, useRef } from 'react';
import { ScrollView, View, type ScrollViewInstance } from 'react-native';
import Animated from 'react-native-reanimated';

import { useLocale } from '../../ui/locale';
import { useKeyframes } from '../../ui/motion/play';
import { Press } from '../../ui/press';
import { SpeechBubble, type BubbleTone, type SpeechBubbleProps } from '../../ui/speech-bubble';
import { GlassView } from '../../ui/surface';
import { typeExtras } from '../../ui/type-extras';
import type { ViewStyleProp } from '../../ui/style';
import { useStore } from '../../voice/store';
import { CloseButton, YouCaption } from './call-cards';
import { CallTxt } from './call-text';
import { callGlossFetcher, LineGlosses, type GlossEntry } from './line-gloss';
import type { TranscriptEntry, TurnPage } from './line-history';

/*
 * Reading a missed line again: the turn's pages on the bubble ("‹ 1/3 ›"), the "What was said"
 * button in the top corner and its sheet listing the call so far (each line in its speaker's
 * bubble, tap for the first language, play again for a recorded line; the learner's turns in their
 * caption), and the on-demand gloss every spoken line shares.
 */

/** The call's gloss cache: one per call screen, asking the live call named by its resume token. */
export function useLineGlosses(
  url: string,
  getToken: () => Promise<string>,
  callToken: string | null,
) {
  const token = useRef(callToken);
  token.current = callToken;
  const glosses = useMemo(
    () =>
      new LineGlosses(
        callGlossFetcher({ socketUrl: url, getToken, callToken: () => token.current }),
      ),
    [url, getToken],
  );
  const entries = useStore(glosses.store);
  return { glosses, entries };
}

/** A spoken line's gloss props for its bubble: the written gloss, or one asked for on a tap. */
export function lineGlossProps(
  line: { readonly text: string; readonly gloss: string | null; readonly translatable: boolean },
  glosses: LineGlosses,
  entry: GlossEntry | null,
  t: Translate,
): Pick<SpeechBubbleProps, 'gloss' | 'glossHint' | 'onGlossNeeded' | 'glossNote' | 'glossRetry'> {
  if (line.gloss) return { gloss: line.gloss, glossHint: t('call.tapForMeaning') };
  if (!line.translatable || line.text.trim() === '') return {};
  const ready = entry?.state === 'ready' ? entry.gloss : null;
  return {
    ...(ready ? { gloss: ready } : {}),
    glossHint: t('call.tapForMeaning'),
    onGlossNeeded: () => glosses.request(line.text),
    glossNote:
      entry?.state === 'failed'
        ? t('call.translateFailed')
        : entry?.state === 'ready'
          ? t('call.noTranslation')
          : t('call.translating'),
    glossRetry: entry?.state === 'failed',
  };
}

/** A small round button on a card: the turn's arrows, a line's play button. */
function RoundButton({
  label,
  glyph,
  onPress,
  disabled = false,
}: {
  label: string;
  glyph: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const size = 28;
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      haptic="selection"
      accessibilityLabel={label}
      hitSlop={(controls.minHitTarget - size) / 2}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: translucent.inkWash,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <CallTxt
        variant={{ ...typeExtras.meaningChip, size: 14 }}
        importantForAccessibility="no"
        accessibilityElementsHidden
      >
        {glyph}
      </CallTxt>
    </Press>
  );
}

/** "‹ 1/3 ›" in the bubble's top corner: back and on through the lines of this turn. */
export function TurnPager({
  page,
  onGo,
  style,
}: {
  page: TurnPage;
  /** Go to a line of the turn (null: the line now). */
  onGo: (streamId: number | null) => void;
  style?: ViewStyleProp;
}) {
  const { t } = useLocale();
  const at = { index: page.index + 1, count: page.count };
  const last = page.next === null;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6 }, style]}>
      <RoundButton
        label={t('call.a11y.earlierLine')}
        glyph="‹"
        disabled={page.prev === null}
        onPress={() => {
          if (page.prev !== null) onGo(page.prev);
        }}
      />
      <CallTxt
        variant="labelSmall"
        colour={colours.textMuted}
        accessibilityLabel={t('call.a11y.page', at)}
      >
        {t('call.page', at)}
      </CallTxt>
      <RoundButton
        label={t('call.a11y.laterLine')}
        glyph="›"
        disabled={last}
        onPress={() => {
          // The line after the second-to-last is the line now.
          if (page.next !== null) onGo(page.index + 2 === page.count ? null : page.next);
        }}
      />
    </View>
  );
}

/** The round glass button that opens "What was said", in the corner left of the speaker pill. */
export function HistoryButton({ onPress, style }: { onPress: () => void; style?: ViewStyleProp }) {
  const { t } = useLocale();
  const size = controls.back.size;
  return (
    <Press
      onPress={onPress}
      haptic="selection"
      accessibilityLabel={t('call.history.a11y.open')}
      hitSlop={(controls.minHitTarget - size) / 2}
      style={style}
    >
      <GlassView
        glass={glass.button}
        radius={size / 2}
        style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      >
        <BurrowObject id="desk-notes-0" size={26} />
      </GlassView>
    </Press>
  );
}

export interface HistoryLineView {
  readonly speaker: CharacterId;
  readonly name: string;
  readonly tone: BubbleTone;
  readonly glossProps: ReturnType<typeof lineGlossProps>;
  /** A recorded line can be heard again (its audio is on the phone). */
  readonly onReplay: (() => void) | null;
}

/**
 * "What was said": the call so far, oldest first, scrolled to the latest. It sits between the
 * speaker pill and the cards over the call bar, so the bar stays in reach.
 */
export function HistorySheet({
  entries,
  lineView,
  replayable,
  onClose,
  style,
}: {
  entries: readonly TranscriptEntry[];
  lineView: (entry: Extract<TranscriptEntry, { kind: 'line' }>) => HistoryLineView;
  /** Whether a play-again tap would be heard now (the learner's turn, nothing playing). */
  replayable: boolean;
  onClose: () => void;
  style?: ViewStyleProp;
}) {
  const { t } = useLocale();
  const rise = useKeyframes(motion.call.whisper);
  const scroll = useRef<ScrollViewInstance>(null);
  useEffect(() => {
    scroll.current?.scrollToEnd({ animated: false });
  }, [entries.length]);
  return (
    <Animated.View style={[rise, style]} accessibilityViewIsModal>
      <GlassView glass={glass.panel} radius={radii.sheet} style={{ flex: 1, paddingTop: 14 }}>
        <View style={{ paddingHorizontal: 18, paddingBottom: 8, paddingRight: 48 }}>
          <CallTxt variant="kicker" colour={colours.textMuted} accessibilityRole="header">
            {t('call.history.title').toUpperCase()}
          </CallTxt>
        </View>
        <CloseButton label={t('common.a11y.close')} onPress={onClose} />
        <ScrollView
          ref={scroll}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 14, gap: 10 }}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
        >
          {entries.map((entry) => {
            if (entry.kind === 'you') {
              return <YouCaption key={`you-${entry.turn}`} text={entry.text} heard />;
            }
            const view = lineView(entry);
            return (
              <View
                key={entry.line.streamId}
                style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}
              >
                <SpeechBubble
                  name={view.name}
                  aiTag={t('common.aiTag')}
                  tone={view.tone}
                  text={entry.line.text}
                  style={{ flex: 1 }}
                  {...view.glossProps}
                />
                {view.onReplay ? (
                  <View style={{ paddingTop: 10 }}>
                    <RoundButton
                      label={t('call.history.replay')}
                      glyph="▶"
                      disabled={!replayable}
                      onPress={view.onReplay}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      </GlassView>
    </Animated.View>
  );
}
