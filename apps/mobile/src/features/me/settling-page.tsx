import { colours, palette, type, type TypeStyle } from '@yapling/theme';
import type { Translate } from '@yapling/i18n';
import { View } from 'react-native';

import { BackButton, Press, Txt } from '../../ui';
import { RowsCard } from './me-frame';

/*
 * "Làm quen lại với Linh": the six Settling-in chapters, each played one ready to play again for
 * free. The next one to play is open too; the rest wait for their turn in the burrow.
 */

const pageType = {
  title: { ...type.cardTitle, size: 24, lineHeight: 1 },
  chapter: { ...type.item, weight: 800, lineHeight: 1.3 },
  sub: { ...type.rowSub, size: 11.5, lineHeight: 1.3 },
} as const satisfies Record<string, TypeStyle>;

export interface SettlingChapterRow {
  readonly chapter: number;
  readonly title: string;
  readonly played: boolean;
  /** Played, or the next one to play. */
  readonly open: boolean;
}

export interface SettlingPageProps {
  readonly title: string;
  readonly chapters: readonly SettlingChapterRow[];
  readonly copy: Translate;
  readonly onBack: () => void;
  readonly onPlay: (chapter: number) => void;
}

export function SettlingPage({ title, chapters, copy, onBack, onPlay }: SettlingPageProps) {
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <BackButton onPress={onBack} accessibilityLabel={copy('common.a11y.back')} />
        <Txt variant={pageType.title} accessibilityRole="header" style={{ flex: 1 }}>
          {title}
        </Txt>
      </View>
      <RowsCard>
        {chapters.map((c, i) => {
          const name = `${copy('me.settling.chapter', { chapter: c.chapter })} · ${c.title}`;
          const status = copy(c.played ? 'me.settling.played' : 'me.settling.notYet');
          return (
            <Press
              key={c.chapter}
              onPress={c.open ? () => onPlay(c.chapter) : undefined}
              disabled={!c.open}
              accessibilityRole="button"
              accessibilityState={{ disabled: !c.open }}
              accessibilityLabel={`${name}. ${status}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                minHeight: 54,
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colours.divider,
                opacity: c.open ? 1 : 0.5,
              }}
            >
              <View style={{ flex: 1 }}>
                <Txt variant={pageType.chapter}>{name}</Txt>
                <Txt variant={pageType.sub} colour={colours.textMuted}>
                  {status}
                </Txt>
              </View>
              {c.open ? (
                <Txt variant="buttonPair" colour={palette.dotted}>
                  ›
                </Txt>
              ) : null}
            </Press>
          );
        })}
      </RowsCard>
    </>
  );
}
