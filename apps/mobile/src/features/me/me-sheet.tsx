import { colours, outline, palette, type, type TypeStyle } from '@yapling/theme';
import { Text, View } from 'react-native';

import { CritterSlot, Press, Txt } from '../../ui';
import { RowsCard } from './me-frame';
import type { CanDoGroup, MeView } from './me-model';

/** The prototype's Me sheet sizes, from the nearest theme styles. */
const meType = {
  name: { ...type.cardTitle, size: 24, lineHeight: 1 },
  stage: { ...type.note, weight: 800 },
  section: { ...type.section, size: 12, uppercase: true },
  group: type.label,
  canDo: { ...type.item, size: 13.5, lineHeight: 1.2 },
  rowTitle: type.item,
  rowNote: { ...type.rowSub, size: 11.5 },
  rowLink: { ...type.note, weight: 800 },
  rowValue: type.rowSub,
  chevron: { ...type.buttonPair },
} as const satisfies Record<string, TypeStyle>;

/** The plum of the "Get more with Plus" link; the theme has no name for it yet. */
const LINK = '#7A3B86';

const GROUP_FILL = { life: colours.successSoft, work: colours.secondarySoft } as const;

export interface MeSheetProps {
  readonly view: MeView;
  readonly onPlus: () => void;
  readonly onMinutes: () => void;
  readonly onProgress: () => void;
  readonly onMemory: () => void;
  readonly onNotifications: () => void;
  readonly onHelp: () => void;
  readonly onAiExplainer: () => void;
  readonly onDeleteData: () => void;
}

/** The learner's page: their stage, what they can now do, and the rows below. */
export function MeSheet({
  view,
  onPlus,
  onMinutes,
  onProgress,
  onMemory,
  onNotifications,
  onHelp,
  onAiExplainer,
  onDeleteData,
}: MeSheetProps) {
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 58,
            height: 58,
            borderRadius: 29,
            borderWidth: 3,
            borderColor: colours.outline,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CritterSlot kind="face" size={52} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt variant={meType.name} accessibilityRole="header">
            {view.name}
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                paddingVertical: 2,
                paddingHorizontal: 8,
                borderRadius: 8,
                borderWidth: outline.thin,
                borderColor: colours.outline,
                backgroundColor: colours.successSoft,
              }}
            >
              <Txt variant={meType.stage} numberOfLines={1}>
                {view.stage.label}
              </Txt>
            </View>
            <View
              style={{ flexDirection: 'row', gap: 3 }}
              accessible
              accessibilityLabel={view.stage.a11y}
            >
              {Array.from({ length: view.stage.of }, (_, i) => (
                <View
                  key={i}
                  style={{
                    width: 14,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: i < view.stage.step ? colours.outline : palette.line,
                  }}
                />
              ))}
            </View>
          </View>
        </View>
      </View>

      <Txt variant={meType.section} style={{ marginTop: 2 }} accessibilityRole="header">
        {view.canDoTitle}
      </Txt>
      {view.groups.map((g) => (
        <Group key={g.track} group={g} />
      ))}

      <RowsCard>
        <Row
          first
          dot={palette.honey}
          title={view.progress.title}
          note={view.progress.note}
          onPress={onProgress}
        />
        <Row
          dot={colours.success}
          title={view.minutes.title}
          value={view.minutes.value}
          link={view.minutes.plusLink}
          onPress={view.minutes.plusLink ? onPlus : onMinutes}
        />
        <Row
          dot={colours.accent}
          title={view.memory.title}
          value={view.memory.count}
          onPress={onMemory}
        />
        <Row
          dot={colours.secondary}
          title={view.notifications.title}
          value={view.notifications.value}
          onPress={onNotifications}
        />
        <Row dot={colours.surface} title={view.help} onPress={onHelp} />
      </RowsCard>

      <RowsCard>
        <Row first dot={colours.accentSoft} title={view.aiExplainer} onPress={onAiExplainer} />
        <Row dot={colours.surface} title={view.deleteData} onPress={onDeleteData} />
      </RowsCard>
    </>
  );
}

function Group({ group }: { group: CanDoGroup }) {
  return (
    <RowsCard>
      <View
        style={{
          paddingVertical: 6,
          paddingHorizontal: 12,
          backgroundColor: GROUP_FILL[group.track],
        }}
      >
        <Txt variant={meType.group} accessibilityRole="header">
          {group.name}
        </Txt>
      </View>
      {group.items.map((item) => (
        <View
          key={item.id}
          accessible
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.ticked }}
          accessibilityLabel={item.title}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderTopWidth: 1,
            borderTopColor: colours.divider,
          }}
        >
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 6,
              borderWidth: outline.thin,
              borderColor: colours.outline,
              backgroundColor: item.ticked ? colours.success : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {item.ticked ? (
              // The prototype's tick is the `✓` glyph at 11, Black.
              <Text style={{ fontSize: 11, fontWeight: '900', color: colours.text }}>✓</Text>
            ) : null}
          </View>
          <Txt
            variant={meType.canDo}
            colour={item.ticked ? colours.text : colours.textMuted}
            style={{ flex: 1 }}
          >
            {item.title}
          </Txt>
        </View>
      ))}
    </RowsCard>
  );
}

interface RowProps {
  readonly dot: string;
  readonly title: string;
  readonly note?: string | undefined;
  readonly value?: string | null | undefined;
  readonly link?: string | null | undefined;
  readonly onPress: () => void;
  readonly first?: boolean;
}

/** A settings row: a coloured dot, its title (a note or a link under it), a value and a chevron. */
function Row({ dot, title, note, value, link, onPress, first = false }: RowProps) {
  return (
    <Press
      onPress={onPress}
      accessibilityLabel={[title, note, value, link].filter(Boolean).join(', ')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        minHeight: 42,
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colours.divider,
      }}
    >
      {/* The prototype's 10-point dot inside its 2-point edge. */}
      <View
        style={{
          width: 14,
          height: 14,
          borderRadius: 7,
          borderWidth: outline.thin,
          borderColor: colours.outline,
          backgroundColor: dot,
        }}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt variant={meType.rowTitle}>{title}</Txt>
        {note ? (
          <Txt variant={meType.rowNote} colour={colours.textMuted}>
            {note}
          </Txt>
        ) : null}
        {link ? (
          // The whole row opens Plus while the link shows; it isn't a target of its own.
          <Txt
            variant={meType.rowLink}
            colour={LINK}
            style={{ textDecorationLine: 'underline', textDecorationColor: colours.accent }}
          >
            {link}
          </Txt>
        ) : null}
      </View>
      {value ? (
        <Txt variant={meType.rowValue} colour={colours.textMuted}>
          {value}
        </Txt>
      ) : null}
      <Txt variant={meType.chevron} colour={palette.dotted}>
        ›
      </Txt>
    </Press>
  );
}
