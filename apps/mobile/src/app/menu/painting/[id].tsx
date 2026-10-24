import type { PaintingLines } from '@yapling/contracts';
import { CAST } from '@yapling/story';
import { PLACES, clockLabel, isPlaceId } from '@yapling/scene';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useStore } from '../../../data/store';
import { useLocale } from '../../../ui/locale';
import { app } from '../../../world/app';
import { shortDate } from '../../../world/kept';
import { SectionTitle, SheetPage, Thumb } from '../../../world/sheet';
import { C, F, label } from '../../../world/theme';

/** One kept painting: re-painted at its hour, what the learner did, and what was said. */
export default function PaintingPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language } = useLocale();
  const { world } = app();
  const p = useStore(world.store, (s) => s.paintings.find((x) => x.id === id) ?? null);
  const [lines, setLines] = useState<PaintingLines['lines']>([]);
  const { width } = useWindowDimensions();

  useEffect(() => {
    if (!id) return;
    void world.api
      .paintingLines(id)
      .then((r) => setLines(r.lines))
      .catch(() => undefined);
  }, [id, world]);

  if (!p) return <SheetPage title="">{null}</SheetPage>;
  const speaker = CAST[p.speaker].name;
  const place = isPlaceId(p.place) ? PLACES[p.place].name : p.place;
  return (
    <SheetPage title="">
      <View style={styles.hero}>
        <Thumb
          spec={{ place: p.place, v: p.variant, hour: p.hour, wx: p.weather }}
          width={Math.round(width * 0.56)}
        />
        <Text style={styles.title}>{`‘${p.title}’`}</Text>
        <Text style={[label, styles.meta]}>
          {`${place} · ${clockLabel(p.hour)} · ${t('world.kept', { date: shortDate(p.keptAt, language) })}`}
        </Text>
      </View>
      {(p.canDos.length > 0 || p.learned) && (
        <View style={styles.notes}>
          {p.canDos.map((c) => (
            <View key={c} style={styles.note}>
              <Text style={styles.noteK}>{t('world.kept.you')}</Text>
              <Text style={styles.noteV}>
                {c.replace(/^You (\w)/, (_, x: string) => x.toUpperCase())}
              </Text>
            </View>
          ))}
          {p.learned ? (
            <View style={styles.note}>
              <Text style={styles.noteK}>{t('world.kept.learned', { name: speaker })}</Text>
              <Text style={styles.noteV}>{p.learned}</Text>
            </View>
          ) : null}
        </View>
      )}
      {lines.length > 0 && (
        <>
          <SectionTitle>{t('world.painting.lines')}</SectionTitle>
          <View style={styles.lines}>
            {lines.map((l, i) => (
              <Text key={i} style={l.who === 'learner' ? styles.you : styles.say}>
                {l.text}
              </Text>
            ))}
          </View>
        </>
      )}
    </SheetPage>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 4 },
  title: {
    marginTop: 18,
    color: C.bone,
    fontFamily: F.serif,
    fontStyle: 'italic',
    fontSize: 24,
    lineHeight: 28,
    textAlign: 'center',
  },
  meta: { marginTop: 8, textAlign: 'center' },
  notes: { gap: 9, padding: 16, borderRadius: 20, backgroundColor: C.panel },
  note: { flexDirection: 'row', gap: 8 },
  noteK: {
    width: 88,
    fontSize: 9.5,
    lineHeight: 19,
    fontWeight: '600',
    letterSpacing: 1.7,
    textTransform: 'uppercase',
    color: C.faint,
  },
  noteV: { flex: 1, fontSize: 14, lineHeight: 19.6, color: C.bone },
  lines: { gap: 14, paddingHorizontal: 4 },
  say: { color: C.bone, fontFamily: F.serif, fontSize: 19, lineHeight: 24 },
  you: { color: C.dim, fontSize: 15.5, lineHeight: 21, paddingLeft: 14 },
});
