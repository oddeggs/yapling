import { translator } from '@yapling/i18n';
import { S1_E1, findLine, findPhrase, glossFor } from '@yapling/story';
import { RECORDED_LINE_ASSETS } from '@yapling/story/assets';
import { colours, layout, palette } from '@yapling/theme';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Image, View } from 'react-native';
import { Easing, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { CallBar, ListenBar } from '../call-bar';
import { CallSlotRow } from '../call-slot-row';
import { captionCharTimes, captionWords } from '../caption';
import { CheckRow } from '../check-row';
import { AiTag, Chip, ChoiceChip, MeaningChip, Tag } from '../chip';
import { CritterSlot } from '../critter-slot';
import { BackButton, GlassSheet } from '../glass-sheet';
import { haptics, type HapticName } from '../haptics';
import { KeepsakeFrame } from '../keepsake-frame';
import { useLocale } from '../locale';
import { LockScreenCard } from '../lock-screen-card';
import type { MicState } from '../mic-button';
import { FullRing, TimerRing, WeekRing, useCountdown } from '../rings';
import { PhraseStageTile, SeedPacketGrid } from '../seed-packet';
import { SpeakerPill } from '../speaker-pill';
import { SpeechBubble } from '../speech-bubble';
import { StickerButton } from '../sticker-button';
import { Txt } from '../text';
import { useToast } from '../toast';
import { ToggleRow } from '../toggle';

/**
 * Every shared component in its states, on one scroll, with Vietnamese chrome. Section names are
 * the components' own names: this screen is for developers only.
 */

const LINE_ID = 's1-e1-03';

/** A recorded line's bundled audio, resolved: proves Metro bundles `audio/` from the repo root. */
function useStoryAsset() {
  return useMemo(() => {
    const asset = RECORDED_LINE_ASSETS[LINE_ID];
    const uri = Image.resolveAssetSource(asset.audio())?.uri ?? 'unresolved';
    console.log(`[kit] ${LINE_ID} audio resolves to ${uri}`);
    return { uri, timing: asset.timing() };
  }, []);
}

function Section({ name, children }: { name: string; children: ReactNode }) {
  return (
    <View style={{ gap: 10, paddingVertical: 14 }}>
      <Txt variant="section" colour={colours.textMuted}>
        {name}
      </Txt>
      {children}
    </View>
  );
}

const Row = ({ children, wrap = true }: { children: ReactNode; wrap?: boolean }) => (
  <View
    style={{
      flexDirection: 'row',
      flexWrap: wrap ? 'wrap' : 'nowrap',
      gap: 8,
      alignItems: 'center',
    }}
  >
    {children}
  </View>
);

/** A coloured stand-in for a scene behind glass. */
const Backdrop = ({ fill, children }: { fill: string; children: ReactNode }) => (
  <View
    style={{ backgroundColor: fill, borderRadius: 24, padding: 12, gap: 12, overflow: 'hidden' }}
  >
    <View
      style={{
        position: 'absolute',
        top: 20,
        left: 40,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: palette.cyan,
        opacity: 0.6,
      }}
    />
    {children}
  </View>
);

export function KitCatalogue() {
  const { t } = useLocale();
  const toast = useToast();
  const asset = useStoryAsset();
  const [lang, setLang] = useState(0);
  const [quiet, setQuiet] = useState(true);
  const [aimDone, setAimDone] = useState(false);
  const [mic, setMic] = useState<MicState>('yourTurn');
  const [timerRunning, setTimerRunning] = useState(false);

  const line = findLine(LINE_ID);
  const caption = line?.caption ?? '';
  const words = useMemo(
    () => captionWords(caption, captionCharTimes(caption, asset.timing.alignment)),
    [caption, asset.timing],
  );
  const seconds = useSharedValue(0);
  const duration = (line?.audio?.durationMs ?? 3000) / 1000;
  useEffect(() => {
    // The kit replays the line's real timing on a loop, as the player's clock will drive it.
    seconds.set(
      withRepeat(
        withTiming(duration + 1.5, { duration: (duration + 1.5) * 1000, easing: Easing.linear }),
        -1,
      ),
    );
  }, [duration, seconds]);
  const remaining = useCountdown(90, timerRunning, () => setTimerRunning(false));
  const sixty = useSharedValue(60);
  const urgent = useSharedValue(8);

  const phrases = S1_E1.phrases.map((id) => findPhrase(id)).filter((p) => p !== undefined);
  const languages = ['vi', 'id', 'th', 'pt', 'es', 'ja', 'ko', 'tr', 'other'] as const;
  const ai = t('common.aiTag');

  return (
    <View style={{ paddingHorizontal: layout.marginScreen }}>
      <Section name="StickerButton">
        <StickerButton label={t('common.continue')} />
        <StickerButton label={t('plus.notNow')} tone="secondary" />
        <Row wrap={false}>
          <StickerButton
            label={t('plus.notNow')}
            tone="secondary"
            size="pair"
            style={{ flex: 1 }}
          />
          <StickerButton label={t('plus.cta')} size="pair" style={{ flex: 1 }} />
        </Row>
        <StickerButton label={t('onboarding.pick.cta')} size="tall" tone="answer" />
        <StickerButton label={t('plus.cta')} tone="dark" />
        <StickerButton label={t('onboarding.notifications.later')} tone="glass" />
        <Row>
          <StickerButton label={t('call.done.seasonMap')} size="small" />
          <StickerButton label={t('common.done')} size="small" disabled />
        </Row>
      </Section>

      <Section name="ChoiceChip · Chip · Tag · AiTag · MeaningChip">
        <Row>
          {languages.map((l, i) => (
            <ChoiceChip
              key={l}
              label={t(`onboarding.firstLanguage.${l}`)}
              selected={i === lang}
              onPress={() => setLang(i)}
            />
          ))}
        </Row>
        <Row>
          <Chip
            label={t('onboarding.card.tooEasy')}
            onPress={() => toast({ text: t('onboarding.card.adjustedFaster') })}
          />
          <Chip
            label={t('onboarding.card.tooHard')}
            onPress={() => toast({ text: t('onboarding.card.adjustedSlower') })}
          />
        </Row>
        <Row>
          <AiTag label={ai} />
          <AiTag label={ai} small />
          <Tag label={t('onboarding.card.stage', { stage: 1, stages: 5 })} />
          <Tag label={t('call.hint')} fill={palette.honey} />
          <Tag label={t('plus.plan.intro')} fill={colours.success} />
          <Tag
            label={t('payoff.afterCall.ring', { done: 1, total: 3 })}
            fill={colours.accent}
            size="medium"
          />
          <Tag
            label={t('payoff.keepsake.week', { week: 1 })}
            fill={colours.secondary}
            size="medium"
            edge={2.5}
            tilt={-4}
          />
          <Tag label={t('story.nothingToFail')} fill={colours.successSoft} size="note" />
        </Row>
        <MeaningChip label={t('call.whatDoesThatMean')} />
      </Section>

      <Section name="GlassSheet · BackButton">
        <Backdrop fill={palette.harbourSky}>
          <BackButton onPress={() => undefined} accessibilityLabel={t('common.a11y.back')} />
          <GlassSheet kind="sheet" inline>
            <Txt variant="splashTitle">{t('onboarding.splash.title')}</Txt>
            <StickerButton label={t('common.continue')} />
          </GlassSheet>
          <GlassSheet kind="bar" inline>
            <StickerButton label={t('payoff.afterCall.cta')} />
          </GlassSheet>
        </Backdrop>
      </Section>

      <Section name="CallSlotRow">
        <Backdrop fill={colours.background}>
          <CallSlotRow
            tag={t('week.slot.episode')}
            title="S1 · E1 · The Letter"
            when={t('week.slot.today')}
            pictureFill={palette.apricot}
            accent={colours.accent}
            done
            onPress={() => undefined}
          />
          <CallSlotRow
            tag={t('week.slot.realWeek')}
            title={t('week.slot.teach', { name: 'Pip' })}
            when={t('common.weekdayShort.thu')}
            pictureFill={colours.accentSoft}
            accent={colours.secondary}
            done={false}
          />
          <CallSlotRow
            tag={t('week.slot.practice')}
            title="Pass it on · Bus 45"
            when={t('common.weekdayShort.fri')}
            pictureFill={colours.secondarySoft}
            accent={colours.success}
            done={false}
          />
        </Backdrop>
      </Section>

      <Section name="SeedPacket · PhraseStageTile">
        <SeedPacketGrid
          packets={phrases.map((p) => ({
            id: p.id,
            phrase: p.en,
            gloss: glossFor(p.glosses, 'vi') ?? '',
          }))}
        />
        <Row wrap={false}>
          {phrases.map((p, i) => (
            <PhraseStageTile
              key={p.id}
              phrase={p.en}
              stage={t(i === 1 ? 'burrow.stage.seed' : 'burrow.stage.sprout')}
              grow={i !== 1}
              index={i}
            />
          ))}
        </Row>
      </Section>

      <Section name="SpeechBubble · SpeakerPill">
        <Backdrop fill={colours.accentSoft}>
          <SpeakerPill name="Mei" aiTag={ai} place={t('call.place.cafe')} episode="S1 · E1" />
          <SpeakerPill
            name="Bea"
            aiTag={ai}
            place={t('call.place.busStop')}
            style={{ alignSelf: 'flex-start' }}
          />
          <SpeechBubble
            name="Pip"
            aiTag={ai}
            tone="pip"
            text={caption}
            caption={{ words, seconds }}
            talking
            gloss={line ? (glossFor(line.glosses, 'vi') ?? '') : ''}
            glossHint={t('call.tapForMeaning')}
          />
          <SpeechBubble
            name="Pip"
            aiTag={ai}
            tone="pip"
            text={caption}
            gloss={line ? (glossFor(line.glosses, 'vi') ?? '') : ''}
            glossHint={t('call.tapForMeaning')}
            onGlossChange={(shown) =>
              shown && toast({ text: t('call.seedDropped'), haptic: 'selection' })
            }
          />
          <SpeechBubble
            name="Mei"
            aiTag={ai}
            tone="neighbour"
            text={findLine('s1-e1-04')?.caption ?? ''}
          />
          <SpeechBubble
            name={t('call.callee.harbourLaneOffice')}
            aiTag={ai}
            tone="office"
            text={findLine('s1-e1-06')?.caption ?? ''}
          />
        </Backdrop>
        <Txt variant="note" colour={colours.textMuted} selectable>
          {`${LINE_ID}.mp3 → ${asset.uri}`}
        </Txt>
      </Section>

      <Section name="CallBar · MicButton · ListenBar">
        <Backdrop fill={colours.accentSoft}>
          <CallBar
            mic={mic}
            exitLabel={t('call.done.wrapUp')}
            onHoldToggle={() => setMic((m) => (m === 'paused' ? 'yourTurn' : 'paused'))}
            onTalkStart={() => setMic('listening')}
            onTalkEnd={() => setMic('yourTurn')}
          />
          <CallBar mic="speaking" speaker="Pip" exitLabel={t('call.done.wrapUp')} />
          <CallBar mic="listening" exitLabel={t('call.done.hopOff')} />
          <CallBar mic="paused" exitLabel={t('call.done.wrapUp')} />
          <CallBar mic="idle" sceneDone exitLabel={t('call.done.seasonMap')} />
          <ListenBar paused={false} done={false} doneLabel={t('story.thanks', { name: 'Pip' })} />
          <ListenBar paused={false} done doneLabel={t('story.thanks', { name: 'Pip' })} />
        </Backdrop>
      </Section>

      <Section name="TimerRing · WeekRing · FullRing">
        <Row>
          <TimerRing total={90} remaining={remaining} running={timerRunning} />
          <TimerRing total={60} remaining={sixty} running={false} />
          <TimerRing total={45} remaining={urgent} running />
        </Row>
        <StickerButton
          size="small"
          tone="secondary"
          label={timerRunning ? t('call.mic.listening') : t('call.mic.yourTurn')}
          onPress={() => setTimerRunning((r) => !r)}
        />
        <Row>
          {[0, 1, 2, 3].map((n) => (
            <WeekRing key={n} filled={n} size={72} />
          ))}
        </Row>
        <FullRing label={t('week.ring', { done: 3, total: 3 })} />
      </Section>

      <Section name="Toast · haptics">
        <Row>
          {(['tap', 'selection', 'success', 'yourTurn', 'sparkle'] as HapticName[]).map((h) => (
            <Chip key={h} label={h} onPress={() => haptics.play(h)} />
          ))}
        </Row>
        <StickerButton
          size="small"
          label={t('call.wordAdded', { word: 'rent' })}
          onPress={() =>
            toast({ text: t('call.wordAdded', { word: 'rent' }), haptic: 'selection' })
          }
        />
      </Section>

      <Section name="LockScreenCard">
        <View style={{ backgroundColor: palette.lockNight, borderRadius: 24, padding: 12 }}>
          <LockScreenCard from="Pip" time="8:12" body={t('knocks.day2')} />
        </View>
      </Section>

      <Section name="CheckRow">
        <Backdrop fill={colours.accentSoft}>
          <CheckRow kind="strength" text={t('onboarding.card.strength.keepGoing')} />
          <CheckRow kind="aim" text={t('cando.ask-whats-wrong')} checked={aimDone} />
          <StickerButton
            size="small"
            tone="secondary"
            label={t('common.done')}
            onPress={() => setAimDone((d) => !d)}
          />
          <CheckRow kind="win" text={t('cando.introduce-yourself-30s')} />
        </Backdrop>
      </Section>

      <Section name="KeepsakeFrame">
        <View style={{ width: 278, alignSelf: 'center' }}>
          <KeepsakeFrame
            heading={t('payoff.keepsake.canNow', { learner: 'Lan' })}
            canDo={translator('en')('cando.introduce-yourself-30s')}
            witnessed={t('payoff.keepsake.witnessed', { witness: 'Linh', date: 'Sep 25' })}
          />
        </View>
      </Section>

      <Section name="ToggleRow">
        <ToggleRow
          title={t('onboarding.notifications.quietHours')}
          subtitle={t('common.timeRange', { from: '22:00', to: '08:00' })}
          on={quiet}
          onChange={setQuiet}
        />
      </Section>

      <Section name="CritterSlot">
        <Row>
          <CritterSlot kind="critter" size={110} />
          <CritterSlot kind="face" size={64} />
          <CritterSlot kind="object" size={36} />
        </Row>
      </Section>
    </View>
  );
}
