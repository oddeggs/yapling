import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLocale } from '../../ui/locale';
import { C, F, label } from '../theme';
import { deviceCountry, emergencyFor, SUPPORT_LINES_URL } from './emergency';
import { safetyView } from './safety-model';

/*
 * Out of character: when the call hears that the learner may not be safe, the story stops and real
 * help is one tap away. The emergency number is the learner's country's, verified; elsewhere the
 * sheet asks them to call their local number. Never a guessed number.
 */
export function SafetySheet({ name, onClose }: { name: string; onClose: () => void }) {
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  const v = safetyView(emergencyFor(deviceCountry()), name, t);
  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      exiting={FadeOut.duration(300)}
      style={[StyleSheet.absoluteFill, styles.veil]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 30 },
        ]}
      >
        <Text style={[label, styles.kicker]}>{v.kicker}</Text>
        <Text style={styles.title}>{v.title}</Text>
        <Text style={styles.text}>{v.body}</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{v.emergency.title}</Text>
          <Text style={styles.cardSub}>{v.emergency.sub}</Text>
          {v.emergency.call ? (
            <Pressable
              accessibilityLabel={v.emergency.call.a11y}
              style={styles.call}
              onPress={() => void Linking.openURL(`tel:${v.emergency.call?.number ?? ''}`)}
            >
              <Text style={styles.callText}>{v.emergency.call.label}</Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable style={styles.card} onPress={() => void Linking.openURL(SUPPORT_LINES_URL)}>
          <Text style={styles.cardTitle}>{v.support.title}</Text>
          <Text style={styles.cardSub}>{v.support.sub}</Text>
        </Pressable>
        <Pressable style={styles.card} onPress={() => void Linking.openURL('contacts://')}>
          <Text style={styles.cardTitle}>{v.trusted.title}</Text>
          <Text style={styles.cardSub}>{v.trusted.sub}</Text>
        </Pressable>
        <Pressable style={styles.later} onPress={onClose}>
          <Text style={styles.laterText}>{v.later}</Text>
        </Pressable>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  veil: { backgroundColor: 'rgba(9,8,11,0.96)' },
  body: { paddingHorizontal: 28, gap: 14 },
  kicker: { color: C.faint },
  title: { color: C.bone, fontFamily: F.serif, fontSize: 28, lineHeight: 33 },
  text: { color: C.dim, fontSize: 16, lineHeight: 23, marginBottom: 8 },
  card: { borderRadius: 22, padding: 18, gap: 6, backgroundColor: C.panel },
  cardTitle: { color: C.bone, fontSize: 16, fontWeight: '600' },
  cardSub: { color: C.dim, fontSize: 14, lineHeight: 20 },
  call: {
    marginTop: 10,
    height: 50,
    borderRadius: 25,
    backgroundColor: C.bone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callText: { color: '#141217', fontSize: 16, fontWeight: '600' },
  later: { alignSelf: 'center', padding: 14, marginTop: 6 },
  laterText: { color: C.dim, fontSize: 14, fontWeight: '500' },
});
