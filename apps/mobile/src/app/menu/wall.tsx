import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useStore } from '../../data/store';
import { useLocale } from '../../ui/locale';
import { app } from '../../world/app';
import { SheetPage, Thumb } from '../../world/sheet';
import { C, F } from '../../world/theme';

/** The wall: every kept painting as a quiet grid of small frames, newest first. */
export default function Wall() {
  const { t } = useLocale();
  const router = useRouter();
  const { world } = app();
  const paintings = useStore(world.store, (s) => s.paintings);
  const { width } = useWindowDimensions();
  const size = Math.floor((width - 36 - 2 * 16) / 3);

  useEffect(() => {
    void world.refreshWall();
  }, [world]);

  return (
    <SheetPage title={t('world.menu.wall')}>
      {paintings.length === 0 ? (
        <Text style={styles.empty}>{t('world.wall.empty')}</Text>
      ) : (
        <View style={styles.grid}>
          {paintings.map((p) => (
            <Pressable
              key={p.id}
              style={{ width: size }}
              onPress={() => router.push(`/menu/painting/${p.id}`)}
            >
              <Thumb
                spec={{ place: p.place, v: p.variant, hour: p.hour, wx: p.weather }}
                width={size}
              />
              <Text style={styles.name} numberOfLines={2}>
                {p.status === 'judging' && Date.now() - p.keptAt < 60_000
                  ? t('world.wall.judging')
                  : `‘${p.title}’`}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </SheetPage>
  );
}

const styles = StyleSheet.create({
  empty: { color: C.dim, fontSize: 15, textAlign: 'center', marginTop: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, rowGap: 22 },
  name: {
    color: C.bone,
    fontFamily: F.serif,
    fontStyle: 'italic',
    paddingHorizontal: 4,
    fontSize: 14,
    lineHeight: 17,
    marginTop: 8,
  },
});
