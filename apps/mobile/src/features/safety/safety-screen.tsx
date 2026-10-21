import { colours, palette, type, type TypeStyle } from '@yapling/theme';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Press, Txt } from '../../ui';
import type { SafetyView } from './safety-model';

/** The calm sheet's type: lighter than the story's, from the nearest theme styles. */
const calmType = {
  kicker: type.noteStrong,
  title: { ...type.pickTitle, weight: 700, tracking: -0.04, lineHeight: 1.05 },
  body: { ...type.rowTitle, weight: 500, lineHeight: 1.45 },
  rowTitle: { ...type.button, weight: 700 },
  rowSub: { ...type.noteStrong, weight: 500 },
  button: { ...type.buttonPair, weight: 700 },
  chevron: { ...type.button, weight: 500, size: 18 },
} as const satisfies Record<string, TypeStyle>;

/** The quiet chevron of the calm rows; the theme's nearest grey. */
const CHEVRON = '#8A8094';

export interface SafetyScreenProps {
  readonly view: SafetyView;
  readonly onCall: (number: string) => void;
  readonly onSupportLine: () => void;
  readonly onTrusted: () => void;
  readonly onLater: () => void;
}

/**
 * The story pauses and real help is one tap away. Out of character on purpose: no critters, no
 * sounds, no stickers, no motion beyond a fade.
 */
export function SafetyScreen({
  view,
  onCall,
  onSupportLine,
  onTrusted,
  onLater,
}: SafetyScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: palette.fog }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: 80, paddingHorizontal: 16, paddingBottom: 24 }}
        accessibilityViewIsModal
      >
        <View style={{ paddingHorizontal: 8, gap: 14 }}>
          <Txt variant={calmType.kicker} colour={colours.textMuted}>
            {view.kicker}
          </Txt>
          <Txt variant={calmType.title} accessibilityRole="header">
            {view.title}
          </Txt>
          <Txt variant={calmType.body} colour={colours.textBody}>
            {view.body}
          </Txt>
        </View>
        <View style={{ gap: 10, marginTop: 46 }}>
          <CalmRow title={view.emergency.title} sub={view.emergency.sub}>
            {view.emergency.call ? (
              <Press
                onPress={() => view.emergency.call && onCall(view.emergency.call.number)}
                haptic={null}
                accessibilityRole="link"
                accessibilityLabel={view.emergency.call.a11y}
                style={{
                  height: 44,
                  paddingHorizontal: 18,
                  borderRadius: 22,
                  backgroundColor: palette.ink,
                  justifyContent: 'center',
                }}
              >
                <Txt variant={calmType.button} colour={colours.textOnInk}>
                  {view.emergency.call.label}
                </Txt>
              </Press>
            ) : null}
          </CalmRow>
          <CalmRow title={view.support.title} sub={view.support.sub} onPress={onSupportLine} />
          <CalmRow title={view.trusted.title} sub={view.trusted.sub} onPress={onTrusted} />
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 30) }}>
        <Press
          onPress={onLater}
          haptic={null}
          style={{
            height: 52,
            borderRadius: 26,
            borderWidth: 1.5,
            borderColor: palette.line,
            backgroundColor: colours.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Txt variant={calmType.button}>{view.later}</Txt>
        </Press>
      </View>
    </View>
  );
}

function CalmRow({
  title,
  sub,
  onPress,
  children,
}: {
  title: string;
  sub: string;
  onPress?: () => void;
  children?: ReactNode;
}) {
  const content = (
    <>
      <View style={{ flex: 1 }}>
        <Txt variant={calmType.rowTitle}>{title}</Txt>
        <Txt variant={calmType.rowSub} colour={colours.textMuted}>
          {sub}
        </Txt>
      </View>
      {children}
      {onPress ? (
        <Txt variant={calmType.chevron} colour={CHEVRON}>
          ›
        </Txt>
      ) : null}
    </>
  );
  const style = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colours.border,
    backgroundColor: colours.surface,
  };
  return onPress ? (
    <Press onPress={onPress} haptic={null} accessibilityLabel={`${title}, ${sub}`} style={style}>
      {content}
    </Press>
  ) : (
    <View style={style}>{content}</View>
  );
}
