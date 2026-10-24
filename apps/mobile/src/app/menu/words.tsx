import { StyleSheet, Text, View } from 'react-native';

import { useStore } from '../../data/store';
import { useLocale } from '../../ui/locale';
import { app } from '../../world/app';
import { shortDate } from '../../world/kept';
import { SheetPage } from '../../world/sheet';
import { C, F } from '../../world/theme';

/** The phrases the learner has used well, newest first, each with the line it came from. */
export default function Words() {
  const { t, language } = useLocale();
  const paintings = useStore(app().world.store, (s) => s.paintings);
  const words = paintings.flatMap((p) =>
    p.words.map((w) => ({ ...w, title: p.title, keptAt: p.keptAt })),
  );
  return (
    <SheetPage title={t('world.menu.words')}>
      {words.length === 0 ? (
        <Text style={styles.empty}>{t('world.words.empty')}</Text>
      ) : (
        words.map((w, i) => (
          <View key={`${w.phrase}${i}`} style={styles.word}>
            <Text style={styles.phrase}>{w.phrase}</Text>
            <Text style={styles.line}>{`“${w.line}”`}</Text>
            <Text style={styles.from}>{`‘${w.title}’ · ${shortDate(w.keptAt, language)}`}</Text>
          </View>
        ))
      )}
    </SheetPage>
  );
}

const styles = StyleSheet.create({
  empty: { color: C.dim, fontSize: 15, textAlign: 'center', marginTop: 40 },
  word: { gap: 4, padding: 16, borderRadius: 20, backgroundColor: C.panel },
  phrase: { color: C.bone, fontFamily: F.serif, fontSize: 19, lineHeight: 23 },
  line: { color: C.dim, fontSize: 14, lineHeight: 19 },
  from: { color: C.faint, fontSize: 12, marginTop: 2 },
});
