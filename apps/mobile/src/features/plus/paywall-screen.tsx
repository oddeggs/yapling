import {
  colours,
  layout,
  motion,
  outline,
  palette,
  translucent,
  type,
  type TypeStyle,
} from '@yapling/theme';
import { ScrollView, View } from 'react-native';

import { BackButton, GlassSheet, Press, StickerButton, Txt } from '../../ui';
import type { PlusPlan } from './products';
import type { PaywallView, PlanCard, TableRow } from './paywall-model';

/** The prototype's sizes for the table and the plan cards, from the nearest theme styles. */
const cell = (weight: TypeStyle['weight']): TypeStyle => ({ ...type.rowSub, weight });
const planType = {
  label: { ...type.note, weight: 700 },
  price: { ...type.episodeTitle, tracking: -0.03 },
  detail: { ...type.rowSub, size: 11 },
  badge: { ...type.labelSmall, size: 10, tracking: 0 },
} as const satisfies Record<string, TypeStyle>;

/** Where the paywall's sheet starts: under the back button, over the town. */
const SHEET_TOP = 150;

export interface PaywallScreenProps {
  readonly view: PaywallView;
  readonly onSelect: (plan: PlusPlan) => void;
  readonly onUpgrade: () => void;
  readonly onNotNow: () => void;
  readonly onRestore: () => void;
  readonly onTerms: () => void;
  readonly onPrivacy: () => void;
  readonly onStudents: () => void;
  readonly backLabel: string;
}

/** Yapling Plus: what Free keeps, what Plus adds, two plans, and an equal way out. */
export function PaywallScreen({
  view,
  onSelect,
  onUpgrade,
  onNotNow,
  onRestore,
  onTerms,
  onPrivacy,
  onStudents,
  backLabel,
}: PaywallScreenProps) {
  return (
    <View style={{ flex: 1, backgroundColor: colours.surfaceSunken }}>
      {/* The town scene goes here, blurred, once `@yapling/art` draws it. */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', inset: 0, backgroundColor: translucent.paperWash }}
      />
      <BackButton
        onPress={onNotNow}
        accessibilityLabel={backLabel}
        style={{ position: 'absolute', top: layout.topBar, left: layout.marginScreen }}
      />
      <GlassSheet kind="info" top={SHEET_TOP} entrance={motion.screens.infoSheet}>
        <ScrollView
          style={{ flex: 1, marginHorizontal: -18, marginTop: -22 }}
          contentContainerStyle={{ gap: 10, paddingHorizontal: 18, paddingTop: 22 }}
          showsVerticalScrollIndicator={false}
        >
          <Txt variant="kicker" colour={colours.textMuted}>
            {view.kicker}
          </Txt>
          <Txt variant="sheetTitle" accessibilityRole="header">
            {view.title}
          </Txt>
          <Txt variant="body" colour={colours.textBody}>
            {view.body}
          </Txt>
          <Table rows={view.table} />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            {view.cards.map((c) => (
              <Plan key={c.plan} card={c} onPress={() => onSelect(c.plan)} />
            ))}
          </View>
          <Txt variant="note" colour={colours.textMuted}>
            {view.students}{' '}
            <Txt
              variant="note"
              colour={colours.textHand}
              onPress={onStudents}
              accessibilityRole="link"
              style={{ textDecorationLine: 'underline' }}
            >
              {view.studentsLink}
            </Txt>{' '}
            {view.fairUse}
          </Txt>
          <Txt variant="note" colour={colours.textMuted}>
            {view.autoRenew}
          </Txt>
          {/* Last, so the auto-renew wording stays in view without scrolling. */}
          {view.notice ? (
            <Txt variant="noteStrong" colour={colours.textHand}>
              {view.notice}
            </Txt>
          ) : null}
        </ScrollView>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <StickerButton {...view.notNow} onPress={onNotNow} />
            <StickerButton {...view.upgrade} onPress={onUpgrade} />
          </View>
          <Txt variant={{ ...type.rowSub, weight: 700 }} align="center">
            {view.stayEitherWay}
          </Txt>
          <View style={{ flexDirection: 'row', justifyContent: 'center', columnGap: 16 }}>
            <SmallLink
              label={view.restore.label}
              onPress={onRestore}
              disabled={view.restore.disabled}
            />
            <SmallLink label={view.terms} onPress={onTerms} />
            <SmallLink label={view.privacy} onPress={onPrivacy} />
          </View>
        </View>
      </GlassSheet>
    </View>
  );
}

function Table({ rows }: { rows: readonly TableRow[] }) {
  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: outline.regular,
        borderColor: colours.outline,
        overflow: 'hidden',
      }}
    >
      {rows.map((r, i) => (
        <View
          key={i}
          accessible
          accessibilityLabel={r.header ? undefined : `${r.feature}: ${r.free}, ${r.plus}`}
          style={{
            flexDirection: 'row',
            paddingVertical: 6,
            paddingHorizontal: 10,
            backgroundColor: r.header ? palette.fog : palette.white,
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: colours.divider,
          }}
        >
          <Txt variant={cell(r.header ? 800 : 700)} style={{ flex: 1 }}>
            {r.feature}
          </Txt>
          <Txt variant={cell(r.header ? 800 : 700)} style={{ width: 70 }}>
            {r.free}
          </Txt>
          <Txt variant={cell(r.header ? 800 : 700)} style={{ width: 96 }}>
            {r.plus}
          </Txt>
        </View>
      ))}
    </View>
  );
}

function Plan({ card, onPress }: { card: PlanCard; onPress: () => void }) {
  return (
    <Press
      onPress={onPress}
      haptic="selection"
      accessibilityRole="radio"
      accessibilityState={{ selected: card.selected }}
      accessibilityLabel={card.accessibilityLabel}
      style={{
        flex: 1,
        gap: 1,
        padding: 12,
        borderRadius: 18,
        borderWidth: outline.regular,
        borderColor: colours.outline,
        backgroundColor: card.selected ? colours.accent : translucent.frostStrong,
      }}
    >
      {card.badge ? (
        <View
          style={{
            position: 'absolute',
            top: -10,
            left: 10,
            paddingVertical: 1,
            paddingHorizontal: 7,
            borderRadius: 7,
            borderWidth: outline.thin,
            borderColor: colours.outline,
            backgroundColor: colours.success,
          }}
        >
          <Txt variant={planType.badge} numberOfLines={1}>
            {card.badge}
          </Txt>
        </View>
      ) : null}
      <Txt variant={planType.label}>{card.label}</Txt>
      <Txt variant={planType.price} numberOfLines={1} adjustsFontSizeToFit>
        {card.price}
      </Txt>
      <Txt variant={planType.detail}>{card.detail}</Txt>
    </Press>
  );
}

function SmallLink({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Press onPress={onPress} disabled={disabled} accessibilityRole="link" hitSlop={8}>
      <Txt
        variant={{ ...type.note, weight: 700 }}
        colour={disabled ? colours.textDisabled : colours.textMuted}
        style={{ textDecorationLine: 'underline' }}
      >
        {label}
      </Txt>
    </Press>
  );
}
