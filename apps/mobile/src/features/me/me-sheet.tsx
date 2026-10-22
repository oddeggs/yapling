import type { PipSpecies } from '@yapling/art';
import { colours, outline, palette, stickerShadows, type, type TypeStyle } from '@yapling/theme';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Press, Sticker, Txt } from '../../ui';
import { Face } from '../burrow/art';
import { Dial } from '../payoff/too-hard-sheet';
import { RowsCard } from './me-frame';
import type { CanDoGroup, MeView, SettlingCard } from './me-model';

/** The prototype's Me sheet sizes, from the nearest theme styles. */
const meType = {
  name: { ...type.cardTitle, size: 24, lineHeight: 1 },
  stage: { ...type.note, weight: 800 },
  section: { ...type.section, size: 12, uppercase: true },
  group: type.label,
  canDo: { ...type.item, size: 13.5, lineHeight: 1.2 },
  canDoVisitor: { ...type.item, size: 14, lineHeight: 1.3 },
  settlingCount: { ...type.note, weight: 700 },
  rowTitle: { ...type.item, size: 14, lineHeight: 1.3 },
  rowNote: { ...type.rowSub, size: 11.5 },
  rowLink: { ...type.note, weight: 800 },
  rowValue: type.rowSub,
  chevron: { ...type.buttonPair },
  canDoGloss: { ...type.glossSmall, size: 15, lineHeight: 1.2 },
  settlingTitle: { ...type.item, weight: 800, lineHeight: 1.3 },
  settlingSub: { ...type.rowSub, size: 11.5, lineHeight: 1.3 },
} as const satisfies Record<string, TypeStyle>;

/** The plum of the "Get more with Plus" link; the theme has no name for it yet. */
const LINK = '#7A3B86';

const GROUP_FILL = { life: colours.successSoft, work: colours.secondarySoft } as const;

export interface MeSheetProps {
  readonly view: MeView;
  /** The roommate's species, for its face at the top. */
  readonly species?: PipSpecies;
  readonly onPlus: () => void;
  readonly onMinutes: () => void;
  readonly onProgress: () => void;
  readonly onMemory: () => void;
  readonly onNotifications: () => void;
  readonly onHelp: () => void;
  readonly onAiExplainer: () => void;
  readonly onDeleteData: () => void;
  /** The Settling-in card's rows. */
  readonly onReplay?: () => void;
  readonly onFaster?: () => void;
  readonly onTooHard?: () => void;
  /** The faster row stays pressed while its confirm sheet is up. */
  readonly fasterOpen?: boolean;
}

/** The learner's page: their stage, what they can now do, and the rows below. */
export function MeSheet({
  view,
  species = 'redpanda',
  onPlus,
  onMinutes,
  onProgress,
  onMemory,
  onNotifications,
  onHelp,
  onAiExplainer,
  onDeleteData,
  onReplay,
  onFaster,
  onTooHard,
  fasterOpen = false,
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
          <Face character="pip" species={species} size={58} background={colours.accentSoft} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt variant={meType.name} accessibilityRole="header">
            {view.name}
          </Txt>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
            accessible
            accessibilityLabel={view.stage.a11y}
          >
            <View
              style={{
                paddingVertical: 2,
                paddingHorizontal: 8,
                borderRadius: 8,
                borderWidth: outline.thin,
                borderColor: colours.outline,
                backgroundColor: view.stage.visitor ? colours.secondarySoft : colours.successSoft,
              }}
            >
              <Txt variant={meType.stage} numberOfLines={1}>
                {view.stage.label}
              </Txt>
            </View>
            {view.stage.settling ? (
              <Txt variant={meType.settlingCount} colour={colours.textMuted} numberOfLines={1}>
                {view.stage.settling}
              </Txt>
            ) : null}
            {view.stage.steps ? (
              <View style={{ flexDirection: 'row', gap: 3 }}>
                {Array.from({ length: view.stage.steps.of }, (_, i) => (
                  <View
                    key={i}
                    style={{
                      width: 14,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor:
                        i < (view.stage.steps?.step ?? 0) ? colours.outline : palette.line,
                    }}
                  />
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <Txt variant={meType.section} style={{ marginTop: 2 }} accessibilityRole="header">
        {view.canDoTitle}
      </Txt>
      {view.groups.map((g) => (
        <Group key={g.track} group={g} />
      ))}

      {view.settling ? (
        <Settling
          card={view.settling}
          fasterOpen={fasterOpen}
          onReplay={onReplay}
          onFaster={onFaster}
          onTooHard={onTooHard}
        />
      ) : null}

      <RowsCard>
        {view.progress ? (
          <Row
            first
            dot={palette.honey}
            title={view.progress.title}
            note={view.progress.note}
            onPress={onProgress}
          />
        ) : null}
        <Row
          first={view.progress === null}
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
        {/*
          Hands-free: the turn-mode setting ("Rảnh tay") goes here, between quiet hours and help,
          once the hands-free preference is on main.
        */}
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
      {group.name !== null ? (
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
      ) : null}
      {group.items.map((item, i) => (
        <View
          key={item.id}
          accessible
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.ticked }}
          accessibilityLabel={item.gloss ? `${item.title}. ${item.gloss}` : item.title}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: item.gloss ? 9 : 8,
            paddingHorizontal: 12,
            borderTopWidth: group.name === null && i === 0 ? 0 : 1,
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
          <View style={{ flex: 1 }}>
            <Txt
              variant={item.gloss ? meType.canDoVisitor : meType.canDo}
              colour={item.ticked ? colours.text : colours.textMuted}
            >
              {item.title}
            </Txt>
            {item.gloss ? (
              <Txt variant={meType.canDoGloss} colour={colours.textGloss}>
                {item.gloss}
              </Txt>
            ) : null}
          </View>
        </View>
      ))}
    </RowsCard>
  );
}

/** A Settling-in row: its round picture, title and line, and a chevron. */
function SettlingRowView({
  icon,
  title,
  sub,
  first,
  pressed,
  onPress,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  first: boolean;
  pressed: boolean;
  onPress: (() => void) | undefined;
}) {
  return (
    <Press
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${sub}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        minHeight: 54,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colours.divider,
        backgroundColor: pressed ? colours.divider : colours.surface,
      }}
    >
      {icon}
      <View style={{ flex: 1 }}>
        <Txt variant={meType.settlingTitle}>{title}</Txt>
        <Txt variant={meType.settlingSub} colour={colours.textMuted}>
          {sub}
        </Txt>
      </View>
      <Txt variant={meType.chevron} colour={palette.dotted}>
        ›
      </Txt>
    </Press>
  );
}

const roundIcon = {
  width: 34,
  height: 34,
  borderRadius: 17,
  borderWidth: outline.thin,
  borderColor: colours.outline,
  overflow: 'hidden',
  alignItems: 'center',
  justifyContent: 'center',
} as const;

/** "LÀM QUEN": replay a chapter with Linh, try it faster, or "too hard?". */
function Settling({
  card,
  fasterOpen,
  onReplay,
  onFaster,
  onTooHard,
}: {
  card: SettlingCard;
  fasterOpen: boolean;
  onReplay: (() => void) | undefined;
  onFaster: (() => void) | undefined;
  onTooHard: (() => void) | undefined;
}) {
  const rows = [
    card.replay
      ? {
          key: 'replay',
          row: card.replay,
          onPress: onReplay,
          icon: (
            <View style={roundIcon}>
              <Face character="linh" size={30} background={colours.secondarySoft} />
            </View>
          ),
        }
      : null,
    card.faster
      ? {
          key: 'faster',
          row: card.faster,
          onPress: onFaster,
          icon: (
            <View style={[roundIcon, { backgroundColor: colours.success }]}>
              <Dial size={18} speed="fast" />
            </View>
          ),
        }
      : null,
    card.tooHard
      ? {
          key: 'tooHard',
          row: card.tooHard,
          onPress: onTooHard,
          icon: (
            <View style={[roundIcon, { backgroundColor: colours.accentSoft }]}>
              <Txt variant={{ ...type.item, size: 15, weight: 900 }}>?</Txt>
            </View>
          ),
        }
      : null,
  ].filter((r) => r !== null);
  return (
    <Sticker
      shadow={stickerShadows.button}
      radius={18}
      outline={outline.regular}
      fill={colours.surface}
      contentStyle={{ overflow: 'hidden', borderRadius: 16 }}
    >
      <View
        style={{
          paddingVertical: 6,
          paddingHorizontal: 12,
          backgroundColor: colours.highlight,
          borderBottomWidth: outline.thin,
          borderBottomColor: colours.outline,
        }}
      >
        <Txt variant={meType.group} accessibilityRole="header">
          {card.title}
        </Txt>
      </View>
      {rows.map((r, i) => (
        <SettlingRowView
          key={r.key}
          icon={r.icon}
          title={r.row.title}
          sub={r.row.sub}
          first={i === 0}
          pressed={r.key === 'faster' && fasterOpen}
          onPress={r.onPress}
        />
      ))}
    </Sticker>
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
        minHeight: 44,
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colours.divider,
      }}
    >
      {/* The design's 10-point dot inside its 2-point edge, its corners rounded by 5. */}
      <View
        style={{
          width: 14,
          height: 14,
          borderRadius: 5,
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
