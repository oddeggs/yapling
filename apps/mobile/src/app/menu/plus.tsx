import { FREE_DAILY_MINUTES } from '@yapling/domain';
import { localTime } from '@yapling/scene';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useLocale } from '../../ui/locale';
import { deviceTimeZone } from '../../world/device';
import { SheetPage, Thumb } from '../../world/sheet';
import { C, F } from '../../world/theme';

/** Plus: the full experience at a premium price. The founder sets the price; it opens soon. */
export default function Plus() {
  const { t } = useLocale();
  const { width } = useWindowDimensions();
  const hour = localTime(new Date(), deviceTimeZone()).hour;
  return (
    <SheetPage title="">
      <View style={styles.hero}>
        <Thumb
          spec={{ place: 'roof', v: 2, hour: hour > 6 && hour < 18 ? 21.5 : hour, wx: 'clear' }}
          width={Math.round(width * 0.5)}
        />
        <Text style={styles.title}>{`‘${t('world.plus.title')}’`}</Text>
      </View>
      <View style={styles.vals}>
        {(['world.plus.v1', 'world.plus.v2', 'world.plus.v3'] as const).map((k) => (
          <View key={k} style={styles.val}>
            <View style={styles.dot} />
            <Text style={styles.valText}>{t(k)}</Text>
          </View>
        ))}
      </View>
      <View style={styles.cta}>
        <Text style={styles.ctaText}>{t('world.plus.soon')}</Text>
      </View>
      <Text style={styles.fine}>{t('world.plus.fine', { minutes: FREE_DAILY_MINUTES })}</Text>
    </SheetPage>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center' },
  title: {
    marginTop: 20,
    color: C.bone,
    fontFamily: F.serif,
    fontStyle: 'italic',
    paddingHorizontal: 4,
    fontSize: 26,
    textAlign: 'center',
  },
  vals: { gap: 12, marginHorizontal: 6 },
  val: { flexDirection: 'row', gap: 12 },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.bone,
    opacity: 0.7,
    marginTop: 9,
  },
  valText: { flex: 1, color: C.bone, fontSize: 15.5, lineHeight: 22 },
  cta: {
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(240,235,226,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: C.bone, fontSize: 15, fontWeight: '600' },
  fine: { color: C.faint, fontSize: 12, lineHeight: 17, textAlign: 'center', marginHorizontal: 18 },
});
