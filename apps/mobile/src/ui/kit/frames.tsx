import { S1_E1, findLine, findPhrase, getScene, glossFor, type TargetPhrase } from '@yapling/story';
import { colours, layout, motion, palette, stickerShadows, outline, radii } from '@yapling/theme';
import { translator } from '@yapling/i18n';
import { useState, type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, useWindowDimensions } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { CallBar } from '../call-bar';
import type { MicState } from '../mic-button';
import { CallSlotRow } from '../call-slot-row';
import { CheckRow } from '../check-row';
import { Chip, ChoiceChip, Tag } from '../chip';
import { CritterSlot } from '../critter-slot';
import { BackButton, GlassSheet } from '../glass-sheet';
import { KeepsakeFrame } from '../keepsake-frame';
import { useLocale } from '../locale';
import { LockScreenCard } from '../lock-screen-card';
import { FullRing, TimerRing, WeekRing } from '../rings';
import { PhraseStageTile, SeedPacketGrid } from '../seed-packet';
import { SpeakerPill } from '../speaker-pill';
import { SpeechBubble } from '../speech-bubble';
import { StickerButton } from '../sticker-button';
import { Sticker } from '../surface';
import { Txt } from '../text';
import { ToggleRow } from '../toggle';
import { typeExtras } from '../type-extras';

/**
 * The shared components placed where the prototype's screens place them, one frame per screen,
 * for side-by-side comparison with `design/renders/week1/<id>.png`. Art is left to its slots.
 * Positions are the prototype's (a 390-point phone); right-aligned things follow the real width.
 */

export const frameIds = [
  'splash',
  'call',
  'bus',
  'week',
  'card',
  'notif',
  'post',
  'keep',
  'lock',
] as const;
export type FrameId = (typeof frameIds)[number];

const vi = (phrase: TargetPhrase | undefined) =>
  phrase ? (glossFor(phrase.glosses, 'vi') ?? '') : '';

const weekPhrases = S1_E1.phrases.map((id) => findPhrase(id)).filter((p) => p !== undefined);

function Screen({ fill, children }: { fill: string; children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  return (
    <View style={{ width, height, backgroundColor: fill, overflow: 'hidden' }}>{children}</View>
  );
}

const at = (top: number, left: number, right?: number) =>
  ({ position: 'absolute', top, left, ...(right === undefined ? {} : { right }) }) as const;

function Back() {
  const { t } = useLocale();
  return (
    <BackButton
      onPress={() => undefined}
      accessibilityLabel={t('common.a11y.back')}
      style={at(layout.topBar, layout.marginScreen)}
    />
  );
}

function SplashFrame() {
  const { t } = useLocale();
  const languages = ['vi', 'id', 'th', 'pt', 'es', 'ja', 'ko', 'tr', 'other'] as const;
  return (
    <Screen fill={palette.harbourSky}>
      <GlassSheet kind="sheet" entrance={motion.screens.splashSheet}>
        <Txt variant="splashTitle" style={{ paddingHorizontal: 4 }}>
          {t('onboarding.splash.title')}
        </Txt>
        <Txt
          variant={typeExtras.sheetSub}
          colour={colours.textMuted}
          style={{ paddingHorizontal: 4 }}
        >
          {t('onboarding.splash.sub')}
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {languages.map((l, i) => (
            <ChoiceChip key={l} label={t(`onboarding.firstLanguage.${l}`)} selected={i === 0} />
          ))}
        </View>
        <StickerButton label={t('common.continue')} style={{ marginTop: 4 }} />
      </GlassSheet>
    </Screen>
  );
}

function CallFrame() {
  const { t } = useLocale();
  const line = findLine('s1-e1-03');
  const [mic, setMic] = useState<MicState>('yourTurn');
  return (
    <Screen fill={colours.accentSoft}>
      <CritterSlot kind="critter" size={220} style={at(212, 40)} />
      <CritterSlot kind="critter" size={130} style={at(486, 252)} />
      <Back />
      <SpeakerPill
        name="Mei"
        aiTag={t('common.aiTag')}
        place={t('call.place.cafe')}
        episode="S1 · E1"
        style={at(layout.topBar, 62, 14)}
      />
      {line ? (
        <SpeechBubble
          name="Pip"
          aiTag={t('common.aiTag')}
          tone="pip"
          text={line.caption}
          gloss={glossFor(line.glosses, 'vi') ?? ''}
          glossHint={t('call.tapForMeaning')}
          style={at(404, 96, 16)}
        />
      ) : null}
      <CallBar
        mic={mic}
        onTalkStart={() => setMic('listening')}
        onTalkEnd={() => setMic('yourTurn')}
        onHoldToggle={() => setMic((m) => (m === 'paused' ? 'yourTurn' : 'paused'))}
        exitLabel={t('call.done.wrapUp')}
        style={{ position: 'absolute', left: 14, right: 14, bottom: layout.callBarBottom }}
      />
    </Screen>
  );
}

function BusFrame() {
  const { t } = useLocale();
  const beat = getScene('s1-e1-practice').beats.find((b) => b.id === 'pip-asks');
  const example = beat?.kind === 'gen' ? (beat.example ?? '') : '';
  const remaining = useSharedValue(90);
  return (
    <Screen fill={colours.accentSoft}>
      <Back />
      <SpeakerPill
        name="Bea"
        aiTag={t('common.aiTag')}
        place={t('call.place.busStop')}
        style={[at(layout.topBar, 62, 14), { alignSelf: 'flex-start' }]}
      />
      <View style={{ position: 'absolute', top: 110, right: layout.marginCard }}>
        <TimerRing total={90} remaining={remaining} running={false} />
      </View>
      <SpeechBubble
        name="Pip"
        aiTag={t('common.aiTag')}
        tone="pip"
        text={example}
        gloss=" "
        glossHint={t('call.tapForMeaning')}
        style={at(500, 16, 140)}
      />
      <CallBar
        mic="yourTurn"
        exitLabel={t('call.done.hopOff')}
        style={{ position: 'absolute', left: 14, right: 14, bottom: layout.callBarBottom }}
      />
    </Screen>
  );
}

function WeekFrame() {
  const { t } = useLocale();
  const slots = [
    {
      tag: t('week.slot.episode'),
      title: 'S1 · E1 · The Letter',
      when: t('week.slot.today'),
      fill: palette.apricot,
      accent: colours.accent,
    },
    {
      tag: t('week.slot.realWeek'),
      title: t('week.slot.teach', { name: 'Pip' }),
      when: t('common.weekdayShort.thu'),
      fill: colours.accentSoft,
      accent: colours.secondary,
    },
    {
      tag: t('week.slot.practice'),
      title: 'Pass it on · Bus 45',
      when: t('common.weekdayShort.fri'),
      fill: colours.secondarySoft,
      accent: colours.success,
    },
  ];
  return (
    <Screen fill={colours.background}>
      <Back />
      <View style={[at(104, 22), { gap: 2 }]}>
        <Txt variant="noteStrong" colour={colours.textMuted}>
          {t('common.date.range', { from: '21', to: '27', month: t('common.month.9') })}
        </Txt>
        <Txt variant="screenTitle">{t('week.title')}</Txt>
      </View>
      <CritterSlot kind="critter" size={110} style={{ position: 'absolute', top: 66, right: 16 }} />
      <View style={[at(196, 14, 14), { gap: 8 }]}>
        {slots.map((s) => (
          <CallSlotRow
            key={s.tag}
            tag={s.tag}
            title={s.title}
            when={s.when}
            pictureFill={s.fill}
            accent={s.accent}
            done={false}
          />
        ))}
      </View>
      <Sticker
        shadow={stickerShadows.sheet}
        radius={radii.sheetBar}
        outline={outline.bold}
        fill={colours.surface}
        style={{ position: 'absolute', left: 10, right: 10, bottom: 10 }}
        contentStyle={{ paddingTop: 18, paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}
      >
        <Txt variant="section">{t('week.phrasesTitle')}</Txt>
        <SeedPacketGrid
          packets={weekPhrases.map((p) => ({ id: p.id, phrase: p.en, gloss: vi(p) }))}
        />
        <Txt variant="note" colour={colours.textMuted}>
          {t('week.seedNote')}
        </Txt>
        <StickerButton label={t('week.cta', { name: 'Pip' })} />
      </Sticker>
    </Screen>
  );
}

function CardFrame() {
  const { t } = useLocale();
  const strengths = ['keepGoing', 'askBack', 'clearAboutWork'] as const;
  return (
    <Screen fill={colours.accentSoft}>
      <Back />
      <GlassSheet kind="card" top={330} entrance={motion.screens.residencySheet}>
        <Txt variant="section" style={{ paddingHorizontal: 4 }}>
          {t('onboarding.card.strengthsTitle')}
        </Txt>
        {strengths.map((s, i) => (
          <CheckRow key={s} kind="strength" index={i} text={t(`onboarding.card.strength.${s}`)} />
        ))}
        <Txt variant="section" style={{ paddingTop: 6, paddingHorizontal: 4 }}>
          {t('onboarding.card.aimsTitle')}
        </Txt>
        <CheckRow kind="aim" text={t('cando.ask-whats-wrong')} />
        <CheckRow kind="aim" text={t('cando.introduce-yourself-30s')} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 }}>
          <Txt variant="noteStrong" colour={colours.textMuted} style={{ flex: 1 }}>
            {t('onboarding.card.adjust')}
          </Txt>
          <Chip label={t('onboarding.card.tooEasy')} />
          <Chip label={t('onboarding.card.tooHard')} />
        </View>
        <StickerButton label={t('common.continue')} style={{ marginTop: 'auto' }} />
      </GlassSheet>
    </Screen>
  );
}

function NotifFrame({ quiet, onQuiet }: { quiet: boolean; onQuiet: (on: boolean) => void }) {
  const { t } = useLocale();
  return (
    <Screen fill={colours.surfaceSunken}>
      <Back />
      <CritterSlot kind="critter" size={150} style={at(96, 120)} />
      <GlassSheet kind="info" top={300} entrance={motion.screens.infoSheet}>
        <Txt variant="kicker" colour={colours.textMuted}>
          {t('onboarding.notifications.kicker')}
        </Txt>
        <Txt variant="sheetTitle">{t('onboarding.notifications.title', { name: 'Pip' })}</Txt>
        <Txt variant="body" colour={colours.textBody}>
          {t('onboarding.notifications.body')}
        </Txt>
        <ToggleRow
          title={t('onboarding.notifications.quietHours')}
          subtitle={t('common.timeRange', { from: '22:00', to: '08:00' })}
          on={quiet}
          onChange={onQuiet}
        />
        <View style={{ marginTop: 'auto', gap: 8 }}>
          <StickerButton label={t('onboarding.notifications.allow')} />
          <StickerButton label={t('onboarding.notifications.later')} tone="glass" />
        </View>
      </GlassSheet>
    </Screen>
  );
}

function PostFrame() {
  const { t } = useLocale();
  return (
    <Screen fill={palette.peach}>
      <Back />
      <View style={[at(100, 22, 22), { gap: 2 }]}>
        <Txt variant="noteStrong" colour={colours.textMuted}>
          {t('payoff.afterCall.firstCall')}
        </Txt>
        <Txt variant="hero">{t('payoff.afterCall.done')}</Txt>
      </View>
      <View style={{ position: 'absolute', top: 184, right: 20 }}>
        <WeekRing filled={1} pop />
      </View>
      <View style={[at(196, 16, 120), { gap: 6 }]}>
        <Txt variant="label">{t('payoff.afterCall.winsTitle')}</Txt>
        {/* Wins come from the call's feedback; the can-dos stand in for them here. */}
        <CheckRow kind="win" text={t('cando.ask-whats-wrong')} />
        <CheckRow kind="win" index={1} text={t('cando.introduce-yourself-30s')} />
      </View>
      <View style={[at(410, 16, 16), { gap: 8 }]}>
        <Txt variant="label">{t('payoff.afterCall.sproutsTitle')}</Txt>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {weekPhrases.map((p, i) => (
            <PhraseStageTile
              key={p.id}
              phrase={p.en}
              stage={t(i === 1 ? 'burrow.stage.seed' : 'burrow.stage.sprout')}
              grow={i !== 1}
              index={i}
            />
          ))}
        </View>
      </View>
      <GlassSheet kind="bar" entrance={motion.screens.postSheet}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6 }}>
          <CritterSlot kind="face" size={46} style={{ height: 38 }} />
          <Txt variant={typeExtras.boxNote} style={{ flex: 1 }}>
            {t('payoff.afterCall.boxUnpacked')}
          </Txt>
          <Tag
            label={t('payoff.afterCall.ring', { done: 1, total: 3 })}
            fill={colours.accent}
            size="medium"
          />
        </View>
        <StickerButton label={t('payoff.afterCall.cta')} />
      </GlassSheet>
    </Screen>
  );
}

function KeepFrame() {
  const { t } = useLocale();
  return (
    <Screen fill={colours.accentSoft}>
      <Back />
      <View style={[at(96, 22, 22), { flexDirection: 'row', alignItems: 'center', gap: 14 }]}>
        <FullRing label={t('week.ring', { done: 3, total: 3 })} />
        <View style={{ gap: 4, flex: 1 }}>
          <Tag
            label={t('payoff.keepsake.week', { week: 1 })}
            fill={colours.secondary}
            size="medium"
            edge={outline.regular}
            tilt={-4}
          />
          <Txt variant="headline">{t('payoff.keepsake.title')}</Txt>
        </View>
      </View>
      <View style={[at(222, 56), { width: 278 }]}>
        <KeepsakeFrame
          heading={t('payoff.keepsake.canNow', { learner: 'Lan' })}
          canDo={translator('en')('cando.introduce-yourself-30s')}
          witnessed={t('payoff.keepsake.witnessed', { witness: 'Linh', date: 'Sep 25' })}
          hang
        />
      </View>
      <GlassSheet kind="bar">
        <StickerButton label={t('payoff.keepsake.cta')} />
      </GlassSheet>
    </Screen>
  );
}

function LockFrame() {
  const { t } = useLocale();
  return (
    <Screen fill={palette.lockNight}>
      <StatusBar style="light" />
      <View style={at(330, 12, 12)}>
        <LockScreenCard from="Pip" time="8:12" body={t('knocks.day2')} arrive />
      </View>
    </Screen>
  );
}

/** One frame by id. */
export function KitFrame({
  id,
  quiet,
  onQuiet,
}: {
  id: FrameId;
  quiet: boolean;
  onQuiet: (on: boolean) => void;
}) {
  switch (id) {
    case 'splash':
      return <SplashFrame />;
    case 'call':
      return <CallFrame />;
    case 'bus':
      return <BusFrame />;
    case 'week':
      return <WeekFrame />;
    case 'card':
      return <CardFrame />;
    case 'notif':
      return <NotifFrame quiet={quiet} onQuiet={onQuiet} />;
    case 'post':
      return <PostFrame />;
    case 'keep':
      return <KeepFrame />;
    case 'lock':
      return <LockFrame />;
  }
}
