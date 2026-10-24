import { CAST } from '@yapling/story';
import { clockLabel, localTime, openPlaces, PLACES, weatherAt, type PlaceId } from '@yapling/scene';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useStore } from '../../data/store';
import { haptics } from '../../ui/haptics';
import { useLocale } from '../../ui/locale';
import { app } from '../../world/app';
import { deviceTimeZone } from '../../world/device';
import { Group, Row, SectionTitle, SheetPage, Thumb } from '../../world/sheet';
import { C, F } from '../../world/theme';

/**
 * The menu: where the town is right now (go somewhere else instead of the director's pick), the
 * wall, your words, settings, and today's free time.
 */
export default function Menu() {
  const { t } = useLocale();
  const router = useRouter();
  const { world, talk } = app();
  const w = useStore(world.store);
  const local = localTime(new Date(), deviceTimeZone());
  const wx = weatherAt(local);
  const open = openPlaces(local.hour);

  useEffect(() => {
    void world.refreshMinutes();
  }, [world]);

  const visit = (place: PlaceId, variant: number) => {
    haptics.play('selection');
    if (place === w.place && talk.current.stage !== 'idle') {
      router.dismiss();
      return;
    }
    talk.leave();
    world.paint({ place, variant });
    router.dismiss();
    void world.visit(place, variant);
  };

  const m = w.minutes;
  const left = m ? Math.ceil(m.leftSeconds / 60) : null;
  const share = m ? Math.min(1, m.usedSeconds / Math.max(1, m.allowanceSeconds)) : 0;

  return (
    <SheetPage
      title={t('world.menu.title')}
      sub={`${clockLabel(local.hour)}${w.name ? ` · ${w.name}` : ''}`}
      root
    >
      <SectionTitle>{t('world.menu.now')}</SectionTitle>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tiles}
        style={styles.tilesWrap}
      >
        {open.map((p) => {
          const v = p.place === w.place ? w.variant : (p.variants[0] ?? 0);
          const here = p.place === w.place;
          const pl = PLACES[p.place];
          return (
            <Pressable key={p.place} style={styles.tile} onPress={() => visit(p.place, v)}>
              <Thumb spec={{ place: p.place, v, hour: local.hour, wx }} width={104} />
              <Text style={styles.tileName} numberOfLines={1}>
                {pl.name.replace(/^The (\w)/, (_, c: string) => c.toUpperCase())}
              </Text>
              <Text style={[styles.tileSub, here && { color: C.bone }]} numberOfLines={1}>
                {here ? t('world.menu.here') : CAST[pl.resident].name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Group>
        <Row
          first
          label={t('world.menu.wall')}
          detail={String(w.paintings.length)}
          onPress={() => router.push('/menu/wall')}
        />
        <Row label={t('world.menu.words')} onPress={() => router.push('/menu/words')} />
        <Row label={t('world.menu.settings')} onPress={() => router.push('/menu/settings')} />
      </Group>
      {m && (
        <Pressable style={styles.free} onPress={() => router.push('/menu/plus')}>
          <View style={styles.freeTop}>
            <Text style={styles.freeLabel}>
              {m.plan === 'plus' ? t('world.menu.plusOn') : t('world.menu.free')}
            </Text>
            <Text style={styles.freeLeft}>{t('world.menu.left', { minutes: left ?? 0 })}</Text>
          </View>
          <View style={styles.meter}>
            <View style={[styles.meterFill, { width: `${Math.round((1 - share) * 100)}%` }]} />
          </View>
          {m.plan !== 'plus' && (
            <Text style={styles.freePlus}>{`${t('world.menu.plusLine')}  ›`}</Text>
          )}
        </Pressable>
      )}
    </SheetPage>
  );
}

const styles = StyleSheet.create({
  tilesWrap: { marginHorizontal: -18 },
  tiles: { paddingHorizontal: 18, gap: 12 },
  tile: { width: 104, gap: 4 },
  tileName: {
    color: C.bone,
    fontFamily: F.serif,
    fontStyle: 'italic',
    paddingHorizontal: 4,
    fontSize: 15,
    marginTop: 6,
  },
  tileSub: { color: C.faint, fontSize: 11.5, fontWeight: '500' },
  free: { borderRadius: 22, padding: 18, gap: 10, backgroundColor: 'rgba(255,255,255,0.05)' },
  freeTop: { flexDirection: 'row', justifyContent: 'space-between' },
  freeLabel: { color: C.bone, fontSize: 15, fontWeight: '500' },
  freeLeft: { color: C.dim, fontSize: 15 },
  meter: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  meterFill: { height: 4, borderRadius: 2, backgroundColor: C.bone },
  freePlus: { color: C.dim, fontSize: 13 },
});
