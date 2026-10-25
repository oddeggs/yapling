import {
  ARRIVAL_DOING,
  ARRIVAL_HARD,
  ARRIVAL_INTERESTS,
  ARRIVAL_WHY,
  type Arrival,
  type CompanionOption,
} from '@yapling/contracts';
import { translator, type StringKey } from '@yapling/i18n';
import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '../ui/haptics';
import { useLocale } from '../ui/locale';
import { Glass } from './dock';
import { C, F, label, SPRING } from './theme';

/*
 * Arriving in Natterwick: the learner steps off the 45 and tells the town who they are, one
 * question at a time, over the painted bus stop. The question is in English, large, with the
 * learner's own language small beneath it. What they say here is what their stories are made of.
 */

type Answers = Omit<Arrival, 'firstLanguage' | 'country' | 'timezone'>;
type Draft = {
  name: string;
  why: Arrival['why'][number][];
  doing: Arrival['doing'] | null;
  field: string;
  interests: Arrival['interests'][number][];
  hard: Arrival['hard'][number][];
  level: number | null;
};

const STEPS = [
  'welcome',
  'name',
  'why',
  'doing',
  'love',
  'hard',
  'level',
  'last',
  'companion',
] as const;
type Step = (typeof STEPS)[number];

const en = translator('en');

interface Props {
  /** Sends the answers; resolves with the two companions to choose from, or null on failure. */
  readonly onDone: (answers: Answers) => Promise<readonly CompanionOption[] | null>;
  readonly onChoose: (companion: CompanionOption['id']) => Promise<boolean>;
  /** Plays a companion's recorded introduction. */
  readonly onHear: (companion: CompanionOption['id']) => void;
  /** Answers already sent (the app was closed before choosing): start at the choice. */
  readonly companions: readonly CompanionOption[];
}

export function ArriveScreen({ onDone, onChoose, onHear, companions }: Props) {
  const { t, language } = useLocale();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(companions.length ? STEPS.indexOf('companion') : 0);
  const [options, setOptions] = useState<readonly CompanionOption[]>(companions);
  const [picked, setPicked] = useState<CompanionOption['id'] | null>(companions[0]?.id ?? null);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [d, setD] = useState<Draft>({
    name: '',
    why: [],
    doing: null,
    field: '',
    interests: [],
    hard: [],
    level: null,
  });
  const at: Step = STEPS[step] ?? 'welcome';
  // The learner's own language under the English, unless the chrome is English.
  const own = (key: StringKey) =>
    language === 'en' ? null : (t as unknown as (k: StringKey) => string)(key);

  const ready: Readonly<Record<Step, boolean>> = {
    welcome: true,
    name: d.name.trim().length > 0,
    why: d.why.length > 0,
    doing: d.doing !== null,
    love: true,
    hard: true,
    level: d.level !== null,
    last: true,
    companion: picked !== null,
  };

  const go = (by: number) => {
    haptics.play('tap');
    setStep((s) => Math.max(0, Math.min(STEPS.length - 1, s + by)));
  };

  const finish = async () => {
    if (sending || d.doing === null || d.level === null) return;
    setSending(true);
    setFailed(false);
    haptics.play('success');
    const ok = await onDone({
      name: d.name.trim().slice(0, 40),
      why: d.why,
      doing: d.doing,
      field: d.field.trim() ? d.field.trim().slice(0, 80) : null,
      interests: d.interests,
      hard: d.hard,
      level: d.level,
      adult: true,
    });
    setSending(false);
    if (!ok) {
      setFailed(true);
      return;
    }
    setOptions(ok);
    setPicked(ok[0]?.id ?? null);
    setStep(STEPS.indexOf('companion'));
    if (ok[0]) onHear(ok[0].id);
  };

  const choose = async () => {
    if (sending || picked === null) return;
    setSending(true);
    setFailed(false);
    haptics.play('success');
    if (!(await onChoose(picked))) {
      setSending(false);
      setFailed(true);
    }
  };

  function toggle<K extends 'why' | 'interests' | 'hard'>(
    key: K,
    value: Draft[K][number],
    max: number,
  ) {
    setD((x) => {
      const list = x[key] as Draft[K][number][];
      const on = list.includes(value);
      if (!on && list.length >= max) return x;
      haptics.play('selection');
      return { ...x, [key]: on ? list.filter((v) => v !== value) : [...list, value] };
    });
  }

  let body: ReactNode = null;
  switch (at) {
    case 'welcome':
      body = (
        <Question
          step={null}
          title={en('arrive.welcome.title')}
          line={en('arrive.welcome.line')}
          own={own('arrive.welcome.line')}
          big
        />
      );
      break;
    case 'name':
      body = (
        <>
          <Question step={step} title={en('arrive.name.q')} own={own('arrive.name.q')} />
          <TextInput
            value={d.name}
            onChangeText={(name) => setD((x) => ({ ...x, name }))}
            placeholder={en('arrive.name.placeholder')}
            placeholderTextColor={C.faint}
            autoFocus
            autoCorrect={false}
            autoCapitalize="words"
            textContentType="givenName"
            maxLength={40}
            returnKeyType="next"
            onSubmitEditing={() => ready.name && go(1)}
            style={styles.input}
          />
        </>
      );
      break;
    case 'why':
      body = (
        <>
          <Question
            step={step}
            title={en('arrive.why.q')}
            own={own('arrive.why.q')}
            hint={t('arrive.why.hint')}
          />
          <Chips>
            {ARRIVAL_WHY.map((w) => (
              <Chip
                key={w}
                text={en(`arrive.why.${w}`)}
                sub={own(`arrive.why.${w}`)}
                on={d.why.includes(w)}
                onPress={() => toggle('why', w, 3)}
              />
            ))}
          </Chips>
        </>
      );
      break;
    case 'doing':
      body = (
        <>
          <Question step={step} title={en('arrive.doing.q')} own={own('arrive.doing.q')} />
          <Chips>
            {ARRIVAL_DOING.map((w) => (
              <Chip
                key={w}
                text={en(`arrive.doing.${w}`)}
                sub={own(`arrive.doing.${w}`)}
                on={d.doing === w}
                onPress={() => {
                  haptics.play('selection');
                  setD((x) => ({ ...x, doing: w }));
                }}
              />
            ))}
          </Chips>
          {d.doing !== null && d.doing !== 'neither' && (
            <Animated.View entering={FadeIn.duration(220)}>
              <TextInput
                value={d.field}
                onChangeText={(field) => setD((x) => ({ ...x, field }))}
                placeholder={t('arrive.doing.field')}
                placeholderTextColor={C.faint}
                maxLength={80}
                returnKeyType="next"
                onSubmitEditing={() => go(1)}
                style={[styles.input, styles.inputSmall]}
              />
            </Animated.View>
          )}
        </>
      );
      break;
    case 'love':
      body = (
        <>
          <Question
            step={step}
            title={en('arrive.love.q')}
            own={own('arrive.love.q')}
            hint={t('arrive.love.hint')}
          />
          <Chips>
            {ARRIVAL_INTERESTS.map((w) => (
              <Chip
                key={w}
                text={en(`arrive.love.${w}`)}
                sub={own(`arrive.love.${w}`)}
                on={d.interests.includes(w)}
                onPress={() => toggle('interests', w, 6)}
              />
            ))}
          </Chips>
        </>
      );
      break;
    case 'hard':
      body = (
        <>
          <Question
            step={step}
            title={en('arrive.hard.q')}
            own={own('arrive.hard.q')}
            hint={t('arrive.hard.hint')}
          />
          <Chips>
            {ARRIVAL_HARD.map((w) => (
              <Chip
                key={w}
                text={en(`arrive.hard.${w}`)}
                sub={own(`arrive.hard.${w}`)}
                on={d.hard.includes(w)}
                onPress={() => toggle('hard', w, 3)}
              />
            ))}
          </Chips>
        </>
      );
      break;
    case 'level':
      body = (
        <>
          <Question
            step={step}
            title={en('arrive.level.q')}
            own={own('arrive.level.q')}
            hint={t('arrive.level.note')}
          />
          <View style={styles.levels}>
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <Chip
                key={n}
                text={en(`arrive.level.${n}`)}
                sub={own(`arrive.level.${n}`)}
                on={d.level === n}
                wide
                onPress={() => {
                  haptics.play('selection');
                  setD((x) => ({ ...x, level: n }));
                }}
              />
            ))}
          </View>
        </>
      );
      break;
    case 'last':
      body = (
        <Question
          step={null}
          title={en('arrive.last.q')}
          line={en('arrive.last.ai')}
          own={own('arrive.last.ai')}
        />
      );
      break;
    case 'companion':
      body = (
        <>
          <Question
            step={null}
            title={en('arrive.companion.q')}
            own={own('arrive.companion.q')}
            hint={t('arrive.companion.hint')}
          />
          <View style={styles.levels}>
            {options.map((o) => (
              <Pressable
                key={o.id}
                onPress={() => {
                  haptics.play('selection');
                  setPicked(o.id);
                  onHear(o.id);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: picked === o.id }}
                accessibilityLabel={`${o.name}, ${o.who}`}
                style={[styles.mate, picked === o.id && styles.mateOn]}
              >
                <Text style={[styles.mateName, picked === o.id && styles.chipTextOn]}>
                  {o.name}
                </Text>
                <Text style={[styles.mateWho, picked === o.id && styles.chipSubOn]}>{o.who}</Text>
                <Text style={[styles.mateLine, picked === o.id && styles.chipTextOn]}>
                  “{o.line}”
                </Text>
                {o.gloss ? (
                  <Text style={[styles.chipSub, picked === o.id && styles.chipSubOn]}>
                    {o.gloss}
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        </>
      );
      break;
  }

  const nextLabel =
    at === 'welcome'
      ? t('arrive.welcome.go')
      : at === 'last'
        ? t('arrive.last.adult')
        : at === 'companion'
          ? t('arrive.companion.go', {
              name: options.find((o) => o.id === picked)?.name ?? '',
            })
          : at === 'love' || at === 'hard'
            ? (at === 'love' ? d.interests : d.hard).length
              ? t('arrive.next')
              : t('arrive.skip')
            : t('arrive.next');

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={styles.scrim} pointerEvents="none" />
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.page,
            { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 108 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            key={at}
            entering={FadeInDown.springify()
              .damping(SPRING.damping ?? 18)
              .stiffness(SPRING.stiffness ?? 190)}
            exiting={FadeOut.duration(120)}
            style={styles.body}
          >
            {body}
          </Animated.View>
        </ScrollView>
        <View style={[styles.bar, { bottom: insets.bottom + 24 }]}>
          {step > 0 && at !== 'companion' && !sending ? (
            <Pressable
              onPress={() => go(-1)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('arrive.back')}
            >
              <Text style={styles.back}>{t('arrive.back')}</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <Pressable
            disabled={!ready[at] || sending}
            onPress={() =>
              at === 'last' ? void finish() : at === 'companion' ? void choose() : go(1)
            }
            accessibilityRole="button"
            accessibilityLabel={nextLabel}
          >
            <Animated.View
              layout={LinearTransition.springify()}
              style={[styles.next, !ready[at] && styles.nextOff]}
            >
              <Glass />
              <Text style={styles.nextText}>{sending ? '…' : nextLabel}</Text>
            </Animated.View>
          </Pressable>
        </View>
        {failed && (
          <Animated.Text entering={FadeIn} style={[styles.failed, { bottom: insets.bottom + 80 }]}>
            {t('arrive.failed')}
          </Animated.Text>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

function Question({
  step,
  title,
  line,
  own,
  hint,
  big,
}: {
  step: number | null;
  title: string;
  line?: string;
  own: string | null;
  hint?: string;
  big?: boolean;
}) {
  return (
    <View style={styles.question}>
      {step !== null && <Text style={label}>{`${step} / ${STEPS.length - 2}`}</Text>}
      <Text style={[styles.title, big && styles.titleBig]}>{title}</Text>
      {line ? <Text style={styles.line}>{line}</Text> : null}
      {own ? <Text style={styles.own}>{own}</Text> : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

function Chips({ children }: { children: ReactNode }) {
  return <View style={styles.chips}>{children}</View>;
}

function Chip({
  text,
  sub,
  on,
  wide,
  onPress,
}: {
  text: string;
  sub: string | null;
  on: boolean;
  wide?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={text}
      style={({ pressed }) => [
        styles.chip,
        wide && styles.chipWide,
        on && styles.chipOn,
        pressed && styles.chipPressed,
      ]}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{text}</Text>
      {sub && sub !== text ? (
        <Text style={[styles.chipSub, on && styles.chipSubOn]}>{sub}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(9,8,11,0.55)' },
  page: { flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: 24 },
  body: { gap: 22 },
  question: { gap: 10 },
  title: {
    fontFamily: F.serif,
    fontSize: 30,
    lineHeight: 36,
    color: C.bone,
    letterSpacing: -0.3,
  },
  titleBig: { fontSize: 44, lineHeight: 50 },
  line: { fontFamily: F.serif, fontSize: 20, lineHeight: 27, color: C.bone },
  own: { fontSize: 15, lineHeight: 21, color: C.dim },
  hint: { fontSize: 13, lineHeight: 18, color: C.faint, marginTop: 2 },
  input: {
    fontFamily: F.serif,
    fontSize: 28,
    color: C.bone,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.faint,
  },
  inputSmall: { fontFamily: undefined, fontSize: 16, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  levels: { gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: C.panel,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.hair,
  },
  chipWide: { borderRadius: 16, paddingVertical: 12 },
  mate: {
    padding: 16,
    borderRadius: 20,
    gap: 4,
    backgroundColor: C.panel,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.hair,
  },
  mateOn: { backgroundColor: C.bone, borderColor: C.bone },
  mateName: { fontFamily: F.serif, fontSize: 24, color: C.bone },
  mateWho: { fontSize: 13, color: C.faint },
  mateLine: { fontFamily: F.serif, fontSize: 16, lineHeight: 22, color: C.bone, marginTop: 6 },
  chipOn: { backgroundColor: C.bone, borderColor: C.bone },
  chipPressed: { opacity: 0.8 },
  chipText: { fontSize: 15, color: C.bone, fontWeight: '500' },
  chipTextOn: { color: C.bg },
  chipSub: { fontSize: 12, color: C.faint, marginTop: 2 },
  chipSubOn: { color: 'rgba(9,8,11,0.6)' },
  bar: {
    position: 'absolute',
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { fontSize: 15, color: C.dim },
  next: {
    height: 48,
    minWidth: 120,
    paddingHorizontal: 22,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextOff: { opacity: 0.4 },
  nextText: { fontSize: 15.5, fontWeight: '600', color: C.bone },
  failed: { position: 'absolute', alignSelf: 'center', fontSize: 13, color: C.danger },
});
